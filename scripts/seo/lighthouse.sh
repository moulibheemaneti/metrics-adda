#!/usr/bin/env bash
#
# Lighthouse CI for Metrics Adda — SSR-aware.
#
# Your lighthouserc*.json files only hold assertions (no URL/server), so
# `lhci autorun` alone can't find a static dir for this SSR app. This script
# boots the production build and points Lighthouse at the running server.
#
# Usage:
#   scripts/seo/lighthouse.sh                       # desktop config, "/"
#   scripts/seo/lighthouse.sh lighthouserc.mobile.json
#   URLS="/ /hi" scripts/seo/lighthouse.sh          # audit multiple routes
#   BUILD=1 scripts/seo/lighthouse.sh               # force a fresh build

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3123}"
BASE="http://localhost:${PORT}"
CONFIG="${1:-lighthouserc.json}"
URLS="${URLS:-/}"
SERVER_PID=""

if [[ -t 1 ]]; then G=$'\e[32m'; R=$'\e[31m'; D=$'\e[2m'; B=$'\e[1m'; X=$'\e[0m'; else G=""; R=""; D=""; B=""; X=""; fi

cleanup() { [[ -n "$SERVER_PID" ]] && kill "$SERVER_PID" 2>/dev/null; }
trap cleanup EXIT INT TERM

[[ -f "$CONFIG" ]] || { printf "${R}Config not found: %s${X}\n" "$CONFIG"; exit 1; }

if [[ "${BUILD:-0}" == "1" || ! -f .output/server/index.mjs ]]; then
   printf "${D}Building production output…${X}\n"
   bun run build >/tmp/seo-build.log 2>&1 || { printf "${R}Build failed.${X} See /tmp/seo-build.log\n"; tail -20 /tmp/seo-build.log; exit 1; }
fi

printf "${D}Starting server on :%s …${X}\n" "$PORT"
PORT="$PORT" bun run .output/server/index.mjs >/tmp/seo-server.log 2>&1 &
SERVER_PID=$!
ready=0
for _ in $(seq 1 30); do curl -sf -o /dev/null "$BASE/" && { ready=1; break; }; sleep 1; done
[[ "$ready" == "1" ]] || { printf "${R}Server never became ready.${X}\n"; tail -20 /tmp/seo-server.log; exit 1; }

# Build repeated --collect.url flags from $URLS
URL_FLAGS=()
for path in $URLS; do URL_FLAGS+=("--collect.url=${BASE}${path}"); done

printf "\n${B}Lighthouse${X}  config=${CONFIG}  urls=[%s]\n\n" "$URLS"
bunx @lhci/cli autorun --config="$CONFIG" "${URL_FLAGS[@]}"
STATUS=$?

if [[ "$STATUS" == "0" ]]; then
   printf "\n${G}Lighthouse assertions passed.${X}\n"
else
   printf "\n${R}Lighthouse assertions failed (see report links above).${X}\n"
fi
exit "$STATUS"
