import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateCMakeLists, NATIVE_SDK_SOURCES } from "./generate.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../../..");
const CONTAINER_CMAKE = path.join(REPO_ROOT, "runtime", "container", "CMakeLists.txt");
const NATIVE_SDK_DIR = path.join(REPO_ROOT, "runtime", "native-sdk");

function parseContainerNativeSdkSources(cmakeText: string): string[] {
  const re = /\$\{NATIVE_SDK_DIR\}\/([A-Za-z0-9_]+\.cpp)/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(cmakeText)) !== null) {
    found.add(match[1]!);
  }
  return [...found].sort();
}

describe("generateCMakeLists native-sdk parity", () => {
  it("NATIVE_SDK_SOURCES совпадает с .cpp в runtime/native-sdk", () => {
    const onDisk = fs
      .readdirSync(NATIVE_SDK_DIR)
      .filter((f) => f.endsWith(".cpp"))
      .sort();
    expect([...NATIVE_SDK_SOURCES].sort()).toEqual(onDisk);
  });

  it("generateCMakeLists включает все NATIVE_SDK_SOURCES", () => {
    const cmake = generateCMakeLists("ru.example.app", "1.0.0", []);
    for (const file of NATIVE_SDK_SOURCES) {
      expect(cmake).toContain(`\${NATIVE_SDK_DIR}/${file}`);
    }
  });

  it("generateCMakeLists паритет с runtime/container/CMakeLists.txt", () => {
    const containerSources = parseContainerNativeSdkSources(
      fs.readFileSync(CONTAINER_CMAKE, "utf8"),
    );
    const cmake = generateCMakeLists("ru.example.app", "1.0.0", []);
    for (const file of containerSources) {
      expect(cmake).toContain(`\${NATIVE_SDK_DIR}/${file}`);
    }
    expect(containerSources).toEqual([...NATIVE_SDK_SOURCES].sort());
  });
});
