import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { CUT_COMPONENTS } from "./cuts/Cuts";
import { FilmGrain, Vignette } from "./components/Finish";
import { Subtitle } from "./components/Subtitle";
import timeline from "./data/timeline.json";

const CUTS = timeline.cuts as unknown as Record<string, [number, number]>;

// CUT04・06 はゲーム画面の枠の下に字幕を置くため少し小さく・低く
const SUB_LAYOUT: Record<string, { bottom: number; fontSize: number }> = {
  CUT04: { bottom: 52, fontSize: 46 },
  CUT06: { bottom: 52, fontSize: 46 },
};

/** v6.0 アニマティック（音声なし） */
export const Teaser: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    {Object.entries(CUTS).map(([id, [from, to]]) => {
      const C = CUT_COMPONENTS[id];
      return (
        <Sequence key={id} name={id} from={from} durationInFrames={to - from}>
          <C />
        </Sequence>
      );
    })}
    <Vignette strength={0.32} />
    <FilmGrain opacity={0.025} />
    {timeline.subtitles.map((s) => (
      <Subtitle key={s.cut} lines={s.lines} out={s.out} {...(SUB_LAYOUT[s.cut] ?? {})} />
    ))}
  </AbsoluteFill>
);
