/** HTML-инъекция bridge-скриптов для `aurobore dev --web`. */

export const WEB_MODE_MARKER = 'data-aurobore-web-mode="1"';
export const POLYFILLS_MARKER = 'data-aurobore-polyfills="1"';

const HEAD_INJECTION = `<link rel="stylesheet" href="/css/aurobore-chrome.css" ${WEB_MODE_MARKER} />`;

const BODY_INJECTION = `<script src="/js/aurobore-bridge-web.js"></script>
<script src="/js/aurobore-plugins.js"></script>
<script src="/js/aurobore-web-shim.js"></script>`;

/** true = дефолтный набор; массив id = явный выбор; false/null/undefined = выключено. */
export type PolyfillsInjection = boolean | string[] | null;

export interface InjectWebModeOptions {
  polyfills?: PolyfillsInjection;
}

function isPolyfillsOn(p: PolyfillsInjection | undefined): boolean {
  if (p === true) return true;
  if (Array.isArray(p) && p.length > 0) return true;
  return false;
}

function polyfillsScriptTag(scriptSrc: string, ids?: string[] | null): string {
  const dataAttr = ids && ids.length > 0 ? ` data-polyfills="${ids.join(",")}"` : "";
  return `<script src="${scriptSrc}" ${POLYFILLS_MARKER}${dataAttr}></script>`;
}

/** Вставляет script polyfills после plugins, если ещё не инжектировано. */
export function injectPolyfillsScript(
  html: string,
  scriptSrc = "/js/aurobore-polyfills.js",
  ids?: string[] | null,
): string {
  if (html.includes(POLYFILLS_MARKER)) return html;
  const tag = polyfillsScriptTag(scriptSrc, ids);

  const pluginsTag = '<script src="/js/aurobore-plugins.js"></script>';
  if (html.includes(pluginsTag)) {
    return html.replace(pluginsTag, `${pluginsTag}\n${tag}`);
  }
  const bridgeTag = '<script src="/js/aurobore-bridge.js"></script>';
  if (html.includes(bridgeTag)) {
    return html.replace(bridgeTag, `${bridgeTag}\n${tag}`);
  }
  if (html.includes("</body>")) {
    return html.replace("</body>", `  ${tag}\n</body>`);
  }
  return `${html}\n${tag}`;
}

function polyfillsIds(p: PolyfillsInjection | undefined): string[] | null {
  return Array.isArray(p) ? p : null;
}

/** Вставляет chrome CSS и bridge-скрипты, если ещё не инжектировано. */
export function injectAuroboreWebMode(html: string, options?: InjectWebModeOptions): string {
  const polyfillsOn = isPolyfillsOn(options?.polyfills);
  const ids = polyfillsIds(options?.polyfills);

  if (html.includes(WEB_MODE_MARKER)) {
    if (polyfillsOn) return injectPolyfillsScript(html, "/js/aurobore-polyfills.js", ids);
    return html;
  }

  let out = html;
  if (out.includes("</head>")) {
    out = out.replace("</head>", `  ${HEAD_INJECTION}\n</head>`);
  } else if (out.includes("<body")) {
    out = out.replace(/<body([^>]*)>/, `<body$1>\n${HEAD_INJECTION}`);
  } else {
    out = `${HEAD_INJECTION}\n${out}`;
  }

  let injection = BODY_INJECTION;
  if (polyfillsOn) {
    injection = `${BODY_INJECTION}\n${polyfillsScriptTag("/js/aurobore-polyfills.js", ids)}`;
  }

  if (out.includes("</body>")) {
    out = out.replace("</body>", `  ${injection}\n</body>`);
  } else {
    out = `${out}\n${injection}`;
  }

  return out;
}
