#!/usr/bin/env node
// .harness/hooks/pre-commit.mjs
// 在 commit 之前跑 lint-staged（只 lint 已暂存文件）+ 全量 test。
// Windows 跨平台（用 node 而不是 sh）。
// 详见 .harness/rules/commit-policy.md + .harness/rules/coding-standards.md
//
// 流程：
// 1. lint-staged：对 git 已暂存的文件跑 eslint --fix（仅针对支持的扩展名）
// 2. npm test：跑 tests/*.test.mjs（node 内置 test runner）
//
// 注意：27 路径核心回归（tests/core-branches.mjs）和 RAG 测试（tests/rooms-rag.mjs）
// 都需要 npm run start 跑生产服务，不在 pre-commit 里跑——CI 里跑。

import { spawnSync } from "node:child_process";
import { platform } from "node:process";

const isWindows = platform === "win32";

// Windows 上 npm / npx 是 .cmd，spawnSync 不带 shell 解析不到。
// 直接拼 .cmd 扩展名最稳。
const resolveCmd = (cmd) => (isWindows && (cmd === "npm" || cmd === "npx") ? `${cmd}.cmd` : cmd);

const steps = [
  { name: "harness-check", cmd: "npm", args: ["run", "harness:check"] },
  { name: "lint-staged", cmd: "npx", args: ["--no-install", "lint-staged"] },
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
