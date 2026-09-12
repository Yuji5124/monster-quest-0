# monster-quest-0

**モンスタークエスト0 ～幻の冒険の書～**

最終更新: 2026-09-13 JST

## Phase 1-5.5 起動・タイトル・No.01歩行 / ビジュアル基準

Node.js 22.18以上を使用する。

```bash
npm install
npm run dev
```

ブラウザで `http://127.0.0.1:5173/` を開く。`BootScene` → `TitleScene`（正式ロゴ + 6項目メニュー）→「はじめから」決定で `OpeningGlitchScene`（約5秒のFC風異常演出）→ 暗転 → `StartingPlaceScene`（No.01夜の地面と焚き火のPLACEHOLDER表示）、まで遷移する。
No.01夜で方向キーによるDEV_PLACEHOLDERの4方向移動・当たり判定を確認できる。正式マップ・正式主人公素材・戦闘・NPCは未実装。No.01からのマップ遷移はない。タイトルの「はじめから」以外の5項目は決定入力を取得するのみで本体機能へは未接続。

- Phaser **3.90.0**を完全固定。既存の依存指定がなかったため今回初回導入した。
- 内部解像度は確認用の仮値 **320×240**。`src/config/display.ts` で管理し、正式解像度のTBDは維持する。
- 仮キー配列: 方向キー、Z/Enter（confirm）、X/Escape（cancel）、C（menu）。配列は `src/config/input.ts` に分離。
- タイトルロゴCURRENT: `assets/title/ChatGPT Image 2026年9月13日 05_31_34.png`。配信先 `public/assets/ui/title/mq0_title_logo.png` を更新。旧promo_026はSUPERSEDEDとして保持。
- Phase 5.5: No.01構図REFERENCEを3枚保存。正式背景TBD / 実行中はDEV_PLACEHOLDER。構図は `docs/OPENING_SPEC.md` §5に記録し、仮配置・移動・CollisionはPhase 5のまま維持する。
- タイトルメニュー6項目は `src/config/menu.ts` で管理。「つづきから」はSaveSystem未実装のためdisabled。
- 冒頭約5秒異常演出は `src/scenes/OpeningGlitchScene.ts` / `src/config/openingGlitch.ts`。新規画像素材は使わず`Graphics`/`Text`/`Camera`のみで構成。演出終了時のみNo.01夜の `StartingPlaceScene` へ接続する。
- No.01夜の仮配置・色は `src/config/startingPlace.ts` に分離。地面・焚き火はPhase 4の仮表示を維持。Phase 5では単色のDEV_PLACEHOLDERを追加し、正式主人公素材と台詞はTBDのままとする。
- 移動は仮の連続4方向・60px/秒。`src/config/player.ts`でサイズと速度を調整する。同時押しは縦優先、逆方向は相殺。焚き火・地面より上・画面端には進入できない。
- `npm test`: 入力処理・メニュー構成・異常演出ステージ設定・4方向移動のテスト。
- `npm run build`: 型チェックと本番ビルド。出力先は `dist/`。
- `npm run preview`: 本番ビルドを `http://127.0.0.1:4173/` で確認。

詳しい範囲・構成・検証結果は [Phase 1起動基盤](docs/PHASE1_BOOTSTRAP.md) / [Phase 2タイトル画面](docs/PHASE2_TITLE.md) / [Phase 3冒頭異常演出](docs/PHASE3_OPENING_GLITCH.md) / [Phase 4 No.01夜表示](docs/PHASE4_STARTING_PLACE.md) / [Phase 5 歩行・当たり判定](docs/PHASE5_PLAYER_MOVEMENT.md) / [Phase 5.5 ビジュアル基準](docs/PHASE5_5_VISUAL_BASELINE.md) を参照。

## 現在の正式方針
- 目標プレイ時間: **初見約4時間30分 / 寄り道込み約5時間30分**
- 主要パーティ: 主人公・タロサ・ミレイ
- 主人公: **男性 / 別のモンスタークエスト作品・別バージョン世界の元NPC**
- わたべ: 特殊参加 / 終盤重要人物
- モンスター: 全25体
- ジャンカード: 全45枚 / 1回20円 / No.01→45の固定順 / ダブりなし / ランダムではない
- ジャンカードは本編攻略必須ではない独立サブゲーム
- 実装中心: Phaser 3 / Phaser Game Agent
- メイン実装: Claude Code
- レビュー / デバッグ / QA: Codex
- Astraは基本システム安定後の量産フェーズから必要に応じて使用
- ASRSは使用しない
- Webブラウザ / iPhone Safariを主要ターゲットとして扱う
- 制作目安: 80% AI + 20% 人間の視覚・テンポ調整

## 正式マップ番号
2026-09-11以降、採用済み地域は **No.01〜No.20** を正式番号とする。

- No.01 はじまりのばしょ
- No.02 はじまりのまち
- No.03 ビーエのむら
- No.04 レインランドのまち
- No.05 レインランドじょう
- No.06 ザボンのむら
- No.07 いしのむら
- No.08 まじんのどうくつ
- No.09 かくれざと
- No.10 みずうみの古城
- No.11 いわやまのどうくつ
- No.12 港町ダコハ
- No.13 コタンカイムの洞窟
- No.14 ポサロ城
- No.15 ふっかつのほこら
- No.16 デーマスの塔
- No.17 ぬまちのどうくつ
- No.18 バトラスのとりで
- No.19 オロチのしろ
- No.20 最終地点

旧No.18「はじまりのばしょ」等の旧番号は使用しない。

## 現在の重点: 始まりを濃くする
最新オープニング:

**タイトル → はじめから → 約5秒の短い制御された異常 → No.01「はじまりのばしょ」夜版 → 焚き火で主人公が目覚める → 昼版／次導線 → No.02「はじまりのまち」 → フィールド**

固定ルール:
- 開始直後の偽「ぼうけんのしょが きえました」は使わない
- 導入の異常は短い伏線に限定
- 本格的な世界崩壊は終盤
- プレイヤーへ直接メタ会話しない
- 子どもには普通のRPGとして理解でき、大人には別世界・複数バージョン混線を考察できる二重構造

詳細: `docs/OPENING_SPEC.md`

## 主人公の最新設定
- 男性
- 別作品／別バージョン世界にいた元NPC
- 最初から選ばれた勇者ではない
- 世界間の異常でMQ0へ迷い込む
- 自分の出自を序盤では理解していない
- エレキテル採用

旧女性勇者風主人公と旧 `hero_walk.png` は現行主人公として使用しない。

## 世界の裏構造
Monster Quest 0には、異なるモンスタークエスト作品／バージョン由来のボス・モンスター・要素が混在する。
内部的には、**複数の世界／バージョンの断片が混ざった世界**として整理する。
ただし序盤からこの仕組みを直接説明しない。

## マップ最新方針
- 全体ワールドマップ・主要地域配置・大枠は変更しない
- 町・村・城内部は旧案よりコンパクト化
- ダンジョン内部も旧案よりコンパクト化
- NPC人数は縮小後マップと地域の役割から再調整
- No.01「はじまりのばしょ」は夜版 / 昼版の2種類
- No.02「はじまりのまち」は内部マップ設計データもGitHubで管理する

## 今の開発段階
Phaserの起動・表示・キー入力基盤、タイトル画面、冒頭約5秒異常演出、No.01夜のPLACEHOLDER表示とDEV_PLACEHOLDERの歩行・当たり判定を追加済み。本編は仕様・素材整理とマップ設計の段階。

今後の本編実装目標（今回のPhase 5.5には含めない）:

**No.01夜 → 主人公歩行 → No.02はじまりのまち → フィールド → ザコ戦 → レベルアップ → 小ダンジョン → ボス → セーブ / ロード → iPhone Safari確認**

## 制作思想
全編を同じ密度で過剰に作り込まない。
特に丁寧にするのは、**物語の始まり、主要人物が交差する場面、「もういちど」以降、終盤 / エンディング**。

元設定・原資料をAI独自案より優先し、Monster Quest 0独自採用と原作確定情報を混同しない。

## NPC制作
会話原案あり:
- No.02 はじまりのまち
- No.03 ビーエのむら
- No.04 レインランドのまち
- No.05 レインランドじょう
- No.06 ザボンのむら

旧大人数案をそのまま実装せず、コンパクト化した各地域へ必要なNPCだけ選抜・統合する。

## ゲーム内容の主要SPEC
- `docs/PROJECT_STATUS.md` — 最新状態の最優先スナップショット
- `docs/OPENING_SPEC.md` — 導入
- `docs/STORY_FLOW.md` — 物語全体
- `docs/MAP_FLOW_SPEC.md` — No.01〜20正式マップ番号
- `docs/NPC_SPEC.md` — NPC / 会話
- `docs/BATTLE_SPEC.md` — 戦闘
- `docs/CHARACTER_GROWTH.md` — 成長
- `docs/MONSTER_SPEC.md` — 25体モンスター
- `docs/ITEM_EQUIPMENT_SPEC.md` — アイテム / 装備
- `docs/CARD_SPEC.md` — ジャンカード45枚
- `docs/AUDIO_SPEC.md` — BGM / SE
- `docs/SAVE_FLAG_SPEC.md` — セーブ / フラグ
- `docs/UI_INPUT_SPEC.md` — UI / iPhone入力
- `docs/GLITCH_SPEC.md` — 異常演出

## AI作業開始時
まず `docs/INDEX.md` と `docs/PROJECT_STATUS.md` を読む。
Claude Codeは `CLAUDE.md`、Codex等は `AGENTS.md` も読む。

## 古い仕様の扱い
現行仕様として使わない:
- 約1時間プレイ
- ジャンカード20枚 / 40枚
- RPGJS中心
- ASRS利用
- 「ふっかつのじゅもん」
- 起動直後の偽セーブ消失
- 旧女性勇者風主人公
- 「導入には一切異常を使わない」旧方針
- 旧マップ番号
- ジャンカードの秘密を序盤から本編NPCが前面に出す旧案

矛盾時は、日付が新しいユーザー確定仕様 → `PROJECT_STATUS.md` → 各最新SPEC → 実装コード → 古い試作の順で判断する。
