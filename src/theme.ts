import { loadFont } from "@remotion/google-fonts/Fredoka";

// Shared look for every scene (see SCRIPT.md → Style guide).

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

export const COLORS = {
  // Base palette from the style guide.
  ink: "#2B2B2B", // outlines
  background: "#FFF4E0", // cream
  wood: "#C68B59",
  wall: "#F2D7B6",
  packet: "#FF7A59", // note / envelope accent
  network: "#3FA7D6", // router / network accent

  // One flat shadow tone per base color (cel shading, no gradients).
  woodShade: "#A87148",
  wallShade: "#E0C29F",
  packetShade: "#D9583A",
  networkShade: "#2C86B0",
  backgroundShade: "#F0E2C8",

  // Reply envelope (Scene 9) — the page travelling back.
  reply: "#7CC47F",
  replyShade: "#5EA562",

  // Extras for characters and props, kept warm to match.
  skin: "#F5C9A0",
  skinShade: "#DDA97F",
  hair: "#4A3428",
  hairShade: "#382519",
  shirt: "#5B8C85",
  shirtShade: "#467069",
  pants: "#4A5A7A",
  pantsShade: "#3A4862",
  shoe: "#3B2F2A",
  chair: "#3D3F4A",
  chairShade: "#2C2E37",
  metal: "#9AA0A8",
  metalShade: "#7A8088",
  lampLight: "#FFE7A8",
  screenGlow: "#CFEFFF",
  white: "#FFFFFF",
} as const;

// Outline width in px (style guide: 3–4 px).
export const OUTLINE = 4;
export const OUTLINE_THIN = 3;

// Common props for an outlined flat shape.
export const outlined = {
  stroke: COLORS.ink,
  strokeWidth: OUTLINE,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

const fredoka = loadFont("normal", {
  weights: ["500", "600"],
  subsets: ["latin"],
});

export const FONT = fredoka.fontFamily;
