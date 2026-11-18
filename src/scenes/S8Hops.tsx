import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Bubble } from "../components/Bubble";
import { Camera, Shot, easedMove, mixShots } from "../components/Camera";
import { Envelope } from "../components/Envelope";
import { Router } from "../components/Router";
import { NODES, NetworkMap, NodeId, ROUTE, nodeAnchor, pointBetween } from "../components/NetworkMap";
import { COLORS } from "../theme";

// Scene 8 — Hop by hop. Picks up as Scene 7 ends: the envelope has just left the
// home through the wall cable. The camera pulls out to the wide network map,
// then follows the envelope router to router along ROUTE. Each router it reaches
// pops "Don't know where that is — but this way's closer →". The first two hops
// are slow; then it speeds up and stops on dst1 (the router on moodle.com's
// network) — Scene 9 picks up there with "That's mine!".
//
// Narration public/audio/s8.wav is 10.71s. Measured pauses (silencedetect):
//   0.00–2.36s  "Your provider's routers don't know where moodle.com is either." (f 0–71)
//   2.70–3.61s  "Each one just knows"                                             (f 81–108)
//   4.20–7.81s  "which neighbor gets it closer — and passes it on."              (f 126–234)
//   8.49–9.42s  "Hop by hop,"                                                    (f 255–283)
//   9.62–10.71s "just like the note."                                           (f 289–321)
// 10.71s + 0.5s tail = 337 frames @ 30fps.
export const S8_DURATION = 337;

type P = { x: number; y: number };

const ENV_SCALE = 0.5;
// The envelope perches just above a router's top while it is there.
const PERCH_LIFT = 68;
const perch = (id: NodeId): P => {
  const a = nodeAnchor(id);
  return { x: a.x, y: a.y - PERCH_LIFT };
};

const NODE_IDS = Object.keys(NODES) as NodeId[];

const BUBBLE_TEXT = "Don't know where that is —\nbut this way's closer →";

// ---------- The envelope's journey (all along ROUTE, stopping at dst1) ----------

type Hop = {
  from: NodeId;
  to: NodeId;
  start: number; // leaves `from`
  end: number; // arrives at `to`
  arc: number;
  bubble?: { pop: number; out: number; fontSize: number }; // over `to` after arrival
};

// ROUTE = home → isp1 → isp3 → tr2 → tr3 → dst1 → server. S8 covers the first five hops.
const [HOME, ISP1, ISP3, TR2, TR3, DST1] = ROUTE as [NodeId, NodeId, NodeId, NodeId, NodeId, NodeId, NodeId];

const HOPS: Hop[] = [
  // Already moving: it just shot out of the home.
  { from: HOME, to: ISP1, start: -10, end: 44, arc: 30, bubble: { pop: 50, out: 98, fontSize: 30 } },
  // Second hop: still slow and readable.
  { from: ISP1, to: ISP3, start: 102, end: 134, arc: 45, bubble: { pop: 138, out: 186, fontSize: 30 } },
  // Then it speeds up.
  { from: ISP3, to: TR2, start: 192, end: 212, arc: 40, bubble: { pop: 213, out: 228, fontSize: 30 } },
  { from: TR2, to: TR3, start: 232, end: 250, arc: 40, bubble: { pop: 251, out: 265, fontSize: 30 } },
  // Into moodle.com's network — no bubble here; S9 does "That's mine!".
  { from: TR3, to: DST1, start: 270, end: 296, arc: 40 },
];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number, e = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: e });

const hopT = (h: Hop, f: number, i: number) =>
  // First hop is already in flight when the scene starts → ease out only.
  ease(f, h.start, h.end, i === 0 ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic));

const envelopeAt = (f: number): { p: P; rot: number } => {
  for (let i = 0; i < HOPS.length; i++) {
    const h = HOPS[i];
    const next = HOPS[i + 1];
    if (!next || f < next.start) {
      if (f < h.end) {
        const t = hopT(h, f, i);
        const a = perch(h.from);
        const b = perch(h.to);
        const lift = Math.sin(Math.PI * t) * h.arc;
        // Lean into the direction of travel.
        const rot = Math.sin(Math.PI * t) * Math.sign(b.x - a.x) * 8;
        return { p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - lift }, rot };
      }
      // Parked on h.to: a little landing bounce, then a gentle bob.
      const land = Math.sin(Math.PI * ease(f, h.end, h.end + 10, Easing.linear)) * 10;
      const bob = Math.sin((f - h.end) / 9) * 3 * ease(f, h.end + 8, h.end + 20);
      const p = perch(h.to);
      return { p: { x: p.x, y: p.y + land + bob }, rot: 0 };
    }
  }
  return { p: perch(DST1), rot: 0 };
};

// ---------- Camera ----------

const OPEN: Shot = { x: NODES.home.x + 150, y: NODES.home.y - 110, zoom: 2.3, rotate: -0.6 };
const WIDE: Shot = { x: 990, y: 560, zoom: 0.98, rotate: 0.3 };
// Ends framing moodle.com's network: dst1 (with the envelope) and the server.
const END: Shot = { x: 1610, y: 500, zoom: 1.4, rotate: -0.3 };

// Follow the envelope, leading it a little (average of where it will be soon),
// framed a bit above it so the router bubble stays in shot.
const followShot = (f: number, zoom: number): Shot => {
  let x = 0;
  let y = 0;
  const N = 10;
  for (let i = 0; i < N; i++) {
    const { p } = envelopeAt(f + 6 + i);
    x += p.x;
    y += p.y;
  }
  return { x: x / N + 40, y: y / N - 70, zoom, rotate: 0 };
};

const shotAt = (f: number): Shot => {
  // Pull out from the home to the whole map.
  const pull = easedMove({ frame: f, from: OPEN, to: WIDE, start: 0, end: 46 });
  // Then follow: close for the slow hops, a bit wider once it speeds up.
  const followZoom = interpolate(f, [186, 214], [1.5, 1.2], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const follow = mixShots(pull, followShot(f, followZoom), ease(f, 44, 80));
  // Settle on moodle.com's network as the envelope reaches dst1.
  return easedMove({ frame: f, from: follow, to: END, start: 280, end: 330 });
};

// ---------- Glowing path drawn behind the envelope ----------

// Same look as NetworkMap's glowing links, but can be partial (grows with the envelope).
const GlowSeg: React.FC<{ a: P; b: P; opacity: number }> = ({ a, b, opacity }) => {
  const props = { x1: a.x, y1: a.y, x2: b.x, y2: b.y, strokeLinecap: "round" as const };
  return (
    <g opacity={opacity}>
      <line {...props} stroke={COLORS.packet} strokeWidth={26} opacity={0.3} />
      <line {...props} stroke={COLORS.ink} strokeWidth={12} />
      <line {...props} stroke={COLORS.packet} strokeWidth={7} />
    </g>
  );
};

// ---------- Scene ----------

export const S8Hops: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const env = envelopeAt(frame);

  // Other links dim as the chosen path lights up. The map dims every link not
  // in glowLinks; we draw the route's glow ourselves so it can grow along a link.
  const dim = ease(frame, 20, 70);

  // Routers light up when the envelope lands and fade after it leaves.
  const activeNodes: Partial<Record<NodeId, number>> = {};
  HOPS.forEach((h, i) => {
    const on = spring({ frame: frame - h.end, fps, config: { damping: 14 } });
    const next = HOPS[i + 1];
    const off = next ? ease(frame, next.start + 4, next.start + 24) : 0;
    activeNodes[h.to] = Math.max(0, on * (1 - off * 0.7));
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <Camera {...shotAt(frame)}>
        {/* "__route__" matches no link: it just turns on the map's dimming. */}
        <NetworkMap glowLinks={["__route__"]} glow={dim} />

        {/* The chosen line glows behind the envelope as it travels. */}
        {HOPS.map((h, i) => {
          if (frame < h.start) return null;
          const t = hopT(h, frame, i);
          const a = nodeAnchor(h.from);
          const b = pointBetween(h.from, h.to, t);
          return <GlowSeg key={i} a={a} b={b} opacity={1} />;
        })}

        {/* Redraw the routers on the path over the glow (same spot, scale and
            blink seed as NetworkMap), lit up while the envelope is there. */}
        {ROUTE.slice(0, 6).map((id) => {
          const n = NODES[id];
          const home = n.kind === "home";
          return (
            <Router
              key={id}
              variant={home ? "home" : "rack"}
              x={n.x}
              y={n.y}
              scale={home ? 0.55 : 0.6}
              active={activeNodes[id] ?? 0}
              seed={NODE_IDS.indexOf(id)}
            />
          );
        })}

        <Envelope x={env.p.x} y={env.p.y} scale={ENV_SCALE} rotate={env.rot} flip={1} />

        {/* "Don't know where that is — but this way's closer →" over each router. */}
        {HOPS.map((h, i) => {
          if (!h.bubble) return null;
          const { pop: p0, out, fontSize } = h.bubble;
          const pop =
            spring({ frame: frame - p0, fps, config: { damping: 12 } }) * (1 - ease(frame, out, out + 7, Easing.in(Easing.cubic)));
          const top = perch(h.to).y - 46;
          return <Bubble key={i} x={NODES[h.to].x + 6} y={top} text={BUBBLE_TEXT} fontSize={fontSize} pop={pop} tail="center" />;
        })}
      </Camera>
      <Audio src={staticFile("audio/s8.wav")} />
    </AbsoluteFill>
  );
};
