import { loadFont } from "@remotion/google-fonts/Nunito";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const { fontFamily } = loadFont("normal", {
  weights: ["800"],
  subsets: ["latin"],
});

const COLORS = {
  background: "#FFF4E0",
  ink: "#2B2B2B",
  accent: "#FF7A59",
};

export const TestClip: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title: fade + spring in over the first second.
  const enter = spring({
    frame,
    fps,
    durationInFrames: fps,
    config: { damping: 12 },
  });
  const titleOpacity = interpolate(frame, [0, fps], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(enter, [0, 1], [40, 0]);
  const titleScale = interpolate(enter, [0, 1], [0.9, 1]);

  // Folded-paper square: gentle sine drift.
  const t = frame / fps;
  const driftY = Math.sin(t * Math.PI * 0.8) * 14;
  const driftX = Math.sin(t * Math.PI * 0.5) * 8;
  const tilt = Math.sin(t * Math.PI * 0.6) * 6;
  const paperOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.background,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 80,
      }}
    >
      <h1
        style={{
          fontFamily,
          fontWeight: 800,
          fontSize: 110,
          color: COLORS.ink,
          margin: 0,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px) scale(${titleScale})`,
        }}
      >
        How a Request Finds Its Way
      </h1>

      <div
        style={{
          opacity: paperOpacity,
          transform: `translate(${driftX}px, ${driftY}px) rotate(${tilt}deg)`,
        }}
      >
        <FoldedPaper size={120} />
      </div>

      <Audio src={staticFile("audio/test.wav")} />
    </AbsoluteFill>
  );
};

const FoldedPaper: React.FC<{ size: number }> = ({ size }) => {
  const fold = size * 0.3;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ filter: "drop-shadow(0 10px 12px rgba(43,43,43,0.18))" }}
    >
      {/* Square with the top-right corner folded down. */}
      <path
        d={`M 0 8 Q 0 0 8 0 L ${size - fold} 0 L ${size} ${fold} L ${size} ${size - 8} Q ${size} ${size} ${size - 8} ${size} L 8 ${size} Q 0 ${size} 0 ${size - 8} Z`}
        fill={COLORS.accent}
      />
      {/* The folded flap, slightly darker. */}
      <path
        d={`M ${size - fold} 0 L ${size - fold} ${fold} L ${size} ${fold} Z`}
        fill="#D9583A"
      />
      {/* Subtle crease across the paper. */}
      <line
        x1={0}
        y1={size}
        x2={size}
        y2={0}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={2}
      />
    </svg>
  );
};
