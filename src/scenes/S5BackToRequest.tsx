import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";
import { ScenePlaceholder } from "../components/ScenePlaceholder";

// Scene 5 — Back to our request. See SCRIPT.md → "Scene 5".
// STUB: replace the placeholder with the real scene. Keep the export names.

// Narration public/audio/s5.wav is 1.45s → 1.45s + 0.5s tail = 59 frames @ 30fps.
// If the scene needs more room than that, raise this number.
export const S5_DURATION = 59;

export const S5BackToRequest: React.FC = () => {
  return (
    <AbsoluteFill>
      <ScenePlaceholder n={5} title="Back to our request" />
      <Audio src={staticFile("audio/s5.wav")} />
    </AbsoluteFill>
  );
};
