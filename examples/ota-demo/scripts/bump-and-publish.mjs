import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const version = process.argv[2] ?? process.env.BUNDLE_VERSION ?? "1.0.1";

process.env.BUNDLE_VERSION = version;

const build = spawnSync("node", ["scripts/build-web.mjs"], { cwd: root, stdio: "inherit", shell: true });
if (build.status !== 0) process.exit(build.status ?? 1);

const cli = path.resolve(root, "../../packages/cli/dist/cli.js");
const publish = spawnSync(
  "node",
  [cli, "update", "publish", "--bundle-version", version],
  { cwd: root, stdio: "inherit", shell: true },
);
process.exit(publish.status ?? 1);
