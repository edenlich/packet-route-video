import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, FULL_SHOT, springMove } from "../components/Camera";
import { COLORS, FONT, OUTLINE, outlined } from "../theme";

// Dev-only preview for shared pieces (not part of the video).
// Shows the camera drift over a grid, then one spring-eased push-in.
export const Sandbox: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shot = springMove({
    frame,
    fps,
    from: FULL_SHOT,
    to: { x: 1200, y: 600, zoom: 1.6, rotate: -2 },
    start: 60,
  });

  const lines = [];
  for (let gx = 0; gx <= 1920; gx += 120) {
    lines.push(
      <line key={`v${gx}`} x1={gx} y1={0} x2={gx} y2={1080} stroke={COLORS.wallShade} strokeWidth={2} />,
    );
  }
  for (let gy = 0; gy <= 1080; gy += 120) {
    lines.push(
      <line key={`h${gy}`} x1={0} y1={gy} x2={1920} y2={gy} stroke={COLORS.wallShade} strokeWidth={2} />,
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <Camera {...shot}>
        <rect x={-200} y={-200} width={2320} height={1480} fill={COLORS.background} />
        {lines}
        <clipPath id="sandbox-box">
          <rect x={1100} y={520} width={200} height={160} rx={24} />
        </clipPath>
        <rect x={1100} y={520} width={200} height={160} rx={24} fill={COLORS.packet} />
        <rect x={1100} y={640} width={200} height={40} fill={COLORS.packetShade} clipPath="url(#sandbox-box)" />
        <rect x={1100} y={520} width={200} height={160} rx={24} fill="none" {...outlined} />
        <circle cx={700} cy={500} r={80} fill={COLORS.network} {...outlined} />
        <text
          x={960}
          y={900}
          textAnchor="middle"
          fontFamily={FONT}
          fontWeight={600}
          fontSize={64}
          fill={COLORS.ink}
        >
          Camera sandbox
        </text>
      </Camera>
      <div
        style={{
          position: "absolute",
          left: 24,
          top: 24,
          fontFamily: FONT,
          fontSize: 28,
          color: COLORS.ink,
          borderLeft: `${OUTLINE}px solid ${COLORS.ink}`,
          paddingLeft: 12,
        }}
      >
        frame {frame} · fixed overlay (no drift) for reference
      </div>
    </AbsoluteFill>
  );
};
