import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Camera, Shot, mixShots } from "../components/Camera";
import { COLORS, VIDEO } from "../theme";
import { S1_DURATION, SideView } from "./S1Room";

// Scene 2 — Into the screen. See SCRIPT.md → "Scene 2".
// Picks up exactly where S1 ends (same side-view set, same camera, same
// laptop state), then the camera dives into the laptop screen, the page
// flashes white, and the white settles into the empty cream canvas S3 opens on.

// No narration — SCRIPT.md timing (0:09–0:12) = 3s.
export const S2_DURATION = 90;

type SideViewState = React.ComponentProps<typeof SideView>["t"];

// ---------- Continuity with S1 ----------
// S1's side-view camera is an easedMove (easeInOutSine) from SIDE_WIDE to
// SIDE_CLOSE over frames 110–320; S1 cuts at frame 300, before it settles.
// Values mirrored from S1Room.tsx (not exported there).
const S1_SIDE_WIDE: Shot = { x: 1180, y: 560, zoom: 1.15, rotate: 0.8 };
const S1_SIDE_CLOSE: Shot = { x: 1260, y: 560, zoom: 1.7, rotate: 0 };
const s1Progress = (s1Frame: number) => {
  const p = Math.min(1, Math.max(0, (s1Frame - 110) / 210));
  return -(Math.cos(Math.PI * p) - 1) / 2;
};
const START_SHOT = mixShots(S1_SIDE_WIDE, S1_SIDE_CLOSE, s1Progress(S1_DURATION));

// Laptop state at the end of S1: URL typed, Enter released, hand resting
// slightly lifted, page-load bar ~70% and still creeping forward.
const S1_END_LOADING = 0.713;
const sideState = (frame: number): SideViewState => ({
  typed: "moodle.com",
  caret: false,
  enterDown: 0,
  flash: 0,
  loading: interpolate(frame, [0, DIVE_END], [S1_END_LOADING, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  }),
  nearLift: 22,
  nearDip: 0,
  farDip: 0,
});

// ---------- Dive ----------
// Screen (360×240) sits at TL (1290, 385), u-axis slope 0.028 (≈1.6° tilt).
// Target: the middle of the browser page, rotated to cancel the lid's tilt,
// zoomed until the white page overfills the frame.
const DIVE_END = 58;
const SCREEN_TARGET: Shot = { x: 1462, y: 528, zoom: 11, rotate: -1.6 };

const clampOpts = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Zoom and aim are eased separately: the aim reaches the page center early
// (so the screen stays centered as it grows), while the zoom starts slow
// (matching S1's settling push-in) and then rushes in.
const diveShot = (frame: number): Shot => {
  const aim = interpolate(frame, [0, DIVE_END - 12], [0, 1], {
    ...clampOpts,
    easing: Easing.inOut(Easing.cubic),
  });
  const push = interpolate(frame, [0, DIVE_END], [0, 1], {
    ...clampOpts,
    easing: Easing.bezier(0.45, 0.05, 0.85, 0.35),
  });
  const aimed = mixShots(START_SHOT, SCREEN_TARGET, aim);
  return { ...aimed, zoom: mixShots(START_SHOT, SCREEN_TARGET, push).zoom };
};

// ---------- Flash → cream ----------
const FLASH_START = 38;
const FLASH_PEAK = DIVE_END;
const FLASH_HOLD = 64;
const CREAM_END = 84;

// Cartoon speed streaks (screen light) rushing outward from the screen center during the dive.
const ZoomLines: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [22, 34, 50, 58], [0, 0.85, 0.85, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (opacity <= 0) return null;
  const cx = VIDEO.width / 2;
  const cy = VIDEO.height / 2;
  const lines = Array.from({ length: 18 }, (_, i) => {
    // Uneven angles + per-line offsets so it reads hand-drawn, not a starburst.
    const angle = (i / 18) * Math.PI * 2 + Math.sin(i * 7.3) * 0.12;
    const speed = 0.8 + ((i * 37) % 10) / 20;
    const travel = ((frame - 22) * 38 * speed + i * 90) % 520;
    const r0 = 560 + travel;
    const r1 = r0 + 140 + ((i * 53) % 5) * 30;
    return (
      <line
        key={i}
        x1={cx + Math.cos(angle) * r0}
        y1={cy + Math.sin(angle) * r0 * 0.62}
        x2={cx + Math.cos(angle) * r1}
        y2={cy + Math.sin(angle) * r1 * 0.62}
        stroke={COLORS.white}
        strokeWidth={i % 3 === 0 ? 12 : 8}
        strokeLinecap="round"
      />
    );
  });
  return (
    <svg
      width={VIDEO.width}
      height={VIDEO.height}
      style={{ position: "absolute", inset: 0, opacity: opacity * 0.8 }}
    >
      {lines}
    </svg>
  );
};

export const S2Dive: React.FC = () => {
  const frame = useCurrentFrame();
  const shot = diveShot(frame);

  const white = interpolate(frame, [FLASH_START, FLASH_PEAK], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });
  // After the peak the white "cools" into the cream canvas.
  const whiteOverCream = interpolate(frame, [FLASH_HOLD, CREAM_END], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  const showSet = frame < FLASH_PEAK;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {showSet ? (
        // Shift time by S1's length so the camera drift and the person's idle
        // motion continue seamlessly from S1's last frame (no jump at the cut).
        <Sequence from={-S1_DURATION} layout="none">
          <Camera {...shot}>
            <SideView t={sideState(frame)} />
          </Camera>
        </Sequence>
      ) : null}
      <ZoomLines frame={frame} />
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.white,
          opacity: frame < FLASH_PEAK ? white : whiteOverCream,
        }}
      />
    </AbsoluteFill>
  );
};
