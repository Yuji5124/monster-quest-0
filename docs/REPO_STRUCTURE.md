# Monster Quest 0 リポジトリ構成規約

更新日: 2026-09-09

このファイルは、実装開始後にフォルダ構成がAIごとにばらばらになることを防ぐための規約とする。

## 1. 基本原則
- Monster Quest 0専用プロジェクトとして構成する
- 汎用RPGエンジン化しない
- 1ファイルへゲーム全体を詰め込まない
- 画像・音声・ゲームデータ・実装コードを分離する
- 正式素材と仮素材を同じ場所で混在させない
- データで表現できる内容を、エリア固有コードへ直接埋め込まない

## 2. 推奨ルート構成
```text
monster-quest-0/
├─ README.md
├─ CLAUDE.md
├─ AGENTS.md
├─ docs/
├─ src/
├─ data/
├─ assets/
├─ tests/
└─ tools/
```

実際のPhaser Game Agent生成物がこの構造と異なる場合、無理な全移動は行わない。
ただし責務分離の考え方は維持する。

## 3. src
推奨構成：
```text
src/
├─ main.*
├─ config/
├─ scenes/
│  ├─ BootScene.*
│  ├─ TitleScene.*
│  ├─ WorldScene.*
│  ├─ BattleScene.*
│  ├─ MenuScene.*
│  └─ GameOverScene.*
├─ systems/
│  ├─ EventSystem.*
│  ├─ EncounterSystem.*
│  ├─ BattleSystem.*
│  ├─ SaveSystem.*
│  ├─ AudioSystem.*
│  └─ InputSystem.*
├─ entities/
├─ ui/
├─ loaders/
└─ utils/
```

### 禁止
- `main.*` に全ゲームロジックを集約する
- 町ごとに別の戦闘システムを作る
- マップごとに別のセーブ方式を作る
- NPC一人ごとに専用クラスを量産する

## 4. data
ゲーム内容は可能な限りデータ駆動にする。

```text
data/
├─ actors/
├─ monsters/
├─ encounters/
├─ magic/
├─ items/
├─ maps/
├─ npcs/
├─ events/
├─ dialogue/
└─ cards/
```

データ形式は `DATA_CONTRACTS.md` を参照する。

## 5. assets
```text
assets/
├─ characters/
│  ├─ hero/
│  ├─ tarosa/
│  ├─ mirei/
│  └─ npc/
├─ monsters/
├─ tiles/
│  ├─ common/
│  ├─ regions/
│  └─ interiors/
├─ battle-backgrounds/
├─ ui/
├─ effects/
├─ items/
├─ cards/
└─ audio/
   ├─ bgm/
   └─ se/
```

## 6. tests
最低限、以下を自動または半自動で確認できる構成を目指す。
- データ参照切れ
- 重複ID
- マップ遷移先の不存在
- 存在しない画像パス
- 存在しない敵 / 魔法 / アイテムID
- セーブデータmigration

## 7. tools
本編実装と切り離した検証・変換スクリプトを置く。
例：
- asset validation
- data validation
- save migration check

独自の大規模エディタは作らない。

## 8. 変更ルール
既存構成がすでに動いている場合、見栄えだけの理由で全面再構成しない。
構造変更は「開発速度・保守性・不具合防止」に明確な利点がある場合のみ行う。
