# tools/mq0-map-ai/ - MQ0 Local Bridge (Phase 3.2)

> **legacy / reference**: このCLI群は既存Tiledマップ向けのReview / Bridgeツールとして保持する。新規ローカルマップの正式制作フローは [MAP_SYSTEM.md](../../docs/MAP_SYSTEM.md) を正とし、本ツールの削除・新方式への変換は今回の範囲外とする。

Tiledを開かなくても、保存済みの `.tmj` から動く2つのNode CLIです。

> **2026-09-14修正**: 実Tiled 1.12.2での確認で、Tiled拡張側の独自トップレベル「MQ0」メニューは公式APIでサポートされないことが判明しました。Tiled側のUI入口は `Map` メニュー → `MQ0 Tools...` → Dialog に変更されています(詳細は [`tiled/extensions/mq0/README.md`](../../tiled/extensions/mq0/README.md))。このフォルダのCLI(`build-review-package.js` / `review-map.js`)の使い方・出力・スキーマには一切影響ありません。

1. **`build-review-package.js`**(Phase 2) - **Review Package**(Map + Requirements + Reference + Validationをまとめた1つのJSON)を組み立てる。
2. **`review-map.js`**(Phase 3、今回追加) - Review Packageを土台に、Mock、または実AI(Anthropic)へ**1マップ・1回・明示実行**でレビューを依頼し、構造化された **AI Review Result** を生成する。

**実AI接続はこのフォルダの中でのみ行われます。** `tiled/extensions/mq0/`(Tiled拡張本体)はネットワークアクセスを持たないため、外部APIを一切呼びません。APIキーは環境変数からしか読みません(リポジトリのどこにも保存しません)。**AIがTiledマップを自動編集する機能はPhase 3でも一切ありません** - AIができるのは「見る→仕様と比較する→問題点を指摘する→改善案を出す」までで、Mapへの反映は常にTiled上で人間が手動で行います。

## 処理フロー(Phase 3)
```
Tiled(.tmj保存)
   |
   v
Build Review Package (tiled/extensions/mq0/review-package.mjs を review-map.js が動的import()して再利用)
   |
   v
Local Bridge: Reference Image Analyzer (lib/reference-payload.js - 画像を読んでbase64化、寸法をローカル解析)
   |          MQ0 Requirements Context Builder (lib/requirements-context-builder.js - 選ばれた仕様書だけ要約を読む)
   v
Review Request Builder (lib/review-request-builder.js - {project,map,validation,requirementsContext,reference,instructions})
   |
   v
AI Reviewer = Provider (providers/mock-provider.js または providers/anthropic-provider.js)
   |
   v
AI Review Result (JSON, tools/mq0-map-ai/reviews/<map>/ai-review.json)
   |
   v
Tiled Preview (Map メニューの MQ0 Tools... ダイアログ内 "AI Review" ボタンが aiMode="real" のときにこのJSONを読んで表示するだけ)
```
Map変更処理はこのフロー全体のどこにも存在しません。Review Package生成・AI Review生成・Map編集は完全に別処理です。

## 1. Build Review Package(Phase 2、無変更)
```bash
node tools/mq0-map-ai/build-review-package.js tiled/maps/mq0_test_map.tmj
node tools/mq0-map-ai/build-review-package.js --map tiled/maps/mq0_test_map.tmj --dry-run   # ファイルを書かずPreviewだけ表示
node tools/mq0-map-ai/build-review-package.js --help
```
出力(dry-run例):
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
- `.tmj`(Tiled JSON Map Format)のみ対応。`.tmx`(XML)は未対応です。
- 位置引数(`<path>`)と`--map <path>`のどちらでも指定できます。
- 出力先は `tools/mq0-map-ai/review-packages/<mq0MapId、無ければmq0MapName、それも無ければファイル名>/`。
- 出力先に**別マップ**のReview Packageが既にある場合は、自動上書き事故を避けるため書き込みを拒否します(`lib/output-guard.js`、`review-map.js`のai-review.jsonとも共有)。

出力ファイル(`map-snapshot.json` / `requirements.json` / `reference.json` / `review-package.json`)の詳細は変更ありません。各Requirementsエントリは`path`/`sourcePath`/`category`/`priority`/`reason`/`exists`のメタ情報のみで**Markdown本文は含みません**(`lib/requirements-content.js`で個別に読める、自動では呼ばれない)。既存の root [`package.json`](../../package.json) は変更していません。

## 2. AI Review(Phase 3、今回追加)
```bash
node tools/mq0-map-ai/review-map.js --map tiled/maps/mq0_test_map.tmj --provider mock
node tools/mq0-map-ai/review-map.js --map tiled/maps/mq0_test_map.tmj --provider real
node tools/mq0-map-ai/review-map.js --map tiled/maps/mq0_test_map.tmj --provider real --dry-run
node tools/mq0-map-ai/review-map.js --help
```
出力例(mockモード):
```
MQ0 AI Review

Map
  TEST / mq0_test_map
Mode
  MOCK (mock)
Summary
  No structural errors from Validate Map. No AI design review was performed (mock mode).

INFO  Mock mode: no real visual or design judgment was performed.
Confidence
  0%

Limitations:
  - Mock mode: results are synthesized locally from validation data only; no AI model was called.

Written: tools/mq0-map-ai/reviews/TEST/ai-review.json
(This file only records a review. The .tmj was not modified.)
```

### Provider(`--provider`)
| 値 | 動作 |
|---|---|
| `mock`(既定) | 常にローカルで完結。ネットワークアクセスなし。 |
| `real` | 現在の実Providerのエイリアス(`anthropic`)。 |
| `anthropic` | Anthropic (Claude) APIへ実際に接続する。 |

`providers/`はプロバイダを差し替え可能にする抽象化です:
```
providers/
├─ index.js               resolveProvider(name) - "real"のエイリアス解決、未設定/不明時はmockへフォールバック
├─ mock-provider.js        常時利用可能。ネットワーク不使用
└─ anthropic-provider.js   実装済みの唯一のReal Provider(§API Key management参照)
```
新しいProvider(例: OpenAI)を足す場合は、同じ`{ name, isConfigured(), review(reviewRequest, options) }`という形の`providers/openai-provider.js`を追加し、`providers/index.js`の`PROVIDERS`へ登録するだけで済みます。Provider自身はMQ0固有のプロンプトを組み立てません(`lib/mq0-reviewer-prompt.js`が唯一のMQ0プロンプト定義場所で、`lib/review-request-builder.js`が唯一のリクエスト組み立て場所です) - Providerは通信だけを担当します。

### Mock Mode(削除していません)
`mock-provider.js`はPhase 1/2から一貫した方針(Mockは常に安全・常に動く)を継承しています。Validate Mapの構造化Validation結果(`validation.errors`)をそのままERROR issueへ変換して見せるだけで、視覚的・設計的な判断は一切行いません(`summary`/`limitations`でその旨を明示)。API未設定時や実Providerが失敗した時は**自動的にここへフォールバック**します。

### Real Mode / API Key管理
- APIキーは環境変数 **`ANTHROPIC_API_KEY`** からのみ読みます。`tiled/extensions/mq0/config.mjs`・Review Package・AI Review Result・README example・このリポジトリのどこにも書き込みません。
- 未設定の場合: `WARN Provider "anthropic" is not configured (missing API key); falling back to mock.` と表示し、自動的にMockへフォールバックします(クラッシュしません)。
- モデルは既定で `claude-sonnet-5`(Vision対応)。`MQ0_AI_MODEL` 環境変数で上書き可能(`lib/ai-config.js`)。
- 呼び出し回数の保護(§Usage/Cost protection): 1回の実行で1マップだけをレビューします。自動ループ・全マップ一括レビュー・常駐は実装していません。タイムアウト60秒、リトライ最大1回(429/5xxのみ再試行、4xxは即失敗)。
- 実行例:
  ```bash
  export ANTHROPIC_API_KEY=sk-ant-...   # シェルの環境変数として設定(このリポジトリには一切保存されない)
  node tools/mq0-map-ai/review-map.js --map tiled/maps/mq0_test_map.tmj --provider real
  ```

### Dry Run
`--dry-run` を付けると、実際にAPIへ送信予定の**Review Request構造そのもの**を表示し、Providerを一切呼ばず、ファイルも書きません。Reference画像のbase64データは巨大なので `"<omitted, N base64 chars>"` に置き換えて表示します(`lib/review-request-builder.js`の`toInspectableRequest`)。API使用前に「何が送られるか」を確認する用途です。

## AI Review Result Schema
```json
{
  "schemaVersion": "0.1.0",
  "generatedAt": "2026-...T...Z",
  "mode": "mock | real",
  "provider": "mock | anthropic",
  "map": { "id": "", "name": "" },
  "summary": "",
  "issues": [
    {
      "id": "ISSUE-001",
      "severity": "ERROR | WARN | INFO | SUGGESTION",
      "category": "movement | layout | npc-density | events | visibility | scale | requirements | other",
      "message": "",
      "evidence": [{ "source": "docs/... または reference-image", "section": "", "reason": "" }],
      "suggestion": "",
      "confidence": 0.0
    }
  ],
  "suggestions": [{ "id": "SUG-001", "category": "layout", "description": "", "reason": "", "confidence": 0.0 }],
  "referenceAnalysis": null,
  "requirementsUsed": [],
  "limitations": []
}
```
- **severityはValidatorの`PASS/WARN/FAIL/INFO`とは別の語彙です**(`ERROR/WARN/INFO/SUGGESTION`)。Validatorは機械的チェック、AI Reviewは設計判断・視覚判断・仕様照合という役割の違いを混同しないためです。
- `evidence`の`source`は、根拠がMQ0仕様書ならその`sourcePath`(例: `docs/MAP_FLOW_SPEC.md`)、Reference画像由来なら文字列`"reference-image"`にします(§15/§16のMQ0プロンプトで明示指示)。
- `requirementsUsed`には実際に読んだ仕様書の`sourcePath`だけが入ります(出典追跡用)。
- 生成物は `tools/mq0-map-ai/reviews/<map>/ai-review.json` に保存されます(`.gitignore`対象、`review-packages/`と同じ命名規則)。コミット済みの参照例は [`examples/mq0_test_ai_review_result.json`](examples/mq0_test_ai_review_result.json)(mockモードで生成)。

## Reference Image Analyzer(Vision Analysis)
```json
{
  "image": { "path": "", "width": 0, "height": 0 },
  "features": { "terrain": [], "roads": [], "buildings": [], "water": [], "entrances": [], "landmarks": [] },
  "summary": "",
  "confidence": 0.0
}
```
- `lib/image-dimensions.js`が依存ライブラリなしでPNG/JPEGのヘッダーから実際の`width`/`height`を読みます(WEBPは未対応でnull)。これはAIではなく単なるローカルファイル解析なので、Mock/Realどちらのモードでも実行されます。
- `features`の中身(terrain/roads/buildings等の実際の検出)は、Vision対応のReal Providerを使った場合のみAIが埋めます。**画像から完全なTile Mapを生成することはせず、まず構造を理解する(何がどこにありそうか)ことだけを目的にしています。** 座標付きの解析は将来のPhaseで拡張できるようスキーマを開けています。
- Referenceが未設定、画像ファイルが見つからない、対応形式(png/jpg/jpeg)でない場合は、`referenceAnalysis`は`null`、またはWARN付きのStub扱いになり、**テキストのみのAI Reviewとして動作を継続します**(クラッシュしません)。

## MQ0 Requirements Context Builder
`lib/requirements-context-builder.js`が、Requirements Resolver(Phase 2)が選んだ`primary`＋`selected`の**ファイルだけ**を読み、次の上限で要約します(`lib/ai-config.js`):
- 最大 **5ファイル**、1ファイルあたり最大 **1200文字**、合計最大 **6000文字**
- 各エントリは `{ sourcePath, section, excerpt, truncated }`(`section`はファイル内で最初に見つかった見出し)
- 存在しないファイル(`exists: false`)は読みません(実在するリポジトリファイルだけを使う、捏造しない)
- 巨大なMarkdownを丸ごと投げることは一切ありません

## Usage / Cost保護
- 1回の実行で処理するのは**1マップだけ**(バッチ引数は用意していません)。
- 実行は常に人間が明示的にコマンドを打つ操作です。自動ループ・全Map一括レビュー・スケジュール実行は実装していません。
- リトライは最大1回まで(`lib/ai-config.js`の`provider.maxRetries`)、タイムアウトは60秒。
- 常駐サーバー・HTTP・WebSocket・Daemonは実装していません。

## エラー処理(いずれもクラッシュせず、可能な限りMockへフォールバック)
| 状況 | 挙動 |
|---|---|
| APIキーなし | WARN + Mockへ自動フォールバック |
| Providerが未知の名前 | WARN + Mockへ自動フォールバック |
| ネットワークエラー / タイムアウト / レート制限 | 該当リトライ後に失敗 → WARN + Mockへ自動フォールバック |
| AIの応答が不正なJSON | parsed=null・error設定 → WARN + Mockへ自動フォールバック |
| Referenceなし | `referenceAnalysis: null`、テキストのみでレビュー続行 |
| Requirementsなし | `requirementsContext: []`、その旨を踏まえてレビュー続行 |
| Validator ERRORあり | Mock/Realとも、それを踏まえたissueとして扱う(隠さない) |

## ディレクトリ構成
```
tools/mq0-map-ai/
├─ package.json                    "type": "commonjs" を明示するだけ(root package.jsonは無変更)
├─ build-review-package.js         Review Package生成CLI(Phase 2)
├─ review-map.js                   AI Review CLI(Phase 3、今回追加)
├─ providers/
│  ├─ index.js                     resolveProvider(name) - "real"エイリアス解決 + Mockフォールバック
│  ├─ mock-provider.js             常時利用可能なMock Provider
│  └─ anthropic-provider.js        実装済みの唯一のReal Provider(fetch, timeout, retry, JSON抽出)
├─ lib/
│  ├─ tmj-adapter.js               生のTiled JSON(.tmj)をTiled Scripting APIと同じ形へ変換
│  ├─ node-tiled-shims.js          tiled/File/TextFileグローバルの最小限のNode向け代替
│  ├─ requirements-scan.js         docs/以下の実ディレクトリ走査(既存ファイル発見のみ)
│  ├─ requirements-content.js      仕様書1件の本文を必要な時だけ個別に読む(自動では呼ばれない)
│  ├─ requirements-context-builder.js  選ばれた仕様書だけを要約・サイズ上限つきで読む(Phase 3)
│  ├─ reference-payload.js         Reference画像を読んでbase64化・寸法取得(Phase 3、AI不使用)
│  ├─ image-dimensions.js          依存ライブラリなしのPNG/JPEG寸法リーダー(Phase 3)
│  ├─ mq0-reviewer-prompt.js       MQ0専用AIプロンプト定義(唯一の置き場所、Provider非依存)
│  ├─ review-request-builder.js    AIへ送るRequest組み立て(唯一の置き場所)+ Dry Run用の安全な表示形
│  ├─ run-review.js                Provider呼び出し + 失敗時Mockフォールバックの共有ロジック(Phase 3)
│  ├─ output-guard.js              別マップの出力を誤って上書きしないための共有ガード
│  ├─ load-ext-module.js           tiled/extensions/mq0/*.mjs(ESM)をCommonJSから動的import()で読む小ヘルパー
│  └─ ai-config.js                 非秘匿の調整値(タイムアウト・リトライ数・文字数上限等。APIキーは置かない)
├─ examples/
│  ├─ mq0_test_review_package.json     コミット済みの参照例(Review Package)
│  └─ mq0_test_ai_review_result.json   コミット済みの参照例(AI Review Result、mockモードで生成)
├─ review-packages/                生成物置き場。.gitignore対象
└─ reviews/                        生成物置き場。.gitignore対象
```

## なぜTiled拡張とロジックを共有できるのか
`tiled/extensions/mq0/{config,validator,requirements,reference-image,review-package}.mjs` は、`tiled.*` / `File.*` / `TextFile` といったTiled固有のグローバルをどれも**関数の中でしか**参照しません。そのため、`node-tiled-shims.js` でこれらのグローバルをあらかじめ用意しておけば、Tiled拡張のファイルをNode上でも動かせます。

ただし、これらは(Tiled公式の複数ファイル拡張方式に合わせた)本物のES Modules(`.mjs` + `import`/`export`)であり、CommonJSの`require()`では読み込めません。そこでこのCLI群は`require()`ではなく**動的`import()`**(`lib/load-ext-module.js`の`loadExtModule(absPath)`、内部で`pathToFileURL()`を使いWindows上でも安全に解決)を使って読み込みます。`build-review-package.js` / `review-map.js` はどちらも`async function main()`から`await loadExtModule(...)`する形になっています。ロジックの二重実装・二重メンテナンスを避けるための意図的な設計です。

## トラブルシュート
- **`Cannot find module '.../requirements.js'`等が出る**: `tiled/extensions/mq0/`は`.js`ではなく`.mjs`に変更済みです。古いキャッシュ/コピーが残っていないか確認してください(このリポジトリ内では既に`.js`版は削除済みです)。
- **`--provider real`が常にMockに落ちる**: `echo $ANTHROPIC_API_KEY`(PowerShellなら`$env:ANTHROPIC_API_KEY`)で環境変数が設定されているか確認してください。
- **「Refusing to overwrite ... a different map」と出る**: `mq0MapId`が重複/空で、複数マップが同じ出力フォルダ名を奪い合っています。マップごとに一意な`mq0MapId`を設定してください。
- **実AIの応答がJSONとして解釈されない**: `anthropic-provider.js`は応答からコードフェンス除去や`{...}`抽出を試みますが、それでも失敗する場合は自動的にMockへフォールバックします(`ai-review.json`の`limitations`に理由が残ります)。
- **`--dry-run`で画像データが省略される**: 意図的な挙動です(base64を丸ごと表示すると読めないため)。実際にAPIへ送られる`byteLength`/`width`/`height`は表示されます。
- **Tiled側で(Map > MQ0 Tools...の)AI Reviewが常にMockになる**: `tiled/extensions/mq0/config.mjs`の`aiMode`が`"mock"`のままか、`aiMode:"real"`でも`review-map.js --provider real`をまだ実行していない可能性があります。先にCLIを実行してから再度Tiledで確認してください。

## Phase 3でのLocal Bridgeの責務(これ以上は実装しない)
やること:
- `.tmj`読み込み・Review Package生成(Phase 2から継続)
- Reference Image Analyzer(画像のローカル寸法解析 + Vision対応Providerへの受け渡し)
- MQ0 Requirements Context Builder(選ばれた仕様書だけの要約読み込み)
- Review Request Builder(AIへの入力を一箇所で組み立て)
- Provider経由でのAI Reviewer呼び出し(Mock / Anthropic)
- AI Review Result JSON生成・保存

やらないこと(禁止、Phase 3でも変更なし):
- AIによるMap直接書き換え・タイル自動配置・Object自動移動/削除
- Requirements/Markdown仕様書の自動改変
- AI判断だけでのApply(必ず人間がTiledで手動反映)
- APIキーのRepository保存
- HTTP Server / WebSocket / 常駐Daemon / 自動ループ / 全Map一括レビュー

## Phase 4候補(まだ実装しない)
- AI Suggestionを実際にTiledへPreview表示し、人間が選んでApply/Ignoreできる仕組み(Map変更処理はこの時も別モジュールに分離する)
- 座標付きのReference画像解析(pixel→tile変換)
- 2つ目以降のReal Provider(例: OpenAI)の追加
- 複数マップの差分レビュー、シリーズ内の一貫性チェック
