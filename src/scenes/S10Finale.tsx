import React from "react";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Camera, Shot, easedMove, mixShots } from "../components/Camera";
import { Envelope } from "../components/Envelope";
import { Shape, rr } from "../components/Shape";
import { COLORS, FONT, OUTLINE, VIDEO } from "../theme";
import { SideView } from "./S1Room";

// Scene 10 — The page opens. See SCRIPT.md → "Scene 10".
// The green reply envelope flies in across the cream canvas and into the
// camera (white flash) → the exact reverse of S2's dive: the camera pulls out
// of the laptop screen back to S1's 3/4 side view → a spinner, then a plain
// course dashboard → the person nods → the takeaway sentence.
//
// Narration public/audio/s10.wav is 6.55 s, starting at frame 6.
// Measured pauses (silencedetect):
//   0.00–0.58s  "Finally,"                                            (f 6–23)
//   0.77–3.51s  "the server's answer makes its way back to our computer" (f 29–111)
//   4.02–6.23s  "and that's how the page we asked for opens."         (f 127–193)
// Then the takeaway card holds ~2 s: 285 frames total.
const NARRATION_START = 6;
export const S10_DURATION = 285;

type P = { x: number; y: number };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number, e = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: e });

// ---------- Timeline ----------

// Phase A: the reply flies across the cream canvas and into the camera.
const FLY_END = 34; // reaches the center
const FLASH_START = 26;
const FLASH_PEAK = 42; // fully white: we're "inside" the screen
const FLASH_HOLD = 48;
const FLASH_END = 64; // white has cooled into the browser page

// Phase B: pull out of the screen (S2 in reverse).
const PULL_START = 46;
const PULL_END = 118; // lands on "…back to our computer" (f 111)

// Phase C: the page loads.
const DASH_IN = 146; // "…the page…"
const CARD_STAGGER = 5;
const NOD = 184; // "…opens."

// Takeaway card: fully in by ~224, holds ~2 s.
const CARD_IN = 190;
const LINE_STAGGER = 6;
const LINES = [
  "No machine on the internet knows the whole path.",
  "Each router only knows which way gets",
  "your request one step closer —",
  "and only the last one knows exactly where it goes.",
];

// ---------- Camera ----------

// S2 dives from S1's last side-view shot into the browser page center at
// zoom 11. We run that in reverse: start at the page, pull back to the shot
// S2 started from (values mirrored from S2Dive.tsx).
const SCREEN_TARGET: Shot = { x: 1462, y: 528, zoom: 11, rotate: -1.6 };
const SIDE_SHOT: Shot = { x: 1258, y: 560, zoom: 1.68, rotate: 0 };
// Lean in toward the screen (and the person's face) while the page loads.
const DASH_SHOT: Shot = { x: 1365, y: 522, zoom: 2.0, rotate: -0.3 };
// Settle a little wider and lower so the takeaway card fits below the screen.
const FINAL_SHOT: Shot = { x: 1330, y: 640, zoom: 1.8, rotate: 0 };

const insideShot = (frame: number): Shot => {
  // Reverse of S2: zoom rushes out first then settles; the aim stays on the
  // page until the screen is small, then drifts to the side-view framing.
  const pull = interpolate(frame, [PULL_START, PULL_END], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.15, 0.65, 0.55, 0.95),
  });
  const aim = interpolate(frame, [PULL_START + 12, PULL_END], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const aimed = mixShots(SCREEN_TARGET, SIDE_SHOT, aim);
  const pulled: Shot = { ...aimed, zoom: mixShots(SCREEN_TARGET, SIDE_SHOT, pull).zoom };
  const lean = easedMove({ frame, from: pulled, to: DASH_SHOT, start: PULL_END - 4, end: 178 });
  return easedMove({ frame, from: lean, to: FINAL_SHOT, start: CARD_IN - 6, end: CARD_IN + 34 });
};

// Phase A camera: a gentle push toward where the envelope is heading.
const canvasShot = (frame: number): Shot =>
  easedMove({
    frame,
    from: { x: 900, y: 560, zoom: 1, rotate: 0.4 },
    to: { x: 960, y: 540, zoom: 1.18, rotate: 0 },
    start: 0,
    end: FLASH_PEAK,
  });

// ---------- Phase A: the reply flies in ----------

const FLY_FROM: P = { x: -180, y: 820 };
const FLY_CTRL: P = { x: 420, y: 240 };
const FLY_TO: P = { x: 960, y: 540 };
const bez = (t: number): P => ({
  x: (1 - t) ** 2 * FLY_FROM.x + 2 * (1 - t) * t * FLY_CTRL.x + t ** 2 * FLY_TO.x,
  y: (1 - t) ** 2 * FLY_FROM.y + 2 * (1 - t) * t * FLY_CTRL.y + t ** 2 * FLY_TO.y,
});

const ReplyFlight: React.FC<{ frame: number }> = ({ frame }) => {
  const t = ease(frame, 0, FLY_END, Easing.inOut(Easing.quad));
  const p = bez(t);
  // Dotted trail behind it (the same dotted path as S3's question).
  const trail = Array.from({ length: 24 }, (_, i) => bez((i / 23) * t));
  const d = trail.map((q, i) => `${i === 0 ? "M" : "L"} ${q.x} ${q.y}`).join(" ");
  // Grows as it flies at the camera, then rushes into it.
  const rush = ease(frame, FLY_END - 8, FLASH_PEAK, Easing.in(Easing.cubic));
  const scale = 0.9 + 0.6 * t + 9 * rush;
  const rot = -16 * (1 - t) + 6 * Math.sin(frame / 5) * (1 - rush);
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={COLORS.ink}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray="1 22"
        opacity={1 - rush}
      />
      <Envelope x={p.x} y={p.y} scale={scale} rotate={rot} variant="reply" from="the page" to="" />
    </g>
  );
};

// Speed streaks rushing INWARD as the camera pulls back (S2's are outward).
const PullLines: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [PULL_START, PULL_START + 8, 76, 88], [0, 0.85, 0.85, 0], clamp);
  if (opacity <= 0) return null;
  const cx = VIDEO.width / 2;
  const cy = VIDEO.height / 2;
  const lines = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2 + Math.sin(i * 7.3) * 0.12;
    const speed = 0.8 + ((i * 37) % 10) / 20;
    const travel = ((frame - PULL_START) * 38 * speed + i * 90) % 520;
    const r0 = 1080 - travel;
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
    <svg width={VIDEO.width} height={VIDEO.height} style={{ position: "absolute", inset: 0, opacity: opacity * 0.8 }}>
      {lines}
    </svg>
  );
};

// ---------- Phase C: the browser page ----------
// Drawn in the screen's own 360×240 space; the toolbar covers y 0–46.

const COURSES: { lines: string[]; color: string; shade: string }[] = [
  { lines: ["Intro to Cyber"], color: COLORS.packet, shade: COLORS.packetShade },
  { lines: ["Natural Language", "Processing"], color: COLORS.network, shade: COLORS.networkShade },
  { lines: ["Intro to Machine", "Learning"], color: COLORS.reply, shade: COLORS.replyShade },
  { lines: ["Programming with", "AI Agents"], color: COLORS.wood, shade: COLORS.woodShade },
];

const Spinner: React.FC<{ frame: number; opacity: number }> = ({ frame, opacity }) => {
  if (opacity <= 0.001) return null;
  const a = frame * 12;
  return (
    <g transform="translate(180 143)" opacity={opacity}>
      <circle r={18} fill="none" stroke={COLORS.wall} strokeWidth={6} />
      <g transform={`rotate(${a})`}>
        <path d="M 0 -18 A 18 18 0 0 1 18 0" fill="none" stroke={COLORS.network} strokeWidth={6} strokeLinecap="round" />
      </g>
    </g>
  );
};

const Dashboard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const header = ease(frame, DASH_IN, DASH_IN + 8, Easing.out(Easing.cubic));
  const title = ease(frame, DASH_IN + 4, DASH_IN + 12, Easing.out(Easing.cubic));
  if (header <= 0) return null;
  return (
    <g>
      <rect x={0} y={46} width={360} height={194} fill={COLORS.background} />
      {/* Header bar: menu icon, a plain site title, avatar. */}
      <g transform={`translate(0 ${(header - 1) * 26})`}>
        <rect x={0} y={46} width={360} height={26} fill={COLORS.network} />
        <line x1={0} y1={72} x2={360} y2={72} stroke={COLORS.ink} strokeWidth={2} />
        {[0, 1, 2].map((i) => (
          <line key={i} x1={12} y1={53 + i * 6} x2={26} y2={53 + i * 6} stroke={COLORS.white} strokeWidth={2.4} strokeLinecap="round" />
        ))}
        <text x={36} y={64} fontFamily={FONT} fontWeight={600} fontSize={12} fill={COLORS.white}>
          Dashboard
        </text>
        <circle cx={340} cy={59} r={8} fill={COLORS.lampLight} stroke={COLORS.ink} strokeWidth={1.8} />
      </g>
      <text
        x={16}
        y={93 + (1 - title) * 6}
        opacity={title}
        fontFamily={FONT}
        fontWeight={600}
        fontSize={16}
        fill={COLORS.ink}
      >
        My courses
      </text>
      {COURSES.map((c, i) => {
        const pop = spring({ frame: frame - (DASH_IN + 10 + i * CARD_STAGGER), fps, config: { damping: 12 } });
        if (pop <= 0.001) return null;
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 16 + col * 170;
        const y = 104 + row * 66;
        const w = 158;
        const h = 58;
        return (
          <g key={c.lines.join(" ")} transform={`translate(${x + w / 2} ${y + h / 2}) scale(${pop}) translate(${-w / 2} ${-h / 2})`}>
            <rect x={2} y={3} width={w} height={h} rx={7} fill={COLORS.ink} opacity={0.15} />
            <rect x={0} y={0} width={w} height={h} rx={7} fill={COLORS.white} stroke={COLORS.ink} strokeWidth={2} />
            {/* Colored thumbnail band with a little shade stripe. */}
            <path d={`M 1 18 V 7 Q 1 1 7 1 H ${w - 7} Q ${w - 1} 1 ${w - 1} 7 V 18 Z`} fill={c.color} />
            <rect x={1} y={14} width={w - 2} height={4} fill={c.shade} />
            <line x1={0} y1={18} x2={w} y2={18} stroke={COLORS.ink} strokeWidth={2} />
            {c.lines.map((line, j) => (
              <text
                key={line}
                x={8}
                y={(c.lines.length === 1 ? 42 : 34) + j * 14}
                fontFamily={FONT}
                fontWeight={600}
                fontSize={12}
                fill={COLORS.ink}
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </g>
  );
};

// ---------- Takeaway (moved here from S9) ----------

const TakeawayCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const pop = spring({ frame: frame - CARD_IN, fps, config: { damping: 14 } });
  if (pop <= 0.001) return null;
  const W = 1640;
  const H = 360;
  const cx = 960;
  const cy = 820;
  const lineH = 74;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${0.85 + 0.15 * pop})`} opacity={Math.min(1, pop * 1.4)}>
      <g transform="translate(10 12)">
        <path d={rr(-W / 2, -H / 2, W, H, 48)} fill={COLORS.ink} opacity={0.18} />
      </g>
      <Shape
        d={rr(-W / 2, -H / 2, W, H, 48)}
        fill={COLORS.white}
        strokeWidth={OUTLINE + 1}
        shade={<rect x={-W / 2} y={H / 2 - 26} width={W} height={26} fill={COLORS.backgroundShade} />}
      />
      {LINES.map((line, i) => {
        const t = ease(frame, CARD_IN + 4 + i * LINE_STAGGER, CARD_IN + 16 + i * LINE_STAGGER, Easing.out(Easing.cubic));
        const y = -((LINES.length - 1) * lineH) / 2 + i * lineH - 8;
        return (
          <text
            key={i}
            x={0}
            y={y + (1 - t) * 18}
            opacity={t}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily={FONT}
            fontWeight={i === 0 ? 600 : 500}
            fontSize={56}
            fill={i === 0 ? COLORS.packetShade : COLORS.ink}
          >
            {line}
          </text>
        );
      })}
    </g>
  );
};

// ---------- Scene ----------

export const S10Finale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const white = interpolate(frame, [FLASH_START, FLASH_PEAK], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const whiteOut = interpolate(frame, [FLASH_HOLD, FLASH_END], [1, 0], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const inside = frame >= FLASH_PEAK;

  const spinner = ease(frame, FLASH_HOLD, FLASH_END) * (1 - ease(frame, DASH_IN - 4, DASH_IN + 2));
  // Small satisfied nod: down, up, a smaller second dip, settle.
  const nod = interpolate(frame, [NOD, NOD + 7, NOD + 14, NOD + 20, NOD + 27], [0, 10, 1, 5, 0], {
    ...clamp,
    easing: Easing.inOut(Easing.sin),
  });

  const page = (
    <g>
      <rect x={0} y={46} width={360} height={194} fill={COLORS.white} />
      <Spinner frame={frame} opacity={spinner} />
      <Dashboard frame={frame} fps={fps} />
    </g>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {inside ? (
        <Camera {...insideShot(frame)}>
          <SideView
            t={{
              typed: "moodle.com",
              caret: false,
              enterDown: 0,
              flash: 0,
              loading: 0,
              nearLift: 14,
              nearDip: 0,
              farDip: 0,
            }}
            page={page}
            nod={nod}
          />
        </Camera>
      ) : (
        <Camera {...canvasShot(frame)}>
          <ReplyFlight frame={frame} />
        </Camera>
      )}
      <PullLines frame={frame} />
      <AbsoluteFill style={{ backgroundColor: COLORS.white, opacity: inside ? whiteOut : white }} />

      {/* Screen-space overlay on its own gently drifting layer. */}
      <Camera drift={0.5}>
        <TakeawayCard frame={frame} fps={fps} />
      </Camera>

      <Sequence from={NARRATION_START} layout="none">
        <Audio src={staticFile("audio/s10.wav")} />
      </Sequence>
    </AbsoluteFill>
  );
};
