# Library Image Naming / GitHub Intake

最終更新: 2026-09-12 JST

ChatGPT Library の `/Monster Quest 0` にある画像を、GitHub / Phaser で安全に運用するための取り込み規則。

## 現状
Library 側には、意味のある日本語・英語名の画像に加えて、UUID名、`IMG_####`、`ChatGPT Image ...`、1文字名、連番名、`(1)(2)(3)` 付き複製が混在している。

例:
- `057440DD-27D2-48E4-985A-A53F2C31F4EE.jpeg` と `(1)(2)(3)`
- `ChatGPT Image Sep 6, 2026, 02_54_43 PM.png` と `(1)`
- `IMG_1606.png` と `IMG_1606(1).png`
- `J.png` / `J(1).png` / `J(2).png` / `J(3).png`
- `モンスタークエスト0 全体マップ.png`
- `いしのむら 山岳鉱山マップ.png`

この状態のファイル名を、そのままゲームコードから参照しない。

## GitHub側の正本
- 命名規則: `assets/README.md`
- 正式台帳: `docs/ASSET_INDEX.md`
- 機械可読カタログ: `assets/asset_catalog.json`
- Library取り込み時の個別変換: `assets/rename_overrides.json`
- 自動監査・重複除外・取り込み: `tools/asset_intake.py`

## 基本ルール
1. GitHubの正式名は半角英小文字・数字・`_` の `snake_case`。
2. 日本語、空白、括弧、日時文字列、UUID、`IMG_####`、`final`、`最新版`、`v2` を正式名に使わない。
3. バージョン差分はGitで管理し、同用途の正式ファイル名は固定する。
4. 明確な別案だけ `_alt`、2案目以降は `_alt_02` のようにする。
5. 実装用と参考資料を分離する。参考画像は原則 `_reference` を付ける。
6. 同一内容の画像はSHA-256で判定し、GitHubには1ファイルだけ入れる。
7. 内容を判定できない画像に意味のある名前を推測で付けない。`assets/_inbox/raw/` に安定名で保留する。

## 未判定画像の安定名
意味を確定できない画像は次の形式にする。

`assets/_inbox/raw/ref_YYYYMMDD_<sha8>.<ext>`

例:

`057440DD-27D2-48E4-985A-A53F2C31F4EE.jpeg`
→ `assets/_inbox/raw/ref_20260908_a1b2c3d4.jpeg`

これにより、UUIDや端末由来名をコードに持ち込まず、あとで画像を確認して正式名へ昇格できる。

## 推奨パターン

### キャラクター
- `assets/characters/playable/protagonist_walk.png`
- `assets/characters/playable/tarosa_walk.png`
- `assets/characters/playable/mirei_walk.png`
- `assets/characters/support/watabe_walk.png`
- `assets/characters/npc/npc_01.png`

### モンスター
- `assets/monsters/battle/monster_01_<name>.png`
- `assets/monsters/source/<name>_source.png`

### ジャンカード
- `assets/cards/full/card_001_<name>.png`
- `assets/cards/art/card_art_001_<name>.png`

### マップ
- 実装・正式画像: `map_<no>_<slug>.png`
- 昼夜差分: `map_18_starting_place_day.png`, `map_18_starting_place_night.png`
- 参考画像: `map_<no>_<slug>_reference.png`
- ワールドマップ参考: `world_map_reference.png`

### 戦闘背景
- `battle_bg_grassland.png`
- `battle_bg_forest.png`
- `battle_bg_forest_alt.png`
- `battle_bg_cave.png`
- `battle_bg_boss.png`

### UI / タイトル / 宣伝
- `ui_common.png`
- `ui_card_gacha.png`
- `logo_main_transparent.png`
- `package_front.png`
- `package_back.png`
- `poster_retro_rpg.png`

## Library → GitHub 取り込み手順
1. Libraryから画像をローカルの一時フォルダへ保存する。
2. `python tools/asset_intake.py <画像フォルダ>` を実行し、CSV監査表を作る。
3. `duplicate` は取り込まない。
4. `mapped` は `assets/rename_overrides.json` の正式パスを使用する。
5. `needs_review` は `assets/_inbox/raw/` の安定名で保持する。
6. 内容確認後、`docs/ASSET_INDEX.md` に正式名を登録してから正式フォルダへ移す。
7. PNG本体がGitHubに存在することを確認して初めて `IN_GITHUB` とする。

## 禁止
- `(1)(2)(3)` をバージョン管理として残す
- UUIDをPhaserのasset keyやファイルパスに使う
- 日本語ファイル名をゲームコードから直接参照する
- 画像内容を未確認のまま、モンスター名・地名・カード番号を推測して命名する
- 同じ画像を複数フォルダへコピーして正本を増やす

## Phaser asset key
ファイルパスとは別に、Phaser側のkeyはドット区切りとする。

- `char.protagonist.walk`
- `char.tarosa.walk`
- `map.18.starting_place.night`
- `battle.bg.forest`
- `card.002.tamago_ghost`

コード側は可能な限りasset manifestを参照し、画像パスを各Sceneへ直書きしない。
