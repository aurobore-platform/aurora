import { defineConfig } from "vitepress";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildSidebar } from "./sidebar";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

function readRepoUrl(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      repository?: { url?: string };
    };
    const url = pkg.repository?.url?.replace(/\.git$/, "") ?? "";
    if (url.startsWith("git+")) return url.slice(4);
    if (url.startsWith("git@github.com:")) {
      return `https://github.com/${url.slice("git@github.com:".length)}`;
    }
    return url || "https://github.com/aurobore/aurora";
  } catch {
    return "https://github.com/aurobore/aurora";
  }
}

const isPublic = process.env.DOCS_PUBLIC === "1";
const repoUrl =
  process.env.GITHUB_REPOSITORY != null
    ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
    : readRepoUrl();

const srcExclude = ["**/task.txt"];
if (isPublic) {
  srcExclude.push("agents/**", "checklists.md");
}

/** README.md в подпапках → index маршрут (/tutorials/, /plugins/, …). */
const readmeIndexDirs = [
  "tutorials",
  "plugins",
  "api",
  "api/plugins",
  "architecture",
  "dev",
  "adr",
  "rfc",
  "aurora",
  "agents",
] as const;

const rewrites = Object.fromEntries(
  readmeIndexDirs.map((dir) => [`${dir}/README.md`, `${dir}/index.md`]),
);

export default defineConfig({
  lang: "ru-RU",
  title: "Aurobore",
  description:
    "Открытая платформа для WebView-приложений под ОС Аврора (мост + плагины + CLI).",
  base: process.env.DOCS_BASE ?? "/",
  cleanUrls: true,
  ignoreDeadLinks: true,
  srcExclude,
  rewrites,
  head: [["meta", { name: "theme-color", content: "#3c8772" }]],

  themeConfig: {
    siteTitle: "Aurobore",
    externalLinkIcon: true,

    nav: [
      { text: "Начало", link: "/tutorials/", activeMatch: "/tutorials/" },
      { text: "API", link: "/api/", activeMatch: "/api/" },
      { text: "Плагины", link: "/plugins/", activeMatch: "/plugins/" },
      { text: "Архитектура", link: "/architecture/", activeMatch: "/architecture/" },
      { text: "Aurora", link: "/aurora/", activeMatch: "/aurora/" },
      ...(isPublic
        ? []
        : [{ text: "Internal", link: "/agents/", activeMatch: "/agents/|/checklists" }]),
    ],

    sidebar: buildSidebar(isPublic, repoUrl),

    search: {
      provider: "local",
      options: {
        translations: {
          button: {
            buttonText: "Поиск",
            buttonAriaLabel: "Поиск",
          },
          modal: {
            displayDetails: "Показать подробности",
            resetButtonTitle: "Сбросить",
            backButtonTitle: "Назад",
            noResultsText: "Ничего не найдено",
            footer: {
              selectKey: "Enter — выбрать",
              navigateUpKey: "↑",
              navigateDownKey: "↓",
              closeKey: "Esc — закрыть",
            },
          },
        },
      },
    },

    darkModeSwitchLabel: "Тема",
    lightModeSwitchTitle: "Светлая тема",
    darkModeSwitchTitle: "Тёмная тема",
    sidebarMenuLabel: "Меню",
    returnToTopLabel: "Наверх",
    docFooter: {
      prev: "Назад",
      next: "Далее",
    },
    outline: {
      label: "На этой странице",
    },
  },
});
