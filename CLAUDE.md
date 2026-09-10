# Claude Code Instructions - モンスタークエスト0

最終更新: 2026-09-11 08:31 JST

## 最初に必ず読む
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

## 開発基盤
- Phaser 3
- Phaser Game Agent中心
- Claude Codeがメイン実装
- ASRSは使用しない
- 汎用RPGエンジンを作らない
- 独自マップエディタを作らない

## 目的
高度な開発基盤を作ることではなく、**初見約4時間30分 / 寄り道込み約5時間30分**の『モンスタークエスト0 ～幻の冒険の書～』を短期間で完成させる。

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

## 最新オープニング制約
- 主人公は**男性 / 別世界の元NPC**
- 旧女性勇者風主人公を使わない
- タイトル → はじめから → **約5秒の短い制御された異常** → No.18「はじまりのばしょ」夜版
- 主人公は焚き火のそばで目覚める
- 「はじまりのばしょ」は夜版 / 昼版
- 直接メタ会話をしない
- 開始直後の偽セーブ消失は使わない
- 本格世界崩壊は終盤
- 始まりは通常地域より丁寧に作るが、長いムービー・説明文にはしない

## 最新スコープ制約
- 全体ワールドマップ・主要地域配置・大枠は維持
- 町・村・城内部は旧案よりコンパクト化
- ダンジョン内部も旧案よりコンパクト化
- 旧12人 / 15人 / 20人等のNPC案をそのまま実装しない
- NPC人数はマップ規模と役割から再調整
- 主要人物に興味がない普通の住民も入れる
- タロサ関連地域でも全員がタロサを話題にしない
- ジャンカードは45枚 / 1回20円 / No.01→45固定順 / ランダムではない / ダブりなし

## 作業対象別SPEC
### ストーリー / マップ
- `docs/OPENING_SPEC.md`
- `docs/STORY_FLOW.md`
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
- **物語の始まり**、主要人物が交差する場面、終盤・エンディングへ丁寧さを集中
- 始まりの密度は演出・風景・音・短い操作で作る
- 元設定・資料をAI創作より優先
- 子どもには普通のRPG、大人には考察できる二重構造を守る
- 既存ゲームを直接コピーしない

## アセット
- `docs/ASSET_INDEX.md` が正式名の基準
- ChatGPTで生成済みでもGitHubに実ファイルがなければ `READY_TO_IMPORT`
- 旧 `hero_walk.png` はSUPERSEDED。現行主人公に使用しない
- 最新男性主人公の正式素材が未確定なら不足として報告する
- 戦闘背景は高品質2D JRPG / アニメ背景方針

## 実装後
`docs/DEFINITION_OF_DONE.md` に従い `DONE / PARTIAL / BLOCKED` で報告する。
最低限、起動・変更機能・回帰・セーブ影響・iPhone影響・コンソールエラーを確認する。

## 終盤演出
`docs/GLITCH_SPEC.md` に従う。
実セーブ削除、本当のフリーズ、無限ループ、進行不能を絶対に演出として使わない。
導入の約5秒異常は、終盤演出とは別の短い伏線として扱う。

## 仕様矛盾
1. 日付が新しいユーザー確定仕様
2. `docs/PROJECT_STATUS.md`
3. 各最新SPEC
4. 実装コード
5. 古い試作・コメント
の順で判断する。
