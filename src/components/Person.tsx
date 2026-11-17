import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { LimbPath, Shape, circ, rr } from "./Shape";

// The person on an office chair. Local origin (0, 0) = floor point under the
// chair's center; the drawing is ~640 units tall at scale 1.

type PersonProps = {
  x: number;
  y: number;
  scale?: number;
};

// Slow breathing: shoulders/head rise a couple of units.
const useBreath = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return Math.sin((frame / fps) * Math.PI * 0.5) * 2.5;
};

// Office chair seen from behind: casters, base, gas lift, seat.
// The backrest is drawn separately so it can sit in front of the body.
const ChairBaseBack: React.FC = () => (
  <g>
    {[-112, -56, 56, 112].map((cx) => (
      <Shape key={cx} d={circ(cx, -18, 16)} fill={COLORS.chairShade} />
    ))}
    <Shape
      d={rr(-130, -56, 260, 26, 13)}
      fill={COLORS.chair}
      shade={<rect x={-130} y={-40} width={260} height={20} fill={COLORS.chairShade} />}
    />
    <Shape
      d={rr(-15, -160, 30, 110, 8)}
      fill={COLORS.metal}
      shade={<rect x={3} y={-160} width={14} height={110} fill={COLORS.metalShade} />}
    />
    <Shape
      d={rr(-140, -196, 280, 44, 20)}
      fill={COLORS.chair}
      shade={<rect x={-140} y={-170} width={280} height={30} fill={COLORS.chairShade} />}
    />
  </g>
);

const ChairBackrest: React.FC = () => (
  <g>
    <Shape d={rr(-14, -240, 28, 60, 6)} fill={COLORS.chairShade} />
    <Shape
      d={rr(-118, -360, 236, 140, 46)}
      fill={COLORS.chair}
      shade={
        <>
          <rect x={-118} y={-262} width={236} height={60} fill={COLORS.chairShade} />
          <rect x={72} y={-360} width={60} height={160} fill={COLORS.chairShade} />
        </>
      }
    />
  </g>
);

const BackView: React.FC<{ breath: number }> = ({ breath }) => {
  const b = -breath; // up is negative y
  return (
    <g>
      <ChairBaseBack />

      {/* Arms: from the shoulders down and forward to the desk (hidden in front). */}
      <LimbPath
        points={[
          [-98, -400 + b],
          [-132, -300],
          [-108, -258],
        ]}
        width={42}
        color={COLORS.shirt}
      />
      <LimbPath
        points={[
          [98, -400 + b],
          [132, -300],
          [108, -258],
        ]}
        width={42}
        color={COLORS.shirt}
      />

      {/* Torso (back of the shirt). */}
      <Shape
        d={rr(-108, -440 + b, 216, 260 - b, 64)}
        fill={COLORS.shirt}
        shade={
          <>
            <rect x={44} y={-460} width={80} height={300} fill={COLORS.shirtShade} />
            <rect x={-2} y={-410 + b} width={4} height={120} fill={COLORS.shirtShade} />
          </>
        }
      />

      <ChairBackrest />

      {/* Neck. */}
      <Shape
        d={rr(-26, -478 + b, 52, 56, 12)}
        fill={COLORS.skin}
        shade={<rect x={-26} y={-440 + b} width={52} height={20} fill={COLORS.skinShade} />}
      />

      {/* Ears (behind the head). */}
      <Shape d={circ(-86, -548 + b, 19)} fill={COLORS.skin} />
      <Shape d={circ(86, -548 + b, 19)} fill={COLORS.skin} />

      {/* Head: skin, then hair covering everything but the nape. */}
      <Shape
        d={circ(0, -556 + b, 88)}
        fill={COLORS.skin}
        shade={
          <>
            <path
              d={`M -100 ${-520 + b} Q 0 ${-470 + b} 100 ${-520 + b} L 100 ${-420 + b} L -100 ${-420 + b} Z`}
              fill={COLORS.skin}
            />
            {/* Hair: a big cap that stops in a soft wave above the nape. */}
            <path
              d={`M -110 ${-700 + b} L 110 ${-700 + b} L 110 ${-520 + b}
                 Q 60 ${-492 + b} 30 ${-508 + b} Q 0 ${-490 + b} -30 ${-508 + b}
                 Q -60 ${-492 + b} -110 ${-520 + b} Z`}
              fill={COLORS.hair}
            />
            {/* Hair shadow on the right side. */}
            <path
              d={`M 40 ${-700 + b} Q 80 ${-600 + b} 50 ${-505 + b} L 110 ${-505 + b} L 110 ${-700 + b} Z`}
              fill={COLORS.hairShade}
            />
            {/* Little highlight swoosh, top-left. */}
            <path
              d={`M -52 ${-612 + b} Q -30 ${-628 + b} -6 ${-622 + b}`}
              stroke={COLORS.hairShade}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
            />
          </>
        }
      />
    </g>
  );
};

export const Person: React.FC<PersonProps> = ({ x, y, scale = 1 }) => {
  const breath = useBreath();
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <BackView breath={breath} />
    </g>
  );
};
