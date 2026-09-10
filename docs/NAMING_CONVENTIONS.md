# モンスタークエスト0 命名規則

最終更新: 2026-09-10 23:46 JST

## 1. 目的
AI・人間・Phaser Game Agentで名前の揺れを防ぎ、検索・差し替え・デバッグを容易にする。

## 2. 基本
- 表示名は日本語でよい
- 内部ID / ファイル名は半角英数字 + snake_caseを基本とする
- 一度実装したIDは理由なく変更しない
- `new` `latest` `final2` `修正版` のような履歴語を正式ファイル名に入れない

## 3. ID prefix
- map: `map_`
- npc: `npc_`
- monster: `monster_`
- item: `item_`
- magic: `magic_`
- card: `card_`
- event: `event_`
- dialogue: `dialogue_`
- bgm: `bgm_`
- se: `se_`
- flagはカテゴリ付き `story.*` `party.*` `boss.*` `chest.*` `npc.*` `cards.*`

## 4. 例
- `map_start_town`
- `map_bie_village`
- `npc_start_01`
- `monster_daija`
- `item_kaifukuyaku`
- `magic_relief` のような英訳を勝手に使わず、正式名称ローマ字/既定IDを採用する
- `card_01`
- `event_bie_rescue_woodcutter`

## 5. 画像
推奨:
- `hero_walk.png`
- `tarosa_walk.png`
- `mirei_walk.png`
- `monster_daija.png`
- `battle_bg_forest.png`
- `battle_bg_forest_alt01.png`
- `ui_window.png`

別案は `_alt01`, `_alt02` とする。

## 6. マップレイヤー
原則として全マップで共通名を使う。
- `Ground`
- `GroundDetail`
- `Road`
- `Building`
- `Object`
- `Collision`
- `Event`
- `Foreground`

不要なレイヤーは省略可だが、同じ意味に別名を作らない。

## 7. Scene / Class
TypeScriptではPascalCase。
- `BootScene`
- `TitleScene`
- `WorldScene`
- `BattleScene`
- `EventSystem`
- `SaveSystem`

## 8. フォルダ
カテゴリ名は複数形または既存構成に統一し、同義フォルダを増やさない。
例: `monsters/` と `enemies/` を併存させない。

## 9. 公開ネタバレ
公開用ファイル名・IDから重大な終盤ネタバレが露出する場合は、中立的な内部名または `unknown` 系IDを使い、詳細は公開ドキュメントへ書かない。

## 10. 禁止
- `flag1`, `tmp2`, `test3`
- `image_final_final2.png`
- 同一キャラへ複数の綴りを使う
- 画面表示名をデータ参照キーとして直接使う
