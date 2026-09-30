import React from "react";
import { Composition, Folder } from "remotion";
import { DURATION, FPS, TALL, WIDE } from "./constants";
import { Trailer } from "./Trailer";
import "./fonts";
import { AssetCheck } from "./tests/AssetCheck";
import { TestA, TestB, TestC, TestD, TestE, TestF, TestG, TestH, TestI, TestJ, TestK, TestL, TestM } from "./tests/EffectTests";

// Step 4 の部品テスト: [id, component, 長さ(f), 縦型も作るか]
const TESTS: Array<[string, React.FC, number, boolean]> = [
  ["A-KineticTitle", TestA, 90, true],
  ["B-Parallax25D", TestB, 75, false],
  ["C-ZoomThrough", TestC, 45, false],
  ["D-Triptych", TestD, 60, true],
  ["E-GameWindow", TestE, 75, true],
  ["F-GlitchFlash", TestF, 60, false],
  ["G-SpeedRamp", TestG, 45, false],
  ["H-ImpactFrame", TestH, 60, false],
  ["I-PixelToHD", TestI, 60, false],
  ["J-NameCard", TestJ, 80, true],
  ["K-Frame43", TestK, 60, true],
  ["L-Finish", TestL, 75, false],
  ["M-LogoSlam", TestM, 90, true],
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Trailer16x9"
        component={Trailer}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDE.width}
        height={WIDE.height}
        defaultProps={{ orientation: "wide" as const }}
      />
      <Composition
        id="Trailer9x16"
        component={Trailer}
        durationInFrames={DURATION}
        fps={FPS}
        width={TALL.width}
        height={TALL.height}
        defaultProps={{ orientation: "tall" as const }}
      />
      <Folder name="Tests">
        <Composition id="Test-AssetCheck" component={AssetCheck} durationInFrames={1} fps={FPS} width={WIDE.width} height={WIDE.height} />
        {TESTS.map(([id, C, dur, tall]) => (
          <React.Fragment key={id}>
            <Composition id={`Test-${id}`} component={C} durationInFrames={dur} fps={FPS} width={WIDE.width} height={WIDE.height} />
            {tall && <Composition id={`Test-${id}-Tall`} component={C} durationInFrames={dur} fps={FPS} width={TALL.width} height={TALL.height} />}
          </React.Fragment>
        ))}
      </Folder>
    </>
  );
};
