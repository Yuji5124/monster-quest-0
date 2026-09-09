# AI Agent Instructions - Monster Quest 0

更新日: 2026-09-09

このリポジトリを扱うClaude Code、Codex、その他AIエージェント共通のルール。

## 最初に読む
1. `docs/INDEX.md`
2. `docs/PROJECT_OVERVIEW.md`
3. `docs/DECISIONS.md`
4. `docs/AI_EXECUTION_PROTOCOL.md`
5. `docs/DEV_WORKFLOW.md`
6. `docs/PHASER_ARCHITECTURE.md`
7. `docs/DATA_CONTRACTS.md`
8. 作業対象の専門仕様書
9. 実装後に `docs/DEFINITION_OF_DONE.md` / `docs/QA_SPEC.md`

## Source of Truth
仕様が矛盾した場合の優先順位：
1. `docs/DECISIONS.md`
2. 各専門仕様書
3. `docs/PROJECT_OVERVIEW.md`
4. `docs/CONTENT_MATRIX.md` の状態
5. 実装コード
6. 古いコメント・過去資料

## 共通ルール
- Phaserを使用する
- Phaser Game Agent中心で制作する
- ASRSを使用しない
- 汎用RPGエンジン化しない
- 独自マップエディタを作らない
- 正式素材を仮素材へ置き換えない
- 既存の確定設定を勝手に変更しない
- 未確定事項は未確定として扱う
- 新規依存関係や大規模なリファクタリングは必要最小限にする
- iPhone Safari対応を維持する
- 公開リポジトリへ重大なネタバレを書かない
- 1タスク1目的とする
- unrelated fileを大量変更しない

## Architecture / Data
- `docs/REPO_STRUCTURE.md` に従う
- `docs/PHASER_ARCHITECTURE.md` の責務分離を維持する
- `docs/DATA_CONTRACTS.md` に従う
- `docs/NAMING_CONVENTIONS.md` に従う
- データで扱える内容をSceneへ大量直書きしない
- `null` / `TBD` を勝手に正式値で埋めない

## Event
- `docs/EVENT_SYSTEM_SPEC.md` に従う
- 一度きりイベント、宝箱、ボス、加入状態は保存可能なflagで管理する
- イベント二重発火を防ぐ

## 素材ルール
- `docs/ASSET_MANIFEST.md` と `docs/CONTENT_MATRIX.md` を確認する
- 「制作済み」と「GitHubへ配置済み」と「ゲーム実装済み」を混同しない
- 実装前に実ファイル・パスを確認する
- 不足素材を発見した場合は勝手に別デザインへ置換せず、必要素材として明示する

## 役割分担
### Claude Code
- メイン実装
- Phaser Game Agent利用
- 新規エリア・イベント・システム追加
- 関連仕様書の整合確認

### Codex
- コードレビュー
- バグ修正
- セーブ / ロード検証
- 戦闘検証
- モバイル / パフォーマンスQA
- データ参照切れ / ID重複 / event二重発火の確認
- `docs/QA_SPEC.md` と `docs/DEFINITION_OF_DONE.md` に沿った回帰確認

## 並列作業
- 同じファイル群を複数エージェントが同時に大きく変更しない
- 機能単位・エリア単位で担当を分離する
- Astraは基本システム完成後の量産フェーズから使用する
- 並列化でコード重複や仕様分岐が発生した場合は速度より整合性を優先する

## モバイル / 性能
- `docs/MOBILE_SPEC.md` と `docs/PERFORMANCE_BUDGET.md` に従う
- PCで動くことだけを完了条件にしない
- Scene往復 / 連続戦闘 / メニュー開閉で負荷増大を確認する

## 仕様変更
- `docs/CHANGE_CONTROL.md` に従う
- コードとMarkdownを乖離させない
- 新しく確定した重要事項は `docs/DECISIONS.md` に追記する
- 過去仕様を残す必要がある場合は `DEPRECATED` / 旧仕様と分かるようにする
- Level C相当のゲーム仕様変更をAIが独断で確定しない

## 完成基準
- 「コードが存在する」ではなく `docs/DEFINITION_OF_DONE.md` を満たして完成扱いする
- 進捗は「素材数」ではなく「製品版品質で通して遊べる時間」で判断する
- Vertical Slice完成までは `docs/ROADMAP.md` の順序を優先する

## 完了報告
`docs/AI_EXECUTION_PROTOCOL.md` に従い、
- 変更
- 確認
- 未確認
- TODO
- 仕様書更新
を明示する。
