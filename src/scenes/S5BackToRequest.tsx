import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Shot, mixShots } from "../components/Camera";
import { Envelope, NAME_LABEL } from "../components/Envelope";
import { Shape, rr } from "../components/Shape";
import { COLORS, FONT, OUTLINE, VIDEO } from "../theme";
import { S4Note, S4_DURATION } from "./S4Note";
import { SideView } from "./S1Room";

// Scene 5 — Back to our request. See SCRIPT.md → "Scene 5".
// 1. Cartoon rewind: the lecture hall (S4's last frame) spins away
//    counter-clockwise with a smear and a "◀◀" badge.
// 2. It unspins into S1's side view at the desk, the moment Enter is pressed:
//    the hand winds up and slams Enter (same squash + click flash as S1).
// 3. A small envelope pops out of the laptop screen and hovers next to it,
//    label only "moodle.com". The camera settles on laptop + envelope.
// End frame (hand-off to S6): envelope hovering at ENVELOPE_REST, scale
// ENVELOPE_SCALE, camera at FINAL_SHOT.

// Narration public/audio/s5.wav is 1.45s (44 frames), placed at frame 6.
// Scene runs 3.2s so the envelope has time to pop out and settle.
export const S5_DURATION = 96;

const NARRATION_START = 6;

type SideViewState = React.ComponentProps<typeof SideView>["t"];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number, e: (t: number) => number = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: e });

// ---------- Rewind (spin transition) ----------
const SPIN_OUT_END = 16; // hall gone
const SPIN_IN_START = 10; // desk starts unspinning in
const SPIN_IN_END = 28;

// ---------- Enter press, mirrored from S1Room.tsx ----------
// S1 schedule (its frames): wind-up 259, hit 267, release 275.
// Here Enter hits at frame ENTER_HIT; S1_OFFSET maps our frames onto S1's.
const ENTER_HIT = 34;
const S1_ENTER_HIT = 267;
const S1_OFFSET = S1_ENTER_HIT - ENTER_HIT;
const S1_TYPE_END = 245;

const sideState = (frame: number): SideViewState => {
  const f = frame + S1_OFFSET; // S1-frame
  const hit = S1_ENTER_HIT;
  const release = hit + 8;
  const nearLift = interpolate(
    f,
    [S1_TYPE_END + 4, hit - 8, hit - 3, hit, release, release + 8],
    [18, 46, 52, -4, -2, 22],
    { ...clamp, easing: Easing.inOut(Easing.quad) },
  );
  const enterDown = interpolate(f, [hit - 2, hit, release, release + 4], [0, 1, 1, 0], clamp);
  const flash = f >= hit ? interpolate(f, [hit, hit + 14], [1, 0], { ...clamp, easing: Easing.out(Easing.quad) }) : 0;
  const loading = f < hit ? 0 : interpolate(f, [hit + 2, hit + 40], [0, 0.72], { ...clamp, easing: Easing.out(Easing.cubic) });
  return {
    typed: "moodle.com",
    caret: f < hit && Math.floor(f / 14) % 2 === 0,
    enterDown,
    flash,
    loading,
    nearLift,
    nearDip: 0,
    farDip: 0,
  };
};

// ---------- Envelope ----------
// Screen centre in S1's side view (screen TL (1290, 385), 360×240, slight tilt).
const SCREEN_CENTER: [number, number] = [1464, 510];
export const ENVELOPE_REST: [number, number] = [1385, 268];
export const ENVELOPE_SCALE = 0.8;
const POP_START = ENTER_HIT + 4;

const envelopeAt = (frame: number, fps: number) => {
  // Travel: spring along a slight arc from the screen up-right to its rest spot.
  const travel = spring({ frame: frame - POP_START, fps, config: { damping: 13, stiffness: 120 } });
  const grow = spring({ frame: frame - POP_START, fps, config: { damping: 9, stiffness: 160 } });
  const x = SCREEN_CENTER[0] + (ENVELOPE_REST[0] - SCREEN_CENTER[0]) * travel;
  const arc = Math.sin(Math.PI * Math.min(1, travel)) * 40;
  const y = SCREEN_CENTER[1] + (ENVELOPE_REST[1] - SCREEN_CENTER[1]) * travel - arc;
  // Gentle hover bob once it's out.
  const settle = ease(frame, POP_START + 14, POP_START + 30);
  const t = frame / fps;
  const bob = Math.sin(t * Math.PI * 1.1) * 8 * settle;
  // Squash & stretch while launching, then a little tilt wobble.
  const launch = Math.max(0, 1 - travel) * Math.min(1, Math.max(0, frame - POP_START) / 3);
  const rotate = -14 * launch + Math.sin(t * Math.PI * 0.9) * 2.5 * settle;
  return {
    x,
    y: y + bob,
    scale: ENVELOPE_SCALE * Math.max(0.05, 0.15 + 0.85 * grow),
    rotate,
    visible: frame >= POP_START,
  };
};

// Little "pop!" sparks at the screen when the envelope comes out.
const PopSparks: React.FC<{ frame: number }> = ({ frame }) => {
  const p = ease(frame, POP_START, POP_START + 12, Easing.out(Easing.quad));
  if (p <= 0 || p >= 1) return null;
  const [cx, cy] = SCREEN_CENTER;
  return (
    <g opacity={1 - p}>
      {[-160, -125, -90, -55, -20, 15].map((a) => {
        const rad = (a * Math.PI) / 180;
        const r0 = 40 + p * 80;
        const r1 = r0 + 34 * (1 - p) + 6;
        return (
          <line
            key={a}
            x1={cx + Math.cos(rad) * r0}
            y1={cy + Math.sin(rad) * r0}
            x2={cx + Math.cos(rad) * r1}
            y2={cy + Math.sin(rad) * r1}
            stroke={COLORS.packet}
            strokeWidth={OUTLINE + 3}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
};

// Faint motion trail behind the envelope while it flies out.
const Trail: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const fade = 1 - ease(frame, POP_START + 8, POP_START + 20);
  if (frame < POP_START + 1 || fade <= 0) return null;
  const pts = [3, 6, 9].map((k) => envelopeAt(frame - k, fps)).filter((e) => e.visible);
  return (
    <g>
      {pts.map((e, i) => (
        <circle key={i} cx={e.x} cy={e.y} r={14 - i * 3} fill={COLORS.packet} opacity={0.5 * fade} stroke={COLORS.ink} strokeWidth={2} />
      ))}
    </g>
  );
};

// ---------- Camera ----------
// S1's side-view camera at its Enter press (easeInOutSine SIDE_WIDE → SIDE_CLOSE,
// frames 110–320). Values mirrored from S1Room.tsx (not exported there).
const S1_SIDE_WIDE: Shot = { x: 1180, y: 560, zoom: 1.15, rotate: 0.8 };
const S1_SIDE_CLOSE: Shot = { x: 1260, y: 560, zoom: 1.7, rotate: 0 };
const s1Progress = (s1Frame: number) => {
  const p = Math.min(1, Math.max(0, (s1Frame - 110) / 210));
  return -(Math.cos(Math.PI * p) - 1) / 2;
};
const ENTER_SHOT = mixShots(S1_SIDE_WIDE, S1_SIDE_CLOSE, s1Progress(S1_ENTER_HIT));
// Settled on the laptop and the hovering envelope.
export const FINAL_SHOT: Shot = { x: 1420, y: 435, zoom: 1.75, rotate: -0.4 };

const sideShot = (frame: number): Shot => {
  // Slow push toward the keyboard during the wind-up, then follow the envelope
  // up and right (leading it a little) and settle.
  const push = mixShots(ENTER_SHOT, { ...ENTER_SHOT, zoom: ENTER_SHOT.zoom * 1.05, x: ENTER_SHOT.x + 20 }, ease(frame, 10, ENTER_HIT));
  return mixShots(push, FINAL_SHOT, ease(frame, POP_START - 2, POP_START + 34, Easing.inOut(Easing.sin)));
};

// ---------- Rewind badge ----------
const RewindBadge: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const pop = spring({ frame: frame - 1, fps, config: { damping: 12 } }) * (1 - ease(frame, 20, 27));
  if (pop <= 0.01) return null;
  const blink = Math.floor(frame / 4) % 2 === 0 ? 1 : 0.65;
  return (
    <svg width={VIDEO.width} height={VIDEO.height} style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(150 130) scale(${pop})`}>
        <Shape d={rr(-100, -52, 200, 104, 30)} fill={COLORS.white} />
        <g opacity={blink}>
          {[-30, 22].map((dx) => (
            <path
              key={dx}
              d={`M ${dx + 26} -28 L ${dx - 18} 0 L ${dx + 26} 28 Z`}
              fill={COLORS.packet}
              stroke={COLORS.ink}
              strokeWidth={OUTLINE}
              strokeLinejoin="round"
            />
          ))}
        </g>
      </g>
      <text
        x={150}
        y={222}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={600}
        fontSize={34}
        fill={COLORS.ink}
        opacity={pop}
      >
        rewind
      </text>
    </svg>
  );
};

// Curved swoosh lines circling the frame while it spins (counter-clockwise).
const SpinSwooshes: React.FC<{ frame: number }> = ({ frame }) => {
  const o = interpolate(frame, [2, 8, 22, 28], [0, 1, 1, 0], clamp);
  if (o <= 0) return null;
  const cx = VIDEO.width / 2;
  const cy = VIDEO.height / 2;
  const rot = -frame * 14;
  return (
    <svg width={VIDEO.width} height={VIDEO.height} style={{ position: "absolute", inset: 0, opacity: o }}>
      <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
        {[0, 72, 144, 216, 288].map((a, i) => {
          const r = 430 + (i % 2) * 90;
          const a0 = (a * Math.PI) / 180;
          const a1 = ((a + 46) * Math.PI) / 180;
          return (
            <path
              key={a}
              d={`M ${Math.cos(a1) * r} ${Math.sin(a1) * r * 0.62} A ${r} ${r * 0.62} 0 0 0 ${Math.cos(a0) * r} ${Math.sin(a0) * r * 0.62}`}
              stroke={i % 2 ? COLORS.white : COLORS.ink}
              strokeWidth={i % 2 ? 14 : 8}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </g>
    </svg>
  );
};

export const S5BackToRequest: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Hall: spins away counter-clockwise, shrinking into a blur.
  const out = ease(frame, 0, SPIN_OUT_END, Easing.in(Easing.cubic));
  const hallStyle: React.CSSProperties = {
    transform: `rotate(${-200 * out}deg) scale(${1 - 0.55 * out})`,
    filter: `blur(${out * 26}px)`,
    opacity: 1 - ease(frame, SPIN_OUT_END - 6, SPIN_OUT_END),
  };

  // Desk: unspins into place, continuing the same rotation direction.
  const inn = ease(frame, SPIN_IN_START, SPIN_IN_END, Easing.out(Easing.cubic));
  const sideStyle: React.CSSProperties = {
    transform: `rotate(${160 * (1 - inn)}deg) scale(${1.45 - 0.45 * inn})`,
    filter: inn < 0.98 ? `blur(${(1 - inn) * 26}px)` : undefined,
    opacity: ease(frame, SPIN_IN_START, SPIN_IN_START + 6),
  };

  const env = envelopeAt(frame, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {frame < SPIN_OUT_END ? (
        <AbsoluteFill style={hallStyle}>
          {/* S4's last frame, continued (frame S4_DURATION-1 onward). Its
              narration is already over by then, so nothing plays twice. */}
          <Sequence from={-(S4_DURATION - 1)} layout="none">
            <S4Note />
          </Sequence>
        </AbsoluteFill>
      ) : null}
      {frame >= SPIN_IN_START ? (
        <AbsoluteFill style={sideStyle}>
          <Camera {...sideShot(frame)}>
            <SideView t={sideState(frame)} />
            <PopSparks frame={frame} />
            <Trail frame={frame} fps={fps} />
            {env.visible ? (
              <Envelope x={env.x} y={env.y} scale={env.scale} rotate={env.rotate} from={NAME_LABEL} />
            ) : null}
          </Camera>
        </AbsoluteFill>
      ) : null}
      <SpinSwooshes frame={frame} />
      <RewindBadge frame={frame} fps={fps} />
      <Sequence from={NARRATION_START} layout="none">
        <Audio src={staticFile("audio/s5.wav")} />
      </Sequence>
    </AbsoluteFill>
  );
};
