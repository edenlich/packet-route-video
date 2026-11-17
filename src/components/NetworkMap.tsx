import React from "react";
import { COLORS, FONT } from "../theme";
import { Router } from "./Router";
import { Server } from "./Server";
import { rr } from "./Shape";

// The one network map shared by Scenes 8 and 9. Fixed layout in 1920×1080
// scene space so both scenes line up exactly (S8 ends where S9 starts).
//
//   home ─ provider network ─ other network ─ moodle.com's network ─ server
//
// Props control what glows:
//   <NetworkMap glowLinks={routeLinks(ROUTE.slice(0, 4))} />          // S8 mid-way
//   <NetworkMap glowLinks={ROUTE_LINKS} replyLinks={ROUTE_LINKS} />   // S9 end
//
// Use NODES[id] to place the envelope / bubbles / camera on a router:
//   const { x, y } = NODES.isp1;   // y = router base; top of router ≈ y - 70

export type NodeId =
  | "home"
  | "isp1"
  | "isp2"
  | "isp3"
  | "isp4"
  | "tr1"
  | "tr2"
  | "tr3"
  | "dst1"
  | "dst2"
  | "server";

type MapNode = { x: number; y: number; kind: "home" | "rack" | "server" };

export const NODES: Record<NodeId, MapNode> = {
  home: { x: 150, y: 600, kind: "home" },
  // Your provider's network
  isp1: { x: 420, y: 470, kind: "rack" },
  isp2: { x: 470, y: 800, kind: "rack" },
  isp3: { x: 700, y: 620, kind: "rack" },
  isp4: { x: 660, y: 330, kind: "rack" },
  // Another network in between
  tr1: { x: 1000, y: 360, kind: "rack" },
  tr2: { x: 1060, y: 700, kind: "rack" },
  tr3: { x: 1300, y: 520, kind: "rack" },
  // moodle.com's network
  dst1: { x: 1580, y: 420, kind: "rack" },
  dst2: { x: 1560, y: 800, kind: "rack" },
  server: { x: 1800, y: 620, kind: "server" },
};

export const linkId = (a: NodeId, b: NodeId) => `${a}-${b}`;

// Every link on the map (undirected). Link ids are "a-b" in this order.
export const LINKS: [NodeId, NodeId][] = [
  ["home", "isp1"],
  ["isp1", "isp2"],
  ["isp1", "isp3"],
  ["isp1", "isp4"],
  ["isp2", "isp3"],
  ["isp3", "isp4"],
  ["isp4", "tr1"],
  ["isp3", "tr2"],
  ["isp2", "tr2"],
  ["tr1", "tr3"],
  ["tr2", "tr3"],
  ["tr1", "tr2"],
  ["tr3", "dst1"],
  ["tr2", "dst2"],
  ["dst1", "dst2"],
  ["dst1", "server"],
];

// The path the request takes (S8 + S9). The reply goes back along it too.
export const ROUTE: NodeId[] = ["home", "isp1", "isp3", "tr2", "tr3", "dst1", "server"];

// Link ids along a list of consecutive nodes (direction-insensitive).
export const routeLinks = (nodes: NodeId[]): string[] => {
  const out: string[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const found = LINKS.find(([p, q]) => (p === a && q === b) || (p === b && q === a));
    if (found) out.push(linkId(found[0], found[1]));
  }
  return out;
};

export const ROUTE_LINKS = routeLinks(ROUTE);

// Network "clouds" drawn behind the routers.
const CLUSTERS = [
  { label: "Your provider", x: 320, y: 230, w: 500, h: 680 },
  { label: "Another network", x: 900, y: 260, w: 500, h: 560 },
  { label: "moodle.com's network", x: 1450, y: 300, w: 440, h: 600 },
];

// Where a link attaches to a node (roughly the middle of the device).
const anchor = (id: NodeId) => {
  const n = NODES[id];
  const lift = n.kind === "server" ? 110 : n.kind === "home" ? 40 : 55;
  return { x: n.x, y: n.y - lift };
};

type NetworkMapProps = {
  // Link ids that glow (request colour). Others are dimmed.
  glowLinks?: string[];
  // Link ids that glow in the reply colour (Scene 9's return trip).
  replyLinks?: string[];
  // 0 → 1: how strongly glowing links glow / others dim (animate the transition).
  glow?: number;
  // Routers that are lit up (envelope is there). Value 0 → 1.
  activeNodes?: Partial<Record<NodeId, number>>;
  showClusterLabels?: boolean;
};

export const NetworkMap: React.FC<NetworkMapProps> = ({
  glowLinks = [],
  replyLinks = [],
  glow = 1,
  activeNodes = {},
  showClusterLabels = true,
}) => {
  const anyGlow = glowLinks.length > 0 || replyLinks.length > 0;
  const dimOpacity = anyGlow ? 1 - 0.65 * glow : 1;

  return (
    <g>
      {/* Clusters */}
      {CLUSTERS.map((c) => (
        <g key={c.label}>
          <path
            d={rr(c.x, c.y, c.w, c.h, 80)}
            fill={COLORS.backgroundShade}
            stroke={COLORS.wallShade}
            strokeWidth={4}
            strokeDasharray="14 12"
          />
          {showClusterLabels ? (
            <text
              x={c.x + c.w / 2}
              y={c.y + c.h - 30}
              textAnchor="middle"
              fontFamily={FONT}
              fontWeight={600}
              fontSize={34}
              fill={COLORS.woodShade}
            >
              {c.label}
            </text>
          ) : null}
        </g>
      ))}

      {/* Links */}
      {LINKS.map(([a, b]) => {
        const id = linkId(a, b);
        const p = anchor(a);
        const q = anchor(b);
        const isGlow = glowLinks.includes(id);
        const isReply = replyLinks.includes(id);
        return (
          <g key={id}>
            <line
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              stroke={COLORS.ink}
              strokeWidth={10}
              strokeLinecap="round"
              opacity={isGlow || isReply ? 1 : dimOpacity}
            />
            <line
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              stroke={COLORS.metal}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={isGlow || isReply ? 1 : dimOpacity}
            />
            {isGlow ? <GlowLine p={p} q={q} color={COLORS.packet} glow={glow} offset={isReply ? -7 : 0} /> : null}
            {isReply ? <GlowLine p={p} q={q} color={COLORS.reply} glow={glow} offset={isGlow ? 7 : 0} /> : null}
          </g>
        );
      })}

      {/* Devices */}
      {(Object.keys(NODES) as NodeId[]).map((id, i) => {
        const n = NODES[id];
        const active = activeNodes[id] ?? 0;
        if (n.kind === "server") {
          return <Server key={id} variant="web" x={n.x} y={n.y} scale={0.55} active={active} />;
        }
        return (
          <Router
            key={id}
            variant={n.kind}
            x={n.x}
            y={n.y}
            scale={n.kind === "home" ? 0.55 : 0.6}
            active={active}
            seed={i}
          />
        );
      })}
    </g>
  );
};

// A glowing link: soft wide halo + bright core. `offset` shifts it sideways so
// request and reply glows can sit side by side on the same link.
const GlowLine: React.FC<{
  p: { x: number; y: number };
  q: { x: number; y: number };
  color: string;
  glow: number;
  offset: number;
}> = ({ p, q, color, glow, offset }) => {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (-dy / len) * offset;
  const oy = (dx / len) * offset;
  const props = { x1: p.x + ox, y1: p.y + oy, x2: q.x + ox, y2: q.y + oy, strokeLinecap: "round" as const };
  return (
    <g opacity={glow}>
      <line {...props} stroke={color} strokeWidth={26} opacity={0.3} />
      <line {...props} stroke={COLORS.ink} strokeWidth={12} />
      <line {...props} stroke={color} strokeWidth={7} />
    </g>
  );
};

// Point on the link between two route nodes, t = 0 → 1 (for moving the envelope).
export const pointBetween = (a: NodeId, b: NodeId, t: number) => {
  const p = anchor(a);
  const q = anchor(b);
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
};

export const nodeAnchor = anchor;
