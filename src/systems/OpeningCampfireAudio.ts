/**
 * No.01冒頭だけの、音楽ではない環境音レイヤー。
 * 正式な火・風・水のSE素材はまだ登録されていないため、既存BGMを流用せず、
 * ユーザーの「はじめから」操作で起動したWeb Audioの小さなノイズ音だけを使う。
 */
type WebAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export class OpeningCampfireAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private fireGain?: GainNode;
  private windGain?: GainNode;
  private waterGain?: GainNode;
  private crackleTimer?: number;

  /** iPhone Safariの自動再生制限を避けるため、タイトルの決定入力中にだけ呼ぶ。 */
  prepareFromUserGesture(): void {
    if (typeof window === "undefined") return;
    try {
      if (!this.context || this.context.state === "closed") this.createGraph();
      void this.context?.resume().catch(() => undefined);
    } catch {
      // 音声を許可しないブラウザでは、視覚演出だけを正常に続行する。
    }
  }

  startFireAndWind(): void {
    if (!this.context || !this.fireGain || !this.windGain) return;
    this.ramp(this.fireGain.gain, 0.055, 900);
    this.ramp(this.windGain.gain, 0.012, 1500);
    this.scheduleCrackle();
  }

  /** 操作解放後もBGMを足さず、近い水音だけを小さく追加する。 */
  enableFieldAmbience(): void {
    if (!this.waterGain) return;
    this.ramp(this.waterGain.gain, 0.011, 1200);
  }

  stop(): void {
    if (this.crackleTimer !== undefined && typeof window !== "undefined") {
      window.clearInterval(this.crackleTimer);
      this.crackleTimer = undefined;
    }
    const context = this.context;
    this.context = undefined;
    this.master = undefined;
    this.fireGain = undefined;
    this.windGain = undefined;
    this.waterGain = undefined;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  }

  private createGraph(): void {
    const webAudioWindow = window as WebAudioWindow;
    const AudioContextConstructor = window.AudioContext ?? webAudioWindow.webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const master = context.createGain();
    master.gain.value = 0.58;
    master.connect(context.destination);

    this.context = context;
    this.master = master;
    this.fireGain = this.createNoiseLayer(620, 0.75);
    this.windGain = this.createNoiseLayer(180, 0.3);
    this.waterGain = this.createNoiseLayer(1050, 0.42);
  }

  private createNoiseLayer(frequency: number, q: number): GainNode {
    const context = this.context!;
    const noise = context.createBufferSource();
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    noise.loop = true;

    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = q;

    const gain = context.createGain();
    gain.gain.value = 0;
    noise.connect(filter).connect(gain).connect(this.master!);
    noise.start();
    return gain;
  }

  private ramp(gain: AudioParam, target: number, durationMs: number): void {
    const context = this.context;
    if (!context) return;
    const now = context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(target, now + durationMs / 1000);
  }

  private scheduleCrackle(): void {
    if (this.crackleTimer !== undefined || typeof window === "undefined") return;
    this.crackleTimer = window.setInterval(() => this.playCrackle(), 1250);
    this.playCrackle();
  }

  private playCrackle(): void {
    const context = this.context;
    if (!context || context.state !== "running") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(1300 + Math.random() * 900, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.018, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    oscillator.connect(gain).connect(this.master!);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }
}

export const openingCampfireAudio = new OpeningCampfireAudio();
