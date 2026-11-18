import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { LimbPath, Shape, circ, rr } from "./Shape";

// The person on an office chair. Local origin (0, 0) = floor point under the
// chair's center; the drawing is ~640 units tall at scale 1.

type Point = [number, number];

type PersonProps = {
  x: number;
  y: number;
  scale?: number;
  // "back" = seen from behind; "side" = profile facing right (+x), for the
  // 3/4 view over the shoulder.
  view?: "back" | "side";
  // Side view only: where the near / far hands rest, in LOCAL coordinates
  // (origin = floor under the chair, unscaled). The arms bend to reach them.
  nearHand?: Point;
  farHand?: Point;
  // Side view only: head tilt in degrees around the neck (+ = nod down/forward).
  nod?: number;
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

// ---------- Side view (profile, facing right) ----------

const UPPER_ARM = 132;
const FOREARM = 136;

// Two-bone arm: find the elbow so both segments keep their length,
// bending downward (elbow below the shoulder→hand line).
const solveElbow = (s: Point, h: Point): Point => {
  const dx = h[0] - s[0];
  const dy = h[1] - s[1];
  const dist = Math.min(Math.hypot(dx, dy), UPPER_ARM + FOREARM - 1);
  const a = Math.acos(
    Math.max(-1, Math.min(1, (UPPER_ARM ** 2 + dist ** 2 - FOREARM ** 2) / (2 * UPPER_ARM * dist))),
  );
  const base = Math.atan2(dy, dx);
  const ang = base + a; // + = elbow swings down (y grows downward)
  return [s[0] + Math.cos(ang) * UPPER_ARM, s[1] + Math.sin(ang) * UPPER_ARM];
};

const Arm: React.FC<{ shoulder: Point; hand: Point; far?: boolean }> = ({ shoulder, hand, far }) => {
  const elbow = solveElbow(shoulder, hand);
  return (
    <g>
      <LimbPath points={[shoulder, elbow]} width={44} color={far ? COLORS.shirtShade : COLORS.shirt} />
      <LimbPath points={[elbow, hand]} width={34} color={far ? COLORS.skinShade : COLORS.skin} />
      {/* Sleeve cuff over the elbow joint. */}
      <Shape d={circ(elbow[0], elbow[1], 24)} fill={far ? COLORS.shirtShade : COLORS.shirt} strokeWidth={3} />
      <Shape d={circ(hand[0], hand[1], 22)} fill={far ? COLORS.skinShade : COLORS.skin} />
    </g>
  );
};

const ChairSide: React.FC = () => (
  <g>
    {[-95, 0, 95].map((cx) => (
      <Shape key={cx} d={circ(cx, -18, 16)} fill={COLORS.chairShade} />
    ))}
    <Shape d={rr(-120, -56, 240, 24, 12)} fill={COLORS.chair} />
    <Shape
      d={rr(-15, -175, 30, 125, 8)}
      fill={COLORS.metal}
      shade={<rect x={3} y={-180} width={14} height={130} fill={COLORS.metalShade} />}
    />
    {/* Backrest post + backrest (behind the person). */}
    <LimbPath
      points={[
        [-100, -190],
        [-140, -200],
        [-150, -280],
      ]}
      width={20}
      color={COLORS.chairShade}
    />
    <g transform="rotate(-8 -150 -340)">
      <Shape
        d={rr(-185, -500, 66, 250, 30)}
        fill={COLORS.chair}
        shade={<rect x={-145} y={-510} width={40} height={270} fill={COLORS.chairShade} />}
      />
    </g>
    <Shape
      d={rr(-125, -210, 260, 42, 20)}
      fill={COLORS.chair}
      shade={<rect x={-125} y={-186} width={260} height={30} fill={COLORS.chairShade} />}
    />
  </g>
);

const SideView: React.FC<{ breath: number; nearHand: Point; farHand: Point; nod: number }> = ({
  breath,
  nearHand,
  farHand,
  nod,
}) => {
  const b = -breath;
  const shoulder: Point = [10, -430 + b];
  const head: Point = [62, -568 + b];
  return (
    <g>
      {/* Far arm (behind the body). */}
      <Arm shoulder={[shoulder[0] + 14, shoulder[1] + 4]} hand={farHand} far />

      <ChairSide />

      {/* Legs: thigh forward along the seat, shin down, shoe. */}
      <LimbPath
        points={[
          [-40, -228],
          [150, -222],
          [165, -40],
        ]}
        width={72}
        color={COLORS.pants}
      />
      <Shape
        d={rr(130, -48, 110, 42, 20)}
        fill={COLORS.shoe}
        shade={<rect x={130} y={-22} width={110} height={20} fill={COLORS.ink} opacity={0.35} />}
      />

      {/* Torso, leaning a little toward the screen. */}
      <g transform={`rotate(10 -20 -215)`}>
        <Shape
          d={rr(-95, -455 + b, 160, 262 - b, 62)}
          fill={COLORS.shirt}
          shade={<rect x={-110} y={-470} width={60} height={300} fill={COLORS.shirtShade} />}
        />
      </g>

      {/* Neck + head, tilted together around the base of the neck (nod). */}
      <g transform={`rotate(${nod} 39 ${-452 + b})`}>
      <Shape
        d={rr(18, -508 + b, 42, 60, 12)}
        fill={COLORS.skin}
        shade={<rect x={18} y={-508 + b} width={16} height={60} fill={COLORS.skinShade} />}
      />

      {/* Head: profile, dot eye, rosy cheek, hair cap toward the back. */}
      <Shape
        d={circ(head[0], head[1], 84)}
        fill={COLORS.skin}
        shade={
          <>
            {/* Screen light on the face (front edge). */}
            <path
              d={`M ${head[0] + 60} ${head[1] - 90} Q ${head[0] + 110} ${head[1]} ${head[0] + 60} ${head[1] + 90} L ${head[0] + 120} ${head[1] + 90} L ${head[0] + 120} ${head[1] - 90} Z`}
              fill={COLORS.screenGlow}
              opacity={0.55}
            />
            {/* Jaw shadow. */}
            <rect x={head[0] - 90} y={head[1] + 52} width={180} height={40} fill={COLORS.skinShade} />
            {/* Hair: back and top, with a fringe that stops above the eye. */}
            <path
              d={`M ${head[0] - 100} ${head[1] - 100} L ${head[0] + 100} ${head[1] - 100}
                 L ${head[0] + 100} ${head[1] - 46}
                 Q ${head[0] + 60} ${head[1] - 30} ${head[0] + 30} ${head[1] - 48}
                 Q ${head[0] + 5} ${head[1] - 20} ${head[0] - 18} ${head[1] - 10}
                 Q ${head[0] - 30} ${head[1] + 40} ${head[0] - 40} ${head[1] + 60}
                 L ${head[0] - 100} ${head[1] + 60} Z`}
              fill={COLORS.hair}
            />
            <path
              d={`M ${head[0] - 100} ${head[1] - 20} Q ${head[0] - 50} ${head[1] + 10} ${head[0] - 60} ${head[1] + 70} L ${head[0] - 100} ${head[1] + 70} Z`}
              fill={COLORS.hairShade}
            />
          </>
        }
      />
      {/* Ear. */}
      <Shape d={circ(head[0] - 8, head[1] + 6, 17)} fill={COLORS.skin} strokeWidth={3} />
      {/* Eye + cheek. */}
      <circle cx={head[0] + 52} cy={head[1] + 4} r={8} fill={COLORS.ink} />
      <circle cx={head[0] + 46} cy={head[1] + 34} r={13} fill={COLORS.packet} opacity={0.35} />
      </g>

      {/* Near arm (in front of the body). */}
      <Arm shoulder={shoulder} hand={nearHand} />
    </g>
  );
};

export const Person: React.FC<PersonProps> = ({
  x,
  y,
  scale = 1,
  view = "back",
  nearHand = [250, -390],
  farHand = [280, -400],
  nod = 0,
}) => {
  const breath = useBreath();
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {view === "back" ? (
        <BackView breath={breath} />
      ) : (
        <SideView breath={breath} nearHand={nearHand} farHand={farHand} nod={nod} />
      )}
    </g>
  );
};
