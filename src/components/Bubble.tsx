import React from "react";
import { COLORS, FONT, OUTLINE } from "../theme";
import { rr } from "./Shape";

// Cartoon speech bubble. (x, y) is the TIP of the tail — put it on the
// speaker's mouth / the router's top. The bubble body sits above the tip.
//
// `pop` (0 → 1) scales the bubble out of its tail tip; drive it with spring():
//   const pop = spring({ frame: frame - 20, fps, config: { damping: 12 } });
//   <Bubble x={500} y={300} text="Row 3, seat 5!" pop={pop} />
//
// Multi-line: put "\n" in `text`. Width is estimated from the text; pass
// `width` to override.

type BubbleProps = {
  x: number;
  y: number;
  text: string;
  pop?: number;
  fontSize?: number;
  width?: number;
  // Where the tail sits under the body.
  tail?: "left" | "center" | "right";
  fill?: string;
  textColor?: string;
};

export const Bubble: React.FC<BubbleProps> = ({
  x,
  y,
  text,
  pop = 1,
  fontSize = 40,
  width,
  tail = "left",
  fill = COLORS.white,
  textColor = COLORS.ink,
}) => {
  if (pop <= 0.001) return null;

  const lines = text.split("\n");
  const lineH = fontSize * 1.2;
  const padX = fontSize * 0.8;
  const padY = fontSize * 0.55;
  const longest = Math.max(...lines.map((l) => l.length));
  const W = width ?? longest * fontSize * 0.56 + padX * 2;
  const H = lines.length * lineH + padY * 2;
  const tailH = fontSize * 0.9;

  // Body placement relative to the tail tip (0, 0).
  const tailX = tail === "left" ? -W * 0.28 : tail === "right" ? W * 0.28 : 0;
  const bx = -W / 2 - tailX;
  const by = -tailH - H;
  const tw = fontSize * 0.7; // tail base width

  const body = rr(bx, by, W, H, Math.min(H / 2, fontSize * 0.9));
  const tailPath = `M ${-tw / 2} ${-tailH - 2} L 0 0 L ${tw / 2} ${-tailH - 2} Z`;

  return (
    <g transform={`translate(${x} ${y}) scale(${pop})`}>
      {/* Outline pass (body + tail together so they read as one shape) */}
      <g stroke={COLORS.ink} strokeWidth={OUTLINE * 2} strokeLinejoin="round" fill={COLORS.ink}>
        <path d={body} />
        <path d={tailPath} />
      </g>
      {/* Fill pass */}
      <path d={body} fill={fill} />
      <path d={tailPath} fill={fill} />

      {lines.map((line, i) => (
        <text
          key={i}
          x={bx + W / 2}
          y={by + padY + lineH * (i + 0.5) + fontSize * 0.04}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={FONT}
          fontWeight={600}
          fontSize={fontSize}
          fill={textColor}
        >
          {line}
        </text>
      ))}
    </g>
  );
};
