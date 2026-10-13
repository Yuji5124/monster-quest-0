// BRIEF.md §5: Google Fonts（OFL）の3書体のみを使う。
// ネットワーク依存でレンダーが不安定になるのを避けるため、google/fonts リポジトリのTTFを
// public/fonts/ に同梱し（ライセンスは同フォルダの OFL_*.txt）、FontFace API で読み込む。
import { continueRender, delayRender, staticFile } from "remotion";

export const DOT = "MQ0 DotGothic16";
export const MINCHO = "MQ0 Shippori Mincho B1";
export const GOTHIC = "MQ0 Noto Sans JP";

const faces: Array<[string, string, FontFaceDescriptors]> = [
  [DOT, "fonts/DotGothic16-Regular.ttf", { weight: "400" }],
  [MINCHO, "fonts/ShipporiMinchoB1-ExtraBold.ttf", { weight: "800" }],
  [GOTHIC, "fonts/NotoSansJP-VariableFont_wght.ttf", { weight: "100 900" }],
];

const handle = delayRender("Loading MQ0 trailer fonts");
Promise.all(
  faces.map(async ([family, file, desc]) => {
    const face = new FontFace(family, `url('${staticFile(file)}') format('truetype')`, desc);
    await face.load();
    document.fonts.add(face);
  }),
)
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error(err);
    continueRender(handle);
    throw err;
  });
