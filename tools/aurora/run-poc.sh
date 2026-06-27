#!/bin/sh
# Запуск PoC на эмуляторе/устройстве (вызывается через SSH от poc.mjs deploy/run).
set -eu

pkill -f ru.auroraos.poc-bridge 2>/dev/null || true
sleep 1
rm -f /tmp/poc.log

su "${POC_RUN_USER:-defaultuser}" -s /bin/sh -c '
  export XDG_RUNTIME_DIR=/run/user/100000
  export WAYLAND_DISPLAY=/run/display/wayland-0
  export QT_QPA_PLATFORM=wayland
  export LD_LIBRARY_PATH=/usr/lib/cef:${LD_LIBRARY_PATH:-}
  nohup /usr/bin/ru.auroraos.poc-bridge >/tmp/poc.log 2>&1 &
'

sleep "${POC_RUN_WAIT_SEC:-18}"

echo "=== LOG START ==="
cat /tmp/poc.log 2>/dev/null || true
echo "=== LOG END ==="

echo "=== JOURNAL (poc) ==="
journalctl --no-pager -n 80 2>/dev/null | grep -E "poc-native|PoC OK" || true

if journalctl --no-pager -n 200 2>/dev/null | grep -q "PoC OK: round-trip"; then
  echo "=== RESULT: PoC OK ==="
  exit 0
fi

echo "=== RESULT: PoC OK not found in journal (app may still be loading) ==="
exit 1
