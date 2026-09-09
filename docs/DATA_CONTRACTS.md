# Monster Quest 0 データ契約

更新日: 2026-09-09

このファイルは、Claude Code / Codex / Phaser Game Agentが同じデータ形式を前提に実装するための基準。
実装時に既存形式がある場合は、破壊的な全面置換をせず、ここへ現行形式を反映して整合させる。

## 1. 共通ルール
- すべての主要データに安定した `id` を持たせる
- 表示名とIDを分離する
- IDは途中で気軽に変更しない
- ID参照先が存在しない状態を許容しない
- 未確定値を推測で埋めない
- 数値が原作資料・カード資料で確認済みの場合、それを優先する
- 公開リポジトリに重大なネタバレ値を置かない

## 2. ID例
```text
actor.hero
actor.tarosa
actor.mirei
monster.daija
magic.heat
item.kaifukuyaku
map.starting_town
npc.starting_town.innkeeper
encounter.starting_field.a
event.starting_town.intro
card.001
```

## 3. Monster
例：
```json
{
  "id": "monster.daija",
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
  "tags": ["normal"]
}
```

`null` は「未確定」の意味であり、AIが自動的に埋めて確定仕様にしない。

## 4. Magic
```json
{
  "id": "magic.heat",
  "name": "ヒート",
  "mpCost": null,
  "target": "enemy_one",
  "effectType": "damage",
  "power": null,
  "element": "fire",
  "animation": "effect.heat"
}
```

`リライフ` はMQ0内では復活魔法として扱うが、原作確定情報とは区別する。

## 5. Item
```json
{
  "id": "item.kaifukuyaku",
  "name": "かいふくやく",
  "type": "consumable",
  "target": "ally_one",
  "effect": "heal_hp",
  "value": null,
  "price": null
}
```

## 6. NPC
```json
{
  "id": "npc.starting_town.example",
  "name": null,
  "mapId": "map.starting_town",
  "sprite": "npc_base_01",
  "position": {"x": null, "y": null},
  "dialogueId": "dialogue.starting_town.example",
  "behavior": "idle"
}
```

座標はマップ完成前に推測で確定しない。

## 7. Dialogue
```json
{
  "id": "dialogue.starting_town.example",
  "variants": [
    {"condition": null, "text": "..."},
    {"condition": "story.some_flag", "text": "..."}
  ]
}
```

村人・町人は可能な範囲で2パターン程度の生活感ある台詞を持たせる。

## 8. Encounter
```json
{
  "id": "encounter.starting_field.a",
  "mapId": "map.starting_field",
  "entries": [
    {"monsterId": "monster.daija", "weight": 1}
  ],
  "rate": null
}
```

エンカウント率はプレイテンポ確認後に調整可能なデータとして持つ。

## 9. Map metadata
```json
{
  "id": "map.starting_town",
  "name": "はじまりのまち",
  "type": "town",
  "bgm": "bgm.town",
  "battleBackground": null,
  "encounterTable": null,
  "connections": []
}
```

## 10. Event
イベント本体は `EVENT_SYSTEM_SPEC.md` に従う。
```json
{
  "id": "event.starting_town.example",
  "trigger": "interact",
  "conditions": [],
  "commands": []
}
```

## 11. Card
```json
{
  "id": "card.001",
  "number": 1,
  "name": "...",
  "image": "...",
  "description": "...",
  "publicSpoilerSafe": true
}
```

全45枚。公開時にネタバレとなる名称は公開データでは `？？？` 等を使用する。

## 12. SaveData
```json
{
  "version": 1,
  "player": {},
  "party": [],
  "inventory": {},
  "flags": {},
  "cards": {},
  "map": {},
  "settings": {}
}
```

詳細は `SAVE_SPEC.md`。

## 13. バリデーション必須項目
- ID重複なし
- 参照先IDが存在する
- 画像パスが存在する
- map接続先が存在する
- イベントcondition参照が有効
- 同一宝箱 / ボス撃破報酬が二重取得されない
- card number 1〜45の重複 / 欠番を検出可能にする

## 14. AIへの禁止
- `null` を勝手に適当な数値で埋める
- 表示名をIDとして使う
- 日本語ファイル名と英数字IDをその場の判断で混ぜる
- 同じモンスターを別IDで重複登録する
- コード内定数とJSONで別の数値を持つ
