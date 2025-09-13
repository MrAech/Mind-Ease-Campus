#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

let envPath = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("Neither .env.local nor .env found in project root");
    process.exit(1);
  }
  console.log(`Using env file: ${envPath}`);
} else {
  console.log(`Using env file: ${envPath}`);
}

const content = fs.readFileSync(envPath, "utf8");
const lines = content
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);
const env = {};
for (const line of lines) {
  if (line.startsWith("#")) continue;
  const idx = line.indexOf("=");
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const val = line.slice(idx + 1).trim();
  env[key] = val;
}

function runConvexEnvSet(key, value) {
  console.log(`Setting convex env ${key}`);
  const res = spawnSync("npx", ["convex", "env", "set", key, "--", value], {
    stdio: "inherit",
    shell: true,
  });
  if (res.status !== 0) {
    console.error(`Failed to set ${key}`);
    process.exit(res.status || 1);
  }
}

if (env.JWT_PRIVATE_KEY) {
  const base64 = Buffer.from(env.JWT_PRIVATE_KEY, "utf8").toString("base64");
  runConvexEnvSet("JWT_PRIVATE_KEY_BASE64", base64);
}

if (env.JWKS) {
  runConvexEnvSet("JWKS", env.JWKS);
}

if (env.SITE_URL || env.CONVEX_SITE_URL) {
  runConvexEnvSet("SITE_URL", env.SITE_URL || env.CONVEX_SITE_URL);
}

console.log("Done syncing env file to Convex env.");
