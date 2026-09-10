# モンスタークエスト0 画像制作仕様

最終更新: 2026-09-10 13:50 JST

## 基本方針
- 実ゲームで使う完成版アセットを優先する。
- 既存ゲームの背景・構図・タイル・配色を直接模倣しない。完全オリジナルを維持する。
- フィールドマップ・歩行キャラクター・UIは、FC〜初期SFCを感じるレトロゲーム表現を基本とする。
- **戦闘背景・探索／イベント背景は、従来の単純なFC風背景から「高品質な2D JRPG／アニメ背景」方向へ方針転換済み。**
- 「全部を16bit化する」のではなく、ドットのキャラクターと高品質背景を組み合わせ、画面全体の見栄えを上げる。
- キャラクター・モンスター・カード中央絵は必要に応じて背景透明PNG。
- 公開用画像では終盤ボスなどのネタバレ対象を伏せる。

## 正式な管理先
- 画像の正式ファイル名・配置先・状態: `docs/ASSET_INDEX.md`
- フォルダ構成・命名ルール: `assets/README.md`
- Phaser/AI向け機械可読一覧: `assets/asset_catalog.json`

## 命名
- 半角英数字 + `_` の snake_case。
- 日本語、空白、括弧、`final`、`最新版`、`v2` は使わない。
- 明確な別案のみ `_alt` を使用する。
- 差し替え時も同用途なら同じファイル名を維持し、履歴はGitで管理する。

## キャラクター
### 主要パーティ
主要パーティは主人公・タロサ・ミレイの3人。
- `assets/characters/playable/hero_walk.png`
- `assets/characters/playable/tarosa_walk.png`
- `assets/characters/playable/mirei_walk.png`

### 補助・イベントキャラクター
- `assets/characters/support/watabe_walk.png`

### NPC
- `assets/characters/npc/npc_01.png` ～ `npc_10.png`
- NPC会話の地域別設計は `docs/NPC_SPEC.md` を参照する。

## タイル・マップ
- `assets/maps/tilesets/tileset_base.png`
- `assets/maps/tilesets/tileset_extra.png`
- `assets/maps/reference/world_map_reference.png`
- フィールドマップ側はドット／タイルベースを維持する。

## 戦闘背景
### 現在の基本セット
- `assets/battle/backgrounds/battle_bg_grassland.png`
- `assets/battle/backgrounds/battle_bg_forest.png`
- `assets/battle/backgrounds/battle_bg_forest_alt.png`
- `assets/battle/backgrounds/battle_bg_cave.png`
- `assets/battle/backgrounds/battle_bg_castle_town.png`
- `assets/battle/backgrounds/battle_bg_snowfield.png`
- `assets/battle/backgrounds/battle_bg_desert_ruins.png`

### ダンジョン・ボス
- `assets/battle/backgrounds/battle_bg_dungeon.png`
- `assets/battle/backgrounds/battle_bg_dungeon_alt.png`
- `assets/battle/backgrounds/battle_bg_boss.png`
- `assets/battle/backgrounds/battle_bg_boss_alt.png`

### 高品質背景の制作ルール
- 戦闘画面専用素材は、イメージイラストではなくゲーム組み込み前提で作る。
- 高品質な日本製JRPG／アニメ背景を感じる2D表現。ただし既存作品は直接模倣しない。
- 自然色は鮮やかにし、奥行きは atmospheric perspective を使って感じさせる。
- 「detailed but readable」を共通基準とする。
- 探索・イベント背景は高描き込みでよい。
- 戦闘背景の情報量は探索背景の約70〜80%を目安に抑える。
- 敵が立つ画面中央域はさらに約50〜60%程度の情報量に整理する。
- 中央の輪郭・強いコントラスト・細かい装飾を減らし、敵キャラクターを最前面で読みやすくする。
- UIが載る下部も重要な情報を置きすぎない。
- 同一エリアの背景は配色・地形・光源の方向性を統一する。

## UI
- `assets/ui/ui_common.png`
- `assets/ui/ui_card_gacha.png`
- UIは背景の高品質化に合わせて過度に豪華にせず、ファミコン風の読みやすい枠・文字・コマンド感を維持する。

## タイトル・宣伝
- `assets/title/logo_main_transparent.png`
- `assets/title/title_background.png`
- `assets/promo/poster_retro_rpg.png`
- `assets/promo/package_front.png`
- `assets/promo/package_back.png`

正式サブタイトルは「～幻の冒険の書～」。
「誰も知らないゲーム、やってみる？」は広告・紹介用コピーとして扱う。

### ロゴ
- 背景透明PNGを正式版とする。
- 「幻の冒険の書」はロゴ周辺に抽象的なモチーフとして入れる。
- 既存RPGロゴの直接模倣に見えない構成とする。
- 赤文字は繊細な赤系グラデーションを基本とする。
- 下部のカタカナ表記も全体デザインに統合する。

## モンスター
- 正式総数は25体。
- 実装用: `assets/monsters/battle/monster_01_<name>.png` ～ `monster_25_<name>.png`
- 原資料: `assets/monsters/source/`
- 公開用資料では終盤ネタバレ対象の姿・名前を掲載しない。

## ジャンカード
- 正式総数は45枚。
- 完成カード: `assets/cards/full/card_001_<name>.png` ～ `card_045_<name>.png`
- 中央絵透過素材: `assets/cards/art/card_art_001_<name>.png` ～ `card_art_045_<name>.png`
- カード中央絵抽出では、元カードのデザイン・色・表情・装備・模様を維持し、勝手な描き足しをしない。
- ネタバレカードは公開時に `？？？` 表記を使用できる。

## 実装
- Phaser 3をゲーム実装の中心とする。
- Phaser Game Agentを基本実装担当として使う。
- Phaserコードへ画像パスを大量に直書きしない。
- preload / asset manifestへ集約する。
- 画像差し替えだけで更新できる構成を優先する。
- iPhone実機ではHTTPS公開（GitHub Pages等）を前提に検証する。

## 制作フロー
- 目安は **80% AI制作 + 20% 人間の視覚調整**。
- まずGitHub内のMD仕様を厚くし、AIが方針・名前・ルールを読み取れる状態にする。
- その後ローカルへクローンし、Phaser Game Agent / Codex / Claude Codeで実装・整理する。
- ASRSは使用しない。

## AI担当
- ChatGPT: 仕様整理、画像仕様、生成、正式命名。
- Phaser Game Agent: Phaser実装の基本担当。
- Codex / Claude Code: 複数ファイル修正、参照パス更新、デバッグ、検証。
