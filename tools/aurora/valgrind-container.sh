#!/bin/sh
# Запуск aurobore-container под Valgrind (только dev). Вызывается через pnpm container:valgrind.
set -eu

APP_ID=ru.auroraos.aurobore-container
LOG=/tmp/valgrind-container.log
VG_OPTS="${VALGRIND_OPTS:---leak-check=full --show-leak-kinds=all --track-origins=yes --errors-for-leak-kinds=all}"

pkill -f "$APP_ID" 2>/dev/null || true
sleep 1
rm -f "$LOG"

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
  echo "=== ERROR: Wayland socket недоступен (${session_max}s) ==="
  exit 1
fi

if ! command -v valgrind >/dev/null 2>&1; then
  echo "=== ERROR: valgrind не найден на устройстве ==="
  echo "Установите инструменты SDK на эмулятор или используйте образ с Valgrind."
  exit 1
fi

echo "=== Valgrind: $APP_ID ==="
echo "=== Log file: $LOG ==="
echo "=== Воспроизведите сценарий на эмуляторе; закройте приложение для завершения ==="
echo "=== Затем на ПК: pnpm container:valgrind:fetch ==="

su "${POC_RUN_USER:-defaultuser}" -s /bin/sh -c "
  export XDG_RUNTIME_DIR=/run/user/100000
  export WAYLAND_DISPLAY=/run/display/wayland-0
  export QT_QPA_PLATFORM=wayland
  export LD_LIBRARY_PATH=/usr/lib/cef:\${LD_LIBRARY_PATH:-}
  valgrind $VG_OPTS --log-file=$LOG /usr/bin/$APP_ID
"

echo "=== Valgrind finished ==="
if test -f "$LOG"; then
  echo "=== tail $LOG ==="
  tail -n 60 "$LOG" 2>/dev/null || true
else
  echo "=== WARNING: log file not created ==="
fi
