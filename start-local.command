#!/bin/sh
set -eu
project=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
port=${1:-4280}
case $port in *[!0-9]*|'') printf '%s\n' '请提供有效端口号。' >&2; exit 2;; esac
if [ ! -f "$project/dist/index.html" ]; then
  printf '%s\n' '找不到 dist/index.html。请先解压完整交付包或运行 npm run build。' >&2
  exit 1
fi
printf 'Financial Intelligence Lab: http://127.0.0.1:%s/\n' "$port"
printf '%s\n' '在浏览器打开上方地址。按 Ctrl+C 停止。'
exec python3 -m http.server "$port" --bind 127.0.0.1 --directory "$project/dist"
