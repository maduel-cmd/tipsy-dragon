#!/usr/bin/env node
/**
 * After vite build: write dist/precache.json with every offline-needed URL.
 */
import { readdirSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const distPath = fileURLToPath(new URL("../dist/", import.meta.url));

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "precache.json") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(distPath);
const urls = files
  .map((f) => "/" + relative(distPath, f).split("\\").join("/"))
  .filter((u) => !u.includes("/.") && !u.endsWith("/sw.js"))
  .sort();

const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  count: urls.length,
  urls,
};

writeFileSync(join(distPath, "precache.json"), JSON.stringify(payload, null, 2) + "\n");
console.log(`precache.json → ${urls.length} urls`);
