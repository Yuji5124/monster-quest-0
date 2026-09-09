# Monster Quest 0 命名規則

更新日: 2026-09-09

## 1. 目的
AIごとにID・ファイル名・Scene名・フラグ名が揺れることを防ぐ。

## 2. 基本
- 表示名は日本語可
- 内部ID・ファイル名は英数字中心
- IDと表示名を分離する
- 同じ概念を複数の綴りで持たない

## 3. ID形式
ドット区切りを基本とする。

```text
actor.hero
actor.tarosa
actor.mirei
monster.daija
magic.heat
item.kaifukuyaku
map.starting_town
npc.starting_town.innkeeper
event.starting_town.intro
flag.story.chapter01_started
card.001
```

## 4. ファイル名
snake_caseを基本とする。

例：
```text
hero_walk.png
tarosa_walk.png
monster_daija.png
battle_bg_forest.png
ui_window.png
bgm_field_01.*
se_attack_01.*
```

禁止：
```text
final.png
final2.png
latest_new.png
修正版2.png
```

## 5. Scene / Class
PascalCase。
```text
BootScene
TitleScene
WorldScene
BattleScene
MenuScene
SaveSystem
EventSystem
```

## 6. 変数 / 関数
camelCaseを基本とする。
```text
currentMapId
startBattle()
loadSaveData()
```

## 7. フラグ
意味が読める名前にする。

```text
story.intro_complete
party.tarosa_joined
party.mirei_joined
boss.demas_defeated
chest.starting_cave.001_opened
```

禁止：
```text
flag1
flag2
tmpBoss
x1
```

## 8. Map ID
表示名から直接日本語IDを作らず、英語またはローマ字ベースで固定する。

確認済み地域例：
```text
map.starting_town       はじまりのまち
map.bie_village         ビーエのむら
map.rainland_town       レインランドのまち
map.rainland_castle     レインランドじょう
map.zabon_village       ザボンのむら
map.posaro_castle       ポサロ城
map.revival_shrine      ふっかつのほこら
```

既存実装に別の安定IDがすでにある場合、無意味な変更はしない。

## 9. Event ID
```text
event.<map>.<purpose>
```
例：
```text
event.starting_town.intro
event.starting_town.inn_tutorial
event.starting_cave.boss
```

## 10. Asset key
Phaser内のasset keyとファイル名の関係を追えるようにする。
同一画像を `hero`, `player`, `mainCharacter` のような別keyで重複登録しない。

## 11. 既存命名との衝突
既存コードが安定稼働している場合、命名統一だけを目的とした大規模renameは禁止。
新規追加から本規約へ合わせ、必要な箇所のみ段階的に整理する。
