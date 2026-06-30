import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export interface Prompts {
  ask(label: string): Promise<string>;
  askDefault(label: string, defaultValue: string): Promise<string>;
  confirm(label: string, defaultYes?: boolean): Promise<boolean>;
  close(): void;
}

export function createPrompts(): Prompts {
  const rl = readline.createInterface({ input, output });

  return {
    async ask(label: string): Promise<string> {
      const answer = await rl.question(`${label}: `);
      return answer.trim();
    },

    async askDefault(label: string, defaultValue: string): Promise<string> {
      const answer = await rl.question(`${label} (${defaultValue}): `);
      const trimmed = answer.trim();
      return trimmed === "" ? defaultValue : trimmed;
    },

    async confirm(label: string, defaultYes = true): Promise<boolean> {
      const hint = defaultYes ? "[Y/n]" : "[y/N]";
      const answer = await rl.question(`${label} ${hint}: `);
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === "") return defaultYes;
      return trimmed === "y" || trimmed === "yes";
    },

    close(): void {
      rl.close();
    },
  };
}
