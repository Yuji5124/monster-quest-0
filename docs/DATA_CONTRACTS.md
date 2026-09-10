# モンスタークエスト0 データ契約

最終更新: 2026-09-10 23:46 JST

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
```json
{
  "id": "map_start_town",
  "name": "はじまりのまち",
  "type": "town",
  "bgm": "bgm_town",
  "encounterTable": null,
  "connections": [],
  "events": []
}
```

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
