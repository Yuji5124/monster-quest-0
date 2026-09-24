# モンスタークエスト0 コンテンツ進捗表

最終更新: 2026-09-24 JST

> **2026-09-24 同期済み:** 地域表は最新の正式No.01〜20・表示名・実装状態へ更新した。本文に残るPhase 8.6 / Tiled / ROUGH_FIELDの記録は履歴であり、`PLAY_ORDER_SPEC.md`、`MAP_FLOW_SPEC.md`、`STORY_FLOW.md`と衝突する仕様には使わない。内部`mapId`は互換のため残す。

> 2026-09-18以降、新規ローカルマップの正式方針は `MAP_SYSTEM.md`（背景画像正本 + Collision / Event / Object）である。本表にあるTiled / ROUGH_FIELD / FieldSceneの項目は既存実装の進捗記録として保持し、新規制作の標準とはしない。

## Phase 8.6 既存到達点（legacy prototype）
Phase 8.6では既存世界地図REFERENCEを背景にしたROUGH_FIELDを追加。内部960×720、Field 1920×1440、180px/秒、即時追従CameraとMapTransitionを維持。No.01／No.02の位置はDEV_PLACEHOLDER_WORLD_POSITIONで、南西の橋を通る徒歩往復を確認。建物退出直後の再入場を再現し、6棟の帰還座標だけを修正。正式地理・正式Collision・Tiled・Phase 9は未着手。詳細: `PHASE8_6_ROUGH_FIELD.md`。

この表は「設定済み」「会話原案あり」「素材制作済み」「GitHub配置済み」「Phaser実装済み」を混同しないための進捗管理表。

## ステータス定義
- `CONFIRMED`: 設定確定
- `DIALOGUE_DRAFT`: 会話原案あり。実装人数・台詞は再編集対象を含む
- `DIALOGUE_READY`: 実装用会話として再編集済み
- `ASSET_READY`: ChatGPT等で素材制作済み
- `IN_DESKTOP`: デスクトップ正本の正式パスへ配置済み
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
| 01 | **はじまりのばしょ** | **CONFIRMED** | 0 | PARTIAL: 夜版・焚き火導入・歩行・世界地図出口。昼版／次導線はTBD | No.01の通常NPCは置かない |
| 02 | はじまりのまち | CONFIRMED | DIALOGUE_DRAFT（7人） | PARTIAL: CURRENT背景、建物5棟・内部5室、世界地図接続、村人7人 | 店／宿／教会機能、正式会話はTBD |
| 03 | ビーエのもり | CONFIRMED | - | PARTIAL: 背景、ランダム戦闘、宝箱、えりまきとかげ、タロサの一度限りの到着会話 | タロサ加入ではない |
| 04 | ビーエのむら | CONFIRMED | DIALOGUE_DRAFT（目安6人） | PARTIAL: 背景、Collision、北門、入場演出、小さな景観異常 | 木こりイベント・正式会話はTBD |
| 05 | レインランドのもり | CONFIRMED | - | PARTIAL: 2画面の画像マップ、世界地図接続、ランダム戦闘 | NPC・BGM・No.06への本編接続はTBD |
| 06 | レインランドじょうかまち／レインランドじょう | CONFIRMED | DIALOGUE_DRAFT（町8／城7目安） | PARTIAL: 城下町、城、王の間、2D／3D切替を実装 | 王への正式報告・正式NPC会話はTBD |
| 07 | まじんのどうくつ | CONFIRMED | - | PARTIAL: 10層ターン制Dungeon RPG | 正式解放・攻略手段・BGMはTBD。`map_08_majin_cave`は互換ID |
| 08 | ザボンのむら | CONFIRMED | DIALOGUE_DRAFT（目安6人） | PARTIAL: 背景、Collision、世界地図接続、入場演出 | タロサ関係イベント・NPC・内部はTBD |
| 09 | いわやまのどうくつ | CONFIRMED | - | PARTIAL: 2フロア、ランダム戦闘、縦スクロール（見下ろし型）崩落シューティング | タロサ一時参加／正式同行、ボスはTBD |
| 10 | かくれざと | CONFIRMED | PROVISIONAL | PARTIAL: 背景、Collision、世界地図接続 | 住民5人 + ミレイが最新目安。現行仮住民8人・ミレイイベントは未確定 |
| 11 | みずうみの古城 | CONFIRMED | - | 未実装 | ミレイ正式同行 |
| 12 | 港町ダコハ | CONFIRMED | 未作成（目安7人） | 未実装 | 港・交易 |
| 13 | コタンカイムの洞窟 | CONFIRMED | - | 未実装 | ゆうしゃのたて |
| 14 | ポサロ城 | CONFIRMED | 未作成（目安4人） | 未実装 | バクラー戦・ゆうしゃのけん |
| 15 | ふっかつのほこら | CONFIRMED | 未作成（目安2人） | 未実装 | ゆうしゃのかんむり・薄い反射ヒント |
| 16 | デーマスのとう | CONFIRMED | - | DEV戦闘のみ | ミラー反射本戦 |
| 17 | ぬまちのどうくつ | CONFIRMED | - | 未実装 | 小型敵多数のアクション |
| 18 | いしのまち | CONFIRMED | 未作成（目安7人） | 未実装 | 旧「いしのむら」はSUPERSEDED |
| 19 | バトラスのとりで | CONFIRMED | - | 未実装 | タロサの毒の矢 |
| 20 | オロチへの道／オロチのしろ／最終地点 | CONFIRMED | - | 未実装 | 縦シューティング→コマンドRPG。裏ボスは公開時伏せる |

## 主要キャラクター
| キャラクター | 設定 | 歩行素材 | デスクトップ配置 | 実装 |
|---|---|---|---|---|
| **主人公** | **CONFIRMED: 男性 / 別世界NPC出身** | **CURRENT(2026-09-19、`protagonist_walk.png`) / 旧女性素材SUPERSEDED** | 配置済み | 歩行のみ実装(`Player.ts`) |
| タロサ | CONFIRMED | CURRENT(2026-09-19、`tarosa_walk.png`) | 配置済み | 歩行followerのみ実装(`PartyFollowers.ts`) |
| ミレイ | CONFIRMED | CURRENT(2026-09-19、`mirei_walk.png`) | 配置済み | 歩行followerのみ実装(`PartyFollowers.ts`) |
| わたべ | CONFIRMED | ASSET_READY | 要ASSET_INDEX確認 | 未実装 |
| NPC基本10体 | CONFIRMED | CURRENT（`villager_{01..10}_walk.png`） | IN_DESKTOP | No.02・No.10で利用中。No.10の配置と会話は仮 |

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
- 1回20円
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
| オープニング（No.01焚き火導入） | **最新仕様あり** | PARTIAL: タイトル→5秒の制御済み起動ノイズ→StartingPlaceSceneの`openingSequence`。黒→焚き火の明転→6行ナレーション→主人公の無言→環境音だけで入力解放 | PC確認済み。iPhone実機・昼版は未確認／未実装 |
| はじまりのばしょ夜／昼 | **仕様あり** | PARTIAL: 夜の仮表示と歩行のみ。昼版未実装 | Chrome表示・衝突確認 |
| フィールド歩行 | 最終方式TBD | PARTIAL: No.01内のDEV_PLACEHOLDERで4方向移動・Arcade Physics | 入力・停止・同時押し・壁抜け・再入場確認 |
| 地域間マップ遷移 | ポイント選択式ワールドマップ | PARTIAL: `WorldMapScene`と画像マップのworld-map Eventで実装。`FieldScene`はlegacy | 自動テストあり。実解放順とiPhone実機はTBD |
| フィールド(legacy) | 新規制作には使用しない | PARTIAL: `field_starting_region`を互換・回帰確認用に保持 | 新規正本ではない |
| NPC会話 | 仕様あり / 再編集中 | PARTIAL: 会話システム基盤に加え、No.02は村人7人（固定店主4／歩行住民3）の素材・配置・短い初稿会話を実装。他地域の正式NPC・会話は未着手 | 自動テスト＋No.02ブラウザ表示確認（2026-09-23） |
| 建物内部＋出入り(No.02) | 内部機能TBD | PARTIAL: 共通InteriorScene+interiorIdデータ駆動により5室(DEV_PLACEHOLDER_INTERIOR、2026-09-19に6→5室へ縮小)の入退室を実装。店/宿/教会機能・内部NPCは未実装 | 自動テスト / ブラウザ実機で入口→内部→退出→建物前復帰を確認済み(2026-09-19) |
| EventSystem | 仕様あり | PARTIAL: 会話、宝箱、戦闘、転送は個別実装。統一ランナーは未実装 | 自動テストあり |
| ランダムエンカウント | 仕様あり | PARTIAL: No.03／No.05／No.09で距離ベース抽選。値・地域拡張はTBD | 自動テストあり |
| コマンド戦闘 | 仕様あり | PARTIAL: 1〜3人パーティ、EXP、毒、だいヒットを実装 | 全地域・全ボス・iPhone実機は未完 |
| レベルアップ／魔法／アイテム | 仕様あり / 一部数値TBD | PARTIAL: 成長、戦利品、主要魔法、アイテム基盤を実装 | 装備UI等は未実装 |
| セーブ / ロード | 仕様あり | PARTIAL: `GameStateRepository`で進捗・パーティ・所持品・フラグを保存 | 完全なSaveSystem・ロードUIは未完 |
| ジャンカード | 仕様あり | PARTIAL: ガチャ／図鑑／固定順の基盤あり | 本番コイン入手導線・全内容確認は未完 |
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
