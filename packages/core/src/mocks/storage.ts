/** In-memory Storage mock (сессия браузера). */
export class MockStorageState {
  private readonly data = new Map<string, string>();

  get(key: string): string | undefined {
    return this.data.get(key);
  }

  set(key: string, value: string): void {
    this.data.set(key, value);
  }

  remove(key: string): void {
    this.data.delete(key);
  }

  keys(): string[] {
    return [...this.data.keys()];
  }

  clear(): void {
    this.data.clear();
  }
}
