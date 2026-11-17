import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";
import { ScenePlaceholder } from "../components/ScenePlaceholder";

// Scene 6 — Name to address: DNS. See SCRIPT.md → "Scene 6".
// STUB: replace the placeholder with the real scene. Keep the export names.

// Narration public/audio/s6.wav is 11.16s → 11.16s + 0.5s tail = 350 frames @ 30fps.
// If the scene needs more room than that, raise this number.
export const S6_DURATION = 350;

export const S6DNS: React.FC = () => {
  return (
    <AbsoluteFill>
      <ScenePlaceholder n={6} title="Name to address: DNS" />
      <Audio src={staticFile("audio/s6.wav")} />
    </AbsoluteFill>
  );
};
