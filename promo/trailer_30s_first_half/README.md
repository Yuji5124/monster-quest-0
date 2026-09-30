# MQ0 前半30秒予告（Remotion）

正本は `BRIEF.md`。ゲーム本体（リポジトリの src/ docs/ assets/ public/ package.json 等）は読み取り専用で、このフォルダだけで完結する。

- `npm install` → `npm run studio` でプレビュー
- Composition: `Trailer16x9`（1920×1080）/ `Trailer9x16`（1080×1920）、どちらも 30fps・900フレーム
- 素材は `src/assets.ts` でリポジトリ本体のファイルを相対パス import（コピーしない）
- フォントは `public/fonts/`（google/fonts の OFL 版TTF。ライセンス同梱）
- `qa/baseline/` … 作業前のゲーム本体 `npm test` / `npm run build` / `git status` の記録
