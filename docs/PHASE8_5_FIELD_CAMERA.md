# Phase 8.5 フィールド導入＋主人公追従カメラ

最終更新: 2026-09-13 JST

## 今回の範囲

序盤の正式な移動フローを「No.01 → No.02」の直接接続から「No.01 → フィールド → No.02」へ変更し、フィールド区間をDEV_PLACEHOLDER_FIELDとして実装した。あわせて、通常の歩行マップで主人公をCameraが追従する共通方式(即時追従・Camera bounds)を導入した。ランダムエンカウント・戦闘・BGM/SE・正式フィールド地形・Phase 9・No.03以降はいずれも対象外。

## 開始時の確認

- `git status`/`git diff`でPhase 8-B完了時点からの変更がないことを確認。
- `docs/MAP_FLOW_SPEC.md` §5「基本進行の大枠」を確認したところ、公式な地域一覧(No.01〜No.20)にNo.01とNo.02の間を埋める「フィールド」という独立した正式Noは存在しないことを確認。世界の大枠・地域配置を変更するものではなく、あくまで両地点間の徒歩移動区間の実装であると解釈した。
- `docs/PHASER_ARCHITECTURE.md` §3・`docs/NAMING_CONVENTIONS.md` §7でScene名の例として`WorldScene`が挙げられているが、実装済みのNo.01/No.02は`StartingPlaceScene`/`StartingTownScene`という具体的な場所ごとのScene名になっている。今回のフィールドも同じ命名規則(具体的な場所名+Scene)に合わせ、`FieldScene`とした。
- 既存コード(`StartingPlaceScene.ts` / `StartingTownScene.ts` / `InteriorScene.ts` / `MapTransition.ts` / `maps.ts` / `interiors.ts` / `Player.ts` / `InputSystem.ts` / `display.ts` / `main.ts` / `tests/`)を確認し、Phase 1〜8-Bのロジックを変更せず拡張できる形を検討した。

## 新しい序盤マップフロー

Title → OpeningGlitchScene → No.01「はじまりのばしょ」→ フィールド(仮) → No.02「はじまりのまち」

## Field mapId

`field_starting_region`(仮ID)。正式名称・世界地理が確定するまでのDEV_PLACEHOLDER_FIELD。`src/config/maps.ts`の`MapId`に追加した。

## Field SceneKey

`FieldScene`(`src/scenes/FieldScene.ts`)。

## Field正式状態

- CURRENT: なし。
- REFERENCE: 使用していない(勝手にCURRENT化していない)。
- DEV_PLACEHOLDER: 地形(草原色・道の帯・山/水辺の仮矩形)、サイズ(1920×720の2倍)、mapId、Scene全体。
- TBD: 正式フィールド名称、世界地理上の位置づけ、正式地形、エンカウント表、BGM/SE。

## Fieldサイズ

`src/config/field.ts`の`FIELD_BOUNDS`で管理。`{ width: DISPLAY.width * 2, height: DISPLAY.height * 2 }` = 1920×1440。内部解像度960×720より確実に大きい仮サイズで、Camera追従のスクロール検証を目的とする。正式サイズとして固定しない。Sceneへ数値を直書きせず、`field.ts`へ分離した。

## Field描画

`FieldScene.create()`で、`FIELD_BACKGROUND_PATCHES`(見た目のみ、道の帯)を`Graphics.fillRect`で描画し、`FIELD_COLLISION_FEATURES`(山・水辺相当)を`add.rectangle`で描画してCollisionを持つStaticGroupへ登録する。新規画像は生成していない。

## Field Collision

- 山・水辺相当の2つのDEV_PLACEHOLDER矩形を`physics.add.staticGroup()`へ登録し、`player.body`とColliderを設定。
- マップ境界は`physics.world.setBounds(FIELD_BOUNDS)` + `Player`側の`setCollideWorldBounds(true)`(既存のまま)で表現。
- 実ブラウザ相当の検証(後述)で、山・水辺の左端でプレイヤーが正しく停止する(通行不可)ことを確認済み。

## Player再利用

`Player`クラス(4方向移動・facing・Collision・InputSystem・移動速度)をそのまま使用。Field専用のPlayerサブクラスは作成していない。Cameraが追従する分、体感速度が変わったように見えないよう、`PLAYER.moveSpeed`(180px/秒)は変更していない。

## Camera構造

新規`src/systems/MapCamera.ts`に`configureMapCamera(scene, target, bounds)`という小さな共通関数を追加した。責務は「Camera bounds設定 + 即時追従開始」のみで、Player側(移動・向き・Body)には一切手を入れていない。`Player.ts`へカメラ処理は追加していない。

```ts
export function configureMapCamera(scene, target, bounds): void {
  const camera = scene.cameras.main;
  camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
  camera.roundPixels = true;
  camera.startFollow(target, true, 1, 1);
}
```

## Camera follow方式

`camera.startFollow(target, true, 1, 1)`でlerpX=lerpY=1を指定し、ふわつく遅延なしの即時追従にした。`target`は`player.visual`(Playerの表示用Rectangle GameObject)。

## Camera bounds

`FieldScene`では`{ x:0, y:0, width:1920, height:1440 }`をCamera boundsに設定。実ブラウザ相当の検証で、四隅・上下左右のいずれでもCanvas外・マップ外の黒領域が見えず、scrollX/scrollYが常にCamera boundsの範囲内(0〜960、0〜720の可動域)にクランプされることを確認した(詳細は「Camera runtime確認」参照)。

## roundPixels / pixelArt対応

`main.ts`側の`pixelArt: true` / `roundPixels: true`は無変更。`configureMapCamera`内で`camera.roundPixels = true`を明示的に設定し、Playerを小数座標(例: x=700.37)に置いた状態でもCameraの`scrollX`/`scrollY`が整数値に丸められることを確認した。

## No.01 → Field

No.01東端の出口ゾーン(座標・当たり判定は無変更)の遷移先を、`map_02_starting_town`から`field_starting_region`へ変更した(`targetSpawnId: "fromStartingPlace"`)。出口id自体も`toStartTown`→`toField`に改名し、旧idはコメントでSUPERSEDEDと明記した。

## Field → No.01

Fieldの西端出口(`toStartingPlace`)が`map_01_starting_place`の`fromField`スポーン(旧名`fromStartTown`、座標は無変更)へ遷移する。

## Field → No.02

Fieldの東端出口(`toStartingTown`)が`map_02_starting_town`の`fromField`スポーン(旧名`fromStartingPlace`、座標は無変更)へ遷移する。

## No.02 → Field

No.02西端の出口ゾーン(座標・当たり判定は無変更)の遷移先を、`map_01_starting_place`から`field_starting_region`へ変更した(`targetSpawnId: "fromStartingTown"`)。出口idも`toStartingPlace`→`toField`に改名した。

## Spawn Point構造

既存のspawnId方式(`MapDefinition.spawns: Record<string, SpawnPoint>`)をそのまま踏襲。Scene間で座標を直接渡さず、`beginMapTransition`へは常に`{ spawnId }`(または`{ interiorId, returnSpawnId }`)という文字列ベースのデータのみを渡す。Fieldには`fromStartingPlace`(No.01側から到着)・`fromStartingTown`(No.02側から到着)の2spawnを用意し、No.01/No.02側は`fromField`という共通の命名规則に合わせた。

## MapTransition変更

`beginMapTransition`自体のロジック(入力ロック→暗転→`scene.start`)は無変更。既存2箇所(`StartingPlaceScene.ts`、`StartingTownScene.ts`)の呼び出しも、`maps.ts`のexit定義を汎用的に参照する既存コードのままで変更不要だった(spawn/exitキーのリネームのみで対応できた)。`FieldScene.ts`もPhase 6以来の`handleExit`パターン(`transitioning`フラグ→`beginMapTransition`)をそのまま複製して実装した。

## No.01への影響

コード変更は`maps.ts`のspawnId/exit idのリネームと遷移先の変更のみ。`StartingPlaceScene.ts`自体は無変更(exit/spawnをmaps.ts経由で汎用的に参照する既存実装のため)。Camera追従も導入していない(960×720の1画面に収まる小規模マップのため、無理に拡大・変更していない)。

## No.02への影響

同様にコード変更は`maps.ts`のリネームのみ。`StartingTownScene.ts`自体は無変更。Phase 8-Aの町・建物6棟・NPC配置、Phase 8-Bの建物内部・出入りは一切作り直していない。

## InteriorSceneへの影響

無変更。`InteriorScene.ts`内の`FALLBACK_RETURN_SPAWN_ID`のみ、No.02側のspawnId改名(`fromStartingPlace`→`fromField`)に合わせて追従させた(通常経路では`returnSpawnId`が明示的に渡されるため、このフォールバック定数が実際に使われる場面は稀)。6建物の入退室・NPC会話・DialogueBox(22px)はいずれも回帰確認済み(後述)。Interiorは小規模なため主人公追従Cameraは導入していない。

## 旧No.01→No.02直接接続の扱い

`docs/MAP_FLOW_SPEC.md`にSUPERSEDEDとして明記した。コード上は、No.01・No.02いずれの`exits`にも相手を指す`targetMapId`は存在しない(自動テストで確認、後述)。物語進行上の「No.01の次はNo.02」という順序自体は変更していない。

## docs更新

`docs/MAP_FLOW_SPEC.md`(§4.5新設、§5にフィールドを追記)、`docs/CURRENT_WORK.md`、`docs/PROJECT_STATUS.md`、`docs/CONTENT_MATRIX.md`、`docs/INDEX.md`、`README.md`を更新した。タイトル画面・960×720・DialogueBox(22px)に関する記述は変更していない。

## 自動テスト

新規`tests/field.test.mjs`(13件): Field mapId/SceneKey存在、Field bounds>960×720、spawn 2種類、exit 2種類、No.01↔Field↔No.02の各方向で遷移先spawnが実在すること、不正spawn安全処理、spawnが自分のexitゾーンと重ならないこと、spawn/exit/地形要素がFieldの範囲内に収まること。既存`tests/maps.test.mjs`の「No.01⇔No.02直接往復」テストを「No.01⇔Field⇔No.02」の経路確認へ更新し、「No.01とNo.02に直接接続が存在しない」ことを確認する新規テストを追加した。

## npm test

63/63成功(既存48件 + 新規`field.test.mjs`13件 + `maps.test.mjs`へ追加した2件)。

## typecheck

成功。

## build

成功。

## runtime確認

Browserペインが今回も非表示(`requestAnimationFrame`停止)のため、Phase 6以降と同じ手法(`window.__game`の一時公開)でScene状態を直接検証した。検証完了後、`main.ts`から該当コードを完全に削除し、`grep`で残存がないことを確認済み。

- `game.scene.scenes`に`FieldScene`が登録されていることを確認。
- No.01の出口ゾーンへプレイヤーを重ねて`transitioning`が立ち、Fieldへの遷移が発火することを確認。
- Fieldの西端spawn(`fromStartingPlace`、x:96,y:720)・東端spawn(`fromStartingTown`、x:1824,y:720)が仕様通りの座標で出現することを確認。
- Field東端出口へ重ねてNo.02への遷移が発火、No.02西端出口へ重ねてFieldへの遷移が発火(かつ遷移先が`map_01_starting_place`ではなく`field_starting_region`であること)を確認。
- Field西端出口へ重ねてNo.01への遷移が発火することを確認。
- No.02到着後、6建物・NPC1体・14個のcollider/overlapが従来通り存在し、どうぐやの入退室(入店時`transitioning`発火→InteriorScene起動→`returnSpawnId`が`spawn_item_shop_front`と一致→退店時`transitioning`発火)が正しく機能することを確認。
- 実際のキーボード操作による連続移動・入退室の手触り確認は、Browserペインの`requestAnimationFrame`停止という環境制約により今回も限定的(後述のCamera runtime確認は実キー入力イベントで駆動)。ユーザー側での実機(Chrome/Edge等)での確認を推奨。

## Camera runtime確認

実際の`ArrowRight`キーイベント(`window.dispatchEvent(new KeyboardEvent(...))`)と、Phaserの`scene.sys.step(time, delta)`を実フレーム相当(delta≒16.67ms)で連続実行する手法で検証した(前提: `world.step(delta)`はdeltaを秒として扱うため、大きな整数を渡すと1回で数百px相当移動しCollisionをすり抜ける「トンネリング」が起きることを確認し、今回はこの方式を採らずSceneの通常更新経路である`sys.step`を使用した)。

- Playerを右へ移動 → Camera追従によりscrollXが連動して増加することを確認(中央付近でplayerScreenPos.x=480固定=Viewport中央)。
- Playerを左へ移動 → 同様に追従を確認。
- 上下方向(ArrowUp/Down相当の直接移動)でも追従を確認。
- 左端: scrollX=0でクランプ(西端spawn付近で確認)。
- 右端: scrollX=960(=1920-960)でクランプ。
- 上端: scrollY=0でクランプ。
- 下端: scrollY=720(=1440-720)でクランプ。
- 四隅: 左上(0,0)・右下(960,720)のいずれもCamera boundsの限界値に一致し、マップ外・黒領域が一切表示され得ないことを数値上確認。
- scroll値: Playerを小数座標(700.37, 611.82)に置いた状態でも`camera.scrollX`/`scrollY`が整数(220, 251)になることを確認(`roundPixels=true`の効果)。
- 山・水辺のDEV_PLACEHOLDER_COLLISIONへ実際にArrowRightキーで1.5秒相当歩かせ、両方とも境界(x=700)ちょうどで停止することを確認(Collisionが機能しながらCameraが追従する状態を確認)。

## console error

0件。

## missing texture

0件(新規画像を追加しておらず、`Graphics`/`Rectangle`のみで構成)。

## 404

0件(全ネットワークリクエスト200 OK)。

## Phase 9前のTBD

- 正式フィールド名称・世界地理・地形・BGM・エンカウント。
- No.01/No.02をCamera追従方式へ実際に切り替えるかどうかの判断(現状は960×720に収まるため据え置き。`configureMapCamera`はいつでも適用可能な状態)。
- 実際のキーボード操作による連続移動・入退室のブラウザ実機確認(ユーザー側推奨)。
- ランダムエンカウント・戦闘・正式モンスター。
- Field BGM/SE。
- iPhone Safari実機確認。

PHASE 8.5 STATUS:
PASS
