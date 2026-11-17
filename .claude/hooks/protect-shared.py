#!/usr/bin/env python3
"""PreToolUse(Edit|Write): block edits to shared files unless LAB_ROLE=integrator."""
import json
import os
import sys

PROTECTED_FILES = {"src/Root.tsx", "src/Main.tsx", "src/theme.ts"}
PROTECTED_DIRS = ("src/components/",)


def main():
    if os.environ.get("LAB_ROLE") == "integrator":
        sys.exit(0)

    data = json.load(sys.stdin)
    file_path = data.get("tool_input", {}).get("file_path") or ""
    if not file_path:
        sys.exit(0)

    project = os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd()
    project = os.path.realpath(project)
    abs_path = os.path.realpath(os.path.join(project, file_path))
    rel = os.path.relpath(abs_path, project)

    if rel in PROTECTED_FILES or any(rel.startswith(d) for d in PROTECTED_DIRS):
        print(f"shared file — only the integrator session edits this ({rel})", file=sys.stderr)
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
