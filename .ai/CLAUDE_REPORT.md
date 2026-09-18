# No.02「はじまりのまち」作業レポート

## Unit 0 — 実装前調査

**Status: PARTIAL** — 実装の前提整理と既存回帰の確認は完了。正式素材・正式会話など、仕様上未確定の領域は実装対象にしていない。

### 変更内容

- No.02に関係する仕様、Tiled資産、Scene、マップ遷移、NPC／会話／イベント／Collisionシステム、テスト環境を調査した。
- `.ai/PROJECT_RULES.md` と `.ai/CURRENT_TASK.md` はリポジトリに存在しなかったため、追加の作業指示は適用できない。
- 以下を、以後のNo.02実装の正本として整理した。

#### 1. 現在のNo.02の状態

- `StartingTownScene` は単一画面のDEV_PLACEHOLDER外観を表示し、6棟（やどや／どうぐや／ぶきや／きょうかい／民家A／民家B）のCollisionと入口遷移を実装済み。
- 6棟の内部は共通の `InteriorScene` と `src/config/interiors.ts` で表示・退出でき、各建物前のspawnへ安全に戻る。
- NPCは正式配置ではなく、`dev_npc_test`、戦闘検証用NPC 2体のみ。会話もDEV用で、デーマス戦の配置はNo.16未実装時の検証用途。
- 現行導線は No.01 → `FieldScene` → No.02。No.01⇄No.02の直接遷移はSUPERSEDEDである。
- No.02専用の `.tmj`／Phaser Tiled読み込みは未実装。既存 `.tmj` はNo.01とTiled検証用である。

#### 2. 仕様書から読み取れる完成条件

- No.02は最初の通常拠点かつ基本導線・交易町。6施設をコンパクトに構成する。
- エリアDoneには、マップ、NPC、会話、イベント、出入口、宝箱、敵編成、BGM、固有素材、セーブ状態と、入口から出口までの通しプレイが必要。
- NPCは旧12人案を自動採用せず、最終人数・役割・台詞を再編集する。初回と町の外へ一度出た後の2パターン程度の会話を想定する。
- 価格、商品、正式会話、タイルGID、最終座標は未確定値を `null`／TBDのまま扱う。序盤からジャンカードの秘密や終盤設定を示唆しない。

#### 3. 現在不足しているもの

- No.02の正式Tiled外観、正式タイルセット／建物・NPC素材、および人間による視覚調整。
- 正式NPC人数・役割・会話、進行フラグ連動会話、No.03への正式出口。
- 宿泊、道具／武器購入、教会、宝箱、通常エンカウント、BGM、セーブ／ロード連携。
- 内部設計JSONはDESIGN_DATAであり、`src/config/interiors.ts` の現行矩形表示は同JSONを実行時に直接読み込むものではない。

#### 4. 流用できる既存システム

- `MAPS` のmapId／spawn／exit／building定義と、`beginMapTransition`／`createExitZone` による入力ロック付き遷移。
- `Building` のドア帯を除いたCollision、`Player`／`InputSystem` の4方向移動、`Interaction` と `DialogueBox` の会話開始・二重入力防止。
- `InteriorScene` と `INTERIORS` の共通内部表示、`GameStateRepository` の保存基盤、`BattleEventData`／`DialogueEvents` のイベント戦闘接続。
- No.01で確立済みのTiled同期・`TiledMapRuntime` は、正式No.02タイル素材と外観マップの確定後に再利用できる。

#### 5. 推奨実装順

1. 現行No.02の6棟・内部設計データ・復帰spawnの対応をテストで強化し、将来の素材／Tiled差し替え時の回帰を防ぐ。
2. 正式なNo.02外観素材・タイルサイズ・Tiledマップを人間の視覚調整とともに確定し、No.01と同じ同期／ランタイムへ接続する。
3. NPC役割と短い2段階会話を仕様として確定してから、データ駆動の会話・進行フラグを追加する。
4. 価格・商品・セーブ仕様が確定後、店／宿／教会をイベントコマンドとして追加する。
5. No.03接続、宝箱、敵編成、BGM、iPhone Safari実機を含む入口から出口までの通しQAを行う。

### 変更ファイル

- `.ai/CLAUDE_REPORT.md`（新規）

### テスト結果

- `npm test` — 120 passed / 0 failed
- `npm run typecheck` — passed
- `npm run build` — passed（Viteの既存大チャンク警告あり、build失敗なし）

### 残課題

- 正式No.02タイルセット・外観マップ、正式NPC・会話、価格／商品／各施設機能はTBD。
- iPhone Safari実機、タッチ操作、視覚・テンポ調整は未実施。

## Unit 1 — No.02内部設計データのMap ID整合

**Status: DONE** — 実行時のNo.02 mapIdと、内部設計データの親Map／6件の退出先を一致させ、復帰先の整合を自動検証する。

### 変更内容

- `no02_start_town_interiors.json` の親Map IDと6つの `exit.to` を、実行時の `map_02_starting_town` に統一した。
- すべての内部が、対応する建物の `frontSpawnId` へ戻ることを検証するテストを追加した。
- 価格、商品、会話、タイルGID、配置などのTBD値は変更していない。

### 変更ファイル

- `assets/maps/data/no02_start_town_interiors.json`
- `tests/interiors.test.mjs`
- `.ai/CLAUDE_REPORT.md`

### テスト結果

- 関連テスト（`interiors` / `buildings` / `maps` / `roughField`） — 32 passed / 0 failed
- `npm test` — 122 passed / 0 failed
- `npm run typecheck` — passed
- `npm run build` — passed（既存のVite大チャンク警告のみ）

### 残課題

- 画面上のNo.02→6内部→No.02→フィールドの遷移確認と、iPhone Safari実機確認は未実施。
- 正式外観、Tiledマップ、NPC／会話、施設機能、No.03接続は引き続き未実装またはTBD。

## Unit 2 — No.02単体起動用のDEV導線

**Status: DONE** — 通常導線を変えず、No.02を実画面で安全に確認できるDEV URLを追加した。

### 変更内容

- `?mapTest=no02` で `StartingTownScene` のみを起動できるようにした。
- 既存の `?mapTest=no01` を同じ解決関数へ移し、許可する値を `no01` と `no02` に限定した。未知の値は通常起動へ戻る。
- 通常のTitle→Opening→No.01→Field→No.02導線、Scene登録、実行時マップ定義には変更を加えていない。

### 変更ファイル

- `src/config/devMapTest.ts`（新規）
- `src/main.ts`
- `tests/devMapTest.test.mjs`（新規）
- `.ai/CLAUDE_REPORT.md`

### テスト結果

- 関連テスト（DEV URL／No.02内装／建物／マップ） — 25 passed / 0 failed
- `npm test` — 123 passed / 0 failed
- `npm run typecheck` — passed
- `npm run build` — passed（既存のVite大チャンク警告のみ）
- ブラウザ: `http://127.0.0.1:5173/?mapTest=no02` でNo.02の6棟、入口、主人公、DEV NPCの描画を確認。console error 0件。

### 残課題

- DEV単体起動で確認したのは初期描画まで。6内部への実操作遷移、No.02→Field、iPhone Safariタッチは未確認。
- 見た目は正式外観ではなく既存DEV_PLACEHOLDERである。正式Tiledマップ・タイルセット、NPC／会話、施設機能、No.03接続は引き続き未実装またはTBD。
