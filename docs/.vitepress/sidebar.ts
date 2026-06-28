import type { DefaultTheme } from "vitepress";
import type { DocsAudience } from "./audience";

type SidebarItem = DefaultTheme.SidebarItem;

const pluginItems: SidebarItem[] = [
  { text: "Обзор", link: "/plugins/" },
  { text: "Plugin API", link: "/plugins/plugin-api" },
  { text: "Стандартные плагины", link: "/plugins/standard-plugins" },
  { text: "Echo", link: "/plugins/echo" },
  { text: "Device", link: "/plugins/device" },
  { text: "Storage", link: "/plugins/storage" },
  { text: "FileSystem", link: "/plugins/filesystem" },
  { text: "Clipboard", link: "/plugins/clipboard" },
  { text: "Network", link: "/plugins/network" },
];

const generatedPluginItems: SidebarItem[] = [
  { text: "Обзор (generated)", link: "/api/plugins/" },
  { text: "Echo", link: "/api/plugins/echo" },
  { text: "Device", link: "/api/plugins/device" },
  { text: "Storage", link: "/api/plugins/storage" },
  { text: "FileSystem", link: "/api/plugins/filesystem" },
  { text: "Clipboard", link: "/api/plugins/clipboard" },
  { text: "Network", link: "/api/plugins/network" },
];

const tutorialsSidebar: SidebarItem[] = [
  { text: "Обзор", link: "/tutorials/" },
  { text: "Быстрый старт", link: "/tutorials/quick-start" },
  { text: "Использование плагинов", link: "/tutorials/using-plugins" },
  { text: "События и lifecycle", link: "/tutorials/events-and-lifecycle" },
];

const humanAuroraSidebar: SidebarItem[] = [
  { text: "Разработка приложений", link: "/aurora/app-development" },
  { text: "Песочница и разрешения", link: "/aurora/sandbox-and-permissions" },
];

const humanRootSidebar: SidebarItem[] = [
  {
    text: "Начало",
    items: [
      { text: "Быстрый старт", link: "/tutorials/quick-start" },
      { text: "Справочник API", link: "/api/" },
      { text: "Плагины", link: "/plugins/" },
    ],
  },
];

export const appSidebar: SidebarItem[] = [
  {
    text: "Tutorials",
    items: tutorialsSidebar,
  },
  {
    text: "API Reference",
    items: [
      { text: "Core & CLI", link: "/api/" },
      { text: "Generated plugins", link: "/api/plugins/" },
    ],
  },
  {
    text: "Plugins",
    collapsed: false,
    items: pluginItems,
  },
];

export const apiSidebar: SidebarItem[] = [
  { text: "Core & CLI", link: "/api/" },
  {
    text: "Generated (from manifest)",
    items: generatedPluginItems,
  },
  {
    text: "Handbook",
    collapsed: true,
    items: pluginItems,
  },
];

export const pluginsSidebar: SidebarItem[] = [
  ...pluginItems,
  {
    text: "Generated API",
    collapsed: true,
    items: generatedPluginItems.slice(1),
  },
];

export const architectureSidebar: SidebarItem[] = [
  { text: "Обзор", link: "/architecture/" },
  { text: "Runtime", link: "/architecture/runtime" },
  { text: "Bridge", link: "/architecture/bridge" },
  { text: "Plugin System", link: "/architecture/plugin-system" },
  { text: "Plugin Loader", link: "/architecture/plugin-loader" },
  { text: "Event System", link: "/architecture/event-system" },
  { text: "Configuration", link: "/architecture/configuration" },
  { text: "Build System", link: "/architecture/build-system" },
  { text: "Dev Server", link: "/architecture/dev-server" },
  { text: "CLI", link: "/architecture/cli" },
  { text: "TypeScript SDK", link: "/architecture/typescript-sdk" },
  { text: "Native SDK", link: "/architecture/native-sdk" },
];

export const devSidebar: SidebarItem[] = [
  { text: "Обзор", link: "/dev/" },
  { text: "Native plugin guide", link: "/dev/native-plugin-guide" },
  { text: "Adding a plugin", link: "/dev/adding-a-plugin" },
];

export const adrSidebar: SidebarItem[] = [
  { text: "Реестр ADR", link: "/adr/" },
  { text: "ADR-001 Runtime", link: "/adr/ADR-001-runtime-architecture" },
  { text: "ADR-002 Bridge", link: "/adr/ADR-002-bridge-model" },
  { text: "ADR-003 Plugin API", link: "/adr/ADR-003-plugin-api" },
  { text: "ADR-004 WebView", link: "/adr/ADR-004-webview-engine-abstraction" },
  { text: "ADR-005 CLI", link: "/adr/ADR-005-cli-stack" },
  { text: "ADR-006 Configuration", link: "/adr/ADR-006-configuration-format" },
  { text: "ADR-007 Packaging", link: "/adr/ADR-007-packaging-build" },
  { text: "ADR-008 Codegen", link: "/adr/ADR-008-typescript-sdk-codegen" },
  { text: "ADR-009 Naming", link: "/adr/ADR-009-naming" },
  { text: "Шаблон", link: "/adr/ADR-000-template" },
];

export const rfcSidebar: SidebarItem[] = [
  { text: "RFC", link: "/rfc/" },
  { text: "Шаблон", link: "/rfc/RFC-000-template" },
];

export const auroraSidebar: SidebarItem[] = [
  { text: "Обзор", link: "/aurora/" },
  { text: "SDK Overview", link: "/aurora/sdk-overview" },
  { text: "App Development", link: "/aurora/app-development" },
  { text: "Build & Packaging", link: "/aurora/build-and-packaging" },
  { text: "Tooling", link: "/aurora/tooling" },
  { text: "WebView", link: "/aurora/webview" },
  { text: "Sandbox & Permissions", link: "/aurora/sandbox-and-permissions" },
  { text: "Requirements", link: "/aurora/requirements-and-conventions" },
  { text: "Glossary", link: "/aurora/glossary" },
  { text: "Verification Status", link: "/aurora/verification-status" },
  { text: "Sources", link: "/aurora/sources" },
];

export const projectSidebar: SidebarItem[] = [
  {
    text: "Проект",
    items: [
      { text: "Карта документов", link: "/README" },
      { text: "Видение", link: "/vision" },
      { text: "Глоссарий", link: "/glossary" },
      { text: "Требования", link: "/requirements" },
      { text: "Структура репо", link: "/repository-structure" },
      { text: "Roadmap", link: "/roadmap" },
      { text: "MVP Plan", link: "/mvp-plan" },
    ],
  },
];

export function internalSidebar(repoUrl: string): SidebarItem[] {
  return [
    {
      text: "Internal (maintainer)",
      items: [
        { text: "Agents", link: "/agents/" },
        { text: "Checklists", link: "/checklists" },
        {
          text: "Task (original)",
          link: `${repoUrl}/blob/main/docs/task.txt`,
        },
      ],
    },
  ];
}

function buildHumanSidebar(): DefaultTheme.Sidebar {
  return {
    "/tutorials/": [{ text: "Tutorials", items: tutorialsSidebar }],
    "/api/": [{ text: "API Reference", link: "/api/" }],
    "/plugins/": [{ text: "Plugins", items: pluginItems }],
    "/aurora/": [{ text: "Aurora OS", items: humanAuroraSidebar }],
    "/": humanRootSidebar,
  };
}

function buildFullSidebar(repoUrl: string): DefaultTheme.Sidebar {
  const rootSidebar = [...projectSidebar, ...internalSidebar(repoUrl)];

  return {
    "/tutorials/": appSidebar,
    "/api/": apiSidebar,
    "/plugins/": pluginsSidebar,
    "/architecture/": architectureSidebar,
    "/dev/": devSidebar,
    "/adr/": adrSidebar,
    "/rfc/": rfcSidebar,
    "/aurora/": auroraSidebar,
    "/agents/": internalSidebar(repoUrl),
    "/checklists": internalSidebar(repoUrl),
    "/": rootSidebar,
  };
}

export function buildSidebar(audience: DocsAudience, repoUrl: string): DefaultTheme.Sidebar {
  return audience === "human" ? buildHumanSidebar() : buildFullSidebar(repoUrl);
}
