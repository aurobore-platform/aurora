#!/bin/sh
# Запуск M1/M3 container на эмуляторе (вызывается через SSH от poc.mjs deploy/run).
set -eu

cef_debug_export=""
if [ -n "${AUROBORE_CEF_DEBUG_PORT:-}" ]; then
  cef_debug_export="export AUROBORE_CEF_DEBUG_PORT=${AUROBORE_CEF_DEBUG_PORT}"
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
  ${cef_debug_export}
  nohup /usr/bin/ru.auroraos.aurobore-container >/tmp/container.log 2>&1 &
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

max_wait="${POC_RUN_WAIT_SEC:-90}"
elapsed=0
while [ "$elapsed" -lt "$max_wait" ]; do
  if journalctl --no-pager -n 100 --since "1 min ago" 2>/dev/null | grep -q "M3 OK: plugins registered"; then
    echo "=== LOG (tail) ==="
    tail -n 40 /tmp/container.log 2>/dev/null || true
    echo "=== JOURNAL (container) ==="
    journalctl --no-pager -n 120 2>/dev/null | grep -E "aurobore-container|aurobore-web|aurobore-bridge|aurobore-plugin" || true
    echo "=== RESULT: M3 OK ==="
    exit 0
  fi
  sleep 3
  elapsed=$((elapsed + 3))
done

echo "=== LOG START ==="
cat /tmp/container.log 2>/dev/null || true
echo "=== LOG END ==="
echo "=== JOURNAL (container) ==="
journalctl --no-pager -n 120 2>/dev/null | grep -E "aurobore-container|aurobore-web|aurobore-plugin" || true
echo "=== RESULT: M3 OK not found in journal within ${max_wait}s ==="
exit 1
