# モンスタークエスト0 データ契約

最終更新: 2026-09-18 JST

## 1. 目的
Claude Code / Codex / Phaser Game Agentが同じJSON構造を前提に実装できるよう、固定データの最低契約を定める。

## 2. 共通ルール
- IDは一度公開・実装したら安易に変更しない
- 表示名と内部IDを分離する
- 未確定値は推測で埋めず `null` またはTBD管理とする
- 画像パスは `ASSET_INDEX.md` / `asset_catalog.json` と一致させる
- 数値調整はJSONで行い、Sceneへ直書きしない

## 3. monster
```json
{
  "id": "monster_daija",
  "name": "ダイジャ",
  "hp": 40,
  "mp": 0,
  "attack": 20,
  "defense": null,
  "speed": null,
  "exp": null,
  "gold": null,
  "sprite": "assets/monsters/monster_daija.png",
  "skills": [],
  "tags": ["early"]
}
```

## 4. magic
```json
{
  "id": "magic_life",
  "name": "ライフ",
  "mpCost": null,
  "target": "ally",
  "effect": "heal",
  "power": null,
  "animation": null
}
```

## 5. item
```json
{
  "id": "item_kaifukuyaku",
  "name": "かいふくやく",
  "type": "consumable",
  "price": null,
  "effect": "heal",
  "power": null,
  "icon": null
}
```

## 6. npc
```json
{
  "id": "npc_start_01",
  "mapId": "map_start_town",
  "sprite": "npc_01",
  "position": {"x": 0, "y": 0},
  "dialogueId": "dialogue_start_01"
}
```

## 7. dialogue
通常会話は進行段階で切り替えられる構造にする。
```json
{
  "id": "dialogue_start_01",
  "variants": [
    {"when": "default", "messages": ["..."]},
    {"when": "story.left_town_once", "messages": ["..."]}
  ]
}
```

## 8. map
新規ローカルマップの正本は背景画像であり、詳細は `MAP_SYSTEM.md` を正とする。No.01はこの形式へ移行済みである。既存のTiledデータや他の既存TypeScript設定は自動移行しない。

```json
{
  "id": "map_start_town",
  "name": "はじまりのまち",
  "type": "town",
  "formatVersion": 1,
  "coordinateSpace": "background-pixels",
  "layers": {
    "background": "assets/maps/map_start_town/background.png",
    "collision": "assets/maps/map_start_town/collision.png",
    "events": "assets/maps/map_start_town/events.json",
    "objects": "assets/maps/map_start_town/objects.json"
  },
  "bgm": "bgm_town",
  "encounterTable": null,
  "connections": []
}
```

- `background` が景観の正本である。
- `collision` は白=歩行可能、黒=歩行不可の人間編集可能なPNGを第一候補とする。JSON / polygonは実行用の派生データとして併用できる。
- EventとObjectの位置は、背景画像左上を`(0, 0)`とする同一ピクセル座標系で持つ。
- ワールドマップの目的地ポイントは別の選択データとして管理し、巨大な徒歩フィールド用Collisionを要求しない。

### 8.1 worldMapDestination

```json
{
  "id": "destination_starting_town",
  "name": "はじまりのまち",
  "implementationStatus": "implemented",
  "targetMapId": "map_02_starting_town",
  "targetSpawnId": "fromWorldMap",
  "x": 0,
  "y": 0,
  "labelOffset": { "x": 0, "y": 28 },
  "visible": true,
  "unlockFlag": "world.starting_town_unlocked",
  "positionStatus": "FINAL_POSITION"
}
```

- `x` / `y` はワールドマップ背景の左上を`(0, 0)`とするピクセル座標である。
- `labelOffset` は同じ背景ピクセル座標系でのラベル中心への相対オフセットである。地点が密集する場合だけ個別に調整し、Sceneへ直書きしない。
- `implementationStatus: "implemented"` の `targetMapId` / `targetSpawnId` は、実在するローカルマップの安全なspawnへ必ず解決する。
- `implementationStatus: "planned"` は地理を先行表示する未実装地点である。`targetMapId` / `targetSpawnId` は必ず`null`とし、Scene遷移の選択対象にしない。UI上の専用色は青とする。
- `visible: false` は地点をUIへ出さない。`visible: true` かつ未解放なら、UIは名前を`？？？`として非選択表示にできる。
- `unlockFlag: null` は常に選択可能、文字列は `SAVE_FLAG_SPEC.md` の小文字・ドット区切りフラグ名とする。最終的な選択可否はSceneに直書きせず、セーブフラグから導出する。
- `WorldMapScene`は共有`GameStateRepository.flags`を正式な進行状態として読み、`developmentUnlockedFlags`は既存開発用の初期解放だけを補助する。`WorldMapTestScene`は`?worldMapFlags=`が指定された場合にその明示値だけを使い、未指定時は従来の開発用初期解放を使う。
- `positionStatus: "FINAL_POSITION"` は、CURRENTの背景画像を実見して決めた正式な配置にだけ使用する。

### 8.1.1 imageMapWorldMapEvent

```json
{
  "id": "event_no01_north_gate",
  "trigger": "enter",
  "bounds": { "x": 650, "y": 112, "width": 220, "height": 84 },
  "commands": [{ "type": "world-map", "worldMapEntryId": "from_starting_place" }]
}
```

- ローカル画像マップから世界地図へ出る領域は `events.json` で定義する。SceneやTiledのObjectへ同じ境界を重複して書かない。
- `worldMapEntryId` は `world_map/map.json` の `entryDestinationIds` に必ず解決し、世界地図上の現在地とローカルマップを対応付ける。

### 8.2 worldMapManifestEntry

```json
{
  "entryDestinationIds": {
    "from_starting_place": "destination_starting_place"
  }
}
```

- `entryDestinationIds` はローカルマップの `world-map` 出口IDから、現在地として表示する目的地IDを引く正本である。
- `maps.ts` は `worldMapEntryId` だけを持つ。Scene名や背景ピクセル座標、目的地IDをローカルSceneへ重複して書かない。
- `implementationStatus: "implemented"` の目的地は `targetMapId` / `targetSpawnId` でローカルマップへ戻る。往復の両方向は実ファイルと安全なspawnへ検証可能でなければならない。`planned`はentryに登録しない。

## 9. encounter
```json
{
  "id": "encounter_early_grass",
  "entries": [
    {"enemies": ["monster_daija"], "weight": 1}
  ]
}
```

実装初弾（No.03ビーエのもり、内部`starting_forest`、`src/data/encounterTables.ts`）は、今回の仕様上1戦闘の敵を必ず1体とするため、`enemies`を要素数1の配列に限定して使用する。地域ごとのencounter tableはSceneへ直書きせず、`src/systems/RandomEncounter.ts`（歩行距離の蓄積・閾値抽選・戦闘後クールダウン）と組み合わせて呼び出す。

## 10. janCard
```json
{
  "id": "card_01",
  "number": 1,
  "name": "TBD",
  "image": null,
  "description": null,
  "spoiler": false
}
```
全45枚。固定順、ダブりなし、1回20円。購入額は所持金から支払う。現行の`cards.jumpCoinCount`は旧実装であり、正本の保存契約には追加しない。

## 11. save
セーブデータは最低限以下を分離する。
```json
{
  "version": 1,
  "player": {},
  "party": {
    "joinedMemberIds": ["hero"],
    "characterProgress": {
      "hero": { "level": 1, "exp": 0 }
    }
  },
  "inventory": {},
  "equipment": {},
  "flags": {},
  "cards": {},
  "map": {},
  "settings": {}
}
```

- 現行の暫定GameStateでは、`party.joinedMemberIds` に `hero` → `tarosa` → `mirei` の加入済み接頭辞、`party.characterProgress` に3人全員の`level`/`exp`、`inventory` に正の所持数、`flags`に妥当な小文字ドット区切りキーのtrue値だけを保存する。
- 旧セーブで不足する`characterProgress`/`inventory`は、Lv1・EXP0／空の所持品へ安全に補完する。未加入の後続メンバーだけを含める不正な加入順は正規化して除外する。
- 正式SaveSystemはこの順序と成長・所持品を引き継ぎ、HP・装備・控え編成を別途拡張する。

## 12. 禁止
- 同じ意味のIDを複数方式で作る
- 表示名を内部キーとして使う
- 未確定数値をAIが勝手に確定する
- 個別Sceneだけ別JSON形式にする
- データ変更のために戦闘コードを書き換える

## 13. 実装開始時
最初はVertical Sliceに必要な最小データだけ作成し、全25体・全45枚を先行入力することを必須にしない。
