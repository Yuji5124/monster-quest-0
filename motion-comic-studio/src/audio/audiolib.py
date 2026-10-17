"""Small numpy audio toolkit shared by voice, BGM, SFX and mix scripts (no paid deps)."""
import wave

import numpy as np

SR = 48000


def read_wav(path):
    w = wave.open(path)
    sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
    data = w.readframes(w.getnframes())
    assert sw == 2, "16-bit PCM expected"
    x = np.frombuffer(data, np.int16).astype(np.float32) / 32768.0
    if ch > 1:
        x = x.reshape(-1, ch).mean(1)
    return x, sr


def read_wav_stereo(path):
    w = wave.open(path)
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768.0
    x = x.reshape(-1, w.getnchannels())
    return x if x.shape[1] == 2 else np.repeat(x, 2, 1)


def write_wav(path, x, sr=SR):
    """Write mono (N,) or stereo (N,2) float audio as 16-bit PCM."""
    x = np.asarray(x, np.float32)
    ch = 1 if x.ndim == 1 else x.shape[1]
    w = wave.open(path, "wb")
    w.setnchannels(ch)
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
    w.close()


def resample(x, sr_in, sr_out):
    if sr_in == sr_out:
        return x
    n = int(round(len(x) * sr_out / sr_in))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def robot_fx(x, ringHz=55, ringDepth=0.12, combMs=4.5, combGain=0.22):
    """Light robot colour: subtle ring modulation + short metallic comb. Keeps speech intelligible."""
    t = np.arange(len(x)) / SR
    y = x * (1 - ringDepth + ringDepth * np.sin(2 * np.pi * ringHz * t))
    d = int(SR * combMs / 1000)
    z = y.copy()
    z[d:] += combGain * y[:-d]
    return z.astype(np.float32)


def trim_silence(x, thresh=0.01, pad=0.03):
    idx = np.where(np.abs(x) > thresh)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(pad * SR))
    b = min(len(x), idx[-1] + int(pad * SR))
    return x[a:b]


def envelope(x, fps=30):
    """Per-video-frame loudness 0..1 used for lip flaps and robot eye glow."""
    hop = SR // fps
    n = int(np.ceil(len(x) / hop))
    rms = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(n)])
    rms = rms / max(1e-6, np.percentile(rms, 95))
    return [round(float(v), 3) for v in np.clip(rms, 0, 1)]


# ---------- synthesis helpers (BGM / SFX) ----------

def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    s_len = max(0, n - a - d - r)
    env = np.concatenate([np.linspace(0, 1, a, False), np.linspace(1, s, d, False),
                          np.full(s_len, s), np.linspace(s, 0, r)])
    return np.pad(env, (0, max(0, n - len(env))))[:n]


def noise(n, seed=0):
    return np.random.default_rng(seed).standard_normal(n).astype(np.float32)


def onepole_lp(x, hz):
    a = np.exp(-2 * np.pi * hz / SR)
    from scipy.signal import lfilter  # scipy is free (BSD); used only for speed
    return lfilter([1 - a], [1, -a], x).astype(np.float32)


def bandpass(x, lo, hi, order=2):
    from scipy.signal import butter, sosfilt
    sos = butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return sosfilt(sos, x).astype(np.float32)


def highpass(x, hz, order=2):
    from scipy.signal import butter, sosfilt
    return sosfilt(butter(order, hz, btype="high", fs=SR, output="sos"), x).astype(np.float32)


def lowpass(x, hz, order=2):
    from scipy.signal import butter, sosfilt
    return sosfilt(butter(order, hz, btype="low", fs=SR, output="sos"), x).astype(np.float32)


def reverb(x, seconds=2.0, wet=0.3, seed=7, damp=6000):
    """Convolution reverb with a synthetic decaying-noise impulse (stereo out)."""
    from scipy.signal import fftconvolve
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = []
    for ch in range(2):
        ir = noise(n, seed + ch) * np.exp(-t * 6.9 / seconds)
        ir = lowpass(ir, damp)
        ir /= np.sqrt((ir ** 2).sum())
        out.append(fftconvolve(x, ir)[:len(x)])
    wetsig = np.stack(out, 1) * wet
    return (np.stack([x, x], 1) * (1 - wet) + wetsig).astype(np.float32)


def place(buf, sig, t, gain=1.0):
    """Mix sig (mono or stereo) into buf (stereo) at time t seconds."""
    i = int(t * SR)
    if i >= len(buf):
        return
    if sig.ndim == 1:
        sig = np.stack([sig, sig], 1)
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[:j - i] * gain


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)
