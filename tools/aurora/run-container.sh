#!/bin/sh
# Запуск M1/M3 container на эмуляторе (вызывается через SSH от poc.mjs deploy/run).
set -eu

cef_debug_export=""
if [ -n "${AUROBORE_CEF_DEBUG_PORT:-}" ]; then
  cef_debug_export="export AUROBORE_CEF_DEBUG_PORT=${AUROBORE_CEF_DEBUG_PORT}
"
fi

qt_logging_export=""
if [ -n "${AUROBORE_QT_LOGGING_RULES:-}" ]; then
  qt_logging_export="export QT_LOGGING_RULES=\"${AUROBORE_QT_LOGGING_RULES}\"
"
fi

w3_external_export=""
if [ -n "${AUROBORE_W3_EXTERNAL:-}" ]; then
  w3_external_export="export AUROBORE_W3_EXTERNAL=${AUROBORE_W3_EXTERNAL}
"
fi

w4_auth_export=""
if [ -n "${AUROBORE_W4_AUTH:-}" ]; then
  w4_auth_export="export AUROBORE_W4_AUTH=${AUROBORE_W4_AUTH}
"
fi

w5_cookies_export=""
if [ -n "${AUROBORE_W5_COOKIES:-}" ]; then
  w5_cookies_export="export AUROBORE_W5_COOKIES=${AUROBORE_W5_COOKIES}
"
fi

w6_dispose_export=""
if [ -n "${AUROBORE_W6_DISPOSE:-}" ]; then
  w6_dispose_export="export AUROBORE_W6_DISPOSE=${AUROBORE_W6_DISPOSE}
"
fi

pkill -f ru.auroraos.aurobore-container 2>/dev/null || true
sleep 1
rm -f /tmp/container.log

# Дождаться Wayland-сессии (при холодном старте эмулятора SSH поднимается раньше GUI).
session_wait=0
session_max="${EMULATOR_SESSION_WAIT_SEC:-90}"
while [ "$session_wait" -lt "$session_max" ]; do
  if test -S /run/display/wayland-0 && test -d /run/user/100000; then
    break
  fi
  sleep 2
  session_wait=$((session_wait + 2))
done
if ! test -S /run/display/wayland-0; then
  echo "=== ERROR: Wayland socket /run/display/wayland-0 недоступен (${session_max}s) ==="
  exit 1
fi

su "${POC_RUN_USER:-defaultuser}" -s /bin/sh -c "
  export XDG_RUNTIME_DIR=/run/user/100000
  export WAYLAND_DISPLAY=/run/display/wayland-0
  export QT_QPA_PLATFORM=wayland
  export LD_LIBRARY_PATH=/usr/lib/cef:\${LD_LIBRARY_PATH:-}
  ${cef_debug_export}${qt_logging_export}${w3_external_export}${w4_auth_export}${w5_cookies_export}${w6_dispose_export}  nohup /usr/bin/ru.auroraos.aurobore-container >/tmp/container.log 2>&1 &
"

sleep 2
if ! pgrep -f ru.auroraos.aurobore-container >/dev/null 2>&1; then
  echo "=== ERROR: процесс ru.auroraos.aurobore-container не запустился ==="
  echo "=== LOG START ==="
  cat /tmp/container.log 2>/dev/null || echo "(пусто)"
  echo "=== LOG END ==="
  exit 1
fi

# Дождаться загрузки WebView, M2- и M3-проверок (stream ~1.2s после ready).
sleep 10

if [ -n "${AUROBORE_W6_DISPOSE:-}" ]; then
  success_pattern="W6 OK: 10 dispose cycles complete"
  max_wait="${POC_RUN_WAIT_SEC:-120}"
else
  success_pattern="M3 OK: plugins registered"
  max_wait="${POC_RUN_WAIT_SEC:-90}"
fi

print_cef_debug_journal_header() {
  if [ -n "${AUROBORE_CEF_DEBUG_PORT:-}" ]; then
    echo "=== CEF DEBUG (WebView / Chrome DevTools) ==="
    echo "Device listens: 127.0.0.1:${AUROBORE_CEF_DEBUG_PORT}"
    echo "Inspect URL: printed after container:run (fetch json/list on PC)"
    echo "Full guide: docs/dev/web-debugging.md"
    echo "============================================="
  fi
}

elapsed=0
while [ "$elapsed" -lt "$max_wait" ]; do
  if journalctl --no-pager -n 200 2>/dev/null | grep -q "$success_pattern"; then
    echo "=== LOG (tail) ==="
    tail -n 40 /tmp/container.log 2>/dev/null || true
    print_cef_debug_journal_header
    echo "=== JOURNAL (container) ==="
    journalctl --no-pager -n 120 2>/dev/null | grep -E "aurobore-container|aurobore-web|aurobore-bridge|aurobore-plugin" || true
    echo "=== RESULT: ${success_pattern} ==="
    exit 0
  fi
  sleep 3
  elapsed=$((elapsed + 3))
done

echo "=== LOG START ==="
cat /tmp/container.log 2>/dev/null || true
echo "=== LOG END ==="
print_cef_debug_journal_header
echo "=== JOURNAL (container) ==="
journalctl --no-pager -n 120 2>/dev/null | grep -E "aurobore-container|aurobore-web|aurobore-plugin" || true
echo "=== RESULT: ${success_pattern} not found in journal within ${max_wait}s ==="
exit 1
