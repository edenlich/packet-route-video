import React, { useId } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { VIDEO } from "../theme";

// A camera "shot": which point of the scene is centered, how close, how tilted.
// x / y are in scene coordinates (the scene is drawn in a 1920×1080 SVG space).
export type Shot = {
  x: number;
  y: number;
  zoom: number;
  rotate: number; // degrees
};

export const FULL_SHOT: Shot = {
  x: VIDEO.width / 2,
  y: VIDEO.height / 2,
  zoom: 1,
  rotate: 0,
};

// Blend two shots. Zoom is blended in log space so push-ins feel even.
export const mixShots = (a: Shot, b: Shot, t: number): Shot => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  zoom: Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * t),
  rotate: a.rotate + (b.rotate - a.rotate) * t,
});

// Spring-eased move from one shot to another, starting at `start`.
// Use `durationInFrames` to stretch the spring to an exact length.
export const springMove = ({
  frame,
  fps,
  from,
  to,
  start = 0,
  durationInFrames,
  damping = 200,
}: {
  frame: number;
  fps: number;
  from: Shot;
  to: Shot;
  start?: number;
  durationInFrames?: number;
  damping?: number;
}): Shot => {
  const t = spring({
    frame: frame - start,
    fps,
    durationInFrames,
    config: { damping },
  });
  return mixShots(from, to, t);
};

// Eased (non-linear) move — handy for slow, constant-feeling push-ins
// where a spring would settle too early.
export const easedMove = ({
  frame,
  from,
  to,
  start,
  end,
}: {
  frame: number;
  from: Shot;
  to: Shot;
  start: number;
  end: number;
}): Shot => {
  const p = interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // easeInOutSine: gentle in, gentle out.
  const t = -(Math.cos(Math.PI * p) - 1) / 2;
  return mixShots(from, to, t);
};

// Constant subtle drift (±4 px, ±0.3°) so the camera never feels locked.
// Several slow sines with unrelated periods so it never visibly loops.
export const useDrift = (strength = 1) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const dx =
    (Math.sin(t * 0.61 + 0.4) * 0.7 + Math.sin(t * 1.07 + 2.1) * 0.3) * 4;
  const dy =
    (Math.sin(t * 0.53 + 1.3) * 0.7 + Math.sin(t * 0.97 + 0.2) * 0.3) * 4;
  const dr =
    (Math.sin(t * 0.43 + 2.7) * 0.7 + Math.sin(t * 0.89 + 1.1) * 0.3) * 0.3;
  return { dx: dx * strength, dy: dy * strength, dr: dr * strength };
};

type CameraProps = Partial<Shot> & {
  children: React.ReactNode;
  drift?: number; // 0 = locked, 1 = default drift
  background?: string;
  // Screen-space horizontal offset in px (for whip-pans between sets).
  panX?: number;
  // Horizontal motion smear (blur radius in px, 0 = sharp).
  smear?: number;
};

// Wraps a scene drawn in 1920×1080 SVG space. Centers (x, y) on screen,
// applies zoom and rotation, then adds the floating drift on top.
export const Camera: React.FC<CameraProps> = ({
  x = FULL_SHOT.x,
  y = FULL_SHOT.y,
  zoom = 1,
  rotate = 0,
  drift = 1,
  background,
  panX = 0,
  smear = 0,
  children,
}) => {
  const { dx, dy, dr } = useDrift(drift);
  const filterId = `smear${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const cx = VIDEO.width / 2;
  const cy = VIDEO.height / 2;

  // Read right-to-left: move the target to the origin, rotate + zoom,
  // put it at the screen center, then nudge by the drift and pan.
  const transform = [
    `translate(${cx + dx + panX} ${cy + dy})`,
    `rotate(${rotate + dr})`,
    `scale(${zoom})`,
    `translate(${-x} ${-y})`,
  ].join(" ");

  return (
    <svg
      width={VIDEO.width}
      height={VIDEO.height}
      viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`}
      style={{ position: "absolute", inset: 0, background }}
    >
      {smear > 0.5 ? (
        <defs>
          {/* Blur only along x: a cartoon whip smear. Region in screen space. */}
          <filter id={filterId} filterUnits="userSpaceOnUse" x={-400} y={-200} width={VIDEO.width + 800} height={VIDEO.height + 400}>
            <feGaussianBlur stdDeviation={`${smear} 0`} edgeMode="duplicate" />
          </filter>
        </defs>
      ) : null}
      <g filter={smear > 0.5 ? `url(#${filterId})` : undefined}>
        <g transform={transform}>{children}</g>
      </g>
    </svg>
  );
};
