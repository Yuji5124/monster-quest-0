# monster-quest-0

**モンスタークエスト0 ～幻の冒険の書～**

最終更新: 2026-09-10 23:46 JST

## 現在の正式方針
- 目標プレイ時間: 約5時間
- 主要パーティ: 主人公・タロサ・ミレイ
- モンスター: 全25体
- ジャンカード: 全45枚 / 1回20円 / 固定順 / ダブりなし
- ジャンカードは本編攻略必須ではない独立サブゲーム
- 実装中心: Phaser 3 / Phaser Game Agent
- メイン実装: Claude Code
- レビュー / デバッグ / QA: Codex
- Astraは基本システム安定後の量産フェーズから必要に応じて使用
- ASRSは使用しない
- Webブラウザ / iPhone Safariを主要ターゲットとして扱う
- 制作目安: 80% AI + 20% 人間の視覚・テンポ調整

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
物語順に制作中。

- はじまりのまち: NPC12人 + 外出後の会話変化まで設計済み
- ビーエのむら: NPC15人 + 木こり救出事件 + 救出後会話 + レインランド誘導まで設計済み
- レインランドのまち: NPC20人 + 異変 / 王家 / ミレイ / いしのむらへの伏線まで設計済み
- 次: **レインランドじょう**

詳細: `docs/NPC_SPEC.md`

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

現在管理中の戦闘背景:
- 草原
- 森
- 森 別案
- 洞窟
- 城 / 城下町周辺
- 雪原
- 砂漠 / 遺跡
- ダンジョン
- ダンジョン 別案
- ボス戦
- ボス戦 別案

## AI作業開始時
まず `docs/INDEX.md` を読む。

主要入口:
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

矛盾時は、日付が新しいユーザー確定仕様 → `PROJECT_STATUS.md` → 各最新SPEC → 実装コード → 古い試作の順で判断する。
