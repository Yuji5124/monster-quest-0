# モンスタークエスト0 AI実行プロトコル

最終更新: 2026-09-11 JST

## 1. 目的
Claude Code / Codex / Phaser Game Agentが、同じ順序・同じ判断基準で安全に作業するための手順。

## 2. 作業開始前の必須読書
1. `docs/PROJECT_STATUS.md`
2. `docs/INDEX.md`
3. `docs/GAME_SPEC.md`
4. `docs/CREATIVE_DIRECTION.md`
5. `docs/STORY_FLOW.md`
6. 作業対象の専門SPEC
7. `docs/PHASER_ARCHITECTURE.md`
8. `docs/DATA_CONTRACTS.md`
9. `docs/ASSET_INDEX.md`
10. `assets/asset_catalog.json`
11. `docs/TBD_REGISTRY.md`
12. `docs/DEFINITION_OF_DONE.md`

## 3. 作業別の専門SPEC
### ストーリー / 導入
- `STORY_FLOW.md`
- `OPENING_SPEC.md`
- `MAP_FLOW_SPEC.md`
- `NPC_SPEC.md`

### 戦闘 / 成長
- `BATTLE_SPEC.md`
- `CHARACTER_GROWTH.md`
- `MONSTER_SPEC.md`
- `ITEM_EQUIPMENT_SPEC.md`

### 保存 / UI / 音
- `SAVE_FLAG_SPEC.md`
- `UI_INPUT_SPEC.md`
- `AUDIO_SPEC.md`

### 終盤
- `GLITCH_SPEC.md`
- `STORY_FLOW.md`

## 4. 作業前チェック
AIは実装前に次を確認する。
- 今回の目的
- 変更対象ファイル
- 関係する既存仕様
- 正式素材の実在パス
- 未確定事項の有無
- セーブへの影響
- iPhoneへの影響
- ストーリー順 / ネタバレへの影響
- 町 / NPC規模を不要に増やしていないか

## 5. 実装単位
一度に大きく作りすぎない。
推奨:
- 1機能
- 1画面
- 1マップ
- 1イベント群
- 1ボス
など、プレイ確認できる小さい完成単位。

## 6. Phaser Game Agentの使い方
- Game Agentを実装中心に使う
- 大枠をAIで作る
- 見た目は人間が20%調整する前提で作る
- Game Agentが生成した仮画像よりGitHubの正式素材を優先する
- 既存の共通システムを再利用する
- 町 / NPCを自動的に大規模化しない

## 7. 最新の重要制約
- 目標プレイ時間は約5時間
- 町・村サイズとNPC人数は旧案より全体的に約半分程度へ圧縮
- 旧12人 / 15人 / 20人案をそのまま実装しない
- NPC全員を主要人物の説明役にしない
- タロサ関連地域でも全員がタロサを話題にしない
- 序盤 / 起動直後にリセット・偽セーブ消失を使わない
- ジャンカードは45枚、1回20円、No.01→45固定順、ランダムではない、ダブりなし

## 8. 不明点の扱い
### 既存仕様で答えがある
仕様を優先して実装する。

### 未確定だが実装を進められる
`null` / placeholder / TODOで明示し、勝手に確定しない。

### 未確定で進行を左右する
`TBD_REGISTRY.md` に記録し、その部分だけBLOCKEDとして扱う。
他の独立作業は進める。

## 9. コード変更ルール
- 不要な全面リファクタリングをしない
- 新規依存追加は必要最小限
- 既存正式素材を削除・再生成しない
- コードとMarkdownの仕様を乖離させない
- 新規データは `DATA_CONTRACTS.md` に合わせる
- イベントは `EVENT_SYSTEM_SPEC.md` に合わせる
- セーブ / フラグは `SAVE_FLAG_SPEC.md` に合わせる
- 入力は `UI_INPUT_SPEC.md` に合わせる
- 戦闘ロジックは `BATTLE_SPEC.md` に合わせる

## 10. 実装後の最低確認
- 起動
- 変更機能
- タイトル→導入→町→フィールドの最低回帰
- 関係する場合は戦闘
- 関係する場合はセーブ / ロード
- iPhone想定レイアウト / タッチ
- コンソールエラー
- 仕様と実装の差分

## 11. 人間による20%調整
AIはマップ・UI・キャラクター表示を機能完成させた後、以下を人間が調整できる状態にする。
- 木 / 道 / 建物位置
- 余白
- 装飾密度
- キャラクターの見え方
- UI間隔
- 会話テンポ
- 戦闘演出テンポ

人間の調整箇所を複雑なコードへ埋め込まない。

## 12. 完了報告
必ず以下を簡潔に示す。
- 変更内容
- 変更ファイル
- 検証した内容
- `DONE / PARTIAL / BLOCKED`
- 残TODO
- 新たに不足した素材 / 未確定事項

## 13. Codexの役割
Codexは基本的に節目のQA / レビュー担当。
- バグ
- セーブ
- 戦闘
- イベント二重発火
- iPhone Safari
- パフォーマンス
- 仕様逸脱
を重点確認する。

Claude Codeと同じ箇所を同時に大改修しない。

## 14. Astra
基本システム安定後の量産フェーズで使用する。
担当をエリアまたは機能で分離し、同じファイル群を複数エージェントへ同時編集させない。

## 15. 最重要
目的は高度なAI開発環境を作ることではなく、**モンスタークエスト0を短期間で、綺麗に、最後まで完成させること**。
