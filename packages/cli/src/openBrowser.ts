import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Открывает URL в системном браузере (desktop). */
export async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  if (platform === "win32") {
    await execFileAsync("cmd", ["/c", "start", "", url], { windowsHide: true });
    return;
  }
  if (platform === "darwin") {
    await execFileAsync("open", [url]);
    return;
  }
  await execFileAsync("xdg-open", [url]);
}
