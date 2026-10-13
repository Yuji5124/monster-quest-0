import React from "react";
import { Composition } from "remotion";
import { DURATION, FPS, WIDE } from "./constants";
import { Teaser } from "./Teaser";
import "./fonts";

export const RemotionRoot: React.FC = () => (
  <Composition id="Teaser16x9" component={Teaser} durationInFrames={DURATION} fps={FPS} width={WIDE.width} height={WIDE.height} />
);
