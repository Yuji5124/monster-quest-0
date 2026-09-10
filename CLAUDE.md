# Claude Code Instructions - モンスタークエスト0

最終更新: 2026-09-11 JST

## 最初に必ず読む
1. `docs/PROJECT_STATUS.md`
2. `docs/INDEX.md`
3. `docs/GAME_SPEC.md`
4. `docs/CREATIVE_DIRECTION.md`
5. `docs/STORY_FLOW.md`
6. 作業対象の専門SPEC
7. `docs/AI_EXECUTION_PROTOCOL.md`
8. `docs/PHASER_ARCHITECTURE.md`
9. `docs/DATA_CONTRACTS.md`
10. `docs/ASSET_INDEX.md`
11. `assets/asset_catalog.json`
12. `docs/TBD_REGISTRY.md`
13. `docs/DEFINITION_OF_DONE.md`

## 開発基盤
- Phaser 3
- Phaser Game Agent中心
- Claude Codeがメイン実装
- ASRSは使用しない
- 汎用RPGエンジンを作らない
- 独自マップエディタを作らない

## 目的
高度な開発基盤を作ることではなく、約5時間の『モンスタークエスト0 ～幻の冒険の書～』を短期間で完成させる。

## 実装原則
- 小さいプレイ可能単位で作る
- Vertical Slice優先
- AI 80% / 人間の視覚・テンポ調整20%
- 正式素材を仮素材へ置換しない
- GitHub上にない素材をある前提にしない
- データ駆動を優先
- 確定設定を勝手に変更しない
- 未確定値を勝手に確定しない
- コードとMarkdownを乖離させない
- 不要な全面リファクタリングをしない
- iPhone Safariを後付けにしない

## 最新のスコープ制約
- 町・村サイズとNPC人数は旧案より全体的に約半分程度へ圧縮
- 旧12人 / 15人 / 20人のNPC案をそのまま実装しない
- 主要人物に興味がない普通の住民も入れる
- タロサ関連地域でも全員がタロサを話題にしない
- 序盤 / 起動直後にリセット演出・偽セーブ消失を使わない
- 本格バグ演出は後半
- ジャンカードは45枚 / 1回20円 / No.01→45固定順 / ランダムではない / ダブりなし

## 作業対象別SPEC
### ストーリー / マップ
- `docs/STORY_FLOW.md`
- `docs/OPENING_SPEC.md`
- `docs/MAP_FLOW_SPEC.md`
- `docs/NPC_SPEC.md`

### 戦闘 / 成長
- `docs/BATTLE_SPEC.md`
- `docs/CHARACTER_GROWTH.md`
- `docs/MONSTER_SPEC.md`
- `docs/ITEM_EQUIPMENT_SPEC.md`

### システム
- `docs/SAVE_FLAG_SPEC.md`
- `docs/UI_INPUT_SPEC.md`
- `docs/AUDIO_SPEC.md`
- `docs/GLITCH_SPEC.md`

## クリエイティブ
- 全編を同じ密度で豪華にしない
- 物語の始まり、主要人物が交差する場面、終盤・エンディングへ丁寧さを集中
- 元設定・資料をAI創作より優先
- 既存ゲームを直接コピーしない

## NPC
NPC会話は `docs/NPC_SPEC.md` に従う。
会話原案は、はじまりのまち / ビーエのむら / レインランドのまちまで存在するが、最新の小規模方針へ選抜・統合してから実装する。
次の新規制作地域はレインランドじょう。

## アセット
- `docs/ASSET_INDEX.md` が正式名の基準
- ChatGPTで生成済みでもGitHubに実ファイルがなければ `READY_TO_IMPORT`
- 正式キャラクターの外見を勝手に再生成しない
- 戦闘背景は高品質2D JRPG / アニメ背景方針

## 実装後
`docs/DEFINITION_OF_DONE.md` に従い `DONE / PARTIAL / BLOCKED` で報告する。
最低限、起動・変更機能・回帰・セーブ影響・iPhone影響・コンソールエラーを確認する。

## 終盤演出
`docs/GLITCH_SPEC.md` に従う。
実セーブ削除、本当のフリーズ、無限ループ、進行不能を絶対に演出として使わない。

## 仕様矛盾
1. 日付が新しいユーザー確定仕様
2. `docs/PROJECT_STATUS.md`
3. 各最新SPEC
4. 実装コード
5. 古い試作・コメント
の順で判断する。
