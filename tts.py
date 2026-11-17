#!/usr/bin/env python3
"""Generate narration audio with Kokoro TTS (local, ONNX).

Usage:
    python tts.py --text "Hello world." --out public/audio/hello.wav
    python tts.py --text "..." --out out.wav --voice af_heart --speed 1.1
"""
import argparse
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent
MODEL = ROOT / "kokoro-v1.0.onnx"
VOICES = ROOT / "voices-v1.0.bin"


def main() -> None:
    parser = argparse.ArgumentParser(description="Text-to-speech with Kokoro.")
    parser.add_argument("--text", required=True, help="Text to speak.")
    parser.add_argument("--out", required=True, help="Output WAV path.")
    parser.add_argument("--voice", default="am_michael", help="Voice id (default: am_michael).")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed (default: 1.0).")
    args = parser.parse_args()

    kokoro = Kokoro(str(MODEL), str(VOICES))
    samples, sample_rate = kokoro.create(
        args.text, voice=args.voice, speed=args.speed, lang="en-us"
    )

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, samples, sample_rate)
    print(f"Wrote {out} ({len(samples) / sample_rate:.2f}s @ {sample_rate} Hz)")


if __name__ == "__main__":
    main()
