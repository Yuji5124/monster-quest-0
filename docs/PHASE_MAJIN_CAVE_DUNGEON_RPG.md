# Phase: No.08 まじんのどうくつ — 特殊ターン制Dungeon RPG

最終更新: 2026-09-20 JST

## 仕様

- 正式No.08だけの例外。通常のBACKGROUND / COLLISION / EVENT / OBJECT画像マップ方式を変更・一般化しない。
- 32×32の論理グリッドを一手ずつ移動する。移動、隣接敵への攻撃、待機の後に、敵は各1回行動する。壁への移動とヘルプ表示はターンを進めない。
- 到達目安はLv8前後。`DEV_MAJIN_CAVE_BALANCE`は暫定値であり、通常のGameState成長値を書き換えない。
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
- 名前とruntime画像の対応が確認できたプリン／たまゴースト以外は`DEV_MAJIN_ENEMY_MARKER`。カード原画・番号だけから敵画像を推測しない。

## DEV URL

`http://127.0.0.1:5173/?mapTest=majin-cave`

複数runの比較用には、DEVだけで`&majinCaveSeed=1`のように0〜4,294,967,295の整数seedを指定できる。指定なしは固定seed 8008である。

このURLはNo.08だけを直接起動する。通常導線では、ポイント選択式`WorldMapScene`の「まじんのどうくつ」地点からNo.08へ入り、1F出口から同じ世界地図へ戻る。地点座標は`DEV_PLACEHOLDER_POSITION`であり、REFERENCEキービジュアルの入場演出は使わない。

## QA

- 自動テスト: 同一seed、接続、敵表、blocked cell、1行動=1敵フェーズ、撃破状態保持、まじん後のascent、10F→1F、DEV URL、world-map非接続に加え、4〜9Fのちょうど1つのモンスターハウス、seed安定性、敵数倍率、階層別敵表、入口／階段／敵の非重複、完全包囲なし、帰路の状態保持、DEV計測行を対象にする。
- 手動確認: 1マス入力、長押し非連打、敵重なり・壁抜けなし、階段confirm、10Fのまじん、帰還、モンスターハウス初回演出と帰路での非再演、Scene終了後のinput listener残留なしを確認する。

2026-09-20実行結果: `npm test` PASS、`npm run typecheck` PASS、`npm run build` PASS。`?mapTest=majin-cave`をブラウザで開き、初回短文、32px grid、現行男性主人公、探索済みミニマップ、方向キー1回による1マス移動、Xによる待機と敵の追従、未探索階段markerの非表示、まじん撃破後の2F帰路を確認した。64 seed × 9Fの最短下り経路は平均26.3マス（13〜52）。固定seed 8008の制御入力シミュレーションは1F→10F→まじん→1F脱出で509有効行動、敵への47回の近接攻撃、死亡1回を記録した。これは人間の実プレイ時間ではない。iPhone Safari実機、10Fから1Fまでのブラウザ手動通し操作、Scene終了後listenerの実機計測は未確認。

モンスターハウス追加後のNo.08専用テストは17件すべてPASS（full suiteは270件PASS）。fixed seed 8008では特殊階は8F・初期6体であることを確認した。ブラウザでDEV起動、1マス移動、待機を確認し、console error / warning は0件だった。3 run以上の人間による通し操作・実時間、モンスターハウス初回演出の実画面確認、iPhone Safari確認は、この実装後には未実施である。

## 残課題

- 3 run以上の人間による通し計測に基づく敵HP／攻撃／回復値、モンスターハウス難易度、レベル連携
- 宝箱・アイテム・回復の正式システム、およびモンスターハウスの報酬
- 正式な小型モンスター画像、BGM、宝箱、解放条件
- SaveSystemへのrun中断復帰の接続
- iPhone Safari実機でのタッチ・長時間プレイ・視覚調整
