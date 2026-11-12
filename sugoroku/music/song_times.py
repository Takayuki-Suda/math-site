# 歌（song_a・song_b・song_c）から、オープニングの絵と字幕に使う時刻を取り出す：
#   テンポと1拍めの位置、強い音の打点、声の切れ目（息つぎ）、歌詞のことばごとの歌い出しの時刻
# 取り出した数字は、sugoroku/index.html の SongFx（CUT＝場面の切りかわり、LINES＝歌詞の時刻、T0・BEAT）と、
# SONG_END（さいごの音）、PHOTO_AT（記念写真の歌の時刻）に、手で入れる。歌を作り直したら、取り出し直して、入れ直す。
#
# 使い方（ffmpeg と numpy・scipy・soundfile・sherpa-onnx がいる。pip install sherpa-onnx soundfile）
#   python3 song_times.py beat  song_b.mp3            … テンポ・1拍め・ずれ・打点・音の大きさの流れ
#   python3 song_times.py vocal song_b.mp3 モデルの場所  … 声だけを取り出して（song_b_vocal.wav）、切れ目と、ことばごとの時刻を出す
# モデル（sherpa-onnx の GitHub の Releases から。合わせて約 300MB）を、同じフォルダに置く：
#   source-separation-models / UVR-MDX-NET-Voc_FT.onnx                              （声と伴奏を分ける）
#   asr-models / sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17.tar.bz2 を開いたフォルダ （聞き取り。1文字ごとの時刻が出る）
# 聞き取りは、歌だと聞きまちがいが多い（「ひとりじゃ」→「心じゃ」など）。時刻を知るために使い、ことばは台本と見くらべる。
# 2026-11-12 の song_b：150.0拍/分、1拍め 0.012秒、さいごの音 54.21秒。台本の「ここに立っている」は歌っていなかった。
import sys, subprocess
import numpy as np
from scipy.signal import stft, resample_poly

def load(path, sr=22050, ch=1):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', str(ch), '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    return (x if ch == 1 else x.reshape(-1, ch).T.copy()), sr

def beat(path, lo=70, hi=200):
    x, sr = load(path); hop = 256; fr = sr / hop
    f, t, Z = stft(x, sr, nperseg=1024, noverlap=1024 - hop)
    d = np.maximum(0, np.diff(np.log1p(50 * np.abs(Z)), axis=1))
    flux = d.sum(axis=0); flux = np.maximum(0, flux - np.convolve(flux, np.ones(43) / 43, mode='same')); n = len(flux)
    def comb(bpm, ph, a=0, b=n):
        idx = np.arange(a + ph, b - 1, 60 / bpm * fr); return np.interp(idx, np.arange(n), flux).mean() if len(idx) else 0
    def best(lo, hi, step):
        out = (0, 0, 0)
        for bpm in np.arange(lo, hi + 1e-9, step):
            for ph in np.arange(0, 60 / bpm * fr, 1.0):
                v = comb(bpm, ph)
                if v > out[0]: out = (v, bpm, ph)
        return out
    _, b0, _ = best(lo, hi, .25)                      # あらく → こまかく
    v, bpm, ph = best(b0 - .5, b0 + .5, .01); per = 60 / bpm * fr
    print('テンポ %.2f 拍/分（半分・2倍のこともある。曲を作ったときの数字と見くらべる）　1拍め %.3f 秒　1拍 %.4f 秒' % (bpm, ph / fr, 60 / bpm))
    drift = []
    for a in range(0, n - int(8 * fr), int(8 * fr)):
        c = max((comb(bpm, ph + dph, a, a + int(8 * fr)), dph) for dph in np.arange(-per / 2, per / 2, .25)); drift.append(round(float(c[1] / fr), 3))
    print('8秒ごとの、拍のずれ（秒）:', drift)
    h = int(sr * .1); m = len(x) // h
    db = 20 * np.log10(np.maximum(np.sqrt((x[:m * h].reshape(m, h) ** 2).mean(axis=1)), 1e-6)); ref = db.max()
    print('音の大きさの流れ（1文字 0.1秒・1行 3.2秒）')
    for i in range(0, m, 32): print('  %5.1f秒  %s' % (ph / fr + i * .1, ''.join(' .:-=+*#%@'[int(np.clip((q - ref + 30) / 3.01, 0, 9))] for q in db[i + int(round(ph / fr / .1)):i + int(round(ph / fr / .1)) + 32])))
    def hits(flo, fhi, k, gap):
        fl = d[(f >= flo) & (f < fhi)].sum(axis=0); fl = np.maximum(0, fl - np.convolve(fl, np.ones(87) / 87, mode='same')); th = fl.mean() + k * fl.std(); out = []; last = -9
        for i in range(2, len(fl) - 2):
            if fl[i] > th and fl[i] >= fl[i - 2:i + 3].max() and i / fr - last >= gap: out.append('%.2f' % (i / fr)); last = i / fr
        return out
    print('強い音（ぜんぶの高さ）:', ' '.join(hits(30, 11000, 3.0, .3)))
    print('低い音（太鼓）:', ' '.join(hits(30, 140, 2.2, .28)))

def vocal(path, models):
    import soundfile as sf, sherpa_onnx
    out = path.rsplit('.', 1)[0] + '_vocal.wav'
    # 1) 声だけを取り出す（メモリを使うので、6秒ずつ。つなぎ目は1秒重ねて、なめらかに）
    cfg = sherpa_onnx.OfflineSourceSeparationConfig(model=sherpa_onnx.OfflineSourceSeparationModelConfig(uvr=sherpa_onnx.OfflineSourceSeparationUvrModelConfig(model=models + '/UVR-MDX-NET-Voc_FT.onnx'), num_threads=2, debug=False, provider='cpu'))
    sp = sherpa_onnx.OfflineSourceSeparation(cfg); x, sr = load(path, 44100, 2); res = np.zeros_like(x); ws = np.zeros(x.shape[1]); a = 0; CH, OV = 6, 1
    while a < x.shape[1]:
        b = min(x.shape[1], a + (CH + 2 * OV) * sr); d = np.array(sp.process(sample_rate=sr, samples=np.ascontiguousarray(x[:, a:b])).stems[0].data)[:, :b - a]
        w = np.ones(b - a); r = OV * sr
        if a > 0: w[:r] = np.linspace(0, 1, r)
        if b < x.shape[1]: w[-r:] = np.linspace(1, 0, r)
        res[:, a:a + d.shape[1]] += d * w[:d.shape[1]]; ws[a:a + d.shape[1]] += w[:d.shape[1]]
        if b >= x.shape[1]: break
        a += (CH + OV) * sr
    res /= np.maximum(ws, 1e-6); sf.write(out, res.T, sr); print('声だけの音:', out)
    v = res.mean(axis=0)
    # 2) 声の切れ目（0.12秒より長い切れ目で区切る）
    hop = int(sr * .01); m = len(v) // hop
    e = np.convolve(np.sqrt((v[:m * hop].reshape(m, hop) ** 2).mean(axis=1)), np.hanning(7) / np.hanning(7).sum(), mode='same')
    db = 20 * np.log10(np.maximum(e, 1e-6)); on = db > np.percentile(db, 95) - 26; segs = []; i = 0
    while i < m:
        if on[i]:
            j = i
            while j < m and on[j]: j += 1
            if (j - i) >= 5:
                if segs and i * .01 - segs[-1][1] < .12: segs[-1][1] = j * .01
                else: segs.append([i * .01, j * .01])
            i = j
        else: i += 1
    print('声のあるところ（秒）:', '  '.join('%.2f〜%.2f' % (a, b) for a, b in segs))
    # 3) 聞き取り（7秒ずつ、3.5秒ずらして。1文字ごとの時刻つき）
    D = models + '/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17/'
    rec = sherpa_onnx.OfflineRecognizer.from_sense_voice(model=D + 'model.int8.onnx', tokens=D + 'tokens.txt', num_threads=2, language='ja', use_itn=False)
    y = resample_poly(v, 16000, sr).astype(np.float32); y = y / max(1e-6, np.abs(y).max()) * .9
    if not segs: print('声が見つからない'); return
    t = max(0, segs[0][0] - .6)
    while t < segs[-1][1]:
        s = rec.create_stream(); s.accept_waveform(16000, y[int(t * 16000):int((t + 7) * 16000)]); rec.decode_stream(s); r = s.result
        print('  [%.1f〜%.1f] %s' % (t, t + 7, r.text)); print('     ', ' '.join('%s@%.2f' % (k, t + q) for k, q in zip(r.tokens, r.timestamps)))
        t += 3.5

if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == 'beat': beat(sys.argv[2])
    elif len(sys.argv) >= 4 and sys.argv[1] == 'vocal': vocal(sys.argv[2], sys.argv[3])
    else: print(__doc__ or 'python3 song_times.py beat 曲.mp3 ／ python3 song_times.py vocal 曲.mp3 モデルの場所')
