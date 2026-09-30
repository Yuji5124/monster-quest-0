# 録画プラン・記録（BRIEF.md §3）

最終更新: 2026-09-26 JST

## 録画方法
- ゲーム本体の `npm run dev`（http://127.0.0.1:5173）を使う。起動していなければ `capture/lib/harness.mjs` が起動する。
- Playwright からシステムの Chrome を**使い捨てプロファイル**で起動（viewport 960×720 = ゲーム内部解像度）。普段のChromeのセーブ・localStorageには触れない。
- `canvas.captureStream(60)` → `MediaRecorder`（VP9 / 40Mbps）で `capture/clips/<id>.webm` を保存し、Remotion同梱ffmpegで `<id>.mp4`（60fps固定・H.264 CRF12）へ変換。
- 実行: `node capture/record.mjs [clipId ...]`（台本は `capture/clips.mjs`）。結果は `capture/clips/_results.json`。
- 代表フレーム: `capture/frames/<clipId>__<内容>.png`、一覧は `capture/frames/_contact_sheet.png`。

### 録画中にブラウザ内だけで行った調整（ゲームのファイルは変更していない）
| 調整 | 理由 | 対象 |
|---|---|---|
| DEV起動時だけ出る注記「〇〇  D: Collision表示」「[DEV] 〇〇」を非表示 | 開発用の文字を予告に映さない | 全2Dマップ・3D城 |
| PartySystem に tarosa / mirei を追加して No.02 を再起動 | 3人追従の画を撮るため（DEV URLは主人公1人で始まる） | cap_no02 |
| まじんのどうくつの途中階を、DEVの `majinCaveFloor=10` と同じ手順（下り階段へ移動→下りる）で省略 | URLのフロア指定が10Fだけのため | cap_majin_house |
| 録画開始前にプレイヤーを経路上の数歩手前へ置き直す | 移動の待ち時間を省く（録画中の動きは通常の入力） | cap_majin_explore / house / boss、cap_bie |

スマホ用タッチボタン（十字キー・Z/C・2D等）は**実画面どおり残す**（2026-09-26 ユーザー確認）。

## クリップ一覧
時刻は `capture/clips/<id>.mp4` の秒。

| クリップID | URL | 状態 | 長さ | 使える区間・メモ |
|---|---|---|---|---|
| `cap_opening` | `/` → Enter（回想スキップ）→ Enter（はじめから） | ✅ 実録 | 17.8s | タイトル〜3.4s／**起動ノイズ 3.4〜7.0s**（BOOT 3.4〜4.4、INIT_PLAYER等のウィンドウ 4.4〜5.8、崩れ 5.8〜7.0）／復帰 7.0〜7.8／黒 7.8〜9.2／**焚き火の明転 9.2〜15.5s**／15.7s〜ナレーション字幕（使わない）。「はじめから」直後に約0.9秒フレームが来ない区間（2.0〜2.9s、タイトル静止）がある＝シーン切替時の負荷。 |
| `cap_worldmap` | `/?worldMapTest=1` | ⚠️ **本編不使用** | 7.2s | 地図にオロチへの道・デーマスのとう・港町ダコハ等のNo.12以降の地名が常に表示される（`worldMapFlags`でも隠せない）。§1違反になるため使わない。C04は静止画 `assets/maps/world_map/background.png` を使う。 |
| `cap_no02` | `/?mapTest=no02` | ✅ 実録 | 6.8s | 3人追従で北へ→噴水広場。広場は 3.0s〜。 |
| `cap_bie` | `/?mapTest=bie-village` | ✅ 実録 | 26.1s | 水車小屋の前を行き来。**チリチリ（背景の横ずれ）: 15.82〜15.98s**（画面の y≈598〜620 の帯）。ほかの発生は画面外。村人の残像グリッチ・点ノイズも時々映る。 |
| `cap_castle3d` | `/?mapTest=rainland-castle-3d` | ✅ 実録 | 8.0s | 絨毯に沿って前進。行き先は王座ではなく城の入口の扉（この3Dマップの構成どおり）。 |
| `cap_majin_explore` | `/?mapTest=majin-cave&seed=8008` | ✅ 実録 | 7.7s | 1Fを1マスずつ探索して下り階段へ。 |
| `cap_majin_house` | 同上（7Fへ省略→8Fへ下りる） | ✅ 実録 | 8.2s | seed 8008 のモンスターハウスは8F。**「モンスターハウス！」 2.8〜3.3s**。 |
| `cap_majin_boss` | `/?mapTest=majin-cave&seed=8008&majinCaveFloor=10` | ✅ 実録（位置取りはやや雑） | 13.9s | **「まじんが あらわれた！」 2.9s**、まじんのHPバー 4.0s〜。周りの敵に阻まれ主人公はまじんに隣接しきれていない。巨大化・インパクトはRemotion側（§5-H）で演出する。 |
| `cap_forest_battle` | `/?mapTest=starting-forest` | ✅ 実録 | 12.8s | エンカウント 3.7s（たまゴースト）→こうげき→**「たまゴーストを たおした！」 10.25s〜**→フィールドへ 11.2s〜。 |
| `cap_shoot_chain` | `/?mapTest=iwayama-shooting&shootingSection=chain` | ✅ 実録 | 13.0s | **爆発岩の連鎖 9.6〜10.6s**（画面上部、斜めに並んだ爆発岩が次々に爆発）。 |
| `cap_shoot_wall` | `/?mapTest=iwayama-shooting&shootingSection=wall` | ✅ 実録 | 16.2s | 岩壁のヒビ 3.4s〜→穴と光 7.4s〜→**崩落と光 10.1〜11.5s**→1Fへ戻る 12.8s〜（使わない）。 |
| `cap_hidden` | `/?mapTest=hidden-village` | ✅ 実録 | 6.7s | 木門から坂道を下る。 |
| `cap_lake3d` | `/?mapTest=lake-castle-3d&floor=1` | ✅ 実録 | 7.8s | 一人称で回廊を前進は **0〜3.5s**。4s以降は壁際、7.4sにランダムエンカウント（使わない）。 |

代用（静止画＋2.5Dパララックス）にしたクリップは現時点でなし。`cap_worldmap` の役割（C04）は、もともとBRIEFどおり静止画のワールドマップで作る。

## 人間がOBSで撮り直す場合の手順
- ブラウザを 960×720 のウィンドウ（またはゲーム画面だけをキャプチャ）にし、60fpsで録る。
- 開発用の注記を消したい場合は、DevToolsのコンソールで `capture/lib/pageHelpers.js` の中身を貼り付けて実行すると、以後その注記は非表示になる。
- 各クリップの操作は `capture/clips.mjs` の台本どおり（キー: 移動=矢印、決定=Enter/Z、まじんのどうくつは1押し=1マス）。
