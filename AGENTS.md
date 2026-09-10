# AI Agent Instructions - モンスタークエスト0

最終更新: 2026-09-10 23:46 JST

このファイルはCodex、Claude Code、その他AIエージェント共通の入口。

## 最初に読む
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

## 共通原則
- Phaser 3 / Phaser Game Agent中心
- ASRS不使用
- 約5時間の完成を優先
- AI 80% + 人間20%の視覚・テンポ調整
- 正式素材優先
- 未確定事項を勝手に確定しない
- 汎用RPGエンジン化しない
- 独自マップエディタを作らない
- iPhone Safariを主要ターゲットとして扱う
- 重大な終盤ネタバレを公開資料へ露出しない

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

同じファイル群を同時に大改修しない。

## 実装ルール
- `DATA_CONTRACTS.md` に合わせる
- `EVENT_SYSTEM_SPEC.md` に合わせる
- `NAMING_CONVENTIONS.md` に合わせる
- `PERFORMANCE_BUDGET.md` を守る
- GitHubに存在しない素材をある前提で使わない
- 仮値は仮値と明示する

## 作品方針
- 全編を過剰に作り込まない
- 重要場面へ丁寧さを集中する
- 元設定・原資料へ敬意を払う
- AI独自の長い説明・設定追加を抑える

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
