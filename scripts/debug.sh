#!/usr/bin/env bash
# scripts/debug.sh
# Launches opencode with debug logging to a file so you can tail it in another terminal
# Usage: ./scripts/debug.sh [-s session_id]

LOG_FILE="opencode-debug.log"

SESSION_ARGS=()
while getopts "s:" opt; do
  case $opt in
    s) SESSION_ARGS+=(-s "$OPTARG") ;;
    *) echo "Usage: $0 [-s session_id]" && exit 1 ;;
  esac
done

export OPENCODE_LOG_LEVEL="${OPENCODE_LOG_LEVEL:=DEBUG}"
export OPENCODE_PRINT_LOGS="${OPENCODE_PRINT_LOGS:=1}"

exec opencode "${SESSION_ARGS[@]}" --log-level DEBUG --print-logs 2>"$LOG_FILE"
