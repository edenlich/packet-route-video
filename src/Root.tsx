import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { TestClip } from "./scenes/TestClip";
import { Sandbox } from "./dev/Sandbox";
import { S1Room, S1_DURATION } from "./scenes/S1Room";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="TestClip"
        component={TestClip}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="S1Room"
        component={S1Room}
        durationInFrames={S1_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Sandbox"
        component={Sandbox}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
