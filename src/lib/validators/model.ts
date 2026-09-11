// src/lib/validators/model.ts
// 模型输出解析工具。

export function parseModelJson(text: string): unknown {
  return JSON.parse(
    text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, ""),
  );
}
