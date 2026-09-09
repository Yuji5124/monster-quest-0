# AI Agent Instructions - Monster Quest 0

更新日: 2026-09-09

このリポジトリを扱うClaude Code、Codex、その他AIエージェント共通のルール。

## 最初に読む
1. `docs/INDEX.md`
2. `docs/PROJECT_OVERVIEW.md`
3. `docs/DECISIONS.md`
4. `docs/DEV_WORKFLOW.md`
5. 作業対象の専門仕様書

## Source of Truth
仕様が矛盾した場合の優先順位：
1. `docs/DECISIONS.md`
2. 各専門仕様書
3. `docs/GAME_SPEC.md`
4. 実装コード
5. 古いコメント・過去資料

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

## 素材ルール
- `docs/ASSET_MANIFEST.md` を確認する
- 「制作済み」と「GitHubへ配置済み」を混同しない
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
- `docs/QA_SPEC.md` に沿った回帰確認

## 並列作業
- 同じファイル群を複数エージェントが同時に大きく変更しない
- 機能単位・エリア単位で担当を分離する
- Astraは基本システム完成後の量産フェーズから使用する

## 仕様変更
- コードとMarkdownを乖離させない
- 新しく確定した重要事項は `docs/DECISIONS.md` に追記する
- 過去仕様を残す必要がある場合は「旧仕様」と分かるようにする

## 完成基準
進捗は「素材数」ではなく「製品版品質で通して遊べる時間」で判断する。
Vertical Slice完成までは `docs/ROADMAP.md` の順序を優先する。
