import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Camera, Shot, easedMove } from "../components/Camera";
import { Person } from "../components/Person";
import { LimbPath, Shape, circ, rr } from "../components/Shape";
import { COLORS } from "../theme";

// Scene 1 — The room. A person at a desk in the evening, seen from behind.

export const S1_DURATION = 300;

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

// ---------- Camera plan ----------

// Back view: slow push-in from the wide room toward the person + laptop.
// The move is timed to end after the whip-pan so it's still moving
// (never settled) when the camera whips away around frame 120.
const BACK_WIDE: Shot = { x: 960, y: 540, zoom: 1.0, rotate: 0 };
const BACK_CLOSE: Shot = { x: 925, y: 545, zoom: 1.4, rotate: -0.6 };
const backShot = (frame: number) =>
  easedMove({ frame, from: BACK_WIDE, to: BACK_CLOSE, start: 0, end: 150 });

export const S1Room: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <Camera {...backShot(frame)}>
        <BackView />
      </Camera>
    </AbsoluteFill>
  );
};
