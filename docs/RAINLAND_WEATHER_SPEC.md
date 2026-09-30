# レインランドのもり 天候・戦闘連携仕様

最終更新: 2026-09-28 JST

## 1. 目的

正式No.05「レインランドのもり」は、背景画像を複数枚作り直さず、画像マップの上に軽量なWeather Layerを重ねる。天候は単なるループ演出ではなく、探索距離で進むセーブ可能なゲーム状態とする。

この地域の違和感は「世界が壊れている」ことではない。普通のRPGの森なのに、雨・霧・風だけが妙に生々しく移り変わることに置く。終盤用のGlitch表現、文字化け、偽エラー、セーブ消失は使用しない。

## 2. 状態遷移

`overcast` → `drizzle` → `fog` → `heavyRain` → `thunderstorm` → `clearing`

- No.05の2マップで同じ状態を共有する。
- 実際の徒歩距離でのみ進む。放置、会話、メニュー、戦闘中には進めない。
- `map.rainlandForestWeather`へフェーズと現フェーズ内の距離を保存する。旧セーブでは`overcast`から始める。
- 距離と見た目の強度はすべて`TEMP_VISUAL_VALUE`で、人間がプレイ感に合わせて調整する。

## 3. フィールド表示

- 薄曇り: 青灰色の色調と、ごく薄い靄。
- 小雨: 少数の斜め雨粒と地面の小さな輪。
- 霧: 画面を塞がない低い霧。Collision・出入口・NPC表示は変えない。
- 強い雨: 雨量、横風、横へ流れる葉、Rippleを増す。
- 雷雨: 予兆の淡い白色フラッシュから0.2秒後に落雷の視覚効果。未登録音源を使った疑似SEは作らない。
- 雨上がり: 雨を減らし、薄い木漏れ日を追加する。

すべて通常のPhaser Graphicsで30fps上限の再描画に留める。iPhone Safari／`prefers-reduced-motion`では粒数を減らし、激しい移動を抑える。正本の背景PNG、Collision、Event、Objectは変更しない。

## 4. BattleWeatherBridge

ランダム遭遇時、`BattleWeatherBridge`はフィールドの天候状態を不変スナップショットとして`BattleScene`へ渡す。戦闘SceneがフィールドSceneや描画レイヤーを保持しないため、逃走・敗北・勝利・再入場で状態が残留しない。

- 小雨: 見た目のみ。戦闘ルールは通常どおり。
- 霧: 敵は最初の有効なコマンド解決までシルエット。数値、敵AI、行動順は変更しない。
- 強い雨／雷雨: 敵の小さな横風の揺れ、葉、雨、Rippleを重ねる。
- 雷雨: 4回ごとの有効なコマンドに予兆→落雷の視覚効果を重ねる。ダメージは未確定のためBattleSystemへ加えない。
- 雨上がり: 背景・敵の前、HUDの後ろに軽量な木漏れ日を描く。

戦闘のHP、ダメージ式、報酬、エンカウント率には影響させない。雷に数値ダメージを持たせる場合は、対象・予告ターン・軽減手段・数値を`BATTLE_SPEC.md`で確定してからBattleSystemへ追加する。

## 5. 参考実装からの判断

- [Atmosphere](https://github.com/takustaqu/atmosphere) の、観測値を滑らかに補間する考え方をフェーズごとの色・雨量・風・視界へ読み替える。
- [Procedural Weather Three.js](https://github.com/CK42BB/procedural-weather-threejs) の状態機械／遷移ルーティングを、保存状態と`BattleWeatherBridge`へ読み替える。
- [Phaser Particles](https://github.com/adcoding/phaser-particles) のStorm表現は、Phaser上で雨・閃光・揺れを分離できる参考にする。ただしMQ0では少数のGraphicsで代替する。
- [Amado](https://github.com/Oililyuk/amado) の雨滴屈折は、文章／コマンドUIの可読性を損ねるため採用しない。
- [GLSL God Rays](https://github.com/Erkaman/glsl-godrays) は遮蔽テクスチャを含む複数パスを要求する。No.05の一枚絵背景には遮蔽マスクが無いため、雨上がりだけ軽い帯状の木漏れ日に限定する。

## 6. 未確定・次工程

- 雨・風・雷の正式SE／環境音素材と音量。現行は`audio.noAudio`かつ正式素材未登録のため、音は実装しない。
- 各フェーズの徒歩距離、色、粒数、木漏れ日の位置。人間の視覚調整が必要。
- 雷を数値ダメージにするか、する場合の戦闘ルール。
- 一枚絵の樹木そのものを揺らすための前景マスク。現状は葉と風の流れで表現し、背景を歪ませない。
