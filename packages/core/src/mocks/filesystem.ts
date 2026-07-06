export interface FsEntry {
  type: "file" | "dir";
  content?: string;
  children?: Map<string, FsEntry>;
}

/** In-memory FileSystem mock под app-data sandbox. */
export class MockFilesystemState {
  private readonly root: FsEntry = { type: "dir", children: new Map() };

  private normalizePath(raw: string): string[] {
    const trimmed = raw.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!trimmed) return [];
    if (trimmed.includes("..")) {
      throw new Error("FILESYSTEM_INVALID_PATH");
    }
    return trimmed.split("/").filter(Boolean);
  }

  private resolveDir(segments: string[], create: boolean): FsEntry {
    let current = this.root;
    for (const segment of segments) {
      if (!current.children) current.children = new Map();
      let next = current.children.get(segment);
      if (!next) {
        if (!create) throw new Error("FILESYSTEM_NOT_FOUND");
        next = { type: "dir", children: new Map() };
        current.children.set(segment, next);
      }
      if (next.type !== "dir") throw new Error("FILESYSTEM_IO_ERROR");
      current = next;
    }
    return current;
  }

  readText(path: string): string {
    const segments = this.normalizePath(path);
    if (segments.length === 0) throw new Error("FILESYSTEM_INVALID_PATH");
    const fileName = segments.pop()!;
    const dir = this.resolveDir(segments, false);
    const entry = dir.children?.get(fileName);
    if (!entry || entry.type !== "file") throw new Error("FILESYSTEM_NOT_FOUND");
    return entry.content ?? "";
  }

  writeText(path: string, text: string): void {
    const segments = this.normalizePath(path);
    if (segments.length === 0) throw new Error("FILESYSTEM_INVALID_PATH");
    const fileName = segments.pop()!;
    const dir = this.resolveDir(segments, true);
    if (!dir.children) dir.children = new Map();
    dir.children.set(fileName, { type: "file", content: text });
  }

  exists(path: string): boolean {
    try {
      const segments = this.normalizePath(path);
      if (segments.length === 0) return true;
      const fileName = segments.pop()!;
      const dir = this.resolveDir(segments, false);
      return dir.children?.has(fileName) ?? false;
    } catch {
      return false;
    }
  }

  mkdir(path: string): void {
    this.resolveDir(this.normalizePath(path), true);
  }

  delete(path: string): void {
    const segments = this.normalizePath(path);
    if (segments.length === 0) throw new Error("FILESYSTEM_INVALID_PATH");
    const fileName = segments.pop()!;
    const dir = this.resolveDir(segments, false);
    if (!dir.children?.delete(fileName)) throw new Error("FILESYSTEM_NOT_FOUND");
  }

  list(path: string): string[] {
    const dir = this.resolveDir(this.normalizePath(path), false);
    return [...(dir.children?.keys() ?? [])];
  }
}
