import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type RealtimeZhihuSource = {
  contentId: string;
  title: string;
  author: string;
  contentText: string;
  url: string;
  voteUpCount: number;
  commentCount: number;
  authorityLevel: number;
  sourceProvider: "zhihu-realtime";
};

export type RealtimeSearchResult =
  | { status: "ok"; sources: RealtimeZhihuSource[]; cached: boolean; elapsedMs: number }
  | { status: "empty" | "error"; sources: []; cached: boolean; elapsedMs: number; code?: number; message?: string };

type CacheEntry = { expiresAt: number; value: RealtimeSearchResult };

// 实时搜索是全站检索，结果不天然受项目 topicId 约束。这里仅保留能明确
// 命中当前话题的内容；宁可回退到该话题的本地语料，也不把相邻话题硬塞进回答。
const TOPIC_SIGNALS: Record<string, string[]> = {
  T01: ["裸辞", "辞职", "离职", "空窗期", "社保断缴"],
  T02: ["跳槽", "涨薪", "加薪", "谈薪", "换工作"],
  T03: ["35岁", "35 岁", "年龄危机", "中年危机", "大龄求职"],
  T04: ["工作倦怠", "职业倦怠", "职场倦怠", "内耗", "不想上班", "工作疲惫", "burnout"],
  T05: ["副业", "兼职", "第二收入", "副收入"],
  T06: ["大厂", "小公司", "小厂", "创业公司", "公司规模"],
  T07: ["转行", "跨行", "职业转型", "跨领域求职"],
  T08: ["学历", "文凭", "考研", "学历贬值"],
  T09: ["体制内", "公务员", "事业单位", "编制", "考公", "机关单位"],
  T10: ["晋升", "升职", "管理岗", "职级", "职场发展"],
  T11: ["抑郁", "焦虑", "心理健康", "情绪问题", "心理问题"],
  T12: ["婚姻", "相亲", "结婚", "伴侣", "恋爱"],
  T13: ["买房", "房贷", "首付", "住房", "购房"],
  T14: ["消费降级", "消费观", "消费", "存钱", "省钱"],
  T15: ["父母", "原生家庭", "亲子", "养老"],
  T16: ["同事", "职场边界", "职场社交", "人际边界", "同事情谊"],
  T17: ["人工智能", "大模型", "AI时代", "AI 时代", "AI能力", "AI 能力"],
  T18: ["远程工作", "远程办公", "居家办公", "数字游民"],
  T19: ["自媒体", "个人IP", "个人 IP", "内容创作", "博主", "账号运营"],
  T20: ["行业选择", "选行业", "行业前景", "赛道选择", "选赛道"],
};

const CUSTOM_STOPWORDS = new Set(["什么", "如何", "怎么", "怎样", "可以", "应该", "是否", "有没有", "为什么", "哪个", "哪些", "一个", "现在", "自己", "问题", "想问"]);

function questionSignals(question: string): string[] {
  const parts = question.match(/[\u4e00-\u9fff]+|[a-zA-Z0-9]+/g) ?? [];
  const result: string[] = [];
  for (const part of parts) {
    if (/^[\u4e00-\u9fff]+$/.test(part)) {
      for (let size = 4; size >= 2; size--) {
        for (let i = 0; i + size <= part.length; i++) {
          const token = part.slice(i, i + size);
          if (!CUSTOM_STOPWORDS.has(token)) result.push(token);
        }
      }
    } else if (part.length >= 2) {
      result.push(part);
    }
  }
  return Array.from(new Set(result)).sort((a, b) => b.length - a.length).slice(0, 24);
}

export function filterRealtimeSourcesForTopic(
  topicId: string,
  sources: RealtimeZhihuSource[],
  customQuestion?: string,
): RealtimeZhihuSource[] {
  const signals = topicId === "CUSTOM"
    ? questionSignals(customQuestion ?? "")
    : TOPIC_SIGNALS[topicId];
  if (!signals?.length) return [];
  const competingProfiles = Object.entries(TOPIC_SIGNALS).filter(([id]) => id !== topicId);
  const score = (text: string, profile: string[]) => profile.reduce(
    (total, signal) => total + (text.includes(signal.toLowerCase().replace(/\s+/g, "")) ? 1 : 0),
    0,
  );
  return sources.filter((source) => {
    const title = source.title.toLowerCase().replace(/\s+/g, "");
    const body = source.contentText.slice(0, 700).toLowerCase().replace(/\s+/g, "");
    const titleScore = score(title, signals);
    const bodyScore = score(body, signals);
    // 标题明确命中当前主题，通常就是该主题的搜索结果；但如果标题更像
    // 另一个话题，不能被正文里偶然出现的一处关键词“洗回来”。
    const strongestCompetitorTitle = Math.max(
      0,
      ...competingProfiles.map(([, profile]) => score(title, profile)),
    );
    if (titleScore > 0) return strongestCompetitorTitle <= titleScore;
    // 标题没有主题词时，至少要在摘要前 700 字出现两个独立主题信号。
    // 单次顺带提及（例如“做自媒体前别裸辞”）不算当前主题材料。
    return bodyScore >= 2 && strongestCompetitorTitle === 0;
  });
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 15 * 60_000;
const DEFAULT_MAX_ENTRIES = 100;
const DEFAULT_CACHE_FILE = ".tmp/zhihu-search-cache.json";
let cacheLoaded = false;
let cacheLoadPromise: Promise<void> | null = null;
let persistQueue: Promise<void> = Promise.resolve();

function numberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function cliPath(): string {
  return process.env.ZHIHU_CLI_PATH || "C:\\Users\\HONOR\\AppData\\Local\\ZhihuCLI\\current\\zhihu-cli.exe";
}

function cacheFilePath(): string {
  return resolve(process.cwd(), DEFAULT_CACHE_FILE);
}

function normalizeUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const url = value.trim();
  if (/[?&]utm_openai_platform=/.test(url) || /[?&]utm=openai_platform/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}utm=openai_platform`;
}

function pick(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function asInt(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

export function normalizeRealtimeSources(payload: unknown): RealtimeZhihuSource[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const dataValue = root.Data ?? root.data;
  const data = Array.isArray(dataValue)
    ? dataValue
    : dataValue && typeof dataValue === "object"
      ? Array.isArray((dataValue as Record<string, unknown>).Items)
        ? (dataValue as Record<string, unknown>).Items as unknown[]
        : Array.isArray((dataValue as Record<string, unknown>).items)
          ? (dataValue as Record<string, unknown>).items as unknown[]
          : []
      : [];
  return data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const contentText = String(pick(record, "ContentText", "contentText", "Summary", "summary") || "").trim();
    const title = String(pick(record, "Title", "title") || "知乎回答").trim();
    const url = normalizeUrl(pick(record, "Url", "URL", "url"));
    if (!contentText || !url) return [];
    return [{
      contentId: String(pick(record, "ContentID", "ContentId", "contentId", "AnswerId", "answerId") || url),
      title,
      author: String(pick(record, "AuthorName", "authorName", "Author", "author") || "知乎答主").trim(),
      contentText,
      url,
      voteUpCount: asInt(pick(record, "VoteUpCount", "voteUpCount", "VoteCount")),
      commentCount: asInt(pick(record, "CommentCount", "commentCount")),
      authorityLevel: asInt(pick(record, "AuthorityLevel", "authorityLevel")),
      sourceProvider: "zhihu-realtime" as const,
    }];
  });
}

function cacheKey(query: string, count: number): string {
  return `${query.trim().replace(/\s+/g, " ").toLowerCase()}::${count}`;
}

function isCacheValue(value: unknown): value is RealtimeSearchResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (record.status === "ok" || record.status === "empty" || record.status === "error")
    && Array.isArray(record.sources)
    && typeof record.elapsedMs === "number";
}

async function loadPersistentCache(): Promise<void> {
  if (cacheLoaded) return;
  if (cacheLoadPromise) return cacheLoadPromise;
  cacheLoadPromise = (async () => {
    try {
      const raw = JSON.parse(await readFile(cacheFilePath(), "utf8")) as unknown;
      if (!raw || typeof raw !== "object") return;
      const now = Date.now();
      for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
        if (!entry || typeof entry !== "object") continue;
        const record = entry as Record<string, unknown>;
        if (typeof record.expiresAt !== "number" || record.expiresAt <= now || !isCacheValue(record.value)) continue;
        cache.set(key, { expiresAt: record.expiresAt, value: { ...record.value, cached: false } });
      }
      const maxEntries = numberEnv("ZHIHU_SEARCH_CACHE_MAX", DEFAULT_MAX_ENTRIES);
      while (cache.size > maxEntries) cache.delete(cache.keys().next().value as string);
    } catch {
      // 缓存文件不存在、损坏或不可读时，安全地从空缓存开始。
    } finally {
      cacheLoaded = true;
      cacheLoadPromise = null;
    }
  })();
  return cacheLoadPromise;
}

function persistCache(): Promise<void> {
  const entries = Object.fromEntries(cache.entries());
  persistQueue = persistQueue.then(async () => {
    const file = cacheFilePath();
    try {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(entries), "utf8");
    } catch {
      // 持久化失败不影响本次实时请求；内存缓存仍然有效。
    }
  });
  return persistQueue;
}

async function cacheSet(key: string, value: RealtimeSearchResult): Promise<void> {
  const maxEntries = numberEnv("ZHIHU_SEARCH_CACHE_MAX", DEFAULT_MAX_ENTRIES);
  while (cache.size >= maxEntries) cache.delete(cache.keys().next().value as string);
  const ttl = value.status === "ok"
    ? numberEnv("ZHIHU_SEARCH_CACHE_TTL_MS", DEFAULT_TTL_MS)
    : Math.min(numberEnv("ZHIHU_SEARCH_ERROR_CACHE_TTL_MS", 10_000), DEFAULT_TTL_MS);
  cache.set(key, { expiresAt: Date.now() + ttl, value });
  await persistCache();
}

/**
 * Search Zhihu through the user's locally authenticated CLI.
 * The cache is memory-first and persisted locally with TTL. It prevents duplicate
 * requests within one app instance and across normal development restarts. The
 * cache file contains only normalized search results, never credentials.
 */
export async function searchZhihuRealtime(query: string, count = 3): Promise<RealtimeSearchResult> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return { status: "empty", sources: [], cached: false, elapsedMs: 0 };
  if (process.env.ZHIHU_REALTIME_DISABLED === "1") {
    return { status: "error", sources: [], cached: false, elapsedMs: 0, message: "知乎实时搜索已禁用" };
  }
  await loadPersistentCache();
  const safeCount = Math.min(10, Math.max(1, Math.floor(count)));
  const key = cacheKey(normalizedQuery, safeCount);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { ...cached.value, cached: true };
  if (cached) cache.delete(key);

  const started = Date.now();
  try {
    const { stdout } = await execFileAsync(cliPath(), ["search", "zhihu", "--query", normalizedQuery, "--count", String(safeCount)], {
      // 搜索只负责补充实时来源；超过这个时间就交给当前主题的本地语料，
      // 不让用户一直等一个不可用的远端请求。
      timeout: numberEnv("ZHIHU_SEARCH_TIMEOUT_MS", 5_000),
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    });
    const payload = JSON.parse(stdout) as Record<string, unknown>;
    const sources = normalizeRealtimeSources(payload);
    const result: RealtimeSearchResult = {
      status: sources.length ? "ok" : "empty",
      sources,
      cached: false,
      elapsedMs: Date.now() - started,
      ...(typeof payload.Code === "number" ? { code: payload.Code } : {}),
      ...(typeof payload.Message === "string" ? { message: payload.Message } : {}),
    } as RealtimeSearchResult;
    await cacheSet(key, result);
    return result;
  } catch (error) {
    const elapsedMs = Date.now() - started;
    const message = error instanceof Error ? error.message.slice(0, 160) : "知乎搜索调用失败";
    const result: RealtimeSearchResult = { status: "error", sources: [], cached: false, elapsedMs, message };
    await cacheSet(key, result);
    return result;
  }
}

export function clearZhihuSearchCache(): void {
  cache.clear();
  cacheLoaded = false;
  cacheLoadPromise = null;
}
