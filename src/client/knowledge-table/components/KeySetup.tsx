// src/client/knowledge-table/components/KeySetup.tsx
// AI 配置面板：队友在自己电脑上填自己的 API Key，填完即可用，无需碰 .env.local。
//
// 设计取舍：
//   - 默认折叠成一条窄条，不干扰"加入拼桌"的主线；未配置时自动展开并高亮。
//   - 填写 → 测试连接 → 保存，三步都有明确反馈，避免"填了不知道对不对"。
//   - key 输入框用 type=password，且提交后立刻清空本地 state，
//     页面不会再持有明文（服务端也只回掩码）。

"use client";

import { useCallback, useEffect, useState } from "react";

type AiStatus = {
  configured: boolean;
  source: "page" | "env" | "none";
  baseUrl: string;
  model: string;
  maskedKey: string;
  persisted: boolean;
};

type ProbeResult = { ok: boolean; message: string; latencyMs: number | null };

const SOURCE_LABEL: Record<AiStatus["source"], string> = {
  page: "本页填入",
  env: "环境变量",
  none: "未配置",
};

export function KeySetup() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com");
  const [model, setModel] = useState("deepseek-flash");
  const [busy, setBusy] = useState<"probe" | "save" | null>(null);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/settings");
      const data = (await response.json()) as AiStatus;
      setStatus(data);
      setBaseUrl(data.baseUrl || "https://api.deepseek.com");
      setModel(data.model || "deepseek-flash");
      // 未配置时自动展开，让队友一眼看到该做什么
      if (!data.configured) setOpen(true);
    } catch {
      setError("无法读取配置状态，请确认本地服务正在运行");
    }
  }, []);

  // 拉取配置状态属于"订阅外部系统"。用 cancelled 标记避免卸载后写入 state，
  // 同时满足 react-hooks 对 effect 内 setState 的约束。
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const runProbe = async () => {
    setBusy("probe");
    setProbe(null);
    setError("");
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, baseUrl, model }),
      });
      setProbe((await response.json()) as ProbeResult);
    } catch {
      setProbe({ ok: false, message: "测试请求失败，请确认本地服务正在运行", latencyMs: null });
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy("save");
    setError("");
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, baseUrl, model }),
      });
      const data = (await response.json()) as AiStatus & { error?: string; warning?: string };
      if (!response.ok || data.error) {
        setError(data.error ?? "保存失败");
        return;
      }
      setStatus(data);
      setApiKey(""); // 不在页面里留明文
      setProbe({ ok: true, message: data.warning ?? "已保存，配置立即生效", latencyMs: null });
    } catch {
      setError("保存请求失败，请确认本地服务正在运行");
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    setBusy("save");
    try {
      const response = await fetch("/api/settings", { method: "DELETE" });
      setStatus((await response.json()) as AiStatus);
      setProbe(null);
      setApiKey("");
    } finally {
      setBusy(null);
    }
  };

  // status 为 null 表示"还没问到"（SSR 阶段与 hydration 前）。
  // 这时不能按"未配置"渲染 —— 否则已配好 key 的机器上会先闪一下
  // "还差一步：填入你的 API Key"，看起来像出错了。
  const pending = status === null;
  const configured = status?.configured === true;
  const canSubmit = apiKey.trim().length > 0 && !busy;

  const headLabel = pending
    ? "AI 连接设置"
    : configured
      ? "AI 已接通"
      : "还差一步：填入你的 API Key";
  const headMeta = pending
    ? "检查中…"
    : configured
      ? `${SOURCE_LABEL[status!.source]} · ${status!.maskedKey}`
      : "点此展开";

  return (
    <section className="key-setup" data-configured={configured} data-pending={pending}>
      <button className="key-setup-head" type="button" onClick={() => setOpen((value) => !value)}>
        <span className="key-setup-dot" data-on={configured} data-pending={pending} />
        <b>{headLabel}</b>
        <span className="key-setup-meta">{headMeta}</span>
        <span className="key-setup-chevron">{open ? "收起" : "展开"}</span>
      </button>

      {open && (
        <div className="key-setup-body">
          <p className="key-setup-hint">
            填你自己的 key，只保存在本机 <code>.env.local</code>，不会上传、不会进仓库。
            不填也可以点完整个流程，只是回答会走演示文案。
          </p>

          <label className="key-setup-field">
            <span>API Key</span>
            <input
              type="password"
              value={apiKey}
              placeholder={configured ? `已配置（${status!.maskedKey}），要换就粘贴新的` : "sk-..."}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <div className="key-setup-row">
            <label className="key-setup-field">
              <span>接口地址</span>
              <input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="key-setup-field">
              <span>模型</span>
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          </div>

          {error && <p className="key-setup-error">{error}</p>}
          {probe && (
            <p className="key-setup-probe" data-ok={probe.ok}>
              {probe.ok ? "✓ " : "✕ "}
              {probe.message}
              {probe.latencyMs ? `（${probe.latencyMs}ms）` : ""}
            </p>
          )}

          <div className="key-setup-actions">
            <button type="button" onClick={runProbe} disabled={!canSubmit}>
              {busy === "probe" ? "测试中…" : "测试连接"}
            </button>
            <button type="button" className="key-setup-save" onClick={save} disabled={!canSubmit}>
              {busy === "save" ? "保存中…" : "保存并启用"}
            </button>
            {status?.source === "page" && (
              <button type="button" className="key-setup-reset" onClick={reset} disabled={Boolean(busy)}>
                清除
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
