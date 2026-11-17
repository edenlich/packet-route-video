import React from "react";
import { AbsoluteFill } from "remotion";
import { ScenePlaceholder } from "../components/ScenePlaceholder";

// Scene 2 — Into the screen. See SCRIPT.md → "Scene 2".
// STUB: replace the placeholder with the real scene. Keep the export names.

// No narration — SCRIPT.md timing (0:09–0:12) = 3s.
export const S2_DURATION = 90;

export const S2Dive: React.FC = () => {
  return (
    <AbsoluteFill>
      <ScenePlaceholder n={2} title="Into the screen" />
    </AbsoluteFill>
  );
};
