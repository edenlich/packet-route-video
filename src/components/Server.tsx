import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, FONT, OUTLINE_THIN } from "../theme";
import { Shape, circ, rr } from "./Shape";

// Servers. (x, y) is the bottom-centre of the tower.
//
//   <Server variant="dns" x={1500} y={700} bookFlip={t} />  // Scene 6
//   <Server variant="web" x={1600} y={700} />               // Scene 9: "moodle.com"
//
// DNS: a tower with an address-book icon and the label "DNS". Animate
// `bookFlip` 0 → 1 to flip through the book's pages (several flips per unit).
// Web: a server rack labelled "moodle.com" in plain text (no logo).

type ServerProps = {
  x: number;
  y: number;
  variant: "dns" | "web";
  scale?: number;
  bookFlip?: number;
  label?: string;
  active?: number;
};

const W = 240;
const H = 340;

const Tower: React.FC<{ frame: number; label: string; active: number; children?: React.ReactNode }> = ({
  frame,
  label,
  active,
  children,
}) => (
  <g>
    {active > 0.01 ? (
      <ellipse cx={0} cy={-H / 2} rx={W * 0.8} ry={H * 0.65} fill={COLORS.network} opacity={0.3 * active} />
    ) : null}
    <Shape
      d={rr(-W / 2, -H, W, H, 18)}
      fill={COLORS.chair}
      shade={<rect x={W / 2 - 34} y={-H} width={34} height={H} fill={COLORS.chairShade} />}
    />
    {/* Label plate */}
    <Shape d={rr(-W / 2 + 20, -H + 20, W - 40, 56, 10)} fill={COLORS.white} strokeWidth={OUTLINE_THIN} />
    <text
      x={0}
      y={-H + 50}
      textAnchor="middle"
      dominantBaseline="middle"
      fontFamily={FONT}
      fontWeight={600}
      fontSize={label.length > 6 ? 32 : 38}
      fill={COLORS.ink}
    >
      {label}
    </text>
    {children}
    {/* Drive bays with blinking lights */}
    {[0, 1, 2].map((i) => {
      const top = -110 + i * 32;
      const on = Math.floor((frame + i * 7) / (5 + i * 2)) % 2 === 0;
      return (
        <g key={i}>
          <Shape d={rr(-W / 2 + 20, top, W - 40, 24, 5)} fill={COLORS.metal} strokeWidth={OUTLINE_THIN} />
          <Shape d={circ(W / 2 - 40, top + 12, 5)} fill={on ? "#7CE07C" : COLORS.metalShade} strokeWidth={2} />
        </g>
      );
    })}
  </g>
);

// Open address book; `flip` animates a page turning over the spine.
const AddressBook: React.FC<{ flip: number }> = ({ flip }) => {
  const bw = 70; // one page width
  const bh = 90;
  const cy = -H + 100 + bh / 2 + 10;
  const turns = flip * 4; // four page turns over the 0 → 1 range
  const p = turns - Math.floor(turns); // progress of the current turn
  const turning = flip > 0 && flip < 1;
  const pageScaleX = Math.cos(p * Math.PI); // 1 (right page) → -1 (left page)
  return (
    <g transform={`translate(0 ${cy})`}>
      <Shape d={rr(-bw - 6, -bh / 2 - 6, bw * 2 + 12, bh + 12, 8)} fill={COLORS.packet} strokeWidth={OUTLINE_THIN} />
      <Shape d={rr(-bw, -bh / 2, bw, bh, 4)} fill={COLORS.white} strokeWidth={OUTLINE_THIN} />
      <Shape d={rr(0, -bh / 2, bw, bh, 4)} fill={COLORS.white} strokeWidth={OUTLINE_THIN} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} stroke={COLORS.metal} strokeWidth={4} strokeLinecap="round">
          <line x1={-bw + 12} y1={-bh / 2 + 18 + i * 18} x2={-14} y2={-bh / 2 + 18 + i * 18} />
          <line x1={14} y1={-bh / 2 + 18 + i * 18} x2={bw - 12} y2={-bh / 2 + 18 + i * 18} />
        </g>
      ))}
      {turning ? (
        <g transform={`scale(${pageScaleX} 1)`}>
          <Shape
            d={rr(0, -bh / 2, bw, bh, 4)}
            fill={pageScaleX < 0 ? COLORS.backgroundShade : COLORS.white}
            strokeWidth={OUTLINE_THIN}
          />
        </g>
      ) : null}
    </g>
  );
};

export const Server: React.FC<ServerProps> = ({
  x,
  y,
  variant,
  scale = 1,
  bookFlip = 0,
  label,
  active = 0,
}) => {
  const frame = useCurrentFrame();
  const text = label ?? (variant === "dns" ? "DNS" : "moodle.com");
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <Tower frame={frame} label={text} active={active}>
        {variant === "dns" ? (
          <AddressBook flip={bookFlip} />
        ) : (
          // Web server: a few "page" lines on a small screen
          <g>
            <Shape d={rr(-W / 2 + 20, -H + 96, W - 40, 110, 8)} fill={COLORS.screenGlow} strokeWidth={OUTLINE_THIN} />
            {[0, 1, 2].map((i) => (
              <rect
                key={i}
                x={-W / 2 + 40}
                y={-H + 116 + i * 28}
                width={[150, 110, 130][i]}
                height={12}
                rx={6}
                fill={COLORS.network}
              />
            ))}
          </g>
        )}
      </Tower>
    </g>
  );
};

export const SERVER_SIZE = { width: W, height: H } as const;
