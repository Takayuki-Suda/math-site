/* ════════════════════════════════════════════════════════
   数学カードバトル：音（BGM と効果音）
   Web Audio API でその場で鳴らす。音のファイルは使わない。
   BGM はこのゲームのために作ったオリジナル曲（Aマイナー・140BPM）。
   ════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var ctx = null, master, musicBus, sfxBus, noiseBuf;
  var prefs = { music: true, sfx: true };
  try {
    if (localStorage.getItem('cb_music') === '0') prefs.music = false;
    if (localStorage.getItem('cb_sfx') === '0') prefs.sfx = false;
  } catch (e) {}

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = prefs.music ? 0.16 : 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = prefs.sfx ? 0.5 : 0; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* ── 音の部品 ── */
  function note(bus, midi, type, at, dur, gain, glideTo) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(hz(midi), at);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(hz(glideTo), at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(bus);
    o.start(at); o.stop(at + dur + 0.03);
  }
  function noise(bus, at, dur, gain, freq, q, type) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.setValueAtTime(gain, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(at); s.stop(at + dur + 0.02);
  }
  function kick(at) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(45, at + 0.12);
    g.gain.setValueAtTime(0.9, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    o.connect(g); g.connect(musicBus); o.start(at); o.stop(at + 0.2);
  }

  /* ── BGM：8 小節をくり返す ── */
  var BPM = 140, STEP = 60 / BPM / 4;   // 16 分音符
  var ROOTS = [45, 41, 48, 43, 45, 41, 43, 40];          // Am F C G Am F G E（ベース）
  var CHORDS = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]];
  var _ = null;
  var MELODY = [                                         // 8 分音符 × 8 × 8 小節
    [76, _, 74, 72, 69, _, 72, 74], [77, _, 76, 74, 72, _, 69, 72],
    [76, _, 79, 76, 72, _, 74, 76], [74, _, _, 71, 67, 71, 74, _],
    [81, _, 79, 76, 77, 76, 74, 72], [72, _, 74, 76, 77, _, 76, 74],
    [74, 76, 77, 79, _, 77, 76, 74], [71, _, 68, 71, 76, _, _, _]
  ];
  var bgmOn = false, nextTime = 0, step = 0, timer = null, tense = false;
  function scheduleStep(i, t) {
    var bar = Math.floor(i / 16) % 8, s = i % 16;
    var root = ROOTS[bar], ch = CHORDS[bar];
    /* ドラム */
    if (s % 8 === 0) kick(t);
    if (s % 8 === 4) noise(musicBus, t, 0.12, 0.5, 1800, 0.8);           // スネア
    if (s % 2 === 1 || tense) noise(musicBus, t, 0.03, 0.18, 8000, 1, 'highpass'); // ハイハット
    /* ベース（8 分でオクターブを行き来） */
    if (s % 2 === 0) note(musicBus, root + (s % 4 === 2 ? 12 : 0), 'square', t, STEP * 1.8, 0.16);
    /* 和音のアルペジオ */
    note(musicBus, ch[s % 3] + 12, 'triangle', t, STEP * 0.9, 0.07);
    /* メロディ */
    if (s % 2 === 0) {
      var m = MELODY[bar][s / 2];
      if (m != null) note(musicBus, m, 'square', t, STEP * 1.9, 0.09);
    }
  }
  function pump() {
    if (!bgmOn || !ctx) return;
    while (nextTime < ctx.currentTime + 0.12) {
      scheduleStep(step, nextTime);
      nextTime += STEP * (tense ? 0.88 : 1);   // ピンチのときは少し速く
      step = (step + 1) % 128;
    }
  }
  function bgmStart() {
    if (!ensure() || bgmOn) return;
    bgmOn = true; step = 0; nextTime = ctx.currentTime + 0.08;
    timer = setInterval(pump, 25);
  }
  function bgmStop() { bgmOn = false; if (timer) { clearInterval(timer); timer = null; } }

  /* ── 効果音 ── */
  var FX = {
    click: function (t) { note(sfxBus, 84, 'triangle', t, 0.06, 0.25); },
    card: function (t) {                                  // カードを出す：シュッ
      noise(sfxBus, t, 0.18, 0.5, 2500, 0.7, 'bandpass');
      note(sfxBus, 79, 'triangle', t + 0.05, 0.12, 0.2, 91);
    },
    correct: function (t) { [72, 76, 79, 84].forEach(function (m, i) { note(sfxBus, m, 'sine', t + i * 0.08, 0.22, 0.35); }); },
    wrong: function (t) { note(sfxBus, 57, 'sawtooth', t, 0.16, 0.22); note(sfxBus, 53, 'sawtooth', t + 0.16, 0.24, 0.22); },
    hit: function (t) {                                   // ダメージ：ドン
      noise(sfxBus, t, 0.25, 0.9, 400, 0.6, 'lowpass');
      note(sfxBus, 45, 'square', t, 0.2, 0.3, 33);
    },
    heal: function (t) { [72, 79, 84, 88].forEach(function (m, i) { note(sfxBus, m, 'sine', t + i * 0.07, 0.4, 0.22); }); },
    shield: function (t) { note(sfxBus, 88, 'triangle', t, 0.5, 0.2); note(sfxBus, 95, 'sine', t, 0.6, 0.12); noise(sfxBus, t, 0.3, 0.2, 6000, 4); },
    hint: function (t) { note(sfxBus, 84, 'sine', t, 0.15, 0.25); note(sfxBus, 91, 'sine', t + 0.1, 0.3, 0.2); },
    counter: function (t) { [64, 67, 71, 76].forEach(function (m, i) { note(sfxBus, m, 'square', t + i * 0.05, 0.12, 0.12); }); },
    draw: function (t) { noise(sfxBus, t, 0.1, 0.35, 3000, 1); noise(sfxBus, t + 0.12, 0.1, 0.35, 3400, 1); },
    think: function (t) { note(sfxBus, 76, 'sine', t, 0.08, 0.1); note(sfxBus, 79, 'sine', t + 0.25, 0.08, 0.1); note(sfxBus, 83, 'sine', t + 0.5, 0.08, 0.1); },
    win: function (t) {
      [72, 76, 79, 84].forEach(function (m, i) { note(sfxBus, m, 'square', t + i * 0.12, 0.25, 0.16); });
      [72, 76, 79, 84].forEach(function (m) { note(sfxBus, m, 'triangle', t + 0.55, 1.2, 0.14); });
      [91, 96].forEach(function (m, i) { note(sfxBus, m, 'sine', t + 0.8 + i * 0.15, 0.5, 0.1); });
    },
    lose: function (t) { [69, 67, 64, 57].forEach(function (m, i) { note(sfxBus, m, 'triangle', t + i * 0.22, 0.45, 0.22); }); }
  };
  function play(name, delay) {
    if (!prefs.sfx || !FX[name] || !ensure()) return;
    try { FX[name](ctx.currentTime + (delay || 0)); } catch (e) {}
  }

  function setMusic(on) {
    prefs.music = on;
    try { localStorage.setItem('cb_music', on ? '1' : '0'); } catch (e) {}
    if (ctx) musicBus.gain.setTargetAtTime(on ? 0.16 : 0, ctx.currentTime, 0.05);
  }
  function setSfx(on) {
    prefs.sfx = on;
    try { localStorage.setItem('cb_sfx', on ? '1' : '0'); } catch (e) {}
    if (ctx) sfxBus.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.05);
  }
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (bgmOn) ctx.resume();
  });

  window.CBSound = {
    unlock: ensure, play: play, bgmStart: bgmStart, bgmStop: bgmStop,
    setTense: function (v) { tense = !!v; },
    setMusic: setMusic, setSfx: setSfx,
    music: function () { return prefs.music; }, sfx: function () { return prefs.sfx; }
  };
})();
