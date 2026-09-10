# monster-quest-0

**モンスタークエスト0 ～幻の冒険の書～**

最終更新: 2026-09-11 JST

## 現在の正式方針
- 目標プレイ時間: 約5時間
- 主要パーティ: 主人公・タロサ・ミレイ
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

## 最新スコープ調整
- 町・村のサイズは旧案より全体的に約半分程度へ圧縮する
- NPC人数も旧案より全体的に約半分程度へ圧縮する
- 既に作ったNPC会話案は捨てず、実装人物を選抜・統合して使う
- タロサ等の主要人物に会話話題を集中させず、興味がない普通の住民も入れる
- NPC人数を増やしてプレイ時間を水増ししない

## オープニング最新方針
タイトル → 「はじめから」 → 短い導入 → はじまりのまちで操作開始。

**開始直後のリセット演出・偽「ぼうけんのしょが きえました」は使わない。**
本格的なバグ・リセット系演出は後半へ回す。

詳細: `docs/OPENING_SPEC.md`

## 今の開発段階
仕様・素材整理が先行しており、本格Phaser実装前。

最初の実装目標はVertical Slice:

**タイトル → はじまりのまち → フィールド → ザコ戦 → レベルアップ → 小ダンジョン → ボス → セーブ / ロード → iPhone Safari確認**

これを製品版に近い品質まで完成させてから本編を量産する。

## 制作思想
全編を同じ密度で過剰に作り込まない。

特に丁寧にする:
- 物語の始まり
- 主人公・タロサ・ミレイ・わたべ等、主要人物の人生が交差する場面
- 終盤 / エンディング

元設定・原資料をAI独自案より優先し、Monster Quest 0独自採用と原作確定情報を混同しない。

詳細: `docs/CREATIVE_DIRECTION.md`

## NPC制作の現在地点
会話原案あり:
- はじまりのまち
- ビーエのむら
- レインランドのまち

旧設計の12人 / 15人 / 20人案はそのまま実装せず、最新方針に合わせて約半分程度へ再編集する。
次の新規制作地域は **レインランドじょう**。

詳細: `docs/NPC_SPEC.md`

## ゲーム内容の主要SPEC
- `docs/STORY_FLOW.md` — 物語全体
- `docs/OPENING_SPEC.md` — オープニング
- `docs/MAP_FLOW_SPEC.md` — マップ進行
- `docs/NPC_SPEC.md` — NPC / 会話
- `docs/BATTLE_SPEC.md` — 戦闘
- `docs/CHARACTER_GROWTH.md` — キャラクター成長
- `docs/MONSTER_SPEC.md` — 25体モンスター
- `docs/ITEM_EQUIPMENT_SPEC.md` — アイテム / 装備
- `docs/CARD_SPEC.md` — ジャンカード45枚
- `docs/AUDIO_SPEC.md` — BGM / SE
- `docs/SAVE_FLAG_SPEC.md` — セーブ / フラグ
- `docs/UI_INPUT_SPEC.md` — UI / iPhone入力
- `docs/GLITCH_SPEC.md` — 終盤異常演出

## 現在の画像方針
### レトロを維持
- フィールド
- 歩行キャラクター
- UI
- コマンド戦闘の基本表示

### 高品質化
- 戦闘背景
- 探索 / イベント背景
- 重要シーン

戦闘背景は高品質な2D JRPG / アニメ背景方向。
敵が立つ中央域は描き込みを抑え、敵・文字・UIの視認性を優先する。

## AI作業開始時
まず `docs/INDEX.md` を読む。

主要入口:
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

Claude Codeは `CLAUDE.md`、Codex等は `AGENTS.md` も読む。

## 実装契約
- `docs/EVENT_SYSTEM_SPEC.md`
- `docs/NAMING_CONVENTIONS.md`
- `docs/REPO_STRUCTURE.md`
- `docs/PERFORMANCE_BUDGET.md`
- `docs/QA_SPEC.md`
- `docs/CONTENT_MATRIX.md`
- `docs/ROADMAP.md`

## 画像アセット
画像の正式ファイル名・配置状態は `docs/ASSET_INDEX.md` と `assets/asset_catalog.json` を正本とする。

ChatGPT内で生成済みでも、PNG本体がGitHub上の正式パスに存在するまでは `IN_GITHUB` と扱わない。

## 古い仕様の扱い
以下は現行仕様として使わない:
- 約1時間プレイ
- ジャンカード20枚
- RPGJS中心
- ASRS利用
- 「ふっかつのじゅもん」という名称
- 序盤 / 起動直後の偽セーブ消失
- 旧大人数NPC案をそのまま実装する方針

矛盾時は、日付が新しいユーザー確定仕様 → `PROJECT_STATUS.md` → 各最新SPEC → 実装コード → 古い試作の順で判断する。
