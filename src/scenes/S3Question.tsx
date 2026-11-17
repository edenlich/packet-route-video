import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";
import { ScenePlaceholder } from "../components/ScenePlaceholder";

// Scene 3 — The question. See SCRIPT.md → "Scene 3".
// STUB: replace the placeholder with the real scene. Keep the export names.

// Narration public/audio/s3.wav is 4.67s → 4.67s + 0.5s tail = 156 frames @ 30fps.
// If the scene needs more room than that, raise this number.
export const S3_DURATION = 156;

export const S3Question: React.FC = () => {
  return (
    <AbsoluteFill>
      <ScenePlaceholder n={3} title="The question" />
      <Audio src={staticFile("audio/s3.wav")} />
    </AbsoluteFill>
  );
};
