/** HTML-инъекция bridge-скриптов для `aurobore dev --web`. */

export const WEB_MODE_MARKER = 'data-aurobore-web-mode="1"';

const HEAD_INJECTION = `<link rel="stylesheet" href="/css/aurobore-chrome.css" ${WEB_MODE_MARKER} />`;

const BODY_INJECTION = `<script src="/js/aurobore-bridge-web.js"></script>
<script src="/js/aurobore-plugins.js"></script>
<script src="/js/aurobore-web-shim.js"></script>`;

/** Вставляет chrome CSS и bridge-скрипты, если ещё не инжектировано. */
export function injectAuroboreWebMode(html: string): string {
  if (html.includes(WEB_MODE_MARKER)) return html;

  let out = html;
  if (out.includes("</head>")) {
    out = out.replace("</head>", `  ${HEAD_INJECTION}\n</head>`);
  } else if (out.includes("<body")) {
    out = out.replace(/<body([^>]*)>/, `<body$1>\n${HEAD_INJECTION}`);
  } else {
    out = `${HEAD_INJECTION}\n${out}`;
  }

  if (out.includes("</body>")) {
    out = out.replace("</body>", `  ${BODY_INJECTION}\n</body>`);
  } else {
    out = `${out}\n${BODY_INJECTION}`;
  }

  return out;
}
