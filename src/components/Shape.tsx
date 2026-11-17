import React, { useId } from "react";
import { COLORS, OUTLINE } from "../theme";

// Path helpers so drawings can share one "fill + cel shade + outline" recipe.

export const rr = (x: number, y: number, w: number, h: number, r: number) => {
  const k = Math.min(r, w / 2, h / 2);
  return [
    `M ${x + k} ${y}`,
    `H ${x + w - k}`,
    `A ${k} ${k} 0 0 1 ${x + w} ${y + k}`,
    `V ${y + h - k}`,
    `A ${k} ${k} 0 0 1 ${x + w - k} ${y + h}`,
    `H ${x + k}`,
    `A ${k} ${k} 0 0 1 ${x} ${y + h - k}`,
    `V ${y + k}`,
    `A ${k} ${k} 0 0 1 ${x + k} ${y}`,
    "Z",
  ].join(" ");
};

export const circ = (cx: number, cy: number, r: number) =>
  `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;

const useSafeId = () => `s${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

type ShapeProps = {
  d: string;
  fill: string;
  // Extra shapes drawn inside (clipped to) this shape — the cel shadow.
  shade?: React.ReactNode;
  outline?: boolean;
  strokeWidth?: number;
  opacity?: number;
};

// A flat shape: fill, clipped shadow on top, then the dark outline.
export const Shape: React.FC<ShapeProps> = ({
  d,
  fill,
  shade,
  outline = true,
  strokeWidth = OUTLINE,
  opacity,
}) => {
  const id = useSafeId();
  return (
    <g opacity={opacity}>
      <path d={d} fill={fill} />
      {shade ? (
        <>
          <clipPath id={id}>
            <path d={d} />
          </clipPath>
          <g clipPath={`url(#${id})`}>{shade}</g>
        </>
      ) : null}
      {outline ? (
        <path
          d={d}
          fill="none"
          stroke={COLORS.ink}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
    </g>
  );
};

// A rounded "tube" (arm, leg, cable) between two points, outlined.
export const Limb: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  color: string;
  outline?: number;
}> = ({ x1, y1, x2, y2, width, color, outline = OUTLINE }) => (
  <g strokeLinecap="round">
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={COLORS.ink} strokeWidth={width + outline * 2} />
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} />
  </g>
);

// Polyline version of Limb (e.g. shoulder → elbow → hand).
export const LimbPath: React.FC<{
  points: [number, number][];
  width: number;
  color: string;
  outline?: number;
}> = ({ points, width, color, outline = OUTLINE }) => {
  const d = points.map(([px, py], i) => `${i === 0 ? "M" : "L"} ${px} ${py}`).join(" ");
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={COLORS.ink} strokeWidth={width + outline * 2} />
      <path d={d} stroke={color} strokeWidth={width} />
    </g>
  );
};
