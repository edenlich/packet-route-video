# SETUP.md — Lab 6 stack setup + 5-second test clip

You are setting up my machine for a lab where I'll make a short explainer video with Remotion + Kokoro + ffmpeg.
I'm on a **Mac**. Work in the current directory (the project folder). Go step by step, verify each step before moving on, and stop to tell me if something fails that you can't fix.

## Goal

By the end:
1. A Remotion project that opens in Remotion Studio.
2. Kokoro text-to-speech working locally.
3. ffmpeg installed.
4. A file `test-clip.mp4`: 5 seconds of video with one narrated English sentence, playable with sound.
5. Everything committed to git (except large/generated files).

---

## Step 1 — Check prerequisites

Check what's already installed and report versions:
- `brew --version`
- `node --version` (need Node 18+; install/upgrade with `brew install node` if missing or old)
- `python3 --version` (need 3.10–3.12; if missing or out of range, `brew install python@3.12` and use `python3.12`)
- `ffmpeg -version` (install with `brew install ffmpeg` if missing)
- `git --version`

## Step 2 — Git

If this folder isn't a git repo yet, run `git init`.
Create `.gitignore` with at least:

```
node_modules/
out/
.venv/
*.onnx
*.bin
*.wav
*.mp4
.claude/skills/lab06-collect/
.DS_Store
```

## Step 3 — Remotion project

- Scaffold a Remotion project **in this folder** with the blank/minimal TypeScript template (`npx create-video@latest`). If the CLI is interactive, check `npx create-video@latest --help` for non-interactive flags; if none fit, scaffold into a temp subfolder and move the files up.
- `npm install`
- Add the Remotion agent skills: `npx skills add remotion-dev/skills`
- Start the Studio briefly (`npx remotion studio`) to confirm it launches without errors, then stop it.

## Step 4 — Kokoro TTS

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install kokoro-onnx soundfile
```

Download the model files into the project root:
- `kokoro-v1.0.onnx`
- `voices-v1.0.bin`

They're on the `kokoro-onnx` GitHub releases page (thewh1teagle/kokoro-onnx, release `model-files-v1.0`). If those URLs 404, check the repo README for the current file names and links.

Create `tts.py` — a small reusable script:
- Args: `--text`, `--out`, optional `--voice` (default `am_michael`), optional `--speed` (default `1.0`).
- Uses `Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")`, `lang="en-us"`, writes a WAV with `soundfile`.

Generate the test narration:

```bash
python tts.py --text "Every day, we send countless requests across the internet." --out public/audio/test.wav
```

Report the WAV duration (e.g. with `ffprobe`). It should be roughly 3–4 seconds.

## Step 5 — Test composition

Create a composition `TestClip`: 1920×1080, 30 fps, 150 frames (5 seconds).
Keep it simple, in the video's planned style:
- Cream background `#FFF4E0`.
- Title text "How a Request Finds Its Way" in dark `#2B2B2B`, rounded font, fading + springing in over the first second.
- A small orange (`#FF7A59`) folded-paper square that floats gently (sine drift) under the title.
- Put the narration in the composition with Remotion's `<Audio src={staticFile("audio/test.wav")} />`.

Put the component in `src/scenes/TestClip.tsx` and register it in `Root.tsx`.

## Step 6 — Render and verify

```bash
npx remotion render TestClip out/test-raw.mp4
```

Then make the final test file with ffmpeg (re-encode audio to AAC, keep it small):

```bash
ffmpeg -y -i out/test-raw.mp4 -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k test-clip.mp4
```

If the audio didn't end up in the Remotion render for some reason, mix it with ffmpeg instead:

```bash
ffmpeg -y -i out/test-raw.mp4 -i public/audio/test.wav -map 0:v -map 1:a -c:v libx264 -preset veryfast -crf 23 -c:a aac -shortest test-clip.mp4
```

Verify with `ffprobe test-clip.mp4` that it has **both a video and an audio stream** and is ~5 seconds long. Then run `open test-clip.mp4` so I can watch it.

## Step 7 — Commit

Commit everything that isn't ignored, with a message like:
`Set up Remotion + Kokoro + ffmpeg stack and 5s test clip`

## Step 8 — Report

Give me a short summary:
- Versions of node, python, ffmpeg, remotion.
- Paths of `tts.py`, the test composition, and `test-clip.mp4`.
- Anything that failed or that I need to do by hand.
