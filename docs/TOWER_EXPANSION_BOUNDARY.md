# 不思議なとう 拡張境界

最終更新: 2026-09-27 JST

## 現在の実装範囲

- 任意の特別地点（正式No.01〜No.20のルート番号を増やさない）。
- `map_mysterious_tower_exterior` と `map_mysterious_tower_1f` を既存の BACKGROUND / COLLISION / EVENT / OBJECT 方式で接続する。
- 外観の初期建築段階は、中央奥にある古い石塔1棟と、その周囲の更地。固定NPCは案内役のおじいさん1人だけで、台詞は「この更地を自由に使ってよい」に限定し、移住・建築条件は決めない。
- `GameState.tower.towerLevel` のみを保存し、初期値は1。旧セーブに領域が無い場合も安全に1へ補完する。
- 1F中央の核はOBJECT。表示するメッセージは `objects.json` の `……。` のみ。
- LLM通信、住民移住、施設建設、素材収集、自由会話は未実装。

### 外観の増築方針

- 現在表示する背景は `background_tower_level_1.png`。元の更地 `background.png` とユーザー提供SOURCEは保持し、上書きしない。
- 今後の住居・施設は、左右と手前に残した空地へ追加する。既存の入口・南の石橋・外周地形は維持する。
- 次段階の背景は `background_tower_level_<n>.png` のように追加し、`towerLevel` から表示用アセットを選ぶ小さなPresentation resolverを導入する。SceneやAIが画像パスを直接決めない。

## WorldMap状態

`destination_mysterious_tower` は通常の20地点と別の `routeKind: "special"` を持つ。

```text
HIDDEN       story.mysterious_tower_revealed なし。地点を描かない。
UNKNOWN      revealed のみ。？？？として表示し、移動は可能。
DISCOVERED   初回外観到達の短い演出完了後。正式名で表示。
```

`story.mysterious_tower_revealed` を立てるのは、2026-09-27にユーザーが指定した1か所だけ: No.02はじまりのまちに立つ塔のおじいさん（`npc_start_town_tower_elder`）と話す一度きりのイベント（会話後に暗転して、おじいさんは「先に行っている」と去る）。`world_map/map.json`の`developmentUnlockedFlags`には含めず、他のストーリーやNPC会話・場所へは接続しない。塔の更地の使い方はここでも決めず、おじいさんの台詞は塔の外のおじいさんと同じ「更地を自由に使ってよい」に限定する。

## 住民移住の接続案（未実装）

既存の町・村のNPC定義は変更しない。将来の移住候補は既存の`NpcDefinition.id`を`residentId`、その定義の`mapId`を`originMapId`として参照し、次のような別保存領域を塔アプリケーションサービスだけが更新する。

```ts
type TowerResident = {
  residentId: string;
  originMapId: string;
  role: string;
  joinedTower: boolean;
};
```

移住イベントは「既存NPCの会話variant判定」→「許可済みTower service」→「保存」の一方向にし、NPC Sceneが塔の保存値を直接書き換えない。`towerResidents`、`towerFacilities`、`towerMaterials`の保存形式や上限は、実際の移住条件とUIが決まった時点で定義する。

## AI接続の推奨境界（未実装）

```text
Phaser Scene
  → Tower application service
  → immutable tower snapshot (level / approved residents / facilities / materials)
  → TowerAIService adapter
  → validated, limited proposal
  → Tower application service
  → GameStateRepository
```

`TowerAIService` は将来のOllama、Qwen、外部APIなどの差し替え先のインターフェースであり、現在は通信を持たない。AIアダプターにPhaser Scene、`window`、`GameStateRepository`、任意のフラグ書き込み権限を渡さない。戻り値はホワイトリスト化した提案だけにし、ゲーム側が進行条件・上限・保存を検証してから反映する。
