import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, OUTLINE_THIN } from "../theme";
import { Limb, Shape, circ, rr } from "./Shape";

// Routers. (x, y) is the bottom-centre of the device (where it sits on a shelf
// or on the map).
//
//   <Router variant="home" x={1400} y={600} />          // Scene 7: box + antennas
//   <Router variant="rack" x={500} y={400} scale={0.6}/> // Scenes 8–9: network router
//
// `active` (0 → 1) lights it up in the network accent — use it when the
// envelope arrives at this router.

type RouterProps = {
  x: number;
  y: number;
  variant?: "home" | "rack";
  scale?: number;
  active?: number;
  // Offset the blink pattern so neighbouring routers don't blink in sync.
  seed?: number;
};

const Led: React.FC<{ cx: number; cy: number; on: boolean; color?: string }> = ({
  cx,
  cy,
  on,
  color = "#7CE07C",
}) => <Shape d={circ(cx, cy, 6)} fill={on ? color : COLORS.metalShade} strokeWidth={2.5} />;

const blink = (frame: number, period: number, phase: number) =>
  Math.floor((frame + phase) / period) % 2 === 0;

const Glow: React.FC<{ w: number; h: number; cy: number; active: number }> = ({ w, h, cy, active }) =>
  active > 0.01 ? (
    <ellipse
      cx={0}
      cy={cy}
      rx={w * 0.75}
      ry={h * 0.85}
      fill={COLORS.network}
      opacity={0.35 * active}
    />
  ) : null;

const HomeRouter: React.FC<{ frame: number; seed: number; active: number }> = ({ frame, seed, active }) => {
  const W = 260;
  const H = 70;
  return (
    <g>
      <Glow w={W} h={H + 60} cy={-H / 2 - 30} active={active} />
      {/* Antennas */}
      <Limb x1={-80} y1={-H + 6} x2={-104} y2={-H - 96} width={12} color={COLORS.chair} outline={OUTLINE_THIN} />
      <Limb x1={80} y1={-H + 6} x2={104} y2={-H - 96} width={12} color={COLORS.chair} outline={OUTLINE_THIN} />
      {/* Feet */}
      <Shape d={rr(-W / 2 + 20, -8, 36, 12, 4)} fill={COLORS.chairShade} strokeWidth={OUTLINE_THIN} />
      <Shape d={rr(W / 2 - 56, -8, 36, 12, 4)} fill={COLORS.chairShade} strokeWidth={OUTLINE_THIN} />
      {/* Body */}
      <Shape
        d={rr(-W / 2, -H - 4, W, H, 16)}
        fill={COLORS.white}
        shade={<rect x={-W / 2} y={-26} width={W} height={30} fill={COLORS.backgroundShade} />}
      />
      {/* Front lights */}
      {[0, 1, 2, 3].map((i) => (
        <Led
          key={i}
          cx={-60 + i * 40}
          cy={-H / 2 - 4}
          on={i === 0 || blink(frame, 4 + i * 3, seed * 7 + i * 5) || active > 0.5}
          color={i === 0 ? "#7CE07C" : COLORS.network}
        />
      ))}
    </g>
  );
};

const RackRouter: React.FC<{ frame: number; seed: number; active: number }> = ({ frame, seed, active }) => {
  const W = 200;
  const U = 46; // one rack unit
  const H = U * 2 + 16;
  return (
    <g>
      <Glow w={W} h={H} cy={-H / 2} active={active} />
      <Shape
        d={rr(-W / 2, -H, W, H, 12)}
        fill={active > 0.5 ? COLORS.network : COLORS.chair}
        shade={<rect x={-W / 2} y={-14} width={W} height={14} fill={active > 0.5 ? COLORS.networkShade : COLORS.chairShade} />}
      />
      {[0, 1].map((u) => {
        const top = -H + 8 + u * U;
        return (
          <g key={u}>
            <Shape d={rr(-W / 2 + 12, top + 4, W - 24, U - 8, 6)} fill={COLORS.metal} strokeWidth={OUTLINE_THIN} />
            {/* Ports */}
            {[0, 1, 2, 3].map((p) => (
              <rect
                key={p}
                x={-W / 2 + 26 + p * 26}
                y={top + 14}
                width={16}
                height={U - 28}
                rx={2}
                fill={COLORS.ink}
              />
            ))}
            <Led cx={W / 2 - 50} cy={top + U / 2} on={blink(frame, 5 + u * 2, seed * 11 + u * 3)} />
            <Led cx={W / 2 - 28} cy={top + U / 2} on={blink(frame, 7 + u, seed * 5 + u * 9)} color={COLORS.network} />
          </g>
        );
      })}
    </g>
  );
};

export const Router: React.FC<RouterProps> = ({
  x,
  y,
  variant = "rack",
  scale = 1,
  active = 0,
  seed = 0,
}) => {
  const frame = useCurrentFrame();
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {variant === "home" ? (
        <HomeRouter frame={frame} seed={seed} active={active} />
      ) : (
        <RackRouter frame={frame} seed={seed} active={active} />
      )}
    </g>
  );
};

// Heights (unscaled) — handy for placing a Bubble on top of a router.
export const ROUTER_HEIGHT = { home: 170, rack: 108 } as const;
