import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Returns @aurobore/cli package version from package.json. */
export function readCliVersion(): string {
  try {
    const pkgPath = path.join(__dirname, "..", "package.json");
    return (require(pkgPath) as { version: string }).version;
  } catch {
    return "0.0.0";
  }
}
