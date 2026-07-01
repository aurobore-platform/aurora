import { invoke, on } from "./aurobore.js";

export interface CoverState {
  primaryText?: string;
  secondaryText?: string;
}

export interface CoverAction {
  id: string;
  label: string;
  icon?: string;
}

export interface CoverActionEvent {
  id: string;
}

async function voidInvoke(method: string, args?: unknown): Promise<void> {
  await invoke("Cover", method, args);
}

/** Управление нативной обложкой Aurora (opt-in). */
export const cover = {
  setState(state: CoverState): Promise<void> {
    return voidInvoke("setState", state);
  },

  setActions(actions: CoverAction[]): Promise<void> {
    return voidInvoke("setActions", { actions });
  },

  reset(): Promise<void> {
    return voidInvoke("reset");
  },

  onAction(handler: (data: CoverActionEvent) => void): () => void {
    return on("cover:action", (data) => {
      const payload = data as Partial<CoverActionEvent> | null | undefined;
      handler({ id: String(payload?.id ?? "") });
    });
  },
};
