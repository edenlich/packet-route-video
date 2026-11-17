import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";
import { ScenePlaceholder } from "../components/ScenePlaceholder";

// Scene 8 — Hop by hop. See SCRIPT.md → "Scene 8".
// STUB: replace the placeholder with the real scene. Keep the export names.

// Narration public/audio/s8.wav is 10.71s → 10.71s + 0.5s tail = 337 frames @ 30fps.
// If the scene needs more room than that, raise this number.
export const S8_DURATION = 337;

export const S8Hops: React.FC = () => {
  return (
    <AbsoluteFill>
      <ScenePlaceholder n={8} title="Hop by hop" />
      <Audio src={staticFile("audio/s8.wav")} />
    </AbsoluteFill>
  );
};
