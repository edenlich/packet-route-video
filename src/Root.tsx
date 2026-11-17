import { Composition, Folder } from "remotion";
import { Main, MAIN_DURATION, SCENES } from "./Main";
import { TestClip } from "./scenes/TestClip";
import { VIDEO } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={MAIN_DURATION}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
      {/* Every scene on its own, so each can be previewed alone in Studio. */}
      <Folder name="Scenes">
        {SCENES.map(({ id, component, duration }) => (
          <Composition
            key={id}
            id={id}
            component={component}
            durationInFrames={duration}
            fps={VIDEO.fps}
            width={VIDEO.width}
            height={VIDEO.height}
          />
        ))}
      </Folder>
      <Composition
        id="TestClip"
        component={TestClip}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
