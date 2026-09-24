# モンスタークエスト0 現在作業

最終更新: 2026-09-24 JST

> **2026-09-22 SUPERSEDED notice:** 本書は過去の作業ログを保持する。正式な物語順・名称・エンディングは`PLAY_ORDER_SPEC.md`、`STORY_FLOW.md`、`MAP_FLOW_SPEC.md`を優先し、ここに残る旧No.／「必ず元世界へ帰る」記述は現行仕様として使わない。既存内部IDは互換のため保持する。

## デスクトップ正本の最新同期（2026-09-24）

- ローカルの未コミット実装・素材を保全したまま、現行の正式順をNo.01〜20へ同期した。GitHubは同期元として使用しない。
- No.09は1Fの赤い丸から起動する**縦スクロール（見下ろし型）**の崩落シューティングを実装済み。タロサの一時参加／正式同行とボスはTBDのまま。
- No.10かくれざとは背景、Collision、世界地図接続まで実装済み。最新のNPC目安は住民5人 + ミレイだが、現行コードの仮住民8人・仮会話とは競合している。`NPC_DIALOGUE_MASTER.md`未提供のため、コードの台詞・配置を正式化しない。
- 差分分類: **A** 正式順・時間目標・NPC方針・カード料金を正本MDへ同期、**B** デスクトップのNo.06 3D／No.09特殊区間／No.10画像マップ実装は保持、**C** No.10の正式会話・ミレイイベントは資料不在で保留、**D** 旧番号・旧大人数案・ジャンコイン料金を履歴／SUPERSEDED化、**E** No.10仮会話コードとジャンコイン実装は別の安全なコード移行が必要。
- この下の個別ログは当時の作業記録であり、現在の正本判断には`PROJECT_STATUS.md`、`PLAY_ORDER_SPEC.md`、`MAP_FLOW_SPEC.md`、`STORY_FLOW.md`、`NPC_SPEC.md`を使う。

## 今回の作業範囲: 起動オープニング（ARROWAREクレジット＋思い出の回想）（2026-09-19）
- `src/scenes/OpeningIntroScene.ts`と`src/config/openingIntro.ts`を新設し、`BootScene`の遷移先を`TitleScene`から`OpeningIntroScene`へ変更（`main.ts`のnormalScenesへ登録）。「Produced by ARROWARE」約3秒→回想画像6枚（A,B,D,E,F,G）を約10秒→タイトル。
- `TitleScene`は`init(data)`で`{ fromIntro, skipToMenu }`を受け、スキップ時は「なにか ボタンを おしてください」を飛ばして`enterMenu()`から始める（ロゴ登場も即時）。演出から来たときだけカメラfadeInを付ける。ジャンカード画面などからの復帰（dataなし）は従来どおり。
- 回想画像は`assets/title/opening_memories/`へ無加工コピー。詳細・検証結果は`PROJECT_STATUS.md`先頭の同名エントリ。
- 未確定: 正式な秒数・字間・書体、BGM/SE、iPhone Safari実機確認。

## 今回の作業範囲: はじまりのまち画像マップ移行（2026-09-19）
- No.02「はじまりのまち」をDEV_PLACEHOLDER表示（`STARTING_TOWN_PLACEHOLDER`の単色背景＋`Building` entityの単色矩形＋壁セグメント計算）から、No.01と同じBACKGROUND/COLLISION/EVENT/OBJECT画像マップ方式へ移行した。`assets/maps/starting_town/`（background.png=ユーザー提供reference画像`はじまりのまち.png`の無加工コピー、1448×1086、collision.png=噴水広場・石畳・土の道のHSV色閾値→建物5棟の敷地を個別除外(出入口だけ帯状に残す)→噴水/花壇/川を除外→膨張で生成、map.json/events.json/objects.json）を追加し、`StartingTownScene`を全面的に書き換えた。
- 既存のNPC会話（`Interaction.ts`/`dialogues.ts`/`DialogueBox.ts`）、パーティ加入（タロサ→ミレイ、`PartySystem`/`PartyFollowers`）、戦闘イベント（DEV_BATTLE_EVENT・デーマス、`DialogueEvents.ts`）、建物内部接続（`InteriorScene`、`building.door`＋`createExitZone`）は無変更のロジックをそのまま再利用した。壁Collisionは背景画像由来のCollision Maskが担うため、DEV_PLACEHOLDER専用だった`entities/Building.ts`・`config/building.ts`・`config/startingTown.ts`は不要になり削除した。
- **建物6→5への縮小**: reference画像には教会＋4棟（屋台風の店=どうぐや、井戸+薪の家=ぶきや、普通の家=民家A、干し草の家=やどや）＝合計5棟しか描かれておらず、旧DEV_PLACEHOLDER時代の6棟目「民家B」に対応する建物が存在しなかった。ユーザーに確認のうえ「5棟へ正式に縮小する」を選び、`assets/maps/data/no02_start_town_interiors.json`・`src/config/interiors.ts`・`src/config/maps.ts`から`map_02_house_b`関連データ（interior定義・spawn・building）を削除した。
- 出入口は西端1か所のみを`WorldMapScene`への正式接続として`events.json`の`event_starting_town_west_exit`で管理する（`maps.ts`の`exits`は空配列、他の画像マップと同じ方式）。座標は西端で自然に道が画像端へ到達する箇所を採用（正式な「西門」の絵は描かれていないため、既存ドキュメントが定める「No.02西端の出口」という制約に合わせた判断）。
- カメラを固定表示(`setScroll(0,0)`)から他の画像マップと同じ追従式(`configureMapCamera`)へ変更。これに伴い、`DialogueBox`（背景色矩形・本文・次ページ矢印）がカメラスクロールで流れてしまう問題を発見し、`setScrollFactor(0)`を追加して画面に固定されるよう修正した（No.02が会話UIを使う初めての画像マップだったため、この問題は今回まで顕在化していなかった）。
- NPC・建物frontSpawn・battle_event_return等の座標はすべて新しい背景画像の実座標へ引き直した。建物入口Zoneとの再トリガー防止（Player body高さ42px分のマージン）を各frontSpawnに適用し、回帰テストを追加した。
- `?mapTest=no02`のDEV単体起動に`WorldMapScene`/`InteriorScene`/`BattleScene`も登録し、西端出口・建物出入り・NPC戦闘イベントを1つのDEV URLで確認できるようにした。
- 検証: `npm test`167/167（新規`startingTown.test.mjs`、既存`buildings.test.mjs`/`interiors.test.mjs`/`maps.test.mjs`/`demasBattle.test.mjs`を5棟・新座標へ更新）・typecheck・build全てPASS。ブラウザ実機（`game.step()`手動進行）で、背景/Collision表示、歩行・衝突、NPC会話（パーティ加入でlocalStorageへタロサ加入を確認）、戦闘イベントNPC→BattleScene→勝利→復帰座標、どうぐや入口→InteriorScene→退出→復帰座標、西端→WorldMapScene（現在地表示）→選択→はじまりのまちへ復帰、までの一連と、No.01/はじまりのもり/ビーエのむら/FieldScene(legacy)の回帰なしを確認した。
- 未確定: 実店舗機能（価格・商品）、正式NPC人数・台詞、建物内部の正式レイアウト、東・南東の未接続路の扱い。

## 現行の正式マップ方針（2026-09-18）

本書のTiled / `FieldScene`に関する以下の記録は、2026-09-17までに完了した既存No.01 runtimeの作業記録である。以後の新規マップ制作の正本ではない。No.01は背景画像正本、生成後に人間が修正するCollision、Event、Objectの4レイヤーへ通常導線を移行済みである。地域間はポイント選択式ワールドマップへ移行する。legacy実装は削除せず保持する。詳細: `MAP_SYSTEM.md`。

## 今回の作業範囲: ビーエのむら追加（2026-09-18）
- No.01「はじまりのばしょ」/はじまりのもりの実装（`StartingPlaceScene`系: `ImageMapCollision.ts` / `ImageMapData.ts` / `MapCamera.ts` / `MapTransition.ts` / `Player.ts` / `InputSystem.ts`）をそのまま再利用し、`BieVillageScene`と`assets/maps/bie_village/`（background.png=ユーザー提供reference画像の無加工コピー、collision.png=石畳/土の道のHSV色閾値→建物6棟＋井戸状構造物を個別除外→川除外→膨張で生成、map.json/events.json/objects.json）を追加した。正式No.01〜No.20の番号を持つ最初の画像マップ移行例（`MAP_FLOW_SPEC.md`§4.8）。
- `WorldMapScene`の`destinations.json`へ`destination_bie_village`を追加。No.01/No.02/はじまりのもりと異なり`unlockFlag: "story.bie_village_unlocked"`という実フラグを持たせた（`MAP_FLOW_SPEC.md`§4.5が定める「No.03以降はSaveSystemのフラグ連動」の方針どおり）。SaveSystemの`flags`は未実装のため、当初は本番`WorldMapScene`で`？？？`表示だった（2026-09-19に、`developmentUnlockedFlags`を暫定の解放状態として本番でも使うよう変更し、実プレイでも選択できる）。`map.json`の`developmentUnlockedFlags`へ同フラグを追加し、`WorldMapTestScene`でDEV確認できるようにした。
- 北門のみを世界地図への正式出入口とし、`events.json`の`event_bie_village_north_exit`で接続。背景に描かれた東・南東方向の道は行き止まりのまま残し、今回は接続先を定めない。
- NPC・会話・木こり救出イベント・ランダムエンカウントは、`docs/NPC/02_bie_no_mura.md`が`SOURCE_DRAFT_EXISTS / REDUCING`（NPC人数・台詞本文とも未確定、旧15人案から約半分へ圧縮予定）のステータスであることを確認し、今回は実装しない（follow-up）。
- `?mapTest=bie-village`（`BieVillageTestScene`）でDEV単体起動を追加。`?worldMapTest=1`側のDEV Scene一覧にも`StartingForestScene`/`BieVillageScene`/`BattleScene`を追加し、世界地図からの全地点遷移を1つのDEV URLで確認できるようにした。
- 検証: `npm test`160/160（新規: `bieVillage.test.mjs`、既存`worldMapData.test.mjs`/`maps.test.mjs`/`devMapTest.test.mjs`を4地点対応へ更新）・typecheck・build全てPASS。ブラウザ実機（`game.step()`手動進行）で、背景表示・Collision表示・歩行/衝突（建物・川・森を正しく迂回、広場〜北門〜各建物周りを実際に踏破）・北門イベント→WorldMapScene（現在地表示は`？？？`のまま、SaveSystem未接続の既知の挙動）・DEV解放経由でのWorldMapTestScene→ビーエのむら選択→本番Scene起動、までを確認。既存No.01/No.02/はじまりのもり/WorldMapScene本番導線の回帰なしを確認。
- 実装中、`fromWorldMap`spawn(710,120)が北門Event zone(y:0-110)とPlayer body(高さ42)分だけ重なり、着地直後に即座World Mapへ戻ってしまう不具合を発見しy=150へ修正。回帰防止のテストを追加した。
- 未確定: `unlockFlag`のSaveSystem接続、`story.bie_village_unlocked`が実際に立つタイミング（本編のどのイベント後か）、NPC・木こり救出イベント・正式内部設計データ、東/南東の未接続路の扱い。

## 今回の作業範囲: DEV 3人パーティー・経路追従（2026-09-18）
- `PartySystem`で主人公・タロサ・ミレイの加入状態と固定順をScene横断で管理し、既存の暫定GameStateへ安全に保存する。旧セーブは主人公のみとして読み込む。
- No.02に `DEV_PARTY_JOIN_TAROSA` / `DEV_PARTY_JOIN_MIREI` の検証専用NPCを追加。タロサ→ミレイの順だけを許可し、重複加入しない。
- followerは主人公の実移動履歴を後方から辿る表示専用で、Physics・NPC会話・出口判定を持たない。タロサは2026-09-19に正式歩行Sprite(`tarosa_walk.png`)へ置き換え済み(動いているかで歩行/直立を切り替え)。ミレイは参考画像未提供のため引き続き同サイズの単色Rectangle。
- 実行確認はNo.02→WorldMapScene→No.01まで済み。本編の正式加入イベント、共通イベントランナー接続、BattleSystemの複数人対応は未着手。詳細: `PHASE_DEV_PARTY_FOLLOWERS.md`。

## 今回の作業範囲: はじまりのもり追加（2026-09-18）
- No.01「はじまりのばしょ」の実装（`StartingPlaceScene` / `ImageMapCollision.ts` / `ImageMapData.ts` / `MapCamera.ts` / `MapTransition.ts` / `Player.ts` / `InputSystem.ts`）をそのまま再利用し、`StartingForestScene`と`assets/maps/starting_forest/`（background.png=ユーザー提供reference画像の無加工コピー、collision.png=HSV色閾値→最大連結成分→プレイヤー幅分膨張で生成、map.json/events.json/objects.json）を追加した。
- `WorldMapScene`の`destinations.json`へ`destination_starting_forest`（`unlockFlag: null`、No.01/No.02と同じ常時解放）、`map.json`の`entryDestinationIds`へ`from_starting_forest`を追加。北門Eventが`WorldMapScene`へ戻る。正式No.01〜No.20の番号は持たない追加フィールド（`MAP_FLOW_SPEC.md`§4.7、`MAP_SYSTEM.md`）。
- 距離ベースのランダムエンカウントを新設: `src/systems/RandomEncounter.ts`（歩いた実距離を蓄積→閾値到達時のみ抽選→戦闘後は一定距離再抽選禁止、フレーム単位抽選はしない）+ `src/config/encounter.ts`（TEMP_TEST_VALUEのペース設定）+ `src/data/encounterTables.ts`（1戦闘1体、`monster 001`/`003`を重み1/1＝50%/50%で管理、既存`getDevBattleMonster`経由で接続）。
- `src/data/monsters.ts`へ`DEV_BATTLE_MONSTERS["001"]`（`mq0_monster_001_0d78a307c8.png`）を既存`"003"`と同じ最小接続パターンで追加。両敵とも正式名称・正式ステータスはMONSTER_SPEC.md上未確定のため、`"003"`と同様に`DEV_BATTLE_BALANCE`のプレースホルダー値のみ。
- 既存`BattleScene`をそのまま再利用。`BattleDialogueEvent`へ`returnSpawnX/Y/Facing`を追加（既存のNPCイベントは未指定のまま動作不変）し、ランダムエンカウントだけ戦闘直前の実座標へ復帰できるようにした。`BattleScene.returnToEventMap()`はこの値がある場合だけ`spawnX/Y/spawnFacing`を渡す。
- `?mapTest=starting-forest`（`StartingForestTestScene`）でNo.01の`?mapTest=image-no01`と同じDEV単体起動を追加。`D`キー/`?collisionDebug=1`のCollision表示も既存のまま再利用。
- 検証: `npm test`153/153（新規: `startingForest.test.mjs` `randomEncounter.test.mjs` `encounterTables.test.mjs`、既存`worldMapData.test.mjs`/`maps.test.mjs`/`devMapTest.test.mjs`/`battleEvent.test.mjs`を3地点対応へ更新）・typecheck・build全てPASS。ブラウザ実機（`game.step()`手動進行、Browserペイン背景化時のrAF停止は既知の制約）でWorldMap→はじまりのもり→歩行→Collision→ランダムエンカウント→BattleScene→勝利→戦闘直前座標へ復帰→戦闘後クールダウン→北門→WorldMapScene（3地点表示、現在地表示）までを確認。No.01/No.02/WorldMapScene本番導線の回帰なしを確認。
- 未確定: `unlockFlag`は本番`WorldMapScene`未接続（SaveSystem`flags`が未実装のため、No.01/No.02と同じ`null`常時解放のまま。No.03以降と同様、将来SaveSystem接続時に差し替え対象）。モンスター001/003の正式名称・HP等・エンカウント確率(25%/240px)・クールダウン距離(300px)はTBD/TEMP_TEST_VALUE。

## 今回の作業範囲: ポイント選択式ワールドマップ（2026-09-18）
- `assets/maps/world_map/background.png` は4:3・1448×1086のCURRENTオリジナル高解像度背景。縮小時はLINEARフィルタで表示する。
- `WorldMapScene` を通常Sceneとして登録。No.01北門Event／No.02西端からデータ定義の入口IDで入り、目的地をクリック / タップまたはキーで選び、暗転してローカルマップへ戻る。
- `destinations.json` はNo.01 / No.02の2地点だけを参照し、`visible` / `unlockFlag` / `targetMapId` / `targetSpawnId` で既存Sceneへ接続する。`map.json` の `entryDestinationIds` がローカル出口と現在地ポイントを結ぶ。地点座標は `DEV_PLACEHOLDER_POSITION`。SaveSystem接続とNo.03以降は未着手。
- 既存の`FieldScene`、No.01 / No.02のTiled / image-map検証は保持する。`FieldScene`は通常Title導線から外したlegacy実装。詳細: `PHASE_WORLD_MAP_POINT_SELECTION.md`。

## 今回の作業範囲: No.01背景画像マップの通常導線統合（2026-09-18）
- `assets/maps/starting_place/` を、`background.png` / `collision.png` / `map.json` / `events.json` / `objects.json` のCURRENTパッケージとして統合。背景・マスクはいずれも1448×1086(2026-09-19に夜版へ差し替え、旧1536×1024の昼景から変更)、背景ピクセル座標を共通の正本としている。
- 通常の`StartingPlaceScene`がこのパッケージを読み、Tiledを読まない。`ImageMapTestNo01Scene` は同じ正式パッケージを単独起動するDEV入口である。
- 黒=歩行不可 / 白=歩行可能のPNGマスクを、実行時にAI解析せず16pxセル単位で結合した静的Bodyへ変換する。`D` または`?collisionDebug=1`でDEV表示を確認できる。
- `events.json`の北門は `world-map` コマンドを持ち、WorldMapSceneの `from_starting_place` 入口IDへ遷移する。`objects.json` は空のOBJECTレイヤーとして存在し、正式NPC等は未配置。
- No.01夜版、画像解析による初期マスク生成、MQ0 Map Editor、正式Object、iPhone Safari実機確認は未完了。既存Tiled版は `LegacyTiledStartingPlaceScene` と `MapTestNo01Scene` として保持する。詳細: `PHASE_IMAGE_MAP_MINIMUM.md`。

## 今回の作業範囲: StartingPlaceScene 本番Tiled化(2026-09-17)
- 前Phaseで`MapTestNo01Scene.ts`に実装したTiled読み込み(preload/tileset登録/layer生成/Collision/PlayerSpawn/Camera/Events)を`src/systems/TiledMapRuntime.ts`(新規)へ共通化。マップ定義データも`src/config/mapTest.ts`→`src/config/no01TiledMap.ts`(DEV専用ではない共有データ)へ改名移設。`MapTestNo01Scene`は削除せず単体テスト用として維持、両Sceneが同じ関数を呼ぶ形にして二重実装を解消。
- `src/scenes/StartingPlaceScene.ts`(通常のTitle→Opening→StartingPlace導線の到達先)のGraphics DEV_PLACEHOLDER地形描画(地面矩形+焚き火矩形+手動Collision矩形2枚)を、正式Tiled No.01昼マップ表示へ置換。`src/config/startingPlace.ts`(Graphics専用のPLACEHOLDER仕様、他から未参照)は削除(Git履歴に残存)。
- PlayerSpawnはTiledの`playerSpawn`オブジェクトの中心座標を正本にし、ハードコード座標は廃止した。このPhase時点の`fromField`はlegacy用として保持し、現在の通常帰還は`fromWorldMap`を優先する。主人公の表示サイズ・速度は無変更(タロサ・ミレイと共通の基準サイズを維持)。
- Tiledの`exit_north`と`event_campfire`は検出のみ。`exit_east`は現在、同一座標の`maps.ts`出口から正式にWorldMapSceneへ遷移する。通常プレイへログを大量に出さないよう`import.meta.env.DEV`でガードする。
- 実装中、PhaserのTweenManagerが`Date.now()`ベースの実時間で進行し、`game.step()`への引数を無視することを発見。前Phaseの「合成clockを連打」する検証方法だけではTitleメニュー確定やOpeningGlitchSceneのtween経由シーン遷移が進行しないため、実時間ペース版のstep関数を新たに使い分けて、Title→はじめから→Opening→StartingPlaceの実際の遷移を本物のコードパスで検証した。
- `npm test` 120/120(新規8: `tests/tiledMapRuntime.test.mjs`)・typecheck・build全てPASS。ブラウザ実機確認(通常URL/`?collisionDebug=1`/`?mapTest=no01`)で表示・歩行・Collision・Events検出・console error 0件を確認。詳細: `PHASE_NO01_STARTING_PLACE_TILED_PRODUCTION.md`。

## 今回の作業範囲: No.01 Tiled → Phaser接続(DEV最小実装、2026-09-17)
- 前Phase(Path Forest v2)を正式CLOSE: `mq0_map01_starting_place_day.tmj`の全レイヤー・全GIDを再スキャンし、視覚DEV_PLACEHOLDER 0件を再確認(Collision層の`collision_solid_marker`のみ残存、既知の非対象)。`mq0_path_forest_v2_test.tmj`のvalidatorもErrors 0を確認。
- Phaserは外部tileset参照(`{firstgid,source}`)を読めない(`console.warn`のうえ無視される仕様、Phaserソースで確認済み)ため、`tools/mq0-map-ai/sync-map-for-phaser.js`(新規)でtiled/の`.tmj`+`.tsj`群を自己完結JSONへビルド時マージし、`public/assets/maps/mq0_map01_starting_place_day.json`(生成物、手編集しない)として配信した。`tiled/`は**この既存No.01 Tiled実装に限る**編集用正本であり、新規マップの正本ではない。`npm run sync:maps`で再生成、`tests/mapPhaserSync.test.mjs`で「生成物がtiled/の現在の内容と一致しているか」を`npm test`のたびに検証(二重管理のズレをテストで検出)。
- tileset PNG自体はpublic/へコピーせず、既存`src/config/field.ts`のFIELD_REFERENCEと同じ`new URL(..., import.meta.url)`パターンで`assets/maps/tilesets/`から直接配信。
- `?mapTest=no01`(既存の`?battleTest=`等と同じDEV分離パターン)でのみ到達する`src/scenes/MapTestNo01Scene.ts`(新規)を追加。Ground/Terrain/Buildingsを表示、Collision層は非表示のまま判定にのみ使用(`?collisionDebug=1`で可視化可)、既存の`Player`/`InputSystem`/`configureMapCamera`/`createExitZone`をそのまま再利用して主人公歩行・カメラ追従・Events(`playerSpawn`/`exit_north`/`exit_east`/`event_campfire`)検出を実装。本番exit遷移・campfire本イベント・Y-sortは未実装(ログ確認のみ、次Phase候補として記録)。通常のTitle→Opening→StartingPlace起動、No.01夜版、`src/config/maps.ts`は無変更。
- 実装中に2つの実バグを発見・修正: (1) `setCollisionByExclusion([0])`はPhaserが空セルを内部で`index=-1`として扱うため誤り(全面Collision化する不具合)、`mq0Label`から動的にGIDを求める`setCollision(gid)`方式へ修正。(2) `physics.world.setBounds()`未設定で既定の960×720のままだった(Tiledワールドは1536×1152)ため追加。ブラウザ検証中、Browserペインが背景化されると`requestAnimationFrame`が完全停止しゲームループが進まないことが判明し、`scene.game.step()`を手動で連続呼び出しする方法で移動・Collision・Events検出を実地検証した。
- `npm test` 112/112(新規11件)・typecheck・build全てPASS。ビルドで`new URL()`のテンプレートリテラル変数がVite側の静的解析を阻害し無関係な画像までバンドルされる問題も発見・修正。詳細: `PHASE_NO01_TILED_PHASER_INTEGRATION.md`。

## 今回の作業範囲: No.01 Path Forest v2 正式導入(2026-09-17、DEV_PLACEHOLDER完全ゼロ化・No.01正式化完了)
- 既存の`path_dirt`(140セル、terrain v2フェーズから見送り続けていた最後のDEV_PLACEHOLDER)を、既存の細い1タイル幅connector系(`path_straight_*`/`path_corner_*`等)を再利用せず、新規の「blob autotile」方式(full/edge×4/outer-corner×4/inner-corner×4/variant×2、計15種)で正式化。
- 140セルを解析した結果、隣接判定は全て「full/edge×1/outer-corner(隣接2方向)」の綺麗なパターンのみで、1タイル幅のpinchや孤立セルは0件だったため、フォールバック処理を使わずに全セルを正式分類できた(full 24, edge 44, outer-corner 32, inner-corner 28, variant 12)。
- 新規15タイルは、**既存の`mq0_terrain_forest_v2.png`/`.tsj`の空きslotへ追記**(grass_baseとpath_crossから合成、新規SOURCE画像は使用せず、既存37タイルは無変更)。新規tileset(`mq0_path_forest_v2`)は作成不要と判断。
- 美観調整として、焚き火広場の東側(playerSpawn含む4セル)を追加でdirt化し、狭い通路の突き当たりだったplazaを「焚き火を囲む開けた広場」に拡張(既存15タイルの再配置のみ、新規アセット無し、PlayerSpawn/event_campfireの位置・機能は無変更)。
- **DEV_PLACEHOLDERスキャン結果**: Ground/Terrain/Buildingsの視覚タイルは全レイヤーで0件。Collision層の`collision_solid_marker`(546セル)のみ残存するが、これはCollision層専用の非表示オーサリングマーカーであり(全Phaseで一貫して同じ扱い)、視覚アセットの置換対象ではない。
- 検証: Flood Fill(外周脱出可能セルは北ゲート3セルのみ、東edge列47は完全ソリッド、水セルへの侵入0件)、BFS(北/焚き火/橋西/橋東/東側)全てTrue、Validate Errors 0(WARN 2件はnpc/treasure未配置、既存・無関係)、`npm test`101/101・typecheck・build全てPASS。
- テストマップ`tiled/maps/mq0_path_forest_v2_test.tmj`(25×22)を新規作成し、2/3タイル幅直線・90度カーブ・緩やかな蛇行・narrow→wide・plazaブロブ・橋への継ぎ目を1枚で実証。
- Before/After比較画像あり。Terrain v2/Trees v2/Props v2/Bridge v2は無変更で正式成果として維持。詳細: `PHASE_NO01_OUTDOOR_TILESET_SPEC.md`。**No.01「はじまりのばしょ」昼マップの正式屋外タイルセット化(Terrain/Trees/Props/Bridge/Path)はこれで完了**。次PhaseはTiled No.01→Phaser接続(本ドキュメントの範囲外、別途着手)。

## 今回の作業範囲: No.01 Bridge Forest v2 正式導入(2026-09-16、DEV_PLACEHOLDER実質ゼロ化)
- `assets/maps/tilesets/source/mq0_bridge_forest_v2_source.png`(1448×1086、本物の透過、30パーツ)を解析し、「長さ可変・32pxグリッド対応のモジュール式木橋」として6種(bridge_h_left/right・center_01/02・post×2、全て1×2セル)を正規化。center_01/02は単独でもお互いを混在させても継ぎ目なく反復できることを検証(2/5/7タイル橋のテストマップで実証)。
- `mq0_map01_starting_place_day.tmj`の`bridge_wood`(x=37〜43、7タイル幅、既存の川幅と一致)を同位置・同幅のまま正式Bridge v2へ置換。Terrain v2の川形状・Collisionの意味・Trees v2・Props v2は無変更。
- **DEV_PLACEHOLDERスキャン結果**: Terrain/Buildingsは0件。Ground層の`path_dirt`(140セル、terrain v2フェーズからの既知の残課題)のみ残存。
- `exit_east`を実測した結果、既存の歩行経路と完全に一致しており修正不要と判断(exit_northのような不整合なし)。
- 検証: PlayerSpawnからの全水セルへの到達可能性が0件(橋以外から川を渡れない/橋から水へ抜けられないことを証明)、BFS(北/橋西端/橋東端/東側)全てTrue、外周脱出可能セルは北ゲート3セルのみ、`npm test`101/101・typecheck・build全てPASS。
- 詳細: `PHASE_NO01_OUTDOOR_TILESET_SPEC.md`。

## 今回の作業範囲: No.01 Props Forest v2 正式導入(2026-09-16)
- 作業前修正: `exit_north`のイベント矩形(旧x=25〜31)が実際の歩行可能な北ゲート(x=23〜25)とズレていたため、name/type/targetMap/propertiesは無変更のまま矩形のx/widthのみ修正(x=23〜25の3セル全てで発火可能に)。Trees PhaseをCLOSEDとした。
- `assets/maps/tilesets/source/mq0_props_forest_v2_source.png`(1448×1086、本物の透過、54スプライト)を解析し、27種(campfire lit/unlit・torch lit/unlit+1×1代替・log4種・signpost2種・stump2種・rock7種・flower3種・weed4種)を個別crop/denoise/premultiplied resizeで正規化。`mq0_props_forest_v2.png`(256×608、RGBA)+`.tsj`を新規作成。
- `mq0_map01_starting_place_day.tmj`のDEV_PLACEHOLDER campfire_marker/log_stump/torch_marker/rock_boulder/flower_patch(計15セル)を、23個の新規props配置で再構成。焚き火広場は非対称にlog×3・stump・rock・flower/weedを配置(PlayerSpawn・event_campfireの位置・機能は無変更)。北入口の松明は、trees v2で既に確定していた木の配置と衝突しない位置へ再配置(右側は1×2が入らずcompact 1×1版を使用)。
- Terrain v2 / Trees v2 / Collisionの既存意味 / Bridgeは無変更。検証: 独自GID/パス整合性0件エラー、Validate Errors 0、Flood Fill(外周脱出可能セルは北ゲート3セルのみ)、BFS(北/橋/東側)全てTrue、`npm test`101/101・typecheck・build全てPASS。
- 次Phase: MQ0 Bridge Forest v2。詳細: `PHASE_NO01_OUTDOOR_TILESET_SPEC.md`。

## 今回の作業範囲: No.01 外周脱出バグ修正 + Props Forest v2(2026-09-15)
- PlayerSpawnからのFlood Fill検証で、trees v2フェーズの木Collision再配置により**北端(y=0)のほぼ全域が意図せず歩行可能になっていた**(正式Exit以外から外周へ抜けられるバグ)ことを発見。Collisionレイヤーのみ99セル補強し、外周到達可能セルを北ゲートの3セルのみに修正。BFS/validator/test/typecheck/build全て再確認済み。
- 「MQ0 Props Forest v2」に着手しようとしたが、`assets/maps/tilesets/source/mq0_props_forest_v2_source.png`が存在せず、チャット添付画像も完成シーンの参考図(個別スプライトシートではない)のため、**atlas作成はSOURCE待ちでBLOCKED**。campfire/log/signpost/torch/rock/flower/weedは引き続きDEV_PLACEHOLDER。ユーザー仕様は発注仕様として`PHASE_NO01_OUTDOOR_TILESET_SPEC.md`に保持。

## 今回の作業範囲: No.01 昼 Trees Forest v2 正式化+置換(2026-09-15、PARTIAL)
- 異常ファイル`assetsmapstilesetsmq0_terrain_forest_v3.png`を調査し、既存の木/低木シートと一致確認のうえ`assets/maps/tilesets/source/mq0_trees_forest_v2_source.png`へ移動。あわせて、指定の出力パスに未報告の別候補(`mq0_trees_forest_v2.png`、本物のアルファ持ち)が既に存在することを発見し、`..._organized_source.png`として保存のうえ、こちらをSOURCEとして採用。
- SOURCEを`scipy`連結成分分析でオブジェクト単位に解析し、大木2(3×4セル)・中木2(2×3)・小木2(2×2)・切り株2・低木6(計14種)を個別crop→デブリ除去→premultiplied alpha resize+green spill抑制で正規化し、`assets/maps/tilesets/mq0_trees_forest_v2.png`(256×384、RGBA)+`tiled/tilesets/mq0_trees_forest_v2.tsj`を新規作成。
- `mq0_map01_starting_place_day.tmj`のDEV_PLACEHOLDER `tree_canopy`(435セル)/`bush_low`(16セル)領域を、1セル→多セルの単純置換ではなく再設計: 対象領域内でシード固定のランダム配置により大中小木82本+低木12個を配置、残りは草地に戻して自然な隙間を作った。campfire・log・signpost・torch・bridge・flower・rockは無変更。
- Collisionは各木の最下段1行のみ(樹冠は歩行可能)、低木は全て歩行可能。Above/Y-sortレイヤーは既存Tiled規約に無いため今回も追加せず、Phaser接続フェーズの判断事項として保留。
- 検証: GID/パス整合性0件エラー、`tools/mq0-map-ai`のValidate Errors 0、Events完全一致、BFS(北/橋/東側)全てTrue、`npm test`93/93・typecheck・build全てPASS。
- Before/After比較画像あり。詳細: `PHASE_NO01_OUTDOOR_TILESET_SPEC.md`。

## 今回の作業範囲: No.01 昼 正式屋外タイルセット v2 正規化+試験導入(2026-09-15、PARTIAL)
- 「MQ0 Terrain Forest v2」ソース(16×12グリッド、1セル90.5px、32の整数倍ではないが精密に測定可能)から37タイルを個別crop/resizeし、`assets/maps/tilesets/mq0_terrain_forest_v2.png`(256×288、RGBA、32px厳密グリッド)+`tiled/tilesets/mq0_terrain_forest_v2.tsj`を新規作成。
- `mq0_map01_starting_place_day.tmj`へ試験導入: grass(1588セル)・water/water_edge/waterfall/cliff_face(252セル)を新tilesetへ置換。Collision・Events(PlayerSpawn/exit_north/exit_east/event_campfire)は無変更。
- **土の道(dirt path)は0セット置換**: 太い帯状の道に細い接続式オートタイルを当てると草が市松模様に浮く破綻を確認したため、直線のみに絞る条件では該当セルが無く、今回はDEV_PLACEHOLDERのまま維持(1タイル幅の道としては別途テストマップで正常動作を確認済み)。
- 岩・地形装飾(要求されたカテゴリの1つ)はこのソースに存在せず不採用。崖の角・道のT字路も専用パーツが無く見送り。
- 検証: 独自GID/パス整合性チェック0件エラー、`tools/mq0-map-ai`のValidateはErrors 0、BFS(spawn→北出口/橋/東側)全てTrue、`npm test`93/93・typecheck・build全てPASS。
- 詳細・不足素材・次のステップ: `PHASE_NO01_OUTDOOR_TILESET_SPEC.md`。

## 今回の作業範囲: No.01 昼 正式屋外タイルセット v1 実用性判定(2026-09-15、BLOCKED)
- 配置された`assets/maps/tilesets/mq0_outdoor_forest_v1.png`(1448×1086)を検証。実セルピッチ約71〜72px(32pxの整数倍でない)、アルファチャンネル無し、崖・長い橋が独立タイルではなく1枚絵のmural状に描かれていることを確認し、「視覚参考としては有用だがそのまま運用は難しい」と判定。
- `mq0_map01_starting_place_day.tmj`・DEV_PLACEHOLDERタイルセットは無変更(GID置換なし、参照切れなし)。`.tsj`は新規作成していない。
- 正式tileset化に必要な修正(セルピッチを32の整数倍へ/透過/崖・橋の独立パーツ化等)をチェックリスト化。詳細: `PHASE_NO01_OUTDOOR_TILESET_SPEC.md`。

## 今回の作業範囲: No.01 昼 正式屋外タイルセット仕様(2026-09-15、BLOCKED)
- DEV_PLACEHOLDERタイルセットから正式`mq0_outdoor_forest_v1.png`への置換を目的に調査したが、**実ファイルが存在しない**ため今回は仕様一覧化のみで停止。存在しないPNG/GIDは作成していない。
- 必要タイル54枚(地面/道の境界セット、木3サイズ、崖の直線+角、水/川岸、滝、橋)と発注用シート配置案を`docs/PHASE_NO01_OUTDOOR_TILESET_SPEC.md`にまとめた。
- 木の重なり(Y-sort or Above レイヤー)は既存Tiled標準構成に無いため独断で追加せず、Phaser接続フェーズでの決定事項として保留。
- 現行の`tiled/maps/mq0_map01_starting_place_day.tmj`(Collision/Events/PlayerSpawn/Exit含む)は無変更、DEV_PLACEHOLDERタイルセットを引き続き参照。

## 今回の作業範囲: No.01 昼 Tiledマップ(2026-09-15)
- No.01「はじまりのばしょ」昼版を、Tiled Map Editorで編集できる実マップ(`tiled/maps/mq0_map01_starting_place_day.tmj`、48×36、32px)として新規作成。既存Tiled規約(Layer: Reference/Ground/Terrain/Buildings/Collision/Events)をそのまま使用し、独自規約は新設していない。
- 屋外用の正式タイルセット(`tileset_base.png`等)が未着手(実ファイル無し)と判明したため、ユーザー確認の上でDEV_PLACEHOLDERタイルセット(`tiled/tilesets/mq0_dev_placeholder_outdoor.tsj` + `assets/maps/tilesets/dev_placeholder_outdoor_tileset.png`、単色/簡易アイコン17種)を新規に用意して使用。
- 森・焚き火の広場・北通路(松明2本)・東の川と橋・部分的な崖を配置し、スポーン→北通路/橋の歩行可能性を自動BFSで検証済み。既存Local Bridge CLI(`tools/mq0-map-ai`)でのValidate結果はErrors 0(WARNはnpc/treasure未配置の2件のみ、想定通り)。
- **Phaser側の読み込みは未実装**(既存No.01夜版Sceneや通常起動フローは無変更)。詳細: `PHASE_NO01_DAY_TILED_MAP.md`。

## Phase 8.6 現在の到達点
Phase 8.6では既存世界地図REFERENCEを背景にしたROUGH_FIELDを追加。内部960×720、Field 1920×1440、180px/秒、即時追従CameraとMapTransitionを維持。No.01／No.02の位置はDEV_PLACEHOLDER_WORLD_POSITIONで、南西の橋を通る徒歩往復を確認。建物退出直後の再入場を再現し、6棟の帰還座標だけを修正。正式地理・正式Collision・Tiled・Phase 9は未着手。詳細: `PHASE8_6_ROUGH_FIELD.md`。

このファイルは「今まさに何を進めるか」を短く示す作業メモ。

## 今回の作業範囲: Phase 8.5 フィールド導入＋主人公追従カメラ
- 序盤の正式導線を「No.01→No.02直接接続」から「No.01→フィールド(仮)→No.02」へ変更。旧直接接続はSUPERSEDED(`docs/MAP_FLOW_SPEC.md`参照)。
- フィールドは正式名称・世界地理未確定のためDEV_PLACEHOLDER_FIELD。仮mapId`field_starting_region`、Scene名`FieldScene`。サイズ・地形は`src/config/field.ts`に分離(1920×1440、960×720より大きい仮値)。
- 共通Camera設定関数`configureMapCamera`(`src/systems/MapCamera.ts`)を新設し、`FieldScene`で主人公追従(lerp=1即時追従、Camera bounds、roundPixels)を導入。Player.tsへはカメラ処理を追加していない。
- Phase 8.5時点ではNo.01/No.02の`maps.ts`側spawn/exitキーを`fromField`等へ切り替えた。現在は通常出口を`kind: "world-map"`へ置換し、`fromField`はlegacy互換用に保持する。
- Phase 8-Aの町・Phase 8-Bの建物内部・出入りは回帰確認済みで無変更。
- 検証・既知の制約: `PHASE8_5_FIELD_CAMERA.md`。

## 今回の作業範囲: Phase 8-B No.02建物内部＋出入り
- No.02の建物6棟に「入口→暗転→内部→出口→暗転→町（正しい建物前）」の出入りを接続。店・宿泊・教会等の機能そのもの、内部NPC・大規模会話、宝箱、戦闘、セーブ、音、No.03以降、Phase 9は対象外。
- 共通`InteriorScene`（`src/scenes/InteriorScene.ts`）+ データ駆動`src/config/interiors.ts`（`INTERIORS`、idは`no02_start_town_interiors.json`と一致）で6室を1つのSceneクラスから構築。`mapId`（外観）と`interiorId`（内部）を分離。
- `Building.ts`に`computeWallSegments`を追加し、footprintをドア位置だけ通行可能な帯を残す形で複数のCollision矩形に分割(`wallGroup`)。
- 各建物に`frontSpawnId`（建物前スポーン6件を`maps.ts`に新設）を持たせ、内部からの退出時に対応する建物前へ正しく戻す。
- `MapTransition.ts`の`beginMapTransition`第4引数を`spawnId: string`から`data: Record<string,string>`へ一般化し、町↔町・町↔建物内部の両方を同じヘルパーで処理。既存2呼び出し箇所を更新。
- 検証・既知の制約: `PHASE8B_STARTING_TOWN_INTERIORS.md`。

## 今回の作業範囲: Phase 8-A No.02外観
- No.02「はじまりのまち」のDEV_PLACEHOLDERを、正式に存在が確認できる建物6棟（やどや/どうぐや/ぶきや/きょうかい/民家A/民家B）の外観+Collisionへ拡張。
- 建物データは`src/config/maps.ts`の`MapDefinition.buildings`へ集約(footprint/door/interiorId)。Sceneへの座標直書きなし。
- `interiorId`は`assets/maps/data/no02_start_town_interiors.json`のidと対応させ、Phase 8-Bでの接続用に記録のみ(今回は遷移未実装)。
- Phase 7のDEV_PLACEHOLDER_NPCを新しい町割りへ再配置。正式NPC人数・会話は`NPC_SPEC.md`により未確定のため据え置き。
- No.01⇄No.02のMapTransition、Player、DialogueBox(22px)、960×720、タイトル画面は無変更。
- 検証・既知の制約: `PHASE8A_STARTING_TOWN_EXTERIOR.md`。

## 今回の作業範囲: Phase 7 NPC + 会話システム
- No.02 DEV_PLACEHOLDERへ確認用NPC1体（`dev_npc_test`）を配置し、正面判定→Z/Enterで会話開始→複数ページ送り→終了→操作復帰までを実装。
- `src/systems/Interaction.ts`（Phaser非依存の正面判定）、`src/data/dialogues.ts`（会話データ分離）、`src/ui/DialogueBox.ts`（下部会話ウィンドウ）を新規追加。
- 会話中はScene側で`Player.update()`を呼ばないことで移動を止め、`consumePressed("confirm")`を1フレーム1回だけ読むことで二重消費を防止。既存InputSystem/MapTransitionは無変更。
- 正式NPC配置・正式台詞・選択肢/分岐会話・イベントフラグは今回実装しない。
- 検証・既知の制約: `PHASE7_NPC_DIALOGUE.md`。

## 今回の作業範囲: Phase 6 マップ遷移
- No.01「はじまりのばしょ」⇔No.02「はじまりのまち」DEV_PLACEHOLDERの往復基盤を追加。
- `src/config/maps.ts` にmapId・spawn・出口(bounds/targetMapId/targetSpawnId)をまとめ、Scene側へ座標判定を直書きしない構造にした。
- `StartingTownScene`（No.02仮Scene: 地面+主人公+No.01への入口のみ）を新規追加。正式な町はPhase 8。
- 出口領域は`transitioning`フラグで二重遷移を防止し、`beginMapTransition`で入力ロック→短い暗転→Scene切替を共通化。
- Phase 5のPlayer/InputSystem/Collision/移動速度はそのまま再利用し、既存ロジックは変更していない。
- 検証・既知の制約: `PHASE6_MAP_TRANSITIONS.md`。

## 今回の作業範囲: Phase 5.5 ビジュアル基準更新
- タイトルを新CURRENT画像へ差し替え。既存の6項目メニュー・入力・暫定320×240を維持。
- 添付3画像をNo.01のREFERENCEとして保存し、空間構成と夜の見せ方をOPENING_SPECへ記録。
- 正式No.01背景TBD / 実行中DEV_PLACEHOLDER。今回は仮配置・移動・Collisionを維持。
- Phase 6、新システム、昼版、主人公画像は追加しない。
- 検証・素材履歴: `PHASE5_5_VISUAL_BASELINE.md`。

## 引き継いだPhase 5の範囲（当時の記録）
- No.01夜内のDEV_PLACEHOLDERを4方向へ移動できる。正式主人公素材は未確定。
- 仮の連続移動60px/秒、縦軸優先・逆方向相殺、キー解放で停止。
- Arcade PhysicsをStartingPlaceSceneだけで有効化。画面端・焚き火・地面より上を仮の歩行制限とする。
- 既存InputSystemとinput lockを再利用し、再入場時に入力リスナーを残さない。
- Phase 4の焚き火・暫定320×240を維持。マップ遷移・NPC・会話・昼・戦闘・セーブ・音は追加しない。Phase 6には進まない。
- 検証・素材分類・人間調整項目: `PHASE5_PLAYER_MOVEMENT.md`。

## 引き継いだPhase 4の範囲（当時の記録）
- Phase 3を変更前に再検証してPASS。Phase 1〜3の未コミット実装を保持。
- `StartingPlaceScene` にNo.01夜の地面と静止した焚き火をGraphicsのPLACEHOLDERで表示。正式素材台帳へは追加しない。
- 冒頭演出は終了先のみ変更。夜版を表示したところで停止する。
- 主人公・台詞・昼版・歩行・NPC・セーブ・音は未実装。Phase 5には着手しない。
- 検証・素材監査・残事項: `PHASE4_STARTING_PLACE.md`。

## 引き継いだPhase 3の範囲（当時の記録）
- 2026-09-12のユーザー指示により、Phase 1（起動基盤）+ Phase 2（タイトル画面）に続き、`OpeningGlitchScene`のみを追加。
- TitleSceneの「はじめから」(`START_GAME`)決定時だけ`OpeningGlitchScene`へ遷移するよう接続。他5項目は変更なし。
- 約5秒はFC〜初期SFC風のデータ破損演出（横線ノイズ/画面ズレ/文字化け風/色フラッシュ）。新規画像素材は使わず`Graphics`/`Text`/`Camera`のみ。
- 「ぼうけんのしょが きえました」等のフェイク文言は`GLITCH_SPEC.md`で現行不採用と確認済みのため使用していない。
- 演出終了後は完全な黒画面で停止（Phase 4でNo.01への遷移に差し替え予定）。
- `npm install` → `npm run dev` で起動する。
- 本編・マップ・主人公・焚き火・No.01・NPCは追加していない。
- 解像度・キー配列は確認用仮設定のまま変更していない。iPhone Safari実機確認は未実施。
- 検証結果と残作業: `PHASE1_BOOTSTRAP.md` / `PHASE2_TITLE.md` / `PHASE3_OPENING_GLITCH.md`。
- 以下の重点項目と「Phaserの次」は今後の本編制作方針であり、今回の追加範囲ではない。

## 現在の重点
1. **No.01〜No.20の正式マップ番号を全仕様・データで維持する**
2. **No.01オープニング〜No.02はじまりのまちをVertical Sliceとして具体化する**
3. No.02内部設計データを新しいBACKGROUND / COLLISION / EVENT / OBJECT方式とPhaserへつなぐ（既存Tiled接続はlegacyとして保持）
4. 最新男性主人公の正式デザイン／歩行スプライトを用意する
5. 町・村・城・ダンジョン内部をコンパクトにする
6. NPC人数・役割・配置を再編集する
7. セーブ / ロード・iPhone Safariを早期実装する
8. **終盤の「もういちど」状態遷移を、実データを壊さないフラグ設計で実装できるよう仕様を維持する**

## オープニング現在状態
確定:
- タイトル → はじめから
- 約5秒の短い制御された異常画面
- No.01「はじまりのばしょ」夜版
- 主人公が焚き火のそばで目覚める
- 同一ロケーションの昼版
- No.02「はじまりのまち」へつなぐ
- プレイヤーへ直接メタ会話しない
- 開始直後の偽セーブ消失は使わない

次に詰める:
- 最初の5秒の最終見せ方
- No.01焚き火周辺の実マップ
- 最初の数分の操作／台詞／音
- 夜→昼の切替
- No.01→No.02の接続
- 初戦闘までのテンポ

## 主人公現在状態
確定:
- 男性
- 別世界の元NPC
- 世界間の異常でMQ0へ迷い込む
- 最初から選ばれた勇者ではない
- エレキテル採用
- 最新男性主人公の正式外見(2026-09-19、`assets/characters/reference/reference/主人公/`のユーザー提供参考画像)
- 正式歩行スプライト(2026-09-19、`assets/characters/playable/protagonist_walk.png`。`src/entities/Player.ts`が使用)

不足:
- 正式な移動速度・当たり判定寸法・歩行アニメーション速度(Phase 5のTEMP_TEST_VALUEを流用中)

旧女性勇者風 `hero_walk.png` は現行主人公に使用しない。

## 正式マップ番号
`MAP_FLOW_SPEC.md` を正本とし、採用済み全地域を **No.01〜No.20** で管理する。
旧番号は過去履歴以外では使用しない。

## No.02 はじまりのまち
内部設計データ追加済み:
- `assets/maps/data/no02_start_town_interiors.json`
- 宿屋
- 道具屋
- 武器屋
- 教会
- 民家A

価格、商品、台詞、タイルGID等の未確定値はnullのまま保持する。

## 終盤の確定構造
- No.20はオロチへの道／オロチのしろ／最終地点を含む終章。裏ボスの公開名は`？？？`を使える
- オロチゾンビは**裏ボス**
- 1回目 → 異常 / フーフー → 偽リセット → 「もういちど」
- 「もういちど」はNew Gameではない
- No.01「はじまりのばしょ」へ戻る
- 主人公・タロサ・ミレイは前の出来事を覚えている
- わたべ加入 / 特殊参加 → オロチゾンビ再戦
- この一連は**裏ワザ**
- 実セーブ・ジャンカード取得情報を削除しない
- 真の決着後、王・仲間・NPCの言葉を経て、主人公は`ここに のこる`／`もとの せかいへ かえる`を選ぶ
- 残留では主人公が世界の修復とともに徐々に消え、帰還では本来NPCだったことを一度「操作できない」ゲーム体験で見せてから、自分の意思で歩き出す
- レイはどちらの未来にも生まれる。隠しボス討伐時点でミレイは妊娠しておらず、タロサはレイの父親にしない

TBD:
- 戦闘数値 / AI
- 「もういちど」画面の最終見せ方
- No.01再訪時の台詞 / 配置 / BGM
- 最終選択前に表示するNPC／仲間の言葉、両ルートの正確な台詞・時系列
- 元世界の最終NPC台詞

## ジャンカード
- 全45枚
- 1回20円
- No.01→45固定順
- ダブりなし
- 本編必須ではない
- **序盤から本編NPCがカード秘密・頭文字・たびのあいことばを示唆しない**

## Phaserの次
1. ~~Boot / Title~~（Phase 2で実装済み。項目の本体機能は未接続）
2. ~~約5秒の導入異常~~（Phase 3で実装済み。Phase 4でNo.01夜の仮表示へ接続）
3. No.01 はじまりのばしょ夜版（Phase 4で静止PLACEHOLDER表示済み。正式素材は未確定）
4. 主人公歩行（Phase 5でDEV_PLACEHOLDERによる4方向移動・当たり判定まで実装。正式素材・最終方式はTBD）
5. 夜→昼 / 次導線
6. No.02 はじまりのまち
7. No.02内部マップ
8. NPC会話
9. フィールド
10. ザコ戦
11. レベルアップ
12. 小ダンジョン
13. ボス
14. セーブ / ロード
15. iPhone Safari

## Vertical Sliceで先に固定するもの
- InputSystem
- EventSystem
- BattleSystem
- SaveSystem
- AudioSystem
- データJSON形式
- asset manifest読込

## まだ数値を確定しないもの
- 各町・村・城の最終内部サイズ
- NPC最終人数
- ダンジョン最終フロア数 / タイル数
- 通常敵の最終能力値
- オロチゾンビ1回目 / 再戦の最終能力値
- 魔法の最終消費MP / 威力
- アイテム価格 / 効果量
- 最終レベル曲線

これらは `TBD_REGISTRY.md` に従う。

## プレイ時間基準
- 初見クリア: **約4時間30分**
- 寄り道込み: **約5時間30分**

## 注意
- 旧マップ番号を復活させない。
- 開始直後の偽セーブ消失は使わない。
- 終盤の偽リセットは見た目だけで実データを削除しない。
- 「もういちど」をNew Game処理にしない。
- 旧女性主人公を復活させない。
- ジャンカードの秘密を序盤から前面化しない。
