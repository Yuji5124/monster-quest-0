import React from "react";
import { AbsoluteFill, Img } from "remotion";
import { IMG } from "../assets";
import { DOT, GOTHIC, MINCHO } from "../fonts";

// Step 1 確認用: §2素材が相対パスで読めることと、3書体が効いていることを1枚で見る
export const AssetCheck: React.FC = () => {
  const entries = Object.entries(IMG);
  return (
    <AbsoluteFill style={{ backgroundColor: "#222", padding: 24, color: "white" }}>
      <div style={{ display: "flex", gap: 40, fontSize: 44, marginBottom: 16 }}>
        <span style={{ fontFamily: DOT }}>DotGothic16 名も知らぬ土地</span>
        <span style={{ fontFamily: MINCHO, fontWeight: 800 }}>勇者じゃない。</span>
        <span style={{ fontFamily: GOTHIC, fontWeight: 900 }}>タロサ</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10 }}>
        {entries.map(([key, src]) => (
          <div key={key} style={{ textAlign: "center", fontFamily: GOTHIC, fontSize: 14 }}>
            <Img
              src={src}
              style={{ width: "100%", height: 150, objectFit: "contain", imageRendering: "pixelated", background: "#444" }}
            />
            <div>{key}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
