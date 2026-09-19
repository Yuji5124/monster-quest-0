# モンスタークエスト0 コンテンツ進捗表

最終更新: 2026-09-19 JST

> 2026-09-18以降、新規ローカルマップの正式方針は `MAP_SYSTEM.md`（背景画像正本 + Collision / Event / Object）である。本表にあるTiled / ROUGH_FIELD / FieldSceneの項目は既存実装の進捗記録として保持し、新規制作の標準とはしない。

## Phase 8.6 既存到達点（legacy prototype）
Phase 8.6では既存世界地図REFERENCEを背景にしたROUGH_FIELDを追加。内部960×720、Field 1920×1440、180px/秒、即時追従CameraとMapTransitionを維持。No.01／No.02の位置はDEV_PLACEHOLDER_WORLD_POSITIONで、南西の橋を通る徒歩往復を確認。建物退出直後の再入場を再現し、6棟の帰還座標だけを修正。正式地理・正式Collision・Tiled・Phase 9は未着手。詳細: `PHASE8_6_ROUGH_FIELD.md`。

この表は「設定済み」「会話原案あり」「素材制作済み」「GitHub配置済み」「Phaser実装済み」を混同しないための進捗管理表。

## ステータス定義
- `CONFIRMED`: 設定確定
- `DIALOGUE_DRAFT`: 会話原案あり。実装人数・台詞は再編集対象を含む
- `DIALOGUE_READY`: 実装用会話として再編集済み
- `ASSET_READY`: ChatGPT等で素材制作済み
- `IN_GITHUB`: 正式パスへ配置済み
- `SUPERSEDED`: 旧仕様により現行実装へ使用しない
- `IMPLEMENTED`: Phaser実装済み
- `PLAYTESTED`: 実機 / ブラウザで確認済み
- `TBD`: 未確定

## 最新スコープ方針
- 目標プレイ時間: **初見約4時間30分 / 寄り道込み約5時間30分**
- 全体ワールドマップ・主要地域配置は維持
- 採用済み全地域は **No.01〜No.20** の正式管理番号へ再整理済み
- 町・村・城内部は旧案よりコンパクト化
- ダンジョン内部も旧案よりコンパクト化
- NPC人数は地域の役割と縮小後マップに合わせて再編集
- **始まりだけは通常区間より演出密度を高くする**
- 導入: 暗闇 → No.01「はじまりのばしょ」夜版の焚き火明転 → ナレーション → 操作解放
- 開始直後の偽セーブ消失は使わない

## 地域
| No. | 地域 | 設定 | NPC会話 | Phaser実装 | 備考 |
|---:|---|---|---|---|---|
| 01 | **はじまりのばしょ** | **CONFIRMED** | - | PARTIAL: 夜の仮表示・DEV_PLACEHOLDER歩行/衝突。Phase 8.5でNo.02への導線をフィールド(仮)経由へ変更 | **Phase 5。正式素材・会話・昼版は未実装** |
| 02 | はじまりのまち | CONFIRMED | DIALOGUE_DRAFT | PARTIAL: 2026-09-19にCURRENT背景画像方式(`StartingTownScene`、No.01と同じBACKGROUND/COLLISION/EVENT/OBJECT)へ移行。建物5棟(reference画像に実在する数へ6→5縮小、やどや/どうぐや/ぶきや/きょうかい/民家A)の外観+Collision・NPC5体(DEV_PLACEHOLDER)・パーティ加入・戦闘イベント・建物内部5室(InteriorScene、出入りあり)・西端でWorldMapSceneへ接続、まで実装。店/宿/教会機能・正式NPC・正式会話は未実装 | 会話原案あり。人数・配置はNPC_SPEC.mdで再検討中 |
| 03 | ビーエのむら | CONFIRMED | DIALOGUE_DRAFT | PARTIAL: No.01と同じ画像マップ方式(`BieVillageScene`)で背景+Collision+北門Event+WorldMapScene接続まで実装。unlockFlagは実フラグ(`story.bie_village_unlocked`)で、SaveSystem未接続の間は`developmentUnlockedFlags`を暫定の解放状態として本番でも使い、世界地図から出入りできる(2026-09-19)。NPC・木こり救出イベント・ランダムエンカウントは未実装(会話原案が人数未確定のDIALOGUE_DRAFTのため) | 木こり救出事件あり。縮小後マップに合わせ再編集 |
| 04 | レインランドのまち | CONFIRMED | DIALOGUE_DRAFT | 未実装 | 王家・ミレイ等の伏線あり |
| 05 | レインランドじょう | CONFIRMED | DIALOGUE_DRAFT | PARTIAL(2026-09-20、正式背景・仮NPC5人) | 王家・政治の中心 |
| 06 | ザボンのむら | CONFIRMED | DIALOGUE_DRAFT | 未実装 | タロサ関連。ただし全員をタロサ話題にしない |
| 07 | いしのむら | CONFIRMED | 未作成 | 未実装 | 石・岩の個性 |
| 08 | まじんのどうくつ | CONFIRMED | - | 未実装 | ダンジョン |
| 09 | かくれざと | CONFIRMED | 未作成 | 未実装 | 閉鎖性・秘密性 |
| 10 | みずうみの古城 | CONFIRMED | - | 未実装 | ダンジョン |
| 11 | いわやまのどうくつ | CONFIRMED | - | 未実装 | ダンジョン |
| 12 | 港町ダコハ | CONFIRMED | 未作成 | 未実装 | 港・交易 |
| 13 | コタンカイムの洞窟 | CONFIRMED | - | 未実装 | 採用済み追加ダンジョン。正式番号へ統合 |
| 14 | ポサロ城 | CONFIRMED | 未作成 | 未実装 | 採用済み追加拠点。正式番号へ統合 |
| 15 | ふっかつのほこら | CONFIRMED | 未作成 | 未実装 | 重要拠点 |
| 16 | デーマスの塔 | CONFIRMED | - | 未実装 | 勇者装備が必要、デーマス戦 |
| 17 | ぬまちのどうくつ | CONFIRMED | - | 未実装 | 終盤へ向かうダンジョン |
| 18 | バトラスのとりで | CONFIRMED | - | 未実装 | 終盤 |
| 19 | オロチのしろ | CONFIRMED | - | 未実装 | 終盤 |
| 20 | 最終地点 | CONFIRMED | - | 未実装 | 内部名オロチゾンビのま、公開ネタバレ注意 |

追加フィールド（正式No.01〜No.20の番号なし、`MAP_FLOW_SPEC.md` §4.7 / §4.10）:
- はじまりのもり: PARTIAL。画像マップ＋ランダムエンカウント(DEV_BATTLE_BALANCE)。
- レインランドのもり（その1・その2）: PARTIAL（2026-09-19）。画像マップ2画面(`RainlandForest1Scene`/`RainlandForest2Scene`)＋その1⇄その2の接続＋世界地図接続まで実装。NPC・出現モンスター・正式名称・レインランド方面との正式接続は未実装/TBD。
- レインランドじょうかまち: PARTIAL（2026-09-19）。俯瞰の町マップ(`RainlandCastleTownScene`)＋世界地図接続＋世界地図から入るときの5秒の入場演出(`MapSplashScene`)まで実装。No.04「レインランドのまち」との対応・北の城門は2026-09-20にNo.05レインランドじょうへ接続済み(`MAP_FLOW_SPEC.md` §4.13)。NPC・店・建物内部は未実装/TBD。

## 主要キャラクター
| キャラクター | 設定 | 歩行素材 | GitHub配置 | 実装 |
|---|---|---|---|---|
| **主人公** | **CONFIRMED: 男性 / 別世界NPC出身** | **CURRENT(2026-09-19、`protagonist_walk.png`) / 旧女性素材SUPERSEDED** | 配置済み | 歩行のみ実装(`Player.ts`) |
| タロサ | CONFIRMED | CURRENT(2026-09-19、`tarosa_walk.png`) | 配置済み | 歩行followerのみ実装(`PartyFollowers.ts`) |
| ミレイ | CONFIRMED | CURRENT(2026-09-19、`mirei_walk.png`) | 配置済み | 歩行followerのみ実装(`PartyFollowers.ts`) |
| わたべ | CONFIRMED | ASSET_READY | 要ASSET_INDEX確認 | 未実装 |
| NPC基本10体 | CONFIRMED | ASSET_READY | 要ASSET_INDEX確認 | 未実装 |

## オープニング
| 要素 | 状態 | 備考 |
|---|---|---|
| No.01焚き火導入 | CONFIRMED | 0:00暗闇、0:02〜0:07明転、ナレーション、BGMなしで操作解放 |
| No.01 はじまりのばしょ 夜 | CONFIRMED | 焚き火で目覚める |
| No.01 はじまりのばしょ 昼 | CONFIRMED | 切替条件TBD |
| 直接メタ会話なし | CONFIRMED | 子どもは普通のRPGとして理解できる |
| 主人公の別世界由来 | CONFIRMED | 序盤では直接説明しない |
| 偽セーブ消失 | 不採用 | 開始直後には使わない |

## ゲーム内容SPEC
| 内容 | 仕様 |
|---|---|
| ストーリー全体 | `STORY_FLOW.md` |
| オープニング | `OPENING_SPEC.md` |
| マップ進行 | `MAP_FLOW_SPEC.md` |
| 戦闘 | `BATTLE_SPEC.md` |
| キャラクター成長 | `CHARACTER_GROWTH.md` |
| モンスター | `MONSTER_SPEC.md` |
| アイテム / 装備 | `ITEM_EQUIPMENT_SPEC.md` |
| BGM / SE | `AUDIO_SPEC.md` |
| セーブ / フラグ | `SAVE_FLAG_SPEC.md` |
| UI / 入力 | `UI_INPUT_SPEC.md` |

## モンスター
- 総数: 25体
- ゲーム用素材セット: ASSET_READY
- 個別のGitHub配置状況は `ASSET_INDEX.md` / `asset_catalog.json` を正とする
- 公開用一覧では重大な終盤ネタバレを伏せる
- 未確定戦闘数値は `TBD_REGISTRY.md` に従う

## ジャンカード
- 総数: 45枚
- 1回ジャンコイン1枚
- No.01→No.45の固定順
- ランダムではない
- ダブりなし
- 本編攻略必須ではない
- データ化・Phaser実装: 未実装

## 戦闘背景
以下は制作済みとして管理:
- 草原
- 森
- 森 別案
- 洞窟
- 城 / 城下町周辺
- 雪原
- 砂漠 / 遺跡
- ダンジョン
- ダンジョン 別案
- ボス戦
- ボス戦 別案

GitHub実ファイル状態は `ASSET_INDEX.md` を確認する。

## 基本システム
| システム | 仕様 | Phaser実装 | QA |
|---|---|---|---|
| Phaser起動基盤 | Phase 1限定 | IMPLEMENTED: BootSceneからTitleSceneへ起動 | PC起動 / 型チェック / ビルド確認 |
| 解像度・画面追従 | 正式値TBD | 仮960×720(旧320×240の3倍,4:3) / FIT | PC表示確認 / iPhone実機未確認 |
| キー入力基盤 | 共通action / 配列は仮 | IMPLEMENTED: InputSystem | 単体5件 / PCキー操作確認 |
| タイトル | CONFIRMED | IMPLEMENTED: TitleScene（ロゴ + 6項目メニュー選択/決定。はじめからのみ冒頭演出へ接続） | PC起動 / 型チェック / ビルド / リサイズ確認 |
| オープニング（No.01焚き火導入） | **最新仕様あり** | IMPLEMENTED: タイトル→StartingPlaceSceneの`openingSequence`。黒→焚き火の明転→6行ナレーション→主人公の無言→環境音だけで入力解放 | PC起動 / 型チェック / ビルド / タイミング・入力・音確認 |
| はじまりのばしょ夜／昼 | **仕様あり** | PARTIAL: 夜の仮表示と歩行のみ。昼版未実装 | Chrome表示・衝突確認 |
| フィールド歩行 | 最終方式TBD | PARTIAL: No.01内のDEV_PLACEHOLDERで4方向移動・Arcade Physics | 入力・停止・同時押し・壁抜け・再入場確認 |
| マップ遷移(No.01⇔フィールド⇔No.02) | 出入口座標TBD | PARTIAL: config駆動のexit/spawnでDEV_PLACEHOLDER往復。Phase 8.5でNo.01⇔No.02の直接接続をSUPERSEDEDにし、フィールド(仮)経由へ変更。No.02正式内容は未実装 | 自動テスト20件+13件(Phase 8.5) / Chrome・Edge実機で往復確認済み(Phase 6.1、旧経路) |
| フィールド(仮、No.01-No.02間) | 正式名称・地形TBD | PARTIAL: Phase 8.5でDEV_PLACEHOLDER_FIELD(仮mapId `field_starting_region`)を追加。960×720より大きい仮空間+主人公追従Camera+仮Collision(山/水辺) | 自動テスト13件 / ブラウザ実機は今回未完了(Scene状態検証+実キーイベントで代替) |
| NPC会話 | 仕様あり / 再編集中 | PARTIAL: DEV_PLACEHOLDER_NPC1体+DEV_PLACEHOLDER_DIALOGUEで会話システム基盤のみ実装。正式NPC/台詞は未着手 | 自動テスト10件 / ブラウザ実機は今回未完了(下記参照) |
| 建物内部＋出入り(No.02) | 内部機能TBD | PARTIAL: 共通InteriorScene+interiorIdデータ駆動により5室(DEV_PLACEHOLDER_INTERIOR、2026-09-19に6→5室へ縮小)の入退室を実装。店/宿/教会機能・内部NPCは未実装 | 自動テスト / ブラウザ実機で入口→内部→退出→建物前復帰を確認済み(2026-09-19) |
| EventSystem | 仕様あり | 未実装 | - |
| ランダムエンカウント | 仕様あり | PARTIAL: はじまりのもりのみ。距離ベース抽選(`RandomEncounter.ts`)+地域encounter table(`encounterTables.ts`)、1戦闘1体、戦闘後クールダウンあり。他地域は未実装 | 自動テスト(distance/roll/table/monster解決)+ブラウザ実機(`?mapTest=starting-forest`)で確認 |
| コマンド戦闘 | 仕様あり | 未実装 | - |
| レベルアップ | 仕様あり / 数値TBD | 未実装 | - |
| 魔法 | 主要名称確定 / 数値TBD | 未実装 | - |
| アイテム / 装備 | 主要名称確定 / 数値TBD | 未実装 | - |
| セーブ / ロード | 仕様あり | 未実装 | - |
| ジャンカード | 仕様あり | 未実装 | - |
| 終盤異常演出 | 仕様あり | 未実装 | - |
| iPhone操作 | 仕様あり | 未実装 | - |

## 次に更新するタイミング
- 最新男性主人公のデザイン／歩行素材が確定したとき
- はじまりのばしょ夜／昼の最終マップ構成を決めたとき
- オープニングの台詞／音／演出を確定したとき
- NPC会話を小規模版へ再編集したとき
- PNGを正式パスへ入れたとき
- Phaser実装が1機能完了したとき
- Playtestを通したとき

AIは実態を確認せずステータスを上げない。
