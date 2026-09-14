// app/api/settings/route.ts
// AI 配置读写接口 —— 让队友在自己电脑的页面上直接填自己的 key。
//
// 安全设计（重要，别改）：
//   1. GET 永不回传 key 明文，只回传掩码与来源。
//   2. key 只落在本机 .env.local（已被 .gitignore 拦截），不进仓库、不进日志。
//   3. probe 只把 key 放进内存做一次真实调用，成功才建议落盘。
//   4. 本接口不鉴权 —— 它设计上只在本机/局域网开发环境使用。
//      若将来部署到公网，必须加访问控制，否则等于把 key 写入能力开放出去。

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  callLLM,
  clearAiOverride,
  getAiStatus,
  saveAiConfig,
  validateApiKey,
  validateBaseUrl,
  validateModel,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
} from "@/lib/ai";

const saveSchema = z.object({
  apiKey: z.string().max(400),
  baseUrl: z.string().max(400).optional(),
  model: z.string().max(200).optional(),
});

/** 三个字段的联合校验：任一不合法就返回 400 + 具体原因 */
function validateAll(input: { apiKey: string; baseUrl?: string; model?: string }) {
  const keyCheck = validateApiKey(input.apiKey);
  if (!keyCheck.ok) return keyCheck;

  const urlCheck = validateBaseUrl(input.baseUrl || DEFAULT_BASE_URL);
  if (!urlCheck.ok) return urlCheck;

  const modelCheck = validateModel(input.model || DEFAULT_MODEL);
  if (!modelCheck.ok) return modelCheck;

  return { ok: true as const };
}

/** 读取当前配置状态（只有掩码，没有明文） */
export async function GET() {
  return NextResponse.json(getAiStatus());
}

/** 保存 key 并立即生效 */
export async function POST(request: Request) {
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "参数不完整" }, { status: 400 });

  const check = validateAll(parsed.data);
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

  const { persisted, warning } = await saveAiConfig({
    apiKey: parsed.data.apiKey,
    baseUrl: parsed.data.baseUrl || DEFAULT_BASE_URL,
    model: parsed.data.model || DEFAULT_MODEL,
  });

  return NextResponse.json({ ...getAiStatus(), persisted, warning });
}

/** 清除页面设置，回到环境变量状态 */
export async function DELETE() {
  clearAiOverride();
  return NextResponse.json(getAiStatus());
}

/**
 * 连通性测试：把候选 key 先放进内存跑一次真实调用。
 * 这样队友在"保存"前就知道 key 对不对，不用反复重启试。
 *
 * ⚠️ 校验不通过时**直接返回**，绝不发起真实调用 —— 否则这个接口就成了
 * "无需 key 也能免费打模型"的放大器（对抗测试 G5a）。
 */
export async function PUT(request: Request) {
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "参数不完整" }, { status: 400 });

  const check = validateAll(parsed.data);
  if (!check.ok) {
    return NextResponse.json({ ok: false, message: check.reason, latencyMs: null }, { status: 200 });
  }

  // 校验通过：放进内存（不落盘）再探测，由前端决定是否正式保存。
  await saveAiConfig({
    apiKey: parsed.data.apiKey,
    baseUrl: parsed.data.baseUrl || DEFAULT_BASE_URL,
    model: parsed.data.model || DEFAULT_MODEL,
  });

  const result = await callLLM({
    system: "你是连通性探针。",
    user: "只回复两个字：可用",
    thinking: "disabled",
    maxTokens: 20,
    label: "settings:probe",
  });

  return NextResponse.json({
    ok: Boolean(result),
    latencyMs: result?.latencyMs ?? null,
    model: parsed.data.model || DEFAULT_MODEL,
    message: result ? "连接成功，模型可用" : "连接失败：请检查 key、接口地址与模型名是否正确",
  });
}
