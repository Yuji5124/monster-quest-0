# MQ0 Battle Test

最終更新: 2026-09-13 JST

## 範囲

これは `DEV_BATTLE_TEST` であり、正式なランダムエンカウント、Fieldからの戦闘遷移、報酬、成長、セーブ、Game Over、BGM/SEを実装しない独立テストである。

## 作業前監査

Battle / Combat / Monster / Enemy / Damage / HPをsrc・tests・docs・台帳で検索した。BattleScene、BattleSystem、戦闘用モンスターデータは未実装だった。

- IMPLEMENTED: Phaser 3.90.0、960×720表示、InputSystem、Titleからの通常起動。
- PARTIAL: BATTLE_SPECのコマンド戦闘方針とUI_INPUT_SPECのコマンド名。
- MISSING: BattleScene、戦闘状態、ダメージ計算、敵定義、戦闘テスト入口。

最終ダメージ式・最終バランス・通常敵の対応表はTBDのため、今回の数値はすべて `DEV_BATTLE_BALANCE` である。

## Tiled作業との競合

開始前にgit status、git diff --name-status、git diff --statを確認した。TiledおよびField/Map関連の並行差分を保持した。今回、`tiled/`、FieldScene、field.ts、maps.ts、MapCamera、MapTransition、StartingPlaceScene、StartingTownScene、InteriorScene、Tiled関連docsは変更していない。

## 起動方法

`npm run dev` の後、次を開く。

- `http://127.0.0.1:5173/?battleTest=003`
- `http://127.0.0.1:5173/?battleTest=006`

`battleTest` が無効な値でも安全に003を選ぶ。queryが無い通常起動は従来どおりBoot → Titleであり、Battle Testメニューはタイトルへ追加しない。

## モンスター素材と表示名

| ID | 表示名 | 素材 | サイズ | DEV HP / Attack / Defense |
|---|---|---|---:|---:|
| 003 | MONSTER 003 | `assets/monsters/source/portraits/mq0_monster_003_1e2e150bba.png` | 1536×1024 PNG | 15 / 5 / 2 |
| 006 | MONSTER 006 | `assets/monsters/source/portraits/mq0_monster_006_7c8f45a8e1.jpeg` | 1236×1272 JPEG | 24 / 6 / 3 |

allocation/source manifestには素材ファイルとの対応だけがあり、CURRENTな正式名の対応は確認できなかった。そのため名前を推測せず開発表示を使用する。元ファイルは保持し、Viteの相対URLで直接読み込むためコピー・移動・絶対パス参照はない。画像はLINEAR filterで縦横比を維持して最大420×300以内に縮小表示する。

## Player DEV stats

主人公: HP 30、Attack 8、Defense 3。すべてDEV_BATTLE_BALANCE。

## Battle state / command / damage

`BattleSystem` が `COMMAND → PLAYER_ACTION → ENEMY_ACTION → COMMAND` を管理する。`VICTORY` と `DEFEAT` は終端状態で、Z / Enterで同じBattle Testを再開始する。コマンドは実装済みの `▶ たたかう` のみ。まほう・どうぐ・にげるは今回表示も実装もしない。

ダメージはテスト容易性を優先し、`max(1, attack - defense)`。Sceneに計算を散在させない。敵HPが0なら反撃を行わず、次の確認入力で勝利表示へ進む。主人公HPが0なら敗北表示へ進む。EXP、Gold、Drop、Level Up、正式Battle Resultは未実装。

InputSystemの`consumePressed("confirm")`を1フレーム1回だけ使用し、決定1回で複数状態を進めない。↑↓とX/Escapeは今回の単一コマンドUIで消費のみ行い、別のキー入力方式を増やさない。

## 変更ファイル

- `src/main.ts`: BattleScene登録とquery時だけの独立起動。

## 新規ファイル

- `src/config/battle.ts`
- `src/data/monsters.ts`
- `src/battle/BattleSystem.ts`
- `src/scenes/BattleScene.ts`
- `tests/battle.test.mjs`
- 本書

## 検証

- 自動テスト: モンスター2体定義、存在する画像、正のDEV stats、最小ダメージ、防御、状態遷移、勝利時反撃なし、敗北、不正IDを検証。
- `npm test`: **77/77 PASS**（既存71 + Battle Test 6）。
- `npm run typecheck`: **PASS**。
- `npm run build`: **PASS**。42 modulesを変換し、両モンスター画像をdist/assetsへ出力。既存の500kB超chunk警告は残るが、今回の失敗ではない。
- Runtime: ローカルChromeで`?battleTest=003`と`?battleTest=006`を開き、画像表示、複数ターンの主人公攻撃・敵反撃、勝利までを確認。003は主人公HP 26/30、006は18/30で勝利。console error 0、missing texture 0、404 0。
- 敗北: DEV値を用いたBattleSystem自動テストで、HP 1 / Defense 0の主人公が敵攻撃でHP 0となりDEFEATへ遷移することを確認。

003は透過PNG、006は元JPEGに含まれる白背景をそのまま表示する。いずれも画面外にはみ出さず、縦横比の変更やpixel-art加工は行っていない。

## 正式Battle実装前に残るTBD

最終モンスター名と25体対応、全数値、行動順・命中・回避・だいヒット、戦闘背景、タッチ操作、Encounter接続、報酬、パーティ、通常敗北後の復帰処理。

BATTLE TEST STATUS:
PASS
