# モンスタークエスト0 マップ進行仕様

最終更新: 2026-09-27 JST

このファイルは各地域・ダンジョンの**正式な管理番号、役割、接続、進行条件**を整理する正本。

> **2026-09-22 優先規則:** 本書§2および`PLAY_ORDER_SPEC.md`の正式No.・表示名・物語順が最優先。下記の旧No.、旧名称、既存`mapId`、Scene名、アセットディレクトリはローカル実装を守るための互換情報であり、番号変更だけで改名・削除しない。本文の旧順序と衝突する箇所は`SUPERSEDED`。

## 1. 基本方針
- **全体ワールドマップ、主要地域の位置関係、世界全体の大枠は変更しない。**
- 地域間の基本移動は**ポイント選択式ワールドマップ**で行う。ワールドマップ画像上の目的地を選択してローカルマップへ移動する。
- 主人公が歩くのは町・村・城・ダンジョン等のローカルマップであり、巨大なフィールド全域を徒歩横断する方式は新規制作しない。
- ローカルマップの背景・Collision・Event・Objectは `MAP_SYSTEM.md` を正とする。
- 船・飛行によるワールド移動は基本システムにしない。
- 橋は過密にせず旧案より減らす。
- 町・村・城内部、ダンジョン内部は目標プレイ時間に合わせてコンパクトに再設計する。
- 目標プレイ時間は **初見約4時間30分 / 寄り道込み約5時間30分**。
- 始まりと「もういちど」後のNo.01再訪は、通常地域より演出密度を高くする。

## 2. 正式マップ番号一覧
| No. | 地域 | 区分 | 役割 / 備考 |
|---:|---|---|---|
| 01 | はじまりのばしょ | イベント専用 | 夜版／昼版。主人公が焚き火で目覚める。終盤「もういちど」後にも再訪 |
| 02 | はじまりのまち | 町 | 最初の通常拠点。モンスター増加と王の情報収集を知る |
| 03 | ビーエのもり | フィールド | 地域事件・異変。旧「はじまりのもり」は表示名としてSUPERSEDED |
| 04 | ビーエのむら | 村 | 山間の小村。林業・木こり救出系イベント |
| 05 | レインランドのもり | フィールド | 最初の王への報告につながる異変 |
| 06 | レインランドじょうかまち／レインランドじょう | 町／城 | 王への報告、No.07調査依頼。城下町と城内は同一正式地域の別ローカルマップ |
| 07 | まじんのどうくつ | 特殊ダンジョン | 主人公一人の全10層ターン制Dungeon RPG。撃破後に城へ再報告 |
| 08 | ザボンのむら | 村 | 狩り・魔物討伐経験者の地域。タロサの故郷 |
| 09 | いわやまのどうくつ | 特殊ダンジョン | タロサ一時参加→正式同行。縦スクロール（見下ろし型）の崩落シューティング要素 |
| 10 | かくれざと | 村 | ミレイと出会う地域 |
| 11 | みずうみの古城 | 特殊ダンジョン | ミレイが同行し、3人パーティーになる。3D探索＋謎解き。古代文字は通常探索へ常設せずイベント時だけ見せる |
| 12 | 港町ダコハ | 町 | 港・交易・人・物・噂が集まる町 |
| 13 | コタンカイムの洞窟 | ダンジョン | ゆうしゃのたてを得る中盤ダンジョン |
| 14 | ポサロ城 | 城 / 特殊拠点 | ミレイの過去と世界に一致しない記憶が進む。バクラー戦とゆうしゃのけん。3人で戦いながら進む横アクション型の特殊区間を持つ |
| 15 | ふっかつのほこら | ほこら | ゆうしゃのかんむりを得る。反射を連想できる薄いヒント。ミラーの答えを直言しない |
| 16 | デーマスのとう | 塔 / ダンジョン | ダイダインをミラーで反射する本戦 |
| 17 | ぬまちのどうくつ | 特殊ダンジョン | 終盤へ向かう。3人で戦いながら進む弾幕・アリーナ系アクション要素を持つ |
| 18 | いしのまち | 町 | 世界そのものの異常に気づき始める。町全体が石化した分かりやすいイベント町（2026-09-27ユーザー指示、§4.20）。旧「いしのむら」はSUPERSEDED |
| 19 | バトラスのとりで | 砦 | 毒の矢が正規攻略の鍵となるタロサの見せ場 |
| 20 | オロチへの道／オロチのしろ／最終地点 | 終章 | 縦シューティング要素→コマンドRPGの終章。裏ボスは公開時に伏せる。「もういちど」後は、わたべ対裏ボスの対戦格闘型特殊戦へつながる |
| 21 | 不思議な塔 | 塔 / 特殊拠点 | AIを組み込む街型の特殊拠点。各町に、この塔へ来るキャラクターを置く。訪問タイミング・必須／寄り道区分はTBD |

**No.01〜No.21を今後の正式なマップ管理番号とする。**
旧No.18「はじまりのばしょ」等の旧番号は、過去履歴の参照以外では使用しない。

## 3. No.01 はじまりのばしょ
- 「はじまりのまち」とは別マップ。
- イベント専用の小規模マップ。
- 同一ロケーションの夜版／昼版を用意する。
- 物語開始時は夜版。
- 主人公は焚き火付近で目覚める。
- 広大な探索や大量NPCは置かない。
- 正確な背景画像サイズ・昼への切替条件はTBD。

### 1回目の役割
- 主人公一人で目覚める。
- 知らない世界へ入った不安と静けさを見せる。

### 「もういちど」後の2回目
- オロチゾンビ1回目の異常シーケンス後に、**同じNo.01へ戻る**。
- New Gameではない。
- 主人公・タロサ・ミレイらは前の出来事を覚えている。
- 同じ焚き火・同じ場所を使い、初回との差だけで「冒険は続いている」と分からせる。
- 2回目の正確な配置・台詞・BGM／無音設計はTBD。

詳細: `OPENING_SPEC.md` / `STORY_FLOW.md` / `GLITCH_SPEC.md`。

## 4. No.02 はじまりのまち
- 最初の通常拠点。
- 内部マップ設計データは `assets/maps/data/no02_start_town_interiors.json` で管理する。
- 宿屋、道具屋、武器屋、教会、民家をコンパクトに構成する。2026-09-19、CURRENT背景画像(`assets/maps/starting_town/background.png`)に実在する建物が5棟（やどや/どうぐや/ぶきや/きょうかい/民家A）のみだったため、正式建物数を6→5へ縮小した（民家Bを統合終了、ユーザー確認済み）。詳細は本書§4.9。
- 2026-09-23、注釈画像の青ポイント（西端）を町の外へ出る唯一の出口、緑ポイント（南端）をフィールド側から入る出現地点として確定した。`fromField`と`fromWorldMap`はともにこの南端spawnを使う。
- 赤ポイント7か所は村人配置。どうぐや／ぶきや／民家A／やどや前の4人は固定店主、教会前／噴水西／南の道の3人は各地点の近傍だけをランダムに歩く。
- 2026-09-27 ユーザー指示（No.02の一度きりイベント2件）:
  - **ぶきやの店主からビーエのもりの情報を聞く**: 店主の「はなす」を初めて最後まで読むと、ビーエのもりの場所（まちの西のはずれの道を出て先）を聞き、最後のページ「ビーエのもりへ　いけるように　なった！」のあとに`story.bie_forest_unlocked`を保存する。世界地図の`destination_starting_forest`の`unlockFlag`をこのフラグへ変更したため、聞くまではビーエのもりは`？？？`で選べない。2回目以降は通常の会話だけを繰り返す。
  - **不思議なとうのおじいさん**: 赤ポイント7人とは別枠のストーリーNPC`npc_start_town_tower_elder`（`role: "story"`、見た目は塔の外のおじいさんと同じ`villager_17`）を、ぶきやの東の道（背景座標(1075,468)、左向き、その場に立つ）に置く。話しかけると、ふしぎなとうの更地を自由に使ってよいと説明し「先に行っている、落ち着いたら後から来てほしい」と告げる → 会話後に暗転（約0.5秒で暗く、約0.7秒真っ暗、約0.5秒で明るく。TEMP_TEST_VALUE）→ 暗転中におじいさんを消し`event.starting_town_tower_elder_talked`と`story.mysterious_tower_revealed`を保存する。一度きりで、以後の入場でもおじいさんは生成されない（NPC定義の`departedFlag`）。`story.mysterious_tower_revealed`により世界地図に不思議なとうが`？？？`（移動可）として現れる（`world_map/map.json`の`developmentUnlockedFlags`から同フラグを外し、この会話だけが解放源）。塔の更地の使い方・移住・建築条件はここで決めない（`TOWER_EXPANSION_BOUNDARY.md`）。
- 実価格・商品一覧・会話等の未確定値はnullのまま扱う。既存内部設計データのタイルGIDはlegacy実装値として保持し、新方式の正本にはしない。

## 4.5 No.01 / No.02とワールドマップの正式接続
- No.01の画像マップ北門Eventから `WorldMapScene` へ入る。`assets/maps/starting_place/events.json` の `world-map` コマンドが `world_map/map.json` の `from_starting_place` を参照し、現在地ポイントを解決する。
- No.02西端の出口から `WorldMapScene` へ入る。`world_map/map.json` の `from_starting_town` が現在地ポイントを解決する。
- 目的地の選択先は `assets/maps/world_map/destinations.json` の `targetMapId` / `targetSpawnId` を正とする。No.01 / No.02へ戻るspawnは `fromWorldMap` である。
- 初期のNo.01 / No.02は、No.01から初めて世界地図へ入れること自体が導線の解放条件であるため、現時点では `unlockFlag: null` とする。No.03以降はSaveSystemのフラグ連動で追加する。
- 2026-09-27: No.03ビーエのもりは`unlockFlag: "story.bie_forest_unlocked"`へ変更した（No.02のぶきやの店主から情報を聞くと解放。§4）。No.01 / No.02は`null`のまま。
- 2026-09-27 ユーザー指示: No.05レインランドのもりは`unlockFlag: "story.rainland_forest_unlocked"`へ変更した。No.04ビーエのむらの干し物の人（`npc_bie_village_herb_drier`）が「レインランドじょうへ行くにはレインランドのもりを通らなくてはいけない」と話す会話を初めて最後まで読むと、最後のページ「レインランドのもりへ　いけるように　なった！」のあとにこのフラグを保存する。聞くまでは`？？？`で選べず、2回目以降は通常の会話だけを繰り返す。このフラグはレインランドじょうかまち（`story.rainland_castle_town_unlocked`）を解放しない。

## 4.6 No.01→No.02間のFieldScene（legacy実装メモ、2026-09-13 Phase 8.5）
- No.01「はじまりのばしょ」とNo.02「はじまりのまち」は、物語進行上は引き続き連続する2地点であり、
  「フィールド」を新たな正式No.として追加するものではない(No.01〜No.21の番号体系は変更しない)。
- 既存実装には、この間を徒歩で移動するPhaser Scene(`FieldScene`)がある。
- 正式なフィールド名称・世界地理・地形・BGM・エンカウントは未確定のため、コード上は仮ID
  `field_starting_region`(DEV_PLACEHOLDER_FIELD)を使用する。正式名称が決まり次第置き換える。
- 2026-09-18以降、これは新規制作の方針ではない。地域間の通常移動はポイント選択式ワールドマップへ置き換え済みであり、既存`FieldScene`は削除せずlegacy / prototypeとして保持する。

## 4.7 ビーエのもり（旧「はじまりのもり」、内部ID互換、2026-09-18）
- 表示名はNo.03「ビーエのもり」。`starting_forest`、`destination_starting_forest`などの既存内部IDは互換のため残す。
- No.01「はじまりのばしょ」・No.02「はじまりのまち」の番号や役割を変更・再割当てするものではない。
- `WorldMapScene`の目的地の1つとして、No.01/No.02と同じ形式のデータ（`assets/maps/world_map/destinations.json`）で追加する。
- ローカルマップの実装方式はNo.01と同じBACKGROUND/COLLISION/EVENT/OBJECT（`MAP_SYSTEM.md`）を流用し、距離ベースのランダムエンカウント（`BATTLE_SPEC.md`§11）を持つ最初の地域である。
- 正式No.03として扱う。旧「番号なし追加フィールド」方針はSUPERSEDEDであり、既存内部IDのみを互換として残す。
- 2026-10-02: エリマキヘビ撃破は`boss.starting_forest_erimaki_tokage_defeated`だけを保存する。レインランドじょうかまち（No.06）はNo.05レインランドのもりで人を助けた後にのみ解放する。
- 青ポイントの`chest_starting_forest_kaifukuyaku`はジャンコインを1枚渡し、`chest.starting_forest_kaifukuyaku_opened`で再取得を防ぐ。2026-10-01ユーザー指示により、同地域の通常戦闘経験値は80%（端数切り捨て）とする。北の石アーチ（オレンジポイント）は既存の世界地図出口を維持する。
- 撃破後の帰還時だけ、北側ワープ領域に収まる`arrival_starting_forest_tarosa`からタロサが現れ「おれも　えりまきとかげを追っていた」と短く話す。会話後は同じワープ領域から去る。`event.starting_forest_tarosa_hunt_talked`で一度限りにし、この会話は加入イベントではない。
- 2026-09-26 タロサ登場演出の強化: 登場・退場は主人公の歩行速度(`PLAYER.moveSpeed`、距離÷速度で所要時間を算出)で歩き、ワープ領域でフェードイン/アウトする。会話中は画面右側に額縁つきの立ち姿(`assets/characters/portraits/tarosa_standing.png`)を表示し、会話は4ページ（「……倒したのは　おまえか。」「おれも　えりまきとかげを　追っていた。」「……先を　こされたな。」「つぎの　えものは　おれが　しとめる。」）。4ページ目の台詞は初稿でTBD。表示位置・大きさ・フェード時間はTEMP_TEST_VALUE。
- 2026-09-27 南端の出口追加: ユーザー指示で、道の最下端（南の木戸の外、画像下端）も出口にした。`events.json`の`event_starting_forest_south_exit`（背景座標 x684〜868 / y1000〜1024、最下端の歩行可能な道幅いっぱい）が北の石アーチと同じ`world-map`（`worldMapEntryId: from_starting_forest`）へ戻る。世界地図から入るspawn（770,970）は出口ゾーンの外にあり、到着直後には退場しない。出口ゾーンの位置・大きさはTEMP_TEST_VALUE。
- 2026-10-02: 北の石アーチ・南の木戸のどちらから出ても、世界地図へ遷移する直前に`story.bie_village_unlocked`を保存する。初回はビーエのむらが`？？？`で選べず、森を一度出た後にだけ選択可能になる。

## 4.8 No.04 ビーエのむら（旧No.03実装との互換、2026-09-18）
- 正式No.は04。既存`map_03_bie_village`、`destination_bie_village`、Scene名・テスト名は旧No.03由来の互換IDとして残す。
- `BieVillageScene`がNo.01/ビーエのもり（内部`starting_forest`）と同じPlayer/InputSystem/Collision/Camera/Transitionをそのまま再利用する。新しいCollision方式は作っていない。
- `assets/maps/world_map/destinations.json`へ`destination_bie_village`を追加し、本書§4.5の方針どおり`unlockFlag: "story.bie_village_unlocked"`を持たせた（No.01/No.02のような`null`＝常時解放にはしていない）。
- 本番`WorldMapScene`は2026-09-23から共有`GameStateRepository.flags`を解放判定へ加える。既存`developmentUnlockedFlags`はビーエのむらなどの開発用初期解放としてだけ残し、ボス撃破など実際の進行では使わない。`WorldMapTestScene`は`?worldMapFlags=`で明示した状態を確認できる。
- NPC・会話・木こり救出イベントは`docs/NPC/02_bie_no_mura.md`が`SOURCE_DRAFT_EXISTS / REDUCING`（人数・台詞本文とも未確定）のため今回は実装しない。ランダムエンカウントも今回は追加しない。
- 2026-09-23 マップ構成変更: 背景をユーザー提供`ビーエのむら更新.png`（1536×1024、建物配置は旧版とほぼ同じで道が広く・つながりが明快になった版）へ差し替え、Collisionを`tools/build_bie_village_collision.py`で再生成した。北門の位置・`fromWorldMap` spawn・北門Eventの座標は新背景でもそのまま一致するため変更していない。
- 2026-09-23 小さな異変: ビーエのもりから続く地域の異変として、背景の一部が一瞬だけ乱れる演出（チリチリした点ノイズ・背景の横帯のずれ・小さな四角が一瞬別の絵になる「マップチップ化け」）を常時重ねる。木こりの家・広場の大木・北門・水車小屋の滝の周辺で起きやすい。設定は`src/config/bieVillageAnomaly.ts`、表示は`src/systems/MapAnomalyAmbience.ts`（背景とキャラクターの間に重なり、Collision・入力・進行フラグ・セーブには触れない）。文字・画面全体の乱れ・音は使わない（`GLITCH_SPEC.md`§11-2）。
- 2026-09-23 入場演出: 世界地図から入るとき（spawn `fromWorldMap`）だけ、ユーザー指定の`ビーエのむら_イメージ.png`（無加工コピー`assets/maps/bie_village/entry_splash.png`）をレインランドじょうかまちと同じ`MapSplashScene`で5秒投影し、地名「ビーエのむら」を表示してから村へ入る。
- 出入口は北門1か所のみを`WorldMapScene`への正式接続として実装。背景に描かれた東・南東方向へ続く道は行き止まりのまま残し、正式な接続先は今回定めない。

## 4.9 No.02 はじまりのまち 画像マップ移行（2026-09-19）
- No.02をDEV_PLACEHOLDER表示（単色背景＋単色矩形の建物）からCURRENT背景画像方式（`MAP_SYSTEM.md`）へ移行した。`StartingTownScene`はNo.01/ビーエのもり（内部`starting_forest`）/ビーエのむらと同じ4レイヤー・同じ実行時ランタイムを再利用する。
- 建物内部（InteriorScene）接続は既存実装を再利用する。NPCは2026-09-23に、四角形のDEV_PLACEHOLDERとNo.02内のDEV戦闘／仲間加入NPCを撤去し、ユーザー提供の村人素材を使う7人の配置へ更新した。店の価格・商品・店UI、正式な加入・戦闘イベントは別途TBD。
- reference画像(`はじまりのまち.png`)に実在する建物は5棟（やどや/どうぐや/ぶきや/きょうかい/民家A）のみで、旧DEV_PLACEHOLDER時代の6棟目（民家B）に対応する建物は描かれていない。ユーザー確認のうえ、正式建物数を6→5へ縮小し、`assets/maps/data/no02_start_town_interiors.json`・`src/config/interiors.ts`・`src/config/maps.ts`から`map_02_house_b`関連データを削除した。
- 出入口は注釈画像の青ポイントに当たる西端1か所のみを`WorldMapScene`への正式接続として実装（本書§4.5の記述と一致）。戻りは緑ポイントに当たる南端spawn。建物のドア判定は`building.door`（背景ピクセル座標）と既存の`createExitZone`をそのまま使う。
- カメラは他の画像マップと同じ`configureMapCamera`（追従）へ変更した。旧実装は960×720に固定表示でスクロールしなかったため、`DialogueBox`にスクロール追従しない`setScrollFactor(0)`を追加した。
- 2026-09-27 入場演出: 世界地図から入るとき（spawn `fromWorldMap`）だけ、ユーザー指定の`はじまりのまち_イメージ.png`（無加工コピー`assets/maps/starting_town/entry_splash.png`）を他の町と同じ`MapSplashScene`で5秒投影し、地名「はじまりのまち」を表示してから町へ入る。

## 4.10 No.05 レインランドのもり（旧追加フィールド実装との互換、2026-09-19）
- 正式No.は05。既存`rainland_forest_1/2`、`destination_rainland_forest`、Scene名は番号なし追加フィールドだった時点の互換IDとして残す。
- ユーザー提供の背景画像2枚（`レインランドのもり　その１.png`／`その2.png`、いずれも1448×1086）を、同一エリアの連続する2画面として実装した。`assets/maps/rainland_forest_1/`（`map_rainland_forest_1`、`RainlandForest1Scene`）と`rainland_forest_2/`（`map_rainland_forest_2`、`RainlandForest2Scene`）。No.01と同じBACKGROUND/COLLISION/EVENT/OBJECT方式（`MAP_SYSTEM.md`）を流用し、`worldScale: 1.5`を適用する。
- 導線: `WorldMapScene`の`destination_rainland_forest` → その1の南の石門内側(`fromWorldMap`)。その1の南口 → 世界地図(`from_rainland_forest`)。その1の北の木の階段 → その2の南の木の階段の上(`fromForest1`)。その2の南口 → その1の北の階段の下(`fromForest2`)。**2026-10-01ユーザー指定:** その2の北・西・東の道端（`event_rainland_forest_2_{north,west,east}_exit`）→ 世界地図(`from_rainland_forest`)。
- その1の途切れた小道の先は、接続先未定の行き止まりとして残す。No.06レインランドじょうかまち／じょうへの最終ローカル接続は今回定めない。
- 地点は`unlockFlag: "story.rainland_forest_unlocked"`（2026-09-27。それ以前は`null`の常時選択可能）。ビーエのむらの干し物の人と話すまでは世界地図で`？？？`となり選べない。南口から世界地図へ戻れる。位置は`FINAL_POSITION`。出現モンスター・NPC・BGMはTBD。ランダムエンカウントは出現モンスターが未確定のため持たない。
- 仲間（タロサ・ミレイ）は、通常フィールドの画像マップ全て（No.01/No.02/ビーエのもり（内部`starting_forest`）/ビーエのむら/レインランドのもり）で主人公に付いてくる。
- 2026-09-27 ユーザー指示（その2の木こりと宝箱。注釈画像のオレンジ・赤のポイント）:
  - 注釈画像(867×544)は`rainland_forest_2/background.png`(1448×1086)の上端908px分を縮小したもの。背景へ重ねて縮尺1.6701・ずれ0で一致することを確認し、ポイントの中心をネイティブ背景pxで測った: **オレンジ (651, 299)**＝木こり、**赤 (133.5, 195)**＝宝箱。
  - **木こり**: オレンジポイント（北の橋の北東、道の左端）に`npc_rainland_forest_woodcutter`（`role: "story"`、`villager_03`、下向き、その場に立つ）を置く。足元Bodyの中心がポイントに一致し、道幅の残り（約45px）で北へ抜けられる。話しかけると5ページの会話（レインランドじょうへはじょうかまち経由で行くと教える）→初回だけ末尾に「レインランドじょうへ　いけるように　なった！」→閉じた時点で`story.rainland_castle_town_unlocked`を保存し、世界地図でレインランドじょうかまち（§4.12）が選べるようになる。2回目以降は通常の5ページのみ。会話本文は`DIALOGUE_DRAFT`（`data/dialogues.ts`の`FIRST_TALK_UNLOCKS`）。ビーエのむらで「戻らない」と言われている木こりと同一人物かは示さない（TBD）。
  - **宝箱**: 青丸ポイント（北西の遺跡のアーチの根元）に`objects.json`の`chest_rainland_forest_2_ruin`（`blocking: true`）。前（南）から調べると`かいふくやく`1個を得て、`chest.rainland_forest_2_ruin_opened`を保存して消える。中身は2026-10-01ユーザー指定。見た目はNo.03と同じコード描画の共通宝箱（`systems/ChestTexture.ts`の`createChestVisual`）。
  - 木こりを助けて会話を読み終えることが、レインランドじょうかまちの唯一の解放条件である。

## 4.11 No.07 まじんのどうくつ（旧No.08実装との互換、特殊ターン制Dungeon RPG、2026-09-20）

- 到達目安は**Lv8前後**。正式No.07だけは`MAP_SYSTEM.md`の明示的な特殊例外で、連続歩行の画像マップではなく、32×32論理グリッドを一手ずつ進むターン制Dungeon RPGとして実装する。主人公が有効な移動／攻撃／待機を1回行うたび、可視敵が各1回行動する。壁への無効移動とメニュー操作はターンを消費しない。
- `map_08_majin_cave` / `MajinCaveScene`は旧No.08由来の互換IDで、正式No.07の実装。seed付きで決定的に1〜9Fを生成し、10Fは入口→短い探索→広いボス部屋という固定要素を持つ。全主要部屋、入口、階段は論理的に接続される。Tiled TMJ/TSJと通常の`background.png` / Collision Maskは使わない。
- 敵編成は1〜3Fがプリン／たまゴースト、4〜6Fがおばけつむり／ファンシーダック／スノーボム、7〜10Fがこあくま／エリマキヘビ／ダイジャ。10Fの最深部には必ずまじんを置く。通常敵・まじんともこのDungeon側の近接戦闘で扱い、通常の`BattleScene`へ遷移しない。数値は`DEV_MAJIN_CAVE_BALANCE`で隔離する。
- まじんを撃破すると`descent`から`ascent`へ切り替わる。プレイヤーはワープで外へ出ず、生成済みで敵の撃破状態を保持した10F→9F→…→1Fを実際に戻って洞窟出口へ出る。
- 1 runにつき4〜9Fのseed決定フロア1つだけをモンスターハウスにする。通常敵数の2倍を当該階の敵表から配置し、初回入場後だけ`モンスターハウス`を表示する。帰路では同一FloorStateを使うため、敵・宝箱（将来実装）・探索済みミニマップ・表示状態を保持する。専用報酬は宝箱／アイテムシステム未実装のためTBDであり、現時点では攻略進行を妨げない。
- 通常のポイント選択式`WorldMapScene`に`destination_majin_cave`を追加し、正式No.07へ直接入る。位置は旧試作の座標`(1200, 220)`を再利用した`DEV_PLACEHOLDER_POSITION`であり、正式な地理・解放条件はTBD。1F出口からは同じ世界地図のNo.07地点へ戻る。`?mapTest=majin-cave`も単体確認用に維持する。REFERENCEキービジュアルはランタイム表示しない。下り／上り階段のmain画面markerは探索圏に入ってから表示し、未探索フロアの目的地を先出ししない。

## 4.12 No.06 レインランドじょうかまち（旧追加フィールド実装との互換、2026-09-19）
- ユーザー提供の俯瞰マップ`レインランドじょうかまち.png`(1447×1087)を、世界地図から入る町として追加した。`assets/maps/rainland_castle_town/`（`map_rainland_castle_town`、`RainlandCastleTownScene`）。No.01と同じBACKGROUND/COLLISION/EVENT/OBJECT方式（`MAP_SYSTEM.md`）で`worldScale: 1.5`。
- **番号の扱い**: 正式No.06「レインランドじょうかまち／レインランドじょう」の城下町側。`map_rainland_castle_town`等は旧番号なし追加フィールド由来の互換ID。旧No.04「レインランドのまち」対応の解釈はSUPERSEDED。
- 導線: 世界地図の`destination_rainland_castle_town` → 南門の道の内側(`fromWorldMap`)。南門(`events.json`の`world-map`、`from_rainland_castle_town`) → 世界地図。北の城門(`events.json`の`transfer`) → 同じ正式No.06のレインランドじょう(`fromCastleTown`)、城から出ると北の城門前(`fromCastle`)へ戻る（§4.13、2026-09-20）。西・東の堀の橋の先は接続先未定の行き止まり。
- **入場演出**: 世界地図から入るときだけ、`レインランドじょう_イメージ.png`(1448×1086)を5秒(フェードイン1秒→保持3秒→フェードアウト1秒)で投影してから町へ入る。汎用の`MapSplashScene`＋`src/config/mapSplash.ts`(画像・秒数・対象spawnId・地名)で管理し、対象外のspawnや退場時は挟まない。
- 地点は`unlockFlag: null`（常時選択可）、座標は`DEV_PLACEHOLDER_POSITION`。NPC・店・建物内部・BGMは未実装／TBD（`docs/NPC/03_rainland_no_machi.md`に会話原案があるが人数・台詞は未確定）。

## 4.13 No.06 レインランドじょう（旧No.05実装との互換、通常RPG方式の城内、2026-09-19着手・2026-09-20導線確定）
- 正式No.06の城内側を、歩ける画像マップとして追加した。`assets/maps/rainland_castle/`（`map_05_rainland_castle`、`RainlandCastleScene`）。`map_05_rainland_castle`は旧No.05由来の互換ID。No.01と同じBACKGROUND/COLLISION/EVENT/OBJECT方式（`MAP_SYSTEM.md`）で`worldScale: 1.5`。
- **導線（正式）**: レインランドじょうかまち(§4.12)の**北の城門**(`event_rainland_castle_town_castle_gate`、`transfer`) → 城門を入った入口ホール(`fromCastleTown`、上向き)。城の出口(`event_rainland_castle_exit`、`transfer`) → 町の北の城門前(`map_rainland_castle_town`の`fromCastle`、下向き)。**世界地図には城を直接載せない**（町が世界地図の地点であり、城は町の北の城門の先という既存の世界構造を優先した）。
- 構成（コンパクトな1フロア）: 城門・入口ホール・中央ホール・王の間へ向かう絨毯の通路と扉（扉の先は未実装）・西翼（階段の位置）・東翼（小部屋）。NPCは仮5人。イベント点: 入口／王の間の入口／階段／東の小部屋(将来のイベント用の予約地点、内容と名称はストーリー非依存のIDで場所だけ確保)／出口。
- **背景は正式**（2026-09-20）: ユーザー提供の城内背景`レインランドじょう_城内.png`(1448×1086)を無加工でCURRENT背景にした（`map.json`の`assetStatus: CURRENT`）。`collision.png`は`tools/build_rainland_castle_collision.py`が背景から測った矩形で生成する。差し替えは画像2枚と`map.json`の更新のみ（`ASSET_INDEX.md`）。`レインランドじょう_イメージ.png`（外観）と`レインランドじょう_マイクラ風.png`（一人称のブロック城）は歩行背景ではない。
- **3D（ブロック城）**（2026-09-23ユーザー指示「レインランドじょう3Dを実装。2Dと3Dを切り替えられると楽しい」）: `RainlandCastle3DScene`。`レインランドじょう_マイクラ風.png`を見た目の参考に、城内をブロックで組み立てた一人称の3D表示。**2Dが既定**で、V/右上の「3D」ボタンで**今いる場所・向きのまま**3Dへ、V/「2D」で2Dへ戻る。
  - 同じ城のデータをそのまま使う: 歩ける場所は2Dと同じ`collision.png`の8pxセル判定（3Dの壁ブロックは判定に使わないので通れる場所は2Dと完全一致）、NPC5人と台詞、Event（出口でじょうかまちの北の城門前へ戻る、DEVメッセージの各点）。
  - 見た目の組み立て（`src/config/rainlandCastle3D.ts`・`src/systems/Castle3DLayout.ts`）: 1ブロック=背景16px。歩ける床（絨毯は2Dの青い絨毯の範囲、紋章2か所）、床に接する歩けないブロックを高さ5の壁、2Dの障害物の位置に台座・植木・街灯・長椅子と絵・机、壁面に旗・燭台・王の間の扉・絵、西翼の階段は北へ上がる段差（目の高さも上がる）。NPCはブロック人形（兵士は青い服と兜）。テクスチャは画像を増やさずコードで描くドット絵（`Castle3DTextures.ts`）。
  - 2026-09-23追加指示「イメージはマイクラ風の参考画像のような感じ。仲間は見せない。天井も作る」: **天井**（高さ6。壁から離れた所は2×2の青い格間の格天井、壁ぎわは2段の張り出しで段々）、天井から鎖で下がる**ランタン**8個（暖かい光源）、暖かい日差しの照明、**絨毯の金の縁取り**、台座を**青い紋章の板つきの柱＋白い花のプランター**に、植木を白い花に、外の景色（青空・雪山・塔）が見える**アーチ窓**8か所（3Dだけの飾り）。参考画像の噴水は2Dの城に無いため置いていない（2Dと3Dで配置をそろえる）。
  - 2026-09-23画質向上: 等倍解像度＋アンチエイリアス、32×32の面取りテクスチャ、床の壁ぎわの陰影、燭台とランタンの光の輪、ミップマップ・異方性フィルタ、フィルミックのトーンマッピング。
  - 2026-09-23グレードアップ: 壁の付け柱・つた・扉のアーチ枠・窓からの光の筋・漂うほこり・床のつや。人物は顔・髪・服・持ち物を描いたブロック人形で、息づかい・まばたき・見回し・話しかけると向き直る（見た目は役割に合わせた仮のもの）。
  - **王の間**（2026-09-23、ユーザー提供`レインランドじょう_城内2.png`）: 城の北の王の間の扉（`event_rainland_castle_throne_room_entrance`、`transfer`）→ 王の間の南の入口（`map_rainland_throne_room`の`fromCastle`、上向き）。王の間の南の出口（`event_rainland_throne_room_exit`）→ 城の扉の前（`fromThroneRoom`、下向き）。2D（`RainlandThroneRoomScene`）と3D（`RainlandThroneRoom3DScene`）をV/「3D」「2D」で切り替えられる。構成: 南の入口 → 燭台の台座が並ぶ広間 → 左右の翼 → 絨毯の階段 → 一段高い壇（手すり・燭台・植木）→ 玉座と大きな紋章の垂れ幕。3Dでは壇と階段が1ブロック高く、目の高さも上がる。王（玉座に座る）と近衛兵2人が立つ。**2026-09-27強化**: 王の台詞を、STORY_FLOW.md確定内容（「えらばれたゆうしゃ」ではなく異常地域を実際に越えてきた旅人として信頼し、No.07まじんのどうくつの調査を依頼する。主人公は自分の意思で引き受ける）に沿った複数ページの会話へ書き直した。会話の区切りに、ザボンの狩人（タロサ、まだ正式加入前）へ言及する場面で`assets/characters/portraits/tarosa_archery_report.png`（REFERENCEのバイト一致コピー）を額縁つきで挟む（`src/events/BattleEventData.ts`の`PortraitInterludeDialogueEvent`、`RainlandImageMapScene`が汎用に処理）。No.07でまじんを倒すと`boss.majin_cave_boss_defeated`が立ち、再訪した王の間は「討伐報告」の会話（同じくタロサへの謝辞を挟む）に切り替わり、読み終えると`event.rainland_throne_majin_reported`を保存して以後は短い後日談になる（`SAVE_FLAG_SPEC.md`）。ミレイの正体・王家の事情・タロサの全過去には触れない（`docs/NPC/04_rainland_castle.md`§4・§6）。近衛兵2人の台詞・王の正式な人物設定・人数はDEV_PLACEHOLDER_NPCのままTBD。`?mapTest=rainland-throne-room`で単体確認。
  - 3D表示は共通の`Castle3DScene`（城内・王の間）で、マップごとの違いは`src/config/rainlandCastle3D.ts`の`Castle3DConfig`（絨毯・壇・低い壁・壁飾り・置物・ランタン・人物）だけに書く。
  - **仲間（タロサ・ミレイ）は3Dでは表示しない**（2026-09-23ユーザー確定）。2Dへ戻ると従来どおり付いてくる。
  - 操作: ↑↓前進・後退、←→旋回、Zで正面のNPCと話す、Cメニュー。右上にミニマップ（2Dの城の絵に現在地と向き）。タッチ用の十字・Z・C・「2D」ボタンあり。
  - 城下町の北門から入ると2Dの城に入る（3Dを既定にする場合は`config/maps.ts`の`map_05_rainland_castle.sceneKey`を`RainlandCastle3DScene`へ変えるだけでよい）。単体確認は`?mapTest=rainland-castle-3d`。
- 未実装／TBD: NPCの正式人数・台詞（`docs/NPC/04_rainland_castle.md`）、王の間・上階、各イベント本編、BGM。

## 4.14 No.08 ザボンのむら（2026-09-23）
- ユーザー提供`ザボンのむら　新.png`（1448×1086）を無加工でCURRENT背景にした画像マップ。`assets/maps/zabon_village/`（`map_zabon_village`、`ZabonVillageScene`）。旧番号由来の`map_08_majin_cave`（正式No.07）と紛らわしいため、MapIdに番号を付けていない。レインランドの各マップと同じ共通画像マップScene（`RainlandImageMapScene`）を使い、`worldScale: 1.5`。
- 構成（背景に描かれたもの）: 中央の広場とトーテム、北の族長の家（石段つき）、民家6棟（うち2棟は壊れた家）、井戸、弓の練習場、獣皮の干し場、畑3面、西の滝と吊り橋、南西の桟橋と小舟、北東の山のどうくつ。
- **導線**: まじん討伐を王へ報告し終えた`event.rainland_throne_majin_reported`後、世界地図の`destination_zabon_village`（`implemented`、同フラグが`unlockFlag`）→ 北東の山道の内側（`fromWorldMap`、下向き）。ザボンは世界地図の最南にあり北のレインランド方面から来るため、画像上端へ抜ける北東の山道を正式な出入口とした。北口Event(`event_zabon_village_north_exit`) → 世界地図(`from_zabon_village`)。
- 世界地図から入るときだけ、`ザボンのむら_イメージ.png`（`entry_splash.png`）を5秒の入場演出として挟む（`config/mapSplash.ts`、レインランドじょうかまちと同じ）。
- Collisionは`tools/build_zabon_village_collision.py`で生成（土の道の色→8pxセル→穴埋め・孤立点除去→道の縁へ1セル拡幅（水と障害物には広げない）→吊り橋・桟橋・石段・どうくつ前・西の道を手測定矩形で追加→トーテムと井戸を除外→北東の入口につながる道だけ残す）。歩ける場所は実際のプレイヤー判定で`tests/bodyPassability.test.mjs`が確認する。
- **タロサ**: 上記の王への報告後だけ、的場の手前に`npc_zabon_tarosa`が現れる。王の依頼を主人公が伝えると一度だけ断り、会話読了で`event.zabon_tarosa_refused`を保存する。この時点では同行しない。
- 北東のどうくつの入口はDEVメッセージだけのEvent（`event_zabon_village_cave_mouth`）。接続先（No.09いわやまのどうくつか等）はTBD。西の吊り橋・南東の道・南の道・桟橋の先は接続先未定の行き止まり。
- 未実装／TBD: 族長の家などの建物内部、店・宿、BGM。生活住民6人の会話は`DIALOGUE_DRAFT`。戦闘なし。

## 4.15 No.09 いわやまのどうくつ（2026-09-23）
- ユーザー提供の縦長原画2枚（1024×1536）を無加工でCURRENT背景にした2フロアの画像マップ。1F=`いわやまのどうくつ_1.png`（`assets/maps/iwayama_cave_1/`、`map_iwayama_cave_1`、`IwayamaCave1Scene`）、2F=`いわやまのどうくつ_3.png`（`assets/maps/iwayama_cave_2/`、`map_iwayama_cave_2`、`IwayamaCave2Scene`）。`_2.png`は`_1.png`とバイト一致のため、ユーザー判断で2フロア構成とした。共通画像マップScene（`RainlandImageMapScene`）を使い、`worldScale: 1.5`。
- **導線**: タロサがザボンで断った`event.zabon_tarosa_refused`後、世界地図の`destination_iwayama_cave`（`implemented`、同フラグが`unlockFlag`）→ 1F南西の階段（`fromWorldMap`、上向き）。1F入口Event → 世界地図（`from_iwayama_cave`）。1F北東の階段の上 → 2F南の階段（`fromCaveFloor1`、背景の青い三角の上、上向き）。2F南の階段の下 → 1F北東の階段（`fromCaveFloor2`、下向き）。**入口は世界地図からのみ**（ザボンのむら北東のどうくつとは接続しない、ユーザー確定）。世界地図から入るときだけ`いわやまのどうくつ_イメージ.png`の入場演出（5秒）を挟む。
- 構成: 1F=燭台のある岩棚を木の階段と吊り橋でつないだ回廊（地底湖つき）。2F=外周の輪の回廊と中央の台地（左右の吊り橋・中央の階段）、北の階段の上が最奥。2F南の階段の下にある岩棚は階段とつながっていないため歩行不可。
- **ランダムエンカウント**（1F・2F共通）: こあくま・エリマキヘビ・ダイジャ（`ENCOUNTER_TABLES.iwayama_cave`、均等出現）。頻度は`IWAYAMA_CAVE_RANDOM_ENCOUNTER`(360pxごと25%。2026-09-25にビーエのもりだけ2倍にしたため、現在はビーエのもりの半分)。戦闘背景は洞窟（`mq0_battle_bg_009`）。敵の構成・出現率はTEMP_TEST_VALUE（まじんのどうくつ7〜10Fの敵を引き継いだ仮構成）。
- Collisionは`tools/build_iwayama_cave_collision.py`で生成（石畳の色→8pxセル→穴埋め・孤立点除去→床の縁の小石ぶん2セル拡幅（床をほぼ含まない岩・暗闇には広げない）→木の階段・吊り橋を手測定矩形で追加→入口につながる床だけ残す）。歩ける場所は実際のプレイヤー判定で`tests/bodyPassability.test.mjs`が確認する。
- **タロサ救援**: 上記フラグ後の1F初回入場で、主人公が単独ではがれきを越えられない会話を出す。タロサが救援に来て`event.iwayama_cave_tarosa_rescued`を保存し、一時同行として隊列へ加わる。2F北の最奥`event_iwayama_cave_2_inner_point`を通ると、共闘して洞窟を抜けた会話を出し、`story.iwayama_cave_cleared`を保存してNo.10を解放する。1F北東の階段手前の赤い丸から縦スクロール（見下ろし型）の崩落シューティング（`IwayamaShootingScene`、§2.1）を実装済み。NPC・宝箱なし。

## 4.16 No.10 かくれざと（2026-09-24）

- ユーザー提供`かくれざと.png`（1536×1024）を無加工でCURRENT背景にした画像マップ。`assets/maps/hidden_village/`（`map_hidden_village`、`HiddenVillageScene`）で、BACKGROUND / COLLISION / EVENT / OBJECTの4レイヤーと`worldScale: 1.5`を使う。
- **導線**: `story.iwayama_cave_cleared`後、世界地図の`destination_hidden_village`（`implemented`、同フラグが`unlockFlag`）→ 北西の木門内側（`fromWorldMap`、下向き）。初回到着の語りを閉じると`event.hidden_village_visited`を保存し、No.11を解放する。北西門のEvent（`event_hidden_village_northwest_exit`）→ 世界地図（`from_hidden_village`）。入場演出、建物内部、店、BGMは未実装／TBD。
- **ミレイ**: まず古城1Fの水流または2Fの古代文字で`event.lake_castle_inscription_needs_mage`が保存される。その後かくれざとへ戻ると、中央の道に身分を明かさないミレイが現れる。話すと古城までの仮同行を引き受け、`event.hidden_village_mirei_joined`を保存して隊列へ加わり、村から去る。
- 最新のNPC目安は**住民5人 + ミレイ**。現コードには生活会話だけの仮住民8人があり、この目安および`NPC_DIALOGUE_MASTER.md`未提供の状態と競合する。会話本文・配置は現行正式データとして確定せず、`NPC_SPEC.md` / `TBD_REGISTRY.md`で管理する。

- ユーザー提供`かくれざと.png`（1536×1024）を無加工でCURRENT背景にした画像マップ。`assets/maps/hidden_village/`（`map_hidden_village`、`HiddenVillageScene`）。No.01と同じBACKGROUND/COLLISION/EVENT/OBJECT方式、共通`RainlandImageMapScene`、`worldScale: 1.5`を使う。
- **導線**: 北西の門から世界地図へ戻る（`event_hidden_village_northwest_exit` → `from_hidden_village`）。世界地図の`destination_hidden_village`は`story.iwayama_cave_cleared`後に実装済みで、同じ門の内側`fromWorldMap`へ到着する。
- Collisionは`tools/build_hidden_village_collision.py`で生成する。道色を8pxセルへ抽出し、北西の門・石段・神社前・広場・家前・木橋・水車前・洞窟前を手測定領域で補い、建物・神社・水・滝・崖・森を除外して北西入口につながる経路だけを残す。実プレイヤーの当たり判定で全spawn・出口・主要地点までの到達性をテストする。
- 現在のコードには家・神社・水車の前の固定6人と、広場・西の花壇の小道を歩く住民2人の**仮配置**がある。全員は`assets/characters/reference/reference/村人たち/`由来の既存ランタイム村人シートを使うが、最新目安の「5人＋ミレイ」と一致しない。`NPC_DIALOGUE_MASTER.md` が未提供のため、正式会話・正式配置へ自動置換しない。
- 未実装／TBD: 建物内部・BGM、生活住民の正式な会話本文と最終人数、洞窟の接続先。

## 4.16a No.11 みずうみの古城（2026-09-29）

- `LakeCastle3DScene`のコンパクトな一人称3Dを正本とし、1F・2F・3Fを個別の論理フロアとして持つ。石・水面・ステンドグラスは`assets/maps/lake_castle/materials/`の高精細反復テクスチャを読み込み、床・壁・橋の既存インスタンシング構成は維持する。壁の継ぎ目・浅い欠け・苔も少数のInstancedMeshにまとめ、反復感を抑える。1Fは水面の反射光、2Fは書庫の埃、3Fは祭壇の粒子を持ち、青緑／深い青／紫の`visualPalette`と合わせて階層を視覚的に区別する（TEMP_VISUAL_VALUE）。
- **階層導線**: 1F北の青い石段は2Fへ、2F南の金色の石段は1Fへ、2F北の紫の石段は3Fへ、3F南の金色の石段は2Fへ戻る。実景の灯り付き石段・通路中ほどの矢印付き誘導灯、近接時のプロンプト、右上ミニマップの`○Fへ`ラベルを同じ遷移データから表示する。未解放の石段と誘導灯は灰色で`（封印）`と表示する。
- **1F→2F**: 初回だけ石段の正面に青い水流の水門を表示して閉鎖を視覚化する。ミレイ不在なら、主人公たちだけでは流れを止められず、`event.lake_castle_inscription_needs_mage`を保存して魔法使いを探すため引き返す。ミレイ同行後は、ミレイが魔法で流れを鎮め、`event.lake_castle_stairs_unsealed`を保存する。水門は専用マテリアルを収束・フェードさせてから2Fへ遷移し、以後は通常の石段として通行する。1Fを再構築した時も水門は表示しない。
- **2F→3F**: 古代文字を調べるまで北の石段は通れない。ミレイが同行していない場合も魔法使いを探す導線を保存する。同行時はミレイが文字を読み、`event.lake_castle_ancient_inscription`で石段を解放する。3F祭壇では壁のしるしからデーマスの存在へつながる手がかりを見つけ、`event.lake_castle_mirei_joined`と`event.lake_castle_demas_clue_found`を保存する。正確な台詞本文とNo.12への本編条件は`DIALOGUE_DRAFT`／TBD。
- **ランダムエンカウント**: `ENCOUNTER_TABLES.lake_castle`はやきプリン／カマイタチ／きりまねき（各1、均等）を使う。HP・攻撃・防御・素早さ・EXP・Gは`MONSTER_ROSTER`のNo.10〜12確定値。戦闘前の既存1.3秒遷移には、古城の石アーチ・水紋と対象敵ごとの色を重ねるが、戦闘値・出現率・ドロップを変えない。No.11用のレベル帯はフォルダ内の正本に未定義のため、レベル値を新設しない。コンパクト3Dグリッド向けの出現間隔は`LAKE_CASTLE_RANDOM_ENCOUNTER`の`TEMP_TEST_VALUE`のままとする。

## 4.17 No.12 港町ダコハ（2026-09-26）
- ユーザー提供`港町ダコハ.png`（1448×1086）を無加工でCURRENT背景にした画像マップ。`assets/maps/dakoha_port/`（`map_dakoha_port`、`DakohaPortScene`）。レインランド・ザボンと同じ共通画像マップScene（`RainlandImageMapScene`）、`worldScale: 1.5`。
- **導線**: 世界地図の`destination_dakoha_port`（`planned`→`implemented`、`unlockFlag: null`、位置は従来の(820,675)のまま）→ 陸側の北門（画像上端中央のアーチ）の前の踊り場（`fromWorldMap`、下向き）。北門Event(`event_dakoha_port_north_gate`) → 世界地図(`from_dakoha_port`)。北門が唯一の出入口。
- 世界地図から入るときだけ、`港町ダコハ_イメージ.png`（`entry_splash.png`）を5秒の入場演出として挟む（`config/mapSplash.ts`）。
- Collisionは`tools/build_dakoha_port_collision.py`が生成する。明るい石畳の色から歩ける範囲を作り、石段・木の桟橋・東の岸壁（色が暗い石畳）・灯台への道を手で足し、露店・街灯・植え込みで狭くなる広場には主人公の足元＋余白が通れる幅の通路を確保した。建物・露店・噴水・木箱・海・崖・森は通れない。南の貨物桟橋と帆船は陸とつながっていないため歩けない。北東の教会・上段の家並みの小道は導線が絵から読み取れないため今回は歩けない。
- **村人・宿屋・武器屋（2026-09-29ユーザー指示「港町ダコハの村人を追加してください。他の村と同じように宿屋、武器屋を追加してください」）**: NPC_SPEC.mdの目安7人を配置。固定5人（やどやの主人＝宿屋の店番、ぶきやの店主＝武器屋の店番、とうだい近くの老婆、広場の屋台の女性、波止場の漁師）＋歩く2人（東の埠頭の少年、広場西の船乗り）。宿屋・武器屋はビーエのむら・かくれざとと同じく専用の店番を増やさず、やどやの主人・ぶきやの店主が兼業する（`config/shops.ts`、品揃え・価格は他の町と同じTEMP_TEST_VALUE）。ユーザー指示は宿屋・武器屋のみのため道具屋は追加していない。デーマスの噂はとうだい近くの老婆が「デーマス」という名を旅人のうわさとして口にする1段だけ（NPC_SPEC.md §5、しょうたい・ミラー・ダイダインには触れない）。村人の見た目はユーザー指示「今まで使った村人の画像は使わない」に従い、`assets/characters/reference/reference/村人たち/`のうちvillager_01〜17が未使用の生成回から新たにvillager_18〜24を作成して割り当てた（`tools/build_villager_sheets.py`）。座標は`collision.png`へ実プレイヤー体格で検証済み。
- 未実装: 道具屋、船での移動、BGM。

## 4.18 No.14 ポサロ城（2026-09-27）

- ユーザー提供の外観`ポサロじょう_イメージ.png`（1448×1086）を、世界地図から入るときだけ5秒表示する入場演出として無加工コピーした。
- ユーザー提供の見下ろしボス間`ポサロじょうボス.png`（1448×1086）を無加工でBACKGROUND正本にし、`assets/maps/posaro_castle/`（`map_posaro_castle`、`PosaroCastleScene`）で共通画像マップRuntimeを使う。
- **導線**: 世界地図の`destination_posaro_castle`（`planned`→`implemented`、`unlockFlag: null`）→ 南の大階段（`fromWorldMap`、上向き）。南口Event（`event_posaro_castle_south_exit`）→ 世界地図（`from_posaro_castle`）。到着spawnは出口ゾーン外に置くため、到着直後の自動退出は発生しない。
- Collisionは`tools/build_posaro_castle_collision.py`で手測定する。南の入口階段・中央ホール・玉座への階段・上段を連結させ、溶岩・壁・柱・像・脇部屋は通行不可にする。
- 未実装（TBD）: バクラー戦、ゆうしゃのけんの入手演出・条件・`item.hero_sword_obtained`、NPC（目安4人）、会話、BGM、No.15への本編導線。今回の出入りでフラグ・所持品は変更しない。

## 4.19 No.15 ふっかつのほこら（2026-09-26）
- ユーザー提供の2枚（`assets/maps/reference/reference/新しいフォルダー/`）は、他マップと名前の付け方が逆になっている。**見下ろしのドット絵は`ふっかつのほこら_イメージ.png`**、絵画調の外観は`ふっかつのほこら.png`。中身どおりに、前者を歩行背景（`assets/maps/revival_shrine/background.png`、1672×941）、後者を入場演出（`entry_splash.png`）へ無加工でコピーした。
- `map_revival_shrine`、`RevivalShrineScene`（共通の`RainlandImageMapScene`、`worldScale: 1.5`）。
- **導線**: 世界地図の`destination_revival_shrine`（`planned`→`implemented`、`unlockFlag: null`、位置は従来の(875,58)のまま）→ 南の入口の石段（`fromWorldMap`、上向き）。南口Event(`event_revival_shrine_south_exit`) → 世界地図(`from_revival_shrine`)。南の石段が唯一の出入口。世界地図から入るときだけ絵画調の外観を5秒の入場演出として挟む。
- Collisionは`tools/build_revival_shrine_collision.py`が手で測った矩形から生成する（苔の石畳は色判定が途切れるため）。入口の石段 → 門の通路 → 下の広場 → 石段 → 八角形の中央広場（西の石橋 → 光る紋の島）→ 石段 → 上の段 → 北の光る台座。水・石柱・遺跡の壁・崖・滝は通れない。上の段の石柱の外側（左右の翼）は石柱に塞がれて入れない。
- 北の光る台座は**ゆうしゃのかんむり**の場所（STORY_FLOW.md）だが、入手演出・条件・反射の薄いヒント（ミラーを直言しない）はTBDのため、台座に乗るとDEVメッセージだけを出す。アイテムもフラグも与えない。
- 未実装: かんむりの入手、反射の薄いヒント、NPC（目安2人）、BGM。

## 4.20 No.18 いしのまち（2026-09-27）

ユーザー指示: 町全体が不思議な力で石化した、分かりやすいイベント町。入った瞬間に「町の人も動物も生活の途中で石になっている」と分かることを最優先とし、難解なメタ演出より「石化した町を少しずつ調べて進める」分かりやすさを重視する。3D・エフェクト・AI的要素は補助演出（中央の巨大石像のカメラ演出、石粉・光・ひび、石像に残った記憶の残響としての短い台詞）に留める。

- **素材**: 提供画像は絵画調の`いしのまち_イメージ.png`（1448×1086）のみ。入場演出（世界地図から入るときだけ5秒）に無加工コピー（`assets/maps/stone_town/entry_splash.png`）で使い、歩行背景は**DEV_PLACEHOLDER**（`tools/build_stone_town_assets.py`が背景と`collision.png`を同じレイアウトから生成）。正式な見下ろし背景が届いたら差し替える（手順: `PROJECT_STATUS.md`）。
- **MapId / Scene**: `map_stone_town` / `StoneTownScene`（共通`RainlandImageMapScene`）。`worldScale 1.5`。戦闘・店・歩行NPCなし。
- **導線（南から北への一本の軸）**: 南門（`fromWorldMap`到着）→ 入口の石像（門番・旅人と犬）→ 広場 →（西）パンやの露店 ・（東南）井戸 ・（東）水路の石橋と対岸の露店 → 広場中央の噴水と星を掲げる巨大石像 → 北の大階段（**石の壁がふさぐ**）→ 上段の広場（老人の石像）→ 北門（奥の出口）。南門・北門はどちらも世界地図へ出る（`from_stone_town`）。次の目的地の選択は世界地図が担う。
- **進行**: 入口の門番（町の第一印象）→ パンや／井戸の女／橋の旅人の3つの「のこった声」（`event.stone_town_echo_baker/well/bridge`、順不同）→ 広場の巨大石像を調べると目覚める（3つ未収集の間は促す文だけ）→ 星が光りひびが走り、北の石の壁が崩れる（`event.stone_town_plaza_awakened`と`event.stone_town_path_opened`）→ 上段の老人の石像で手がかりを聞く（`event.stone_town_elder_heard`）→ 北門から出る。一度目覚めた後の再訪では、ひび・星の光・光の粒が残り、石の壁は無い。
- **石像の配置（18体）**: 門道＝門番／旅人と犬、門の内側の小広場＝猫・鳩・手をつなぐ親子、広場＝向き合う二人・祈る娘・本を読む学者、井戸＝水を汲もうとする女、パンや通り＝パンを差し出す店主・走る子ども・犬・かごの女・樽の鳩、水路＝橋の旅人、対岸＝露店の商人・荷を運ぶ人、上段＝老人。台詞は`assets/maps/stone_town/objects.json`（`statue`型、`DIALOGUE_DRAFT`）。
- **Collision**: 石像の足元（`statue`の矩形）・噴水・井戸・露店・街灯・植え込みは通行不可。歩行領域は南の門道 → 首の広場 → 広場 → 西のパンや通り／東の水路端 → 橋 → 対岸、北の階段 → 上段 → 北門。石の壁は`barrier`型のランタイムBodyで、Collisionマスクは階段を通行可にしたまま開けておく（崩落後に通れる）。
- **未実装（TBD）**: 三人自身の異常に触れる会話（ミレイの未来記憶の断片・主人公のまとまった台詞。`STORY_FLOW.md` No.18／`TBD_REGISTRY.md`）、石化の正式な原因・正体、石化解除の完了、BGM・SE、正式な見下ろし背景。**NPCが「ジャンカードの秘密・頭文字・たびのあいことば」を示唆する文は置かない**（`tests/stoneTown.test.mjs`が禁止語を検査）。

## 4.21 No.21 不思議な塔（2026-09-25）
- 正式No.21として追加する特殊拠点。塔だが、機能上は人が集まる「街」に近い体験を持たせる。
- AIをゲーム体験へ組み込む地域とする。AIの具体的なモデル、ローカル／クラウド構成、会話生成範囲、保存方法はTBDであり、実装方式をこの文書だけで固定しない。
- 各町・村に「不思議な塔へ来るキャラクター」を配置し、世界各地の人物が塔へ集まる構造を採用する。対象NPC、移住条件、塔内での役割はTBD。
- No.21という管理番号は確定するが、No.20後の単純なポストゲーム固定にはしない。物語上の初回訪問タイミング、本編必須か寄り道か、塔の成長・変化の条件はTBD。
- 既存No.01〜No.20の番号は振り直さない。

## 5. 基本進行の大枠
No.01 はじまりのばしょ
→ No.02 はじまりのまち
→ No.03 ビーエのもり
→ No.04 ビーエのむら
→ No.05 レインランドのもり
→ No.06 レインランドじょうかまち／レインランドじょう
→ No.07 まじんのどうくつ
→ レインランドじょうへ再報告
→ No.08 ザボンのむら
→ No.09 いわやまのどうくつ
→ No.10 かくれざと
→ No.11 みずうみの古城
→ No.12 港町ダコハ
→ No.13 コタンカイムの洞窟
→ No.14 ポサロ城
→ No.15 ふっかつのほこら
→ No.16 デーマスのとう
→ No.17 ぬまちのどうくつ
→ No.18 いしのまち
→ No.19 バトラスのとりで
→ No.20 オロチへの道／オロチのしろ／最終地点
→ オロチゾンビ1回目
→ 「もういちど」
→ **No.01 はじまりのばしょ再訪**
→ わたべ加入／特殊参加
→ No.20 オロチゾンビ再戦
→ 真の最終解決

番号順を制作・データ管理上の標準順とする。ただし中盤の寄り道・再訪・分岐は別途設計できる。

## 6. マップごとに実装時に持たせる情報
- `mapId`
- 表示名 / 内部名
- map type
- 推奨レベル帯
- 接続先
- 出入口
- BGM
- encounter table
- NPC / 宝箱 / イベント
- 必要フラグ
- 必要アイテム / 装備
- ボス
- 初回クリア後の変化
- 再訪価値
- 想定初回滞在時間
- 想定寄り道時間
- 背景画像パス / 背景画像のピクセル寸法
- Collision Mask / 派生Collisionデータ
- Eventデータ / Objectデータ

未確定値は `null` / `TBD` とする。

## 7. ダンジョン設計
- 旧案よりコンパクトにする。
- 一本道だけにはしないが、長い迷路や意味の薄い往復は減らす。
- 小さな分岐、宝箱、近道、イベント、敵配置で密度を出す。
- その土地に存在する理由・歴史・生態を会話や景観へ反映する。
- ボス攻略のヒントは町・村・ダンジョン内に分散する。
- デーマスの塔や終盤拠点は、縮小しつつ重要演出・攻略要素を維持する。

## 8. 町・村・城設計
- 内部マップは旧案よりコンパクトにする。
- 全体マップ上の位置・地域構成は変更しない。
- 建物数、内部移動距離、意味の薄い空きスペースを減らす。
- 小さくても地域の個性・生活・進行上の役割が分かる構成を優先する。
- NPC人数は地域ごとに必要性から決める。

## 9. プレイ時間基準
- 初見クリア: **約4時間30分**
- 寄り道込み: **約5時間30分**

時間短縮は地域数を削るのではなく、町内部移動・ダンジョン探索・意味の薄い往復を圧縮して行う。

## 10. 実装禁止
- 旧マップ番号を現行番号として再使用する。
- No.01「はじまりのばしょ」とNo.02「はじまりのまち」を同一マップ扱いする。
- 「もういちど」後に旧No.18等へ遷移する。
- 「もういちど」を新規ゲーム用の別マップで代替する。
- 全体ワールドマップや主要地域配置を番号変更を理由に勝手に変更する。
- 船や飛行を勝手に追加する。
- 巨大マップ化してプレイ時間を水増しする。
- ワールドマップを全面徒歩用フィールドとして新規制作する。
- ネタバレ内部名を公開画面へそのまま出す。


## Phase 8.6 開発用世界座標（legacy prototype、2026-09-13）
Phase 8.6では既存世界地図REFERENCEを背景にしたROUGH_FIELDを追加し、徒歩往復を確認した。これは既存コードの検証記録であり、2026-09-18以降の新規ワールドマップ方針ではない。実装は保持し、ポイント選択式ワールドマップの通常導線は別途 `WorldMapScene` として統合済みである。詳細: `PHASE8_6_ROUGH_FIELD.md` / `PHASE_WORLD_MAP_POINT_SELECTION.md`。

REFERENCE画素座標でNo.01は(835,630)、No.02は(240,780)へ仮対応させる。前者は中央東寄りの森付近、後者は南西の町の絵を目印にした開発座標であり、正式な地域配置の確定・変更ではない。Field復帰地点はそれぞれ(780,630)、(295,780)。従来のField西端／東端出口は今回のランドマーク入口へ置換した。ローカルマップ側のfromFieldは別座標で維持。画像内の他の城・洞窟・町に正式名称や接続を割り当てない。
