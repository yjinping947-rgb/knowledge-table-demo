#!/usr/bin/env node
// .harness/hooks/pre-commit.mjs
// 在 commit 之前跑 lint + test。Windows 跨平台（用 node 而不是 sh）。
// 详见 .harness/rules/commit-policy.md

import { spawnSync } from "node:child_process";
import { platform } from "node:process";

const isWindows = platform === "win32";

// Windows 上 npm / npx 是 .cmd，spawnSync 不带 shell 解析不到。
// 直接拼 .cmd 扩展名最稳。
const resolveCmd = (cmd) => (isWindows && (cmd === "npm" || cmd === "npx") ? `${cmd}.cmd` : cmd);

const steps = [
  { name: "lint", cmd: "npm", args: ["run", "lint"] },
  { name: "test", cmd: "npm", args: ["test"] },
];

for (const step of steps) {
  console.log(`[pre-commit] running ${step.name}...`);
  const result = spawnSync(resolveCmd(step.cmd), step.args, { stdio: "inherit", shell: isWindows });
  if (result.status !== 0) {
    console.error(
      `[pre-commit] ${step.name} failed: status=${result.status} signal=${result.signal} error=${result.error?.message}`,
    );
    process.exit(result.status ?? 1);
  }
}

console.log("[pre-commit] all checks passed");
