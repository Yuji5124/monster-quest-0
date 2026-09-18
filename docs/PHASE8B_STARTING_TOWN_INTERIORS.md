# Phase 8-B No.02「はじまりのまち」建物内部＋出入り

最終更新: 2026-09-13 JST

## 今回の範囲

Phase 8全体（No.02正式実装）のうち、今回は8-B「町 → 建物入口 → 暗転 → 建物内部 → 内部を歩く → 出口 → 暗転 → 町へ戻る」の接続のみ。店・宿屋・教会等の機能そのもの（購入・宿泊・儀式）、内部NPC・内部会話の大規模実装、宝箱・アイテム取得、戦闘、セーブ、BGM/SE、フィールド、No.03以降、Phase 9はいずれも対象外。

## 開始時の確認

- `git status`/`git diff`でPhase 8-A完了時点からの変更がないことを確認。
- `docs/MAP_FLOW_SPEC.md` / `docs/NPC_SPEC.md`: No.02のNPC人数・役割・正式会話は引き続き再検討中であることを再確認。今回も新規NPC・新規会話の創作は行っていない。
- `assets/maps/data/no02_start_town_interiors.json`（DESIGN_DATA、schemaVersion:1、status:"DESIGN_DATA"）を再確認。6棟の`interiors[]`（`map_02_inn` / `map_02_item_shop` / `map_02_weapon_shop` / `map_02_church` / `map_02_house_a` / `map_02_house_b`）、各`exit.spawnId`（`spawn_inn_front`等）、`npcs`（全`dialogueId:null`、民家A/Bは空配列）を確認。このJSONはあくまで設計参考資料であり、Tiled tilemapとして実行時に読み込む処理は今回も実装していない。
- 既存コード（`Building.ts` / `maps.ts` / `MapTransition.ts` / `StartingTownScene.ts` / `Player.ts` / `InputSystem.ts`）を確認し、Phase 5〜8-Aのロジックを変更せず拡張できる形を検討した。

## 使用したInterior設計

`no02_start_town_interiors.json`のid・部屋の用途・家具の種類のみを参考にし、部屋サイズ・家具座標・出口座標は簡易な矩形として独自に定めた（DESIGN_DATAはタイル数までは厳密な実装対象にしていない）。6棟とも「入口の反対側寄りに家具、部屋下寄りに出口ゾーン」という共通レイアウト方針で構成した。

## Interior Scene構造

6棟分の内部Sceneを個別に複製せず、共通の`InteriorScene`（`src/scenes/InteriorScene.ts`）1つを新規追加し、`scene.start("InteriorScene", { interiorId, returnSpawnId })`で渡された`interiorId`をキーに`src/config/interiors.ts`の`INTERIORS`レジストリから部屋定義を読み出して構築する方式にした。Sceneコード自体に建物ごとのif分岐は存在しない。

## Interior ID構造

`mapId`（外観・町側）と`interiorId`（内部・部屋側）を明確に分離した。

- `mapId`: `src/config/maps.ts`の`MapId`（例: `map_02_starting_town`）。町の外観・出口・NPC・建物配置を管理する既存の枠組みで、Phase 8-Bでは変更していない。
- `interiorId`: `src/config/interiors.ts`の`INTERIORS`のキー（例: `map_02_item_shop`）。`no02_start_town_interiors.json`の`interiors[].id`とそのまま一致させており、DESIGN_DATAとコードの対応が名前だけで追える。
- `BuildingDefinition.interiorId`（`maps.ts`）が両者を橋渡しする（外観の建物 → 対応する内部定義）。

## 6建物対応表

| id | 名称 | 種別 | interiorId | 部屋サイズ(px, ×3済) |
|---|---|---|---|---|
| bld_02_item_shop | どうぐや | item_shop | map_02_item_shop | 300×228 |
| bld_02_weapon_shop | ぶきや | weapon_shop | map_02_weapon_shop | 300×228 |
| bld_02_church | きょうかい | church | map_02_church | 336×252 |
| bld_02_inn | やどや | inn | map_02_inn | 336×252 |
| bld_02_house_a | 民家A | house | map_02_house_a | 270×210 |
| bld_02_house_b | 民家B | house | map_02_house_b | 270×210 |

### どうぐや
カウンター1 + 棚2をDEV_PLACEHOLDER_INTERIORの矩形で配置。出入口は部屋下寄り。店の購入機能は未実装。

### ぶきや
カウンター1 + 武器ラック2。レイアウトはどうぐやと同型（配色のみ変更）。購入機能は未実装。

### きょうかい
祭壇1 + 長椅子2。部屋はやどやと同サイズ（112×84基準）。儀式・回復等の機能は未実装。

### やどや
カウンター1 + ベッド2。宿泊・回復機能は未実装。

### 民家A
テーブル1 + ベッド1の最小構成。内部NPC・イベントは配置していない（DESIGN_DATA上も`npcs: []`）。

### 民家B
テーブル1 + ベッド1（民家Aと配色・配置を変えた別レイアウト）。内部NPC・イベントは配置していない。

## Town → Interior

`StartingTownScene.create()`内で、`interiorId`を持つ建物ごとにドア矩形(`building.door`)へ`createExitZone`＋`physics.add.overlap`を重ねている。プレイヤーがドアの帯に重なると`handleEnterBuilding(building)`が呼ばれ、`transitioning`フラグを立てたうえで`beginMapTransition(this, this.actions, "InteriorScene", { interiorId: building.interiorId, returnSpawnId: building.frontSpawnId }, MAP_TRANSITION_FADE_MS)`を実行する。入力ロック→暗転→`InteriorScene`起動→暗入りという、Phase 6の`fadeOut`/`fadeIn`と同じ流れを再利用しており、`OpeningGlitchScene`の演出は使っていない。

## Interior → Town

`InteriorScene`内の出口ゾーン（`interior.exitZone`）へ重なると`handleExitToTown()`が呼ばれ、`transitioning`フラグを立てたうえで`beginMapTransition(this, this.actions, this.interior.parentSceneKey, { spawnId: this.returnSpawnId }, MAP_TRANSITION_FADE_MS)`で`StartingTownScene`へ戻す。

## Exterior Spawn

各建物に`frontSpawnId`（`maps.ts`の`BuildingDefinition`に追加したフィールド）を持たせ、`no02_start_town_interiors.json`の`exit.spawnId`と同じ名前（`spawn_item_shop_front`等、計6件）を`map_02_starting_town`の`spawns`へ追加した。内部から出た際は、この`frontSpawnId`が`returnSpawnId`として`InteriorScene`へ渡され、`StartingTownScene`起動時の`data.spawnId`として使われるため、どの建物から出ても「その建物の前」に戻る（Phase 6の`fromStartingPlace`のような単一の共通スポーンには戻らない）。上段3棟（どうぐや/ぶきや/きょうかい）は建物の下辺が出口のため道側(下)へdown向きで、下段3棟（やどや/民家A/民家B）は建物の上辺が出口のため道側(上)へup向きで出現する。

## Collision

- **外観側**: `Building.ts`の`computeWallSegments(footprint, door)`が、footprint全体を「ドアのある辺の帯」と「本体」に分割し、さらに帯をドアの左右2本の壁ストリップに分割する（ドアが端に寄っている場合は1本のみ）。結果として`wallGroup`（`physics.add.staticGroup`）にdoor位置だけ隙間のある壁が登録され、建物へは横からも正面のドア以外からも入れず、ドアの帯からのみ通過できる。
- **内部側**: `InteriorScene`は家具（カウンター/棚/ラック/祭壇/長椅子/ベッド/テーブル）のみを`physics.add.staticGroup`で通行不可にし、部屋の外周は`physics.world.setBounds`で表現している。DESIGN_DATAに存在しない家具は追加していない。
- 出口ゾーン・ドアゾーンはいずれも`createExitZone`（表示なし・overlap専用のStaticBody）で、見た目のCollisionとは別に判定用としてのみ機能する。

## DEV_PLACEHOLDER_INTERIOR

6室すべて、床・壁色は`Graphics.fillRect`／カメラ背景色、家具は`add.rectangle`によるDEV_PLACEHOLDER_INTERIOR矩形のみで構成。正式なタイル・家具画像は使用していない。新規画像素材の生成は行っていない。

## 正式内部素材

CURRENT: なし（内部の正式タイル・家具画像は存在しない）。
REFERENCE: `assets/maps/reference/`配下に一般的な参考画像群はあるが、内部専用として正式採用された画像はない。今回は使用していない。
TBD: No.02各建物の正式内部タイル・家具・什器画像、内部BGM/SE、実際の店/宿/教会機能。

## Player再利用

`Player`クラス（4方向移動・facing・速度・Collision）、`InputSystem`をそのまま使用。内部専用のPlayerサブクラス・移動方式の変更は行っていない。

## NPCシステムへの影響

`StartingTownScene`のNPC（`dev_npc_test`）・会話システム（`Interaction.ts`/`dialogues.ts`/`DialogueBox.ts`）は無変更。`InteriorScene`には今回NPCを配置していない。

## MapTransitionへの影響

`beginMapTransition`の第4引数を`spawnId: string`から`data: Record<string, string>`へ一般化した（`MapTransition.ts`）。これにより同じヘルパーが「町↔町」（`{ spawnId }`）と「町↔建物内部」（`{ interiorId, returnSpawnId }` / `{ spawnId }`）の両方を、実装を複製せずに処理できる。呼び出し側2箇所（`StartingPlaceScene.ts`、`StartingTownScene.ts`の既存`handleExit`）を新シグネチャに合わせて更新した。`createExitZone`・暗転の時間（`MAP_TRANSITION_FADE_MS`）・`transitioning`フラグによる二重遷移防止パターンは無変更のまま流用した。

## 自動テスト

`tests/interiors.test.mjs`（新規、9件）を追加。内容: INTERIORSの各キーとid一致／DESIGN_DATAの6 id完全一致／building.interiorIdの参照整合／building.frontSpawnIdの参照整合／部屋・家具・出口・スポーンの矩形が部屋内に収まっているか／スポーンが出口ゾーンや家具と重ならないか／不正なinteriorId参照がundefinedになるか／parentSceneKeyが実在のmapのsceneKeyと一致するか。

## npm test

48/48成功（既存39件 + 新規`tests/interiors.test.mjs`9件）。

## typecheck

成功。

## build

成功。

## ブラウザ確認

Browserペインが今回も非表示（`requestAnimationFrame`停止）のため、Phase 6以降と同じ手法で確認した: `BootScene.ts`へ一時的に`?debugScene=`分岐、`main.ts`へ一時的に`window.__game`公開を追加し、`javascript_exec`でScene・Phaserオブジェクトの状態を直接検証。検証完了後、両ファイルとも元の状態へ完全復元し、`grep -n "debugScene|__game|TEMP_DEBUG"`で残存がないことを確認済み。

- `StartingTownScene`が建物6棟・NPC・出口を含め14個のcollider/overlap（建物壁6 + NPC1 + No.01への出口1 + 建物ドア6）を登録することを確認。
- `bld_02_item_shop`の`wallGroup`がちょうど3個の壁セグメント（本体+ドア左右）で構成され、ドア帯部分にCollisionが存在しないことを確認。
- item_shopのドアゾーンへ重なった状態で`handleEnterBuilding`相当の処理を発火させ、`transitioning`が`true`になることを確認。
- `InteriorScene`を`interiorId: "map_02_item_shop"`で直接起動し、`world.bounds`（x:330, y:246, width:300, height:228）と主人公の出現座標（center 480, 426）が`interiors.ts`の定義×3倍のオフセット計算と一致することを確認。
- 出口ゾーンへの重なりで`handleExitToTown`相当の処理が`transitioning`を立てることを確認。
- 残り5室（`map_02_weapon_shop` / `map_02_church` / `map_02_inn` / `map_02_house_a` / `map_02_house_b`）を順に起動し、いずれも正しい`interior.id`と部屋サイズで構築されることを確認。
- 存在しない`interiorId: "does_not_exist"`で起動した際、コンソールに`[InteriorScene] unknown interiorId: does_not_exist`という警告が出力され、例外を投げずに`StartingTownScene`へ安全にフォールバックすることを確認。
- 実際のキーボード操作による連続移動・入退室の手触り確認は、Browserペインの`requestAnimationFrame`停止という環境制約により今回も未実施（Phase 6〜8-Aと同じ制約）。ユーザー側での実機（Chrome/Edge等）での確認を推奨。

## console error

0件。

## missing texture

0件（新規画像を追加しておらず、`Rectangle`/`Graphics`のみで構成）。

## Phase 9前のTBD

- 実際のキーボード操作によるブラウザ手触り確認（今回もScene状態検証で代替。ユーザーによる実機確認推奨）。
- 店・宿屋・教会の実際の機能（購入・宿泊・回復・儀式）。
- 内部NPC・内部会話の本格実装（正式NPC仕様の確定が先）。
- 正式な内部タイル・家具画像。
- 正式なNo.02外観NPCの人数・役割・配置・会話（`NPC_SPEC.md`の再検討が先）。
- iPhone Safari実機確認。

PHASE 8-B STATUS:
PASS
