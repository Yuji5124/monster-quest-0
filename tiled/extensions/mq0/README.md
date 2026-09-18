# MQ0 Tiled Extension (Phase 3.2: 実機GUI Hotfix)

> **legacy / reference**: 本拡張は既存Tiledマップの検証・保守用として保持する。新規ローカルマップの正本は [docs/MAP_SYSTEM.md](../../../docs/MAP_SYSTEM.md) のBACKGROUND / COLLISION / EVENT / OBJECT方式であり、Tiledはメイン制作ツールではない。

『モンスタークエスト0』のマップ制作を Tiled Map Editor + AI拡張でつなぐための土台。
**Phase 3で初めて実AI(Anthropic)への接続が可能になりますが、AIがTiledマップを自動編集する機能は一切ありません。** AIができるのは「見る→仕様と比較する→問題点を指摘する→改善案を出す」までで、マップへの反映は常に人間がTiledで手動で行います。

> **重要(2026-09-14修正その1: モジュール形式)**: Tiled公式ドキュメント(v1.12.2、このリポジトリの動作確認環境に実際にインストール済み)で確認した結果、Tiledのスクリプト拡張はQt/QMLのJavaScriptエンジン(QJSEngine)であり、複数ファイルへの分割は **`.mjs`拡張子 + `import`/`export`(ES Modules)** が公式方式で、Node.js的な `require()`/CommonJSには対応していません。全ファイルを`.mjs` + `import`/`export`へ書き直し済みです。

> **重要(2026-09-14修正その2: メニューUI)**: 実Tiled 1.12.2での動作確認で、`tiled.extendMenu("MQ0", ...)`による**独自トップレベルメニューの新規作成は公式APIでサポートされていない**ことが判明しました(`tiled.extendMenu()`は`tiled.menus`に既に載っている既存メニューの拡張専用で、サブメニュー作成も不可)。そのため独自「MQ0」メニューは廃止し、**Tiled標準の`Map`メニュー(無ければ`Project`→`Edit`の順にfallback)へ`MQ0 Tools...`という1項目を追加し、押すと専用Dialogが開く**構成に変更しました。既存の6つのAction(Validate Map / AI Review / Build Review Package / Load Requirements / Import Reference / Settings)のロジックは一切変更していません(Dialogの各ボタンは`tiled.trigger()`でこれらの既存Actionを呼ぶだけです)。

Phase 3の主要な処理はNode側の [Local Bridge](../../../tools/mq0-map-ai)(`tools/mq0-map-ai/review-map.js`)で行われます。**Tiledのスクリプト環境自体はネットワークアクセスを持たないため、Tiled拡張(このフォルダ)から外部AI APIを直接呼び出すことは一切ありません。** `Map → MQ0 Tools... → AI Review` は、Mockモードではその場で計算し、Realモードでは`review-map.js`が事前に生成した結果ファイルを読んで表示するだけです。詳しいVision解析・Provider構成・API Key管理・Dry Run等は [`tools/mq0-map-ai/README.md`](../../../tools/mq0-map-ai/README.md) を参照してください。

対象環境: Windows / Tiled 1.12.2で実機確認済み(それ以外のバージョンでも1.8+のスクリプト機能があれば概ね動作する想定)/ Node.js(Local Bridge用、`package.json`の`engines`と同じ `>=22.18.0` を想定)。

## これは何か
Tiled本体を改造せず、Tiledの **JavaScript Extension** として `Map` メニュー(状況によりProject/Edit)へ `MQ0 Tools...` を1項目追加する拡張(`tiled/extensions/mq0/`)と、それと同じロジックをNodeから直接呼べる **Local Bridge CLI**(`tools/mq0-map-ai/`)のセットです。
Phaser本体(`src/`以下)のゲームロジックには一切触れていません。

UI構成(実機確認済み: `Map → MQ0 Tools...`):
```
Map
├─ (既存のMapメニュー項目...)
├────────────
└─ MQ0 Tools...     <- クリックすると "MQ0 Map Tools" Dialogが開く

MQ0 Map Tools (Dialog)
├─ Map: <mapId> / <mapName>
├─ Validation: Not checked
├─ AI Mode: mock / real
├─ Reference: <状態>
├────────────
├─ [Validate Map]            -> 既存Action MQ0.ValidateMap を trigger
├─ [AI Review]                -> 既存Action MQ0.AIReview を trigger
├─ [Build Review Package]     -> 既存Action MQ0.BuildReviewPackage を trigger
├────────────
├─ [Load Requirements]        -> 既存Action MQ0.LoadRequirements を trigger
├─ [Import Reference]         -> 既存Action MQ0.ImportReference を trigger
├─ [Settings]                 -> 既存Action MQ0.Settings を trigger
├────────────
└─ [Close]
```
`Map`メニューが存在しない場合は`Project`→`Edit`の順にfallbackします。どれも無ければWARNログを出すだけでクラッシュせず、Action自体(`MQ0.Tools`)は登録済みのままです(手動でショートカットを割り当てれば使えます)。

## 現状の重要な前提
- 2026-09-13時点で、MQ0本編はまだTiledでマップを作っていません(MQ0本編マップは引き続き`src/config/maps.ts`のTypeScriptオブジェクトでデータ駆動されています)。Phaser側のloaderやScene実装はPhase 2でも変更していません。
- [`tiled/maps/mq0_test_map.tmj`](../../maps/mq0_test_map.tmj) は、MQ0標準構造とReview Package基盤を確定するための**テスト専用マップ**であり、本編マップではありません。Phaserからは読み込みません。
- No.02「はじまりのまち」の本格タイル配置は、タイルセット仕様とPhaser側Tiled Loaderが確定してから別Phaseで行います。今回はmq0_test_mapだけを対象にReview Package基盤を完成させています。
- `docs/CURRENT_WORK.md` の優先項目に「No.02内部設計データをTiled/Phaserへつなぐ」があり、この拡張はその土台です。

## MQ0標準マップ構造(Phase 1.5で確定、Phase 2で無変更)
今後、新しいMQ0マップをTiledで作る際は `tiled/maps/mq0_test_map.tmj` を複製して土台にしてください。

### Layer一覧(上から描画順、`config.mjs`の`standardLayers`)
| Layer名 | 種別 | 用途 |
|---|---|---|
| `Reference` | Image Layer | 参考画像を薄く表示するための下敷き(§Reference Image Layer参照) |
| `Ground` | Tile Layer | 基本地面 |
| `Terrain` | Tile Layer | 木・岩・水辺など |
| `Buildings` | Tile Layer | 建物・構造物 |
| `Collision` | Tile Layer | 移動不可領域 |
| `Events` | Object Layer | spawn / exit / npc / treasure / event等のObjectを置く |

`Reference`が最背面、`Events`が最前面になるよう並べています(タイルを塗るとReference画像は隠れていく想定)。

### Object一覧(Events Layer内、`config.mjs`の`standardObjectTypes`)
Objectの`Class`(ファイル形式上は`type`フィールド)に以下を設定します。

| Class | 用途 | 最小限のCustom Property例 |
|---|---|---|
| `playerSpawn` | プレイヤー初期位置 | `id` |
| `exit` | マップ間の出入口 | `id`, `targetMap`, `targetSpawn` |
| `npc` | NPC配置 | `npcId` |
| `event` | 汎用イベント起点 | `eventId` |
| `treasure` | 宝箱 | `id` |

`targetMap` / `targetSpawn` 等、未確定の値は空文字列 `""` のままにし、AIや人間が勝手に埋めないでください(`docs/TBD_REGISTRY.md`の方針に合わせています)。

### Map Custom Properties(`config.mjs`の`mapMetadataKeys`)
| キー | 型 | 例 | 必須度 |
|---|---|---|---|
| `mq0MapId` | string | `TEST` | 必須 |
| `mq0MapName` | string | `mq0_test_map` | 必須 |
| `mq0MapType` | string | `test` | 必須 |
| `mq0Chapter` | string | `development` | 推奨 |
| `mq0RequirementFile` | string | `""`(未確定ならTBDとして空文字) | 推奨 |
| `mq0RecommendedWidth` / `mq0RecommendedHeight` | int | (将来用、今回のテストマップでは未設定) | 情報 |

### Reference Image Layer(参考画像の配置方法)
1. Tiledでマップを開き、`Layer > Add Layer > Image Layer` で `Reference` という名前のImage Layerを作る(既存の`tiled/maps/mq0_test_map.tmj`には空の`Reference`レイヤーを用意済み)。
2. そのレイヤーのプロパティで画像ファイル(PNG/JPG/WEBP)を指定する。参考画像は`docs/ASSET_INDEX.md`の`REFERENCE`扱いの資料を使うか、新しく用意したファイルを指定する。
3. レイヤーの `Opacity` を下げる(テストマップでは初期値 `0.5`)。これにより下絵として薄く表示され、その上から`Ground`等のTile Layerへ手作業でタイルを配置できる。
4. 参考画像そのものはこのリポジトリへコミットしなくてよい(著作権・容量の観点で個々のマップ制作者のローカル環境に置く運用でも構わない)。コミットする場合は`docs/ASSET_INDEX.md`の`REFERENCE`ステータスに合わせて登録する。
5. Validate Mapは`Reference` Image Layerの有無を**INFO**(情報)としてのみ表示し、無くてもFAIL/WARNにはしません。

## インストール方法
Tiledの拡張は次のどちらかの方法で読み込めます。

### 方法A: プロジェクトファイルとして開く(推奨・リポジトリ内で完結)
1. Tiledを起動する。
2. `File > Open File or Project`(または `Ctrl+O`)から、このリポジトリの `tiled/mq0.tiled-project` を開く。
3. **「Scripted Extensions」の有効化確認ダイアログが出ることがあります**(Tiled 1.7+の仕様: 自分でTiledから新規作成したプロジェクトではない場合に表示される安全確認)。このプロジェクトは自分たちで作成したMQ0プロジェクトなので、**有効化して構いません**。
4. Tiledのバージョンがプロジェクト専用拡張パス(`extensionsPath`)に対応していれば、`tiled/extensions/mq0/` が自動的に読み込まれる。
5. `View > Views and Toolbars > Console` を開いておく(JavaScript Extensionのエラーはここに出る、Tiled公式のエラー確認場所)。コンソールに `[MQ0] Extension loaded.` 等のログが出ていることを確認する。
6. `Map` メニューの末尾に `MQ0 Tools...` が表示されることを確認する。
7. `Ctrl+P` でプロジェクト内ファイルを開けるので、`mq0_test_map.tmj` を検索して開く。

対応していないTiledバージョンの場合、方法Bを使ってください。

### 方法B: グローバル拡張フォルダへコピー(全バージョン共通・確実)
1. Tiledの `Edit > Preferences > Plugins` タブを開く。
2. `Extensions` 欄の `Open...`(フォルダを開くボタン)を押し、Tiledのグローバル拡張フォルダを開く。
   - 通常 Windowsでは `%AppData%\Tiled\extensions\` 相当。
3. そのフォルダの中に、このリポジトリの `tiled/extensions/mq0` フォルダをコピー(またはシンボリックリンク)する。
4. Tiledを再起動する。
5. `Map` メニューの末尾に `MQ0 Tools...` が表示されることを確認する。

## 使い方
### Validate Map
現在Tiledで開いているマップに対して、MQ0標準構造(上記)への適合を確認します。結果は `PASS` / `WARN` / `FAIL` / `INFO` の行として `MQ0 Map Validation` ダイアログに表示されます。

**必須(FAIL)**: マップサイズ/タイルサイズが正しいか、`Ground` / `Collision` / `Events` Layer、`playerSpawn` / `exit` Object、`mq0MapId` / `mq0MapName` / `mq0MapType` プロパティ。
**推奨(WARN)**: 空マップでないか、タイルセット参照、`Terrain` / `Buildings` Layer、`npc` / `treasure` Object、`mq0Chapter` / `mq0RequirementFile` プロパティ。
**情報(INFO)**: `Reference` Image Layerの有無、`event` Objectの有無(例: `INFO  Reference layer not configured`)。

例:
```
FAIL  playerSpawn missing (Objectのname/classに "playerSpawn" を含めてください)
WARN  mq0RequirementFile missing
INFO  Reference layer not configured
```

命名候補・必須/推奨/情報の区分は `config.mjs` の `naming` / `standardLayers` / `standardObjectTypes` / `validation` にまとめてあるので、MQ0の実際の運用に合わせて調整してください。

### AI Review (`config.mjs`の`aiMode`で Mock / Real を切替)
Tiled自身は**常に**このどちらかで、外部APIを直接呼ぶことはありません。

- **`aiMode: "mock"`(初期値)**: Phase 2から無変更。現在のマップから**Review Package**を組み立て、Map / Requirements / Reference / Validationの要約を表示するだけです。
  ```
  MQ0 AI Review
  Mode: MOCK

  Map
    TEST / mq0_test_map
  Requirements
    docs/MAP_FLOW_SPEC.md
    docs/OPENING_SPEC.md
    ...
  Reference
    layer present, no image set (Reference)
  Validation
    PASS  Future AI input package is ready.
  ...
  ```
- **`aiMode: "real"`**: 先に [Local Bridge](../../../tools/mq0-map-ai) で `node tools/mq0-map-ai/review-map.js --map <このマップの.tmj> --provider real` を実行しておく必要があります。実行済みなら、その結果(`tools/mq0-map-ai/reviews/<map>/ai-review.json`)を読み込んで下記のように表示します。結果が無い場合はWARNを出し、自動的にMock表示へフォールバックします(クラッシュしません)。
  ```
  MQ0 AI Review

  Map
    02 / start_town
  Mode
    REAL (anthropic, cached 2026-...)
  Summary
    全体構成は仕様に概ね一致しています。

  WARN  西側道路が長すぎる可能性があります。
  Evidence
    docs/MAP_FLOW_SPEC.md (Movement)
  Suggestion
    建物を2〜3タイル東へ寄せることを検討。
  Confidence
    86%

  (This does not change the Tiled map. Apply any accepted suggestion yourself in Tiled.)
  ```
  **AI結果を直接MapへApplyするボタンはありません。** 反映は常にTiled上で人間が手動で行います。

### Build Review Package (Phase 2で追加)
現在Tiledで開いているマップから **Review Package**(Map Snapshot + Requirements + Reference + Validationを1つにまとめたJSON)を組み立てます。**マップが開かれていない場合はクラッシュせず、その旨のアラートを表示するだけです。**
1. まず `MQ0 Review Package` というPreview(下記フォーマット)を確認ダイアログで表示します。
   ```
   MQ0 Review Package

   Map
     TEST / mq0_test_map
   Requirements
     Selected: 5
     Candidates: 52
   Reference
     Configured: No (layer present, no image set: Reference)
   Validation
     Errors: 0
     Warnings: 2
   Schema
     0.2.0
   Output
     tools/mq0-map-ai/review-packages/TEST/ (not written yet)
   ```
2. 「エクスポートしますか?」で **OK** を選ぶとJSONを4ファイル書き出します(下記)。**Cancel**を選べば何も保存されません(Preview → Export の間で必ず止まります)。
3. Tiledのバージョンによってはファイル書き込みAPI(`TextFile`)が使えず、Exportに失敗することがあります。その場合はエラーダイアログに表示される通り、代わりに [Local Bridge CLI](#local-bridge-toolsmq0-map-ai) をコマンドラインで実行してください(**より確実な方法**として推奨)。

書き出し先: `tools/mq0-map-ai/review-packages/<mq0MapIdまたはmq0MapName>/`
```
map-snapshot.json    Map/Layers/Objects/Tilesets/Propertiesの要約(全タイルGIDは含めない)
requirements.json    Requirements Resolverの結果(primary/selected/candidates)
reference.json       Reference Layer情報
review-package.json  上記全部 + project/validation/extensionPoints を含む完全版
```
**自動上書き事故を防ぐため**、出力先に既に別マップ(`mq0MapId`/`mq0MapName`が異なる)のReview Packageがある場合は書き込みを拒否し、エラーメッセージで案内します。日時付きの使い捨てフォルダは作らず、同じマップなら常に同じフォルダを更新します。

#### Review Package JSON構造
```json
{
  "schemaVersion": "0.2.0",
  "generatedAt": "2026-...T...Z",
  "project": { "id": "MQ0", "title": "Monster Quest 0" },
  "map": {
    "id": "", "name": "", "type": "", "chapter": "",
    "width": 0, "height": 0, "tileWidth": 0, "tileHeight": 0,
    "sourcePath": "tiled/maps/mq0_test_map.tmj"
  },
  "layers": [ { "name": "Ground", "kind": "tile", "visible": true } ],
  "objects": [ { "name": "spawn_main", "class": "playerSpawn", "x": 0, "y": 0, "width": 16, "height": 16, "properties": {} } ],
  "tilesets": [],
  "properties": {},
  "requirements": {
    "primary": { "path": "docs/MAP_FLOW_SPEC.md", "sourcePath": "docs/MAP_FLOW_SPEC.md", "category": "map-flow", "priority": 80, "reason": "category:map-flow", "exists": true },
    "selected": [ /* 上と同じ形が複数、confidentな自動選定 */ ],
    "candidates": [ /* 選ばれなかった全候補(誤判定を隠さず追跡できるように残す) */ ]
  },
  "reference": {
    "configured": false, "layer": "Reference", "path": null,
    "opacity": 0.5, "visible": true, "offset": { "x": 0, "y": 0 }, "size": null,
    "analysis": null
  },
  "validation": {
    "errors": [ { "level": "FAIL", "code": "MQ0_REQUIRED_OBJECT_MISSING", "message": "...", "target": "object:playerSpawn" } ],
    "warnings": [],
    "info": []
  },
  "extensionPoints": { "tileData": "...", "aiSuggestions": null }
}
```
- Tile Layerの全GID配列は**意図的に含めません**(要約のみ)。詳細が必要な場合は`map.sourcePath`が指す`.tmj`自体を読む前提です。
- `reference.analysis` と `extensionPoints.aiSuggestions` はPhase 3以降(Vision AI / AI Suggestion)向けの予約領域で、今回は常に`null`です。
- Map変更処理(AIによる自動書き換え)は一切ここに含まれません。将来実装する場合も **Suggestion → Preview → 人間のApply/Ignore** を必ず挟みます。
- 実際に生成された完全なJSON例は [`tools/mq0-map-ai/examples/mq0_test_review_package.json`](../../../tools/mq0-map-ai/examples/mq0_test_review_package.json) にコミット済みです(`mq0_test_map.tmj`から生成、絶対パス・個人環境固有情報なし)。

#### `buildSnapshot()` と `buildReviewPackage()` の責務分離
- **`validator.mjs`の`buildSnapshot(map)`** ＝ Tiled Mapそのものの情報だけ(`map`/`layers`/`objects`/`tilesets`/`properties`)。Reference情報・Requirements・Validationは含みません。
- **`review-package.mjs`の`buildReviewPackage(map)`** ＝ 上記Snapshot + `reference-image.mjs`のReference情報 + `requirements.mjs`のRequirements Resolver結果 + `validator.mjs`の構造化Validationを1つに統合したもの。
- Markdown本文やAI固有の解析処理をSnapshot側へ持ち込まない、という境界を明確にしています(本文取得は下記「Requirements本文の扱い」を参照)。

### Requirements Resolver
「今開いているマップに関連しそうなMQ0仕様書」を、次の優先順位でローカルのMarkdownから選びます(GitHub APIは使わず、ローカルにcloneされたリポジトリを正本として扱います)。
1. **`mq0RequirementFile`が明示されていれば最優先**(存在しなくても`primary`として報告し、見つからない場合はValidationへWARNを追加)
2. パスに`mq0MapId`または`mq0MapName`を含むファイル
3. category順: `map-flow`(`docs/MAP_FLOW_SPEC.md`) > `story`(`OPENING_SPEC.md`/`STORY_FLOW.md`/`GLITCH_SPEC.md`) > `common`(NPC/ITEM/MONSTER/MAGIC/BATTLE/CARD/SAVE_FLAG等)
4. `root`/`meta`/`system`カテゴリ(README/PROJECT_STATUS/PHASER_ARCHITECTURE等)は存在確認はするが自動選定の対象にはしない(`candidates`止まり)

**存在しない仕様書を作ったり、存在しない設定を推測して補完したりすることは一切しません。** 判定に自信が持てるものだけ`selected`へ、それ以外は根拠を追跡できるよう`candidates`へ残します。各候補は`sourcePath`を保持しているため、将来AIが「どの仕様書を根拠にしたか」を辿れます。

対象ファイルの正本は `config.mjs` の `requirementsIndex`(category/priorityつきの厳選リスト、Tiledのスクリプト環境では確実なディレクトリ一覧APIが無いため手動で監査・維持)です。[Local Bridge](#local-bridge-toolsmq0-map-ai) 側はNode.jsの実ディレクトリ走査で`docs/`以下を再帰的に見つけ、この厳選リストとマージします(ファイル名からのカテゴリ推測のみで、内容の捏造はしません)。

#### Requirements本文の扱い
`requirements.json`(および`review-package.json`内の`requirements`)の各エントリは、常に次のメタ情報だけです。Markdown本文を無制限に埋め込むことはしません。
```json
{ "path": "docs/MAP_FLOW_SPEC.md", "sourcePath": "docs/MAP_FLOW_SPEC.md", "category": "map-flow", "priority": 80, "reason": "category:map-flow", "exists": true }
```
本文が必要になった場合は、`path`(=`sourcePath`)を使って [Local Bridge](../../../tools/mq0-map-ai) 側の `lib/requirements-content.js` の `readRequirementContent(repoRoot, path)` で個別に読み取れます(Review Packageの生成処理からは自動で呼ばれません)。将来AIへ渡す際も、「選ばれた仕様だけ本文を取得する」形にする想定です。

### Load Requirements
`docs/INDEX.md`を実監査して作った`requirementsIndex`について、リポジトリ内に実在するかをローカルで確認し一覧表示します(Requirements Resolverと同じ土台を使う、より単純な一覧表示コマンド)。
Tiled Projectとして `tiled/mq0.tiled-project` を開いていないと、リポジトリのルートを自動検出できません(その場合はその旨を表示します)。

### Import Reference (Stub) / Reference情報の自動取得
- **Import Reference (Stub)**: Tiled拡張自体は画像解析を行いません(Tiledはネットワークにアクセスできないため)。Tiledのファイル選択ダイアログが使える場合のみ、参考画像(PNG/JPG/JPEG/WEBP)のパスを選択できますが、選択後に行うのは「パスを記録してログに出す」だけです。実際にマップへ反映するには、Tiled上で自分で`Reference`という名前のImage Layerを追加/編集してください。
- **Reference情報の自動取得(Phase 2で追加)**: Validate Map / AI Review / Build Review Packageはいずれも、現在のマップの`Reference`(またはそれらしい)Image Layerから次を読み取ります: レイヤー名、画像パス(リポジトリルートからの相対パスへ変換、Windowsの絶対パスはそのまま保存しない)、opacity、visible、offset。
- **実際のVision解析(Phase 3)**: 画像の内容認識(terrain/road/buildings/water/entrance等)は、Tiledではなく [Local Bridge](../../../tools/mq0-map-ai) の`review-map.js`が、Vision対応のReal Providerを使う場合のみ行います。詳細は下記READMEを参照してください。

### Settings
`config.mjs` の内容(version / aiMode / debug / requirementsPaths / referenceImagePath)を表示します。**APIキーはこの拡張のどこにも保持しません。**`aiMode`を`"real"`に変更すると、`Map → MQ0 Tools... → AI Review`が実行結果キャッシュを探しに行くようになります(§AI Review参照)。

## Local Bridge (`tools/mq0-map-ai/`)
Tiledを開かなくても、保存済みの`.tmj`から直接Review Packageを作れるNode CLIです。`tiled/extensions/mq0/`の`validator.mjs` / `requirements.mjs` / `review-package.mjs`は実ES Modules(`.mjs`)なので、Node側では`require()`ではなく**動的`import()`**(`tools/mq0-map-ai/lib/load-ext-module.js`)で読み込んで再利用しています。これによりロジックの二重管理がありません(`config.mjs`含め、これらのファイルは`tiled`/`File`オブジェクトをトップレベルで参照しないため、Node上でも動きます)。

```bash
node tools/mq0-map-ai/build-review-package.js tiled/maps/mq0_test_map.tmj
node tools/mq0-map-ai/build-review-package.js --map tiled/maps/mq0_test_map.tmj --dry-run   # ファイルを書かずPreviewだけ表示
```
- `.tmj`(JSON形式)のみ対応。`.tmx`は未対応です。
- 位置引数(`<path>`)と`--map <path>`のどちらでも指定できます。
- 常駐サーバーやHTTP/WebSocketは実装していません(必要性が明確になるまで追加しません)。
- 既存の root `package.json` は変更していません(npm scriptsも追加していません)。`tools/mq0-map-ai/package.json`は独立した設定です。
- 生成物(`tools/mq0-map-ai/review-packages/`)は`.gitignore`対象です(`.tmj`からいつでも再生成できるため)。コミット済みの1件だけの参照例は[`tools/mq0-map-ai/examples/mq0_test_review_package.json`](../../../tools/mq0-map-ai/examples/mq0_test_review_package.json)です。
- 詳細は [`tools/mq0-map-ai/README.md`](../../../tools/mq0-map-ai/README.md) を参照してください。

## トラブルシュート
- **`Map` メニューに `MQ0 Tools...` が出ない**: `View > Views and Toolbars > Console` を開き、`[MQ0] Available menus: ...` のログを確認する。`Map` が含まれていない場合、拡張は自動的に `Project` → `Edit` の順にfallbackする(それぞれのメニューを確認する)。どれにも見つからない場合は `[MQ0] No suitable existing menu...` のWARNが出るはずで、その場合はActionはあるがメニュー項目は無い状態になる(下記参照)。
- **Console に `No suitable existing menu (Map/Project/Edit)...` と出る**: お使いのTiledバージョンの `tiled.menus` にMap/Project/Editのいずれも無い状態です。`MQ0.ValidateMap` 等のActionそのものは登録済みなので、Tiledのキーボードショートカット設定(`Edit > Preferences > Keyboard`など、バージョンにより名称が異なる)から手動でショートカットを割り当てて利用できます。
- **旧バージョンの情報で「独自MQ0メニューが上部に出る」と読んだ場合**: それはPhase 3.1以前の設計です。実Tiled 1.12.2で確認した結果、`tiled.extendMenu()`は既存メニューの拡張専用(新規トップレベルメニュー作成は不可)と判明したため、Phase 3.2で `Map → MQ0 Tools...` + Dialog方式に変更しています。
- **Console に `require is not defined` と出る**: このリポジトリでは既に解消済みの問題です(旧`.js`+CommonJS版の名残りをお使いの場合のみ発生します)。`tiled/extensions/mq0/` の中身が全て`.mjs`(拡張子)になっているか確認してください。もし古い`.js`ファイルが残っていたら削除し、最新の`.mjs`版に更新してください。
- **`MQ0 Tools...` を押しても何も起きない/エラーになる**: お使いのTiledバージョンに `Dialog` APIが無い可能性があります。この場合はエラーにはならず、その旨のアラートが表示されます(各Actionはショートカット割り当て等で個別に利用してください)。
- **「Scripted Extensionsを有効にしますか」ダイアログが出ない/勝手に無効のまま**: Tiledのプロジェクト設定でこのプロジェクトが既に「信頼済み」として記録されている可能性があります。`Edit > Preferences` や、プロジェクトファイル自体の設定を確認してください。自分で作成したMQ0プロジェクトなので有効化して問題ありません。
- **Load Requirements で `プロジェクトのルートを自動検出できませんでした` と出る**: `tiled/mq0.tiled-project` をTiled Projectとして開いてから再実行してください(方法Bだけだと現在編集中のプロジェクトパスを推測できません)。
- **Import Reference でファイルが選べない**: お使いのTiledのバージョンに `tiled.promptOpenFile` が無い可能性があります。Stub扱いのため、エラーにはならず案内だけ表示されます。
- **Build Review Packageで「エクスポートできませんでした」と出る**: お使いのTiledのバージョンに`TextFile`書き込みAPIが無いか失敗しています。ダイアログに表示されるコマンド(`node tools/mq0-map-ai/build-review-package.js "..."`)をコマンドラインで実行してください。
- **「出力先には別マップのReview Packageが既にあります」と出る**: `mq0MapId`が空/重複しており、複数マップが同じ出力フォルダ名(`unnamed_map`等)を奪い合っています。各マップに一意な`mq0MapId`を設定してください。
- 詳細ログは `debug: true`(`config.mjs`、初期値)で増えます。ノイズを減らしたい場合は `false` にしてください。

## 将来構想(Phase 2でもまだ未実装)
```
参考画像をImport
  -> 画像解析(Vision AI)                      [reference.analysis へ格納予定]
  -> GitHubからMQ0最新仕様取得                  [Phase 2はローカルclone前提、GitHub APIは未使用]
  -> 現在のマップと仕様を比較
  -> AI Suggest Layout                        [extensionPoints.aiSuggestions へ格納予定]
  -> Tiled上に候補表示(Preview)
  -> 人間が手動調整
  -> Validate Map
  -> AI Review
  -> 人間が最終調整
  -> 保存
  -> Phaserで読み込み
```
AIがTiledマップを直接書き換える設計にはしません。必ず **Suggestion → Preview → 人間の Apply / Ignore** を挟みます。今回追加したReview Package生成処理(データの組み立て)とMap変更処理は完全に分離されており、Map変更処理自体はまだ一切存在しません。

## ファイル構成
```
tiled/
├─ mq0.tiled-project        Tiled Projectとして開くとextensionsPathで自動読込を試みる
├─ maps/
│  ├─ README.md             .tmx/.tmj置き場の説明
│  └─ mq0_test_map.tmj      MQ0標準構造・Review Package基盤のテスト専用マップ(20x15, 16x16px)
├─ tilesets/README.md       将来の.tsx/.tsj置き場(現状ファイルなし)
├─ templates/README.md      将来のObjectテンプレ置き場(現状ファイルなし)
└─ extensions/mq0/            全ファイル.mjs(Tiled公式のES Modules方式。CommonJS/package.jsonは不使用)
   ├─ main.mjs                エントリーポイント(メニュー/Action登録、エラーハンドリング、ログ)
   ├─ config.mjs              設定 + MQ0標準Layer/Object/Property定義 + requirementsIndex
   ├─ utils.mjs               ログ/ダイアログ/エラー安全化の共通処理
   ├─ validator.mjs           Validate Mapの実処理 + Map Snapshot生成(buildSnapshot)+ 構造化Validation
   ├─ requirements.mjs        Requirements Index/Resolver + Load Requirements表示
   ├─ reference-image.mjs     Reference Layer情報取得 + Import Reference(Stub)
   ├─ review-package.mjs      Review Packageの組み立て・Preview文字列生成・Export(TextFile)
   ├─ ai-review.mjs           AI Review: Mock計算 or Real結果キャッシュの読込表示(§AI Review参照)
   └─ README.md              このファイル

tools/mq0-map-ai/            Local Bridge CLI(実AI接続はここだけで行う)。詳細は下記READMEを参照。
├─ providers/                Provider抽象化(mock / anthropic)。review-map.jsが使う
├─ examples/                 コミット済みの参照例(mq0_test_map.tmjから生成)
├─ review-packages/          Build Review Packageの生成物置き場。.gitignore対象
└─ reviews/                  AI Review Resultの生成物置き場。.gitignore対象
```

## Phase 2完了条件(達成済み、Phase 3でも維持)
- [x] Tiled Map情報を取得できる(`buildSnapshot`)
- [x] 関連MQ0仕様書を特定できる(Requirements Resolver、根拠`sourcePath`つき)
- [x] Reference Image情報を取得できる(`extractReferenceInfo`、相対パスのみ保存)
- [x] Validation結果を構造化できる(`{level,code,message,target}`、Validate Map/Review Package/AI Reviewの3箇所で同じ`Validator.validateMap()`を共有)
- [x] 上記4つをReview Packageへ統合できる(`buildReviewPackage`)
- [x] CLIからJSON生成できる(`tools/mq0-map-ai/build-review-package.js`)
- [x] 外部AIへ一切接続していない(OpenAI/Anthropic/ChatGPT/Vision API呼び出しなし)
- [x] AIがMapを書き換える機能が存在しない(Review Package生成とMap変更処理は完全に分離、Map変更処理自体が未実装)
- [x] Phaser既存ゲーム(`src/`)を壊していない(`npm run typecheck` / `npm test` / `npm run build` 全通過)

## Phase 3完了条件
Phase 3で追加された「実AI接続」に関する完了条件は [`tools/mq0-map-ai/README.md`](../../../tools/mq0-map-ai/README.md) 末尾を参照してください(Tiled拡張自体はキャッシュ表示のみで、実装本体はLocal Bridge側にあるため)。
