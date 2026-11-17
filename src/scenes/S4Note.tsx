import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Bubble } from "../components/Bubble";
import { Camera, Shot, easedMove, mixShots } from "../components/Camera";
import { LimbPath, Shape, circ, rr } from "../components/Shape";
import { COLORS, FONT, OUTLINE, OUTLINE_THIN } from "../theme";

// Scene 4 — The note. A lecture hall seen from behind the back row.
// A student folds a note, taps the one in front ("Row 3, seat 5!"), and the
// note hops forward row by row, then sideways along row 3 into seat 5's hands.
//
// Narration public/audio/s4.wav is 8.77s. Measured pauses (silencedetect):
//   0.00–2.03s  "Think of passing a note in a lecture hall."      (f 0–61)
//   2.64–4.66s  "Nobody knows who's in row 3,"                    (f 79–140)
//   4.86–5.59s  "seat 5 —"                                       (f 146–168)
//   6.09–8.64s  "each person just passes it one row closer."     (f 183–259)
// 8.77s + 0.5s tail = 279 frames @ 30fps — enough, the note lands at f 252.
export const S4_DURATION = 279;

type P = [number, number];
type Seat = [number, number]; // [row, seat]

// ---------- Hall geometry (fake perspective: back rows bigger, lower) ----------

const ROWS = 6;
const SEATS = 6;
const rowScale = (r: number) => 0.78 + 0.05 * r;
const rowY = (r: number) => 60 + r * 165; // shoulder line of row r
const seatX = (r: number, c: number) => 1060 + (c - 3) * 250 * rowScale(r);

// The hero sits next to the aisle so the row signs stay in shot as the note travels.
const HERO: Seat = [6, 2];
const TARGET: Seat = [3, 5];
const same = (a: Seat, b: Seat) => a[0] === b[0] && a[1] === b[1];

// Hand poses in world space.
const pHold = ([r, c]: Seat): P => [seatX(r, c) + 70 * rowScale(r), rowY(r) - 30 * rowScale(r)];
const pFwd = ([r, c]: Seat): P => [seatX(r, c) + 40 * rowScale(r), rowY(r) - 125 * rowScale(r)];
const pRight = ([r, c]: Seat): P => [seatX(r, c) + 125 * rowScale(r), rowY(r) - 45 * rowScale(r)];
const pLeft = ([r, c]: Seat): P => [seatX(r, c) - 80 * rowScale(r), rowY(r) - 45 * rowScale(r)];
const pUp = ([r, c]: Seat): P => [seatX(r, c) + 60 * rowScale(r), rowY(r) - 150 * rowScale(r)];
const pRest = ([r, c]: Seat): P => [seatX(r, c) + 55 * rowScale(r), rowY(r) + 90 * rowScale(r)];

// ---------- The note's journey ----------

type Seg =
  | { kind: "hold"; who: Seat; start: number; end: number; from: P; to: P }
  | { kind: "fly"; passer: Seat; receiver: Seat; start: number; end: number; from: P; to: P; arc: number };

const S52: Seat = [5, 2];
const S42: Seat = [4, 2];
const S32: Seat = [3, 2];
const S33: Seat = [3, 3];
const S34: Seat = [3, 4];

const SEGS: Seg[] = [
  { kind: "hold", who: HERO, start: 0, end: 122, from: pHold(HERO), to: pHold(HERO) },
  { kind: "hold", who: HERO, start: 122, end: 140, from: pHold(HERO), to: pFwd(HERO) },
  // Forward, one row at a time.
  { kind: "fly", passer: HERO, receiver: S52, start: 140, end: 160, from: pFwd(HERO), to: pHold(S52), arc: 70 },
  { kind: "hold", who: S52, start: 160, end: 168, from: pHold(S52), to: pFwd(S52) },
  { kind: "fly", passer: S52, receiver: S42, start: 168, end: 186, from: pFwd(S52), to: pHold(S42), arc: 60 },
  { kind: "hold", who: S42, start: 186, end: 193, from: pHold(S42), to: pFwd(S42) },
  { kind: "fly", passer: S42, receiver: S32, start: 193, end: 211, from: pFwd(S42), to: pHold(S32), arc: 55 },
  // Row 3: quick zip sideways, seat 2 → 3 → 4 → 5.
  { kind: "hold", who: S32, start: 211, end: 216, from: pHold(S32), to: pRight(S32) },
  { kind: "fly", passer: S32, receiver: S33, start: 216, end: 226, from: pRight(S32), to: pLeft(S33), arc: 45 },
  { kind: "hold", who: S33, start: 226, end: 229, from: pLeft(S33), to: pRight(S33) },
  { kind: "fly", passer: S33, receiver: S34, start: 229, end: 239, from: pRight(S33), to: pLeft(S34), arc: 45 },
  { kind: "hold", who: S34, start: 239, end: 242, from: pLeft(S34), to: pRight(S34) },
  { kind: "fly", passer: S34, receiver: TARGET, start: 242, end: 252, from: pRight(S34), to: pLeft(TARGET), arc: 45 },
  { kind: "hold", who: TARGET, start: 252, end: 266, from: pLeft(TARGET), to: pUp(TARGET) },
  { kind: "hold", who: TARGET, start: 266, end: 9999, from: pUp(TARGET), to: pUp(TARGET) },
];
const LAND = 252;

const ease = (f: number, a: number, b: number, e = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const segAt = (f: number) => SEGS.find((s) => f >= s.start && f < s.end) ?? SEGS[SEGS.length - 1];

const noteAt = (f: number): { p: P; rot: number } => {
  const s = segAt(f);
  const t = ease(f, s.start, s.end);
  const p = lerp(s.from, s.to, t);
  if (s.kind === "fly") {
    const lift = Math.sin(Math.PI * t) * s.arc;
    return { p: [p[0], p[1] - lift], rot: Math.sin(Math.PI * 2 * t) * 25 };
  }
  return { p, rot: 0 };
};

// Where (if anywhere) this student's passing hand is.
const handFor = (seat: Seat, f: number): P | null => {
  const s = segAt(f);
  if (s.kind === "hold" && same(s.who, seat)) return noteAt(f).p;
  for (const g of SEGS) {
    if (g.kind !== "fly") continue;
    // Receiver reaches out just before and during the throw.
    if (same(g.receiver, seat) && f >= g.start - 10 && f < g.end) {
      return lerp(pRest(seat), g.to, ease(f, g.start - 10, g.start, Easing.out(Easing.cubic)));
    }
    // Passer lets go, then the hand sinks back behind the seat.
    if (same(g.passer, seat) && f >= g.start && f < g.start + 16) {
      return lerp(g.from, pRest(seat), ease(f, g.start + 2, g.start + 16));
    }
  }
  return null;
};

// ---------- Drawings ----------

// Background students stay muted so the hero (blue) and seat 5 (green) pop.
const SHIRTS = [COLORS.shirt, COLORS.wood, COLORS.pants, COLORS.metal, COLORS.woodShade];
const HAIRS = [COLORS.hair, COLORS.woodShade, COLORS.hairShade, "#8A5A3B"];
const pick = <T,>(arr: readonly T[], r: number, c: number, k: number) => arr[(r * 7 + c * 3 + k) % arr.length];

type StudentProps = {
  x: number;
  y: number;
  s: number;
  shirt: string;
  hair: string;
  style: "short" | "bun" | "pony";
  hand?: P | null; // world coords
  tapHand?: P | null; // world coords (left hand)
  turn?: number; // 0..1, head turns to look back over the left shoulder
  bob?: number; // vertical squash/bounce in local units
};

const Student: React.FC<StudentProps> = ({ x, y, s, shirt, hair, style, hand, tapHand, turn = 0, bob = 0 }) => {
  const toLocal = (p: P): P => [(p[0] - x) / s, (p[1] - y) / s];
  const hx = -22 * turn; // hair cap slides right as the face turns left
  const headY = -64 + bob;
  const arm = (shoulder: P, h: P) => (
    <g>
      <LimbPath points={[shoulder, toLocal(h)]} width={26} color={shirt} />
      <Shape d={circ(toLocal(h)[0], toLocal(h)[1], 15)} fill={COLORS.skin} strokeWidth={OUTLINE_THIN} />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* Torso (seen from behind). */}
      <Shape
        d={rr(-64, -10 + bob * 0.5, 128, 170, 56)}
        fill={shirt}
        shade={<rect x={30} y={-20} width={50} height={200} fill={COLORS.ink} opacity={0.18} />}
      />
      <Shape d={rr(-17, -36 + bob, 34, 36, 10)} fill={COLORS.skinShade} strokeWidth={OUTLINE_THIN} />
      {style === "bun" ? <Shape d={circ(0, headY - 50, 20)} fill={hair} /> : null}
      {/* Head: skin with a hair cap; when turning, the cap slides and a dot eye shows. */}
      <Shape
        d={circ(0, headY, 46)}
        fill={COLORS.skin}
        shade={
          <>
            <path
              d={`M ${-60 + hx} ${headY - 60} H 80 V ${headY + 22} L ${60 + hx} ${headY + 22} Q ${30 + hx} ${headY + 34} ${0 + hx} ${headY + 26} Q ${-30 + hx} ${headY + 34} ${-60 + hx} ${headY + 22} Z`}
              fill={hair}
            />
            <path d={`M ${22 + hx} ${headY - 60} Q ${44 + hx} ${headY} ${26 + hx} ${headY + 30} H 60 V ${headY - 60} Z`} fill={COLORS.ink} opacity={0.18} />
          </>
        }
      />
      {turn > 0.05 ? (
        <>
          <circle cx={-34 * turn} cy={headY + 8} r={5} fill={COLORS.ink} opacity={Math.min(1, turn * 2)} />
          <circle cx={-30 * turn} cy={headY + 26} r={8} fill={COLORS.packet} opacity={0.35 * turn} />
        </>
      ) : null}
      {style === "pony" ? (
        <g>
          <Shape d={`M -14 ${headY + 14} Q -26 ${headY + 70} 0 ${headY + 92} Q 26 ${headY + 70} 14 ${headY + 14} Z`} fill={hair} />
          <Shape d={circ(0, headY + 20, 9)} fill={COLORS.packet} strokeWidth={OUTLINE_THIN} />
        </g>
      ) : null}
      {hand ? arm([toLocal(hand)[0] < -20 ? -46 : 46, 14], hand) : null}
      {tapHand ? arm([-46, 14], tapHand) : null}
    </g>
  );
};

// Seat back of row r, with the writing desk of the row behind on top.
const Bench: React.FC<{ r: number; glowSeat?: number; glow?: number }> = ({ r, glowSeat, glow = 0 }) => {
  const s = rowScale(r);
  const y = rowY(r);
  const xL = seatX(r, 0.45);
  const xR = seatX(r, SEATS + 0.55);
  return (
    <g>
      <Shape
        d={rr(xL, y + 72 * s, xR - xL, 110 * s, 14 * s)}
        fill={COLORS.wood}
        shade={<rect x={xL} y={y + 150 * s} width={xR - xL} height={40 * s} fill={COLORS.woodShade} />}
      />
      <Shape
        d={rr(xL - 14 * s, y + 62 * s, xR - xL + 28 * s, 24 * s, 10 * s)}
        fill={COLORS.woodShade}
        strokeWidth={OUTLINE_THIN}
      />
      {/* Seat numbers on the seat backs. */}
      {Array.from({ length: SEATS }, (_, i) => i + 1).map((c) => {
        const hot = c === glowSeat ? glow : 0;
        // Sit between heads so the row behind doesn't hide them.
        const cx = seatX(r, c - 0.3);
        const k = 1 + hot * 0.35;
        return (
          <g key={c} transform={`translate(${cx} ${y + 124 * s}) scale(${s * k})`}>
            <Shape d={rr(-22, -18, 44, 36, 12)} fill={hot > 0.01 ? COLORS.packet : COLORS.background} strokeWidth={OUTLINE_THIN} />
            <text
              x={0}
              y={2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily={FONT}
              fontWeight={600}
              fontSize={26}
              fill={hot > 0.01 ? COLORS.white : COLORS.woodShade}
            >
              {c}
            </text>
          </g>
        );
      })}
    </g>
  );
};

// Row number sign on the aisle side.
const RowSign: React.FC<{ r: number; glow?: number }> = ({ r, glow = 0 }) => {
  const s = rowScale(r) * 1.25 * (1 + glow * 0.3);
  const x = seatX(r, 0.05);
  const y = rowY(r) + 70 * rowScale(r);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shape d={rr(-8, 0, 16, 110, 6)} fill={COLORS.metal} strokeWidth={OUTLINE_THIN} />
      <Shape
        d={rr(-52, -44, 104, 74, 18)}
        fill={glow > 0.01 ? COLORS.packet : COLORS.network}
        shade={<rect x={-52} y={14} width={104} height={20} fill={glow > 0.01 ? COLORS.packetShade : COLORS.networkShade} />}
      />
      <text x={0} y={-12} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontWeight={600} fontSize={18} fill={COLORS.white}>
        ROW
      </text>
      <text x={0} y={12} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontWeight={600} fontSize={30} fill={COLORS.white}>
        {r}
      </text>
    </g>
  );
};

const Hall: React.FC = () => (
  <g>
    {/* Front wall with a board (oversized so drift never shows an edge). */}
    <rect x={-800} y={-800} width={3520} height={940} fill={COLORS.wall} />
    <path d="M -800 -800 H 2720 V 40 Q 960 -40 -800 40 Z" fill={COLORS.wallShade} />
    <g transform="translate(0 -150)">
    <Shape d={rr(560, 20, 900, 200, 16)} fill={COLORS.wood} />
    <Shape d={rr(584, 40, 852, 160, 8)} fill={COLORS.chair} shade={<rect x={584} y={150} width={852} height={50} fill={COLORS.chairShade} />} />
    <path d="M 640 90 Q 700 70 760 95 T 880 90" stroke={COLORS.background} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.7} />
    <path d="M 640 130 H 820" stroke={COLORS.background} strokeWidth={5} strokeLinecap="round" opacity={0.6} />
    <Shape d={circ(1300, 115, 38)} fill="none" strokeWidth={5} />
    </g>
    {/* Floor of the tiered hall. */}
    <rect x={-800} y={130} width={3520} height={1900} fill={COLORS.backgroundShade} />
    <Shape d={rr(-800, 124, 3520, 14, 0)} fill={COLORS.background} strokeWidth={OUTLINE_THIN} />
    {/* Side wall on the right, following the tiers. */}
    <Shape
      d={`M ${seatX(0, 6.75)} 130 L ${seatX(8, 6.75)} ${rowY(8)} L 3200 ${rowY(8)} L 3200 130 Z`}
      fill={COLORS.wall}
      shade={<path d={`M ${seatX(0, 7.3)} 130 L ${seatX(8, 7.3)} ${rowY(8)} L 3200 ${rowY(8)} L 3200 130 Z`} fill={COLORS.wallShade} />}
    />
    {/* Aisle stairs on the left. */}
    {Array.from({ length: ROWS + 1 }, (_, i) => i + 1).map((r) => {
      const y = rowY(r) + 190 * rowScale(r);
      return (
        <g key={r}>
          <Shape d={rr(-800, y - 20, seatX(r, 0.3) + 800, 40, 0)} fill={COLORS.wallShade} strokeWidth={OUTLINE_THIN} />
        </g>
      );
    })}
  </g>
);

const NoteShape: React.FC<{ p: P; rot: number; fold: number; scale?: number }> = ({ p, rot, fold, scale = 1.25 }) => {
  // fold 0 → flat sheet, 0.5 → folded once (half width), 1 → folded twice.
  const w = interpolate(fold, [0, 0.5], [92, 48], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const h = interpolate(fold, [0.5, 1], [66, 36], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <g transform={`translate(${p[0]} ${p[1]}) rotate(${rot}) scale(${scale})`}>
      <Shape
        d={rr(-w / 2, -h / 2, w, h, 6)}
        fill={fold > 0.5 ? COLORS.packet : COLORS.white}
        shade={
          fold > 0.5 ? (
            <rect x={0} y={-h / 2} width={w / 2} height={h} fill={COLORS.packetShade} />
          ) : (
            <rect x={0} y={-h / 2} width={w / 2} height={h} fill={COLORS.backgroundShade} opacity={fold * 2} />
          )
        }
        strokeWidth={OUTLINE_THIN}
      />
      {fold < 0.25
        ? [-16, 0, 16].map((ly) => (
            <path key={ly} d={`M ${-w / 2 + 14} ${ly} H ${w / 2 - 18}`} stroke={COLORS.packet} strokeWidth={4} strokeLinecap="round" />
          ))
        : null}
      {fold >= 0.5 ? <path d={`M 0 ${-h / 2} V ${h / 2}`} stroke={COLORS.ink} strokeWidth={2} /> : null}
    </g>
  );
};

const Burst: React.FC<{ p: P; t: number }> = ({ p, t }) => {
  if (t <= 0 || t >= 1) return null;
  const r0 = 40 + t * 50;
  const r1 = r0 + 40 * (1 - t);
  return (
    <g opacity={1 - t}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={p[0] + Math.cos(a) * r0}
            y1={p[1] + Math.sin(a) * r0}
            x2={p[0] + Math.cos(a) * r1}
            y2={p[1] + Math.sin(a) * r1}
            stroke={COLORS.packet}
            strokeWidth={OUTLINE + 4}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
};

// "?" over a few heads while the narrator says "Nobody knows…".
const PUZZLED: Seat[] = [[6, 4], [5, 1], [4, 4], [5, 5], [2, 3], [4, 1], [2, 5]];

// ---------- Camera ----------

const OPEN: Shot = { x: seatX(6, HERO[1]) + 20, y: 880, zoom: 1.9, rotate: -0.6 };
const OPEN_IN: Shot = { x: seatX(6, HERO[1]) + 10, y: 860, zoom: 2.05, rotate: -0.3 };
const HALL: Shot = { x: 980, y: 640, zoom: 1.2, rotate: 0.4 };
// Wide enough to read both the "ROW 3" sign and seat 5.
const END: Shot = { x: (seatX(3, 0) + seatX(3, 5)) / 2 + 20, y: rowY(3) - 10, zoom: 1.35, rotate: -0.4 };

// Follow the note, leading it a little: average its path over the next frames.
const followShot = (f: number): Shot => {
  let x = 0;
  let y = 0;
  const N = 10;
  for (let i = 0; i < N; i++) {
    const { p } = noteAt(f + 4 + i);
    x += p[0];
    y += p[1];
  }
  return { x: x / N + 60, y: y / N - 20, zoom: 1.4, rotate: 0 };
};

const shotAt = (f: number): Shot => {
  const intro = easedMove({ frame: f, from: OPEN, to: OPEN_IN, start: 0, end: 70 });
  const wide = easedMove({ frame: f, from: intro, to: HALL, start: 72, end: 120 });
  const follow = mixShots(wide, followShot(f), ease(f, 124, 150));
  return easedMove({ frame: f, from: follow, to: END, start: 246, end: 279 });
};

// ---------- Scene ----------

export const S4Note: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fold = ease(frame, 10, 52);
  const note = noteAt(frame);

  // Tap: hero's left hand reaches the shoulder of the student in front.
  const tapOut = ease(frame, 50, 60, Easing.out(Easing.cubic));
  const tapBack = ease(frame, 66, 78);
  const tapAmt = tapOut * (1 - tapBack);
  const tapTarget: P = [seatX(5, HERO[1]) - 40 * rowScale(5), rowY(5) + 44];
  const tapHand: P | null = tapAmt > 0.01 ? lerp(pRest(HERO), tapTarget, tapAmt) : null;
  const tapSquash = Math.sin(Math.PI * ease(frame, 59, 67, Easing.linear)) * 6;
  const turnFront = ease(frame, 62, 74) * (1 - ease(frame, 128, 140));

  const rowBubble = spring({ frame: frame - 78, fps, config: { damping: 12 } }) * (1 - ease(frame, 132, 140));
  const row3Glow = spring({ frame: frame - 205, fps, config: { damping: 10 } }) * (1 - ease(frame, 250, 262));
  const seatGlow = spring({ frame: frame - 246, fps, config: { damping: 10 } });
  const landBounce = Math.sin(Math.PI * ease(frame, LAND, LAND + 14, Easing.linear)) * -10;

  const rows = Array.from({ length: ROWS }, (_, i) => i + 1);
  const seats = Array.from({ length: SEATS }, (_, i) => i + 1);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <Camera {...shotAt(frame)}>
        <Hall />
        {rows.map((r) => (
          <g key={r}>
            {seats.map((c) => {
              const seat: Seat = [r, c];
              const isHero = same(seat, HERO);
              const isTarget = same(seat, TARGET);
              return (
                <Student
                  key={c}
                  x={seatX(r, c)}
                  y={rowY(r) + (same(seat, S52) ? tapSquash : 0)}
                  s={rowScale(r)}
                  shirt={isHero ? COLORS.network : isTarget ? COLORS.reply : pick(SHIRTS, r, c, 0)}
                  hair={isHero ? COLORS.hair : pick(HAIRS, r, c, 1)}
                  style={isHero ? "pony" : isTarget ? "bun" : (["short", "short", "bun"] as const)[(r * 5 + c) % 3]}
                  hand={handFor(seat, frame)}
                  tapHand={isHero ? tapHand : null}
                  turn={same(seat, S52) ? turnFront : 0}
                  bob={isTarget ? landBounce : 0}
                />
              );
            })}
            <Bench r={r} glowSeat={r === TARGET[0] ? TARGET[1] : undefined} glow={r === TARGET[0] ? seatGlow : 0} />
            <RowSign r={r} glow={r === TARGET[0] ? Math.max(row3Glow, seatGlow * 0.6) : 0} />
          </g>
        ))}

        {/* Puzzled heads: nobody knows who's in row 3, seat 5. */}
        {PUZZLED.map(([r, c], i) => {
          const pop = spring({ frame: frame - (88 + i * 5), fps, config: { damping: 11 } }) * (1 - ease(frame, 140, 150));
          if (pop <= 0.01) return null;
          const s = rowScale(r);
          return (
            <Bubble
              key={i}
              x={seatX(r, c) + 24 * s}
              y={rowY(r) - 108 * s}
              text="?"
              fontSize={38 * s}
              tail="center"
              textColor={COLORS.packetShade}
              pop={pop}
            />
          );
        })}

        <NoteShape p={note.p} rot={note.rot} fold={fold} />
        <Burst p={pUp(TARGET)} t={ease(frame, 254, 274, Easing.out(Easing.quad))} />

        {/* "→" over each hand as it passes the note on. */}
        {SEGS.map((g, i) => {
          if (g.kind !== "fly") return null;
          const pop = spring({ frame: frame - (g.start - 3), fps, config: { damping: 12 } }) * (1 - ease(frame, g.start + 14, g.start + 20));
          return <Bubble key={i} x={g.from[0] + 6} y={g.from[1] - 50} text="→" fontSize={40} pop={pop} tail="center" />;
        })}

        <Bubble
          x={seatX(6, HERO[1]) + 34}
          y={rowY(6) - 128}
          text="Row 3, seat 5!"
          fontSize={46}
          pop={rowBubble}
        />
      </Camera>
      <Audio src={staticFile("audio/s4.wav")} />
    </AbsoluteFill>
  );
};
