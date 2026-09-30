import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { CUT_COMPONENTS } from "./cuts/Cuts";
import { FilmGrain, Letterbox, Vignette } from "./components/Finish";
import { easeInOut, lerp } from "./components/util";
import timeline from "./data/timeline.json";

export type Orientation = "wide" | "tall";

const CUT = timeline.cuts as unknown as Record<string, [number, number]>;

/** C03でシネスコ帯が閉じ、C04で開く */
const CinemaBars: React.FC = () => {
  const frame = useCurrentFrame();
  const [c3a] = CUT.C03;
  const [c4a, c4b] = CUT.C04;
  const amount = frame < c4a ? lerp(frame, [c3a, c3a + 36], [0, 1], easeInOut) : lerp(frame, [c4a + 4, c4b - 6], [1, 0], easeInOut);
  return <Letterbox amount={amount} />;
};

export const Trailer: React.FC<{ orientation: Orientation }> = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {Object.entries(CUT).map(([id, [from, to]]) => {
        const C = CUT_COMPONENTS[id];
        return (
          <Sequence key={id} name={id} from={from} durationInFrames={to - from}>
            <C />
          </Sequence>
        );
      })}
      <CinemaBars />
      <Vignette strength={0.35} />
      <FilmGrain opacity={0.03} />
      {/* BGM・SE・環境音は audio/mix.py で1本にミックス（-14 LUFS）したものを使う */}
      <Audio src={staticFile("audio/trailer_mix.wav")} />
    </AbsoluteFill>
  );
};
