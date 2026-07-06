/**
 * Smoke test for `aurobore dev --web`: starts server, checks HTML injection and mock assets.
 * Usage: node tools/aurora/verify-web-dev.mjs [projectDir]
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cliEntry = path.join(repoRoot, "packages/cli/dist/cli.js");
const projectDir = path.resolve(repoRoot, process.argv[2] ?? "examples/camera-demo");
const port = 5199;

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }),
        );
      })
      .on("error", reject);
  });
}

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await httpGet(url);
      if (res.status === 200) return res;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server not ready: ${url}`);
}

if (!fs.existsSync(cliEntry)) {
  console.error("[verify-web-dev] build CLI first: pnpm --filter @aurobore/cli build");
  process.exit(1);
}

const child = spawn(process.execPath, [cliEntry, "dev", "--web", "--no-open", "--port", String(port)], {
  cwd: projectDir,
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, FORCE_COLOR: "0" },
});

let log = "";
child.stdout?.on("data", (d) => {
  log += d.toString();
});
child.stderr?.on("data", (d) => {
  log += d.toString();
});

const killChild = () => {
  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }
};

process.on("exit", killChild);
process.on("SIGINT", () => {
  killChild();
  process.exit(130);
});

try {
  const entryUrl = `http://127.0.0.1:${port}/`;
  console.log(`[verify-web-dev] project: ${projectDir}`);
  console.log(`[verify-web-dev] waiting for ${entryUrl}`);

  const page = await waitForServer(entryUrl);
  const checks = [
    ["aurobore-bridge-web.js", page.body.includes("aurobore-bridge-web.js")],
    ["aurobore-web-shim.js", page.body.includes("aurobore-web-shim.js")],
    ["aurobore-chrome.css", page.body.includes("aurobore-chrome.css")],
  ];

  const bridge = await httpGet(`http://127.0.0.1:${port}/js/aurobore-bridge-web.js`);
  checks.push(["bridge bundle 200", bridge.status === 200]);
  checks.push(["browser mock initialized", bridge.body.includes("browser mock mode initialized")]);

  const photo = await httpGet(`http://127.0.0.1:${port}/app-data/fixtures/photo.jpg`);
  checks.push(["photo fixture 200", photo.status === 200]);

  let failed = false;
  for (const [name, ok] of checks) {
    console.log(`[verify-web-dev] ${ok ? "OK" : "FAIL"}: ${name}`);
    if (!ok) failed = true;
  }

  killChild();
  if (failed) {
    console.error("[verify-web-dev] log tail:\n", log.slice(-2000));
    process.exit(1);
  }
  console.log("[verify-web-dev] all checks passed");
} catch (err) {
  killChild();
  console.error("[verify-web-dev] ERROR:", err instanceof Error ? err.message : String(err));
  console.error(log.slice(-2000));
  process.exit(1);
}
