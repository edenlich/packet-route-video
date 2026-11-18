import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Shot, easedMove, mixShots } from "../components/Camera";
import { Envelope, IP_LABEL, NAME_LABEL } from "../components/Envelope";
import { Server } from "../components/Server";
import { Shape, circ, rr } from "../components/Shape";
import { COLORS, FONT, OUTLINE_THIN, VIDEO } from "../theme";
import { SideView } from "./S1Room";

// Scene 6 — Name to address: DNS. See SCRIPT.md → "Scene 6".
// Opens where S5 ends: the side view of the desk, the envelope hovering beside
// the laptop with the label "moodle.com". A "?" pops up by the label, a question
// card leaves the laptop, the camera whips after it to a DNS server (in an
// abstract space — the trip itself is never shown), the server flips through its
// address book and sends back a card with the number, the camera whips back and
// the envelope's label flips moodle.com → 203.0.113.7.

// Narration public/audio/s6.wav is 12.29s. Beats (frames @ 30fps):
//   0–60    "Just like checking where your friend sits,"
//   70–126  "your computer first needs an address."
//   144–155 "'moodle.com'"
//   163–238 "is only a name — so it asks a DNS server"
//   240–314 "to translate it into a number:"
//   329–369 "an IP address."
export const S6_DURATION = 390;

type SideViewState = React.ComponentProps<typeof SideView>["t"];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number, easing = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: [number, number], b: [number, number], t: number): [number, number] => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
];

// ---------- Timeline ----------
const QUESTION_POP = 108; // "?" next to the label, on "…needs an address"
const SHRUG = 160; // little tilt on "only a name"
const CARD_OUT = 182; // question card leaves the laptop, on "so it asks…"
const WHIP_OUT: [number, number] = [216, 228];
const CARD_ARRIVE = 246; // question card hovers by the DNS server
const CARD_IN_BOOK: [number, number] = [254, 266];
const BOOK_FLIP: [number, number] = [262, 292];
const ANSWER_POP = 290; // on "…into a number"
const ANSWER_LEAVE: [number, number] = [302, 322];
const WHIP_BACK: [number, number] = [312, 324];
const ANSWER_LAND = 334;
const LABEL_FLIP: [number, number] = [337, 356]; // on "an IP address"

// ---------- Room set (S1's side view) ----------
// Laptop state carried over from S1/S5: URL typed, Enter pressed, the page
// still loading — it's waiting for the answer.
const sideState = (frame: number): SideViewState => ({
  typed: NAME_LABEL,
  caret: false,
  enterDown: 0,
  flash: 0,
  // Creeps while waiting, then finishes as the scene hands over to S7
  // (which opens with the page fully loaded).
  loading: interpolate(frame, [0, LABEL_FLIP[1], S6_DURATION - 1], [0.72, 0.8, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  }),
  nearLift: 22,
  nearDip: 0,
  farDip: 0,
});

// Envelope hovers above, between the person's face and the screen.
// Matches S5's end state (ENVELOPE_REST / ENVELOPE_SCALE / FINAL_SHOT in S5BackToRequest).
const ENV: [number, number] = [1385, 268];
const ENV_SCALE = 0.8;
const LABEL_POS: [number, number] = [ENV[0], ENV[1] + 22 * ENV_SCALE];
// S7's opening state: the envelope glides here after the flip, settling still.
const ENV_END: [number, number] = [1540, 290];
const ENV_END_SCALE = 0.7;
const ENV_END_ROTATE = -3;
const SETTLE: [number, number] = [LABEL_FLIP[1] + 4, S6_DURATION - 1];
const SCREEN_CENTER: [number, number] = [1468, 506];

// Room camera.
const ROOM_START: Shot = { x: 1420, y: 435, zoom: 1.75, rotate: -0.4 };
const ROOM_HOLD: Shot = { x: 1405, y: 410, zoom: 1.88, rotate: -0.6 };
const ROOM_OUT: Shot = { x: 1660, y: 360, zoom: 1.55, rotate: 0.6 };
const ROOM_LAND: Shot = { x: 1390, y: 300, zoom: 2.3, rotate: -0.3 };
// S7's opening camera.
const ROOM_END: Shot = { x: 1530, y: 470, zoom: 1.4, rotate: 0 };

const roomShot = (f: number): Shot => {
  if (f < CARD_OUT - 4) return easedMove({ frame: f, from: ROOM_START, to: ROOM_HOLD, start: 0, end: 170 });
  if (f < WHIP_BACK[0]) return easedMove({ frame: f, from: ROOM_HOLD, to: ROOM_OUT, start: CARD_OUT - 4, end: WHIP_OUT[1] });
  const land = easedMove({ frame: f, from: ROOM_OUT, to: ROOM_LAND, start: WHIP_BACK[1] - 4, end: ANSWER_LAND + 4 });
  return mixShots(land, ROOM_END, ease(f, LABEL_FLIP[1] - 4, SETTLE[1], Easing.inOut(Easing.sin)));
};

// ---------- DNS set (abstract space, "somewhere out there") ----------
const SERVER_POS: [number, number] = [1200, 900];
const SERVER_SCALE = 1.15;
// Address book centre (Server.tsx: book centre is at local y = -H + 155).
const BOOK_POS: [number, number] = [SERVER_POS[0], SERVER_POS[1] - 185 * SERVER_SCALE];
const QUESTION_HOVER: [number, number] = [640, 470];
const ANSWER_HOVER: [number, number] = [1200, 410];

const DNS_IN: Shot = { x: 700, y: 520, zoom: 1.15, rotate: 0.5 };
const DNS_MEET: Shot = { x: 990, y: 600, zoom: 1.3, rotate: 0 };
const DNS_FLIP: Shot = { x: 1120, y: 610, zoom: 1.45, rotate: -0.4 };
const DNS_LEAVE: Shot = { x: 820, y: 500, zoom: 1.28, rotate: 0.4 };

const dnsShot = (f: number): Shot => {
  const a = easedMove({ frame: f, from: DNS_IN, to: DNS_MEET, start: WHIP_OUT[0], end: CARD_ARRIVE + 6 });
  const b = mixShots(a, DNS_FLIP, ease(f, CARD_ARRIVE + 6, ANSWER_POP + 4));
  return mixShots(b, DNS_LEAVE, ease(f, ANSWER_POP + 10, ANSWER_LEAVE[1], Easing.in(Easing.quad)));
};

// ---------- Whip-pans between the two sets ----------
// Both sets sit side by side; 0 = room on screen, 1 = DNS set on screen.
const WHIP_DISTANCE = VIDEO.width + 200;
const MAX_SMEAR = 60;
const whip = (f: number) => {
  const out = ease(f, WHIP_OUT[0], WHIP_OUT[1]);
  const back = ease(f, WHIP_BACK[0], WHIP_BACK[1]);
  const p = out - back;
  const rawOut = interpolate(f, WHIP_OUT, [0, 1], clamp);
  const rawBack = interpolate(f, WHIP_BACK, [0, 1], clamp);
  const smear = (Math.sin(Math.PI * rawOut) + Math.sin(Math.PI * rawBack)) * MAX_SMEAR;
  return { p, smear };
};

// ---------- Cards ----------
const Card: React.FC<{
  x: number;
  y: number;
  text: string;
  scale?: number;
  rotate?: number;
  opacity?: number;
  accent: string;
  fontSize?: number;
}> = ({ x, y, text, scale = 1, rotate = 0, opacity = 1, accent, fontSize = 30 }) => {
  if (scale <= 0.01 || opacity <= 0.01) return null;
  const w = text.length * fontSize * 0.54 + 84;
  const h = fontSize + 42;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`} opacity={opacity}>
      <Shape
        d={rr(-w / 2, -h / 2, w, h, 14)}
        fill={COLORS.white}
        shade={
          <>
            <rect x={-w / 2} y={h / 2 - 10} width={w} height={10} fill={COLORS.backgroundShade} />
            <rect x={-w / 2} y={-h / 2} width={22} height={h} fill={accent} />
          </>
        }
      />
      <line x1={-w / 2 + 22} y1={-h / 2 + 4} x2={-w / 2 + 22} y2={h / 2 - 4} stroke={COLORS.ink} strokeWidth={OUTLINE_THIN} />
      <text
        x={11}
        y={2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily={FONT}
        fontWeight={600}
        fontSize={fontSize}
        fill={COLORS.ink}
      >
        {text}
      </text>
    </g>
  );
};

const QUESTION_TEXT = `Where is ${NAME_LABEL}?`;

// Speed lines trailing behind a flying card (cartoon motion cue).
const SpeedLines: React.FC<{ x: number; y: number; dir: 1 | -1; t: number }> = ({ x, y, dir, t }) => {
  if (t <= 0.02) return null;
  return (
    <g opacity={t} stroke={COLORS.ink} strokeWidth={5} strokeLinecap="round">
      {[-26, 0, 26].map((dy, i) => (
        <line key={dy} x1={x - dir * (230 + i * 18)} y1={y + dy} x2={x - dir * (300 + i * 30)} y2={y + dy} />
      ))}
    </g>
  );
};

// The question card in the room: pops out of the screen, rises, then shoots
// off to the right (the trip itself stays off-screen).
const roomQuestionCard = (f: number, fps: number) => {
  const pop = spring({ frame: f - CARD_OUT, fps, config: { damping: 11 } });
  const rise = ease(f, CARD_OUT, CARD_OUT + 18, Easing.out(Easing.cubic));
  const go = ease(f, CARD_OUT + 20, WHIP_OUT[1] + 4, Easing.in(Easing.cubic));
  const p1 = lerpPt(SCREEN_CENTER, [1660, 150], rise);
  const p2 = lerpPt(p1, [2700, 130], go);
  return {
    x: p2[0],
    y: p2[1] - Math.sin(go * Math.PI) * 60,
    scale: f < CARD_OUT ? 0 : 0.25 + 0.75 * pop,
    rotate: lerp(-3, -6, go) + Math.sin(f / 6) * 1.5 * (1 - go),
    speed: go > 0.15 && go < 1 ? 1 : 0,
  };
};

// The answer card coming home from the right into the envelope's label.
const roomAnswerCard = (f: number) => {
  const t = ease(f, WHIP_BACK[0], ANSWER_LAND, Easing.out(Easing.cubic));
  const p = lerpPt([2500, 140], [LABEL_POS[0] + 6, LABEL_POS[1] - 4], t);
  const merge = ease(f, ANSWER_LAND - 5, ANSWER_LAND + 2, Easing.in(Easing.quad));
  return {
    x: p[0],
    y: p[1] - Math.sin(t * Math.PI) * 90,
    scale: 0.85 * (1 - 0.6 * merge),
    opacity: 1 - merge,
    rotate: lerp(5, 0, t),
    speed: t > 0 && t < 0.8 ? 1 - t : 0,
  };
};

// ---------- Sets ----------
const RoomSet: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  // After the flip the envelope glides to S7's opening pose and stops bobbing.
  const settle = ease(f, SETTLE[0], SETTLE[1], Easing.inOut(Easing.cubic));
  const bob = Math.sin((f / fps) * Math.PI * 0.9) * 7 * (1 - settle);
  const tilt = Math.sin((f / fps) * Math.PI * 0.6) * 2 * (1 - settle) + ENV_END_ROTATE * settle;
  const envPos = lerpPt(ENV, ENV_END, settle);
  const envScale = lerp(ENV_SCALE, ENV_END_SCALE, settle);
  // "?" pops with a little squash of the envelope.
  const boing = spring({ frame: f - QUESTION_POP, fps, config: { damping: 7, stiffness: 180 } });
  const squash = f < QUESTION_POP ? 1 : 1 + 0.08 * Math.sin(boing * Math.PI);
  // Shrug on "just a name": a quick tilt and back.
  const shrug = interpolate(f, [SHRUG, SHRUG + 8, SHRUG + 18, SHRUG + 30], [0, -7, 5, 0], {
    ...clamp,
    easing: Easing.inOut(Easing.sin),
  });
  // Label flip, with a small hop when the answer lands.
  const flip = ease(f, LABEL_FLIP[0], LABEL_FLIP[1], Easing.inOut(Easing.cubic));
  const hop = interpolate(f, [ANSWER_LAND - 2, ANSWER_LAND + 6, ANSWER_LAND + 18], [0, -16, 0], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const q = roomQuestionCard(f, fps);
  const a = roomAnswerCard(f);
  const sparkle = interpolate(f, [LABEL_FLIP[1] - 4, LABEL_FLIP[1] + 16], [0, 1], clamp);
  return (
    <g>
      <SideView t={sideState(f)} />
      <Envelope
        x={envPos[0]}
        y={envPos[1] + bob + hop}
        scale={envScale * squash}
        rotate={shrug + tilt}
        question={f >= QUESTION_POP && f < LABEL_FLIP[0] + 4}
        flip={flip}
        from={NAME_LABEL}
        to={IP_LABEL}
      />
      {/* "Got it" sparkle around the new label. */}
      {sparkle > 0 && sparkle < 1 ? (
        <g opacity={1 - sparkle} stroke={COLORS.network} strokeWidth={5} strokeLinecap="round">
          {[-160, -120, -60, -20, 20, 60, 120, 160, 200, 340].map((deg) => {
            const r = (deg * Math.PI) / 180;
            const r0 = 90 + sparkle * 32;
            return (
              <line
                key={deg}
                x1={envPos[0] + Math.cos(r) * r0}
                y1={envPos[1] + 22 * envScale + bob + Math.sin(r) * r0 * 0.55}
                x2={envPos[0] + Math.cos(r) * (r0 + 22)}
                y2={envPos[1] + 22 * envScale + bob + Math.sin(r) * (r0 + 22) * 0.55}
              />
            );
          })}
        </g>
      ) : null}
      {f >= CARD_OUT && f < WHIP_OUT[1] + 6 ? (
        <>
          <SpeedLines x={q.x} y={q.y} dir={1} t={q.speed} />
          <Card x={q.x} y={q.y} text={QUESTION_TEXT} scale={q.scale} rotate={q.rotate} accent={COLORS.packet} />
        </>
      ) : null}
      {f >= WHIP_BACK[0] && f < ANSWER_LAND + 8 ? (
        <>
          <SpeedLines x={a.x} y={a.y} dir={-1} t={a.speed} />
          <Card
            x={a.x}
            y={a.y}
            text={IP_LABEL}
            scale={a.scale}
            opacity={a.opacity}
            rotate={a.rotate}
            accent={COLORS.network}
            fontSize={34}
          />
        </>
      ) : null}
    </g>
  );
};

// Faint dashed "network" lines in the abstract space: no routers, no route —
// just a hint that the question travelled a long way.
const AbstractSpace: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {[
      `M -600 300 C 0 200, 300 520, ${BOOK_POS[0] - 160} ${BOOK_POS[1] - 40}`,
      `M -600 760 C 100 820, 500 640, ${SERVER_POS[0] - 140} ${SERVER_POS[1] - 120}`,
      `M 2600 260 C 2100 300, 1800 480, ${SERVER_POS[0] + 140} ${SERVER_POS[1] - 260}`,
    ].map((d, i) => (
      <path
        key={i}
        d={d}
        fill="none"
        stroke={COLORS.backgroundShade}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray="4 30"
        strokeDashoffset={-f * 1.5}
      />
    ))}
    {[
      [180, 180, 14],
      [420, 900, 10],
      [1700, 220, 16],
      [1820, 760, 11],
      [90, 560, 8],
    ].map(([x, y, r], i) => (
      <circle key={i} cx={x} cy={y + Math.sin(f / 24 + i) * 8} r={r} fill={COLORS.wall} />
    ))}
    {/* Ground shadow under the server. */}
    <ellipse cx={SERVER_POS[0]} cy={SERVER_POS[1] + 6} rx={190} ry={22} fill={COLORS.backgroundShade} />
  </g>
);

const DnsSet: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  // Question card flies in from the left and hovers by the server.
  const inT = ease(f, WHIP_OUT[0] - 2, CARD_ARRIVE, Easing.out(Easing.cubic));
  const intoBook = ease(f, CARD_IN_BOOK[0], CARD_IN_BOOK[1], Easing.in(Easing.cubic));
  const qHover = lerpPt([-300, 260], QUESTION_HOVER, inT);
  const qPos = lerpPt(qHover, BOOK_POS, intoBook);
  const qBob = Math.sin(f / 7) * 5 * (1 - intoBook);

  // Book flips; server glows while it looks the name up.
  const bookFlip = ease(f, BOOK_FLIP[0], BOOK_FLIP[1], Easing.inOut(Easing.sin));
  const active = interpolate(f, [CARD_IN_BOOK[0], CARD_IN_BOOK[1], ANSWER_POP + 6, ANSWER_LEAVE[0] + 4], [0, 1, 1, 0], clamp);
  // Server gives a tiny bounce when the card goes in and when the answer comes out.
  const bounce =
    interpolate(f, [CARD_IN_BOOK[1] - 2, CARD_IN_BOOK[1] + 4, CARD_IN_BOOK[1] + 12], [0, 1, 0], clamp) +
    interpolate(f, [ANSWER_POP - 2, ANSWER_POP + 4, ANSWER_POP + 12], [0, 1, 0], clamp);

  // Answer card: out of the book, up above the server, then off to the left.
  const aPop = spring({ frame: f - ANSWER_POP, fps, config: { damping: 11 } });
  const aRise = ease(f, ANSWER_POP, ANSWER_POP + 12, Easing.out(Easing.cubic));
  const aGo = ease(f, ANSWER_LEAVE[0], ANSWER_LEAVE[1], Easing.in(Easing.cubic));
  const aPos = lerpPt(lerpPt(BOOK_POS, ANSWER_HOVER, aRise), [-500, 240], aGo);

  return (
    <g>
      <AbstractSpace f={f} />
      <g transform={`translate(${SERVER_POS[0]} ${SERVER_POS[1]}) scale(${1 + bounce * 0.04} ${1 - bounce * 0.03}) translate(${-SERVER_POS[0]} ${-SERVER_POS[1]})`}>
        <Server variant="dns" x={SERVER_POS[0]} y={SERVER_POS[1]} scale={SERVER_SCALE} bookFlip={bookFlip} active={active} />
      </g>
      {f < CARD_IN_BOOK[1] ? (
        <>
          <SpeedLines x={qPos[0]} y={qPos[1]} dir={1} t={1 - ease(f, WHIP_OUT[0] + 8, CARD_ARRIVE - 4)} />
          <Card
            x={qPos[0]}
            y={qPos[1] + qBob}
            text={QUESTION_TEXT}
            scale={1 - 0.8 * intoBook}
            opacity={1 - ease(f, CARD_IN_BOOK[1] - 4, CARD_IN_BOOK[1])}
            rotate={lerp(-6, 2, inT) * (1 - intoBook)}
            accent={COLORS.packet}
          />
        </>
      ) : null}
      {f >= ANSWER_POP ? (
        <>
          <SpeedLines x={aPos[0]} y={aPos[1] - Math.sin(aGo * Math.PI) * 80} dir={-1} t={aGo > 0.1 ? 1 : 0} />
          <Card
            x={aPos[0]}
            y={aPos[1] - Math.sin(aGo * Math.PI) * 80 + Math.sin(f / 7) * 4 * (1 - aGo)}
            text={IP_LABEL}
            scale={0.2 + 0.8 * aPop}
            rotate={lerp(0, 5, aGo)}
            accent={COLORS.network}
            fontSize={34}
          />
        </>
      ) : null}
      {/* Little "found it!" tick over the book as the answer pops out. */}
      {f >= ANSWER_POP - 2 && f < ANSWER_POP + 22 ? (
        <g opacity={interpolate(f, [ANSWER_POP - 2, ANSWER_POP + 2, ANSWER_POP + 14, ANSWER_POP + 22], [0, 1, 1, 0], clamp)}>
          <Shape d={circ(BOOK_POS[0] + 120, BOOK_POS[1] - 70, 26)} fill={COLORS.reply} strokeWidth={OUTLINE_THIN} />
          <path
            d={`M ${BOOK_POS[0] + 108} ${BOOK_POS[1] - 70} l 9 10 l 16 -20`}
            fill="none"
            stroke={COLORS.white}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : null}
    </g>
  );
};

export const S6DNS: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { p, smear } = whip(frame);
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {p < 0.999 ? (
        <Camera {...roomShot(frame)} panX={-p * WHIP_DISTANCE} smear={smear}>
          <RoomSet f={frame} fps={fps} />
        </Camera>
      ) : null}
      {p > 0.001 ? (
        <Camera {...dnsShot(frame)} panX={(1 - p) * WHIP_DISTANCE} smear={smear}>
          <DnsSet f={frame} fps={fps} />
        </Camera>
      ) : null}
      <Audio src={staticFile("audio/s6.wav")} />
    </AbsoluteFill>
  );
};
