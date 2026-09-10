# モンスタークエスト0 リポジトリ構成

最終更新: 2026-09-10 23:46 JST

## 1. 現在
現時点では仕様・素材整理が先行している。Phaser本体を初期化する際は以下を基準とする。

## 2. 推奨構成
```text
monster-quest-0/
├─ README.md
├─ CLAUDE.md
├─ AGENTS.md
├─ docs/
├─ assets/
│  ├─ characters/
│  ├─ monsters/
│  ├─ tiles/
│  ├─ battle-backgrounds/
│  ├─ ui/
│  ├─ cards/
│  ├─ effects/
│  └─ audio/
├─ data/
│  ├─ actors.json
│  ├─ monsters.json
│  ├─ magic.json
│  ├─ items.json
│  ├─ cards.json
│  ├─ encounters.json
│  ├─ maps/
│  ├─ npcs/
│  └─ events/
├─ src/
│  ├─ scenes/
│  ├─ systems/
│  ├─ ui/
│  ├─ config/
│  └─ main.ts
├─ public/
├─ tests/
└─ tools/
```

## 3. 原則
- 仕様は `docs/`
- 正式ゲーム素材は `assets/`
- 固定ゲームデータは `data/`
- Phaserコードは `src/`
- 変換・検査ツールは `tools/`
- 同じ役割のフォルダを複数作らない

## 4. Scene
`src/scenes/`
- BootScene
- TitleScene
- WorldScene
- BattleScene
- MenuScene
- GameOverScene

必要になったSceneだけ追加する。

## 5. System
`src/systems/`
- EventSystem
- EncounterSystem
- BattleSystem
- SaveSystem
- AudioSystem
- InputSystem

ゲーム内容のデータをSystemへ大量直書きしない。

## 6. データ
町・村・敵・カード数が増えても、コードファイル数が同じ割合で増えない構造にする。

## 7. assets
既存の `assets/README.md` と `assets/asset_catalog.json` を正として、実ファイルを分類する。
ChatGPT内で作成済みでもGitHubにないものは、存在する前提にしない。

## 8. 禁止
- `src/game.ts` 1枚へ全機能を集約
- `old/`, `old2/`, `backup-final/` を大量に作る
- 同じ画像を別名コピーで複数保存
- 生成物と正式素材の区別がつかない構成
- docs内にバイナリ素材を混在

## 9. 実装開始時
Phaser Game Agentでプロジェクト初期化後、この構成へ100%合わせる必要はない。ただし責務分離の意図を維持し、変更理由をREADMEまたは関連SPECへ記録する。
