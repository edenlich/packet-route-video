import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Bubble } from "../components/Bubble";
import { Camera, Shot, easedMove, mixShots } from "../components/Camera";
import { Envelope } from "../components/Envelope";
import { LimbPath, Shape, circ, rr } from "../components/Shape";
import { COLORS, FONT, OUTLINE, OUTLINE_THIN } from "../theme";

// Scene 4 — The note. See SCRIPT.md → "Scene 4". Three beats, each timed to
// its own narration clip (measured with ffmpeg silencedetect, 30 fps):
//
// 4a  s4a.wav 19.39s → beat 0–597 (+0.5s). Camera stays close on the hero.
//     f   0– 37 "To see how this works,"
//     f  47–194 "imagine you're sitting in a lecture hall … in the room."  → looks around, spots friend
//     f 215–267 "First, you check where they're sitting:"                  → leans in, peers ahead
//     f 284–328 "row 3, seat 5."                                           → thought bubble
//     f 350–378 "Then you write the note,"                                 → writes, folds
//     f 382–413 "put it in an envelope,"                                   → note slides into Envelope
//     f 424–491 "write "Row 3, Seat 5" on it —"                            → label written
//     f 503–576 "and ask the person in front of you to pass it on."        → tap, hand over
// 4b  s4b.wav 8.83s → beat 597–877 (+0.5s). Four slow passes, rows 7 → 6 → 5 → 4 → 3.
// 4c  s4c.wav 6.59s → beat 877–1111 (+1.2s hold on the smile).
//     +0   "Until it reaches someone in row 3."   → lands in row 3, seat 4
//     +82  "They do know exactly where it goes —" → "Row 3? Seat 5 is right next to me!"
//     +145 "and hand it straight to your friend." → sideways to seat 5, opens, smiles
const BEAT_A = 597;
const BEAT_B = 280;
const BEAT_C = 234;
const B0 = BEAT_A;
const C0 = BEAT_A + BEAT_B;
const S4C_AUDIO = 200; // 6.59s, rounded up — so S5's held last frame stays silent
export const S4_DURATION = BEAT_A + BEAT_B + BEAT_C; // 1111 frames ≈ 37s

type P = [number, number];
type Seat = [number, number]; // [row, seat]

// ---------- Hall geometry (fake perspective: back rows bigger, lower) ----------

const ROWS = 8;
const SEATS = 6;
const rowScale = (r: number) => 0.78 + 0.05 * r;
const rowY = (r: number) => 60 + r * 165; // shoulder line of row r
const seatX = (r: number, c: number) => 1060 + (c - 3) * 250 * rowScale(r);

const COL = 4;
const HERO: Seat = [8, COL];
const R7: Seat = [7, COL];
const R6: Seat = [6, COL];
const R5: Seat = [5, COL];
const R4: Seat = [4, COL];
const RELAY: Seat[] = [R7, R6, R5, R4];
const KNOWER: Seat = [3, COL]; // row 3, seat 4 — right next to the friend
const FRIEND: Seat = [3, 5];
const same = (a: Seat, b: Seat) => a[0] === b[0] && a[1] === b[1];

const add = (a: P, dx: number, dy: number): P => [a[0] + dx, a[1] + dy];
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const ease = (f: number, a: number, b: number, e = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

// Envelope-centre poses in world space.
const pHold = ([r, c]: Seat): P => [seatX(r, c) + 128 * rowScale(r), rowY(r) - 30 * rowScale(r)];
const pFwd = ([r, c]: Seat): P => [seatX(r, c) + 118 * rowScale(r), rowY(r) - 150 * rowScale(r)];
const pRight = ([r, c]: Seat): P => [seatX(r, c) + 130 * rowScale(r), rowY(r) - 55 * rowScale(r)];
const pLeft = ([r, c]: Seat): P => [seatX(r, c) - 85 * rowScale(r), rowY(r) - 55 * rowScale(r)];
const pUp = ([r, c]: Seat): P => [seatX(r, c) + 45 * rowScale(r), rowY(r) - 165 * rowScale(r)];
const pRest = ([r, c]: Seat): P => [seatX(r, c) + 55 * rowScale(r), rowY(r) + 90 * rowScale(r)];
const HAND_DY = 40; // the hand grips the envelope's bottom edge

// The hero's "desk": where the note is written and the envelope is filled.
const X0 = seatX(...HERO);
const Y0 = rowY(HERO[0]);
const NOTE_POS: P = [X0 + 150, Y0 - 95];
const ENV_HOME: P = [X0 + 150, Y0 - 5];
const ENV_SCALE_DESK = 0.75;
const ENV_SCALE_TRAVEL = 0.6;
const NOTE_SCALE = 1.4;
const LABEL = "Row 3, Seat 5";

// ---------- The envelope's journey (from the hand-over on) ----------

type Seg =
  | { kind: "hold"; who: Seat; start: number; end: number; from: P; to: P }
  | { kind: "fly"; passer: Seat; receiver: Seat; start: number; end: number; from: P; to: P; arc: number };

const hold = (who: Seat, start: number, end: number, from: P, to: P = from): Seg => ({ kind: "hold", who, start, end, from, to });
const fly = (passer: Seat, receiver: Seat, start: number, end: number, from: P, to: P, arc = 90): Seg => ({
  kind: "fly",
  passer,
  receiver,
  start,
  end,
  from,
  to,
  arc,
});

const SEGS: Seg[] = [
  hold(HERO, 0, 535, ENV_HOME),
  hold(HERO, 535, 552, ENV_HOME, pFwd(HERO)),
  fly(HERO, R7, 552, 584, pFwd(HERO), pHold(R7), 80),
  // 4b: four slow, clear arcs, row by row.
  hold(R7, 584, 622, pHold(R7)),
  hold(R7, 622, 636, pHold(R7), pFwd(R7)),
  fly(R7, R6, 636, 672, pFwd(R7), pHold(R6)),
  hold(R6, 672, 692, pHold(R6)),
  hold(R6, 692, 706, pHold(R6), pFwd(R6)),
  fly(R6, R5, 706, 742, pFwd(R6), pHold(R5)),
  hold(R5, 742, 762, pHold(R5)),
  hold(R5, 762, 776, pHold(R5), pFwd(R5)),
  fly(R5, R4, 776, 812, pFwd(R5), pHold(R4)),
  hold(R4, 812, 832, pHold(R4)),
  hold(R4, 832, 846, pHold(R4), pFwd(R4)),
  fly(R4, KNOWER, 846, 884, pFwd(R4), pHold(KNOWER)),
  // 4c: row 3 knows — sideways to seat 5.
  hold(KNOWER, 884, 1000, pHold(KNOWER)),
  hold(KNOWER, 1000, 1014, pHold(KNOWER), pRight(KNOWER)),
  fly(KNOWER, FRIEND, 1014, 1044, pRight(KNOWER), pLeft(FRIEND), 55),
  hold(FRIEND, 1044, 1060, pLeft(FRIEND), pUp(FRIEND)),
  hold(FRIEND, 1060, 99999, pUp(FRIEND)),
];
const LAND = 1044;
const OPEN = 1062;

const segAt = (f: number) => SEGS.find((s) => f >= s.start && f < s.end) ?? SEGS[SEGS.length - 1];

const envAt = (f: number): { p: P; rot: number } => {
  const s = segAt(f);
  const t = ease(f, s.start, s.end);
  const p = lerp(s.from, s.to, t);
  if (s.kind === "fly") {
    const lift = Math.sin(Math.PI * t) * s.arc;
    return { p: [p[0], p[1] - lift], rot: Math.sin(Math.PI * 2 * t) * 9 };
  }
  return { p, rot: 0 };
};

// ---------- Beat 4a: the hero's pencil and hands ----------

// Pencil tip position while writing.
const penAt = (f: number): P => {
  const lineStart = (i: number): P => add(NOTE_POS, -32 * NOTE_SCALE, (-16 + 16 * i) * NOTE_SCALE);
  const lineEnd = (i: number): P => add(NOTE_POS, 26 * NOTE_SCALE, (-16 + 16 * i) * NOTE_SCALE);
  const aside: P = add(NOTE_POS, 70, 40);
  const labelY = ENV_HOME[1] + 22 * ENV_SCALE_DESK;
  const labelA: P = [ENV_HOME[0] - 58, labelY];
  const labelB: P = [ENV_HOME[0] + 58, labelY];
  const wiggle = (u: number) => Math.sin(u * Math.PI * 10) * 4;

  if (f < 352) return lineStart(0);
  if (f < 382) {
    const i = Math.min(2, Math.floor((f - 352) / 10));
    const u = (f - 352 - i * 10) / 10;
    const p = lerp(lineStart(i), lineEnd(i), u);
    return add(p, 0, wiggle(u));
  }
  if (f < 420) return lerp(lineEnd(2), aside, ease(f, 382, 394));
  if (f < 428) return lerp(aside, labelA, ease(f, 420, 428));
  if (f < 488) {
    const u = (f - 428) / 60;
    return add(lerp(labelA, labelB, u), 0, wiggle(u * 1.3));
  }
  return lerp(labelB, aside, ease(f, 488, 497));
};
const inkAt = (f: number) => interpolate(f, [352, 382], [0, 3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const labelAt = (f: number) =>
  LABEL.slice(0, Math.floor(interpolate(f, [428, 486], [0, LABEL.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
const PEN_GRIP: P = [26, -22]; // the hand sits up the pencil from the tip

const heroHand = (f: number): P | null => {
  const grip = (p: P) => add(p, PEN_GRIP[0], PEN_GRIP[1]);
  if (f < 328) return null;
  if (f < 345) return lerp(pRest(HERO), grip(penAt(345)), ease(f, 328, 345));
  if (f < 497) return grip(penAt(f));
  if (f < 510) return lerp(grip(penAt(497)), pRest(HERO), ease(f, 497, 510));
  if (f < 520) return null;
  return lerp(pRest(HERO), add(ENV_HOME, 0, HAND_DY), ease(f, 520, 535));
};

// Where (if anywhere) this student's right hand is.
const handFor = (seat: Seat, f: number): P | null => {
  if (same(seat, HERO) && f < 535) return heroHand(f);
  const s = segAt(f);
  if (s.kind === "hold" && same(s.who, seat)) return add(envAt(f).p, 0, HAND_DY);
  for (const g of SEGS) {
    if (g.kind !== "fly") continue;
    // Receiver reaches out before the envelope arrives and waits for it.
    if (same(g.receiver, seat) && f >= g.start - 12 && f < g.end) {
      return lerp(pRest(seat), add(g.to, 0, HAND_DY), ease(f, g.start - 12, g.start + 6, Easing.out(Easing.cubic)));
    }
    // Passer lets go, then the hand sinks back behind the seat.
    if (same(g.passer, seat) && f >= g.start && f < g.start + 18) {
      return lerp(add(g.from, 0, HAND_DY), pRest(seat), ease(f, g.start + 2, g.start + 18));
    }
  }
  return null;
};

// Head turns: >0 looks back over the left shoulder, <0 over the right.
const turnFor = (seat: Seat, f: number): number => {
  if (same(seat, HERO)) {
    const left = ease(f, 40, 62) * (1 - ease(f, 76, 90)) * 0.75;
    const right = ease(f, 88, 108) * (1 - ease(f, 122, 138)) * -0.7;
    return left + right;
  }
  if (same(seat, R7)) return ease(f, 516, 530) * (1 - ease(f, 590, 606)) * 0.8;
  if (same(seat, KNOWER)) {
    const back = Math.sin(Math.PI * ease(f, 870, 910, Easing.linear)) * 0.5;
    return back + ease(f, 985, 1000) * (1 - ease(f, 1050, 1066)) * -0.75;
  }
  if (same(seat, FRIEND)) return ease(f, 1002, 1016) * 0.85;
  // Each relay glances back as the envelope comes in.
  for (const g of SEGS) {
    if (g.kind === "fly" && same(g.receiver, seat)) {
      return Math.sin(Math.PI * ease(f, g.start - 14, g.end + 12, Easing.linear)) * 0.5;
    }
  }
  return 0;
};

// ---------- Drawings ----------

// Background students stay muted so the hero (blue) and the friend (green) pop.
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
  turn?: number; // -1..1: >0 face turns left (back over the left shoulder), <0 right
  bob?: number; // vertical head shift in local units
  smile?: number; // 0..1, shown when turned left
};

const Student: React.FC<StudentProps> = ({ x, y, s, shirt, hair, style, hand, tapHand, turn = 0, bob = 0, smile = 0 }) => {
  const toLocal = (p: P): P => [(p[0] - x) / s, (p[1] - y) / s];
  const headY = -64 + bob;
  const a = Math.abs(turn);
  // The hair cap recedes from the side the face turns to.
  const capL = -60 + 54 * Math.max(0, turn);
  const capR = 60 - 54 * Math.max(0, -turn);
  const eyeX = -32 * turn;
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
      {style === "bun" ? <Shape d={circ(-8 * turn, headY - 50, 20)} fill={hair} /> : null}
      <Shape
        d={circ(0, headY, 46)}
        fill={COLORS.skin}
        shade={
          <>
            <path
              d={`M ${capL} ${headY - 60} H ${capR} V ${headY + 22} Q ${(capL + capR) / 2} ${headY + 40} ${capL} ${headY + 22} Z`}
              fill={hair}
            />
            <path d={`M 22 ${headY - 60} Q 44 ${headY} 26 ${headY + 30} H 60 V ${headY - 60} Z`} fill={COLORS.ink} opacity={0.18} />
          </>
        }
      />
      {a > 0.05 ? (
        <>
          <circle cx={eyeX} cy={headY + 4} r={5} fill={COLORS.ink} opacity={Math.min(1, a * 2)} />
          <circle cx={eyeX * 0.85} cy={headY + 24} r={8} fill={COLORS.packet} opacity={0.35 * a} />
        </>
      ) : null}
      {smile > 0.01 && turn > 0.3 ? (
        <path
          d={`M -40 ${headY + 16} Q -33 ${headY + 16 + 12 * smile} -22 ${headY + 18}`}
          stroke={COLORS.ink}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
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
    <rect x={-800} y={130} width={4400} height={2400} fill={COLORS.backgroundShade} />
    <Shape d={rr(-800, 124, 4400, 14, 0)} fill={COLORS.background} strokeWidth={OUTLINE_THIN} />
    {/* Side wall on the right, following the tiers. */}
    <Shape
      d={`M ${seatX(0, 6.75)} 130 L ${seatX(11, 6.75)} ${rowY(11)} L 3600 ${rowY(11)} L 3600 130 Z`}
      fill={COLORS.wall}
      shade={<path d={`M ${seatX(0, 7.3)} 130 L ${seatX(11, 7.3)} ${rowY(11)} L 3600 ${rowY(11)} L 3600 130 Z`} fill={COLORS.wallShade} />}
    />
    {/* Aisle stairs on the left. */}
    {Array.from({ length: ROWS + 1 }, (_, i) => i + 1).map((r) => {
      const y = rowY(r) + 190 * rowScale(r);
      return <Shape key={r} d={rr(-800, y - 20, seatX(r, 0.3) + 800, 40, 0)} fill={COLORS.wallShade} strokeWidth={OUTLINE_THIN} />;
    })}
  </g>
);

// The paper note: `ink` 0..3 = how many lines are written; `fold` 0 → 1.
const NoteShape: React.FC<{ p: P; fold: number; ink?: number; scale?: number; rot?: number }> = ({ p, fold, ink = 3, scale = 1, rot = 0 }) => {
  const w = interpolate(fold, [0, 0.5], [92, 48], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const h = interpolate(fold, [0.5, 1], [66, 36], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <g transform={`translate(${p[0]} ${p[1]}) rotate(${rot}) scale(${scale})`}>
      <Shape
        d={rr(-w / 2, -h / 2, w, h, 6)}
        fill={COLORS.white}
        shade={<rect x={0} y={-h / 2} width={w / 2} height={h} fill={COLORS.backgroundShade} opacity={Math.min(1, fold * 2)} />}
        strokeWidth={OUTLINE_THIN}
      />
      {fold < 0.25
        ? [0, 1, 2].map((i) => {
            const len = Math.max(0, Math.min(1, ink - i));
            if (len <= 0) return null;
            const x1 = -w / 2 + 14;
            const x2 = x1 + (w - 32) * len;
            return <path key={i} d={`M ${x1} ${-16 + 16 * i} H ${x2}`} stroke={COLORS.packet} strokeWidth={4} strokeLinecap="round" />;
          })
        : null}
      {fold >= 0.5 ? <path d={`M 0 ${-h / 2} V ${h / 2}`} stroke={COLORS.ink} strokeWidth={2} /> : null}
    </g>
  );
};

// A little pencil, tip at p.
const Pencil: React.FC<{ p: P }> = ({ p }) => (
  <g transform={`translate(${p[0]} ${p[1]}) rotate(-40) scale(1.1)`}>
    <Shape d={rr(16, -8, 62, 16, 4)} fill={COLORS.lampLight} shade={<rect x={16} y={1} width={62} height={7} fill={COLORS.wall} />} strokeWidth={OUTLINE_THIN} />
    <Shape d={rr(70, -8, 14, 16, 4)} fill={COLORS.packet} strokeWidth={OUTLINE_THIN} />
    <Shape d="M 0 0 L 17 -8 L 17 8 Z" fill={COLORS.wall} strokeWidth={OUTLINE_THIN} />
    <path d="M 0 0 L 6 -3 L 6 3 Z" fill={COLORS.ink} />
  </g>
);

// Thought cloud: a bumpy body plus two little dots trailing to the head.
// (x, y) = the smallest dot, just above the thinker's head; the cloud floats up-left.
const Thought: React.FC<{ x: number; y: number; text: string; pop: number; fontSize?: number }> = ({ x, y, text, pop, fontSize = 40 }) => {
  if (pop <= 0.001) return null;
  const W = text.length * fontSize * 0.56 + fontSize * 1.6;
  const H = fontSize * 2.1;
  const cx = -W / 2 + 130;
  const cy = -H / 2 - 50;
  const bumpR = H * 0.36;
  const n = Math.max(3, Math.round(W / (bumpR * 1.5)));
  const bumps: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const bx = cx - W / 2 + bumpR + ((W - 2 * bumpR) * i) / (n - 1);
    bumps.push([bx, cy - H / 2 + 4], [bx + (i % 2 ? 10 : -10), cy + H / 2 - 4]);
  }
  bumps.push([cx - W / 2 + 6, cy], [cx + W / 2 - 6, cy]);
  const body = (
    <>
      <path d={rr(cx - W / 2, cy - H / 2, W, H, H / 2)} />
      {bumps.map(([bx, by], i) => (
        <circle key={i} cx={bx} cy={by} r={bumpR} />
      ))}
    </>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${pop})`}>
      <Shape d={circ(0, 0, 9)} fill={COLORS.white} />
      <Shape d={circ(-18, -34, 15)} fill={COLORS.white} />
      <g fill={COLORS.ink} stroke={COLORS.ink} strokeWidth={OUTLINE * 2}>
        {body}
      </g>
      <g fill={COLORS.white}>{body}</g>
      <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontWeight={600} fontSize={fontSize} fill={COLORS.ink}>
        {text}
      </text>
    </g>
  );
};

const Burst: React.FC<{ p: P; t: number }> = ({ p, t }) => {
  if (t <= 0 || t >= 1) return null;
  const r0 = 50 + t * 50;
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

// ---------- Camera ----------

// 4a: close on the hero and their desk the whole time, a slow push-in.
const CLOSE_A: Shot = { x: X0 + 70, y: Y0 - 95, zoom: 1.95, rotate: -0.5 };
const CLOSE_B: Shot = { x: X0 + 85, y: Y0 - 90, zoom: 2.1, rotate: 0.2 };
// 4c: row 3, seats 4 and 5 together.
const END: Shot = { x: (seatX(3, 4) + seatX(3, 5)) / 2 + 10, y: rowY(3) - 60, zoom: 1.7, rotate: -0.4 };
const END_IN: Shot = { ...END, x: END.x + 30, zoom: 1.85, rotate: 0.1 };

// 4b: follow the envelope, leading it — averaging over a long look-ahead
// window turns each arc into one gentle glide instead of a jump.
const followShot = (f: number): Shot => {
  let x = 0;
  let y = 0;
  const N = 12;
  for (let i = 0; i < N; i++) {
    const { p } = envAt(f + 6 + i * 3);
    x += p[0];
    y += p[1];
  }
  return { x: x / N + 40, y: y / N - 80, zoom: 1.6, rotate: 0 };
};

const shotAt = (f: number): Shot => {
  const close = easedMove({ frame: f, from: CLOSE_A, to: CLOSE_B, start: 0, end: 560 });
  const follow = mixShots(close, followShot(f), ease(f, 566, 650));
  const end = easedMove({ frame: f, from: END, to: END_IN, start: 940, end: S4_DURATION });
  return mixShots(follow, end, ease(f, 878, 945));
};

// ---------- Scene ----------

export const S4Note: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = (start: number, damping = 12) => spring({ frame: frame - start, fps, config: { damping } });

  // 4a: look around, spot the friend, think of where they sit.
  const spot = pop(132) * (1 - ease(frame, 196, 206));
  const lean = ease(frame, 140, 155) * (1 - ease(frame, 200, 214)) * -8 + ease(frame, 218, 240) * (1 - ease(frame, 330, 345)) * -5;
  const thought = pop(272) * (1 - ease(frame, 338, 350));

  // 4a: note → envelope → label.
  const noteIn = pop(334, 14);
  const fold = ease(frame, 384, 398);
  const insert = ease(frame, 400, 420);
  const notePos = lerp(NOTE_POS, add(ENV_HOME, 0, 10), insert);
  const showNote = frame >= 334 && frame < 422;
  const envPop = pop(386);
  const envScale = interpolate(frame, [535, 556], [ENV_SCALE_DESK, ENV_SCALE_TRAVEL], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const label = frame < 540 ? labelAt(frame) : LABEL;
  const env = frame >= 535 ? envAt(frame) : { p: ENV_HOME, rot: 0 };
  const showPencil = frame >= 330 && frame < 506;

  // 4a: tap the student in front.
  const tapOut = ease(frame, 505, 515, Easing.out(Easing.cubic));
  const tapBack = ease(frame, 524, 534);
  const tapAmt = tapOut * (1 - tapBack);
  const tapTarget: P = [seatX(...R7) - 42 * rowScale(7), rowY(7) + 40];
  const tapHand: P | null = tapAmt > 0.01 ? lerp(pRest(HERO), tapTarget, tapAmt) : null;
  const tapSquash = Math.sin(Math.PI * ease(frame, 513, 521, Easing.linear)) * 6;

  // 4c: row 3 lights up; the friend opens it and smiles.
  const row3Glow = pop(892, 10);
  const seatGlow = pop(960, 10);
  const landBounce = Math.sin(Math.PI * ease(frame, LAND, LAND + 14, Easing.linear)) * -10;
  const emerge = ease(frame, OPEN, OPEN + 18, Easing.out(Easing.back(1.6)));
  const smile = ease(frame, OPEN + 8, OPEN + 22);

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
              const isFriend = same(seat, FRIEND);
              return (
                <Student
                  key={c}
                  x={seatX(r, c)}
                  y={rowY(r) + (same(seat, R7) ? tapSquash : 0)}
                  s={rowScale(r)}
                  shirt={isHero ? COLORS.network : isFriend ? COLORS.reply : pick(SHIRTS, r, c, 0)}
                  hair={isHero ? COLORS.hair : pick(HAIRS, r, c, 1)}
                  style={isHero ? "pony" : isFriend ? "bun" : (["short", "short", "bun"] as const)[(r * 5 + c) % 3]}
                  hand={handFor(seat, frame)}
                  tapHand={isHero ? tapHand : null}
                  turn={turnFor(seat, frame)}
                  bob={isHero ? lean : isFriend ? landBounce : 0}
                  smile={isFriend ? smile : 0}
                />
              );
            })}
            <Bench r={r} glowSeat={r === FRIEND[0] ? FRIEND[1] : undefined} glow={r === FRIEND[0] ? seatGlow : 0} />
            <RowSign r={r} glow={r === FRIEND[0] ? row3Glow : 0} />
          </g>
        ))}

        {/* 4a: "!" — there's my friend, far ahead. */}
        <Bubble x={X0 - 20} y={Y0 - 150} text="!" fontSize={44} tail="center" textColor={COLORS.packetShade} pop={spot} />
        <Thought x={X0 - 50} y={Y0 - 150} text={LABEL} pop={thought} />

        {/* 4a: the note, written, folded, slid into the envelope. */}
        {showNote ? <NoteShape p={notePos} fold={fold} ink={inkAt(frame)} scale={NOTE_SCALE * noteIn} /> : null}
        {/* 4c: the friend opens it — the note pops up out of the envelope. */}
        {frame >= OPEN ? <NoteShape p={add(env.p, 4, -70 * emerge)} fold={1} scale={1.15} rot={-6 * emerge} /> : null}
        {frame >= 386 ? <Envelope x={env.p[0]} y={env.p[1]} rotate={env.rot} scale={envScale * envPop} from={label} /> : null}
        {showPencil ? <Pencil p={penAt(frame)} /> : null}
        <Burst p={add(env.p, 0, -40)} t={ease(frame, OPEN + 6, OPEN + 30, Easing.out(Easing.quad))} />

        {/* 4b: each relay says it isn't for them. */}
        {RELAY.map((seat) => {
          const inbound = SEGS.find((g) => g.kind === "fly" && same(g.receiver, seat))!;
          const outbound = SEGS.find((g) => g.kind === "fly" && same(g.passer, seat))!;
          const p = pop(inbound.end - 12) * (1 - ease(frame, outbound.start + 16, outbound.start + 24));
          const s = rowScale(seat[0]);
          return (
            <Bubble
              key={seat[0]}
              x={seatX(...seat) + 10 * s}
              y={rowY(seat[0]) - 118 * s}
              text="Not mine — forward →"
              fontSize={30}
              tail="center"
              pop={p}
            />
          );
        })}

        {/* 4c: the one who knows. */}
        <Bubble
          x={seatX(...KNOWER) + 10}
          y={rowY(3) - 118 * rowScale(3)}
          text={"Row 3?\nSeat 5 is right next to me!"}
          fontSize={32}
          tail="left"
          pop={pop(902) * (1 - ease(frame, 1008, 1018))}
        />
      </Camera>

      <Sequence from={0} durationInFrames={BEAT_A} layout="none">
        <Audio src={staticFile("audio/s4a.wav")} />
      </Sequence>
      <Sequence from={B0} durationInFrames={BEAT_B} layout="none">
        <Audio src={staticFile("audio/s4b.wav")} />
      </Sequence>
      <Sequence from={C0} durationInFrames={S4C_AUDIO} layout="none">
        <Audio src={staticFile("audio/s4c.wav")} />
      </Sequence>
    </AbsoluteFill>
  );
};
