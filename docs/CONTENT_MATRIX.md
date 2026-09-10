# モンスタークエスト0 コンテンツ進捗表

最終更新: 2026-09-10 23:46 JST

この表は「設定済み」「会話設計済み」「素材制作済み」「GitHub配置済み」「Phaser実装済み」を混同しないための進捗管理表。

## ステータス定義
- `CONFIRMED`: 設定確定
- `DIALOGUE_READY`: NPC会話設計済み
- `ASSET_READY`: ChatGPT等で素材制作済み
- `IN_GITHUB`: 正式パスへ配置済み
- `IMPLEMENTED`: Phaser実装済み
- `PLAYTESTED`: 実機 / ブラウザで確認済み
- `TBD`: 未確定

## 地域
| 地域 | 設定 | NPC会話 | Phaser実装 | 備考 |
|---|---|---|---|---|
| はじまりのまち | CONFIRMED | DIALOGUE_READY | 未実装 | NPC12人、外出後変化まで |
| ビーエのむら | CONFIRMED | DIALOGUE_READY | 未実装 | NPC15人、木こり救出事件 |
| レインランドのまち | CONFIRMED | DIALOGUE_READY | 未実装 | NPC20人、王家・ミレイ等の伏線 |
| レインランドじょう | CONFIRMED | 次に制作 | 未実装 | 王家・政治の中心 |
| ザボンのむら | CONFIRMED | 未作成 | 未実装 | タロサ関連 |
| いしのむら | CONFIRMED | 未作成 | 未実装 | 石・岩の個性 |
| まじんのどうくつ | CONFIRMED | - | 未実装 | ダンジョン |
| かくれざと | CONFIRMED | 未作成 | 未実装 | 閉鎖性・秘密性 |
| みずうみの古城 | CONFIRMED | - | 未実装 | ダンジョン |
| いわやまのどうくつ | CONFIRMED | - | 未実装 | ダンジョン |
| 港町ダコハ | CONFIRMED | 未作成 | 未実装 | 港・交易 |
| ふっかつのほこら | CONFIRMED | 未作成 | 未実装 | ほこら |
| デーマスの塔 | CONFIRMED | - | 未実装 | 勇者装備が必要 |
| ぬまちのどうくつ | CONFIRMED | - | 未実装 | ダンジョン |
| バトラスのとりで | CONFIRMED | - | 未実装 | 終盤 |
| オロチのしろ | CONFIRMED | - | 未実装 | 終盤 |
| 最終地点 | CONFIRMED | - | 未実装 | 公開ネタバレ注意 |
| ポサロ城 | CONFIRMED | 未作成 | 未実装 | 追加拠点 |
| コタンカイムの洞窟 | CONFIRMED | - | 未実装 | 追加ダンジョン |

## 主要キャラクター
| キャラクター | 設定 | 歩行素材 | GitHub配置 | 実装 |
|---|---|---|---|---|
| 主人公 | CONFIRMED | ASSET_READY | 要ASSET_INDEX確認 | 未実装 |
| タロサ | CONFIRMED | ASSET_READY | 要ASSET_INDEX確認 | 未実装 |
| ミレイ | CONFIRMED | ASSET_READY | 要ASSET_INDEX確認 | 未実装 |
| わたべ | CONFIRMED | ASSET_READY | 要ASSET_INDEX確認 | 未実装 |
| NPC基本10体 | CONFIRMED | ASSET_READY | 要ASSET_INDEX確認 | 未実装 |

## モンスター
- 総数: 25体
- ゲーム用素材セット: ASSET_READY
- 個別のGitHub配置状況は `ASSET_INDEX.md` / `asset_catalog.json` を正とする
- 公開用一覧では重大な終盤ネタバレを伏せる

## ジャンカード
- 総数: 45枚
- 1回20円
- 固定順
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
| タイトル | CONFIRMED | 未実装 | - |
| フィールド歩行 | 仕様あり | 未実装 | - |
| NPC会話 | 仕様あり | 未実装 | - |
| EventSystem | 仕様あり | 未実装 | - |
| ランダムエンカウント | 仕様あり | 未実装 | - |
| コマンド戦闘 | 仕様あり | 未実装 | - |
| レベルアップ | 仕様あり | 未実装 | - |
| 魔法 | 主要名称確定 | 未実装 | - |
| アイテム / 装備 | 主要名称確定 | 未実装 | - |
| セーブ / ロード | 仕様あり | 未実装 | - |
| ジャンカード | 仕様あり | 未実装 | - |
| 終盤異常演出 | 仕様あり | 未実装 | - |
| iPhone操作 | 仕様あり | 未実装 | - |

## 次に更新するタイミング
- 新しいNPC地域が会話設計済みになったとき
- PNGを正式パスへ入れたとき
- Phaser実装が1機能完了したとき
- Playtestを通したとき

AIは実態を確認せずステータスを上げない。
