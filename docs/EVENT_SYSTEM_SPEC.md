# Monster Quest 0 イベントシステム仕様

更新日: 2026-09-09

## 1. 目的
会話、宝箱、ワープ、仲間加入、ボス、ストーリー進行を個別コードの寄せ集めにせず、共通イベント方式で扱う。

## 2. Event基本形
```json
{
  "id": "event.starting_town.example",
  "trigger": "interact",
  "once": false,
  "conditions": [],
  "commands": []
}
```

## 3. Trigger
最低限の標準値：
- `interact`：決定 / タップ等で調べる
- `touch`：接触 / 指定地点進入
- `map_enter`：マップ入場
- `battle_end`：戦闘終了後
- `auto`：条件成立時に自動

新しいtriggerを増やす前に既存で表現できないか確認する。

## 4. Condition
条件はデータとして扱う。
例：
```json
{"type":"flag","id":"story.intro_complete","equals":true}
```

必要な標準条件：
- flag
- party member
- item possession
- card possession
- boss defeated
- level
- gold

## 5. Command
最低限の標準コマンド：
- `show_message`
- `show_choice`
- `set_flag`
- `give_item`
- `remove_item`
- `give_gold`
- `join_party`
- `leave_party`
- `transfer_player`
- `start_battle`
- `play_se`
- `change_bgm`
- `wait`
- `screen_effect`

例：
```json
{
  "type": "give_item",
  "itemId": "item.kaifukuyaku",
  "quantity": 1
}
```

## 6. 宝箱
宝箱は必ず一意のflagを持つ。

```text
chest.<map>.<number>_opened
```

宝箱取得処理は次の順を基本とする。
1. flag確認
2. 未取得なら演出
3. アイテム付与
4. flag保存
5. 開封済み見た目へ変更

二重取得禁止。

## 7. ボス
ボスイベントは、
- 戦闘前会話
- 戦闘開始
- 勝利判定
- 勝利後イベント
- boss flag保存
を分離して再開可能にする。

戦闘中断 / ページ再読み込み等で、撃破報酬だけ重複しないようにする。

## 8. 仲間加入
加入処理は `party.<name>_joined` 等のflagとパーティ状態を整合させる。
画面上の演出だけで加入済み判定をしない。

## 9. NPC会話
同一NPCでも進行フラグに応じて会話を切り替えられる。
村人・町人は可能な範囲で2パターン程度の会話を持たせる。

## 10. Transfer
マップ遷移データは最低限、
- destinationMapId
- spawnId または安全な座標
を持つ。

遷移先が存在しない場合はvalidationで検出する。

## 11. 一度きりイベント
`once: true` のイベントは保存可能なflagへ変換して扱う。
Scene再生成だけで再発火しない。

## 12. 自動イベント
`auto` は特に二重発火防止が必要。
- 実行中lock
- 完了flag
- Scene復帰時チェック
を行う。

## 13. バグ演出
終盤の異常演出もイベントコマンドとして制御し、本当のフリーズ・本当のデータ破損・進行不能を使わない。
`GLITCH_SPEC.md` に従う。

## 14. AI禁止事項
- NPCごとに専用if文をWorldSceneへ大量追加する
- 同じ宝箱処理をマップごとにコピペする
- 一度きりイベントをメモリ上だけで管理する
- 未確定のストーリー条件を推測で作る
- 公開リポジトリへ終盤の秘密条件を平文で追加する

## 15. QA
最低限確認：
- 同じ宝箱を連打しても二重取得しない
- ボス撃破後に再戦しない（仕様上再戦する場合を除く）
- map_enterがループしない
- セーブ→ロード後もイベント状態が維持される
- NPC会話条件が想定どおり切り替わる
