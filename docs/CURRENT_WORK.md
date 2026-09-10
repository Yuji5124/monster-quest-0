# モンスタークエスト0 現在作業

最終更新: 2026-09-11 JST

このファイルは「今まさに何を進めるか」を短く示す作業メモ。

## 現在の重点
1. 追加したゲーム内容SPECと既存SPECの整合を維持する
2. 既存NPC会話案を最新の小規模方針へ再編集する
3. 作成済みPNGを正式パスへ取り込む
4. Phaser Game AgentでVertical Slice開始

## 追加済みの主要SPEC
- `STORY_FLOW.md`
- `OPENING_SPEC.md`
- `MAP_FLOW_SPEC.md`
- `BATTLE_SPEC.md`
- `CHARACTER_GROWTH.md`
- `MONSTER_SPEC.md`
- `ITEM_EQUIPMENT_SPEC.md`
- `AUDIO_SPEC.md`
- `SAVE_FLAG_SPEC.md`
- `UI_INPUT_SPEC.md`

## NPCの次
会話原案あり:
- はじまりのまち
- ビーエのむら
- レインランドのまち

旧12人 / 15人 / 20人案はそのまま実装せず、町サイズ・NPC人数とも全体的に約半分程度へ圧縮する。
主要人物の話題へ偏らせず、生活NPC・地域NPC・事件NPC・軽いヒントNPC・遊びNPCを少人数でバランス配置する。

次の新規制作地域:
- **レインランドじょう**

## Phaserの次
Phaser本体初期化後、以下を最小単位で進める。
1. Boot / Title
2. オープニング最小実装
3. 主人公歩行
4. はじまりのまち
5. NPC会話
6. フィールド
7. ザコ戦
8. レベルアップ
9. 小ダンジョン
10. ボス
11. セーブ / ロード
12. iPhone Safari

## Vertical Sliceで先に固定するもの
- InputSystem
- EventSystem
- BattleSystem
- SaveSystem
- AudioSystem
- データJSON形式
- asset manifest読込

## まだ数値を確定しないもの
- 通常敵の最終能力値
- 魔法の最終消費MP / 威力
- アイテム価格 / 効果量
- 最終レベル曲線
- マップ座標 / 最終タイル数

これらは `TBD_REGISTRY.md` に従う。

## 完成の基準
`DEFINITION_OF_DONE.md` を使用し、`DONE / PARTIAL / BLOCKED` で管理する。

## 注意
新しいアイデアを増やすより、現在の確定仕様を実際に遊べる形へ変換することを優先する。
開始直後のリセット / 偽セーブ消失は使わず、終盤演出として扱う。
