# NPC地域別会話

最終更新: 2026-09-11 JST

このフォルダは、町・村ごとの**実装用NPC会話の正本**を置く場所。

## 1. 上位ルール
先に以下を読む。
1. `../PROJECT_STATUS.md`
2. `../STORY_FLOW.md`
3. `../MAP_FLOW_SPEC.md`
4. `../NPC_SPEC.md`
5. `../TBD_REGISTRY.md`

## 2. 最新方針
- 旧会話案のNPC人数をそのまま実装しない。
- 町・村サイズ、NPC人数とも旧案より全体的に約半分程度へ圧縮する。
- 作成済み台詞は捨てず、統合・選抜・短縮して活かす。
- 全員を攻略ヒント役にしない。
- 全員を主要人物の説明役にしない。
- タロサ関連地域でも、タロサに興味の薄い普通の住民を入れる。
- 生活、地域、事件、攻略、人物関係、遊びを少人数でバランス配置する。

## 3. ステータス
- `SOURCE_DRAFT_EXISTS`: 過去会話原案あり。再編集前。
- `REDUCING`: 最新の小規模方針へ選抜・統合中。
- `DIALOGUE_READY`: 実装用本文確定。
- `IMPLEMENTED`: Phaser / dataへ実装済み。
- `PLAYTESTED`: 実機で会話テンポ確認済み。

## 4. 現在
- `01_hajimari_no_machi.md` — SOURCE_DRAFT_EXISTS / REDUCING
- `02_bie_no_mura.md` — SOURCE_DRAFT_EXISTS / REDUCING
- `03_rainland_no_machi.md` — SOURCE_DRAFT_EXISTS / REDUCING
- `04_rainland_castle.md` — 次に新規制作

## 5. 地域ファイルに持たせる項目
- 地域の役割
- その時点のストーリー状態
- NPC目標人数（確定前はTBD）
- NPC役割配分
- 各NPCのID
- 表示上の人物タイプ
- 通常会話
- 進行後会話
- 必要フラグ
- 与える情報
- 与えてはいけないネタバレ
- 実装状態

## 6. 注意
過去の会話原案が存在することと、現在の実装本文が確定していることは別。
地域ファイルに本文を移す際は、最新の小規模化・話題バランス調整を先に行う。
