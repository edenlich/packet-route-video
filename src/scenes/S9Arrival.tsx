import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Bubble } from "../components/Bubble";
import { Camera, Shot, easedMove, springMove } from "../components/Camera";
import { Envelope, IP_LABEL } from "../components/Envelope";
import { LINKS, NetworkMap, NodeId, ROUTE, nodeAnchor, routeLinks } from "../components/NetworkMap";
import { COLORS, FONT } from "../theme";

// Scene 9 — Arrival and return. See SCRIPT.md → "Scene 9".
// Wide map → envelope reaches the last router ("That's mine! →") → it hands
// the envelope to the moodle.com server → a green reply envelope travels back
// hop by hop (on a slightly different path) → pull back: both paths glow →
// dissolve to cream. (The takeaway sentence now ends Scene 10.)
//
// Narration public/audio/s9.wav is 10.52s. Measured pauses (silencedetect):
//   0.00–3.26s  "Only the last router knows exactly where it goes."   (f 0–98)
//   3.80–6.06s  "Then the page travels back the same way —"           (f 114–182)
//   6.44–7.01s  "no map,"                                             (f 193–210)
//   7.27–8.26s  "no master plan,"                                     (f 218–248)
//   8.49–10.4s  "just one step closer at a time."                     (f 255–315)
// Short hold on the glowing map after the last word, then a dissolve to the
// cream canvas S10 opens on: 345 frames total.
export const S9_DURATION = 345;
const DISSOLVE_START = 327;

type P = { x: number; y: number };

const ease = (f: number, a: number, b: number, e = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
const lerp = (p: P, q: P, t: number): P => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });

// Link endpoints in the map's own (LINKS) order, so sideways glow offsets
// match NetworkMap's (reply sits +7 px beside the request on a shared link).
const linkEnds = (a: NodeId, b: NodeId) => {
  const l = LINKS.find(([p, q]) => (p === a && q === b) || (p === b && q === a));
  const [p, q] = l ?? [a, b];
  return { p: nodeAnchor(p), q: nodeAnchor(q), forward: p === a };
};

// ---------- Timeline ----------

const ENV_SCALE = 0.45; // envelope size on the map

// Request: last stretch tr3 → dst1, wait at dst1 (bubble), then dst1 → server.
const ARRIVE_DST1 = 22;
const BUBBLE_IN = 30;
const BUBBLE_OUT = 104;
const HAND_START = 70;
const HAND_END = 98;
const INTO_SERVER = 108; // envelope slides into the server

// Reply leaves at "Then the page travels back…" (f 114).
const REPLY_OUT = 116;
const REPLY_PATH: NodeId[] = ["server", "dst1", "tr3", "tr2", "isp2", "isp1", "home"];
const HOP0 = 134;
const HOP_LEN = 17;
const HOP_GAP = 4;
const hopStart = (i: number) => HOP0 + i * (HOP_LEN + HOP_GAP);
const REPLY_HOME = hopStart(REPLY_PATH.length - 2) + HOP_LEN; // ≈ 256

// ---------- Camera ----------

const WIDE: Shot = { x: 990, y: 560, zoom: 1.0, rotate: 0 };
const CLOSE: Shot = { x: 1665, y: 420, zoom: 1.6, rotate: -0.6 };
const HANDOFF: Shot = { x: 1700, y: 450, zoom: 1.75, rotate: 0.4 };
const MID: Shot = { x: 1250, y: 560, zoom: 1.3, rotate: 0 };
const BACK: Shot = { x: 960, y: 565, zoom: 1.0, rotate: 0 };

const shotAt = (f: number, fps: number): Shot => {
  const a = springMove({ frame: f, fps, from: WIDE, to: CLOSE, start: 4, durationInFrames: 50 });
  const b = easedMove({ frame: f, from: a, to: HANDOFF, start: 62, end: 112 });
  const c = easedMove({ frame: f, from: b, to: MID, start: 128, end: 190 });
  return easedMove({ frame: f, from: c, to: BACK, start: 186, end: 250 });
};

// ---------- Small pieces ----------

// A link glowing partway (the envelope is still travelling along it).
const PartialGlow: React.FC<{ a: NodeId; b: NodeId; t: number; color: string; offset: number }> = ({
  a,
  b,
  t,
  color,
  offset,
}) => {
  if (t <= 0.001) return null;
  const { p, q, forward } = linkEnds(a, b);
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (-dy / len) * offset;
  const oy = (dx / len) * offset;
  const start = forward ? p : q;
  const end = lerp(forward ? p : q, forward ? q : p, t);
  const props = {
    x1: start.x + ox,
    y1: start.y + oy,
    x2: end.x + ox,
    y2: end.y + oy,
    strokeLinecap: "round" as const,
  };
  return (
    <g>
      <line {...props} stroke={color} strokeWidth={26} opacity={0.3} />
      <line {...props} stroke={COLORS.ink} strokeWidth={12} />
      <line {...props} stroke={color} strokeWidth={7} />
    </g>
  );
};

// Little ring burst when something arrives.
const Burst: React.FC<{ p: P; t: number; color: string; r?: number }> = ({ p, t, color, r = 80 }) => {
  if (t <= 0 || t >= 1) return null;
  return (
    <g opacity={1 - t}>
      <circle cx={p.x} cy={p.y} r={r * (0.4 + t)} fill="none" stroke={COLORS.ink} strokeWidth={10 * (1 - t) + 2} />
      <circle cx={p.x} cy={p.y} r={r * (0.4 + t)} fill="none" stroke={color} strokeWidth={5 * (1 - t) + 1} />
    </g>
  );
};

const Legend: React.FC<{ show: number }> = ({ show }) => {
  if (show <= 0.01) return null;
  const rows = [
    { color: COLORS.packet, text: "your request" },
    { color: COLORS.reply, text: "the page coming back" },
  ];
  return (
    <g opacity={show} transform={`translate(0 ${(1 - show) * 20})`}>
      {rows.map((r, i) => (
        <g key={r.text} transform={`translate(1290 ${60 + i * 50})`}>
          <line x1={0} y1={0} x2={60} y2={0} stroke={COLORS.ink} strokeWidth={14} strokeLinecap="round" />
          <line x1={0} y1={0} x2={60} y2={0} stroke={r.color} strokeWidth={8} strokeLinecap="round" />
          <text x={80} y={2} dominantBaseline="middle" fontFamily={FONT} fontWeight={600} fontSize={34} fill={COLORS.ink}>
            {r.text}
          </text>
        </g>
      ))}
    </g>
  );
};

// ---------- Scene ----------

export const S9Arrival: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Request envelope ---
  const lastLeg = ease(frame, 0, ARRIVE_DST1, Easing.out(Easing.cubic)); // tr3 → dst1, from 55 % of the way
  const tLast = 0.55 + 0.45 * lastLeg;
  const tHand = ease(frame, HAND_START, HAND_END);
  const dst1 = nodeAnchor("dst1");
  const serverA = nodeAnchor("server");
  const tr3 = nodeAnchor("tr3");
  const serverSlot: P = { x: serverA.x, y: serverA.y + 40 };

  // Hover above dst1 while the router speaks, then glide into the server.
  const dst1Hover: P = { x: dst1.x, y: dst1.y - 52 };
  const arriveLift = ease(frame, ARRIVE_DST1 - 4, ARRIVE_DST1 + 10, Easing.out(Easing.back(2)));
  let req: P;
  if (frame < HAND_START) {
    const onLink = lerp(tr3, dst1, tLast);
    req = lerp(onLink, dst1Hover, arriveLift);
    req = { x: req.x, y: req.y + Math.sin(frame / 6) * 3 * arriveLift };
  } else {
    req = lerp(dst1Hover, serverSlot, tHand);
    req = { x: req.x, y: req.y - Math.sin(Math.PI * tHand) * 60 };
  }
  const into = ease(frame, HAND_END, INTO_SERVER, Easing.in(Easing.cubic));
  const reqScale = ENV_SCALE * (1 - 0.75 * into) * (1 + 0.12 * Math.sin(Math.PI * ease(frame, ARRIVE_DST1 - 2, ARRIVE_DST1 + 8, Easing.linear)));
  const reqRot = frame < HAND_START ? -6 + 6 * lastLeg : -10 * Math.sin(Math.PI * tHand);
  const showReq = into < 0.999;

  // --- Request glow on the map ---
  const reqGlow = routeLinks(ROUTE.slice(0, 5)); // home … tr3 (already travelled in S8)
  if (frame >= ARRIVE_DST1) reqGlow.push(...routeLinks(["tr3", "dst1"]));
  if (frame >= HAND_END) reqGlow.push(...routeLinks(["dst1", "server"]));

  // --- Reply envelope ---
  const replyPop = spring({ frame: frame - REPLY_OUT, fps, config: { damping: 11 } });
  const replyLinks: string[] = [];
  let reply: P = { x: serverA.x, y: serverA.y - 40 - 100 * replyPop };
  let hopIndex = -1;
  let hopT = 0;
  for (let i = 0; i < REPLY_PATH.length - 1; i++) {
    const s = hopStart(i);
    if (frame >= s + HOP_LEN) {
      replyLinks.push(...routeLinks([REPLY_PATH[i], REPLY_PATH[i + 1]]));
    } else if (frame >= s) {
      hopIndex = i;
      hopT = ease(frame, s, s + HOP_LEN);
    }
  }
  if (frame >= HOP0) {
    const done = replyLinks.length;
    if (hopIndex >= 0) {
      const a = nodeAnchor(REPLY_PATH[hopIndex]);
      const b = nodeAnchor(REPLY_PATH[hopIndex + 1]);
      const startP = hopIndex === 0 ? { x: a.x, y: a.y - 140 } : a;
      reply = lerp(startP, b, hopT);
      reply = { x: reply.x, y: reply.y - Math.sin(Math.PI * hopT) * 50 };
    } else {
      // Waiting at a router between hops (or home at the end).
      const at = nodeAnchor(REPLY_PATH[Math.min(done, REPLY_PATH.length - 1)]);
      reply = at;
    }
  }
  const replyArrived = frame >= REPLY_HOME;
  const homeIn = ease(frame, REPLY_HOME, REPLY_HOME + 10, Easing.in(Easing.cubic));
  const replyScale = ENV_SCALE * replyPop * (1 - 0.8 * homeIn) * 1.0;
  const replyRot = hopIndex >= 0 ? 8 * Math.sin(Math.PI * hopT) : 0;

  // --- Active routers ---
  const active: Partial<Record<NodeId, number>> = {};
  active.dst1 =
    spring({ frame: frame - (ARRIVE_DST1 - 2), fps, config: { damping: 12 } }) * (1 - ease(frame, HAND_END, HAND_END + 12));
  active.server =
    spring({ frame: frame - (HAND_END + 2), fps, config: { damping: 12 } }) * (1 - ease(frame, HOP0 + 6, HOP0 + 20));
  REPLY_PATH.slice(1).forEach((id, i) => {
    const arrive = hopStart(i) + HOP_LEN;
    const lit = ease(frame, arrive - 3, arrive + 2) * (1 - ease(frame, arrive + 6, arrive + 16));
    if (id === "home") {
      active[id] = Math.max(active[id] ?? 0, ease(frame, arrive - 3, arrive + 4) * (1 - ease(frame, arrive + 30, arrive + 50)));
    } else {
      active[id] = Math.max(active[id] ?? 0, lit);
    }
  });

  // --- Glow strength / pull-back emphasis ---
  const glow = 0.75 + 0.25 * ease(frame, 200, 250);
  const bubblePop =
    spring({ frame: frame - BUBBLE_IN, fps, config: { damping: 11 } }) * (1 - ease(frame, BUBBLE_OUT - 8, BUBBLE_OUT));
  const legend = ease(frame, 236, 258, Easing.out(Easing.cubic));

  // Is the reply's current hop on a link the request also used? Then sit beside it.
  const replyOffset = (a: NodeId, b: NodeId) => {
    const ids = routeLinks([a, b]);
    return ids.length && reqGlow.includes(ids[0]) ? 7 : 0;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <Camera {...shotAt(frame, fps)}>
        <NetworkMap glowLinks={reqGlow} replyLinks={replyLinks} glow={glow} activeNodes={active} />

        {/* Links still being travelled: glow grows behind the envelope. */}
        {frame < ARRIVE_DST1 ? <PartialGlow a="tr3" b="dst1" t={tLast} color={COLORS.packet} offset={0} /> : null}
        {frame >= HAND_START && frame < HAND_END ? (
          <PartialGlow a="dst1" b="server" t={tHand} color={COLORS.packet} offset={0} />
        ) : null}
        {hopIndex >= 0 ? (
          <PartialGlow
            a={REPLY_PATH[hopIndex]}
            b={REPLY_PATH[hopIndex + 1]}
            t={hopT}
            color={COLORS.reply}
            offset={replyOffset(REPLY_PATH[hopIndex], REPLY_PATH[hopIndex + 1])}
          />
        ) : null}

        <Burst p={{ x: dst1.x, y: dst1.y - 50 }} t={ease(frame, ARRIVE_DST1 - 2, ARRIVE_DST1 + 16, Easing.out(Easing.quad))} color={COLORS.network} />
        <Burst p={serverA} t={ease(frame, INTO_SERVER - 4, INTO_SERVER + 16, Easing.out(Easing.quad))} color={COLORS.packet} r={110} />
        <Burst p={nodeAnchor("home")} t={ease(frame, REPLY_HOME, REPLY_HOME + 22, Easing.out(Easing.quad))} color={COLORS.reply} r={110} />

        {showReq ? (
          <Envelope x={req.x} y={req.y} scale={reqScale} rotate={reqRot} flip={1} to={IP_LABEL} />
        ) : null}

        {frame >= REPLY_OUT && homeIn < 0.999 ? (
          <Envelope
            x={reply.x}
            y={reply.y}
            scale={replyScale}
            rotate={replyRot}
            variant="reply"
            from="the page"
            to=""
            opacity={replyArrived ? 1 - homeIn : 1}
          />
        ) : null}

        <Bubble x={dst1.x + 4} y={dst1.y - 100} text="That's mine! →" fontSize={34} pop={bubblePop} tail="left" />
      </Camera>

      {/* Screen-space overlay: legend, on its own gently drifting layer. */}
      <Camera drift={0.5}>
        <Legend show={legend} />
      </Camera>

      {/* Dissolve to the cream canvas S10 opens on (no hard cut). */}
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.background,
          opacity: ease(frame, DISSOLVE_START, S9_DURATION - 1, Easing.inOut(Easing.sin)),
        }}
      />

      <Audio src={staticFile("audio/s9.wav")} />
    </AbsoluteFill>
  );
};
