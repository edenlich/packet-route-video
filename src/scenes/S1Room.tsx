import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Camera, Shot, easedMove } from "../components/Camera";
import { Person } from "../components/Person";
import { LimbPath, Shape, circ, rr } from "../components/Shape";
import { COLORS, FONT, OUTLINE, VIDEO } from "../theme";

// Scene 1 — The room. A person at a desk in the evening, seen from behind.

export const S1_DURATION = 300;

// Narration (public/audio/s1.wav, ~7.3 s ≈ 218 frames) starts shortly after
// the scene opens and finishes just before the Enter press (~frame 267).
const NARRATION_START = 20;

const FLOOR_Y = 880;
const DESK_TOP = 640;

// ---------- Back view set ----------

const Window: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="s1-dusk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5B5F97" />
        <stop offset="0.55" stopColor="#C77D8E" />
        <stop offset="1" stopColor="#FFB27A" />
      </linearGradient>
    </defs>
    <Shape d={rr(126, 126, 328, 348, 14)} fill={COLORS.wood} />
    <Shape d={rr(150, 150, 280, 300, 6)} fill="url(#s1-dusk)" />
    {/* A thin crescent moon and a couple of stars. */}
    <mask id="s1-moon">
      <circle cx={360} cy={210} r={22} fill="white" />
      <circle cx={371} cy={202} r={20} fill="black" />
    </mask>
    <circle cx={360} cy={210} r={22} fill="#FFF4E0" mask="url(#s1-moon)" />
    <circle cx={210} cy={190} r={3} fill="#FFF4E0" />
    <circle cx={260} cy={240} r={2.5} fill="#FFF4E0" />
    <Shape d={rr(282, 150, 16, 300, 0)} fill={COLORS.wood} strokeWidth={3} />
    <Shape d={rr(150, 292, 280, 16, 0)} fill={COLORS.wood} strokeWidth={3} />
    {/* Sill. */}
    <Shape
      d={rr(108, 470, 364, 26, 8)}
      fill={COLORS.wood}
      shade={<rect x={108} y={484} width={364} height={12} fill={COLORS.woodShade} />}
    />
  </g>
);

const Poster: React.FC = () => (
  <g transform="rotate(2 1700 300)">
    <Shape d={rr(1610, 200, 180, 230, 8)} fill={COLORS.background} />
    <Shape d={circ(1700, 290, 46)} fill={COLORS.packet} strokeWidth={3} />
    <Shape d={rr(1640, 360, 120, 14, 7)} fill={COLORS.network} strokeWidth={3} />
    <Shape d={rr(1660, 388, 80, 12, 6)} fill={COLORS.wallShade} strokeWidth={3} />
  </g>
);

const Room: React.FC = () => (
  <g>
    {/* Wall (oversized so drift/rotation never shows an edge). */}
    <rect x={-400} y={-400} width={2720} height={FLOOR_Y + 400} fill={COLORS.wall} />
    {/* Evening: corners of the wall fall into a flat shadow tone. */}
    <path d={`M -400 -400 H 2320 V 60 Q 960 -40 -400 60 Z`} fill={COLORS.wallShade} />
    {/* Floor + baseboard. */}
    <rect x={-400} y={FLOOR_Y} width={2720} height={700} fill={COLORS.woodShade} />
    {[-300, 40, 380, 720, 1060, 1400, 1740, 2080].map((px, i) => (
      <line
        key={px}
        x1={px}
        y1={FLOOR_Y + 40 + (i % 2) * 70}
        x2={px + 160}
        y2={FLOOR_Y + 40 + (i % 2) * 70}
        stroke={COLORS.wood}
        strokeWidth={6}
        strokeLinecap="round"
      />
    ))}
    <Shape d={rr(-400, FLOOR_Y - 26, 2720, 30, 0)} fill={COLORS.background} strokeWidth={3} />
    <Window />
    <Poster />
  </g>
);

// Soft screen glow on the wall behind the laptop: flat stacked rings.
const ScreenGlow: React.FC<{ cx: number; cy: number; strength?: number }> = ({
  cx,
  cy,
  strength = 1,
}) => (
  <g>
    {[260, 200, 140].map((r, i) => (
      <ellipse
        key={r}
        cx={cx}
        cy={cy}
        rx={r * 1.25}
        ry={r}
        fill={COLORS.screenGlow}
        opacity={(0.18 + i * 0.1) * strength}
      />
    ))}
  </g>
);

const Desk: React.FC = () => (
  <g>
    {/* Legs. */}
    <Shape
      d={rr(520, DESK_TOP + 30, 40, FLOOR_Y + 20 - DESK_TOP - 30, 6)}
      fill={COLORS.wood}
      shade={<rect x={540} y={DESK_TOP} width={30} height={400} fill={COLORS.woodShade} />}
    />
    <Shape
      d={rr(1480, DESK_TOP + 30, 40, FLOOR_Y + 20 - DESK_TOP - 30, 6)}
      fill={COLORS.wood}
      shade={<rect x={1500} y={DESK_TOP} width={30} height={400} fill={COLORS.woodShade} />}
    />
    {/* Drawer block under the right side. */}
    <Shape
      d={rr(1260, DESK_TOP + 30, 220, 150, 8)}
      fill={COLORS.wood}
      shade={<rect x={1260} y={DESK_TOP + 140} width={220} height={60} fill={COLORS.woodShade} />}
    />
    <Shape d={rr(1335, DESK_TOP + 90, 70, 14, 7)} fill={COLORS.woodShade} strokeWidth={3} />
    {/* Top. */}
    <Shape
      d={rr(470, DESK_TOP, 1100, 40, 10)}
      fill={COLORS.wood}
      shade={<rect x={470} y={DESK_TOP + 24} width={1100} height={20} fill={COLORS.woodShade} />}
    />
  </g>
);

// Laptop seen from behind: we see the back of the lid; the screen faces the person.
const LaptopBack: React.FC = () => (
  <g>
    <Shape
      d={rr(850, DESK_TOP - 196, 300, 196, 16)}
      fill={COLORS.metal}
      shade={<rect x={1080} y={DESK_TOP - 200} width={80} height={200} fill={COLORS.metalShade} />}
    />
    <Shape d={circ(1000, DESK_TOP - 100, 16)} fill={COLORS.background} strokeWidth={3} />
    <Shape d={rr(830, DESK_TOP - 10, 340, 14, 6)} fill={COLORS.metalShade} strokeWidth={3} />
    {/* Screen light spilling over the lid's top edge. */}
    <path
      d={`M 858 ${DESK_TOP - 197} Q 1000 ${DESK_TOP - 214} 1142 ${DESK_TOP - 197}`}
      stroke={COLORS.screenGlow}
      strokeWidth={6}
      strokeLinecap="round"
      fill="none"
    />
  </g>
);

const Lamp: React.FC<{ x: number }> = ({ x }) => {
  const baseY = DESK_TOP;
  return (
    <g>
      {/* Warm light cone and the pool it makes on the desk. */}
      <path
        d={`M ${x + 58} ${baseY - 238} L ${x + 150} ${baseY - 214} L ${x + 210} ${baseY} L ${x - 60} ${baseY} Z`}
        fill={COLORS.lampLight}
        opacity={0.45}
      />
      <ellipse cx={x + 75} cy={baseY + 2} rx={150} ry={14} fill={COLORS.lampLight} opacity={0.8} />
      {/* Arm. */}
      <LimbPath
        points={[
          [x, baseY - 16],
          [x - 40, baseY - 170],
          [x + 70, baseY - 250],
        ]}
        width={14}
        color={COLORS.network}
      />
      <Shape d={circ(x - 40, baseY - 170, 14)} fill={COLORS.networkShade} strokeWidth={3} />
      {/* Base. */}
      <Shape
        d={rr(x - 60, baseY - 24, 120, 26, 12)}
        fill={COLORS.network}
        shade={<rect x={x - 60} y={baseY - 10} width={120} height={14} fill={COLORS.networkShade} />}
      />
      {/* Shade (a tilted cone) with a glowing bulb rim. */}
      <g transform={`rotate(22 ${x + 90} ${baseY - 250})`}>
        <Shape
          d={`M ${x + 50} ${baseY - 300} L ${x + 130} ${baseY - 300} L ${x + 168} ${baseY - 220} L ${x + 12} ${baseY - 220} Z`}
          fill={COLORS.network}
          shade={<rect x={x + 110} y={baseY - 310} width={70} height={100} fill={COLORS.networkShade} />}
        />
        <ellipse cx={x + 90} cy={baseY - 218} rx={74} ry={9} fill={COLORS.lampLight} stroke={COLORS.ink} strokeWidth={3} />
      </g>
    </g>
  );
};

// Evening tone over the room: a flat warm-dark wash (lights drawn on top stay bright).
const EveningWash: React.FC = () => (
  <g pointerEvents="none">
    <rect x={-400} y={-400} width={2720} height={1880} fill="#3A2A4A" opacity={0.12} />
  </g>
);

export const BackView: React.FC = () => (
  <g>
    <Room />
    <EveningWash />
    <ScreenGlow cx={1000} cy={DESK_TOP - 150} />
    <Desk />
    <Lamp x={1340} />
    <LaptopBack />
    <Person x={830} y={1040} scale={1} />
  </g>
);

// ---------- 3/4 side view set ----------
// Over-the-shoulder: the person in profile facing right, the laptop screen
// turned toward the camera (a cartoon cheat) so the address bar is readable.

// Screen is drawn in its own flat 360×240 space, then mapped onto the
// tilted lid with an affine matrix (a slanted parallelogram reads as 3/4).
const SCREEN_W = 360;
const SCREEN_H = 240;
const SCREEN_TL: [number, number] = [1290, 385];
const SCREEN_U: [number, number] = [1, 0.028]; // per screen unit, along the width
const SCREEN_V: [number, number] = [-0.05, 1]; // per screen unit, down the height
const BEZEL = 16;

const screenToScene = (u: number, v: number): [number, number] => [
  SCREEN_TL[0] + u * SCREEN_U[0] + v * SCREEN_V[0],
  SCREEN_TL[1] + u * SCREEN_U[1] + v * SCREEN_V[1],
];
const SCREEN_MATRIX = `matrix(${SCREEN_U[0]} ${SCREEN_U[1]} ${SCREEN_V[0]} ${SCREEN_V[1]} ${SCREEN_TL[0]} ${SCREEN_TL[1]})`;

// Keyboard base: lies on the desk, from the hinge toward the person.
// Local space: u along the hinge (0..BASE_W), w toward the front (0..100).
const HINGE = screenToScene(-BEZEL, SCREEN_H + BEZEL);
const BASE_W = SCREEN_W + BEZEL * 2;
const BASE_FRONT: [number, number] = [-2.1, 0.62]; // per w unit
const BASE_MATRIX = `matrix(${SCREEN_U[0]} ${SCREEN_U[1]} ${BASE_FRONT[0]} ${BASE_FRONT[1]} ${HINGE[0]} ${HINGE[1]})`;
const baseToScene = (u: number, w: number): [number, number] => [
  HINGE[0] + u * SCREEN_U[0] + w * BASE_FRONT[0],
  HINGE[1] + u * SCREEN_U[1] + w * BASE_FRONT[1],
];

const ENTER_KEY = { u: 30, w: 38, width: 54, height: 26 };
export const ENTER_POS = baseToScene(ENTER_KEY.u + ENTER_KEY.width / 2, ENTER_KEY.w + ENTER_KEY.height / 2);

// Where the side-view person sits (floor point under the chair).
const SIDE_PERSON: [number, number] = [ENTER_POS[0] - 235, 1040];
const toPersonLocal = (p: [number, number]): [number, number] => [
  p[0] - SIDE_PERSON[0],
  p[1] - SIDE_PERSON[1],
];

// ---------- Typing timeline (side view) ----------
// "moodle.com" types itself with a slightly uneven, human rhythm,
// then a short pause, a wind-up, and Enter.
const URL_TEXT = "moodle.com";
const TYPE_START = 160;
const KEY_GAPS = [8, 7, 10, 6, 9, 8, 13, 7, 8, 9]; // frames before each letter
const KEY_TIMES = KEY_GAPS.reduce<number[]>((acc, gap, i) => {
  acc.push((i === 0 ? TYPE_START : acc[i - 1]) + gap);
  return acc;
}, []);
const TYPE_END = KEY_TIMES[KEY_TIMES.length - 1];
const ENTER_WINDUP = TYPE_END + 14; // hand lifts
const ENTER_HIT = ENTER_WINDUP + 8; // key hits bottom
const ENTER_RELEASE = ENTER_HIT + 8;

type Typing = {
  typed: string;
  caret: boolean;
  enterDown: number; // 0..1 key squash
  flash: number; // 0..1 click flash, fades out
  loading: number; // 0..1 page-load bar after Enter
  nearLift: number; // + = hand raised (scene units)
  nearDip: number;
  farDip: number;
};

const typingAt = (frame: number): Typing => {
  const count = KEY_TIMES.filter((t) => frame >= t).length;
  const typing = frame >= TYPE_START && frame < TYPE_END + 8;
  // Caret: solid while typing, blinking when idle, gone after Enter.
  const caret = frame < ENTER_HIT && (typing || Math.floor(frame / 14) % 2 === 0);

  // Each letter: one hand taps (alternating), a quick 2-in / 3-out dip.
  let nearDip = 0;
  let farDip = 0;
  KEY_TIMES.forEach((t, i) => {
    const d = interpolate(frame, [t - 2, t, t + 3], [0, 9, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    if (i % 2 === 0) farDip += d;
    else nearDip += d;
  });

  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  // Wind-up: the near hand rises, hangs, then slams down onto Enter.
  const nearLift = interpolate(
    frame,
    [TYPE_END + 4, ENTER_WINDUP, ENTER_HIT - 3, ENTER_HIT, ENTER_RELEASE, ENTER_RELEASE + 8],
    [18, 46, 52, -4, -2, 22],
    { ...clamp, easing: Easing.inOut(Easing.quad) },
  );
  const enterDown = interpolate(
    frame,
    [ENTER_HIT - 2, ENTER_HIT, ENTER_RELEASE, ENTER_RELEASE + 4],
    [0, 1, 1, 0],
    clamp,
  );
  const flash = interpolate(frame, [ENTER_HIT, ENTER_HIT + 14], [1, 0], {
    ...clamp,
    easing: Easing.out(Easing.quad),
  });
  const loading =
    frame < ENTER_HIT
      ? 0
      : interpolate(frame, [ENTER_HIT + 2, ENTER_HIT + 40], [0, 0.72], {
          ...clamp,
          easing: Easing.out(Easing.cubic),
        });
  return {
    typed: URL_TEXT.slice(0, count),
    caret,
    enterDown,
    flash: frame >= ENTER_HIT ? flash : 0,
    loading,
    nearLift,
    nearDip,
    farDip,
  };
};

const Browser: React.FC<{ typed: string; caret: boolean; flash: number; loading: number }> = ({
  typed,
  caret,
  flash,
  loading,
}) => (
  <g>
    <clipPath id="s1-browser">
      <rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} rx={6} />
    </clipPath>
    <g clipPath="url(#s1-browser)">
      <rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} fill={COLORS.white} />
      {/* Toolbar. */}
      <rect x={0} y={0} width={SCREEN_W} height={46} fill="#EDE6DA" />
      <line x1={0} y1={46} x2={SCREEN_W} y2={46} stroke={COLORS.ink} strokeWidth={2} />
      {[COLORS.packet, COLORS.lampLight, COLORS.network].map((c, i) => (
        <circle key={c} cx={16 + i * 15} cy={23} r={5} fill={c} stroke={COLORS.ink} strokeWidth={1.5} />
      ))}
      {/* Address bar. */}
      <rect x={66} y={10} width={282} height={26} rx={13} fill={COLORS.white} stroke={COLORS.ink} strokeWidth={2} />
      <circle cx={81} cy={22} r={5} fill="none" stroke={COLORS.metalShade} strokeWidth={2} />
      <line x1={85} y1={26} x2={89} y2={30} stroke={COLORS.metalShade} strokeWidth={2} strokeLinecap="round" />
      <text x={97} y={29} fontFamily={FONT} fontWeight={500} fontSize={17} fill={COLORS.ink}>
        {typed}
        <tspan fill={COLORS.network} fontWeight={600} opacity={caret ? 1 : 0}>
          |
        </tspan>
      </text>
      {/* Empty new-tab page: a few soft placeholder blocks. */}
      <rect x={110} y={84} width={140} height={22} rx={11} fill={COLORS.wall} />
      <rect x={60} y={124} width={240} height={30} rx={15} fill={COLORS.background} stroke={COLORS.wallShade} strokeWidth={2} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={74 + i * 56} y={176} width={42} height={42} rx={10} fill={COLORS.wall} />
      ))}
      {/* Page-load bar under the toolbar once Enter is pressed. */}
      {loading > 0 ? (
        <rect x={0} y={45} width={SCREEN_W * loading} height={5} fill={COLORS.network} />
      ) : null}
      {/* Click flash: the address bar lights up, the screen pulses. */}
      {flash > 0 ? (
        <>
          <rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} fill={COLORS.white} opacity={flash * 0.55} />
          <rect
            x={66 - 6 * flash}
            y={10 - 4 * flash}
            width={282 + 12 * flash}
            height={26 + 8 * flash}
            rx={17}
            fill="none"
            stroke={COLORS.network}
            strokeWidth={3}
            opacity={flash}
          />
        </>
      ) : null}
    </g>
  </g>
);

// Cartoon "click!" burst at the Enter key: a ring plus short spark lines.
const ClickBurst: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => {
  if (t <= 0) return null;
  const p = 1 - t; // 0 → 1 as it expands
  const ring = 30 + p * 70;
  return (
    <g opacity={t}>
      <ellipse cx={x} cy={y} rx={ring * 1.3} ry={ring * 0.6} fill="none" stroke={COLORS.white} strokeWidth={6 * t + 1} />
      {[-150, -110, -70, -30].map((a) => {
        const rad = (a * Math.PI) / 180;
        const r0 = 46 + p * 40;
        const r1 = r0 + 28;
        return (
          <line
            key={a}
            x1={x + Math.cos(rad) * r0}
            y1={y + Math.sin(rad) * r0}
            x2={x + Math.cos(rad) * r1}
            y2={y + Math.sin(rad) * r1}
            stroke={COLORS.ink}
            strokeWidth={5}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
};

const LaptopSide: React.FC<{ t: Typing }> = ({ t }) => {
  const { enterDown } = t;
  const keys: React.ReactNode[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 11; col++) {
      const u = 96 + col * 26;
      const w = 14 + row * 18;
      keys.push(<rect key={`${row}-${col}`} x={u} y={w} width={20} height={13} rx={3} fill={COLORS.metal} />);
    }
  }
  // Enter key squashes down when pressed (enterDown 0..1).
  const squash = 1 - 0.35 * enterDown;
  return (
    <g>
      {/* Keyboard base. */}
      <g transform={BASE_MATRIX}>
        {/* Thickness: the front lip, shifted down a little. */}
        <path
          d={`M 0 100 L ${BASE_W} 100 L ${BASE_W} 106 L 0 106 Z`}
          fill={COLORS.metalShade}
          stroke={COLORS.ink}
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
        <rect x={0} y={0} width={BASE_W} height={100} rx={4} fill={COLORS.metal} stroke={COLORS.ink} strokeWidth={OUTLINE} vectorEffect="non-scaling-stroke" />
        <rect x={20} y={8} width={BASE_W - 40} height={80} rx={4} fill={COLORS.metalShade} />
        {keys}
        <g transform={`translate(${ENTER_KEY.u + ENTER_KEY.width / 2} ${ENTER_KEY.w + ENTER_KEY.height}) scale(${1 + 0.12 * enterDown} ${squash}) translate(${-ENTER_KEY.width / 2} ${-ENTER_KEY.height})`}>
          <rect
            x={0}
            y={0}
            width={ENTER_KEY.width}
            height={ENTER_KEY.height}
            rx={4}
            fill={COLORS.background}
            stroke={COLORS.ink}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </g>
      {/* Lid: thickness strip on the right edge, bezel, then the screen. */}
      <g transform={SCREEN_MATRIX}>
        <rect
          x={-BEZEL + 8}
          y={-BEZEL + 6}
          width={SCREEN_W + BEZEL * 2}
          height={SCREEN_H + BEZEL * 2}
          rx={14}
          fill={COLORS.metalShade}
          stroke={COLORS.ink}
          strokeWidth={OUTLINE}
        />
        <rect
          x={-BEZEL}
          y={-BEZEL}
          width={SCREEN_W + BEZEL * 2}
          height={SCREEN_H + BEZEL * 2}
          rx={14}
          fill={COLORS.chair}
          stroke={COLORS.ink}
          strokeWidth={OUTLINE}
        />
        <Browser typed={t.typed} caret={t.caret} flash={t.flash} loading={t.loading} />
        <rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} rx={6} fill="none" stroke={COLORS.ink} strokeWidth={3} />
      </g>
    </g>
  );
};

const DeskSide: React.FC = () => (
  <g>
    <Shape
      d={rr(930, DESK_TOP + 30, 40, FLOOR_Y + 20 - DESK_TOP - 30, 6)}
      fill={COLORS.wood}
      shade={<rect x={950} y={DESK_TOP} width={30} height={400} fill={COLORS.woodShade} />}
    />
    <Shape
      d={rr(1900, DESK_TOP + 30, 220, 160, 8)}
      fill={COLORS.wood}
      shade={<rect x={1900} y={DESK_TOP + 150} width={220} height={60} fill={COLORS.woodShade} />}
    />
    <Shape
      d={rr(880, DESK_TOP, 1500, 40, 10)}
      fill={COLORS.wood}
      shade={<rect x={880} y={DESK_TOP + 24} width={1500} height={20} fill={COLORS.woodShade} />}
    />
  </g>
);

export const SideView: React.FC<{ t: Typing }> = ({ t }) => {
  // Hands: the near hand hovers just behind Enter (so the key stays visible),
  // taps on its letters, winds up and slams down on Enter.
  // The far hand rests further along the keyboard and taps the other letters.
  const nearHand = toPersonLocal([
    // Lifted → sits behind the key; pressing → slides onto it.
    ENTER_POS[0] - 6 - 24 * Math.min(1, Math.max(0, t.nearLift / 18)),
    ENTER_POS[1] - 12 - t.nearLift + t.nearDip,
  ]);
  const farRest = baseToScene(150, 30);
  const farHand = toPersonLocal([farRest[0], farRest[1] + t.farDip]);
  const screenCenter = screenToScene(SCREEN_W / 2, SCREEN_H / 2);
  return (
    <g>
      <Room />
      <EveningWash />
      <ScreenGlow cx={screenCenter[0]} cy={screenCenter[1]} strength={1.2} />
      <DeskSide />
      <Lamp x={1760} />
      <LaptopSide t={t} />
      <Person x={SIDE_PERSON[0]} y={SIDE_PERSON[1]} view="side" nearHand={nearHand} farHand={farHand} />
      <ClickBurst x={ENTER_POS[0]} y={ENTER_POS[1] - 6} t={t.flash} />
    </g>
  );
};

// ---------- Camera plan ----------

// Back view: slow push-in from the wide room toward the person + laptop.
// The move is timed to end after the whip-pan so it's still moving
// (never settled) when the camera whips away around frame 120.
const BACK_WIDE: Shot = { x: 960, y: 540, zoom: 1.0, rotate: 0 };
const BACK_CLOSE: Shot = { x: 925, y: 545, zoom: 1.4, rotate: -0.6 };
const backShot = (frame: number) =>
  easedMove({ frame, from: BACK_WIDE, to: BACK_CLOSE, start: 0, end: 150 });

// Side view: its own slow push-in toward the screen and the hand on Enter.
const SIDE_WIDE: Shot = { x: 1180, y: 560, zoom: 1.15, rotate: 0.8 };
const SIDE_CLOSE: Shot = { x: 1260, y: 560, zoom: 1.7, rotate: 0 };
const sideShot = (frame: number) =>
  easedMove({ frame, from: SIDE_WIDE, to: SIDE_CLOSE, start: 110, end: 320 });

// Whip-pan (fake orbit): both views sit side by side like one long strip
// and the camera whips right across it in ~6 frames, centered on frame 120.
const WHIP_START = 117;
const WHIP_END = 123;
const WHIP_DISTANCE = VIDEO.width + 200;
const MAX_SMEAR = 70;

const whip = (frame: number) => {
  const p = interpolate(frame, [WHIP_START, WHIP_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  // Smear follows speed: zero at both ends, strongest mid-whip.
  const raw = interpolate(frame, [WHIP_START, WHIP_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { offset: -p * WHIP_DISTANCE, smear: Math.sin(Math.PI * raw) * MAX_SMEAR };
};

export const S1Room: React.FC = () => {
  const frame = useCurrentFrame();
  const { offset, smear } = whip(frame);
  const showBack = frame < WHIP_END;
  const showSide = frame >= WHIP_START;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {showBack ? (
        <Camera {...backShot(frame)} panX={offset} smear={smear}>
          <BackView />
        </Camera>
      ) : null}
      {showSide ? (
        <Camera {...sideShot(frame)} panX={offset + WHIP_DISTANCE} smear={smear}>
          <SideView t={typingAt(frame)} />
        </Camera>
      ) : null}
      <Sequence from={NARRATION_START} layout="none">
        <Audio src={staticFile("audio/s1.wav")} />
      </Sequence>
    </AbsoluteFill>
  );
};
