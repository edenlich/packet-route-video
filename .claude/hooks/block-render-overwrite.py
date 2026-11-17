#!/usr/bin/env python3
"""PreToolUse(Bash): block commands that would write to an existing render-*.mp4.

Reading/copying FROM an existing render is allowed; only write targets are checked:
  - shell redirections (>, >>, >|, &>)
  - tee targets
  - cp/mv/rsync/ln/install destination (last positional arg, or -t DIR)
  - -o/-O/--output/--out (and --output=...) values, dd of=
  - remotion render positional output
  - ffmpeg outputs (any .mp4 arg not preceded by -i)
  - touch
"""
import json
import os
import re
import shlex
import sys

RENDER_RE = re.compile(r"(^|/)render-[^/]*\.mp4$")
SEPARATORS = {"&&", "||", ";", "|", "&", "\n"}
REDIRECTS = {">", ">>", ">|", "&>", "&>>", "1>", "2>", "1>>", "2>>"}
COPY_CMDS = {"cp", "mv", "rsync", "ln", "install", "ditto"}
OUTPUT_FLAGS = {"-o", "-O", "--output", "--out", "--output-file"}

MESSAGE = "render file exists — use the next number (render-NN.mp4)"


def tokenize(cmd):
    lex = shlex.shlex(cmd, posix=True, punctuation_chars=";&|<>")
    lex.whitespace_split = True
    lex.commenters = ""
    try:
        return list(lex)
    except ValueError:
        return cmd.split()


def split_segments(tokens):
    seg = []
    for t in tokens:
        if t in SEPARATORS:
            if seg:
                yield seg
            seg = []
        else:
            seg.append(t)
    if seg:
        yield seg


def write_targets(seg):
    """Return (targets, cd_dir) for one simple command."""
    targets = []
    # Pull out redirections first.
    words = []
    i = 0
    while i < len(seg):
        t = seg[i]
        if t in REDIRECTS or (t.endswith(">") and set(t) <= set("0123456789&>|")):
            if i + 1 < len(seg):
                targets.append(seg[i + 1])
            i += 2
            continue
        words.append(t)
        i += 1

    # Skip env assignments / wrappers.
    while words and (re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", words[0]) or words[0] in {"sudo", "env", "time", "command", "exec", "nohup"}):
        words = words[1:]
    if not words:
        return targets, None

    prog = os.path.basename(words[0])
    args = words[1:]

    if prog == "cd":
        return targets, (args[0] if args else os.path.expanduser("~"))

    # Generic output flags.
    for j, a in enumerate(args):
        if a in OUTPUT_FLAGS and j + 1 < len(args):
            targets.append(args[j + 1])
        for f in OUTPUT_FLAGS:
            if f.startswith("--") and a.startswith(f + "="):
                targets.append(a.split("=", 1)[1])
        if a.startswith("of="):
            targets.append(a[3:])

    positional = [a for a in args if not a.startswith("-")]

    if prog == "tee":
        targets += positional
    elif prog == "touch":
        targets += positional
    elif prog in COPY_CMDS:
        if "-t" in args and args.index("-t") + 1 < len(args):
            pass  # destination is a directory; sources are reads
        elif positional:
            targets.append(positional[-1])
    elif prog == "ffmpeg":
        for j, a in enumerate(args):
            if RENDER_RE.search(a) and (j == 0 or args[j - 1] != "-i"):
                targets.append(a)
    elif "remotion" in words[:3] or prog == "remotion":
        # npx remotion render <entry?> <comp> <output>
        if "render" in words:
            after = words[words.index("render") + 1:]
            targets += [a for a in after if not a.startswith("-") and a.endswith(".mp4")]

    return targets, None


def main():
    data = json.load(sys.stdin)
    cmd = data.get("tool_input", {}).get("command", "") or ""
    cwd = data.get("cwd") or os.getcwd()

    for seg in split_segments(tokenize(cmd)):
        targets, cd_dir = write_targets(seg)
        if cd_dir is not None:
            cwd = os.path.normpath(os.path.join(cwd, os.path.expanduser(cd_dir)))
            continue
        for t in targets:
            if not RENDER_RE.search(t):
                continue
            path = os.path.normpath(os.path.join(cwd, os.path.expanduser(t)))
            if os.path.exists(path):
                print(f"{MESSAGE} (blocked write to {t})", file=sys.stderr)
                sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
