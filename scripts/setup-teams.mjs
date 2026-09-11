// scripts/setup-teams.mjs
// 用 gh CLI 在 GitHub 组织里创建 4 个 team + 加成员。
// 对应 .harness/roles/ 下 4 个 human 角色（agent-dev / ui-design / feature-design / corpus）。
// 详见 docs/contributing/team-setup.md。
//
// 用法：
//   1. 配 GH_TOKEN 或 `gh auth login`（create / add-members 模式需要）
//   2. 改下面的 ORG 常量
//   3. 跑 `node scripts/setup-teams.mjs create`
//   4. 跑 `node scripts/setup-teams.mjs add-members <github-handle>` 加成员
//   5. **不需 admin 模式**：跑 `node scripts/setup-teams.mjs single-user <handle>`（单人开发时）
//
// 不会重复创建已存在的 team（idempotent）。

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// —— 配置 ——
const ORG = "MiniMax";  // GitHub 组织名（请改成你的）

// 4 个 team + 描述
const TEAMS = [
  {
    name: "agent-dev",
    description: "Knowledge Table Demo — Agent 运行时开发（5 AI 角色 + RAG + SDK）",
  },
  {
    name: "ui-design",
    description: "Knowledge Table Demo — UI 设计（src/client/ + 4 frozen 资源）",
  },
  {
    name: "feature-design",
    description: "Knowledge Table Demo — 功能设计（app/api/ + contracts + tests）",
  },
  {
    name: "corpus",
    description: "Knowledge Table Demo — 语料收集（src/data/ + scripts/）",
  },
];

// 缓存文件：避免重复创建时打 GitHub
const CACHE = resolve(process.cwd(), ".tmp/team-cache.json");

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf-8", ...opts }).trim();
  } catch (e) {
    return { error: e.stderr?.toString() || e.message };
  }
}

function loadCache() {
  if (!existsSync(CACHE)) return {};
  try {
    return JSON.parse(readFileSync(CACHE, "utf-8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  writeFileSync(CACHE, JSON.stringify(cache, null, 2));
}

function teamExists(name) {
  // gh api /orgs/{org}/teams/{team_slug} 返回 200 / 404
  const r = sh(`gh api /orgs/${ORG}/teams/${name} -H "Accept: application/vnd.github+json"`);
  if (typeof r === "string" && r.length > 0 && !r.startsWith("{")) {
    // 可能是错误返回
    try {
      const j = JSON.parse(r);
      return !!j.id;
    } catch {
      return false;
    }
  }
  try {
    const j = JSON.parse(r);
    return !!j.id;
  } catch {
    return false;
  }
}

function createTeam(team) {
  console.log(`  creating team: ${team.name}...`);
  const r = sh(
    `gh api --method POST /orgs/${ORG}/teams ` +
    `-f name="${team.name}" ` +
    `-f description="${team.description}" ` +
    `-f privacy="closed" ` +
    `-H "Accept: application/vnd.github+json"`,
  );
  try {
    const j = JSON.parse(r);
    if (j.id) {
      console.log(`    ✓ created (id=${j.id}, slug=${j.slug})`);
      return j;
    }
    console.log(`    ✗ failed: ${r}`);
    return null;
  } catch {
    console.log(`    ✗ failed: ${r}`);
    return null;
  }
}

function addMembers(teamSlug, handles) {
  for (const handle of handles) {
    console.log(`    adding member: ${handle}...`);
    const r = sh(
      `gh api --method PUT /orgs/${ORG}/teams/${teamSlug}/memberships/${handle} ` +
      `-F role="member" ` +
      `-H "Accept: application/vnd.github+json"`,
    );
    try {
      const j = JSON.parse(r);
      if (j.role) {
        console.log(`      ✓ added (role=${j.role})`);
      } else {
        console.log(`      ✗ failed: ${r}`);
      }
    } catch {
      console.log(`      ✗ failed: ${r}`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const handles = args.slice(1).filter((a) => !a.startsWith("--"));

  if (cmd !== "create" && cmd !== "add-members" && cmd !== "list" && cmd !== "single-user" && cmd !== "team-mode") {
    console.log("Usage:");
    console.log("  node scripts/setup-teams.mjs create                    # 建 4 个 team（需要 org admin）");
    console.log("  node scripts/setup-teams.mjs add-members <handle>...   # 加成员到 4 个 team");
    console.log("  node scripts/setup-teams.mjs list                      # 列现有 team");
    console.log("  node scripts/setup-teams.mjs single-user <handle>      # 单人模式：把 CODEOWNERS 改成 @<handle>（不需 admin）");
    console.log("  node scripts/setup-teams.mjs team-mode                 # 还原 single-user → 4 team 模式");
    console.log("");
    console.log(`Configured org: ${ORG}`);
    console.log("Edit this script to change ORG.");
    process.exit(0);
  }

  if (cmd === "list") {
    console.log(`Existing teams in @${ORG}:`);
    const r = sh(`gh api /orgs/${ORG}/teams -H "Accept: application/vnd.github+json" --paginate`);
    try {
      const teams = JSON.parse(r);
      for (const t of teams) {
        const exists = TEAMS.some((x) => x.name === t.slug);
        const marker = exists ? "✓ (in spec)" : " ";
        console.log(`  ${marker} ${t.slug}  — ${t.name}`);
      }
    } catch {
      console.log(`  (failed to list: ${r})`);
    }
    return;
  }

  if (cmd === "create") {
    console.log(`Creating teams in @${ORG}...`);
    const cache = loadCache();
    for (const team of TEAMS) {
      if (cache[team.name]) {
        console.log(`  ${team.name}: cached, skipping`);
        continue;
      }
      if (teamExists(team.name)) {
        console.log(`  ${team.name}: already exists, skipping`);
        cache[team.name] = "exists";
        continue;
      }
      const j = createTeam(team);
      if (j) {
        cache[team.name] = j.slug || team.name;
      }
    }
    saveCache(cache);
    console.log("");
    console.log("Next steps:");
    console.log("  1. 跑 `node scripts/setup-teams.mjs list` 验证");
    console.log("  2. 跑 `node scripts/setup-teams.mjs add-members <your-handle>` 加你自己到 4 个 team");
    console.log("  3. 如果需要更多人，用 `add-members <handle1> <handle2> ...`");
    console.log("  4. 详见 docs/contributing/team-setup.md");
    return;
  }

  if (cmd === "add-members") {
    if (handles.length === 0) {
      console.error("需要至少一个 github handle：node scripts/setup-teams.mjs add-members <handle> [...]");
      process.exit(1);
    }
    for (const team of TEAMS) {
      console.log(`Adding to ${team.name}:`);
      addMembers(team.name, handles);
    }
    return;
  }

  if (cmd === "single-user") {
    // 单人模式：不需要 admin。把所有 @MiniMax/<role>-team 替换为 @<handle>。
    // 适合：单人开发 / 没法建组织 team / 想立刻让 CODEOWNERS 生效。
    if (handles.length === 0) {
      console.error("需要你的 github handle：node scripts/setup-teams.mjs single-user <handle>");
      console.error("例如：node scripts/setup-teams.mjs single-user hock2022");
      process.exit(1);
    }
    const handle = handles[0];
    const ownersPath = resolve(process.cwd(), ".github/CODEOWNERS");
    if (!existsSync(ownersPath)) {
      console.error(`找不到 ${ownersPath}`);
      process.exit(1);
    }
    let content = readFileSync(ownersPath, "utf-8");
    const original = content;

    // 替换所有 @MiniMax/<role>-team 为 @<handle>
    content = content.replace(/@MiniMax\/[\w-]+/g, `@${handle}`);

    if (content === original) {
      console.log(`CODEOWNERS 里没有找到 @MiniMax/<role>-team，可能已经是 single-user 模式`);
      console.log(`(或者 ORG 常量不是 MiniMax)`);
      return;
    }

    // 写一份备份
    const backup = ownersPath + ".team-mode.bak";
    writeFileSync(backup, original, "utf-8");
    writeFileSync(ownersPath, content, "utf-8");
    console.log(`✓ CODEOWNERS → single-user mode (all @MiniMax/<role>-team → @${handle})`);
    console.log(`  备份：${backup}`);
    console.log(`  下次跑 \`node scripts/setup-teams.mjs team-mode\` 还原`);
    return;
  }

  if (cmd === "team-mode") {
    // 还原 single-user → 4 team 模式。从备份恢复。
    const ownersPath = resolve(process.cwd(), ".github/CODEOWNERS");
    const backup = ownersPath + ".team-mode.bak";
    if (!existsSync(backup)) {
      console.error(`找不到备份 ${backup}，无法还原`);
      process.exit(1);
    }
    const original = readFileSync(backup, "utf-8");
    writeFileSync(ownersPath, original, "utf-8");
    console.log(`✓ CODEOWNERS 还原为 4 team 模式（从 .team-mode.bak）`);
    return;
  }
}

main();
