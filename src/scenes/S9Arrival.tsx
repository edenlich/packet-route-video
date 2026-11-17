import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";
import { ScenePlaceholder } from "../components/ScenePlaceholder";

// Scene 9 — Arrival and return. See SCRIPT.md → "Scene 9".
// STUB: replace the placeholder with the real scene. Keep the export names.

// Narration public/audio/s9.wav is 10.52s → 10.52s + 0.5s tail = 331 frames @ 30fps.
// If the scene needs more room than that, raise this number.
export const S9_DURATION = 331;

export const S9Arrival: React.FC = () => {
  return (
    <AbsoluteFill>
      <ScenePlaceholder n={9} title="Arrival and return" />
      <Audio src={staticFile("audio/s9.wav")} />
    </AbsoluteFill>
  );
};
