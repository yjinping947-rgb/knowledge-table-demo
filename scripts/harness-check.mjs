#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, ".harness/repo-manifest.json");

const fail = (message) => {
  console.error(`[harness:check] FAIL: ${message}`);
  process.exitCode = 1;
};

if (!existsSync(manifestPath)) {
  fail("missing .harness/repo-manifest.json");
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(`invalid manifest JSON: ${error.message}`);
  process.exit(1);
}

const manifestPaths = [
  manifest.repo?.primaryHumanEntry,
  manifest.repo?.primaryAgentEntry,
  ...Object.values(manifest.agentEntrypoints ?? {}),
  ...(manifest.requiredFiles ?? []),
  ...Object.values(manifest.skills ?? {}),
].filter(Boolean);
const requiredFiles = [...new Set(manifestPaths)];
for (const file of new Set(requiredFiles)) {
  if (!existsSync(resolve(root, file))) fail(`missing required path: ${file}`);
}

const packagePath = resolve(root, "package.json");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
for (const [name, command] of Object.entries(manifest.canonicalCommands ?? {})) {
  if (name === "harnessCheck") {
    const actual = packageJson.scripts?.["harness:check"];
    if (!actual) fail("package.json is missing scripts.harness:check");
    if (actual && !actual.includes("scripts/harness-check.mjs")) {
      fail("scripts.harness:check must run scripts/harness-check.mjs");
    }
  }
  if (typeof command !== "string" || command.length === 0) {
    fail(`empty canonical command: ${name}`);
    continue;
  }
  for (const match of command.matchAll(/npm run ([a-z0-9:_-]+)/g)) {
    const scriptName = match[1];
    if (!packageJson.scripts?.[scriptName]) {
      fail(`canonical command ${name} references missing npm script: ${scriptName}`);
    }
  }
}

const skillFiles = Object.values(manifest.skills ?? {});
const markdownLinkPattern = /\]\(([^)]+)\)/g;
for (const skillFile of skillFiles) {
  const source = readFileSync(resolve(root, skillFile), "utf8");
  let match;
  while ((match = markdownLinkPattern.exec(source))) {
    const target = match[1].split("#", 1)[0].trim();
    if (!target || target.startsWith("http://") || target.startsWith("https://") || target.startsWith("mailto:")) continue;
    const targetPath = resolve(dirname(resolve(root, skillFile)), target);
    if (!existsSync(targetPath)) fail(`broken link in ${skillFile}: ${target}`);
  }
}

if (process.exitCode) {
  console.error("[harness:check] repair the reported navigation or contract issues");
  process.exit(1);
}

console.log(`[harness:check] PASS: ${relative(root, manifestPath)} and ${skillFiles.length} skills are wired`);
