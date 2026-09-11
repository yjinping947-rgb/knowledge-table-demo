#!/usr/bin/env node
// .harness/hooks/commit-msg.mjs
// 调 commitlint 校验 commit message。Windows 跨平台。
// 详见 .harness/rules/commit-policy.md

import { spawnSync } from "node:child_process";
import { platform } from "node:process";

const commitMsgFile = process.argv[2];
if (!commitMsgFile) {
  console.error("[commit-msg] missing commit message file path");
  process.exit(1);
}

const isWindows = platform === "win32";
const cmd = isWindows ? "npx.cmd" : "npx";

const result = spawnSync(cmd, ["--no-install", "commitlint", "--edit", commitMsgFile], {
  stdio: "inherit",
  shell: isWindows,
});

if (result.status !== 0) {
  console.error(
    `[commit-msg] commitlint failed: status=${result.status} signal=${result.signal} error=${result.error?.message}`,
  );
  process.exit(result.status ?? 1);
}
