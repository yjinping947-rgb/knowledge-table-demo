// 脱敏检查 AI Provider 配置与聊天/embedding 可用性。
// 用法：node --env-file=.env.local scripts/check-ai-provider.mjs

const key = process.env.AI_API_KEY?.trim();
const rawBase = process.env.AI_BASE_URL?.trim();
const chatModel = process.env.AI_MODEL?.trim();
const embeddingModel = process.env.AI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";

if (!key || !rawBase || !chatModel) {
  console.error("CONFIG_ERROR: AI_API_KEY、AI_BASE_URL、AI_MODEL 必须存在");
  process.exit(1);
}

let base;
try {
  base = new URL(rawBase);
} catch {
  console.error("CONFIG_ERROR: AI_BASE_URL 不是合法 URL（请去掉两端引号）");
  process.exit(1);
}

if (base.protocol !== "https:" && base.hostname !== "127.0.0.1" && base.hostname !== "localhost") {
  console.error("CONFIG_ERROR: AI_BASE_URL 必须使用 HTTPS（本机地址除外）");
  process.exit(1);
}

const endpoint = rawBase.replace(/\/+$/, "");
const headers = {
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

console.log(`config_read=true base_url=${endpoint} chat_model=${chatModel} embedding_model=${embeddingModel} key_length=${key.length}`);

async function check(name, path, body) {
  try {
    const response = await fetch(`${endpoint}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await response.text();
    const category = response.status === 401
      ? "unauthorized"
      : response.ok
        ? "ok"
        : "provider_error";
    console.log(`${name}_http=${response.status} ${name}_status=${category}`);
    if (!response.ok) return false;
    try {
      const payload = JSON.parse(text);
      if (name === "chat") console.log(`chat_model_returned=${payload.model || "unknown"}`);
      if (name === "embedding") console.log(`embedding_count=${payload.data?.length || 0} embedding_dimensions=${payload.data?.[0]?.embedding?.length || 0}`);
    } catch {
      console.log(`${name}_response=non_json`);
    }
    return true;
  } catch (error) {
    console.log(`${name}_status=network_error message=${error instanceof Error ? error.message.slice(0, 120) : "request failed"}`);
    return false;
  }
}

const chatOk = await check("chat", "/chat/completions", {
  model: chatModel,
  messages: [{ role: "user", content: "Reply with OK" }],
  max_tokens: 8,
  temperature: 0,
});
const embeddingOk = await check("embedding", "/embeddings", {
  model: embeddingModel,
  input: "knowledge table provider check",
});

if (!chatOk || !embeddingOk) process.exit(1);
console.log("AI_PROVIDER_CHECK=PASS");
