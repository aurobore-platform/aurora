import fs from "node:fs";
import type { AuroraEnv } from "./env.js";
import { openSshTool } from "./env.js";
import { ensureEmulator, scpArgs, sshArgs } from "./emulator.js";
import { runCommand } from "./sync.js";

export interface DeployOptions {
  rpmPath: string;
  remoteRpmName: string;
  env: AuroraEnv;
}

export async function deployRpm(options: DeployOptions): Promise<void> {
  const { rpmPath, remoteRpmName, env } = options;
  if (!env.EMULATOR_SSH_KEY || !fs.existsSync(env.EMULATOR_SSH_KEY)) {
    throw new Error("EMULATOR_SSH_KEY not set or missing (see tools/aurora/local.env.example)");
  }
  await ensureEmulator(env);
  const remoteRpm = `/tmp/${remoteRpmName}`;
  runCommand(openSshTool(env, "scp"), scpArgs(env, rpmPath, remoteRpm), { env });
  runCommand(
    openSshTool(env, "ssh"),
    sshArgs(env, `sudo rpm -Uvh --replacepkgs --define '__transaction_validation %{nil}' ${remoteRpm}`),
    { env },
  );
}

export interface RunOnEmulatorOptions {
  runScriptPath: string;
  remoteScriptName: string;
  env: AuroraEnv;
  /** CEF remote debugging port passed to the app process on device. */
  cefDebugPort?: number;
}

export async function runOnEmulator(options: RunOnEmulatorOptions): Promise<void> {
  const { runScriptPath, remoteScriptName, env, cefDebugPort } = options;
  await ensureEmulator(env);
  runCommand(openSshTool(env, "scp"), scpArgs(env, runScriptPath, `/tmp/${remoteScriptName}`), {
    env,
  });
  const cefPort =
    cefDebugPort != null
      ? String(cefDebugPort)
      : env.AUROBORE_CEF_DEBUG_PORT?.trim() || "";
  const exports: string[] = [];
  if (cefPort) exports.push(`AUROBORE_CEF_DEBUG_PORT=${cefPort}`);
  const qtRules = env.AUROBORE_QT_LOGGING_RULES?.trim();
  if (qtRules) {
    const escaped = qtRules.replace(/'/g, "'\\''");
    exports.push(`AUROBORE_QT_LOGGING_RULES='${escaped}'`);
  }
  const exportPrefix =
    exports.length > 0 ? `${exports.map((e) => `export ${e}`).join("; ")}; ` : "";
  const remoteCmd =
    exports.length > 0
      ? `${exportPrefix}sudo -E sh /tmp/${remoteScriptName}`
      : `sudo sh /tmp/${remoteScriptName}`;
  runCommand(openSshTool(env, "ssh"), sshArgs(env, remoteCmd), { env });
}

/** Генерирует run-script для приложения на эмуляторе. */
export function generateRunScript(
  appId: string,
  env: AuroraEnv,
  cefDebugPort?: number,
): string {
  const cefDebugExport =
    cefDebugPort != null ? `  export AUROBORE_CEF_DEBUG_PORT=${cefDebugPort}\n` : "";

  return `#!/bin/sh
set -eu

pkill -f ${appId} 2>/dev/null || true
sleep 1
rm -f /tmp/app.log

session_wait=0
session_max="${env.EMULATOR_SESSION_WAIT_SEC}"
while [ "$session_wait" -lt "$session_max" ]; do
  if test -S /run/display/wayland-0 && test -d /run/user/100000; then
    break
  fi
  sleep 2
  session_wait=$((session_wait + 2))
done

su "\${POC_RUN_USER:-defaultuser}" -s /bin/sh -c '
  export XDG_RUNTIME_DIR=/run/user/100000
  export WAYLAND_DISPLAY=/run/display/wayland-0
  export QT_QPA_PLATFORM=wayland
  export LD_LIBRARY_PATH=/usr/lib/cef:\${LD_LIBRARY_PATH:-}
${cefDebugExport}  nohup /usr/bin/${appId} >/tmp/app.log 2>&1 &
'

sleep 5
max_wait="${env.POC_RUN_WAIT_SEC}"
elapsed=0
while [ "$elapsed" -lt "$max_wait" ]; do
  if journalctl --no-pager -n 100 --since "1 min ago" 2>/dev/null | grep -q "aurobore-app loaded"; then
    echo "=== RESULT: app started ==="
    tail -n 30 /tmp/app.log 2>/dev/null || true
    exit 0
  fi
  sleep 3
  elapsed=$((elapsed + 3))
done

cat /tmp/app.log 2>/dev/null || true
echo "=== RESULT: app start timeout ==="
exit 1
`;
}
