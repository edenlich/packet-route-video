import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";
import { ScenePlaceholder } from "../components/ScenePlaceholder";

// Scene 7 — The home router. See SCRIPT.md → "Scene 7".
// STUB: replace the placeholder with the real scene. Keep the export names.

// Narration public/audio/s7.wav is 7.83s → 7.83s + 0.5s tail = 250 frames @ 30fps.
// If the scene needs more room than that, raise this number.
export const S7_DURATION = 250;

export const S7HomeRouter: React.FC = () => {
  return (
    <AbsoluteFill>
      <ScenePlaceholder n={7} title="The home router" />
      <Audio src={staticFile("audio/s7.wav")} />
    </AbsoluteFill>
  );
};
