// scripts/setup-teams.mjs
// 用 gh CLI 在 GitHub 组织里创建 4 个 team + 加成员。
// 对应 .harness/roles/ 下 4 个 human 角色（agent-dev / ui-design / feature-design / corpus）。
// 详见 docs/contributing/team-setup.md。
//
// 用法：
//   1. 配 GH_TOKEN 或 `gh auth login`
//   2. 改下面的 ORG 常量
//   3. 跑 `node scripts/setup-teams.mjs`
//   4. 跑 `node scripts/setup-teams.mjs --add-members <github-handle>` 加成员
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

  if (cmd !== "create" && cmd !== "add-members" && cmd !== "list") {
    console.log("Usage:");
    console.log("  node scripts/setup-teams.mjs create");
    console.log("  node scripts/setup-teams.mjs add-members <github-handle> [<handle>...]");
    console.log("  node scripts/setup-teams.mjs list");
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
    } catch (e) {
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
}

main();
