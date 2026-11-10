# 曲から「オーケストラの動き」に使う数字を取り出す：テンポ、1拍めの位置、音の大きさの流れ、太鼓の強い打点、高い音（ベル・シンバル）の打点
# 使い方（ffmpeg と numpy・scipy がいる）：  python3 score.py このフォルダ（title.mp3 と finale.mp3 があるところ）
#   → score.json ができる。中身を、sugoroku/index.html の「const SCORE = 」のところに入れる（幕あけ・幕おろしのオーケストラが使う）
# 曲を作り直したら、取り出し直す。フィナーレで楽器が加わる時間（SCORE.finale.arr）は、音を調べて手で決めてあるので、そこも見直す
import sys, subprocess, json
import numpy as np
from scipy.signal import stft

def load(path, sr=22050):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32), sr

def analyse(path, bpm_lo, bpm_hi, end=None):
    x, sr = load(path); hop = 256; fr = sr / hop
    f, t, Z = stft(x, sr, nperseg=1024, noverlap=1024 - hop)
    A = np.abs(Z); S = np.log1p(50 * A)
    d = np.maximum(0, np.diff(S, axis=1))
    flux = d.sum(axis=0); flux = np.maximum(0, flux - np.convolve(flux, np.ones(43) / 43, mode='same'))
    n = len(flux)
    def comb(bpm, ph, seg=(0, n)):
        per = 60 / bpm * fr; idx = np.arange(seg[0] + ph, seg[1] - 1, per)
        return np.interp(idx, np.arange(n), flux).mean() if len(idx) else 0
    best = (0, 0, 0)
    for bpm in np.arange(bpm_lo, bpm_hi + 1e-9, 0.02):
        per = 60 / bpm * fr
        for ph in np.arange(0, per, 1.0):
            v = comb(bpm, ph)
            if v > best[0]: best = (v, bpm, ph)
    _, bpm, ph = best; per = 60 / bpm * fr
    # 区間ごとの位相（ずれていかないかの確認）
    drift = []
    for a in range(0, n - int(20 * fr), int(20 * fr)):
        seg = (a, a + int(20 * fr)); k0 = np.ceil((a - ph) / per)
        cands = [(comb(bpm, ph + k0 * per - a + dph, (a, seg[1])) , dph) for dph in np.arange(-per / 2, per / 2, 0.5)]
        drift.append(round(max(cands)[1] / fr, 3))
    # 音の大きさ（0.5秒ごと、dB→0〜1）
    env_hop = int(sr * .5); m = len(x) // env_hop
    rms = np.sqrt((x[:m * env_hop].reshape(m, env_hop) ** 2).mean(axis=1))
    db = 20 * np.log10(np.maximum(rms, 1e-5) / rms.max())
    L = np.clip((db + 20) / 20, 0, 1)        # -20dB→0, 0dB→1
    # 帯域ごとの打点
    def hits(lo, hi, k, gap):
        band = (f >= lo) & (f < hi)
        fl = d[band].sum(axis=0); fl = np.maximum(0, fl - np.convolve(fl, np.ones(87) / 87, mode='same'))
        th = fl.mean() + k * fl.std(); out = []; last = -9
        for i in range(2, len(fl) - 2):
            if fl[i] > th and fl[i] >= fl[i - 2:i + 3].max() and i / fr - last >= gap:
                out.append(round(i / fr, 2)); last = i / fr
        return out
    low = hits(30, 140, 2.2, .28); high = hits(5000, 11000, 2.6, .22)
    dur = len(x) / sr
    return dict(bpm=round(float(bpm), 2), t0=round(float(ph / fr), 3), dur=round(dur, 1), end=end or round(dur, 1),
                L=[round(float(v), 2) for v in L], low=low, high=high), drift, best[0]

out = {}
for name, lo, hi, end in (('title', 102, 106, 84), ('finale', 74.5, 77.5, 158)):
    r, drift, v = analyse(sys.argv[1] + '/' + name + '.mp3', lo, hi, end)
    out[name] = r
    print(name, 'bpm', r['bpm'], 't0', r['t0'], 'score %.2f' % v, 'drift per 20s:', drift)
    print('   low hits', len(r['low']), r['low'][:14]); print('   high hits', len(r['high']), r['high'][:14])
    print('   L', ''.join('%d' % min(9, int(v * 10)) for v in r['L']))
json.dump(out, open('score.json', 'w'), separators=(',', ':'))
print(len(open('score.json').read()), 'bytes')
