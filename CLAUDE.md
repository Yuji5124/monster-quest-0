# Claude Code Instructions - Monster Quest 0

更新日: 2026-09-09

## 作業開始前
必ず以下を読む。
1. `docs/INDEX.md`
2. `docs/PROJECT_OVERVIEW.md`
3. `docs/DECISIONS.md`
4. `docs/AI_EXECUTION_PROTOCOL.md`
5. `docs/DEV_WORKFLOW.md`
6. `docs/PHASER_ARCHITECTURE.md`
7. `docs/DATA_CONTRACTS.md`
8. 作業対象に関連する専門仕様書
9. 実装後に `docs/DEFINITION_OF_DONE.md` と `docs/QA_SPEC.md`

## 開発基盤
- Phaserを使用する
- Phaser Game Agentを基本制作基盤として使用する
- ASRSは使用しない
- 独自RPGエンジンを作らない
- 独自マップエディタを作らない

## 最重要原則
- Monster Quest 0を完成させるために実装する
- 基盤開発そのものを目的にしない
- 1タスク1目的
- 必要最小限の変更を優先する
- 確定仕様を勝手に変更しない
- `null` / `TBD` / 未確定をAI判断で正式値にしない
- 実装前に対象コード・data・assetsの実在を確認する

## Architecture
- `docs/REPO_STRUCTURE.md` に従う
- `docs/PHASER_ARCHITECTURE.md` のScene / System責務を維持する
- WorldSceneへ全イベント・戦闘・セーブ処理を詰め込まない
- エリアごとのコピペシステムを増やさない
- データで表現できる内容をコードへ直書きしない

## Data
- `docs/DATA_CONTRACTS.md` と `docs/NAMING_CONVENTIONS.md` に従う
- 表示名と内部IDを分離する
- 同一内容を複数IDで重複登録しない
- 参照切れを残さない
- 既存の確定数値とコード内数値を二重管理しない

## Events
- `docs/EVENT_SYSTEM_SPEC.md` に従う
- 宝箱、ボス、仲間加入、一度きりイベントは保存可能なflagで管理する
- イベント二重発火を防止する
- NPC一人ごとの専用if文をWorldSceneへ大量追加しない

## 実装原則
- 不明な設定を勝手に物語上の事実として確定しない
- 既存の正式画像を仮素材へ置き換えない
- 主人公、タロサ、ミレイのデザインを勝手に変更しない
- 新しいライブラリや大規模抽象化を必要以上に増やさない
- 汎用RPG制作ツール化しない
- 既存システムを再利用し、エリアごとの特殊実装を増やしすぎない
- 会話、敵、アイテム、魔法、遭遇、イベントは可能な範囲でデータ駆動にする

## 素材
- `docs/ASSET_MANIFEST.md` と `docs/CONTENT_MATRIX.md` を確認する
- 「制作済み」「GitHub配置済み」「実装済み」を混同しない
- 制作済み素材がGitHub上に実在するか、実装前にパスを確認する
- 存在しない素材ファイルをある前提でコードを書かない
- 不足素材はTODOとして明示し、ゲーム全体を仮素材へ置換しない

## 制作順
`docs/ROADMAP.md` に従いVertical Sliceを最優先する。

タイトル
→ はじまりのまち
→ フィールド
→ ザコ戦
→ レベルアップ
→ 小ダンジョン
→ ボス
→ セーブ / ロード
→ iPhone Safari確認

Vertical Slice完成前に大量の新規マップを作らない。

## モバイル / 性能
- `docs/MOBILE_SPEC.md` と `docs/PERFORMANCE_BUDGET.md` に従う
- iPhone Safariを主要ターゲットとして扱う
- タッチ操作を後付けにしない
- UIがSafe Areaや小画面で欠けないようにする
- hover依存の操作を作らない
- Scene往復や戦闘反復で負荷が増えないか確認する

## セーブ
- `docs/SAVE_SPEC.md` に従う
- セーブデータにはversionを持たせる
- Phaser内部オブジェクトを直接保存しない
- 終盤の異常演出で本当のセーブ破損を起こさない

## アート
- `docs/IMAGE_SPEC.md` に従う
- AI生成物を正式素材より優先しない
- 不足素材は必要になった時点で追加する

## QA / 完成判定
- 「コードを書いた」だけでは完成扱いしない
- `docs/DEFINITION_OF_DONE.md` を満たすまで完成と報告しない
- 節目ごとに `docs/QA_SPEC.md` を確認する
- 新機能実装後は開始→町→フィールド→戦闘→セーブの最低回帰を確認する

## 変更時
- `docs/CHANGE_CONTROL.md` に従う
- 仕様変更が必要な場合はコードだけ変更せず、関連Markdownも更新対象とする
- 既存仕様と矛盾した場合は `docs/DECISIONS.md` を優先する
- 新しい確定事項は `docs/DECISIONS.md` へ反映する
- 公開リポジトリへ重大なネタバレを書かない

## 完了報告
`docs/AI_EXECUTION_PROTOCOL.md` の形式に従い、最低限：
- 変更内容
- 実際に確認した操作
- 未確認事項
- TODO
- 更新した仕様書
を報告する。

「実装しました」の一文だけで完了しない。
