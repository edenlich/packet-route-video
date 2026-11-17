import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT, OUTLINE } from "../theme";

// Temporary "Scene N" card used by scene stubs until the real scene is built.
export const ScenePlaceholder: React.FC<{ n: number; title: string }> = ({ n, title }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        background: COLORS.background,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        color: COLORS.ink,
      }}
    >
      <div
        style={{
          border: `${OUTLINE}px solid ${COLORS.ink}`,
          borderRadius: 40,
          background: COLORS.white,
          padding: "60px 120px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 140, fontWeight: 600 }}>Scene {n}</div>
        <div style={{ fontSize: 56, fontWeight: 500, color: COLORS.woodShade }}>{title}</div>
        <div style={{ fontSize: 36, fontWeight: 500, marginTop: 24, color: COLORS.metalShade }}>
          {(frame / fps).toFixed(1)}s / {(durationInFrames / fps).toFixed(1)}s
        </div>
      </div>
    </AbsoluteFill>
  );
};
