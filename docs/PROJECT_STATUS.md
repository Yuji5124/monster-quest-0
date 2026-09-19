# Monster Quest 0 Project Status

最終更新: 2026-09-20 JST

## No.05 レインランドじょう（通常RPG方式の城内）= PARTIAL（2026-09-19着手・2026-09-20導線確定・正式背景差し替え）

レインランドじょうかまちの**北の城門**（石段の上の木の扉、`event_rainland_castle_town_castle_gate`）から入り、城内を通常の2D RPG方式で歩ける`map_05_rainland_castle`／`RainlandCastleScene`を追加した（`assets/maps/rainland_castle/`）。`MAP_FLOW_SPEC.md`・町の名称・PROJECT_STATUSの既存記述が「城下町→北の城門→No.05」の世界構造を示しているため、**世界地図には城を直接載せていない**（着手時に一度追加した直通地点は取り下げ済み。世界地図は従来どおり7地点）。城から出ると、町の北の城門前（`fromCastle`、下向き）へ戻る。既存の画像マップ共通Scene（`RainlandImageMapScene`）へ城のパッケージを渡す薄いSceneで、独自のシステムは増やしていない。

城内はコンパクトな1フロア：城門→入口ホール→中央ホール（赤い絨毯、柱、長机）→王の間の扉（未実装のため入れない）、西翼（廊下＋上階への階段の位置）、東翼（廊下＋小部屋）。仮NPC5人（門の兵士・城内の兵士・王の間前の兵士・使用人・城の住人）が既存の会話システムで話せる。イベント点は入口／王の間の入口／階段（「現在は進めない」のDEVログのみ）／東の小部屋（将来のイベント用の予約地点。ストーリー内容を含まない汎用ID`event_rainland_castle_east_room`、内容は未実装）／出口の5つ（`events.json`）。

**背景は正式（2026-09-20差し替え）**: ユーザー提供の城内背景（1448×1086、`assets/maps/reference/reference/レインランドじょう_城内.png`）を無加工で`assets/maps/rainland_castle/background.png`へ置き、`map.json`を`assetStatus: "CURRENT"`にした（当初のDEV_PLACEHOLDER単色レイアウトはgit履歴に残る）。`collision.png`は背景から測った歩行領域・障害物の矩形を`tools/build_rainland_castle_collision.py`（`--preview`で歩行不可を赤く重ねた確認画像も出せる）が生成する（8pxセル格子に揃え、壁より少し内側）。歩行可能: 城門の通路・入口ホール・中央ホール・王の間の扉まで続く絨毯と両脇の床・西翼と階段・東翼と小部屋。歩行不可: 壁・柱・台座・鉢植え・絵と長椅子・ランプ台・燭台の土台・机の裏の細い床（足元判定が入れない細さ）。spawn（入口の絨毯）・NPC5人・イベント点5つを新しい絵の上へ置き直した（ID・コマンド・城内の導線は変更なし）。**Sceneのコードは変更していない**（コメントのみ）。`レインランドじょう_イメージ.png`（外観）と`レインランドじょう_マイクラ風.png`（一人称のブロック城）は2D歩行背景に使っていない。

**共通Sceneの拡張**（他マップの挙動は変えない）: `RainlandImageMapScene`が、`MAPS[mapId].npcs`が空でないマップだけNPCと会話（DialogueBox）を有効にする。DEV_PLACEHOLDER専用の分岐は持たず、`map.json`の`assetStatus`をそのまま受け入れ、DEV表示に`[DEV_PLACEHOLDER]`を足し、`message`イベントをDEV時に`[IMAGE_MAP] <mapId> entered <eventId>`でログするだけ。

**台詞**: DEV_PLACEHOLDER_DIALOGUEのみ。`docs/NPC/04_rainland_castle.md` §4・§6（正体判明前に城NPCが答えを言わない）に従い、ミレイ・姫・王家の事情に触れない一般的な内容にした（テストで固定）。正式な人数・役割・台詞はNPC原案の確定待ち。

**将来のブロック城化**: 入口の約束は「町の北の城門Event → MapId＋`fromCastleTown`spawn」と「出口Eventで町の城門前へ」だけで、町は`MAPS[..].sceneKey`経由で遷移する。差し替えは、新Sceneを作ってmain.tsへ登録し、`maps.ts`の`sceneKey`を切り替えるだけ。今回はVoxel Sceneも空Sceneも作っていない。

検証(正式背景への差し替え後、チェックポイントコミット`7205e1f`＋この変更だけの隔離環境): `npm run typecheck` PASS・`npm test` 263/263・`npm run build` 成功・ブラウザ実機で 町の北の城門→城→壁（ランプ台）で停止→NPC5人と会話→入口/王の間/階段/東の小部屋のイベント発火→出口→町の城門前→再入場、console error 0件（着手前のベースラインは246）。以前の検証: `npm run typecheck` PASS・`npm test` 263/263（新規`rainlandCastle.test.mjs`等を追加。実際の24×24判定でNPC本体を通行不可にしても、spawnから全イベント・全NPCの隣・階段・東翼の小部屋へ余裕6pxで到達できることを確認）・本番ビルド成功・ブラウザ実機（`game.step()`手動進行）で 町の北の城門→城→壁で停止→NPC5人と会話（会話中は移動ロック）→入口/王の間/階段/東の小部屋のイベント発火→出口→町の城門前（下向き、再トリガーなし）→再入場、タロサ・ミレイの追従、通常起動のタイトル、**既存の共通Scene利用マップの回帰**（レインランドのもり その1・その2・洞窟・城下町：Collision矩形数が基準と一致=310/315/291/350、DialogueBoxが作られない、決定入力を消費しない、メニュー・歩行・既存イベント・世界地図往復が従来どおり）、コンソールエラー0件。未実装／未確認: 正式な城内背景・Collision、正式NPC・台詞、王の間の中・上階、各イベント本編、BGM、iPhone Safari実機、ブロック城化。

## ジャンカードガチャのジャンコイン化・排出演出 = PARTIAL（2026-09-19）

ユーザー指定の`assets/title/reference/I.png`（「ジャンコインでガチャを回そう!」）と`H.png`（コイン投入）を、ジャンカードが出現する**前**の専用演出へ組み込んだ。ガチャ実行後はI→H→発光の順に約**5秒**再生し、最後のフラッシュのあとで初めてカードを表示する。演出中はキーボード・タッチの決定／キャンセルをロックし、二重排出しない。

料金は旧「1回20円」から、提供画像に合わせて**1回ジャンコイン1枚**へ変更した。ジャンコインは`cards.jumpCoinCount`へ保存し、戦闘勝利で得るG（`player.money`）とは完全に分離する。旧セーブでジャンコイン項目がまだ無い場合のみ、当時ガチャに使われていた所持金残高をジャンコイン初期値として安全に移行し、Gとカード取得状態も保持する。開発環境では45枚分を確認用に与える`TEMP_DEV_JUMP_COINS`を用意した。`npm test`246件、typecheck、build、ブラウザでI→H→カードの順の表示および待機画面から旧「20円」印字が見えないことを確認済み。**本番のジャンコイン入手導線だけは未指定／未実装**のためPARTIAL。

## 起動オープニング（ARROWAREクレジット＋思い出の回想）= PARTIAL（2026-09-19）

ユーザー指示により、起動直後の導入を追加した。黒画面中央に「Produced by ARROWARE」を**約3秒**（フェードイン0.7秒→保持1.6秒→フェードアウト0.7秒）表示し、その後**約10秒**（6枚×1.65秒）で、ユーザー提供の回想画像6枚（`assets/title/reference/`のA・B・D・E・F・G、C.pngは存在しないため指定どおりこの6枚）を、黒からのフェードイン→保持→黒へのフェードアウトで順に見せてからタイトル画面へ入る。`BootScene`→`OpeningIntroScene`→`TitleScene`の順。画像は`assets/title/opening_memories/memory_01〜06.png`へ無加工のバイト一致コピーとして`CURRENT`登録した（元画像は保持、`asset_catalog.json`/`ASSET_INDEX.md`更新済み）。

**「丁寧に見せる」ための設計**: 4:3画面（960×720）へ16:9の画像を**切り取らず全体表示**し（人物の顔が欠けない）、上下は黒帯にして映画の回想のように見せる。画像の四辺は黒へ溶かすフェザーを重ね、四角い写真が黒画面から浮かないようにした。1枚ごとに1.0→1.05倍のごく緩やかな寄りだけを付け、他の動きは加えない。縮小表示のためLINEAR補間（pixelArtの既定NEARESTのギザギザを避ける）。画像は「Produced by ARROWARE」表示中に裏で読み込み、遅ければ黒のまま待つ。読み込み失敗は該当の1枚を飛ばすだけ。終了時にテクスチャを解放する。

**スキップ**: 演出中（クレジット中も含む）に**何かボタン（決定/キャンセル/方向/メニュー、およびタップ）を押すと、「なにか ボタンを おしてください」を飛ばして「はじめから／つづきから」のメニューへ直行**する（ロゴは即表示、明転0.25秒）。押さずに最後まで見た場合は、これまでどおりのタイトル（プッシュエニーボタン）へ0.8秒で明転して入る。演出の秒数・並び・字間などは`src/config/openingIntro.ts`に集約。ジャンカード画面などからタイトルへ戻るときは演出を再生しない。実セーブ・フラグ・「はじめから」以降の流れには一切触れない。音は未実装（`audio.noAudio`のまま）。

検証: `npm test`245/245（新規`openingIntro.test.mjs`）・typecheck PASS。ブラウザ実機（`game.step()`手動進行）で、クレジット表示・回想6枚の順序と開始時刻（0.0→3.47→5.15→6.83→8.52→10.20→11.88秒、タイトルへは約14.1秒）・自然終了でタイトル（splash）・クレジット中／回想中のキー入力およびマウスクリックでメニュー直行・スキップ後のメニュー操作が正常・回想テクスチャの解放・コンソールエラー0件を確認した。`tests/browser/`の2つの統合ハーネスも新しい起動フローへ追従済み。未確認: iPhone Safari実機（タップは他Sceneと同じpointerdown→confirmの経路）、BGM/SE（未実装）、正式な秒数・字間・ロゴ書体は人間の視覚・テンポ調整待ちのためPARTIAL。

## レインランドじょうかまち追加・入場演出 = PARTIAL（2026-09-19）

ユーザー提供の俯瞰マップ`レインランドじょうかまち.png`(1447×1087)を、世界地図(`destination_rainland_castle_town`、`unlockFlag: null`、座標は`DEV_PLACEHOLDER_POSITION`)から入れる画像マップとして追加した(`assets/maps/rainland_castle_town/`、`map_rainland_castle_town`、`RainlandCastleTownScene`、`worldScale: 1.5`)。背景は参照原画のバイト一致コピー。歩けるのは南門の道・噴水の広場・放射状の道・北の城門へ続く石段・西と東の堀の橋(先は行き止まり)で、家・噴水・露店・堀・城壁・桟橋は歩行不可。出入口は南門1か所(世界地図へ戻る)のみで、実際の24×24判定で全ての道・橋・石段へ歩いて到達できることをテストとブラウザ実機で確認した。

**入場演出**: 世界地図からこの町へ入るときだけ、ユーザー提供の絶景`レインランドじょう_イメージ.png`(1448×1086、無加工コピーを`entry_splash.png`として同パッケージに保持)を**5秒**(フェードイン1秒→保持3秒→フェードアウト1秒)で投影し、そのあと町へ入る。画像は非常にゆっくり寄る(5秒で4.5%)投影感を付け、下部に地名「レインランドじょうかまち」を表示する。暗転→画像→暗転→町の通常フェードインとつながり、演出中は入力を受け付けない。実装は汎用の`MapSplashScene`と`src/config/mapSplash.ts`(マップごとの画像・秒数・対象spawnId・地名)に切り出し、`MapTransition`の`beginMapTransition`が「遷移先がその演出を持ち、spawnIdが対象(`fromWorldMap`)のとき」だけ挟む。建物内部からの戻り等、対象外のspawnでは再生しない。**出る(南門→世界地図)ときは演出なし**(必要なら同じ仕組みで追加できる)。実機の計測で、入場時に演出が挟まり総尺約5秒(5.15秒、計測刻み込み)、退場時は演出なし、再入場で再び演出、町のspawnは南門の道の内側・上向き、仲間(タロサ・ミレイ)も付いてくることを確認、コンソールエラーの増加なし。共通のレインランド画像マップSceneは`RainlandImageMapScene`へ改名して`RainlandForestScene.ts`から公開し、もり その1・その2と本町が共有する。No.04「レインランドのまち」(`MAP_FLOW_SPEC.md`§2、水と商業の城下町)に相当する可能性が高いが、番号の対応・正式名称はユーザー確認待ちのため、はじまりのもりと同じ**番号なしの追加フィールド**として扱う(`MAP_FLOW_SPEC.md`§4.12)。NPC・店・建物内部・BGMは未実装／TBD。北の城門の先はNo.05レインランドじょうへ接続済み（2026-09-20、上記）。Collisionは自動生成+目視修正の初版で人間による微調整は未実施のためPARTIAL。

## No.08 まじんのどうくつ・入場演出 = PARTIAL（2026-09-19）

ユーザー提供のキービジュアル`まじんのどうくつ.png`を、世界地図からNo.08へ入るときだけ**3.5秒**でフェードイン→表示→フェードアウトする入場演出として追加した。表示名「まじんのどうくつ」は指定どおり右下に表示する。洞窟内部は別途提供されていた`まじんのどうくつ_その１.png`〜`その3.png`を無加工で3つのCURRENT背景へコピーし、`その1 → その2 → その3`を往復できる画像マップとして実装した。背景・Collision・Event・Objectを4レイヤーで管理し、全spawn・出入口へ実際の24×24の足元判定で到達できることを自動テストで確認した。世界地図上の地点は暫定位置／常時選択可。正式な解放条件、まじん戦、敵出現、宝箱、NPC、BGM、Collisionの人間による最終視覚調整は未実装またはTBDのためPARTIAL。

## 戦闘開始プリズム演出 = DONE（2026-09-19）

ユーザー指示により、通常のフィールド戦闘の直前へ**4秒**の共通開始演出を追加した。暗転や渦巻きではなく、現在のフィールドを残した深い藍色のベールに、青・金・紫の光片が中央へ走り、二重の菱形ゲートと最後の白青フラッシュで戦闘画面へ移る「プリズム・ブリーチ」としている。会話から始まるイベント戦と、はじまりのもりのランダムエンカウントの両方が同一の開始処理を通るため、開始元により演出がずれない。演出中は入力をロックする。一方、`?battleTest=`は戦闘画面のみを素早く検証するDEV導線として、開始演出を意図的に省略する。`battleEntrance`の時間・接続回帰テスト、typecheck、buildで検証済み。

## No.01「はじまりのばしょ」のみ100%表示へ戻す = DONE（2026-09-19）

ユーザー指示により、No.01「はじまりのばしょ」の`worldScale`だけを`1.5`から**`1`（100%）**へ戻した。背景画像・Collision Mask・Event・Object・spawnの正本座標は変更せず、`StartingPlaceScene`が既存どおりmap manifestの倍率を読むため、表示・物理境界・Collision・Camera・Eventのすべてが100%のネイティブ座標へ揃う。これは他マップへ展開しない明示的な例外であり、はじまりのまち／はじまりのもり／ビーエのむら／レインランドのもり（その1・その2）は`worldScale: 1.5`のまま維持する。回帰テストでNo.01のみ100%、他5マップが150%であることを固定した。

## 経験値・勝利報酬・キャラクター接地影 = PARTIAL（2026-09-19）

ユーザー指示により、主人公・タロサ・ミレイを加入時を含め全員Lv1／EXP0開始へ統一した。通常のイベント戦に勝利すると、加入中の全員へ同量のEXP、所持金、敵定義に設定された低確率の道具ドロップを**一度だけ**反映する。現在は`たまゴースト`（EXP3／2G／かいふくやく15%）・`プリン`（EXP4／3G／どくけし10%）等の`TEMP_TEST_VALUE`を使い、`GameStateRepository`の単一セーブキーへキャラクター進捗・所持品を既存のカード／加入情報を保持したまま保存する。旧セーブは安全にLv1・EXP0・空の所持品へ補完する。フィールドメニューのステータスへEXP進捗を表示し、どうぐ画面へ戦利品が反映される。単体の`?battleTest=`確認はローカルセーブを変更しない。

また、主人公・追従するタロサ／ミレイに共通の小さな楕円影を足元へ表示し、地面への接地感を加えた。影は物理Bodyの足元または追従隊列の足元へ追従し、キャラクターより常に背面に描画する。最終成長曲線、敵別EXP/G、ドロップ内容・確率、HP上昇・戦闘ステータスとの完全接続、通常戦闘以外の報酬とレベルアップ演出は未確定または未実装のためPARTIAL。

## 当たり判定が厳しく通れない問題の修正（全マップ共通） = DONE（2026-09-19）

ユーザーから「判定がシビアすぎて通れない。マップは150%になっているか。全マップ共通の問題」と報告があった。**マップ拡大率は全6マップ(はじまりのばしょ/まち/もり、ビーエのむら、レインランドのもり×2)で`worldScale: 1.5`が有効**で、Collision矩形も同倍率でスケールされている。原因は拡大率ではなく、(1) プレイヤーの当たり判定が30×42(ワールドpx)とスプライト高70の6割もあり足元判定になっていない、(2) Collision格子が24px(16px×1.5)と粗く、斜めの道が階段状に削れて角1点だけで接する箇所ができる、(3) レインランドのもりの歩行範囲を道の色(土)だけで作ったため道幅が40〜60pxしかない、の3つの重なりだった。実際のボディサイズで通れる範囲を計算したところ、レインランドのもりは歩行可能マスの**約93〜95%に立てず、通行領域が30以上に分断**され、ビーエのむらも25%、はじまりのばしょも7.5%に立てないマスがあった。従来のテストは「マス同士が繋がるか(4近傍)」しか見ておらず、体の大きさを考慮していなかったため見逃していた。

**修正**: (a) `PLAYER`の当たり判定を30×42→**24×24**(足元だけ。頭・髪は木や建物に重なってよい)。足元ベースライン・水平中央への揃えは既存の`bodyOffset`が自動計算。仲間の隊列間隔(`PARTY_FOLLOW_DISTANCE`)は`PLAYER.height`依存だったため、従来の42へ固定して切り離した。(b) 全6マップの`collisionCellSize`を**16→8**(ワールドで12px)へ細分化し、斜めの道の階段状の削れと角1点接触を解消（静的Bodyは約2倍、レインランドで153→310個）。(c) レインランドのもり2マップの歩行範囲を、道の縁の草地まで**広げ**(水・滝・灰色の石には広げない)、幅の狭かった橋(木板が約29px)と木陰の橋渡し区間を拡幅、道端の丸太・道標は歩行不可のまま。(d) 判定を細かくした結果、はじまりのまちのぶきや前spawn(1025,445)が壁に1〜2px足りず体が入らないと判明したため(1015,455)へ移動。(e) 各マスクの、spawn・出入口を含まない孤立セルを塗りつぶし。

**測定結果**（判定24×24・8pxセルでの全spawn・出入口が繋がったまま残せる余裕幅、ワールドpx）: はじまりのばしょ24 / はじまりのもり24 / ビーエのむら34 / レインランドその1=10・その2=14。旧設定(30×42・16px)ではレインランドその1が1、はじまりのまちが-1(通れない)だった。**再発防止**: `tests/helpers/bodyReachability.mjs`(実際の判定サイズでの通行探索)と`tests/bodyPassability.test.mjs`を追加し、全6マップで「既定spawnから全spawn・全出入口へ、各辺6pxの余裕を持って歩いて到達できる」こと、およびレインランドの遺跡・橋・階段・道の端まで到達できることを保証する。旧版の狭い判定ではレインランドその1でテストが失敗することも確認済み。実際のゲーム物理でも、レインランドその1(7か所)・その2(10か所)の遺跡・橋・階段・道の端に、ゲームが使う壁と24×24判定で経路探索→キー入力による自動歩行で到達できることを確認した。主人公の当たり判定寸法は引き続きTBD(TEMP_TEST_VALUE、`TBD_REGISTRY.md`)。

## レインランドのもり追加／仲間の追従をビーエのむら・はじまりのもりへ拡張 = PARTIAL（2026-09-19）

**レインランドのもり**: ユーザー提供の背景画像2枚（`レインランドのもり　その１.png`／`その2.png`、1448×1086）を、同一エリアの連続する2画面として追加した。`assets/maps/rainland_forest_1/`・`rainland_forest_2/`（背景は参照原画のバイト一致コピー、`worldScale: 1.5`）を、共通の`RainlandForestScene`（`RainlandForest1Scene`/`RainlandForest2Scene`）が読み込む。正式No.01〜No.20の番号を持たない追加フィールドで、`WorldMapScene`に`destination_rainland_forest`（`unlockFlag: null`、座標は`DEV_PLACEHOLDER_POSITION`）として登録した。導線は 世界地図 → その1（南の石門の内側）／その1の南口 → 世界地図／その1の北の木の階段 ⇄ その2の南の木の階段。Collisionは道（土・木橋・木の階段）の色抽出に、遺跡の祭壇と石段、アーチの通路、木陰で途切れた道の橋渡しを手で加え、実行時の16pxセル格子で全歩行可能セルが到達可能であることをテストで保証した。背景に描かれたその2の北・西・東の道などは接続先未定の行き止まりとして残した。ランダムエンカウントは出現モンスターが未確定のため持たない。

**仲間の追従**: 加入済みの仲間（タロサ・ミレイ）が、これまでNo.01/No.02/建物内部でしか付いてこなかったが、**ビーエのむら**・**はじまりのもり**でも主人公の軌跡を辿って付いてくるようにした（`PartyFollowers`の組み込みと、両Sceneでの仲間スプライト読み込み）。はじまりのもりでは、ランダムエンカウントの戦闘から戻った直後も、戦闘直前の位置・向きに主人公が復帰し仲間が整列することを確認した。新設のレインランドのもりにも最初から組み込み済み。

実機で 世界地図→ビーエのむら／はじまりのもり（戦闘往復含む）／レインランドのもり その1⇄その2／その1南口→世界地図→再入場 を確認、`npm test`200件・typecheck・buildすべてPASS、コンソールエラーなし。Collisionは自動生成+目視修正の初版で人間による微調整は未実施のためPARTIAL。正式名称・解放条件・地図上の位置・出現モンスター・NPC・BGM・レインランド方面との接続はTBD（`TBD_REGISTRY.md`）。詳細は`MAP_FLOW_SPEC.md` §4.10。

## ビーエのむらの世界地図からの出入り = PARTIAL（2026-09-19）

ユーザー指示により、世界地図(`WorldMapScene`)からビーエのむら(No.03)へ入り、北門から世界地図へ戻れるようにした。マップ本体(`assets/maps/bie_village/`・`BieVillageScene`・`destination_bie_village`・`from_bie_village`)は2026-09-18に作成済みだったが、本番`WorldMapScene.readUnlockedFlags()`が常に空集合だったため、地点が`？？？`のままロックされ選択できなかった。`unlockFlag: "story.bie_village_unlocked"`という`MAP_FLOW_SPEC.md`§4.5のフラグ設計はそのまま維持し、`DATA_CONTRACTS.md`§8.1が許す「初期DEVでは`map.json`の`developmentUnlockedFlags`を保存済みフラグの代替に使ってよい」に従い、本番も同じ暫定の解放状態を使うようにした(`WorldMapData.ts`の`readInterimUnlockedFlags()`に集約、`WorldMapTestScene`も共用)。SaveSystemの`flags`が実装されたら、この関数だけを差し替えて`developmentUnlockedFlags`を進行状態として扱うのをやめる。`story.bie_village_unlocked`が本編のどこで立つかは引き続きTBD(`TBD_REGISTRY.md`)で、再びロックしたい場合は`world_map/map.json`の`developmentUnlockedFlags`からこのフラグを外せばよい。実機で 通常起動→No.01→北の小道→世界地図(ビーエのむらが選択可能)→ビーエのむら(北門内側に出現、歩行・衝突)→北門→世界地図(現在地: ビーエのむら) を確認、2回目の入退場とはじまりのもりへの移動も問題なし。地点座標は引き続き`DEV_PLACEHOLDER_POSITION`、村内のNPC・会話・木こり救出イベントは未実装のためPARTIAL。

## No.01「はじまりのばしょ」背景の夜版差し替え = PARTIAL（2026-09-19）

ユーザー指示により、No.01の背景を旧1536×1024の昼景（北の城門・東の木橋・テント）から、ユーザー提供の夜版 `assets/maps/reference/reference/はじまりのばしょ_夜.png`（1448×1086、焚き火の広場・北へ抜ける石段の小道・左に滝・右に崖）へ差し替えた。`background.png` は参照原画の無加工コピー（バイト一致）で、旧画像はgit履歴(e26d6bf)に残る。同名の昼版 `はじまりのばしょ.png` は夜版と画素単位で同一構図であることを確認済みで、REFERENCEとして保持し、昼版への切替は未実装(TBD)。地形・構図が別物のため、背景だけでなくパッケージ一式を作り直した: (1) `collision.png` — 昼版の草・土の色で候補を抽出し、北の小道と石段を追加、焚き火の輪・丸太・切り株・崖縁の柵を除外、8pxの安全マージンを付け、実行時の16pxセル格子でspawnから4方向に繋がらない飛び地を除去（手順は`ASSET_INDEX.md`/`asset_catalog.json`）。(2) `events.json` — 北出口を城門から北の小道の先(x650〜745, y0〜55)へ移設（Event IDは`event_no01_north_gate`のまま維持）。(3) `maps.ts` の spawn — オープニング開始位置を焚き火の南側(725,620、焚き火を向いて目覚める)、世界地図・legacy Fieldからの復帰位置を北の石段の上端(700,92、下向き)へ変更。(4) `map.json` の寸法を1448×1086へ。`worldScale: 1.5`（4マップ1.5倍化）はそのまま適用され、実プレイでは2172×1629となる。新規テスト `tests/startingPlace.test.mjs` でバイト一致・寸法一致・spawnと出口の歩行可否・焚き火/水/森/崖の遮蔽・外周に歩行可能な枠が無いこと・孤立領域が無いこと(到達性)を検証する。実機でタイトル→はじめから→冒頭演出→No.01夜(焚き火の前で目覚める)→北の小道→世界地図→No.01復帰の往復を確認済み。Collisionは自動生成+目視修正の初版で、人間による確認・微調整は未実施のためPARTIAL。正式Object(焚き火の演出・環境音等)・夜→昼切替・iPhone Safari実機確認は引き続き未完了。

## はじまりのもり 戦闘背景・敵表示サイズ調整 = DONE（2026-09-19）

ユーザー指示により、はじまりのもりのランダムエンカウント（`DEV_BATTLE_MONSTERS["001"]`＝たまゴースト・`["003"]`＝プリン）の戦闘背景を、それまでの無地DEV_PLACEHOLDER背景(`BattleScene.createBackground`のフォールバック矩形)から、ユーザー提供の参照画像`assets/battle/backgrounds/reference/mq0_battle_bg_013_5ecb71635c.png`(`battle.bg.starting_forest`として`asset_catalog.json`へ登録)へ差し替えた。既存の`background`フィールド(demas戦で先例あり)をそのまま再利用しており`BattleScene`側の変更は無い。あわせて両敵とも`display: { scale: 0.7, offsetY: 0 }`を追加し、デフォルトの枠いっぱい表示より小さく表示されるようにした。`?battleTest=001`/`?battleTest=003`のDEVブラウザ確認、`npm test`174/174・typecheck全てPASS。正式モンスター名称・正式ステータス・正式背景はMONSTER_SPEC.md上引き続きTBD。

## フィールドメニュー(ステータス／どうぐ) = PARTIAL（2026-09-19）

移動中に`menu`アクション(Cキー)で開けるフィールドメニューを新設した。`UI_INPUT_SPEC.md`§6の最低6項目のうち、今回は**ステータス**・**どうぐ**の2項目のみを実装し、まほう／そうび／ジャンカード閲覧／設定は未着手のまま残す(`src/config/fieldMenu.ts`)。ステータス画面は主人公・タロサ・ミレイの加入中メンバーについてLv／EXP／HP・MP／こうげき・ぼうぎょ・すばやさを表示し、Lv／EXPは`GameStateRepository`の保存済み進捗を表示する。HP等の最終成長・戦闘ステータス接続はTBDのため、仮の確認用数値であることを画面内にも明記した。どうぐ画面は`ITEM_EQUIPMENT_SPEC.md`採用済みの「かいふくやく」「どくけし」のみを`src/data/items.ts`に定義し、価格・効果量はspec §10のTBD方針に従いnullのままにした。所持品は`src/systems/Inventory.ts`の初期所持品(かいふくやくx3、どくけしx1)に加えて、戦闘ドロップを`GameStateRepository`へ保存する。`StartingPlaceScene`/`StartingTownScene`/`StartingForestScene`/`BieVillageScene`の4つの通常フィールドSceneへ`src/ui/FieldMenu.ts`を共通で組み込み、開いている間はUI_INPUT_SPEC.md§11に従いPlayer移動・ランダムエンカウント抽選を止める。まほう/そうび/ジャンカード閲覧/設定の追加、HP上昇・実戦闘ステータスとの完全接続は未実装のためPARTIAL。

## 4マップの実プレイサイズ1.5倍化 = CURRENT（2026-09-19）

ユーザー指示により、画像マップを実プレイ上1.5倍の広さへ拡大した。後続の確定指示により、**No.01「はじまりのばしょ」のみ100%へ戻す例外**を設け、はじまりのまち／はじまりのもり／ビーエのむら／レインランドのもり（その1・その2）は`worldScale: 1.5`を維持する。`background.png`/`collision.png`はユーザー提供の参照画像とバイト一致であることをテストが保証しているため、画像の物理リサイズやAIによる再生成は行っていない。`map.json`のマップ固有`worldScale`を各Sceneが読み、背景表示・Collision矩形・物理ワールド境界・Camera境界・Event/Object座標・spawn座標・No.02のNPC位置と建物`door`へ適用する方式にした。`events.json`/`objects.json`/`maps.ts`の座標値自体はネイティブ背景ピクセル座標のまま変更していない。はじまりのもりのランダムエンカウント間隔・クールダウン距離（`src/config/encounter.ts`）も同じ相対頻度を保つため240→360px・300→450pxへ調整した。背景バイト一致の不変条件は無傷である。詳細は `MAP_SYSTEM.md` §4「実行時ワールドスケール」。

## 主人公歩行スプライト = CURRENT（2026-09-19）

ユーザーが `assets/characters/reference/reference/主人公/` へ最新男性主人公の歩行ポーズ参考(正面/うしろ/右/左 × 3フレーム、計12枚)を追加し、これを正式主人公として採用するよう指示した。`tools/build_protagonist_sheet.py`(アルファトリム→サイズ正規化→事前乗算アルファでの高品質縮小→足元ベースライン揃え)で `assets/characters/playable/protagonist_walk.png`(54×70セル、3フレーム×4方向。当初70×70で生成したが、参考画像の一部に散在するノイズ状ピクセルでbboxが水増しされ左歩行1枚だけ肥大化する不具合をユーザー指摘で発見・修正した経緯あり。詳細は`ASSET_INDEX.md` §2)へ変換し、`src/entities/Player.ts` を旧DEV_PLACEHOLDERの単色RectangleからこのSpriteへ置き換えた。当たり判定(30×42)・移動速度(180px/秒)はPhase 5のTEMP_TEST_VALUEを維持し、`src/config/protagonistSprite.ts` のoffsetで足元へ揃えている。歩行アニメーションはPlayerを生成する全Scene(No.01/はじまりのもり/No.02/No.03/建物内部/legacy Field・Tiled検証Scene)で共通のPlayerクラス経由のため自動的に反映される。旧 `hero_walk.png`(女性勇者風)は使用していない。正式な移動速度・当たり判定寸法・アニメーション速度は引き続きTBD。詳細は `ASSET_INDEX.md` §2。

## タロサ歩行スプライト = CURRENT（2026-09-19）

同じ手順を `assets/characters/reference/reference/タロサ/` の12枚へ適用し、`tools/build_tarosa_sheet.py`(共通処理は`tools/character_walk_sheet.py`へ抽出し主人公と共有)で `assets/characters/playable/tarosa_walk.png`(44×70セル、キャラクター高さ64pxで主人公と統一)を生成した。タロサは操作キャラでなくパーティfollowerのため、`src/systems/PartyFollowers.ts` を単色Rectangleからこのspriteへ置き換え、主人公の移動軌跡を辿る際に実際に動いているかどうかで歩行アニメ/直立フレームを切り替えるようにした。横移動時にタロサの足元が主人公と約11pxズレて浮いて見える不具合(Sprite原点とArcade Body中心のズレが未補正だったため)をユーザー指摘で発見し、`characterWalkSprite.ts`の`bodyCenterOffset()`で補正済み。詳細は `ASSET_INDEX.md` §2、`PHASE_DEV_PARTY_FOLLOWERS.md`。

## ミレイ歩行スプライト = CURRENT（2026-09-19）

同じ日、`assets/characters/reference/reference/ミレイ/` の12枚(うち左3.pngは黒背景がそのまま焼き込まれた透過なし画像だったため、`build_mirei_sheet.py`側で左1.pngの複製に差し替え)から `tools/build_mirei_sheet.py` で `assets/characters/playable/mirei_walk.png`(54×70セル、キャラクター高さ64pxで統一)を生成し、`PartyFollowers.ts`のDEV_PARTY_PLACEHOLDER_SPRITE(単色Rectangle)をこのSpriteへ置き換えた。これで主人公・タロサ・ミレイの3人とも正式歩行Spriteが揃った。透過なしフレームを色類似度で復元する処理も試したが、背景色がキャラクター自身の黒縁と同色で判別できず縁が消える問題が出たため採用せず、`character_walk_sheet.py`の`alpha_trim`は透過なしフレームを検出すると`OpaqueReferenceFrameError`で明示的に停止するようにした(今後同種の不良フレームが来た際に静かに劣化させないため)。詳細は `ASSET_INDEX.md` §2、`PHASE_DEV_PARTY_FOLLOWERS.md`。

3人パーティが縦一列(上下移動)で重なった際、常に主人公が最前面・ミレイが最背面という固定順だったため、上向きに歩くとカメラに近い(画面下の)ミレイが逆に一番奥に隠れる不自然な重なりになる不具合をユーザー指摘で発見した。`PartyFollowers.ts`に簡易Y-sort(毎フレーム、Y座標が大きい=画面下にいるキャラクターほど手前のdepthになるよう並べ替え)を追加して修正。マップ背景・Objectとの正式なY-sortは引き続き未実装(既知の制約)。

## 正式マップシステムの変更（2026-09-18）

新規の町・村・城・ダンジョン・イベント地点は、**高解像度の背景画像を正本**とし、制作時に画像解析で作成して人間が修正したCollision Mask、Event、Objectを同一座標で管理する方式へ変更した。Phaserは生成済みの軽量データだけを読み込み、実行中にAI画像認識を行わない。ワールドマップは目的地ポイントを選択する方式とし、巨大フィールドの徒歩Collisionは新規制作しない。詳細は [MAP_SYSTEM.md](MAP_SYSTEM.md) を正とする。

No.01「はじまりのばしょ」は、背景画像マップを通常の `StartingPlaceScene` へ統合した最初の移行例である。既存No.01のTiled実装、`FieldScene`、関連テスト・アセット・ツールは動作中のlegacy実装として保持し、削除しない。No.02以降の旧Tiled実装は新方式へ自動移行しない。

## ポイント選択式ワールドマップ = PARTIAL（通常導線統合、2026-09-18）

CURRENT高解像度背景を表示し、目的地ポイントを選択→拡大→暗転→ローカルマップへ移動する `WorldMapScene` を通常導線へ登録した。No.01画像マップの北門Event／No.02西端から世界地図へ入り、No.01 / No.02の2地点を選んで安全な `fromWorldMap` spawnへ戻れる。`visible` / `unlockFlag` から未解放地点を`？？？`としてロック表示できる。地点座標は `DEV_PLACEHOLDER_POSITION` であり、SaveSystem接続とNo.03以降は未実装。徒歩 `FieldScene` はlegacyとして保持し、通常導線から外した。詳細は [PHASE_WORLD_MAP_POINT_SELECTION.md](PHASE_WORLD_MAP_POINT_SELECTION.md)。

## No.01 背景画像マップ = PARTIAL（通常導線統合、2026-09-18／背景は2026-09-19に夜版へ差し替え済み、上記参照）

No.01は、`background.png` をCURRENTの景観正本、`collision.png` を同寸法の二値Collision、`events.json` を北門→`WorldMapScene`、`objects.json` をOBJECTレイヤーとして読む通常Sceneへ移行した。実行中の画像意味解析は行わず、黒マスクだけを16pxセル単位で静的Bodyへ変換する。`?mapTest=image-no01` は同じ正式パッケージの単体確認URLであり、`D` でDEV Collision表示を切り替えられる。No.01夜版、正式Object、iPhone Safari実機確認は未完了のためPARTIAL。詳細は [PHASE_IMAGE_MAP_MINIMUM.md](PHASE_IMAGE_MAP_MINIMUM.md)。

## はじまりのもり = PARTIAL（No.01と同方式の追加フィールド、2026-09-18）

No.01「はじまりのばしょ」と同じBACKGROUND/COLLISION/EVENT/OBJECT画像マップ方式・同じPlayer/InputSystem/MapCamera/MapTransitionを再利用し、`assets/maps/starting_forest/`（1536×1024、南の木戸→北の石アーチの一本道＋余裕のある周辺、収集済みCollisionは色閾値＋最大連結成分＋膨張で生成）を`StartingForestScene`へ統合した。`WorldMapScene`の目的地へ`destination_starting_forest`（`unlockFlag: null`、No.01/No.02と同じく常時選択可）を追加し、北門Eventで`WorldMapScene`へ戻る。歩行距離ベースの抽選（`src/systems/RandomEncounter.ts` + `src/data/encounterTables.ts`、1戦闘1体、001/003から50%/50%、戦闘後は一定距離再抽選禁止）で既存`BattleScene`へ接続し、勝敗後は戦闘直前の座標（`BattleDialogueEvent`の`returnSpawnX/Y/Facing`を新設）へ復帰する。`monsters.ts`に`DEV_BATTLE_MONSTERS["001"]`を追加したが、両敵とも正式名称・正式ステータスはMONSTER_SPEC.md上未確定のためDEV_BATTLE_BALANCEのまま。正式No.01〜No.20の番号は持たない追加フィールド（`MAP_FLOW_SPEC.md`§4.7）。SaveSystemの`flags`が未実装のため`unlockFlag`を実際に読むのはDEV専用の`WorldMapTestScene`のみで、本番`WorldMapScene`は現状常時解放としているためPARTIAL。`?mapTest=starting-forest`でDEV単体起動できる。

## No.02 はじまりのまち 画像マップ移行 = PARTIAL（2026-09-19）

No.02「はじまりのまち」の外観をDEV_PLACEHOLDER（単色背景＋Building entityの単色矩形）から、No.01と同じBACKGROUND/COLLISION/EVENT/OBJECT画像マップ方式へ移行した。`assets/maps/starting_town/`（1448×1086、噴水広場を中心にした十字型の町並み。Collisionは石畳・土の道の色閾値＋建物5棟の個別除外＋噴水/花壇/川の除外＋膨張で生成、各建物の出入口だけ帯状に歩行可能を残す）を`StartingTownScene`へ統合し、NPC会話・パーティ加入（タロサ/ミレイ）・戦闘イベント（DEV_BATTLE_EVENT/デーマス）・建物内部（InteriorScene）接続は既存実装をそのまま再利用した。reference画像には建物5棟（やどや/どうぐや/ぶきや/きょうかい/民家A）しか描かれていなかったため、正式建物数を6→5へユーザー確認のうえ縮小し、民家B関連データ（`no02_start_town_interiors.json`・`src/config/interiors.ts`・`src/config/maps.ts`）を削除した。旧DEV_PLACEHOLDER専用の`entities/Building.ts`・`config/building.ts`・`config/startingTown.ts`は不要になり削除。カメラは他の画像マップと同じ追従式に変更し、`DialogueBox`へ`setScrollFactor(0)`を追加した。西端1か所のみを`WorldMapScene`への正式出入口とする。`?mapTest=no02`でDEV単体起動できる（WorldMapScene/InteriorScene/BattleSceneも同時登録）。実店舗機能・正式NPC・正式台詞は未実装のためPARTIAL。詳細は`MAP_FLOW_SPEC.md`§4.9。

## No.03 ビーエのむら = PARTIAL（No.01と同方式の画像マップ、2026-09-18）

正式No.01〜No.20の番号を持つ最初の画像マップ移行例として、`assets/maps/bie_village/`（1536×1024、広場を中心に放射状の道が伸びる山間の村。Collisionは石畳・土の道の色閾値＋建物6棟/井戸状構造物の個別除外＋川除外＋膨張で生成）を`BieVillageScene`へ統合した。既存の`StartingPlaceScene`/`StartingForestScene`と同じPlayer/Collision/Camera/Transitionをそのまま再利用する。`WorldMapScene`の目的地へ`destination_bie_village`を追加し、`MAP_FLOW_SPEC.md`§4.5の方針どおり`unlockFlag: "story.bie_village_unlocked"`を持たせた（No.01/No.02/はじまりのもりの`unlockFlag: null`とは異なり、本番`WorldMapScene`もSaveSystem未接続のため、2026-09-19以降は`developmentUnlockedFlags`を暫定の解放状態として使い、実プレイでも選択できる。上記参照）。北門1か所のみを世界地図への正式出入口とし、背景に描かれた東・南東方向の道は接続先未定の行き止まりとして残した。NPC・会話・木こり救出イベント・ランダムエンカウントは、`docs/NPC/02_bie_no_mura.md`が`SOURCE_DRAFT_EXISTS / REDUCING`（人数・台詞本文とも未確定）のため今回は未実装。`?mapTest=bie-village`でDEV単体起動できる。詳細は`MAP_FLOW_SPEC.md`§4.8。

## 既存No.01 Tiled実装 = COMPLETE（legacy runtime、2026-09-17）
```
NO.01 TILED VISUAL = COMPLETE
NO.01 PHASER DEV = COMPLETE
NO.01 STARTING PLACE TILED LEGACY = COMPLETE
```
No.01「はじまりのばしょ」昼のTiledマップ(`tiled/maps/mq0_map01_starting_place_day.tmj`)は、Terrain v2/Trees v2/Props v2/Bridge v2/Path v2の全カテゴリが正式化され、視覚DEV_PLACEHOLDERは0件(Collision層の非表示マーカーのみ残存、対象外)。`?mapTest=no01` のDEV専用URLでのPhaser実表示・歩行・Collision・Events検出(4種)を維持する。Tiled読み込みは `TiledMapRuntime.ts`、通常の画像方式とは独立した `LegacyTiledStartingPlaceScene.ts`、`MapTestNo01Scene.ts` に保持する。通常の `StartingPlaceScene` はTiledを読まない。詳細: `PHASE_NO01_OUTDOOR_TILESET_SPEC.md`、`PHASE_NO01_TILED_PHASER_INTEGRATION.md`、`PHASE_NO01_STARTING_PLACE_TILED_PRODUCTION.md`。

## 既存Phase 8.6 ROUGH_FIELD（legacy prototype）
2026-09-15 No.01昼Tiledマップ: 「はじまりのばしょ」昼版を、既存Tiled規約(Layer/Object/Property)に沿った実マップ(48×36、32px)として新規作成。屋外用の正式タイルセットが未着手(実ファイル無し)と判明したためDEV_PLACEHOLDERタイルセットを新規用意。歩行可能性は自動BFSで検証済み、Local Bridge CLIでのValidateはErrors 0。Phaser側の読み込みは未実装(既存No.01夜版・通常起動は無変更)。詳細: `PHASE_NO01_DAY_TILED_MAP.md`。

2026-09-14 デーマス戦: 既存BattleSceneとNPC会話後イベントを拡張し、`?battleTest=demas`とNo.02のDEV NPCから開始可能。敵データの行動巡回、MP、汎用ミラー反射、逃走不可、上部HP/MPと縦コマンドを追加。最終数値・習得・No.16配置・保存は未確定。詳細: `PHASE_DEMAS_BATTLE.md`。

Phase 8.6では既存世界地図REFERENCEを背景にしたROUGH_FIELDを追加。内部960×720、Field 1920×1440、180px/秒、即時追従CameraとMapTransitionを維持。No.01／No.02の位置はDEV_PLACEHOLDER_WORLD_POSITIONで、南西の橋を通る徒歩往復を確認。建物退出直後の再入場を再現し、6棟の帰還座標だけを修正。正式地理・正式Collision・Tiled・Phase 9は未着手。詳細: `PHASE8_6_ROUGH_FIELD.md`。

このファイルは『モンスタークエスト0 ～幻の冒険の書～』の**現在地点を短時間で把握するための最優先スナップショット**。
詳細は各SPECを参照する。

## 1. 現在の固定値
- 正式タイトル: モンスタークエスト0
- サブタイトル: ～幻の冒険の書～
- 広告コピー: 「誰も知らないゲーム、やってみる？」
- 目標プレイ時間: **初見約4時間30分 / 寄り道込み約5時間30分**
- 主要パーティ: 主人公・タロサ・ミレイ
- わたべ: 特殊参加 / 終盤重要人物
- モンスター総数: 25体
- ジャンカード総数: 45枚
- ジャンカード料金: 1回ジャンコイン1枚
- ジャンカード: 固定順 / ダブりなし / 本編攻略必須ではない独立サブゲーム
- 実装中心: Phaser 3 / Phaser Game Agent
- Claude Code: メイン実装
- Codex: レビュー / デバッグ / QA
- Astra: コア安定後に必要に応じて使用
- ASRS: 使用しない
- 制作目安: 80% AI + 20% 人間の視覚・テンポ調整

## 2. 現在の開発段階
- 仕様・素材整理とマップ設計データ作成が先行。
- 全体ワールドマップ・主要地域配置・大枠は維持。
- 町・村・城内部、ダンジョン内部をコンパクト化。
- 2026-09-11、採用済み地域を **No.01〜No.20** へ正式に振り直した。
- No.02「はじまりのまち」の内部設計データをGitHubへ追加済み。
- 2026-09-12のユーザー指定Phase 1として、Phaser 3.90.0 / Vite / TypeScriptの起動基盤を追加。
- Phase 1ではBootSceneの診断画面、仮の320×240表示、キー入力の共通action変換を実装。以後の追加内容は以下を参照。
- PCの起動・入力・リサイズ・型チェック・ビルド・入力テストを確認。正式解像度とiPhone Safari実機確認は未完了。
- 続くPhase 2として、TitleScene（正式ロゴ + 6項目メニューの選択・決定）を追加。BootSceneはTitleSceneへ引き渡すのみに整理。
- Phase 2ではpromo_026を採用。Phase 5.5のCURRENTタイトルは `assets/title/ChatGPT Image 2026年9月13日 05_31_34.png`（旧promo_026はSUPERSEDEDとして保持）。「はじめから」は冒頭演出へ接続。「つづきから」はdisabled。他4項目は決定入力の取得のみで本体未接続。
- 続くPhase 3として、「はじめから」直後の約5秒異常演出（`OpeningGlitchScene`）を追加。FC〜初期SFC風のデータ破損演出のみで、フェイク「ぼうけんのしょ」文言は使用していない。Phase 3単体では演出終了後に黒画面で停止する。
- 2026-09-13、未コミットのPhase 1〜3を保持して再検証後、Phase 4として演出終了先を `StartingPlaceScene` へ接続。No.01夜の地面・焚き火をGraphicsのPLACEHOLDERで静止表示する。正式素材・配置・主人公・台詞はTBD、昼版や操作は未実装。詳細は `PHASE4_STARTING_PLACE.md`。
- Phase 5で、No.01夜内のDEV_PLACEHOLDERによる4方向連続移動と当たり判定を追加。仮速度60px/秒、向きを保持、既存InputSystem/input lockを使用。正式主人公素材・配置・移動方式はTBD。No.01外への遷移やPhase 6は未実装。詳細は `PHASE5_PLAYER_MOVEMENT.md`。
- Phase 5.5でタイトル正式画像を差し替え、No.01の構図REFERENCEを3枚保存。左にキャンプ/焚き火、中央に山側への小道、中央〜右に小橋、右に水辺、奥に山/岩壁/滝/森を感じる構図を基準とする。開始時は夜、正式ゲーム背景はTBD。今回は仮配置・移動・Collisionを変更せず、昼版とPhase 6は未実装。詳細は `PHASE5_5_VISUAL_BASELINE.md`。
- Phase 6で、No.01⇔No.02のマップ遷移基盤を追加。`src/config/maps.ts`にmapId/spawn/出口をまとめ、`StartingTownScene`（No.02のDEV_PLACEHOLDER: 地面+主人公+No.01への入口のみ）を新規追加。Phase 5のPlayer/InputSystem/Collisionは無変更。Phase 6.1でユーザーが通常のChrome/Edgeで往復動作を実機確認しPASS。詳細は `PHASE6_MAP_TRANSITIONS.md`。
- Phase 7で、No.02 DEV_PLACEHOLDERへ確認用NPC1体を追加し、正面判定→会話開始→複数ページ送り→終了までの基本会話システムを実装。会話データは`src/data/dialogues.ts`へ分離し、正式台詞はDEV_PLACEHOLDER_DIALOGUEのみ。ブラウザでの実機操作確認はBrowserペインが非表示のセッションのため未完了（Phase 6と同様の制約）。詳細は `PHASE7_NPC_DIALOGUE.md`。
- 2026-09-13、内部解像度を仮320×240から仮960×720（3倍、4:3維持）へ移行。`src/config/display.ts`の`BASE_WIDTH`/`BASE_HEIGHT`/`SCALE_FACTOR`を一元管理の基準とし、既存の座標・サイズ・速度は`* SCALE_FACTOR`で追従させた。タイトルロゴは元画像(1672×941)のまま読み込み、ロゴ専用にLINEARフィルタを適用して高精細表示、ゲーム本編のドット絵はNEAREST/pixelArtを維持。タイトルメニューはユーザーフィードバックを踏まえ、単純な3倍よりさらに縮小（旧サイズの約70%相当）。詳細は `RESOLUTION_MIGRATION_960x720.md`。
- 2026-09-13、タイトル画面をドラクエ風の「プッシュエニーボタン」構成へ変更。起動時はロゴ+背景+点滅プロンプト「なにか　ボタンを　おしてください」のみを表示し、既存action(confirm/cancel/方向)のいずれかを押すと6項目メニューが現れる二段階構成にした。背景はユーザー提示の城門前の絵（元は世界地図REFERENCE`mq0_world_map_022_94f19bddfe.png`）を正式採用し、ロゴ同様LINEARフィルタで高精細表示。メニュー/プロンプト文字には黒縁取りを追加し、写真調の背景に重なっても視認性を確保した。会話システム・マップ遷移・移動ロジックは無変更。
- Phase 8-Aで、No.02「はじまりのまち」を正式に存在が確認できる建物6棟（やどや/どうぐや/ぶきや/きょうかい/民家A/民家B、`no02_start_town_interiors.json`のDESIGN_DATAに基づく）の外観+Collisionへ拡張。建物データは`src/config/maps.ts`へ集約し、`interiorId`でPhase 8-B接続用に対応関係だけ記録(遷移は未実装)。正式NPC人数・会話は`NPC_SPEC.md`で再検討中のため、Phase 7のDEV_PLACEHOLDER_NPCを再配置するに留めた。No.01⇄No.02のMapTransition・Player・DialogueBox(22px)・960×720・タイトル画面は無変更。詳細は `PHASE8A_STARTING_TOWN_EXTERIOR.md`。
- Phase 8-Bで、町→建物入口→暗転→建物内部→出口→暗転→町という出入りの流れを実装。6棟分を複製せず共通`InteriorScene`（`src/scenes/InteriorScene.ts`）+ `interiorId`で内部レイアウトを引く`src/config/interiors.ts`のデータ駆動構成にした。建物の外観`mapId`側と内部`interiorId`側を明確に分離し、内部から出た際は各建物の`frontSpawnId`（建物前スポーン6件を新設）で戻すため、どの建物から出ても正しい建物前に戻る。壁は`Building.ts`の`computeWallSegments`でドア位置だけ通行可能な帯を残す形にCollisionを分割。店・宿泊・教会機能、内部NPC・大規模会話、宝箱、戦闘、セーブ、音は未実装のまま。詳細は `PHASE8B_STARTING_TOWN_INTERIORS.md`。
- Phase 8.5で、No.01→`FieldScene`→No.02の徒歩往復を既存実装として追加した。これは当時のDEV_PLACEHOLDER_FIELD（仮ID`field_starting_region`）の検証結果であり、2026-09-18以降の新規制作ではポイント選択式ワールドマップ方針に置き換える。既存Scene・テストは削除しない。詳細は `PHASE8_5_FIELD_CAMERA.md` と `MAP_SYSTEM.md`。
- 正本同士の既知の不一致は別作業として残る。詳細は `PHASE1_BOOTSTRAP.md` / `PHASE2_TITLE.md` / `PHASE3_OPENING_GLITCH.md`。

## 3. 最新主人公設定
- 主人公は男性。
- 本来は別のモンスタークエスト作品／別バージョン世界にいた**ただのNPCだった人物**。
- 世界間の異常でMQ0へ迷い込む。
- 序盤では自分の出自や世界の仕組みを理解していない。
- プレイヤーへ直接メタ発言しない。
- 最後まで特別な血筋や「元から選ばれた勇者」にしない。
- 固有魔法「エレキテル」は採用済み。
- 真の最終解決後、わたべとともに元世界へ帰る。
- 最後に操作不能となり、元世界では本来NPCだったことを画面上の役割で明かす。

旧女性勇者風主人公・旧 `hero_walk.png` は現行主人公として使用しない。

## 4. オープニング
タイトル
→ 「はじめから」
→ **No.01「はじまりのばしょ」夜版**
→ 完全な暗闇から焚き火を先に見せる0:02〜0:07の明転
→ ナレーション6行 → 焚き火を見る主人公の「…………。」
→ BGMなし、焚き火 / 風 / 水辺の環境音だけで操作解放
→ 昼版 / 次導線
→ **No.02「はじまりのまち」**

固定:
- 初見では意味を説明しない
- 開始直後の偽セーブ消失は使わない
- 本格世界崩壊は終盤
- 直接メタ会話をしない

## 5. 世界の裏構造
- MQ0には複数のモンスタークエスト作品／バージョン由来の断片が混在する。
- 主人公もその混線で別世界から入り込んだ。
- 異なる世界由来の敵・ボスが同居する。
- 終盤の異常な強さもこの混線と意味的につなげる。
- 序盤から直接説明しない。
- 子どもには普通のRPG、大人には考察できる二重構造を守る。

## 6. 正式マップ番号
`MAP_FLOW_SPEC.md` を正本とする。

| No. | 地域 |
|---:|---|
| 01 | はじまりのばしょ |
| 02 | はじまりのまち |
| 03 | ビーエのむら |
| 04 | レインランドのまち |
| 05 | レインランドじょう |
| 06 | ザボンのむら |
| 07 | いしのむら |
| 08 | まじんのどうくつ |
| 09 | かくれざと |
| 10 | みずうみの古城 |
| 11 | いわやまのどうくつ |
| 12 | 港町ダコハ |
| 13 | コタンカイムの洞窟 |
| 14 | ポサロ城 |
| 15 | ふっかつのほこら |
| 16 | デーマスの塔 |
| 17 | ぬまちのどうくつ |
| 18 | バトラスのとりで |
| 19 | オロチのしろ |
| 20 | 最終地点（内部名: オロチゾンビのま） |

- No.01〜20を正式番号とする。
- 旧番号は過去履歴以外では使用しない。
- No.02内部設計: `assets/maps/data/no02_start_town_interiors.json`

## 7. NPC制作
会話原案あり:
- No.02 はじまりのまち
- No.03 ビーエのむら
- No.04 レインランドのまち
- No.05 レインランドじょう
- No.06 ザボンのむら

既存人数をそのまま実装せず、コンパクト化した地域へ必要なNPCだけ選抜・統合する。

## 8. アート方針
### レトロ維持
- フィールド
- 歩行スプライト
- UI
- コマンド戦闘基本表示

### 高品質化
- 戦闘背景
- 探索 / イベント背景
- 重要シーン

最新男性主人公の正式歩行スプライトは2026-09-19にCURRENT化済み(`assets/characters/playable/protagonist_walk.png`)。

## 9. 終盤の正式固定事項
- No.18 バトラスのとりで → No.19 オロチのしろ → No.20 最終地点。
- **オロチゾンビは裏ボス。**
- オロチゾンビ1回目 → バグ／フーフー等 → データが消えたように見せる → OP / タイトル側 → **「もういちど」**。
- 「もういちど」はNew Gameではない。
- 選択後は**同じNo.01「はじまりのばしょ」へ戻る**。
- 主人公・タロサ・ミレイは前の出来事を覚えている。
- わたべ加入 / 特殊参加 → オロチゾンビ再戦。
- この一連は**裏ワザ**。
- 実セーブ・ジャンカード取得情報は絶対に削除しない。

## 10. 真のエンディング
- 真の最終解決後、主人公とわたべは主人公の元世界へ帰る。
- ミレイは主人公に恋心を抱いており、最後に別れる。
- No.01の焚き火から始まり、「もういちど」で同じ場所へ戻る構造を終盤で回収する。
- 主人公を操作不能にする。
- 元世界の別の勇者／主人公役が主人公へ話しかける。
- 主人公がNPCとして短い定型台詞を返す。
- 説明文ではなく**操作できないこと**で「本来ただのNPCだった」と明かす。

正確な別れの台詞、元世界名、NPC定型台詞等はTBD。

## 11. 戦闘固定事項
- 「クリティカル」ではなく「だいヒット」。
- わたべ固有は「とくだいヒット」。
- デーマスはミラー / ダイダイン反射攻略。
- デスタロッサはMQ0に登場させない。
- オロチゾンビ1回目と再戦の最終数値・AI・勝敗条件はTBD。

## 12. ジャンカード
- 全45枚
- 1回ジャンコイン1枚
- No.01→45固定順
- ランダムではない
- ダブりなし
- 本編攻略必須ではない
- **本編NPCや序盤イベントで頭文字・並び・たびのあいことば・カード秘密を早期に示唆しない**
- 「もういちど」演出でも取得情報を消さない

## 13. 主要採用魔法
- ライフ
- リライフ
- ヒート
- ビーター
- ビーテスト
- ムーブ
- ミスト
- パニック
- エレキテル
- アイスーン
- ダイダイン

## 14. 主要採用アイテム・装備
武器:
- ぼくとう
- こんぼう
- てつのけん
- こうてつのけん

勇者装備:
- ゆうしゃのけん
- ゆうしゃのかんむり
- ゆうしゃのたて

道具:
- かいふくやく
- どくけし
- きこりのオノ
- まもりのナイフ
- かいがらのぼうし
- ふしぎなかぎ
- いのちのかがみ

## 15. 現在の優先作業
1. GitHub正本の一貫性確保
2. No.01〜20番号維持
3. No.01オープニング具体化
4. No.02はじまりのまち + 内部データ具体化
5. ~~最新男性主人公素材~~ → 2026-09-19 CURRENT化済み。移動速度・当たり判定・アニメ速度の正式値確定は引き続き残課題
6. Vertical Slice
7. セーブ / iPhone Safari
8. 本編地域量産
9. 終盤「もういちど」の安全な状態遷移実装
10. 全体プレイ時間調整

## 16. AIが読む順番
1. `PROJECT_STATUS.md`
2. `INDEX.md`
3. `GAME_SPEC.md`
4. `CREATIVE_DIRECTION.md`
5. `OPENING_SPEC.md`
6. `STORY_FLOW.md`
7. `MAP_FLOW_SPEC.md`
8. 作業対象SPEC
9. `TBD_REGISTRY.md`
10. `DEFINITION_OF_DONE.md`

## 17. 情報の優先順位
1. 日付が新しいユーザー確定仕様
2. `PROJECT_STATUS.md`
3. 各最新SPEC
4. 実装コード
5. 古い試作 / 旧プロモ / コメント

現行仕様として使わない:
- 約1時間
- ジャンカード20枚 / 40枚
- RPGJS中心
- ASRS
- 旧女性主人公
- 旧マップ番号
- 起動直後の偽セーブ消失
- ジャンカード秘密の早期示唆
