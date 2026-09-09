# monster-quest-0

モンスタークエスト0 ～幻の冒険の書～

最終更新: 2026-09-09 19:22 JST

## 現在の正式方針
- 想定プレイ時間: 約5時間
- 主要パーティ: 主人公・タロサ・ミレイ
- モンスター: 全25体
- ジャンカード: 全45枚
- 実装中心: Phaser 3
- 対応方針: Webブラウザ / iPhone操作を意識
- ジャンカードは独立したサブゲームで、本編攻略必須にしない
- 公開用資料では終盤ネタバレを伏せる

## AI作業開始時に読むもの
1. `docs/GAME_SPEC.md`
2. `docs/ASSET_INDEX.md`
3. `docs/IMAGE_SPEC.md`
4. `docs/CARD_SPEC.md`
5. `assets/README.md`
6. `assets/asset_catalog.json`

## 画像アセット
画像の正式ファイル名・配置先は `docs/ASSET_INDEX.md` を正本とする。
実装用画像は `assets/` 以下に整理する。

現在の戦闘背景セット:
- 草原
- 森
- 洞窟
- 城・城下町周辺
- 雪原
- 砂漠・遺跡
- ダンジョン
- ダンジョン別案
- ボス戦
- ボス戦別案

ChatGPT内で生成済みでも、PNG本体がGitHub上の正式パスに存在するまでは `IN_GITHUB` と扱わない。
