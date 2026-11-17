import React from "react";
import { COLORS, FONT, OUTLINE_THIN } from "../theme";
import { Shape, circ, rr } from "./Shape";

// The request packet: an envelope with an address label.
// Drawn centered on (x, y); unscaled size is 220 × 150.
//
// Label flip (Scene 6): animate `flip` 0 → 1. The label squashes vertically
// like a card turning over; it shows `from` before the halfway point and `to`
// after it.
//
//   <Envelope x={960} y={540} flip={t} />            // moodle.com → 203.0.113.7
//   <Envelope x={960} y={540} question />            // "?" badge next to the label
//   <Envelope x={960} y={540} variant="reply" to="" from="moodle.com page" />

export const NAME_LABEL = "moodle.com";
export const IP_LABEL = "203.0.113.7";

export const ENVELOPE_SIZE = { width: 220, height: 150 } as const;

type EnvelopeProps = {
  x: number;
  y: number;
  scale?: number;
  rotate?: number; // degrees
  // 0 = shows `from`, 1 = shows `to`. Values in between animate the flip.
  flip?: number;
  from?: string;
  to?: string;
  // Small "?" badge to the right of the label (Scene 6, before the DNS lookup).
  question?: boolean;
  // "request" = orange packet colour; "reply" = the return envelope (Scene 9).
  variant?: "request" | "reply";
  opacity?: number;
};

export const Envelope: React.FC<EnvelopeProps> = ({
  x,
  y,
  scale = 1,
  rotate = 0,
  flip = 0,
  from = NAME_LABEL,
  to = IP_LABEL,
  question = false,
  variant = "request",
  opacity,
}) => {
  const W = ENVELOPE_SIZE.width;
  const H = ENVELOPE_SIZE.height;
  const fill = variant === "request" ? COLORS.packet : COLORS.reply;
  const shade = variant === "request" ? COLORS.packetShade : COLORS.replyShade;

  const f = Math.min(1, Math.max(0, flip));
  const labelScaleY = Math.max(0.02, Math.abs(Math.cos(f * Math.PI)));
  const text = f < 0.5 ? from : to;
  const labelW = 170;
  const labelH = 44;
  const labelY = 22; // label centre, relative to envelope centre

  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}
      opacity={opacity}
    >
      {/* Body */}
      <Shape
        d={rr(-W / 2, -H / 2, W, H, 14)}
        fill={fill}
        shade={<rect x={-W / 2} y={H / 2 - 22} width={W} height={22} fill={shade} />}
      />
      {/* Flap (closed): a V from the top corners */}
      <path
        d={`M ${-W / 2 + 8} ${-H / 2 + 6} L 0 ${-H / 2 + 62} L ${W / 2 - 8} ${-H / 2 + 6}`}
        fill="none"
        stroke={COLORS.ink}
        strokeWidth={OUTLINE_THIN}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Address label — flips around its horizontal axis */}
      <g transform={`translate(0 ${labelY}) scale(1 ${labelScaleY})`}>
        <Shape
          d={rr(-labelW / 2, -labelH / 2, labelW, labelH, 8)}
          fill={COLORS.white}
          strokeWidth={OUTLINE_THIN}
          shade={
            f > 0.02 && f < 0.98 ? (
              <rect x={-labelW / 2} y={-labelH / 2} width={labelW} height={labelH} fill={COLORS.backgroundShade} />
            ) : null
          }
        />
        <text
          x={0}
          y={1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={FONT}
          fontWeight={600}
          fontSize={text.length > 11 ? 23 : 26}
          fill={COLORS.ink}
        >
          {text}
        </text>
      </g>

      {question ? (
        <g transform={`translate(${labelW / 2 + 26} ${labelY})`}>
          <Shape d={circ(0, 0, 20)} fill={COLORS.white} strokeWidth={OUTLINE_THIN} />
          <text
            x={0}
            y={2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily={FONT}
            fontWeight={600}
            fontSize={28}
            fill={COLORS.ink}
          >
            ?
          </text>
        </g>
      ) : null}
    </g>
  );
};
