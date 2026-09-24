# Phase: No.07 まじんのどうくつ — 特殊ターン制Dungeon RPG

最終更新: 2026-09-20 JST

## 仕様

- 正式No.07だけの例外。通常のBACKGROUND / COLLISION / EVENT / OBJECT画像マップ方式を変更・一般化しない。既存`map_08_majin_cave`は旧番号由来の互換IDであり、改名しない。
- 32×32の論理グリッドを一手ずつ移動する。移動、隣接敵への攻撃、待機の後に、敵は各1回行動する。壁への移動とヘルプ表示はターンを進めない。
- 到達目安はLv8前後。**2026-09-23ユーザー指示により、どうくつは主人公1人で、これまでのレベル・EXPを引き継ぐ**。HP/MP/攻撃/防御は`CharacterProgression.getStats("hero")`(通常フィールド・通常戦闘と同じ累積EXP)から組み立てる。倒した敵は`MONSTER_ROSTER`の正式EXPを主人公へ加算し、その場でレベルアップ(最大HP/MPの増加分だけ現在値も増える)、どうくつを出た後も残る。ヒートは主人公がLv8で習得済みの場合のみ使用可。近接ダメージ=攻撃力×`MAJIN_CAVE_PLAYER_DAMAGE_RATE`(0.55、想定Lv9で従来の固定22に一致)、被ダメージ=敵攻撃−防御/4(最低1)はTEMP_TEST_VALUE。`?mapTest=majin-cave`は現在のセーブのレベルで始まるが、獲得EXPはメモリ内のみで実セーブへ書き込まない。敵HP・攻撃・再生などの`DEV_MAJIN_CAVE_BALANCE`は引き続き暫定値。
- 1〜9Fはseed付きの部屋＋L字通路生成、10Fは入口→短い探索→最終部屋→まじんの固定要素を持つ。階段markerは発見後にだけメイン画面とミニマップへ表示し、未探索フロアを目的地までの一直線にしない。
- まじん撃破で`ascent`へ移行する。出現済みの同じFloorStateを保持し、敵を勝手に復活させず10Fから1Fまで戻る。
- 1 runにつき**ちょうど1フロア**だけ、4〜9Fからseedで決定したモンスターハウスにする。通常敵数の2倍（通常2〜3体に対し4〜6体）を、その階本来の敵表だけから配置する。入口・階段・敵は重ならず、入口の隣接マスが敵で完全包囲されない配置制約を通常階と共有する。

## アーキテクチャ

| ファイル | 責務 |
|---|---|
| `src/config/majinCave.ts` | grid、tileset、階層表現、DEVバランス |
| `src/data/majinCaveEnemies.ts` | 階層別敵表とDEV敵データ |
| `src/systems/MajinCaveGenerator.ts` | 純粋なseed付き生成、BFS接続確認 |
| `src/systems/MajinCaveRunState.ts` | run内のFloorState、敵撃破状態、探索済みセル、昇降 |
| `src/systems/MajinCaveTurnSystem.ts` | 移動・攻撃・待機、敵の接近／攻撃ターン |
| `src/scenes/MajinCaveScene.ts` | Phaser描画、入力、ミニマップ、タッチUI、将来イベント用の任意復帰先 |

FloorStateにはPhaser GameObjectを入れず、logical grid、stairs、enemies、defeatedEnemyIds、exploredCells、`isMonsterHouse`、`monsterHouseRevealed`だけを持つ。

## 生成方式

1〜9Fは矩形の部屋を4〜5個掘り、隣り合う部屋中心をL字通路でつなぐ。BFSで入口から各部屋中心と下り階段への接続を確認する。下り階段は入口から最も遠い到達可能セルに置く。10Fは固定の短い通路と広いボス部屋を使い、まじんをボス部屋の奥へ置く。

### モンスターハウス

- 選択階はrun開始時にseedから一度だけ決め、同じseedでは常に同じ階になる。帰路では同じFloorStateを再利用するため、倒した敵、探索済みミニマップ、表示済みフラグはそのまま残り、敵を再生成しない。
- 初めてその階に入った時だけ短い暗転・`モンスターハウス`表示を出し、以後のHUD表示も同名にする。入る前には予告しない。敵AI・視界・ミニマップの探索済み／未探索ルールは通常階と同じである。
- 宝箱・アイテム・回復の正式システムはまだない。このためモンスターハウス専用の確定報酬は実装せず、攻略進行を妨げない状態をPARTIALとして残す。

### DEVテンポ計測

DEV buildではrun終了時にconsoleへ、seed、各階の入退場時刻・滞在時間・歩数・戦闘回数・撃破数・被ダメージ・回復量・入退場HP・死亡数、下り／帰り、まじん戦時間、総プレイ時間を出力する。モンスターハウスは階数、初期敵数、撃破／残敵、滞在時間、被ダメージ、死亡数、表示済み状態も別行で出す。数値は`DEV_MAJIN_CAVE_BALANCE`の暫定値であり、実プレイ計測後にのみ調整する。

## アセット

- `assets/maps/majin_cave/tileset.png` / `.json`: ユーザー提供の32px正規化済み8×8 tilesetのバイト一致コピー。
- `assets/maps/reference/reference/まじんのどうくつ.png`: REFERENCEキービジュアル。ランタイムにはロード・コピーしない。
- 主人公は既存の`assets/characters/playable/protagonist_walk.png`を再利用する。旧`hero_walk.png`は使わない。
- 通常敵8種と10Fまじんはユーザー提供の対応済みスプライトシートを使う。未登録またはロード失敗時だけ、既存肖像画またはマーカーへ安全にフォールバックする。カード原画・番号だけから敵画像を推測しない。

## DEV URL

`http://127.0.0.1:5173/?mapTest=majin-cave`

複数runの比較用には、DEVだけで`&seed=1`（旧`&majinCaveSeed=1`も可）のように0〜4,294,967,295の整数seedを指定できる。指定なしは固定seed 8008である。10F表示・まじんアニメーション確認には`&majinCaveFloor=10`を追加できる。このショートカットは`mapTest=majin-cave`時だけ有効で、通常導線と保存データを変更しない。

このURLはNo.07だけを直接起動する。通常導線では、ポイント選択式`WorldMapScene`の「まじんのどうくつ」地点からNo.07へ入り、1F出口から同じ世界地図へ戻る。地点座標は`DEV_PLACEHOLDER_POSITION`であり、REFERENCEキービジュアルの入場演出は使わない。

## QA

- 自動テスト: 同一seed、接続、敵表、blocked cell、1行動=1敵フェーズ、撃破状態保持、まじん後のascent、10F→1F、DEV URL、world-map非接続に加え、4〜9Fのちょうど1つのモンスターハウス、seed安定性、敵数倍率、階層別敵表、入口／階段／敵の非重複、完全包囲なし、帰路の状態保持、DEV計測行を対象にする。
- 手動確認: 1マス入力、長押し非連打、敵重なり・壁抜けなし、階段confirm、10Fのまじん、帰還、モンスターハウス初回演出と帰路での非再演、Scene終了後のinput listener残留なしを確認する。

2026-09-20実行結果: `npm test` PASS、`npm run typecheck` PASS、`npm run build` PASS。`?mapTest=majin-cave`をブラウザで開き、初回短文、32px grid、現行男性主人公、探索済みミニマップ、方向キー1回による1マス移動、Xによる待機と敵の追従、未探索階段markerの非表示、まじん撃破後の2F帰路を確認した。64 seed × 9Fの最短下り経路は平均26.3マス（13〜52）。固定seed 8008の制御入力シミュレーションは1F→10F→まじん→1F脱出で509有効行動、敵への47回の近接攻撃、死亡1回を記録した。これは人間の実プレイ時間ではない。iPhone Safari実機、10Fから1Fまでのブラウザ手動通し操作、Scene終了後listenerの実機計測は未確認。

モンスターハウス追加後のNo.07専用テストは17件すべてPASS（full suiteは270件PASS）。fixed seed 8008では特殊階は8F・初期6体であることを確認した。ブラウザでDEV起動、1マス移動、待機を確認し、console error / warning は0件だった。3 run以上の人間による通し操作・実時間、モンスターハウス初回演出の実画面確認、iPhone Safari確認は、この実装後には未実施である。

## 残課題

- 3 run以上の人間による通し計測に基づく敵HP／攻撃／回復値、モンスターハウス難易度、レベル連携
- 宝箱・アイテム・回復の正式システム、およびモンスターハウスの報酬
- 正式な小型モンスター画像、BGM、宝箱、解放条件
- SaveSystemへのrun中断復帰の接続
- iPhone Safari実機でのタッチ・長時間プレイ・視覚調整

## 2026-09-23 通常敵スプライトアニメーション

- 通常敵8種（プリン／たまゴースト／おばけつむり／ファンシーダック／スノーボム／こあくま／エリマキヘビ／ダイジャ）を、既存の`MajinCaveEnemyId`だけで参照する`majinCaveMonsterSprites.ts`へ登録した。画像の見た目や表示名をScene内で判定しない。
- ユーザー提供シートは`assets/monsters/majin_cave/`へ、RGBA 256×256・64px×4列×4行として正規化した。frame 0〜3=`idle`（5fps無限）、4〜7=`attack`（10fps）、8〜11=`damage`（10fps）、12〜15=`defeat`（7fps）。
- `MajinCaveTurnSystem`は変更しない。表示コントローラは、論理座標確定後の敵移動を110ms Tweenで追従させ、敵攻撃はモーション中点で主人公被弾表示を出す。HP 0の敵は論理的に即時除外され、defeat再生完了後だけ表示をdestroyする。
- `anims.exists()`でScene再入場時の重複登録を防ぎ、DEVでは寸法・全16 frameを警告検証する。未登録・ロード失敗時は既存肖像画またはマーカーへフォールバックする。Monster Houseも同じコントローラを使い、追加の常時Effectは持たない。

## 2026-09-23 表示演出・画面構成

- No.07だけに、logical gridを変更しない**2.0倍追従ワールドカメラ**と、等倍のHUD専用カメラを追加した。画面は上部の簡潔なfloor/Lv/HP/MP、中央の約15×9マスの探索画面、下部の1〜2行メッセージへ整理し、常時の操作説明を外した。
- `exploredCells`は従来どおりRunStateだけが所有する。表示層はそこから「現在視界=明るい／既探索=暗い／未探索=ほぼ黒」を導出し、未視界の敵を隠す。常時ミニマップとM/タッチ「地図」の大型オーバーレイは、ともに探索済みセル、現在地、発見済みだけの上り／下り階段、現在見える敵だけを描く。
- 移動は110ms、主人公／敵の攻撃は短い前進、被弾は小さな揺れ＋点滅、撃破は既存defeat最終frame後の破棄を維持する。モンスターハウス初回だけは暗転中に敵群を一瞬表示し、帰路では再演しない。10Fはまじん部屋の控えめな床の光と、撃破後の帰路色フラッシュを加えた。
- QA: `tests/majinCave.test.mjs`＋`input.test.mjs` 27件PASS、`npm run typecheck` PASS。ブラウザで`?mapTest=majin-cave&seed=1/3/8008`を開き、カメラ、視界、M地図、1マス移動、console error/warning 0件を確認。iPhone Safari実機と10Fから1Fまでの手動通しは未確認。

## 2026-09-23 主人公攻撃時の斬撃エフェクト

- No.07の通常隣接攻撃だけを対象に、`MajinCaveAttackPresentation`が主人公の短い前進、ヒット時の敵hurt、Graphics製の水色／白い弧状斬撃を順に表示する。TurnSystemのダメージ・ターン進行・当たり判定には触れない。敵攻撃とヒートには流用しない。Sceneは有効ターン中に`InputSystem`もロックし、演出中の入力を次ターンへ残さない。
- 右向きを基準にGraphicsを描き、`up`／`down`／`left`／`right`へ回転する。表示時間は通常100ms、まじんには120msかつ1.18倍で、入力ロック中に消滅する。Graphicsをその場で生成・Tween完了時にdestroyする仮実装のため、後日正式Spriteへ差し替え可能。
- この補助表示は`MajinCaveScene`だけから生成・disposeされる。通常フィールド、No.01／No.02、WorldMap、BattleSceneの主人公描画・攻撃演出へは波及しない。

## 2026-09-23 10Fまじん正式スプライトと到着演出

- SOURCEは`assets/monsters/source/majin_cave/monster_majin_dungeon_source.png`（1254×1254 RGBA）として無加工で保持する。runtimeは`tools/normalize_majin_dungeon_sheet.py`により、各原画セルを**拡縮・再描画せず**透明paddingだけを加えて底揃えした`assets/monsters/majin_cave/monster_majin_dungeon.png`（1280×1280 RGBA、4×4、320px frame）である。`MajinCaveScene`のみがPhaser spritesheetとしてloadする。
- frame 0〜3=`idle`（8fps loop）、4〜7=`attack`（10fps、frame 6付近=約200msでhit）、8→9→8=`damage`（12fps）、12〜15=`defeat`（8fps）を`MajinCaveMonsterSpriteController`が再生する。defeat最終poseは700ms保持する。32px logical gridは不変で、bottom-center originと0.235 scaleにより約75px（約2.35マス）で表示する。
- 初めてまじんが視界へ入った時だけ、短い暗転、タイトル、ready pose、軽い画面shakeを約0.9秒で表示する。`FloorState.majinRevealed`はこの一度きりの表示制御だけに使い、HP・ダメージ・敵フェーズ・`ascent`切替には影響しない。10Fかつ出現済みのまじんが生存中だけ、上部HUDへ名前とHPバーを表示する。
- 通常敵・モンスターハウス・通常フィールド・BattleSceneには波及しない。画像ロードに失敗した場合だけ、既存の肖像画／マーカーが安全なフォールバックとなる。
