import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";
import { ScenePlaceholder } from "../components/ScenePlaceholder";

// Scene 4 — The note. See SCRIPT.md → "Scene 4".
// STUB: replace the placeholder with the real scene. Keep the export names.

// Narration public/audio/s4.wav is 8.77s → 8.77s + 0.5s tail = 279 frames @ 30fps.
// If the scene needs more room than that, raise this number.
export const S4_DURATION = 279;

export const S4Note: React.FC = () => {
  return (
    <AbsoluteFill>
      <ScenePlaceholder n={4} title="The note" />
      <Audio src={staticFile("audio/s4.wav")} />
    </AbsoluteFill>
  );
};
