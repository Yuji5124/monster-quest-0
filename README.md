# monster-quest-0

**モンスタークエスト0 ～幻の冒険の書～**

最終更新: 2026-09-19 JST

## マップ制作の正式方針

新規の町・村・城・ダンジョン・イベント地点は、**高解像度の1枚絵背景を正本**にし、制作時に画像解析で生成して人間が修正したCollision Maskを読み込む方式とする。実行中にAI画像認識は行わない。背景、Collision、Event、Objectの4レイヤー、MQ0 Map Editorの将来要件、ポイント選択式ワールドマップ、既存Tiled資産の扱いは [MAP_SYSTEM.md](docs/MAP_SYSTEM.md) を正式仕様とする。

No.01「はじまりのばしょ」はこの新方式へ移行済みで、通常の `StartingPlaceScene` は画像マップを読む。「はじまりのもり」（`StartingForestScene`）も同じ方式・同じPlayer/Collision/Camera/Transitionをそのまま再利用した追加フィールドで、正式No.01〜No.20の番号は持たない（詳細は [MAP_FLOW_SPEC.md](docs/MAP_FLOW_SPEC.md) §4.7）。No.03「ビーエのむら」（`BieVillageScene`）は同じ方式を使う最初のNo.番号付き移行例（詳細は同§4.8）。No.02「はじまりのまち」（`StartingTownScene`）も2026-09-19に同方式へ移行し、既存のNPC会話・パーティ加入・戦闘イベント・建物内部接続はそのまま維持している（詳細は同§4.9）。既存のTiledマップ、`TiledMapRuntime`、`FieldScene`、テスト、アセットはlegacyとして保持し、削除しない。

## ポイント選択式ワールドマップ（通常導線）

通常起動ではNo.01北門・No.02西端・はじまりのもり北門・ビーエのむら北門から、CURRENT高解像度の世界地図を開く。目的地をクリック / タップで選び、拡大表示後にローカルマップへ移動する。初期地点はNo.01 / No.02 / はじまりのもり / ビーエのむらの4件で、方向キー、`Z` / `Enter`、`Esc` に対応する。目的地の `visible` / `unlockFlag` はデータで管理し、未解放地点は`？？？`としてロック表示できる。No.01/No.02/はじまりのもりは`unlockFlag: null`（常時選択可）、ビーエのむらは正式No.03のため実フラグ`story.bie_village_unlocked`を持つが、SaveSystem本体が未実装で本番`WorldMapScene`は常に空集合を返すため、実プレイでは当面`？？？`のままである。`?worldMapTest=1`（`WorldMapTestScene`）は`developmentUnlockedFlags`経由で全地点を解放した状態を単独確認でき、No.01/No.02/はじまりのもり/ビーエのむら/BattleSceneすべてに遷移できる。徒歩 `FieldScene` はlegacyとして保持するが、通常進行には使わない。詳細は [ワールドマップ目的地選択](docs/PHASE_WORLD_MAP_POINT_SELECTION.md)。

## はじまりのもり（ランダムエンカウント）

はじまりのもりは、南の木戸（世界地図からのspawn）から北の石アーチ（世界地図への出口）まで続く一本道を歩けるフィールド。歩いた実距離を蓄積し、一定距離ごとにのみ抽選する方式（`src/systems/RandomEncounter.ts`）で、モンスター`001`/`003`（`src/data/encounterTables.ts`、1戦闘1体、50%/50%）とランダムエンカウントする。戦闘は既存`BattleScene`をそのまま使い、勝敗後は戦闘直前の座標へ復帰し、一定距離は再エンカウントしない。`?mapTest=starting-forest`で単体起動でき、`D`キー/`?collisionDebug=1`でCollision表示を切り替えられる。

## ビーエのむら（No.03）

ビーエのむらは、広場を中心に放射状の道が伸びる山間の村。背景には建物6棟（水車小屋・民家3棟・畑の家・小屋）や井戸状の構造物、川と橋があり、Collisionはそれらを個別に除外して生成している。北門1か所だけを`WorldMapScene`への正式出入口とし、背景に描かれた他の道（東・南東）は今回接続しない行き止まりとして残した。NPC・会話・木こり救出イベント・ランダムエンカウントは、会話原案(`docs/NPC/02_bie_no_mura.md`)がNPC人数未確定の`SOURCE_DRAFT_EXISTS`のため今回は実装していない。`?mapTest=bie-village`で単体起動できる。

## はじまりのまち（No.02、画像マップ移行）

はじまりのまちは、噴水広場を中心に十字型の道が伸びる町。旧DEV_PLACEHOLDER（単色背景＋単色矩形の建物）からCURRENT背景画像方式へ移行し、既存のNPC会話・パーティ加入（タロサ/ミレイ）・戦闘イベント（DEV_BATTLE_EVENT/デーマス）・建物内部(`InteriorScene`)接続はそのまま再利用している。reference画像に実在する建物が5棟（やどや/どうぐや/ぶきや/きょうかい/民家A）だけだったため、正式建物数を6→5へ縮小した（民家Bを統合終了）。西端1か所だけを`WorldMapScene`への正式出入口とする。`?mapTest=no02`で単体起動でき（`WorldMapScene`/`InteriorScene`/`BattleScene`も同時登録）、`D`キー/`?collisionDebug=1`でCollision表示を切り替えられる。

## 起動・検証（legacy Tiled / Field prototypeを含む）

Node.js 22.18以上を使用する。

```bash
npm install
npm run dev
```

ブラウザで `http://127.0.0.1:5173/` を開く。`BootScene` → `TitleScene`（背景+ロゴのプッシュエニーボタン画面 → 何かボタンで6項目メニュー表示）→「はじめから」決定で `OpeningGlitchScene`（約5秒のFC風異常演出）→ 暗転 → `StartingPlaceScene`（No.01画像マップ）、まで遷移する。No.01背景とワールドマップ背景はLINEARフィルタで高精細表示する。オープニングの正式夜版への差し替えは別途TBDである。

### No.01背景画像マップの単体検証

`http://127.0.0.1:5173/?mapTest=image-no01` で、通常のNo.01と同じ `background.png` / `collision.png` / `events.json` / `objects.json` を単独確認できる。黒マスクCollision、北門からのワールドマップ遷移を確認できる。`?collisionDebug=1` または `D` キーでCollision表示を切り替える。Tiled版は `?mapTest=no01` のlegacy検証として保持する。詳細は [背景画像マップ最小検証](docs/PHASE_IMAGE_MAP_MINIMUM.md) を参照。
No.01画像マップで方向キーによる4方向移動・当たり判定を確認でき、北門Eventへ入ると暗転して`WorldMapScene`へ移る。世界地図でNo.01 / No.02を選ぶと、それぞれ安全な`fromWorldMap` spawnへ戻れる。No.02はCURRENT背景画像上に建物5棟（やどや/どうぐや/ぶきや/きょうかい/民家A）の外観+Collisionを配置済みで、各建物のドアから共通`InteriorScene`へ入って戻れる。店・宿泊・教会等の機能そのもの、内部NPC・大規模会話は未実装。徒歩の`FieldScene`（仮mapId`field_starting_region`）は旧方式のlegacyとしてコード・テスト・アセットを保持するが、通常導線には使用しない。タイトルの「はじめから」以外の5項目は決定入力を取得するのみで本体機能へは未接続。

- Phaser **3.90.0**を完全固定。既存の依存指定がなかったため今回初回導入した。
- 内部解像度は確認用の仮値 **960×720**（旧320×240の3倍、4:3を維持）。`src/config/display.ts` で`BASE_WIDTH`/`BASE_HEIGHT`/`SCALE_FACTOR`として一元管理し、正式解像度のTBDは維持する。
- 仮キー配列: 方向キー、Z/Enter（confirm）、X/Escape（cancel）、C（menu）。配列は `src/config/input.ts` に分離。
- タイトルロゴCURRENT: `assets/title/ChatGPT Image 2026年9月13日 05_31_34.png`。配信先 `public/assets/ui/title/mq0_title_logo.png` を更新。旧promo_026はSUPERSEDEDとして保持。
- Phase 5.5: No.01構図REFERENCEを3枚保存。正式背景TBD / 実行中はDEV_PLACEHOLDER。構図は `docs/OPENING_SPEC.md` §5に記録し、仮配置・移動・CollisionはPhase 5のまま維持する。
- タイトルメニュー6項目は `src/config/menu.ts` で管理。「つづきから」はSaveSystem未実装のためdisabled。
- 冒頭約5秒異常演出は `src/scenes/OpeningGlitchScene.ts` / `src/config/openingGlitch.ts`。新規画像素材は使わず`Graphics`/`Text`/`Camera`のみで構成。演出終了時のみNo.01夜の `StartingPlaceScene` へ接続する。
- No.01夜の仮配置・色は `src/config/startingPlace.ts` に分離。地面・焚き火はPhase 4の仮表示を維持。Phase 5では単色のDEV_PLACEHOLDERを追加し、正式主人公素材と台詞はTBDのままとする。
- 移動は仮の連続4方向・60px/秒。`src/config/player.ts`でサイズと速度を調整する。同時押しは縦優先、逆方向は相殺。焚き火・地面より上・画面端には進入できない。
- Phase 6: マップ間の出口/入口/spawnは `src/config/maps.ts` に集約。座標判定はScene側に直書きせず、`src/systems/MapTransition.ts` の共通ヘルパー(入力ロック→暗転→Scene切替)を通す。No.02は `src/scenes/StartingTownScene.ts` / `src/config/startingTown.ts`。
- Phase 7: NPC + 会話。`src/systems/Interaction.ts`(Phaser非依存の正面判定) / `src/data/dialogues.ts`(会話データ分離) / `src/ui/DialogueBox.ts`(下部会話ウィンドウ)。会話中はPlayer.update()を呼ばず移動を止め、`consumePressed`で入力の二重消費を防ぐ。DEV_PLACEHOLDER_NPC/DEV_PLACEHOLDER_DIALOGUEのみで正式台詞は未着手。
- Phase 8-A: No.02外観。建物6棟(`src/config/maps.ts`の`MapDefinition.buildings`、`src/entities/Building.ts`、`src/config/building.ts`)を外観+Collisionのみ配置。`interiorId`で`assets/maps/data/no02_start_town_interiors.json`と対応させるが、実際の内部遷移は未実装(Phase 8-B)。正式NPC人数・会話は`NPC_SPEC.md`で再検討中。（`Building.ts`/`config/building.ts`と6棟目「民家B」は2026-09-19の画像マップ移行でSUPERSEDED。現在は`MAP_FLOW_SPEC.md`§4.9を参照）
- Phase 8-B: No.02建物内部＋出入り。共通`src/scenes/InteriorScene.ts`が`src/config/interiors.ts`の`interiorId`をキーに6室のDEV_PLACEHOLDER_INTERIORを構築。`Building.ts`の`computeWallSegments`でドア位置だけ通行可能なCollisionに分割し、`maps.ts`に追加した`frontSpawnId`で退出時に正しい建物前へ戻す。`MapTransition.ts`の`beginMapTransition`は`data: Record<string,string>`を渡す形に一般化。店・宿泊・教会機能、内部NPC・大規模会話は未実装。（壁Collisionの計算方式は2026-09-19に背景画像のCollision Maskへ置き換え、部屋数は5室へ変更。`InteriorScene`自体・出入りの流れは無変更）
- Phase 8.5: フィールド導入＋主人公追従カメラ。序盤導線をNo.01⇔No.02直接接続からNo.01⇔`FieldScene`(仮mapId`field_starting_region`)⇔No.02へ変更(旧直接接続はSUPERSEDED)。フィールドのサイズ・地形は`src/config/field.ts`に分離(960×720より大きい仮値)。新規`src/systems/MapCamera.ts`の`configureMapCamera`がCamera bounds設定+即時追従(lerp=1)+roundPixelsを担当し、`Player.ts`にはカメラ処理を追加していない。No.01/No.02側は`maps.ts`のspawn/exitキーをリネームしただけで、Scene本体は無変更。
- Phase 8.6: Phase 8.6では既存世界地図REFERENCEを背景にしたROUGH_FIELDを追加。内部960×720、Field 1920×1440、180px/秒、即時追従CameraとMapTransitionを維持。No.01／No.02の位置はDEV_PLACEHOLDER_WORLD_POSITIONで、南西の橋を通る徒歩往復を確認。建物退出直後の再入場を再現し、6棟の帰還座標だけを修正。正式地理・正式Collision・Tiled・Phase 9は未着手。詳細: `PHASE8_6_ROUGH_FIELD.md`。
- `npm test`: 入力処理・メニュー構成・異常演出ステージ設定・4方向移動・マップ遷移設定・NPC/会話/正面判定・建物配置・建物内部・フィールド/カメラのテスト。
- `npm run build`: 型チェックと本番ビルド。出力先は `dist/`。
- `npm run preview`: 本番ビルドを `http://127.0.0.1:4173/` で確認。

詳しい範囲・構成・検証結果は [Phase 1起動基盤](docs/PHASE1_BOOTSTRAP.md) / [Phase 2タイトル画面](docs/PHASE2_TITLE.md) / [Phase 3冒頭異常演出](docs/PHASE3_OPENING_GLITCH.md) / [Phase 4 No.01夜表示](docs/PHASE4_STARTING_PLACE.md) / [Phase 5 歩行・当たり判定](docs/PHASE5_PLAYER_MOVEMENT.md) / [Phase 5.5 ビジュアル基準](docs/PHASE5_5_VISUAL_BASELINE.md) / [Phase 6 マップ遷移](docs/PHASE6_MAP_TRANSITIONS.md) / [Phase 7 NPC+会話](docs/PHASE7_NPC_DIALOGUE.md) / [Phase 8-A No.02外観](docs/PHASE8A_STARTING_TOWN_EXTERIOR.md) / [Phase 8-B No.02建物内部＋出入り](docs/PHASE8B_STARTING_TOWN_INTERIORS.md) / [Phase 8.5 フィールド＋追従カメラ](docs/PHASE8_5_FIELD_CAMERA.md) / [Phase 8.6 荒フィールド](docs/PHASE8_6_ROUGH_FIELD.md) を参照。

## 現在の正式方針
- 目標プレイ時間: **初見約4時間30分 / 寄り道込み約5時間30分**
- 主要パーティ: 主人公・タロサ・ミレイ
- 主人公: **男性 / 別のモンスタークエスト作品・別バージョン世界の元NPC**
- わたべ: 特殊参加 / 終盤重要人物
- モンスター: 全25体
- ジャンカード: 全45枚 / 1回ジャンコイン1枚 / No.01→45の固定順 / ダブりなし / ランダムではない
- ジャンカードは本編攻略必須ではない独立サブゲーム
- 実装中心: Phaser 3 / Phaser Game Agent
- メイン実装: Claude Code
- レビュー / デバッグ / QA: Codex
- Astraは基本システム安定後の量産フェーズから必要に応じて使用
- ASRSは使用しない
- Webブラウザ / iPhone Safariを主要ターゲットとして扱う
- 制作目安: 80% AI + 20% 人間の視覚・テンポ調整

## 正式マップ番号
2026-09-11以降、採用済み地域は **No.01〜No.20** を正式番号とする。

- No.01 はじまりのばしょ
- No.02 はじまりのまち
- No.03 ビーエのむら
- No.04 レインランドのまち
- No.05 レインランドじょう
- No.06 ザボンのむら
- No.07 いしのむら
- No.08 まじんのどうくつ
- No.09 かくれざと
- No.10 みずうみの古城
- No.11 いわやまのどうくつ
- No.12 港町ダコハ
- No.13 コタンカイムの洞窟
- No.14 ポサロ城
- No.15 ふっかつのほこら
- No.16 デーマスの塔
- No.17 ぬまちのどうくつ
- No.18 バトラスのとりで
- No.19 オロチのしろ
- No.20 最終地点

旧No.18「はじまりのばしょ」等の旧番号は使用しない。

## 現在の重点: 始まりを濃くする
最新オープニング:

**タイトル → はじめから → 約5秒の短い制御された異常 → No.01「はじまりのばしょ」夜版 → 焚き火で主人公が目覚める → 昼版／次導線 → No.02「はじまりのまち」 → ワールドマップ目的地選択**

固定ルール:
- 開始直後の偽「ぼうけんのしょが きえました」は使わない
- 導入の異常は短い伏線に限定
- 本格的な世界崩壊は終盤
- プレイヤーへ直接メタ会話しない
- 子どもには普通のRPGとして理解でき、大人には別世界・複数バージョン混線を考察できる二重構造

詳細: `docs/OPENING_SPEC.md`

## 主人公の最新設定
- 男性
- 別作品／別バージョン世界にいた元NPC
- 最初から選ばれた勇者ではない
- 世界間の異常でMQ0へ迷い込む
- 自分の出自を序盤では理解していない
- エレキテル採用

旧女性勇者風主人公と旧 `hero_walk.png` は現行主人公として使用しない。

## 世界の裏構造
Monster Quest 0には、異なるモンスタークエスト作品／バージョン由来のボス・モンスター・要素が混在する。
内部的には、**複数の世界／バージョンの断片が混ざった世界**として整理する。
ただし序盤からこの仕組みを直接説明しない。

## マップ最新方針
- 全体ワールドマップ・主要地域配置・大枠は変更しない
- ワールドマップは目的地ポイントを選択する方式。主人公が巨大なフィールド全体を徒歩横断する方式は新規制作しない
- 町・村・城・ダンジョン等、実際に歩くローカルマップは高解像度背景画像 + 生成済みCollision方式を使う
- `BACKGROUND` / `COLLISION` / `EVENT` / `OBJECT` の4レイヤーで管理し、背景画像を最上位の正本とする
- Tiledは既存実装・legacy / referenceとして残すが、新規マップの正本にはしない
- 町・村・城内部は旧案よりコンパクト化
- ダンジョン内部も旧案よりコンパクト化
- NPC人数は縮小後マップと地域の役割から再調整
- No.01「はじまりのばしょ」は夜版 / 昼版の2種類
- No.02「はじまりのまち」は内部マップ設計データもGitHubで管理する

## 今の開発段階
Phaserの起動・表示・キー入力基盤、タイトル画面、冒頭約5秒異常演出、No.01夜のPLACEHOLDER表示とDEV_PLACEHOLDERの歩行・当たり判定を追加済み。本編は仕様・素材整理とマップ設計の段階。

今後の本編実装目標（今回のPhase 5.5には含めない）:

**No.01夜 → 主人公歩行 → No.02はじまりのまち → ワールドマップ目的地選択 → ザコ戦 → レベルアップ → 小ダンジョン → ボス → セーブ / ロード → iPhone Safari確認**

## 制作思想
全編を同じ密度で過剰に作り込まない。
特に丁寧にするのは、**物語の始まり、主要人物が交差する場面、「もういちど」以降、終盤 / エンディング**。

元設定・原資料をAI独自案より優先し、Monster Quest 0独自採用と原作確定情報を混同しない。

## NPC制作
会話原案あり:
- No.02 はじまりのまち
- No.03 ビーエのむら
- No.04 レインランドのまち
- No.05 レインランドじょう
- No.06 ザボンのむら

旧大人数案をそのまま実装せず、コンパクト化した各地域へ必要なNPCだけ選抜・統合する。

## ゲーム内容の主要SPEC
- `docs/PROJECT_STATUS.md` — 最新状態の最優先スナップショット
- `docs/OPENING_SPEC.md` — 導入
- `docs/STORY_FLOW.md` — 物語全体
- `docs/MAP_FLOW_SPEC.md` — No.01〜20正式マップ番号
- `docs/MAP_SYSTEM.md` — 背景画像正本 / Collision生成 / 4レイヤー / ワールドマップ
- `docs/NPC_SPEC.md` — NPC / 会話
- `docs/BATTLE_SPEC.md` — 戦闘
- `docs/CHARACTER_GROWTH.md` — 成長
- `docs/MONSTER_SPEC.md` — 25体モンスター
- `docs/ITEM_EQUIPMENT_SPEC.md` — アイテム / 装備
- `docs/CARD_SPEC.md` — ジャンカード45枚
- `docs/AUDIO_SPEC.md` — BGM / SE
- `docs/SAVE_FLAG_SPEC.md` — セーブ / フラグ
- `docs/UI_INPUT_SPEC.md` — UI / iPhone入力
- `docs/GLITCH_SPEC.md` — 異常演出

## AI作業開始時
まず `docs/INDEX.md` と `docs/PROJECT_STATUS.md` を読む。
Claude Codeは `CLAUDE.md`、Codex等は `AGENTS.md` も読む。

## 古い仕様の扱い
現行仕様として使わない:
- 約1時間プレイ
- ジャンカード20枚 / 40枚
- RPGJS中心
- ASRS利用
- 「ふっかつのじゅもん」
- 起動直後の偽セーブ消失
- 旧女性勇者風主人公
- 「導入には一切異常を使わない」旧方針
- 旧マップ番号
- ジャンカードの秘密を序盤から本編NPCが前面に出す旧案

矛盾時は、日付が新しいユーザー確定仕様 → `PROJECT_STATUS.md` → 各最新SPEC → 実装コード → 古い試作の順で判断する。
