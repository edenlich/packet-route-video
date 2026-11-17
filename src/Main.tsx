import React from "react";
import { Series } from "remotion";
import { S1Room, S1_DURATION } from "./scenes/S1Room";
import { S2Dive, S2_DURATION } from "./scenes/S2Dive";
import { S3Question, S3_DURATION } from "./scenes/S3Question";
import { S4Note, S4_DURATION } from "./scenes/S4Note";
import { S5BackToRequest, S5_DURATION } from "./scenes/S5BackToRequest";
import { S6DNS, S6_DURATION } from "./scenes/S6DNS";
import { S7HomeRouter, S7_DURATION } from "./scenes/S7HomeRouter";
import { S8Hops, S8_DURATION } from "./scenes/S8Hops";
import { S9Arrival, S9_DURATION } from "./scenes/S9Arrival";

// The full video: every scene in order. Each scene owns its length
// (SN_DURATION), so Main never needs editing when a scene grows or shrinks.
export const SCENES = [
  { id: "S1Room", component: S1Room, duration: S1_DURATION },
  { id: "S2Dive", component: S2Dive, duration: S2_DURATION },
  { id: "S3Question", component: S3Question, duration: S3_DURATION },
  { id: "S4Note", component: S4Note, duration: S4_DURATION },
  { id: "S5BackToRequest", component: S5BackToRequest, duration: S5_DURATION },
  { id: "S6DNS", component: S6DNS, duration: S6_DURATION },
  { id: "S7HomeRouter", component: S7HomeRouter, duration: S7_DURATION },
  { id: "S8Hops", component: S8Hops, duration: S8_DURATION },
  { id: "S9Arrival", component: S9Arrival, duration: S9_DURATION },
] as const;

export const MAIN_DURATION = SCENES.reduce((sum, s) => sum + s.duration, 0);

export const Main: React.FC = () => {
  return (
    <Series>
      {SCENES.map(({ id, component: Scene, duration }) => (
        <Series.Sequence key={id} name={id} durationInFrames={duration}>
          <Scene />
        </Series.Sequence>
      ))}
    </Series>
  );
};
