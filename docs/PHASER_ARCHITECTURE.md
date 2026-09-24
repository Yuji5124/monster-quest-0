# モンスタークエスト0 Phaser実装アーキテクチャ

最終更新: 2026-09-20 JST

## 1. 目的
Claude Code / Codex / Phaser Game Agentが、同じ責務分離で実装するための基準。
最優先資料は `PROJECT_STATUS.md` とする。

## 2. 基本原則
- Phaser 3 / Phaser Game Agentを基本制作基盤とする
- ASRSは使用しない
- 汎用RPGエンジンを新規開発しない
- 汎用RPGエンジンや汎用マップエディタを作らない。将来のMQ0 Map Editorは、`BACKGROUND` / `COLLISION` / `EVENT` / `OBJECT`だけを扱う小さな制作補助ツールに限定する
- 初見約4時間30分 / 寄り道込み約5時間30分の本編完成を最優先する
- AI 80% + 人間の視覚・テンポ調整20%
- iPhone Safariを後付け対応にしない
- 既存の正式素材を優先し、仮素材への置換を避ける
- 例外（2026-09-23ユーザー指示「レインランドじょう3D」）: 3D表示が必要なScene（現在は`RainlandCastle3DScene`だけ）に限り**three.js**（`three@0.186.0`、固定）を使う。three.jsは`await import("three")`でそのSceneに入ったときだけ読み込み（ビルドでは別チャンク）、Phaserの描画・入力・UI・Scene管理は置き換えない。three.jsはオフスクリーンのCanvasへ描き、PhaserがそのCanvasをテクスチャとして毎フレーム更新して表示する（会話ウィンドウ・メニュー・タッチ操作はPhaserのまま）。歩ける場所・NPC・Eventは2Dと同じデータ（`collision.png`・`maps.ts`・`events.json`）を使い、3D専用の判定やマップデータを作らない。Sceneを離れるとWebGLコンテキストを確実に解放する（iPhone Safariのコンテキスト数上限対策）。WebGLが使えない場合は同じ場所の2Dへ戻す。

## 3. Scene責務
### BootScene
- 初期化
- 設定読み込み
- 必須アセット読み込み
- エラーを把握できるログ

### OpeningIntroScene
- 起動直後の導入: 「Produced by ARROWARE」（約3秒）→ 回想の1枚絵6枚（約10秒）→ TitleScene
- 回想画像は演出中に裏で読み込み、終了時にテクスチャを解放する（iPhone Safariのメモリ配慮）
- 何かボタン（タップ）でTitleSceneのメニュー（はじめから／つづきから）へ直行
- 秒数・並び・画像は`src/config/openingIntro.ts`

### TitleScene
- タイトル
- はじめから
- つづきから
- ジャンカードガチャ
- ジャンカード図鑑
- たびのあいことば
- 設定

### OpeningGlitchScene
- 「はじめから」後の5秒の起動ノイズ
- 黒背景のプログラム断片・デジタルノイズ・完全な暗闇を順に表示する。背景・タイトル・人物・マップアセットはロードしない
- 入力・セーブ・進行フラグを変更せず、終了時は`StartingPlaceScene`の`openingSequence`へ一度だけ引き渡す

### WorldScene
- 町 / 村 / 城 / ダンジョン等のローカルマップ移動
- プレイヤー移動
- NPC / オブジェクト
- 衝突
- イベント起動
- エンカウント要求

ワールドマップは目的地ポイントを選択する専用画面として扱う。巨大な徒歩フィールドをWorldSceneの標準責務にしない。既存`FieldScene`はlegacy実装として保持する。

戦闘計算そのものは持たせない。

### BattleScene
- 戦闘表示
- コマンド入力
- ターン進行
- 敵AI呼び出し
- 勝敗表示

### MenuScene
- ステータス
- アイテム
- 魔法
- 装備
- ジャンカード閲覧
- 設定

### GameOverScene
- 全滅処理
- 安全な再開導線

## 4. System責務
### EventSystem
会話、宝箱、フラグ、ワープ、仲間加入、戦闘開始を統一管理する。

### EncounterSystem
エリア別出現表、エンカウント判定、敵編成を管理する。

### BattleSystem
ダメージ、ターン順、状態、戦闘不能、経験値、レベルアップを管理する。

### SaveSystem
セーブ / ロード / version / migration / 壊れたデータへの安全対応を管理する。

### AudioSystem
BGM / SE / 音量 / Scene切替時の二重再生防止を管理する。

### InputSystem
キーボード / タッチ / iPhone Safari入力を統一する。

### Camera(2026-09-13 Phase 8.5追加)
通常の歩行ローカルマップ(町/村/ダンジョン/城等)では、主人公をCameraが追従する方式を基本とする。
マップサイズがViewport(960×720)以内の場合はCamera boundsとViewportが一致し、実質固定画面のままでよい。小規模Interiorは固定Cameraのままでよい。
CameraはPlayerより遅れてふわっと追従させず、原則lerp=1の即時追従とする。
巨大なCameraManagerクラスは作らず、`src/systems/MapCamera.ts`の`configureMapCamera(scene, target, bounds)`程度の小さな共通関数に留める。Player側(移動・向き・Body)とCamera側(Scene or 小さなCamera helper)の責務を分離し、`Player.ts`へカメラ処理を追加しない。

## 5. データ駆動
以下は原則コードへ直書きしない。
- モンスター基本値
- アイテム基本値
- 魔法基本値
- NPC会話
- エンカウント表
- 宝箱中身
- マップ接続
- ジャンカード45枚
- ストーリー進行条件

## 6. 状態管理
- GameData: 固定定義
- GameState: セーブ対象となる進行状態
- SceneState: 画面内だけの一時状態

固定定義をプレイ中に直接書き換えない。

## 7. イベントフラグ
用途が分かる名前で一元管理する。
例:
- `story.*`
- `party.*`
- `boss.*`
- `chest.*`
- `npc.*`
- `cards.*`

`flag1` `tmp2` のような名前は禁止。

## 8. マップ
- マップごとの専用コードを増やしすぎない
- [MAP_SYSTEM.md](MAP_SYSTEM.md) を正とし、`BACKGROUND` / `COLLISION` / `EVENT` / `OBJECT`の4レイヤーを統一する
- 高解像度背景画像を正本とし、Phaserは制作時に生成・人間修正済みのCollisionデータだけを読み込む。実行中のAI画像解析は禁止する
- 背景の元画像座標をCollision、Event、Objectの共通座標系とし、Sceneへ座標を散在させない
- 新規ローカルマップをTiled / 32×32タイル背景前提で実装しない。既存Tiled runtimeは互換性のため保持する
- AIで初期マスク・下案を作り、人間が道・木・建物・余白・Collisionを調整する

## 9. アセット
- `ASSET_INDEX.md` と `assets/asset_catalog.json` を確認する
- `READY_TO_IMPORT` と `IN_GITHUB` を混同しない
- 存在しない画像を存在する前提で実装しない
- 正式キャラをAIが勝手に再デザインしない

## 10. 禁止パターン
- 1ファイルへ全機能を詰め込む
- 町ごとに戦闘処理を複製する
- 特定ボス用処理で共通戦闘を破壊する
- Phaserオブジェクトをそのままセーブする
- 実際のフリーズやデータ破損を演出として使う
- Vertical Slice完成前に全地域を量産する

## 11. 判断原則
高度な汎用設計より、モンスタークエスト0を短期間で完成できる単純・再利用可能・検証しやすい構造を選ぶ。
