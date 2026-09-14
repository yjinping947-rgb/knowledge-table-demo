// src/lib/session/guard.ts
// 对抗性防护层。
//
// 背景：对抗性测试（.workbuddy/probe/adversarial.py）暴露了 4 个缺口：
//   D1/D2 会话可枚举 —— deriveSessionId 对匿名请求按 (topicId, seatId) 确定性生成，
//         任何人复用同一 seatId 就能读到别人填的隐私条件（月薪/房贷/身份证）。
//   D3   事实可伪造 —— summary 的 legacy 字段无脑取语料原文，且 sessionContext
//         把用户输入直接渲染成「本桌碰撞」，模型会把伪造内容当已发生事实。
//   B1   席位可收买 —— 用户在 question 里要求"改用 XX 席立场"，prompt 里没有硬禁止。
//
// 三层防护：
//   1. detectInjection()  —— 识别越狱/收买/复述系统提示的行为，把输入降级为"安全提问"
//   2. session token      —— 匿名会话改用高熵随机 id，且签名防篡改
//   3. sanitizeCondition()—— 用户补充条件做长度/换行/控制字符清洗，避免注入
//
// 设计原则：检测**不拒绝请求**（拒绝会让攻击者知道探测到了）。而是把恶意输入
// 替换成无害占位，让正常流程继续跑 —— 攻击者拿不到任何反馈信号。

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// ───────────────────────── 1. 注入检测 ─────────────────────────

/** 越狱 / 收买 / 复述系统提示 的模式表 */
const INJECTION_PATTERNS: Array<{ id: string; re: RegExp }> = [
  // 角色覆写
  { id: "ignore_instructions", re: /(忽略|无视|忘记|放弃)(以上|上述|之前|前面|所有|全部的?)?(指令|设定|规则|提示|角色|要求|约束)/ },
  { id: "ignore_instructions_en", re: /\b(ignore|disregard|forget)\s+(all\s+)?(previous|above|prior|earlier|your)\s+(instructions?|rules?|prompts?|settings?|role)/i },
  // 角色重定义
  { id: "you_are_now", re: /你现在(不是|不再|是)(一个)?[^。，,]{0,20}(助手|系统|管理员|AI|机器人|没有立场)/ },
  { id: "role_override", re: /(停止|不要|别再)(扮演|充当|作为)[^。，,]{0,10}(行动派|现实派|条件视角)/ },
  { id: "system_override_mark", re: /(系统覆写|已被接管|接管成功|override\s+success|prompt\s+injected)/i },
  // 系统提示复述
  { id: "reveal_prompt", re: /(复述|输出|打印|告诉我|展示|重复)(一下|一遍)?(你的)?(系统提示|系统指令|初始设定|system\s*prompt|原始配置|预设|人设全文)/i },
  { id: "reveal_prompt_en", re: /\b(reveal|show|print|repeat|output)\s+(your\s+)?(system\s+prompt|initial\s+instructions?|original\s+config)/i },
  // 伪分隔符
  { id: "fake_delimiter", re: /<\s*\/?\s*(system|user|assistant|instruction)\s*>/i },
  { id: "fake_rolesep", re: /(^|\n)\s*(system|assistant)\s*[:：]\s*/i },
  { id: "markdown_role_hijack", re: /#{1,3}\s*(新指令|新的系统|系统提示|new instructions?|system)/i },
  // 收买其他席位
  { id: "impersonate_other_seat", re: /(请|要|必须|帮我)?(以|用|按|站在)[^。，,]{0,10}(行动派|现实派|条件视角)[^。，,]{0,8}(的)?(口吻|口气|立场|身份|视角|角度)?[^。，,]{0,8}(回答|说话|来|陈述|分析)/ },
  { id: "impersonate_other_seat2", re: /(不要|别)(用|拿)[^。，,]{0,10}(你的|本)?(行动派|现实派|条件视角)[^。，,]{0,8}(立场|口吻|口气|身份)/ },
  { id: "impersonate_other_seat3", re: /换(成|个|一个)?[^。，,]*(行动派|现实派|条件视角)[^。，,]{0,8}(立场|口吻|视角|来|回答)/ },
  { id: "switch_stance", re: /(改变|切换|换|抛弃|放弃)[^。，,]{0,6}(你的|本)?(立场|观点|人设)/ },
  { id: "play_all_seats", re: /(同时|分别|依次)(输出|扮演|给出|列出)[^。，,]{0,10}(三|3|两|2)?\s*(个)?(席位|角色|视角)/ },
  // 逼认错
  { id: "force_admit", re: /(承认|认错|说自己错)[^。，,]{0,12}(我错了|裸辞是错|是错的|不应该)/ },
  // 编造要求
  { id: "fabricate_citation", re: /(编|伪造|虚构|随便给|杜撰)(一个|个)?[^。，,]{0,10}(答主|链接|引用|原话|数据|统计)/ },
  { id: "fabricate_experience", re: /(你的|讲讲你的|说说你的)[^。，,]{0,8}(亲身经历|个人经历|当年|自己的经历)/ },
];

export type InjectionVerdict = {
  /** 是否检测到注入 */
  flagged: boolean;
  /** 命中的模式 id 列表（只进日志，不返回给客户端） */
  hits: string[];
  /** 清洗后的安全文本（命中时替换为占位，未命中时原样返回） */
  safeText: string;
};

const SAFE_PLACEHOLDER = "请直接针对本话题给我一个判断。";

/**
 * 检测并中和注入。
 *
 * 注意：命中后**不报错**，而是把输入替换成一句无害的追问。
 * 这样攻击者无法通过响应差异判断自己是否被识别（避免 oracle 攻击）。
 */
export function detectInjection(raw: string): InjectionVerdict {
  const hits: string[] = [];
  for (const { id, re } of INJECTION_PATTERNS) {
    if (re.test(raw)) hits.push(id);
  }
  return {
    flagged: hits.length > 0,
    hits,
    safeText: hits.length > 0 ? SAFE_PLACEHOLDER : raw,
  };
}

// ───────────────────────── 2. 会话 token ─────────────────────────

/** 进程级随机会话盐。重启即变 —— 旧 token 自然失效。 */
const SESSION_SECRET = randomBytes(32);
/** 服务端签发的房间号形态 */
const SESSION_ID_RE = /^s_[0-9a-f]{24}$/;
/**
 * 客户端自带会话号的合法形态：字母/数字/下划线/连字符，长度 8..120。
 *
 * 为什么放宽到"接受客户端 id"：前端契约要求响应把 sessionId 原样回显，
 * 否则客户端会判定请求/响应错配并整段降级（见 index.tsx 的 responseMatchesRequest）。
 * 而安全性并不因此下降 —— 客户端用 `sess_${randomUUID()}` 生成，
 * 猜中别人会话号的概率可忽略。真正要拦的是旧实现的**确定性**房间号
 * `anon_{topicId}_{seatId}`（对抗测试 D1 的枚举入口）。
 */
const SESSION_ID_SHAPE = /^[A-Za-z0-9_-]{8,120}$/;
const LEGACY_DETERMINISTIC_RE = /^anon_/;

export function newSessionId(): string {
  return `s_${randomBytes(12).toString("hex")}`;
}

export function signSessionId(sessionId: string): string {
  return createHmac("sha256", SESSION_SECRET).update(sessionId).digest("hex").slice(0, 16);
}

export function verifySessionId(sessionId: string, sig?: string): boolean {
  if (!SESSION_ID_RE.test(sessionId)) return false;
  if (!sig) return true; // 允许前端只带 id（首次拿到时还没签名）
  const expect = signSessionId(sessionId);
  const a = Buffer.from(expect);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * 解析客户端传来的 sessionId。
 *
 * 旧实现的问题：任何不含 sessionId 的匿名请求都会被派到
 * `anon_{topicId}_{seatId}` —— 这是**确定性**的，等于公开的默认房间号，
 * 任何人复用同一 seatId 就能读到别人填的隐私条件。
 *
 * 新策略：
 *   - 客户端带了合法形态的 id → 原样复用（前端要求回显，见下方说明）
 *   - 客户端带的是旧式 `anon_*` 或含特殊字符 → 丢弃，派新房间（防枚举/注入）
 *   - 没带 → 每次派新房间（高熵随机，不可猜）
 */
export function resolveSessionId(input: { provided?: string; signature?: string }): {
  sessionId: string;
  rejected: boolean;
} {
  const provided = input.provided?.trim();
  if (!provided) {
    return { sessionId: newSessionId(), rejected: false };
  }
  if (!SESSION_ID_SHAPE.test(provided) || LEGACY_DETERMINISTIC_RE.test(provided)) {
    // 形态不合法（旧 anon_ 前缀 / 路径字符 / 超长 / 控制字符）→ 拒绝，换新房间
    return { sessionId: newSessionId(), rejected: true };
  }
  // 服务端签发的房间号（s_*）若带回签名，必须验签；
  // 客户端自带的 id（sess_* 等）没有签名，直接接受。
  if (SESSION_ID_RE.test(provided) && input.signature && !verifySessionId(provided, input.signature)) {
    return { sessionId: newSessionId(), rejected: true };
  }
  return { sessionId: provided, rejected: false };
}

// ───────────────────────── 3. 用户输入清洗 ─────────────────────────

/** 控制字符与双向覆写字符（可用来视觉欺骗 / 绕过文本匹配） */
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

/**
 * 清洗用户补充的个人条件。
 * 这类内容会被直接渲染进 prompt 的「用户补充的个人条件」块，
 * 所以必须限制长度、去掉换行（防止伪造新的 prompt 段落）。
 */
export function sanitizeCondition(raw: string, max = 60): string {
  return raw
    .replace(CONTROL_CHARS, "")
    .replace(/[\r\n]+/g, " ") // 换行是伪造 prompt 段落的主要手段
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeConditions(list: string[]): string[] {
  return list
    .map((c) => sanitizeCondition(c))
    .filter((c) => c.length > 0)
    .slice(0, 10);
}

/** 清洗会进入 prompt 的普通文本字段（保留换行，但去控制字符） */
export function sanitizeText(raw: string): string {
  return raw.replace(CONTROL_CHARS, "");
}
