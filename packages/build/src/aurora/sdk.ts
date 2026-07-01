import fs from "node:fs";
import path from "node:path";
import type { AuroraEnv } from "./env.js";
import { resolveSfdkPath } from "./env.js";
import { runCommand } from "./sync.js";
import { assertBuildEngineReady } from "./docker.js";

export function sfdkBuild(cwd: string, target: string, env: AuroraEnv): void {
  assertBuildEngineReady();
  const sfdk = resolveSfdkPath(env);
  const args = ["-c", `target=${target}`, "build"];
  // inherit: live Docker/SDK log; pipe buffers until process exit (looks "stuck" for hours).
  runCommand(sfdk, args, {
    cwd,
    inherit: true,
    env,
  });
}

export function findRpm(buildDir: string, rpmGlob: string): string {
  const rpmsDir = path.join(buildDir, "RPMS");
  const re = new RegExp(`^${rpmGlob.replace(/\*/g, ".*")}$`);
  const rpms = fs.existsSync(rpmsDir) ? fs.readdirSync(rpmsDir).filter((f) => re.test(f)) : [];
  if (rpms.length === 0) {
    throw new Error(`RPM not found in ${rpmsDir} (pattern ${rpmGlob})`);
  }
  const rpm = rpms[0];
  if (!rpm) {
    throw new Error(`RPM not found in ${rpmsDir} (pattern ${rpmGlob})`);
  }
  return path.join(rpmsDir, rpm);
}
