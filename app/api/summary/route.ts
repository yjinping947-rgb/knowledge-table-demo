// app/api/summary/route.ts
// 总结：4 个字段都从 RAG 库（1175 条 20 话题 × 3 派）选真实回答。
// 详见 .harness/contracts/summary.md。

import { NextResponse } from "next/server";
import { summaryRequestSchema } from "@/lib/validators";
import { embedQuery, retrieveFromTopics } from "@/lib/rag";
import { loadTopics, topicForRequest } from "@/lib/rag/topics";
import { getSummaryFallback } from "@/lib/fallback";
import { sourceExcerptRelevant } from "@/lib/session/rag";
import { AI_MODEL, getAIClient } from "@/lib/ai";
import { parseModelJson, summaryOutputSchema } from "@/lib/validators";
import { summarySystemPrompt } from "@/lib/prompts";
import type { FirstChoice, PositionChange, SecondChoice, SeatId } from "@/lib/types";

function buildQuery(input: { firstChoice: FirstChoice; secondChoice: SecondChoice; positionChange: PositionChange }, topicTitle: string): string {
  return `${topicTitle} ${input.firstChoice} ${input.secondChoice} 之后 ${input.positionChange} 综合讨论`;
}

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
  const collisionPoint = input.collisionPoint ?? "尚未记录具体碰撞点";
  const challenge = input.challenge ?? "质疑尚未记录";
  const response = input.response ?? "回应尚未记录";
  const confirmedDivergence = input.confirmedDivergence ?? "尚未确认";
  const perspective = input.perspectiveName
    ? `${input.perspectiveName}${input.perspectiveReframe ? `：${input.perspectiveReframe}` : ""}`
    : "尚未邀请第三席";

  return {
    tendency: `听完两席后，你先校准为「${tendency}」。这不是最终结论，而是我们接下来要追问的方向。`,
    collisionPoint: `你选中了「${collisionPoint}」。`,
    challenge: `带来动摇的质疑：${challenge}`,
    response: `原席位的回应：${response}`,
    turningPoint: `这次互质让「${topicTitle}」从立场选择变成了对条件、代价和时间点的判断。`,
    confirmedDivergence: `你确认的隐藏分歧：${confirmedDivergence}`,
    perspective: `第三知识视角：${perspective}`,
    departure: "先做一件小事，看看结果，再决定下一步。",
  };
}

function buildTopicFallback(
  input: ReturnType<typeof summaryRequestSchema.parse>,
  topicTitle: string,
) {
  const base = getSummaryFallback(input.firstChoice, input.secondChoice, input.positionChange);
  const before = {
    support_quit: "倾向主动推动改变",
    oppose_quit: "倾向先保持现状",
    depends: "倾向根据条件判断",
  }[input.firstChoice];
  const during = {
    leave_now: "在具体情境下选择立即行动",
    wait_offer: "在具体情境下选择继续观察",
    set_deadline: "在具体情境下选择设定边界",
  }[input.secondChoice];
  const after = {
    unchanged: "核心立场保持不变",
    slightly_changed: "保留原方向并补充条件",
    changed: "主要判断发生了变化",
  }[input.positionChange];
  const tendency = input.tendency ? tendencyLabels[input.tendency] : "根据具体条件判断";
  const topicBefore = input.topicId === "T01"
    ? before
    : input.firstChoice === "support_quit"
      ? "倾向先主动解决问题"
      : input.firstChoice === "oppose_quit"
        ? "倾向先把变化风险压下来"
        : "倾向根据具体条件判断";
  const summary = {
    ...base,
    consensus: `聊「${topicTitle}」时，大家都同意要看清自己的目标和能承受的代价。`,
    disagreement: "两边卡在：是先动起来，还是先把风险压下来。",
    hiddenAssumption: "别忘了，你的时间、精力和手里的资源都可能变化。",
    trajectory: { before: `开始时，你先带着「${tendency}」这条直觉入桌。${topicBefore ? `（${topicBefore}）` : ""}`, during, after },
    openQuestion: "接下来你准备盯住哪个信号，决定要不要调整？",
    goldenQuote: input.likedQuotes[0] ?? `先保护不可逆的底线，再用一个小行动换来下一次判断的证据。`,
    mode: "fallback" as const,
  };
  if (input.flow !== "knowledge-table-v2") return summary;

  return {
    ...summary,
    thoughtTrail: buildThoughtTrail(input, topicTitle),
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
          mode: "fallback" as const,
        }
      : undefined,
  };
}

function ensureSummaryDiversity(
  parsed: ReturnType<typeof summaryOutputSchema.parse>,
  fallback: { consensus: string; disagreement: string; hiddenAssumption: string; openQuestion: string },
) {
  const values = [parsed.consensus, parsed.disagreement, parsed.hiddenAssumption, parsed.openQuestion];
  const seen = new Set<string>();
  const keys = ["consensus", "disagreement", "hiddenAssumption", "openQuestion"] as const;
  const next = { ...parsed };
  keys.forEach((key, index) => {
    const value = String(values[index]).replace(/\s+/g, " ").trim();
    if (!value || seen.has(value)) next[key] = fallback[key];
    seen.add(next[key]);
  });
  return next;
}

export async function POST(request: Request) {
  let input: ReturnType<typeof summaryRequestSchema.parse>;
  try {
    input = summaryRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "请求参数不完整" }, { status: 400 });
  }

  const topics = await loadTopics();
  const currentTopic = topicForRequest(topics, input.topicId, input.customQuestion);
  if (!currentTopic) {
    return NextResponse.json({ error: `话题 ${input.topicId} 不存在` }, { status: 404 });
  }

  // 缺 LLM 配置 → fallback
  if (!process.env.AI_API_KEY || !process.env.AI_BASE_URL) {
    return NextResponse.json(buildTopicFallback(input, currentTopic.title));
  }

  const query = `${buildQuery(input, currentTopic.title)} ${input.collisionPoint ?? ""} ${input.confirmedDivergence ?? ""} ${input.followupTurns.map((turn) => turn.question).join(" ")}`.trim();
  const queryVec = await embedQuery(query);

  // 四个字段优先使用四条不同来源；同一席位不重复占位。
  const seats: SeatId[] = ["conditional", "realist", "action"];
  const seats4Label = ["共识", "分歧", "隐藏前提", "还没解决"];

  const results = await Promise.all(
    seats.map((seat, i) =>
      retrieveFromTopics(queryVec, { topicId: input.topicId, seat }, 3, { queryText: query }).then((top) => ({
        label: seats4Label[i],
        seat,
        top,
      })),
    ),
  );

  // 字段材料按 contentId 去重；第四个字段从尚未使用的候选来源中取。
  const seen = new Set<string>();
  const pickedSources = results.flatMap((r) => r.top).filter((source) => {
    if (seen.has(source.contentId)) return false;
    seen.add(source.contentId);
    return true;
  });
  const usedForFields = new Set<string>();
  const pick = (i: number) => {
    const fallback = i === 0
      ? "不同立场都承认，决定前要同时看目标、资源和代价。"
      : i === 1
        ? "分歧在于先推动改变，还是先把不可逆风险降到可承受范围。"
        : i === 2
          ? "容易被忽略的前提是，当前信息和承受能力都可能随时间变化。"
          : "还需要用一个具体信号检验下一步，而不是停在抽象判断上。";
    const source = pickedSources[i] ?? pickedSources.find((candidate) => !usedForFields.has(candidate.contentId));
    if (!source) return fallback;
    usedForFields.add(source.contentId);
    return sourceExcerptRelevant(source, query, fallback, 180);
  };

  const result = {
    consensus: pick(0),
    disagreement: pick(1),
    hiddenAssumption: pick(2),
    trajectory: {
      before: `用户开始讨论时倾向 ${input.firstChoice === "support_quit" ? "支持裸辞" : input.firstChoice === "oppose_quit" ? "反对裸辞" : "看情况"}`,
      during: `在具体情境下选择 ${input.secondChoice === "leave_now" ? "立即离开" : input.secondChoice === "wait_offer" ? "坚持到 offer" : "设离职期限"}`,
      after: `反思后立场 ${input.positionChange === "unchanged" ? "未变" : input.positionChange === "slightly_changed" ? "微调" : "改变"}`,
    },
    openQuestion: pick(3),
    sourceIds: pickedSources.map((t) => t.contentId),
    sourceUrls: pickedSources.map((t) => t.url),
    authors: pickedSources.map((t) => t.author),
    sourceStatus: "local-fallback" as const,
    mode: "fallback" as const,
  };
  const client = getAIClient();
  if (client && result.sourceIds.length > 0) {
    try {
      const completion = await client.chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: "system", content: `${summarySystemPrompt}\n只输出合法 JSON，不要逐字搬运来源。` },
          { role: "user", content: `当前话题：${currentTopic.title}\n用户路径：${JSON.stringify(input)}\n单席连续追问（必须纳入总结，不要把它们当成第二轮）：${input.followupTurns.length ? input.followupTurns.map((turn) => `${turn.seatId}席｜用户：${turn.question}\n席位回应：${turn.reply}`).join("\n") : "无"}\n用户点赞收录的发言（优先提炼为 goldenQuote）：${input.likedQuotes.length ? input.likedQuotes.join("\n") : "无；请从讨论内容中选一句"}\n参考材料（每条来源只能支撑一个字段，不能重复整段）：${pickedSources.map((t) => `${t.title}｜${t.author}\n${t.contentText.slice(0, 700)}`).join("\n\n")}\n请生成 consensus、disagreement、hiddenAssumption、trajectory、openQuestion 和 goldenQuote。字段职责分别是：consensus=各方真正共识；disagreement=两种判断的关键分叉；hiddenAssumption=用户或讨论隐含的前提；openQuestion=基于用户具体情况仍待回答的一个问题；trajectory=用户路径变化。每个字段必须是不同内容，不能复述首问答案或其他字段；必须结合用户追问中的具体条件。goldenQuote 必须是完整的一句话。` },
        ],
        temperature: 0.45,
        max_tokens: 700,
      });
      const parsed = summaryOutputSchema.parse(parseModelJson(completion.choices[0]?.message?.content || ""));
      const diversified = ensureSummaryDiversity(parsed, {
        consensus: result.consensus,
        disagreement: result.disagreement,
        hiddenAssumption: result.hiddenAssumption,
        openQuestion: result.openQuestion,
      });
      const aiResult = { ...result, ...diversified, mode: "ai" as const };
      if (input.flow !== "knowledge-table-v2") return NextResponse.json(aiResult);
      return NextResponse.json({ ...aiResult, thoughtTrail: buildThoughtTrail(input, currentTopic.title) });
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("Summary AI fallback:", error);
    }
  }
  if (input.flow !== "knowledge-table-v2") return NextResponse.json(result);

  return NextResponse.json({
    ...result,
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
          mode: "fallback" as const,
        }
      : undefined,
  });
}
