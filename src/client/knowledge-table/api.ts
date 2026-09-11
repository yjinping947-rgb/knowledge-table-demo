// src/client/knowledge-table/api.ts
// 客户端 fetch 封装。

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("request failed");
  return response.json();
}
