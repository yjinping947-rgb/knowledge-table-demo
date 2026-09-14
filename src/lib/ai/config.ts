// src/lib/ai/config.ts
// AI 运行时配置（页面填 key 的落地点）。
//
// 为什么需要这一层：
//   .env.local 只在进程启动时读一次。若只依赖它，队友在页面上填完 key
//   还得手动重启 dev server —— 那就谈不上"输入 key 就能直接体验到"。
//   所以这里做"运行时覆盖"：内存里存一份 + 落盘到 .env.local，
//   下一次请求立刻生效，无需重启。
//
// 安全约束（重要）：
//   - 读取接口永不回传 key 明文，只回传掩码（sk-abc***xyz）与是否已配置。
//   - 落盘目标固定为 .env.local（被 .gitignore:5 拦截），绝不写别的文件。
//   - 写入前校验格式，拒绝明显不是 key 的输入，避免把垃圾写进配置文件。
//   - 只跑在服务端（Node runtime），客户端永远拿不到 key。

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type AiRuntimeConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

const ENV_PATH = path.join(process.cwd(), ".env.local");

export const DEFAULT_BASE_URL = "https://api.deepseek.com";
export const DEFAULT_MODEL = "deepseek-flash";

/**
 * 内存覆盖层。undefined = 尚未被页面设置过，此时回退到 process.env。
 * 用 globalThis 挂载，避免 Next dev 的模块热重载把状态清空。
 */
const OVERRIDE_KEY = "__knowledgeTableAiOverride__";
type GlobalWithOverride = typeof globalThis & {
  [OVERRIDE_KEY]?: Partial<AiRuntimeConfig> | null;
};
const globalStore = globalThis as GlobalWithOverride;

function override(): Partial<AiRuntimeConfig> | null {
  return globalStore[OVERRIDE_KEY] ?? null;
}

/** 当前生效的配置。优先级：页面设置 > 环境变量 > 默认值 */
export function getAiConfig(): AiRuntimeConfig {
  const o = override();
  return {
    apiKey: (o?.apiKey ?? process.env.AI_API_KEY ?? "").trim(),
    baseUrl: (o?.baseUrl ?? process.env.AI_BASE_URL ?? DEFAULT_BASE_URL).trim(),
    model: (o?.model ?? process.env.AI_MODEL ?? DEFAULT_MODEL).trim(),
  };
}

export function isAiConfigured(): boolean {
  return Boolean(getAiConfig().apiKey && getAiConfig().baseUrl);
}

/** 掩码，用于安全回显：sk-b827e2...5522a7 → sk-b827***2a7 */
export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 12) return `${key.slice(0, 3)}***`;
  return `${key.slice(0, 6)}***${key.slice(-4)}`;
}

/** 配置状态快照 —— 绝不含 key 明文 */
export function getAiStatus() {
  const config = getAiConfig();
  const source: "page" | "env" | "none" = override()?.apiKey
    ? "page"
    : process.env.AI_API_KEY
      ? "env"
      : "none";
  return {
    configured: Boolean(config.apiKey),
    source,
    baseUrl: config.baseUrl,
    model: config.model,
    maskedKey: maskKey(config.apiKey),
    persisted: source === "env" || Boolean(override()?.apiKey),
    envFilePath: ENV_PATH,
  };
}

/**
 * 写入配置：先更新内存（立即生效），再尝试落盘到 .env.local。
 * 落盘失败不阻断 —— 当前进程仍能用内存里的 key 正常工作。
 */
export async function saveAiConfig(input: {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}): Promise<{ persisted: boolean; warning?: string }> {
  const apiKey = input.apiKey.trim();
  const baseUrl = (input.baseUrl || DEFAULT_BASE_URL).trim();
  const model = (input.model || DEFAULT_MODEL).trim();

  globalStore[OVERRIDE_KEY] = { apiKey, baseUrl, model };

  try {
    const existing = await readFile(ENV_PATH, "utf8").catch(() => "");
    const next = mergeEnv(existing, { AI_API_KEY: apiKey, AI_BASE_URL: baseUrl, AI_MODEL: model });
    await writeFile(ENV_PATH, next, "utf8");
    return { persisted: true };
  } catch (error) {
    return {
      persisted: false,
      warning: `已在本进程生效，但写入 .env.local 失败：${(error as Error)?.message ?? "未知错误"}`,
    };
  }
}

/** 清空页面设置，回到环境变量（或未配置）状态 */
export function clearAiOverride(): void {
  globalStore[OVERRIDE_KEY] = null;
}

/**
 * 把键值合并进 .env 文本：已有 key 的就地更新，没有的追加。
 * 保留注释、空行和其他变量，避免覆盖手写内容。
 *
 * ⚠️ 纵深防御：这里会对每个值做最后一道控制字符清洗。
 * 即使上游漏了校验（比如将来新增调用方），也不允许 \n 混进 value ——
 * 否则 `A=x\nB=y` 会在文件里凭空多出一行 B=y，形成 env 注入。
 */
export function mergeEnv(existing: string, updates: Record<string, string>): string {
  const safeUpdates: Record<string, string> = {};
  for (const [name, value] of Object.entries(updates)) {
    // 只保留 \t 之前的正常字符以外全部剔除：换行/回车/控制符一律删掉
    safeUpdates[name] = value.replace(/[\r\n\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/g, "");
  }

  const lines = existing.split(/\r?\n/);
  const handled = new Set<string>();

  const merged = lines.map((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (!match) return line;
    const name = match[1];
    if (!(name in safeUpdates)) return line;
    handled.add(name);
    return `${name}=${safeUpdates[name]}`;
  });

  const missing = Object.keys(safeUpdates).filter((name) => !handled.has(name));
  if (missing.length > 0) {
    if (merged.length > 0 && merged[merged.length - 1].trim() !== "") merged.push("");
    for (const name of missing) merged.push(`${name}=${safeUpdates[name]}`);
  }

  return merged.join("\n");
}

/** 轻量格式校验：非空、无空白、长度合理 */
export function validateApiKey(raw: string): { ok: true } | { ok: false; reason: string } {
  const key = raw.trim();
  if (!key) return { ok: false, reason: "请输入 API Key" };
  if (hasControlChars(key)) return { ok: false, reason: "API Key 不能包含换行或控制字符" };
  if (/\s/.test(key)) return { ok: false, reason: "API Key 不能包含空格或换行" };
  if (key.length < 16) return { ok: false, reason: "API Key 过短，请检查是否复制完整" };
  if (key.length > 200) return { ok: false, reason: "API Key 过长，请检查是否粘贴了多余内容" };
  return { ok: true };
}

/**
 * 控制字符检测（含换行、制表、Unicode 双向控制符、BOM）。
 *
 * ⚠️ 为什么必须查这个：写入 .env 时的格式是 `NAME=value`，value 里一旦混入 \n，
 * 后面那截就会变成一行**新的环境变量赋值**——也就是 env 注入。
 * 对抗测试证明过：baseUrl 传 "https://x\nINJECTED=evil" 会让 .env.local 多出
 * 一行 INJECTED=evil，下次启动即生效，可用来覆盖任意环境变量。
 * 所以所有进入 .env 的字段都必须先过这一关。
 */
export function hasControlChars(value: string): boolean {
  return /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/.test(value);
}

/** 接口地址校验：必须是 http(s) URL，且不含控制字符 */
export function validateBaseUrl(raw: string): { ok: true } | { ok: false; reason: string } {
  const url = raw.trim();
  if (!url) return { ok: false, reason: "请填写接口地址" };
  if (hasControlChars(url)) return { ok: false, reason: "接口地址不能包含换行或控制字符" };
  if (url.length > 300) return { ok: false, reason: "接口地址过长" };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "接口地址格式不正确，应形如 https://api.deepseek.com" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "接口地址必须以 http:// 或 https:// 开头" };
  }
  return { ok: true };
}

/** 模型名校验：非空、无空白与控制字符、长度合理 */
export function validateModel(raw: string): { ok: true } | { ok: false; reason: string } {
  const model = raw.trim();
  if (!model) return { ok: false, reason: "请填写模型名" };
  if (hasControlChars(model) || /\s/.test(model)) {
    return { ok: false, reason: "模型名不能包含空格、换行或控制字符" };
  }
  if (model.length > 100) return { ok: false, reason: "模型名过长" };
  return { ok: true };
}
