# モンスタークエスト0 セーブ・進行フラグ仕様

最終更新: 2026-09-27 JST

このファイルはセーブデータとストーリー進行フラグの責務を整理する正本。JSONの基本構造は `DATA_CONTRACTS.md` に従う。

## 1. 原則
- 実セーブデータを演出目的で削除・破損させない。
- 表示上のバグ演出と保存処理を完全に分離する。
- セーブ形式には `version` を持たせる。
- 後から項目を追加しても旧セーブを可能な範囲で読み込めるようmigrationを用意する。
- Sceneごとに独自LocalStorageキーを乱立させない。
- **「もういちど」はNew Gameではなく、同一冒険の最終章として管理する。**

## 2. セーブ領域
最低限:
```json
{
  "version": 1,
  "player": {},
  "party": [],
  "inventory": {},
  "equipment": {},
  "flags": {},
  "cards": {},
  "map": {},
  "settings": {}
}
```

## 3. 保存対象
### プレイヤー / パーティ
- 現在HP / MP
- レベル
- EXP
- 習得魔法
- 装備
- 加入状態

### 所持品
- 所持金
- 通常アイテム
- 重要アイテム
- 装備品

### マップ
- 現在地
- 向き
- 必要な復帰地点
- 開封済み宝箱
- 一度きりイベント状態

### ジャンカード
- ジャンカード購入に使う所持金
- 取得済みカード
- 取得枚数
- 次回排出番号
- 固定順排出状態

### 設定
- BGM音量
- SE音量
- 必要な操作設定

## 4. フラグ命名
推奨形式:
- `story.*` — 本編進行
- `party.*` — 加入 / 離脱
- `boss.*` — ボス進行
- `event.*` — 一度きりイベント
- `chest.*` — 宝箱
- `world.*` — 世界状態
- `glitch.*` — 異常演出
- `tutorial.*` — 初回説明

例:
- `story.left_start_town_once`
- `party.mirei_joined`
- `party.tarosa_joined`
- `boss.demas_defeated`
- `story.demas_tower_cleared`
- `glitch.phase_1_started`

## 5. 主要進行フラグ
最低限:
- はじまりのまち出発
- ビーエ地域事件開始 / 解決
- レインランド到達
- ミレイ加入
- タロサ加入
- 勇者装備取得状況
- デーマスの塔解放
- デーマス撃破（`boss.demas_defeated`）
- デーマスの塔撃破後状態（`story.demas_tower_cleared`。No.16の3Fボス勝利時に同時保存）
- 終盤突入
- バトラス撃破
- オロチまおう関連進行
- オロチゾンビ1回目開始 / 終了
- 「もういちど」解放 / 選択済み
- No.01再訪状態
- わたべ加入 / 特殊参加
- オロチゾンビ再戦開始 / 真の撃破
- 真エンディング到達
- 真の最終解決後の主人公選択（`ここに のこる`／`もとの せかいへ かえる`）

推奨キー例:
```text
boss.orochi_zombie_first_started
boss.orochi_zombie_first_resolved
glitch.retry_sequence_started
story.mouichido_unlocked
story.mouichido_selected
world.starting_place_second_visit
party.watabe_final_joined
boss.orochi_zombie_rematch_started
boss.orochi_zombie_true_defeated
story.true_ending_reached
```

真の最終解決後の選択は保存対象にする。キーの正確な名称は実装開始時に一度だけ確定するが、既存キーとの混同を避けるため、候補は`ending.route_selected`であり、表示名をキーにしない。残留では主人公が世界の修復とともに徐々に消え、帰還では主人公が一度NPCとして操作不能になった後に自分の意思で歩き出す状態を、再開後も矛盾なく再生できる必要がある。レイはどちらの未来にも生まれるが、誕生までの時系列・父親の詳細は保存仕様へ固定せずTBDとする。分岐条件とイベント粒度はTBD。

実装済みキー（`assets/maps/world_map/destinations.json`の正式No.04ビーエのむら／内部`map_03_bie_village`の`unlockFlag`）:
```text
story.bie_village_unlocked
```
このフラグを実際にtrueへ立てるSaveSystem本体・進行イベントは未実装（TBD_REGISTRY.md参照）。同義のフラグを別名で増やさない。

2026-09-23から、共有`GameStateRepository`の`flags`（true値だけを保存）を一度きりの進行状態に使用する。旧v1セーブに`flags`が無い場合は空として安全に移行する。No.03ビーエのもりでこの境界に初めて保存するキーは次の4つ。

```text
boss.starting_forest_erimaki_tokage_defeated
chest.starting_forest_kaifukuyaku_opened
event.starting_forest_tarosa_hunt_talked
story.rainland_castle_town_unlocked
```

No.09いわやまのどうくつ1Fの崩落シューティング（2026-09-24）は、クリア時に次のキーを保存する。立っていれば赤い丸を表示せず、イベントを再生しない。

```text
event.iwayama_cave_shooting_cleared
```

No.18いしのまち（2026-09-27）は、すべて`event.*`の一度きり／進行フラグで、本編の`story.*`（解放）には触れない。`event.stone_town_entered`だけがコードから直接読み書きされる（`src/config/storyFlags.ts`の`STORY_FLAGS.stoneTownEntered`）。他は`assets/maps/stone_town/objects.json`が参照する。

```text
event.stone_town_entered            # 初回入場の語りを見た（会話を閉じたときに保存）
event.stone_town_gate_examined      # 入口の門番の石像を調べた
event.stone_town_echo_baker         # パンやの石像の「のこった声」を聞いた
event.stone_town_echo_well          # 井戸の女の石像の声を聞いた
event.stone_town_echo_bridge        # 橋を渡る旅人の石像の声を聞いた
event.stone_town_plaza_awakened     # 3つの声を集めて広場の石像が目覚めた（ひび・星の光・一部の石像の文の変化）
event.stone_town_path_opened        # 北の階段をふさぐ石の壁が崩れた（崩れ終わった時点で保存）
event.stone_town_elder_heard        # 上段の老人の石像の声を聞いた
```

`plaza_awakened`と`path_opened`は演出の途中で終了しても矛盾しない（どちらも立っていなければ次の調べで演出をやり直す）。石像を調べるだけの反応（猫・鳩・親子など）はフラグを持たない。

不思議なとう（任意の特別地点、2026-09-26）は次の状態を使用する。2026-09-27にユーザー指示で、`story.mysterious_tower_revealed`を立てる本編側の解放イベントを決めた: No.02はじまりのまちのおじいさん（`npc_start_town_tower_elder`）と話し、暗転でおじいさんが去る一度きりのイベント。同イベントは`event.starting_town_tower_elder_talked`（一度きりの消費済みフラグ。立っていればおじいさんを生成しない）と`story.mysterious_tower_revealed`を暗転中に同時に保存する。

```text
story.mysterious_tower_revealed
story.mysterious_tower_discovered
event.mysterious_tower_first_entry_seen
```

同フラグは`world_map/map.json`の`developmentUnlockedFlags`には含めない（この会話だけが解放源）。

No.03ビーエのもり（2026-09-27）は`unlockFlag`に次のフラグを使う。No.02のぶきやの店主の「はなす」を初めて最後まで読み終えた時に保存する（最後のページ「ビーエのもりへ　いけるように　なった！」を閉じた後）。同義キーを別名で増やさない。

```text
story.bie_forest_unlocked
```

No.05レインランドのもり（2026-09-27）は`unlockFlag`に次のフラグを使う。No.04ビーエのむらの干し物の人（`npc_bie_village_herb_drier`）の「はなす」を初めて最後まで読み終えた時に保存する（最後のページ「レインランドのもりへ　いけるように　なった！」を閉じた後）。レインランドじょうかまちの`story.rainland_castle_town_unlocked`とは別のキーで、互いを解放しない。同義キーを別名で増やさない。

```text
story.rainland_forest_unlocked
```

レインランドじょうかまち（No.06）の`story.rainland_castle_town_unlocked`は、No.03えりまきとかげ撃破（2026-09-24）に加え、2026-09-27からNo.05レインランドのもり（その2）の奥の木こり（`npc_rainland_forest_woodcutter`）の「はなす」を初めて最後まで読み終えた時（最後のページ「レインランドじょうへ　いけるように　なった！」を閉じた後）にも保存する。同じキーを2か所が立てるだけで、別名キーは作らない。

```text
story.rainland_castle_town_unlocked
```

No.05レインランドのもり（その2）の遺跡の宝箱`chest_rainland_forest_2_ruin`は、開けた時に次のフラグを保存する（`chest.*`、再取得防止）。フラグ名は中身（現在は`かいふくやく`のTEMP_TEST_VALUE）に依存しない場所ベースの名前にしてあり、中身を変えてもセーブ互換を保つ。

```text
chest.rainland_forest_2_ruin_opened
```

コードから読み書きする上記5キー（`story.bie_forest_unlocked` / `story.rainland_forest_unlocked` / `story.rainland_castle_town_unlocked` / `story.mysterious_tower_revealed` / `event.starting_town_tower_elder_talked`）の定数は`src/config/storyFlags.ts`が正本。

`story.mysterious_tower_revealed`なしはWorldMapでHIDDEN、同フラグだけはUNKNOWN（`？？？`だが移動可能）、初回外観マップの短い演出完了時に`story.mysterious_tower_discovered`と`event.mysterious_tower_first_entry_seen`を保存してDISCOVERED（不思議なとう）へ移る。塔の成長開始値はフラグではなく`GameState.tower.towerLevel = 1`として保存する。

ボス戦からは勝利時だけ前者と後者の城下町解放フラグを立てる。宝箱は取得時、タロサは会話を読み終え、北側ワープ領域から去った一度だけそれぞれ保存する。タロサの加入はこのイベントでは扱わない。

正確なキー名は実装開始時に一度だけ確定し、同義キーを増やさない。

## 6. 「もういちど」状態管理
- オロチゾンビ1回目は通常Game Overフラグを使わない。
- 「データが消えた／初めからになったように見える」演出中も実保存データを削除しない。
- `localStorage.clear()` 等は禁止。
- 「もういちど」選択後は **No.01「はじまりのばしょ」** へ遷移する。
- 初回No.01と2回目No.01をフラグで分ける。
- 2回目は主人公・タロサ・ミレイが前の出来事を覚えている状態としてイベントを進める。
- どのステータス値を完全保持するか、演出上どこまで見せるかの細部はTBD。
- ジャンカード取得状態は必ず保持する。
- わたべ加入後の再戦をNew Gameデータとして作らない。

## 7. 勇者装備フラグ
- `item.hero_sword_obtained`
- `item.hero_crown_obtained`
- `item.hero_shield_obtained`

対応する正式配置は、No.13コタンカイムの洞窟＝たて、No.14ポサロ城＝けん、No.15ふっかつのほこら＝かんむり。既存の内部フラグ名は互換のため変更しない。

塔の条件判定は個別Sceneへ直書きせず、進行条件関数でまとめて判定する。

## 8. ジャンカード
- 全45枚。
- 1回20円。
- 固定順。
- ダブりなし。
- 46回目以降は通常ガチャを回せない。
- 本編クリア条件と分離する。
- 「もういちど」演出で取得状態を失わせない。

保存例:
```json
{
  "cardsCollected": 18,
  "owned": [1,2,3],
  "nextCard": 19
}
```

## 9. バグ演出との分離
- `glitch.*` フラグは演出の進行だけを管理する。
- 起動直後／序盤に偽セーブ消失を使わない。
- 終盤の「消えたように見せる」演出も見た目だけにする。
- 演出失敗時は正常画面へ戻せるフェイルセーフを用意する。
- オロチゾンビ1回目の異常遷移と通常全滅を別処理にする。

## 10. オートセーブ / 手動セーブ
正式なUI方式はTBD。
ただし以下を守る:
- ボス戦直前などで不意に長時間巻き戻らない。
- セーブ中断でデータが中途半端になりにくい方式にする。
- iPhone SafariのLocalStorage制約をQAで確認する。
- 「もういちど」シーケンスへ入る直前に安全な復帰点を持てる設計を検討する。

## 11. セーブ破損対策
- JSON parse失敗時に即上書きしない。
- version不一致時にmigrationまたは安全な警告処理へ回す。
- 開発用セーブリセットとゲーム演出を別機能にする。
- 開発用キー操作を本番ビルドに残す場合は誤操作しにくくする。

## 12. 禁止
- 演出のために実データを消す。
- 「もういちど」をNew Game処理で実装する。
- オロチゾンビ1回目を通常Game Overだけで処理する。
- 未定義フラグ名をSceneごとにその場で量産する。
- 表示名をフラグキーに使う。
- ジャンカード状態を本編進行フラグと混同する。
