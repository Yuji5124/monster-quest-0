# Monster Quest 0 Audio Assets

このフォルダは『Monster Quest 0 ～幻の冒険の書～』の音楽・効果音・音声素材の正式置き場です。

## 推奨構成

```text
assets/audio/
├─ music/       # BGM・ジングル
├─ sfx/         # 効果音
└─ source/      # 元データ・書き出し前素材・参考音源
```

## 命名ルール

- 半角英数字 + `_` の `snake_case`
- 空白、日本語、括弧、`final`、`最新版`、`v2` は使わない
- BGM: `bgm_<scene>.<ext>`
- 効果音: `sfx_<action>.<ext>`
- ジングル: `jingle_<event>.<ext>`
- 別案のみ `_alt` を使う
- バージョン管理はGitで行い、同用途のファイル名は原則固定する

## 例

- `music/bgm_title.ogg`
- `music/bgm_field.ogg`
- `music/bgm_town.ogg`
- `music/bgm_dungeon.ogg`
- `music/bgm_boss.ogg`
- `music/bgm_final_battle.ogg`
- `music/bgm_ending.ogg`
- `sfx/sfx_menu_confirm.wav`
- `sfx/sfx_battle_hit.wav`

内容や用途が未確定の音源は、正式名を推測で付けず `assets/_inbox/` に一時保管する。
