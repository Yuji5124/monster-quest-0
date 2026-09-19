# モンスタークエスト0 マップシステム仕様

最終更新: 2026-09-19 JST

## 1. 目的と優先順位

本書はMonster Quest 0における通常マップの制作方式・データの正本・実行時の扱いを定める正式仕様である。地域番号、物語上の接続、進行条件は [MAP_FLOW_SPEC.md](MAP_FLOW_SPEC.md) を正とし、本書はその地域をどのように制作・実装するかを定める。

今後の新規ローカルマップ（町、村、城、ダンジョン、イベント地点）は、**高解像度の背景画像を正本**として制作する。32×32タイルを敷き詰めて背景を構成する方式、およびTiled TMX/TMJをマップの正本とする方式は、新規制作の標準ではない。

既存のTiled実装、Tiled関連テスト、アセット、ツールは削除しない。No.01「はじまりのばしょ」は本書の最初の移行例として通常Sceneを画像方式へ切り替えたが、Tiled版もlegacyとして保持する。その他の既存実装を直ちに移行・置換する指示ではない。現行Tiled実装の扱いは「旧方式 / legacy / reference」とする。

## 2. 用語と対象

### ローカルマップ

主人公が実際に歩く町、村、城、ダンジョン、祠、イベント地点を指す。ローカルマップは背景画像とCollisionを持つ。

### ワールドマップ

地域間の移動を選択するための画面を指す。広いフィールドを主人公が徒歩で横断するマップではない。ワールドマップ画像上の目的地ポイントを選ぶ方式を正式とするため、ワールドマップ全体に歩行Collisionを作成しない。

### 背景画像の正本

そのマップの地形・静的な景観・空間構図を決める元画像を指す。`background.png` を変更した場合、Collision、Event、Objectの配置をその画像座標に対して確認・更新する。生成済みの補助データは背景画像に優先しない。

## 3. ローカルマップの4レイヤー

各通常マップは、最低限次の4要素で管理する。背景に焼き込むものと、ゲーム側オブジェクトとして管理するものを混同しない。

| レイヤー | 正本 / 代表ファイル | 責務 |
|---|---|---|
| `BACKGROUND` | `background.png` | 高解像度の1枚絵背景。静的な地形、景観、装飾の基準。 |
| `COLLISION` | `collision.png`、必要に応じて派生JSON / polygon | 主人公が歩けない領域と歩ける領域。背景解析後に人間が修正できる。 |
| `EVENT` | `events.json` | 移動、会話、調べる、宝箱、ボス、仲間加入、ストーリーなどの発火領域・条件・参照ID。 |
| `OBJECT` | `objects.json` | NPC、宝箱、扉、敵、仲間、動く物体、エフェクトなど、背景に焼き込まないゲームオブジェクト。 |

`BACKGROUND` に置くのは「静的で、単独では反応しない景観」に限る。会話できるNPC、開閉する扉、取得後に消える宝箱、状態で変わる物、動く物は `OBJECT` または `EVENT` で管理する。静的な見た目とゲーム状態を別にすることで、背景差し替え時に状態処理を失わない。

## 4. 推奨するマップパッケージ

新規マップの推奨配置は次のとおりとする。これは新規制作時の契約であり、既存の `assets/maps/data/`、`tiled/`、`public/assets/maps/` を今回移動する指示ではない。

```text
assets/maps/<mapId>/
├─ background.png        # BACKGROUNDの正本
├─ collision.png         # COLLISIONの編集可能な正本
├─ map.json              # 背景寸法・パス・バージョン等のmanifest
├─ events.json           # EVENT
├─ objects.json          # OBJECT
└─ generated/            # PNGから導出した軽量データ。必要な場合のみ
   ├─ collision.json
   └─ collision.polygons.json
```

ファイル名・配置を実装で確定する段階では、[NAMING_CONVENTIONS.md](NAMING_CONVENTIONS.md) と [DATA_CONTRACTS.md](DATA_CONTRACTS.md) を同期する。原本を上書きする自動処理、背景画像だけを参照して暗黙に古いCollisionを再利用する処理は禁止する。

現在の最初の正式パッケージは `assets/maps/starting_place/` である。1448×1086の夜版 `background.png`（`assets/maps/reference/reference/はじまりのばしょ_夜.png` の無加工コピー、2026-09-19に旧1536×1024の昼景から差し替え）と同寸法の人間編集可能な `collision.png`、北の小道（石段の先）の世界地図遷移を持つ `events.json`、空でも必ず存在する `objects.json` を、`StartingPlaceScene` が読み込む。同一構図の昼版画像（`はじまりのばしょ.png`）も参照原画として保持しており、`collision.png` は昼版へもそのまま流用できる。背景を縮小表示する時はLINEARフィルタを使用する。

2つ目のパッケージ `assets/maps/starting_forest/`（はじまりのもり）は、`StartingPlaceScene`と全く同じ4レイヤー構成・同じ実行時ランタイム（`ImageMapCollision.ts` / `ImageMapData.ts` / `MapCamera.ts` / `MapTransition.ts`）を再利用した`StartingForestScene`が読み込む。正式No.01〜No.20の番号は持たない追加フィールドであり、`WorldMapScene`の目的地の1つとして接続する（`MAP_FLOW_SPEC.md`参照）。距離ベースのランダムエンカウント（本節末尾参照）を追加で持つ点だけがNo.01との差分で、BACKGROUND/COLLISION/EVENT/OBJECTの読み込み方式そのものは変更していない。

ランダムエンカウントを持つマップは、地域ごとのencounter table（`src/data/encounterTables.ts`）と歩行距離ベースの抽選（`src/systems/RandomEncounter.ts`）をSceneへ直書きせず外出しする。1戦闘の敵は1体のみとし、フレーム単位の抽選は行わない（実際に歩いた距離の蓄積→閾値到達時のみ抽選→当選時だけ戦闘開始）。戦闘後は一定距離、再抽選を禁止する。詳細は `BATTLE_SPEC.md` §11。

3つ目のパッケージ `assets/maps/bie_village/`（No.03ビーエのむら）は、正式No.01〜No.20の番号を持つ最初の画像マップ移行例である。`BieVillageScene`はStartingPlaceScene/StartingForestSceneと同じ4レイヤー・同じ実行時ランタイムを再利用し、ランダムエンカウントは持たない（NPC・会話・木こり救出イベントとあわせて `docs/NPC/02_bie_no_mura.md` の会話原案確定後の追加実装とする）。複数の建物を持つマップでも、扉を接続しない段階では建物footprint全体を背景解析でCollisionへ焼き込み、`Building.ts`的な壁+ドア分割の仕組みは導入していない（内部接続が必要になった時点で個別に追加する）。

4つ目のパッケージ `assets/maps/starting_town/`（No.02はじまりのまち、2026-09-19移行）は、既存のNPC会話・パーティ加入・戦闘イベント・建物内部（InteriorScene）接続を維持したまま外観だけを画像マップ方式へ置き換えた例である。建物の壁Collisionは背景画像由来のCollision Maskが担うため、旧DEV_PLACEHOLDER時代の`Building.ts`（単色矩形描画＋壁セグメント計算）は削除し、`maps.ts`の`BuildingDefinition.door`（背景ピクセル座標）だけを入口の重なり判定に使う。CollisionMaskの生成時に、各建物の出入口位置だけ帯状に歩行可能な領域として残すことで、建物footprintを塞ぎつつ入口だけ近づけるようにしている。背景画像に描かれた建物の実数（5棟）が既存の内部データ数（6棟）と食い違っていたため、正式な建物数をユーザー確認のうえ5棟へ縮小した。

5つ目・6つ目のパッケージ `assets/maps/rainland_forest_1/` / `rainland_forest_2/`（レインランドのもり その1・その2、2026-09-19）は、ユーザー提供の背景画像2枚（1448×1086）をそれぞれ無加工コピーした`background.png`と、道（土・木橋・木の階段・遺跡の石段）だけを歩行可能にした`collision.png`を持つ（当初は道の色だけだった歩行範囲を、同日、道の縁の草地まで広げた）。2マップは背景・Collision・Eventだけが異なるため、1つの`RainlandForestScene`をパッケージ設定で切り替える形（`RainlandForest1Scene` / `RainlandForest2Scene`）で読み込み、その1の北口とその2の南口を`events.json`の`transfer`コマンドで相互に接続する。ランダムエンカウントは持たない。Collision生成では、道の色（黄土色）を色相・彩度・明度の閾値で抽出したのち、遺跡の祭壇と石段（灰色のため色では拾えない）、木陰で途切れた道の橋渡し、地図端まで続く道の延長を人間が加え、実行時の8pxセル格子でエントランスから4方向に繋がらないセルを除いて、プレイヤーの実寸(24×24)で全ての出入口・遺跡・橋・階段・道の端に到達できることをテストで保証している（下記「通行可能性の基準」）。

7つ目のパッケージ `assets/maps/rainland_castle_town/`（レインランドじょうかまち、2026-09-19）は、俯瞰の町マップ`レインランドじょうかまち.png`(1447×1087)の無加工コピー`background.png`と、石畳の道・広場・石段・堀の橋だけを歩行可能にした`collision.png`を持つ。共通の`RainlandImageMapScene`（`RainlandForestScene.ts`から公開、もり その1・その2と共有）へ`RainlandCastleTownScene`がパッケージを渡す。町の道は石畳の色（黄土〜クリーム）で抽出し、シーム(継ぎ目)で分断された道を色で補完してつなぎ、石でできた橋の甲板を手で加え、桟橋・外壁の縁・屋根と色が近い部分を手で除き、道を明るい芝の縁へ11px広げた（樹冠・屋根・壁・水・柵には広げない）。

8つ目のパッケージ `assets/maps/rainland_castle/`（No.05レインランドじょう、2026-09-19着手・2026-09-20に正式背景へ差し替え）は、ユーザー提供の城内背景（1448×1086）の無加工コピー`background.png`と、床・絨毯・階段・小部屋を歩行可能にした`collision.png`を持つ。`collision.png`は背景から測った矩形を`tools/build_rainland_castle_collision.py`が8pxセル格子へ揃えて生成する手書き寄りの方式（画像解析を使わず、`--preview`で目視確認）。共通の`RainlandImageMapScene`は、`map.json`の`assetStatus`（DEV_PLACEHOLDER/CURRENT）をそのまま受け入れ（背景の差し替えはデータだけで済む）、`MAPS[mapId].npcs`が空でないマップだけNPC・会話を有効にする。詳細は`MAP_FLOW_SPEC.md` §4.13、`ASSET_INDEX.md`。

#### 入場演出（`MapSplashScene`）

マップは、世界地図から入るときだけ挟む1枚絵の入場演出を持てる（`src/config/mapSplash.ts`の`MAP_ENTRY_SPLASHES`：画像、`fadeInMs`/`holdMs`/`fadeOutMs`、対象`spawnIds`、地名、地名の位置）。`beginMapTransition`は、暗転(fade out)が終わった時点で遷移先SceneとspawnIdから演出を解決し、あれば`MapSplashScene`(黒背景で画像をフェードイン→保持→フェードアウトしたのち遷移先へ`scene.start`)を挟み、無ければ従来どおり遷移先へ直接入る。演出はマップのパッケージ(`entry_splash.png`)に無加工コピーで置き、背景(`background.png`)とは別物として扱う。建物内部からの戻りなど`spawnIds`に含まれないspawnでは再生しない。演出中は入力を受け付けない。TweenManagerは実時間(`Date.now()`)で進むため、終了(遷移先への`scene.start`)もTweenチェーンの`onComplete`で行い、見た目と同じ時計で切り替える。

### 通行可能性の基準（プレイヤーの実寸で歩けること）

Collisionは「歩行可能セルが繋がっているか」ではなく、**プレイヤーの実際の当たり判定サイズ(`PLAYER.width/height`、現在24×24のワールドpx)で歩いて到達できるか**で検証する。セル単位の4近傍接続は、幅1マスの通路や、斜めの道の階段状の角1点接触を「繋がっている」と誤判定するため、判定より狭い通路を見逃す（2026-09-19、レインランドのもりで歩行可能マスの約95%が実際には通れなかった）。`tests/bodyPassability.test.mjs`が、全画像マップで既定spawnから全spawn・全出入口へ、各辺6pxの余裕を持って到達できること、およびレインランドの遺跡・橋・階段・道の端に到達できることを保証する。制作時は次を守る。

- 道・橋・階段は、判定サイズに余裕を足した幅（目安: 道幅40px以上、橋の甲板も同程度）を確保する。橋の木板は約29pxしかないことがあるため、甲板の両側を含めて拡幅する。
- 斜めの道でも角1点だけで接しないよう、`collisionCellSize`は8px（ワールドで12px）を標準とする。
- spawn・出入口は、壁から判定サイズ+余裕だけ離れた、体が入る位置に置く。

### 実行時ワールドスケール（`worldScale`）

2026-09-19、ユーザー指示により各画像マップを実プレイ上1.5倍の広さへ拡大した。ただし**No.01「はじまりのばしょ」だけは明示的なイレギュラーとして100%へ戻す**。はじまりのまち・はじまりのもり・ビーエのむら・レインランドのもり（その1／その2）は1.5倍を維持する。`background.png` はユーザー提供の参照画像とバイト一致であることがテスト（`startingPlace.test.mjs`・`startingTown.test.mjs`等）で保証されており、`collision.png` はその背景と同寸法で対応づけて管理している。AIによる再生成・物理リサイズはこの不変条件と「正式素材を仮素材へ置換しない」方針に反するため採用しなかった。

代わりに、`map.json` へオプションの `worldScale` を追加し、`events.json` / `objects.json` / `maps.ts` の座標値は**ネイティブ背景ピクセル座標のまま変更していない**。No.01は`1`、他の現行画像マップは`1.5`であり、各Sceneが`create()`時にそのマップ固有の倍率を読み、以下へ一律適用する。

- 背景Imageの表示倍率（`background.setScale(worldScale)`。テクスチャ自体はネイティブ解像度のまま）
- `collision.png`から生成したCollision矩形（`ImageMapData.ts`の`scaleRect`で`×worldScale`してから物理Bodyへ渡す）
- 物理ワールド境界・Cameraの`bounds`（`manifest.width/height × worldScale`）
- `events.json`のEvent zone、`objects.json`のObject marker
- `maps.ts`のspawn座標、No.02のNPC位置・建物`door`（`footprint`はランタイム未使用のためネイティブのまま）

戦闘から戻る際に厳密な直前座標を使うランダムエンカウント（はじまりのもり、`returnSpawnX/Y`）は、その座標がすでにworldScale適用後のランタイム座標であるため再スケールしない。`worldScale`省略時は`1`（従来どおりネイティブ座標=ワールド座標）。この方式により背景・Collisionのバイト列は変更せず、Collisionと背景の対応(寸法・座標系)も保たれる。

`map.json` の最小的な概念例は以下である。数値・全フィールドは実装開始時に確定するまで仮定しない。

```json
{
  "id": "map_start_town",
  "formatVersion": 1,
  "coordinateSpace": "background-pixels",
  "background": "assets/maps/map_start_town/background.png",
  "collision": "assets/maps/map_start_town/collision.png",
  "events": "assets/maps/map_start_town/events.json",
  "objects": "assets/maps/map_start_town/objects.json",
  "width": null,
  "height": null
}
```

全ての位置・矩形・polygonは、背景画像の左上を `(0, 0)` とする同一のピクセル座標系で保存する。背景を表示時に拡大縮小する場合も、入力・Collision・Event・Objectには元画像座標へ逆変換した値を使用する。

## 5. Collision / Walkable Mask

### 正式方針

`background.png` を制作時または更新時に画像解析し、歩行可能領域・歩行不可領域を初期生成する。第一候補は編集可能なPNGマスクである。

- **白**: 歩行可能
- **黒**: 歩行不可

水、建物、壁、木、岩、崖、障害物などは原則として黒にする。道・広場・床などは白にする。半透明・中間色の意味は実装時に持たせず、保存する最終マスクは二値として扱う。

Collisionの最終決定者は人間である。自動解析の信頼度や生成方法は補助情報であり、誤判定を人間が描画・削除して修正できなければならない。

### 実行時に行わないこと

Phaserの実行中に、毎フレームAI画像認識や背景画像の意味解析を行わない。実行時は生成済みの `collision.png`、軽量JSON、またはpolygonデータを読み込み、通常の物理・当たり判定として扱う。

PNGマスクから抽出した静的Body、グリッド、RLE、polygonなどの実行用表現は実装選定時に決めてよい。ただし、どの表現でも背景画像に対する人間編集済みマスクを再現できること、iPhone Safari上で十分に軽量であることを条件とする。

### 制作フロー

1. `background.png` を配置する。
2. AIまたはローカル画像解析で、歩行可能 / 不可を推定する。
3. `collision.png` を生成する。
4. MQ0 Map Editorで背景との重ね表示を確認する。
5. 人間が必要箇所だけCollisionを描画・削除する。
6. 必要なら軽量なJSON / polygonを生成し、背景・マスク・イベント・オブジェクトを同じマップパッケージとして保存する。
7. Phaserは生成済みデータだけを読み込む。

背景画像を更新したときは、既存Collisionを無検証で引き継がない。画像差分の有無を確認し、少なくともCollision、Event、Objectをエディタ上で重ねて再確認する。

## 6. EVENT と OBJECT

`events.json` は領域または対象IDに対して、既存の [EVENT_SYSTEM_SPEC.md](EVENT_SYSTEM_SPEC.md) のコマンドを参照する。座標をSceneコードへ直書きしない。`transfer` は `mapId` と `spawnId` を使用し、領域の見た目と遷移先を混同しない。

`objects.json` は表示・当たり判定・状態を持つオブジェクトの定義または参照を持つ。NPCと宝箱のイベント内容を背景画像に焼き込まない。背景に描かれた非対話の木や壁はCollisionで止め、会話・取得・開閉・移動・状態変化があるものはObjectとして定義する。

## 7. MQ0 Map Editor（将来実装）

Monster Quest 0専用の簡易Map Editorを将来の制作ツールとして使用する。汎用RPGエンジンやTiledの代替製品を作ることが目的ではなく、本書の4レイヤーを短く安全に編集することを目的とする。今回、このエディタ本体は実装しない。

最低要件は次のとおり。

- 背景画像の表示
- Collisionの表示ON / OFF
- Collisionの描画・削除
- Eventの配置・編集
- Objectの配置・編集
- JSONの保存・読込
- 背景画像と各レイヤーを同一座標で重ねて確認

追加の候補として、画像解析による初期マスク生成、polygon変換、差分警告、歩行可能領域の到達性検査を扱ってよい。いずれも自動適用を前提にせず、保存前の人間確認を必須にする。

## 8. ワールドマップ

ワールドマップは、1枚の世界地図画像に町・村・ダンジョン・城・祠などの目的地ポイントを重ね、解放条件を満たした行き先を選択してローカルマップへ遷移する方式を正式とする。

- 地域の位置関係、No.01〜No.20、物語上の進行順は維持する。
- ワールドマップ上を主人公が全面徒歩で横断する方式は採用しない。
- 巨大なフィールド用Collision、徒歩用の地形、ワールド横断のランダムエンカウントを新規に設計しない。
- 行き先の解放、選択可否、表示名、移動先 `mapId` / `spawnId` はデータで管理する。
- 実際に歩く必要があるのは、遷移先のローカルマップだけである。

既存の `FieldScene` / ROUGH_FIELD は検証用・旧方式の実装として保持する。通常導線は `WorldMapScene` を使用し、No.01画像マップの北門EventまたはNo.02西端のローカル出口から世界地図へ入り、目的地選択後にローカルマップへ戻る。`FieldScene` は通常導線から外すが、コード・テスト・アセットを削除しない。

ワールドマップ用データは、ローカルマップのCollisionパッケージとは分け、CURRENT背景画像、`destinations.json`（表示名、`visible`、`unlockFlag`、`targetMapId`、`targetSpawnId`、背景ピクセル座標）、`map.json` の `entryDestinationIds`（ローカル出口→現在地ポイント）で管理する。`unlockFlag` はセーブの `flags` から解決し、Sceneが進行条件を直書きしない。`visible: false` は非表示、`visible: true` かつ未解放は`？？？`のロック地点として表示できる。目的地位置は背景画像を正本とするが、ワールドマップ全体のCollisionは持たない。初期実装は [PHASE_WORLD_MAP_POINT_SELECTION.md](PHASE_WORLD_MAP_POINT_SELECTION.md) を参照する。

## 9. 背景画像の制作ルール

背景画像はChatGPTなどの画像生成AIで作成してよい。ただし「美しい背景」だけでなく、ゲームとしてCollisionを作りやすい構図を最優先する。

- 見下ろし寄りのRPG視点にする。
- 一本道や明確な道を優先する。
- 建物入口を明確にする。
- 木、岩、壁、崖など障害物の輪郭を分かりやすくする。
- 過度な影を避け、歩行可能領域と背景装飾を視覚的に分離する。
- キャラクターを隠す巨大な前景を減らす。
- ゲート、アーチなど複雑な上下関係を減らす。
- 重要な操作物・NPC・宝箱は、背景へ焼き込む前にObjectとして分離できるか確認する。

既存作品のマップ・タイル・構図を直接模倣せず、オリジナルの背景を使用するという [IMAGE_SPEC.md](IMAGE_SPEC.md) の原則を守る。

## 10. Tiledの位置付け

Tiled Map Editorは削除対象ではないが、今後のMonster Quest 0におけるメインマップ制作ツールではない。

- `tiled/` 配下、`.tmj` / `.tmx`、tileset、Tiled拡張、Tiled用テスト、`TiledMapRuntime` は既存実装・legacy / prototype / referenceとして保持する。
- 既存No.01のTiled表示を壊すリファクタリングや、関連アセット・テストの削除は本仕様の範囲外である。
- 新規ローカルマップは原則として、本書のBACKGROUND / COLLISION / EVENT / OBJECT方式を使用する。
- 既存Tiledマップを新方式へ移行する場合は、背景、Collision、Event、Objectの対応を確認する個別移行作業として扱う。TMJを新方式の正本へ自動変換したことにしない。

## 11. 実装開始時の確認項目

新方式の実装は別作業とし、開始時には最低限以下を確認する。

- 背景画像とCollisionマスクの寸法・座標系が一致する。
- Collisionの白黒が歩行可能 / 不可として正しく解釈される。
- EventとObjectが背景上の正しい位置に重なる。
- 入口、宝箱、NPC、障害物、マップ端で進行不能・壁抜けがない。
- 背景更新後に関連4レイヤーを再確認できる。
- 実行中にAI解析を呼ばず、生成済みの軽量データだけで動く。
- iPhone Safariを含む対象端末で読み込み時間・メモリ・Collision性能を確認する。

この仕様書の更新だけでは、既存のScene、データ、テスト、Tiledファイル、アセットを変更しない。実装時は [PHASER_ARCHITECTURE.md](PHASER_ARCHITECTURE.md)、[DATA_CONTRACTS.md](DATA_CONTRACTS.md)、[QA_SPEC.md](QA_SPEC.md) を本書に合わせて具体化する。
