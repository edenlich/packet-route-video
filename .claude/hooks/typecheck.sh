#!/usr/bin/env bash
# PostToolUse(Edit|Write): run `npx tsc --noEmit` when a .ts/.tsx file under src/ changes.
# On failure, exit 2 so the compiler errors are fed back to the agent.
set -u

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
project="${CLAUDE_PROJECT_DIR:-$(printf '%s' "$input" | jq -r '.cwd')}"

case "$file" in
  "$project"/src/*.ts|"$project"/src/*.tsx|src/*.ts|src/*.tsx) ;;
  *) exit 0 ;;
esac

cd "$project" || exit 0
if ! out=$(npx tsc --noEmit 2>&1); then
  {
    echo "TypeScript check failed after editing ${file#"$project"/}. Fix these errors:"
    echo "$out" | head -n 60
  } >&2
  exit 2
fi
exit 0
