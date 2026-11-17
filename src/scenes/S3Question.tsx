import React from "react";
import { Audio } from "@remotion/media";
import { getLength, getPointAtLength } from "@remotion/paths";
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Shot, mixShots } from "../components/Camera";
import { Shape, circ } from "../components/Shape";
import { COLORS, OUTLINE } from "../theme";

// Scene 3 — The question. See SCRIPT.md → "Scene 3".
// Empty cream canvas (continues from S2's fade). A little orange "request"
// dot with dot eyes wanders in from the left, leaving a dotted trail. It
// hesitates in the middle of the narration (the pause after "find its way"),
// then finishes its trip into the centre, where the pen-stroke turns into a
// hand-drawn "?" and the dot itself hops down to become the question mark's dot.

// Narration public/audio/s3.wav is 4.67s → 4.67s + 0.5s tail = 156 frames @ 30fps.
export const S3_DURATION = 156;

// Beat timing (frames). Narration has a pause at ~2.55–3.05 s (frames 76–92).
const WANDER_START = 2;
const WANDER_END = 76; // "...actually find its way" — trail reaches the loop
const PAUSE_END = 90; // dot hesitates during the narration pause
const TRAIL_END = 108; // "all the way..." — trail reaches the centre
const HOOK_END = 128; // "...to the right" — the "?" hook is drawn
const HOP_END = 138; // "place?" — dot hops down and becomes the "?" dot
const WANDER_FRACTION = 0.68; // share of the trail drawn before the pause

// The wandering trail: from off-screen left, a rise, a dip, a loop, then an
// upward swing that ends exactly where the "?" hook starts.
const TRAIL =
  "M -480 700 C -200 700 120 520 320 540 C 480 560 430 780 570 770 " +
  "C 700 760 690 600 590 610 C 490 620 520 820 680 810 " +
  "C 800 800 875 620 875 445";

// The "?" hook and stem, starting where the trail ends.
const HOOK =
  "M 875 445 C 878 385 920 350 968 350 C 1025 350 1062 388 1060 432 " +
  "C 1058 482 1008 494 986 522 C 968 545 963 565 963 595";
const QDOT = { x: 963, y: 680 };

const TRAIL_LEN = getLength(TRAIL);
const HOOK_LEN = getLength(HOOK);

const easeInOut = Easing.inOut(Easing.sin);

const trailProgress = (frame: number) => {
  if (frame < PAUSE_END) {
    return interpolate(frame, [WANDER_START, WANDER_END], [0, WANDER_FRACTION], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    });
  }
  return interpolate(frame, [PAUSE_END, TRAIL_END], [WANDER_FRACTION, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });
};

const hookProgress = (frame: number) =>
  interpolate(frame, [TRAIL_END, HOOK_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });

// Point + unit direction at a given length along a path.
const pointOn = (d: string, len: number, at: number) => {
  const a = Math.max(0, Math.min(len, at));
  const origin = { x: 0, y: 0 };
  const p = getPointAtLength(d, a) ?? origin;
  const q = getPointAtLength(d, Math.max(0, a - 6)) ?? p;
  const r = getPointAtLength(d, Math.min(len, a + 6)) ?? p;
  const dx = r.x - q.x;
  const dy = r.y - q.y;
  const m = Math.hypot(dx, dy) || 1;
  return { x: p.x, y: p.y, dirX: dx / m, dirY: dy / m };
};

// Outlined dotted trail: explicit dots placed along the path, each one
// popping in as the traveller passes it (no masks, so no half-cut dots where
// the trail crosses itself).
const DOT_GAP = 30;
const DOT_R = 7;
const TRAIL_DOTS = Array.from({ length: Math.floor(TRAIL_LEN / DOT_GAP) + 1 }, (_, i) => {
  const at = i * DOT_GAP;
  const p = getPointAtLength(TRAIL, at) ?? { x: 0, y: 0 };
  return { at, x: p.x, y: p.y };
});

const DottedTrail: React.FC<{ progress: number }> = ({ progress }) => {
  const head = TRAIL_LEN * progress;
  return (
    <g>
      {TRAIL_DOTS.map((d) => {
        // Pop in over the ~24 px behind the head, with a tiny overshoot.
        const t = Math.min(1, Math.max(0, (head - d.at) / 24));
        if (t <= 0) return null;
        const s = Easing.out(Easing.back(2))(t);
        return (
          <g key={d.at} transform={`translate(${d.x} ${d.y}) scale(${s})`}>
            <circle r={DOT_R} fill={COLORS.packet} stroke={COLORS.ink} strokeWidth={OUTLINE} />
          </g>
        );
      })}
    </g>
  );
};

// Hand-drawn "?" stroke: thick orange line with an ink outline, drawn on.
const QuestionHook: React.FC<{ progress: number }> = ({ progress }) => {
  if (progress <= 0) return null;
  const dashProps = {
    strokeDasharray: `${HOOK_LEN} ${HOOK_LEN}`,
    strokeDashoffset: HOOK_LEN * (1 - progress),
  };
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={HOOK} stroke={COLORS.ink} strokeWidth={40 + OUTLINE * 2} {...dashProps} />
      {/* Cel shade: shadow tone fills the stroke, the base colour sits
          slightly up-left so only a lower-right rim of shadow shows. */}
      <path d={HOOK} stroke={COLORS.packetShade} strokeWidth={40} {...dashProps} />
      <path d={HOOK} stroke={COLORS.packet} strokeWidth={30} transform="translate(-3 -4)" {...dashProps} />
    </g>
  );
};

// The traveller: a small orange dot with dot eyes looking where it's going.
const Traveller: React.FC<{
  x: number;
  y: number;
  r: number;
  lookX: number;
  lookY: number;
  squashX?: number;
  squashY?: number;
  eyes?: number; // 0 = no eyes (as the "?" dot), 1 = eyes visible
}> = ({ x, y, r, lookX, lookY, squashX = 1, squashY = 1, eyes = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${squashX} ${squashY})`}>
    <Shape
      d={circ(0, 0, r)}
      fill={COLORS.packet}
      shade={<circle cx={r * 0.35} cy={r * 0.45} r={r} fill={COLORS.packetShade} />}
    />
    <Shape d={circ(-r * 0.12, -r * 0.1, r * 0.92)} fill={COLORS.packet} outline={false} />
    {eyes > 0.01 ? (
      <g opacity={eyes} fill={COLORS.ink}>
        <circle cx={-r * 0.3 + lookX * r * 0.28} cy={-r * 0.15 + lookY * r * 0.22} r={r * 0.15} />
        <circle cx={r * 0.3 + lookX * r * 0.28} cy={-r * 0.15 + lookY * r * 0.22} r={r * 0.15} />
      </g>
    ) : null}
  </g>
);

const FINAL_SHOT: Shot = { x: 965, y: 515, zoom: 1.42, rotate: -0.6 };

export const S3Question: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tp = trailProgress(frame);
  const hp = hookProgress(frame);

  // ---- Traveller position ----
  let head = pointOn(TRAIL, TRAIL_LEN, TRAIL_LEN * tp);
  if (frame >= TRAIL_END) head = pointOn(HOOK, HOOK_LEN, HOOK_LEN * hp);

  let lookX = head.dirX;
  let lookY = head.dirY;
  let bobY = Math.sin(frame * 0.55) * 3; // little hop-bob while travelling
  let hx = head.x;
  let r = 26;
  let squashX = 1;
  let squashY = 1;
  let eyes = 1;

  // Hesitation: stop, look back and forth ("which way?").
  if (frame >= WANDER_END - 2 && frame < PAUSE_END) {
    const k = frame - (WANDER_END - 2);
    lookX = Math.sin(k * 0.55) * 1;
    lookY = -0.3;
    bobY = 0;
    hx += Math.sin(k * 0.55) * 4;
  }

  let hy = head.y + bobY;

  // Hop: from the bottom of the stem down to the "?" dot spot, growing.
  const hopT = interpolate(frame, [HOOK_END, HOP_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame >= HOOK_END) {
    const end = pointOn(HOOK, HOOK_LEN, HOOK_LEN);
    const e = easeInOut(hopT);
    hx = end.x + (QDOT.x - end.x) * e + 14 * Math.sin(Math.PI * hopT);
    hy = end.y + (QDOT.y - end.y) * e - 70 * Math.sin(Math.PI * hopT);
    r = 26 + 4 * e;
    lookX = 0;
    lookY = 1;
    // Squash on landing, then settle with a spring.
    const land = spring({ frame: frame - HOP_END, fps, config: { damping: 9, stiffness: 180 } });
    if (frame >= HOP_END) {
      const s = 1 - land;
      squashX = 1 + 0.35 * s;
      squashY = 1 - 0.3 * s;
      hy += r * 0.3 * s;
    } else {
      squashX = 1 - 0.12 * Math.sin(Math.PI * hopT);
      squashY = 1 + 0.15 * Math.sin(Math.PI * hopT);
    }
    // The eyes close as it settles into being the "?" dot.
    eyes = interpolate(frame, [HOP_END, HOP_END + 8], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  // "?" settles with a little hand-drawn wobble once complete.
  const qPop = spring({ frame: frame - HOOK_END, fps, config: { damping: 8 } });
  const qScale = frame >= HOOK_END ? 0.94 + 0.06 * qPop : 1;
  const qWobble = frame >= HOOK_END ? Math.sin(frame * 0.12) * 1.2 : 0;

  // ---- Camera ----
  // Follow the traveller (leading slightly), then ease into a push-in on "?".
  const follow: Shot = {
    x: 960 + (head.x - 960) * 0.4 + head.dirX * 40,
    y: 560 + (head.y - 600) * 0.3 + head.dirY * 20,
    zoom: 1.12,
    rotate: 0.4,
  };
  const pushT = interpolate(frame, [PAUSE_END, S3_DURATION], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });
  const shot = mixShots(follow, FINAL_SHOT, pushT);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <Camera {...shot} background={COLORS.background}>
        <DottedTrail progress={tp} />
        <g transform={`translate(965 500) rotate(${qWobble}) scale(${qScale}) translate(-965 -500)`}>
          <QuestionHook progress={hp} />
          <Traveller
          x={hx}
          y={hy}
          r={r}
          lookX={lookX}
          lookY={lookY}
          squashX={squashX}
          squashY={squashY}
            eyes={eyes}
          />
        </g>
      </Camera>
      <Audio src={staticFile("audio/s3.wav")} />
    </AbsoluteFill>
  );
};
