# Claude Code Instructions - モンスタークエスト0

最終更新: 2026-09-10 23:46 JST

## 最初に必ず読む
1. `docs/PROJECT_STATUS.md`
2. `docs/GAME_SPEC.md`
3. `docs/CREATIVE_DIRECTION.md`
4. `docs/AI_EXECUTION_PROTOCOL.md`
5. `docs/PHASER_ARCHITECTURE.md`
6. `docs/DATA_CONTRACTS.md`
7. 作業対象の専門SPEC
8. `docs/ASSET_INDEX.md`
9. `assets/asset_catalog.json`
10. `docs/TBD_REGISTRY.md`
11. `docs/DEFINITION_OF_DONE.md`

## 開発基盤
- Phaser 3
- Phaser Game Agent中心
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

## クリエイティブ
- 全編を同じ密度で豪華にしない
- 物語の始まり、主要人物が交差する場面、終盤・エンディングへ丁寧さを集中
- 元設定・資料をAI創作より優先
- 既存ゲームを直接コピーしない

## NPC
NPC会話は `docs/NPC_SPEC.md` に従う。
はじまりのまち → ビーエのむら → レインランドのまち → レインランドじょう → ザボンのむら → いしのむら → かくれざと → 港町ダコハ → その他、の順を基本とする。

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
