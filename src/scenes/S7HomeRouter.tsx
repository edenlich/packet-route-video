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
import { Bubble } from "../components/Bubble";
import { Camera, Shot, mixShots } from "../components/Camera";
import { Envelope, IP_LABEL, NAME_LABEL } from "../components/Envelope";
import { Router } from "../components/Router";
import { Shape, circ, rr } from "../components/Shape";
import { COLORS, OUTLINE, OUTLINE_THIN } from "../theme";
import { SideView } from "./S1Room";

// Scene 7 — The home router. See SCRIPT.md → "Scene 7".
// Same side-view room as S1/S5/S6. The envelope (label already flipped to the
// IP) hovers beside the laptop, flies to a small home router on a wall shelf
// to the right, the router says "Not for this house… → internet provider!",
// and the envelope shoots down the router's cable into the wall jack. The
// camera follows it into the jack and the frame resolves to the cream canvas,
// ready for S8's wide network map.

// Narration public/audio/s7.wav is 7.83s. Starts at frame 6 → ends ≈ frame 241.
// Beats (scene frames): "First stop:" 6–31 · "your home router." 43–68 ·
// "It knows almost nothing —" 83–122 · "just that anything outside your home
// goes to your internet provider." 131–236.
export const S7_DURATION = 270;
const NARRATION_START = 6;

type SideViewState = React.ComponentProps<typeof SideView>["t"];

// Laptop at rest after Enter (same state S2 leaves it in, page loaded).
const LAPTOP: SideViewState = {
  typed: "moodle.com",
  caret: false,
  enterDown: 0,
  flash: 0,
  loading: 1,
  nearLift: 22,
  nearDip: 0,
  farDip: 0,
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------- Layout (S1 side-view scene space) ----------

const FLOOR_Y = 880;
const ROOM_RIGHT = 2320; // where S1's Room drawing ends; we extend the wall past it

// Wall shelf with the home router, to the right of the desk lamp.
const SHELF = { x: 1990, y: 440, w: 330, h: 26 };
const ROUTER_X = 2150;
const ROUTER_SCALE = 0.85;
const ROUTER_TOP = SHELF.y - 74 * ROUTER_SCALE; // top of the router body

// Wall jack, lower on the wall; the router's cable runs into it.
const JACK = { x: 2470, y: 610 };
const CABLE_START = { x: ROUTER_X + 112, y: SHELF.y - 30 };
const CABLE_C1 = { x: 2390, y: 400 };
const CABLE_C2 = { x: 2350, y: JACK.y };
const cablePoint = (t: number) => {
  const u = 1 - t;
  const p0 = CABLE_START;
  const p3 = JACK;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * CABLE_C1.x + 3 * u * t * t * CABLE_C2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * CABLE_C1.y + 3 * u * t * t * CABLE_C2.y + t * t * t * p3.y,
  };
};

// ---------- Envelope timeline ----------

const START_POS = { x: 1540, y: 290 }; // hovering beside the laptop (S6's end)
const START_SCALE = 0.7;
const LAND_POS = { x: ROUTER_X, y: ROUTER_TOP - 150 * 0.55 * 0.5 - 2 };
const LAND_SCALE = 0.55;

const FLY_START = 26;
const FLY_END = 66;
const HOP_START = 196; // leaves the router top for the cable
const HOP_END = 206;
const ZIP_END = 226; // vanishes into the wall jack
const CABLE_SCALE = 0.26;

type EnvState = { x: number; y: number; scale: number; rotate: number; visible: boolean; speed: number };

const envelopeAt = (frame: number, fps: number): EnvState => {
  if (frame < FLY_START) {
    const bob = Math.sin((frame / fps) * Math.PI * 1.6) * 6;
    return { ...START_POS, y: START_POS.y + bob, scale: START_SCALE, rotate: -3, visible: true, speed: 0 };
  }
  if (frame < FLY_END) {
    const p = interpolate(frame, [FLY_START, FLY_END], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
    const arc = Math.sin(Math.PI * p) * 150;
    const startBob = Math.sin((FLY_START / fps) * Math.PI * 1.6) * 6;
    return {
      x: START_POS.x + (LAND_POS.x - START_POS.x) * p,
      y: START_POS.y + startBob + (LAND_POS.y - START_POS.y - startBob) * p - arc,
      scale: START_SCALE + (LAND_SCALE - START_SCALE) * p,
      rotate: -3 + Math.sin(Math.PI * p) * 14,
      visible: true,
      speed: Math.sin(Math.PI * p),
    };
  }
  if (frame < HOP_START) {
    // Little landing bounce, then rests on the router.
    const settle = spring({ frame: frame - FLY_END, fps, config: { damping: 9, stiffness: 180 } });
    const wiggle = (1 - settle) * 10;
    return { ...LAND_POS, y: LAND_POS.y - wiggle, scale: LAND_SCALE, rotate: wiggle * 0.6, visible: true, speed: 0 };
  }
  if (frame < HOP_END) {
    const p = interpolate(frame, [HOP_START, HOP_END], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
    const arc = Math.sin(Math.PI * p) * 40;
    return {
      x: LAND_POS.x + (CABLE_START.x - LAND_POS.x) * p,
      y: LAND_POS.y + (CABLE_START.y - LAND_POS.y) * p - arc,
      scale: LAND_SCALE + (CABLE_SCALE - LAND_SCALE) * p,
      rotate: p * 25,
      visible: true,
      speed: p,
    };
  }
  if (frame < ZIP_END) {
    // Shoots along the cable, accelerating.
    const p = interpolate(frame, [HOP_END, ZIP_END], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
    const a = cablePoint(Math.max(0, p - 0.01));
    const b = cablePoint(Math.min(1, p + 0.01));
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    const pt = cablePoint(p);
    return {
      ...pt,
      scale: CABLE_SCALE * (1 - 0.5 * Math.pow(p, 3)),
      rotate: angle,
      visible: true,
      speed: interpolate(p, [0.05, 0.35], [0, 1], clamp),
    };
  }
  return { ...JACK, scale: 0, rotate: 0, visible: false, speed: 0 };
};

// ---------- Room extension + props ----------

// The wall, floor and baseboard continue to the right of S1's room drawing,
// so the camera can travel to the shelf and the jack. Drawn before SideView.
const RoomExtension: React.FC = () => (
  <g>
    {/* Colours are pre-mixed with S1's evening wash (#3A2A4A @ 12%), so there's
        no visible seam where S1's own wash rectangle ends. */}
    <rect x={ROOM_RIGHT - 4} y={-400} width={1600} height={FLOOR_Y + 400} fill={WASHED.wall} />
    <path
      d={`M ${ROOM_RIGHT - 4} -400 H 3920 V 111 Q ${ROOM_RIGHT + 700} 111 ${ROOM_RIGHT} 60 L ${ROOM_RIGHT - 4} 60 Z`}
      fill={WASHED.wallShade}
    />
    <rect x={ROOM_RIGHT - 4} y={FLOOR_Y} width={1600} height={700} fill={WASHED.woodShade} />
    {[2420, 2760, 3100, 3440].map((px, i) => (
      <line
        key={px}
        x1={px}
        y1={FLOOR_Y + 40 + ((i + 1) % 2) * 70}
        x2={px + 160}
        y2={FLOOR_Y + 40 + ((i + 1) % 2) * 70}
        stroke={WASHED.wood}
        strokeWidth={6}
        strokeLinecap="round"
      />
    ))}
  </g>
);

// S1 room colours with its evening wash already applied.
const WASHED = {
  wall: "#DCC2A9",
  wallShade: "#CCB095",
  woodShade: "#9B6948",
  wood: "#B57F57",
  background: "#E7DCCE",
};

// Baseboard continuation, drawn after SideView: no vertical outline at the seam.
const BaseboardPatch: React.FC = () => {
  const y = FLOOR_Y - 26;
  return (
    <g>
      <rect x={ROOM_RIGHT - 30} y={y} width={1630} height={30} fill={WASHED.background} />
      <line x1={ROOM_RIGHT - 30} y1={y} x2={3920} y2={y} stroke={COLORS.ink} strokeWidth={3} />
      <line x1={ROOM_RIGHT - 30} y1={y + 30} x2={3920} y2={y + 30} stroke={COLORS.ink} strokeWidth={3} />
    </g>
  );
};

const Shelf: React.FC = () => (
  <g>
    {/* Brackets */}
    {[SHELF.x + 50, SHELF.x + SHELF.w - 70].map((bx) => (
      <Shape
        key={bx}
        d={`M ${bx} ${SHELF.y + SHELF.h - 2} L ${bx + 20} ${SHELF.y + SHELF.h - 2} L ${bx + 20} ${SHELF.y + 90} Z`}
        fill={COLORS.woodShade}
        strokeWidth={OUTLINE_THIN}
      />
    ))}
    <Shape
      d={rr(SHELF.x, SHELF.y, SHELF.w, SHELF.h, 6)}
      fill={COLORS.wood}
      shade={<rect x={SHELF.x} y={SHELF.y + 15} width={SHELF.w} height={12} fill={COLORS.woodShade} />}
    />
  </g>
);

// The router's cable, from its back down the wall into the jack. `pulse` lights it.
const Cable: React.FC<{ pulse: number; progress: number }> = ({ pulse, progress }) => {
  const d = `M ${CABLE_START.x} ${CABLE_START.y} C ${CABLE_C1.x} ${CABLE_C1.y} ${CABLE_C2.x} ${CABLE_C2.y} ${JACK.x} ${JACK.y}`;
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={COLORS.ink} strokeWidth={10 + OUTLINE * 2} />
      <path d={d} stroke={COLORS.network} strokeWidth={10} />
      {pulse > 0.01 && progress > 0.001 ? (
        <path
          d={d}
          stroke={COLORS.packet}
          strokeWidth={10}
          opacity={pulse}
          pathLength={1}
          strokeDasharray={`${progress} 2`}
        />
      ) : null}
    </g>
  );
};

const WallJack: React.FC<{ glow: number }> = ({ glow }) => (
  <g>
    {glow > 0.01 ? <circle cx={JACK.x} cy={JACK.y} r={70} fill={COLORS.packet} opacity={0.35 * glow} /> : null}
    <Shape
      d={rr(JACK.x - 38, JACK.y - 52, 76, 104, 12)}
      fill={COLORS.background}
      shade={<rect x={JACK.x - 38} y={JACK.y + 30} width={76} height={24} fill={COLORS.backgroundShade} />}
    />
    {/* The port (cream inside: it's where the camera dives through). */}
    <Shape d={rr(JACK.x - 18, JACK.y - 14, 36, 28, 4)} fill={COLORS.chair} strokeWidth={OUTLINE_THIN} />
    <rect x={JACK.x - 12} y={JACK.y - 8} width={24} height={16} rx={2} fill={COLORS.background} opacity={0.9} />
    <Shape d={circ(JACK.x, JACK.y - 36, 5)} fill={COLORS.metal} strokeWidth={2.5} />
    <Shape d={circ(JACK.x, JACK.y + 36, 5)} fill={COLORS.metal} strokeWidth={2.5} />
  </g>
);

// Plug at the cable's end, sitting in the port.
const Plug: React.FC = () => (
  <Shape d={rr(JACK.x - 14, JACK.y - 11, 28, 22, 4)} fill={COLORS.networkShade} strokeWidth={OUTLINE_THIN} />
);

// Cartoon speed lines trailing behind a moving thing.
const SpeedLines: React.FC<{ x: number; y: number; angle: number; strength: number; size: number }> = ({
  x,
  y,
  angle,
  strength,
  size,
}) => {
  if (strength < 0.05) return null;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} opacity={Math.min(1, strength * 1.2)}>
      {[-0.35, 0, 0.35].map((o, i) => (
        <line
          key={o}
          x1={-size * (0.75 + i * 0.08)}
          y1={o * size}
          x2={-size * (0.75 + i * 0.08) - size * 0.9 * strength}
          y2={o * size}
          stroke={COLORS.ink}
          strokeWidth={6}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
};

// ---------- Camera plan ----------

const SHOT_LAPTOP: Shot = { x: 1530, y: 470, zoom: 1.4, rotate: 0 };
const SHOT_ROUTER: Shot = { x: 2090, y: 360, zoom: 1.32, rotate: 0.4 };
const SHOT_BUBBLE: Shot = { x: 2150, y: 330, zoom: 1.48, rotate: -0.3 };
const SHOT_JACK: Shot = { x: 2440, y: 590, zoom: 2.3, rotate: 0.6 };
const SHOT_DIVE: Shot = { x: JACK.x, y: JACK.y, zoom: 60, rotate: 0 };

const DIVE_START = 224;
const DIVE_END = 258;

const cameraAt = (frame: number, fps: number): Shot => {
  // Follow the flight, leading slightly (starts a few frames before the envelope).
  const toRouter = spring({ frame: frame - (FLY_START - 6), fps, durationInFrames: 48, config: { damping: 200 } });
  let shot = mixShots(SHOT_LAPTOP, SHOT_ROUTER, toRouter);
  // Slow push-in on the router while it "thinks" and talks.
  const push = interpolate(frame, [72, 196], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  shot = mixShots(shot, SHOT_BUBBLE, push);
  // Follow the envelope down the cable to the jack.
  const toJack = spring({ frame: frame - (HOP_START - 4), fps, durationInFrames: 30, config: { damping: 200 } });
  shot = mixShots(shot, SHOT_JACK, toJack);
  // Dive into the jack: slow start, rushing in.
  const dive = interpolate(frame, [DIVE_START, DIVE_END], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.5, 0, 0.9, 0.4),
  });
  return mixShots(shot, SHOT_DIVE, dive);
};

// ---------- Scene ----------

export const S7HomeRouter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const env = envelopeAt(frame, fps);
  const shot = cameraAt(frame, fps);

  // Router reacts when the envelope lands: lights up and does a little squash.
  const landed = frame >= FLY_END - 2;
  const active = interpolate(frame, [FLY_END - 4, FLY_END + 6, HOP_END, ZIP_END + 6], [0, 1, 1, 0.3], clamp);
  const squashT = spring({ frame: frame - (FLY_END - 2), fps, config: { damping: 7, stiffness: 220 } });
  const squash = landed ? 1 - 0.12 * Math.sin(squashT * Math.PI) * (1 - squashT * 0.5) : 1;

  // Bubble: pops on "just that anything outside your home…", leaves as the envelope zips off.
  const bubbleIn = spring({ frame: frame - 128, fps, config: { damping: 12 } });
  const bubbleOut = interpolate(frame, [HOP_END + 4, HOP_END + 14], [1, 0], {
    ...clamp,
    easing: Easing.in(Easing.quad),
  });
  const bubblePop = bubbleIn * bubbleOut;

  // Cable lights up as the envelope travels through it; jack flashes on arrival.
  const cablePulse = interpolate(frame, [HOP_END, HOP_END + 6, ZIP_END + 4, ZIP_END + 16], [0, 0.8, 0.8, 0], clamp);
  const cableProgress = interpolate(frame, [HOP_END, ZIP_END], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const jackGlow = interpolate(frame, [ZIP_END - 4, ZIP_END + 2, ZIP_END + 22], [0, 1, 0.4], clamp);

  // Cream fills the frame as the camera passes through the port.
  const cream = interpolate(frame, [DIVE_END - 12, DIVE_END], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });

  const trailSize = 110 * env.scale * 1.4;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <Camera {...shot}>
        <RoomExtension />
        <SideView t={LAPTOP} />
        <BaseboardPatch />
        <Shelf />
        <WallJack glow={jackGlow} />
        <Cable pulse={cablePulse} progress={cableProgress} />
        <Plug />
        <g transform={`translate(${ROUTER_X} ${SHELF.y}) scale(${2 - squash} ${squash}) translate(${-ROUTER_X} ${-SHELF.y})`}>
          <Router variant="home" x={ROUTER_X} y={SHELF.y} scale={ROUTER_SCALE} active={active} seed={3} />
        </g>
        {env.visible ? (
          <>
            <SpeedLines
              x={env.x}
              y={env.y}
              angle={frame >= HOP_END ? env.rotate : 6}
              strength={frame >= HOP_START && frame < HOP_END ? 0 : env.speed}
              size={trailSize}
            />
            <Envelope
              x={env.x}
              y={env.y}
              scale={env.scale}
              rotate={env.rotate}
              from={NAME_LABEL}
              to={IP_LABEL}
              flip={1}
            />
          </>
        ) : null}
        <Bubble
          x={ROUTER_X - 70}
          y={ROUTER_TOP - 135}
          text={"Not for this house…\n→ internet provider!"}
          pop={bubblePop}
          fontSize={38}
          tail="right"
        />
      </Camera>
      {cream > 0 ? <AbsoluteFill style={{ backgroundColor: COLORS.background, opacity: cream }} /> : null}
      <Sequence from={NARRATION_START} layout="none">
        <Audio src={staticFile("audio/s7.wav")} />
      </Sequence>
    </AbsoluteFill>
  );
};
