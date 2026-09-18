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
  "targetMapId": "map_02_starting_town",
  "targetSpawnId": "fromWorldMap",
  "x": 0,
  "y": 0,
  "visible": true,
  "unlockFlag": "world.starting_town_unlocked"
}
```

- `x` / `y` はワールドマップ背景の左上を`(0, 0)`とするピクセル座標である。
- `targetMapId` / `targetSpawnId` は実在するローカルマップの安全なspawnへ解決する。
- `visible: false` は地点をUIへ出さない。`visible: true` かつ未解放なら、UIは名前を`？？？`として非選択表示にできる。
- `unlockFlag: null` は常に選択可能、文字列は `SAVE_FLAG_SPEC.md` の小文字・ドット区切りフラグ名とする。最終的な選択可否はSceneに直書きせず、セーブフラグから導出する。
- 初期DEVでは `map.json` の `developmentUnlockedFlags` を保存済みフラグの代替として使ってよい。本番のSaveSystem接続後はこの値を進行状態として扱わない。
- 初期DEVデータの位置は正式地理の確定値にしない。

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
- 目的地は `targetMapId` / `targetSpawnId` でローカルマップへ戻る。往復の両方向は実ファイルと安全なspawnへ検証可能でなければならない。

## 9. encounter
```json
{
  "id": "encounter_early_grass",
  "entries": [
    {"enemies": ["monster_daija"], "weight": 1}
  ]
}
```

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
全45枚。固定順、ダブりなし、1回20円。

## 11. save
セーブデータは最低限以下を分離する。
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

## 12. 禁止
- 同じ意味のIDを複数方式で作る
- 表示名を内部キーとして使う
- 未確定数値をAIが勝手に確定する
- 個別Sceneだけ別JSON形式にする
- データ変更のために戦闘コードを書き換える

## 13. 実装開始時
最初はVertical Sliceに必要な最小データだけ作成し、全25体・全45枚を先行入力することを必須にしない。
