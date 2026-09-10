# AI Agent Instructions - モンスタークエスト0

最終更新: 2026-09-11 08:31 JST

このファイルはCodex、Claude Code、その他AIエージェント共通の入口。

## 最初に読む
1. `docs/PROJECT_STATUS.md`
2. `docs/INDEX.md`
3. `docs/GAME_SPEC.md`
4. `docs/CREATIVE_DIRECTION.md`
5. `docs/OPENING_SPEC.md`
6. `docs/STORY_FLOW.md`
7. 作業対象の専門SPEC
8. `docs/AI_EXECUTION_PROTOCOL.md`
9. `docs/PHASER_ARCHITECTURE.md`
10. `docs/DATA_CONTRACTS.md`
11. `docs/ASSET_INDEX.md`
12. `assets/asset_catalog.json`
13. `docs/TBD_REGISTRY.md`
14. `docs/DEFINITION_OF_DONE.md`

## 共通原則
- Phaser 3 / Phaser Game Agent中心
- Claude Codeがメイン実装
- Codexはレビュー / デバッグ / QA中心
- ASRS不使用
- 初見約4時間30分 / 寄り道込み約5時間30分の完成を優先
- AI 80% + 人間20%の視覚・テンポ調整
- 正式素材優先
- 未確定事項を勝手に確定しない
- 汎用RPGエンジン化しない
- 独自マップエディタを作らない
- iPhone Safariを主要ターゲットとして扱う
- 重大な終盤ネタバレを公開資料へ露出しない

## 最新オープニング
- 主人公は男性 / 別世界の元NPC
- 旧女性勇者風主人公は使用しない
- 約5秒の短い制御された異常から開始
- No.18「はじまりのばしょ」夜版で焚き火のそばから開始
- 同一ロケーションの昼版を用意
- 直接メタ会話は禁止
- 開始直後の偽セーブ消失は不採用
- 本格バグ演出は終盤
- 始まりは通常区間より密度を高くするが、長い説明・移動距離・NPC人数で水増ししない

## 最新スコープ
- 全体ワールドマップ・主要地域配置・大枠は維持
- 町・村・城内部はコンパクト化
- ダンジョン内部もコンパクト化
- NPC人数は縮小後マップに合わせて再編集
- NPC全員を主要人物・攻略ヒントの説明役にしない
- ジャンカードは45枚 / 1回20円 / No.01→45固定順 / ランダムではない / ダブりなし

## 作業対象別SPEC
### ストーリー / マップ / NPC
- `docs/OPENING_SPEC.md`
- `docs/STORY_FLOW.md`
- `docs/MAP_FLOW_SPEC.md`
- `docs/NPC_SPEC.md`

### 戦闘 / 成長 / コンテンツ
- `docs/BATTLE_SPEC.md`
- `docs/CHARACTER_GROWTH.md`
- `docs/MONSTER_SPEC.md`
- `docs/ITEM_EQUIPMENT_SPEC.md`
- `docs/CARD_SPEC.md`

### システム / 演出
- `docs/SAVE_FLAG_SPEC.md`
- `docs/UI_INPUT_SPEC.md`
- `docs/AUDIO_SPEC.md`
- `docs/GLITCH_SPEC.md`

## 役割
### Claude Code
- メイン実装
- Phaser Game Agent利用
- 新機能 / 新エリア / イベント実装
- 関連Markdownとの整合維持

### Codex
- コードレビュー
- バグ修正
- 戦闘 / セーブ / イベント検証
- iPhone Safari / パフォーマンスQA
- 回帰テスト
- Markdown仕様との不一致検出

同じファイル群を同時に大改修しない。

## 実装ルール
- `DATA_CONTRACTS.md` に合わせる
- `EVENT_SYSTEM_SPEC.md` に合わせる
- `NAMING_CONVENTIONS.md` に合わせる
- `SAVE_FLAG_SPEC.md` に合わせる
- `UI_INPUT_SPEC.md` に合わせる
- `BATTLE_SPEC.md` に合わせる
- `PERFORMANCE_BUDGET.md` を守る
- GitHubに存在しない素材をある前提で使わない
- 仮値は仮値と明示する
- `hero_walk.png` を現行主人公へ使用しない

## 作品方針
- 全編を過剰に作り込まない
- **始まり・主要人物交差・終盤 / EDへ丁寧さを集中**
- 子どもには普通のRPG、大人には考察できる二重構造を守る
- 元設定・原資料へ敬意を払う
- AI独自の長い説明・設定追加を抑える
- NPC数・マップ面積によるプレイ時間水増しを避ける

## 並列作業
Astraは基本システム安定後の量産フェーズから使用。
エリアまたは機能で担当を分離する。

## 完成報告
`DONE / PARTIAL / BLOCKED` を使用。
「コードを書いた」だけでDONEにしない。

## 仕様の優先順位
1. 日付が新しいユーザー確定仕様
2. `docs/PROJECT_STATUS.md`
3. 各最新SPEC
4. 実装コード
5. 古い試作・コメント
