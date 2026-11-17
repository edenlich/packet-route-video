import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { TestClip } from "./scenes/TestClip";
import { Sandbox } from "./dev/Sandbox";

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
