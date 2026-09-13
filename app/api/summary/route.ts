// app/api/summary/route.ts
// 结果卡：把这桌讨论压成「讨论地图 + 灵魂金句」。
//
// 接通 LLM 后的变化（对比旧版）：
//   旧：consensus/disagreement/hiddenAssumption/openQuestion 四个 Zod 必填字段
//       全是语料摘录；soulSentence / discussionMap 字段根本不存在
//   新：模型基于本桌真实对话生成 heart 字段，同时补齐 PRD 7.3 要求的
//       discussionMap（中心问题 + ≤3 外围发现 + 轨迹）与 soulSentence
//
// 兼容：前端 ResultStage 现在读的 consensus/disagreement/... 字段保留不动，
// 新增字段是增量，不破坏既有渲染。

import { NextResponse } from "next/server";
import { summaryRequestSchema } from "@/lib/validators";
import { retrieveFromTopics } from "@/lib/rag";
import { loadTopics } from "@/lib/rag/topics";
import { getSummaryFallback } from "@/lib/fallback";
import { callLLMJson } from "@/lib/ai/llm";
import { deriveSessionId, getSession, issueSessionToken, renderSessionContext, upsertSession } from "@/lib/ai/session";
import { sanitizeConditions, sanitizeText } from "@/lib/session/guard";
import { seatNames } from "@/lib/prompts/seats/persona";
import { summaryPrompt } from "@/lib/prompts/actions";
import { sessionMode } from "@/lib/session/mode";
import type { SeatId } from "@/lib/types";
import { z } from "zod";

const mapOutputSchema = z.object({
  question: z.string().trim().min(1).max(60),
  ripples: z
    .array(
      z.object({
        label: z.string().trim().min(2).max(12),
        type: z.enum(["conflict", "premise", "perspective", "open"]),
        sourceSeat: z.enum(["action", "realist", "conditional", "user"]),
      }),
    )
    .min(1)
    .max(3),
  soulSentence: z.string().trim().min(1).max(80),
});

const tendencyLabels = {
  closer_first: "更接近第一席",
  closer_second: "更接近第二席",
  both_valid: "认为两边都有道理",
  undecided: "暂时无法判断",
  missed_point: "认为两边都没说到重点",
} as const;

function buildThoughtTrail(
  input: ReturnType<typeof summaryRequestSchema.parse>,
  topicTitle: string,
) {
  const tendency = input.tendency ? tendencyLabels[input.tendency] : "根据条件判断";
  return {
    tendency: `最初，你${tendency}。`,
    collisionPoint: `你选中了「${input.collisionPoint ?? "尚未记录具体碰撞点"}」。`,
    challenge: `带来动摇的质疑：${input.challenge ?? "质疑尚未记录"}`,
    response: `原席位的回应：${input.response ?? "回应尚未记录"}`,
    turningPoint: `这次互质让「${topicTitle}」从立场选择变成了对条件、代价和时间点的判断。`,
    confirmedDivergence: `你确认的隐藏分歧：${input.confirmedDivergence ?? "尚未确认"}`,
    perspective: `第三知识视角：${
      input.perspectiveName
        ? `${input.perspectiveName}${input.perspectiveReframe ? `：${input.perspectiveReframe}` : ""}`
        : "尚未邀请第三席"
    }`,
    departure: "离桌时，你不必立刻做出决定；你已经知道下一次要观察什么信号、保护什么底线。",
  };
}

/** 轨迹：起止都从已有状态推导（PRD 7.4 只允许 action/realist/conditional/undecided） */
function buildTrajectory(input: ReturnType<typeof summaryRequestSchema.parse>) {
  const start: SeatId | "undecided" =
    input.tendency === "closer_first"
      ? "action"
      : input.tendency === "closer_second"
        ? "realist"
        : "undecided";
  const end: SeatId | "undecided" = input.perspectiveName
    ? "conditional"
    : input.tendency === "closer_first"
      ? "action"
      : input.tendency === "closer_second"
        ? "realist"
        : "undecided";
  return { start, end };
}

/** 生成失败时的结果卡兜底 */
function fallbackCard(
  input: ReturnType<typeof summaryRequestSchema.parse>,
  topicTitle: string,
) {
  const thirdSeatIn = Boolean(input.perspectiveName);
  const ripples = [
    { label: "代价权衡", type: "conflict" as const, sourceSeat: "action" as const },
    { label: "缓冲够吗", type: "premise" as const, sourceSeat: "realist" as const },
    thirdSeatIn
      ? { label: "选择边界", type: "perspective" as const, sourceSeat: "conditional" as const }
      : { label: "仍未解决", type: "open" as const, sourceSeat: "user" as const },
  ];
  return {
    question: `该不该继续「${topicTitle}」`,
    ripples,
    soulSentence: "你不是在选走还是留，而是在选哪种代价你更愿意承担。",
  };
}

export async function POST(request: Request) {
  let input: ReturnType<typeof summaryRequestSchema.parse>;
  try {
    input = summaryRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "请求参数不完整" }, { status: 400 });
  }

  const topics = await loadTopics();
  const currentTopic = topics[input.topicId];
  if (!currentTopic) {
    return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });
  }

  // 结论性字段仍从真实语料取（保持既有契约不破）
  // ⚠️ 对抗性测试 D3 修复：这些 legacy 字段以前是**无条件**取语料原文前 200 字。
  //    问题：语料跟"这桌实际讨论了什么"毫无关系，用户随便伪造一个 collisionPoint
  //    就能让结果卡里出现一段跟本桌无关的名人名言（甚至被误当成席位结论）。
  //    现在：只有在**本桌真的发生过对应环节**时才取语料，否则给诚实的空态文案。
  const seats: SeatId[] = ["conditional", "realist", "action", "realist"];
  const seats4Label = ["共识", "分歧", "隐藏前提", "还没解决"];
  const hasCollision = Boolean(input.collisionPoint && input.challenge && input.response);
  const hasDivergence = Boolean(input.confirmedDivergence);
  // 每个结论槽位是否"有资格"取语料 —— 没发生过就留空
  const isGrounded = [true, hasCollision, hasDivergence, true];
  const results = await Promise.all(
    seats.map((seat, i) =>
      retrieveFromTopics(null, { topicId: input.topicId, seat }, 1).then((top) => ({
        label: seats4Label[i],
        seat,
        top,
      })),
    ),
  );
  const pick = (i: number) => {
    if (!isGrounded[i]) return "";
    const r = results[i];
    if (r.top.length === 0) {
      const fb = results.find((x) => x.top.length > 0);
      if (!fb) return "";
      return `（来自 ${fb.seat} 席位的回答）${fb.top[0].contentText.slice(0, 200)}`;
    }
    // 带明确的"这是参考资料"标记，避免被下游当成席位结论复述
    return `【参考资料 · 非本桌结论】${r.top[0].contentText.slice(0, 200)}`;
  };

  // 未发生对应环节时的诚实空态（不编造、不借语料凑数）
  const notHappened = (what: string) => `本桌尚未${what}，这一项暂无可归纳的内容。`;
  const base = getSummaryFallback(input.firstChoice, input.secondChoice, input.positionChange);
  const baseFields = {
    consensus: pick(0) || base.consensus,
    disagreement: pick(1) || (hasCollision ? base.disagreement : notHappened("发生碰撞质疑")),
    hiddenAssumption: pick(2) || (hasDivergence ? base.hiddenAssumption : notHappened("确认隐藏分歧")),
    openQuestion: pick(3) || base.openQuestion,
    trajectory: base.trajectory,
    sourceIds: results.flatMap((r) => r.top.map((t) => t.contentId)),
    sourceUrls: results.flatMap((r) => r.top.map((t) => t.url)),
    authors: results.flatMap((r) => r.top.map((t) => t.author)),
  };

  // 组装本桌上下文（让模型不用靠猜）
  // ⚠️ D3 修复：传入的 challenge/response 是**请求体里直接给的字符串**，
  //    可能被伪造。只有拿它跟「语料/本桌已生成内容」无法区分时，才需要防伪标记 ——
  //    这个防伪标记在 renderSessionContext 里统一加（见 session.ts）。
  const sessionId = deriveSessionId({
    sessionId: (input as { sessionId?: string }).sessionId,
    sessionSignature: (input as { sessionSignature?: string }).sessionSignature,
    topicId: input.topicId,
  });
  upsertSession(sessionId, {
    topicId: input.topicId,
    topicTitle: currentTopic.title,
    userAddedConditions: sanitizeConditions(
      (input as { userAddedConditions?: string[] }).userAddedConditions ?? [],
    ),
    tendency: input.tendency,
    confirmedDivergence: input.confirmedDivergence
      ? sanitizeText(input.confirmedDivergence)
      : undefined,
    thirdSeatInvited: Boolean(input.perspectiveName),
    collision:
      input.collisionPoint && input.challenge && input.response
        ? {
            collisionPoint: sanitizeText(input.collisionPoint),
            selectedSeatId: (input.respondedSeatIds[0] as SeatId) ?? "action",
            challenge: {
              seatId: input.respondedSeatIds[0] === "realist" ? "action" : "realist",
              reply: sanitizeText(input.challenge),
            },
            response: {
              seatId: (input.respondedSeatIds[0] as SeatId) ?? "action",
              reply: sanitizeText(input.response),
            },
          }
        : undefined,
  });
  const session = getSession(sessionId)!;

  const trajectory = buildTrajectory(input);
  const prompt = summaryPrompt({
    sessionContext: renderSessionContext(session, seatNames),
    trajectory,
  });

  const generated = await callLLMJson({
    ...prompt,
    parse: (raw) => mapOutputSchema.parse(raw),
    temperature: 0.85,
    // 非思考模式：结果卡是结构化输出（问题+3标签+金句），无需思维链
    thinking: "disabled",
    maxTokens: 1000,
    label: "summary",
  });

  const card = generated ?? fallbackCard(input, currentTopic.title);
  const mode = generated ? sessionMode("generated") : sessionMode("fallback");

  // 第三席未正式入桌时，第三个外围发现不能标成 perspective
  const ripples = card.ripples.map((r) =>
    !input.perspectiveName && r.type === "perspective" ? { ...r, type: "open" as const } : r,
  );

  return NextResponse.json({
    ...baseFields,
    // PRD 7.3 / 12.5 要求的最终产物
    discussionMap: {
      question: card.question,
      ripples,
      trajectory: {
        start: trajectory.start,
        checkpoints: input.collisionPoint ? ["collision"] : [],
        end: trajectory.end,
      },
    },
    soulSentence: card.soulSentence,
    ...issueSessionToken(sessionId),
    thoughtTrail: buildThoughtTrail(input, currentTopic.title),
    perspective: input.perspectiveName
      ? {
          name: input.perspectiveName,
          basis: `来自两席互质后确认的隐藏分歧：${input.confirmedDivergence ?? "尚未确认"}`,
          reframe: input.perspectiveReframe ?? "把问题改写成对损失、边界和下一次检查点的判断。",
          tool: "列出不可逆损失、仍可保留的选项与下一次复查的触发线。",
          reply: "先不急着裁决谁对谁错，把选择拆成现在必须保护什么、还能保留什么、何时重新判断。",
          sourceIds: [],
          sourceUrls: [],
          authors: [],
          mode: mode,
        }
      : undefined,
    mode,
  });
}
