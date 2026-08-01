#!/usr/bin/env sh
set -eu

SCRIPT_DIR=${0%/*}
if [ "$SCRIPT_DIR" = "$0" ]; then
  SCRIPT_DIR=.
fi
cd "$SCRIPT_DIR"
PORT="${PORT:-8000}"
LAN_IP=""

if command -v hostname >/dev/null 2>&1; then
  LAN_CANDIDATES="$(hostname -I 2>/dev/null || true)"
  set -- $LAN_CANDIDATES
  LAN_IP="${1:-}"
fi
if [ -z "$LAN_IP" ] && command -v ipconfig >/dev/null 2>&1; then
  LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
fi

printf '%s\n' "人生主控表本機伺服器"
printf '%s\n' "電腦開啟：http://localhost:${PORT}"
if [ -n "$LAN_IP" ]; then
  printf '%s\n' "手機開啟：http://${LAN_IP}:${PORT}"
else
  printf '%s\n' "找不到區網 IP，請確認 Wi-Fi 已連線。"
fi
printf '%s\n\n' "請保持這個視窗開啟，按 Ctrl+C 可停止。"

if command -v python3 >/dev/null 2>&1 && python3 --version >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --bind 0.0.0.0
elif command -v python >/dev/null 2>&1 && python --version >/dev/null 2>&1; then
  exec python -m http.server "$PORT" --bind 0.0.0.0
else
  printf '%s\n' "無法啟動：找不到可用的 Python。" >&2
  exit 1
fi
