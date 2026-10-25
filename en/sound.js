/* ════════════════════════════════════════════════════════
   サイト共通サウンドエンジン（Web Audio API・外部ファイル不要）
   効果音のみ。UIパネル・BGMなし（ユーザー操作後に自動で鳴る）。
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var ctx=null, master=null, sfxBus=null;

  function ensure(){
    if(ctx) return ctx;
    var AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return null;
    ctx=new AC();
    master=ctx.createGain(); master.gain.value=0.6; master.connect(ctx.destination);
    sfxBus=ctx.createGain(); sfxBus.gain.value=1.0; sfxBus.connect(master);
    return ctx;
  }

  /* ── 効果音 ── */
  function tone(freq,type,at,dur,gain){
    if(!ctx||!freq) return;
    var o=ctx.createOscillator(), g=ctx.createGain();
    o.connect(g); g.connect(sfxBus);
    o.type=type; o.frequency.setValueAtTime(freq,at);
    g.gain.setValueAtTime(gain,at);
    g.gain.exponentialRampToValueAtTime(0.001,at+dur);
    o.start(at); o.stop(at+dur+0.05);
  }
  function sfx(fn){
    return function(){
      try{
        if(!ensure()) return;
        if(ctx.state==='suspended') ctx.resume();
        fn(ctx.currentTime);
      }catch(e){}
    };
  }
  var SFX={
    /* XPゲット：小さなピコン */
    xp: sfx(function(t){ tone(880,'triangle',t,0.09,0.10); }),
    /* タップ音 */
    click: sfx(function(t){ tone(620,'triangle',t,0.06,0.12); }),
    /* クイズ正解：ドミソド♪ */
    correct: sfx(function(t){
      [523,659,784,1047].forEach(function(f,i){ tone(f,'sine',t+i*0.1,0.25,0.22); });
    }),
    /* 不正解：ブブー */
    wrong: sfx(function(t){
      tone(220,'sawtooth',t,0.15,0.14); tone(180,'sawtooth',t+0.15,0.2,0.14);
    }),
    /* スタンプGET：キラキラチャイム */
    stamp: sfx(function(t){
      [1047,1319,1568].forEach(function(f,i){
        tone(f,'sine',t+i*0.09,0.5,0.18);
        tone(f*2,'sine',t+i*0.09,0.25,0.05);
      });
    }),
    /* パズルクリア：上昇アルペジオ */
    clear: sfx(function(t){
      [440,523,659,880,1047].forEach(function(f,i){ tone(f,'triangle',t+i*0.07,0.3,0.20); });
      tone(1319,'sine',t+0.4,0.6,0.15);
    }),
    /* レベルアップ：ファンファーレ */
    levelup: sfx(function(t){
      [523,659,784,1047,1319].forEach(function(f,i){ tone(f,'square',t+i*0.1,0.22,0.07); });
      [523,659,784,1047].forEach(function(f){ tone(f,'sine',t+0.55,1.0,0.10); });
    }),
    /* マスターバッジ */
    badge: sfx(function(t){
      [659,784,988,1319].forEach(function(f,i){ tone(f,'square',t+i*0.09,0.2,0.07); });
      tone(1568,'sine',t+0.4,0.8,0.12);
    }),
    /* 花火・マスター達成：大ファンファーレ */
    fanfare: sfx(function(t){
      [392,523,659,784,1047,1319].forEach(function(f,i){ tone(f,'square',t+i*0.12,0.3,0.07); });
      [523,659,784,1047].forEach(function(f){ tone(f,'sine',t+0.8,1.4,0.10); });
      [1568,2093].forEach(function(f,i){ tone(f,'sine',t+1.0+i*0.15,0.5,0.06); });
    })
  };

  /* 最初のユーザー操作で AudioContext を起こしておく */
  function unlock(){
    if(!ensure()) return;
    if(ctx.state==='suspended') ctx.resume();
  }
  ['pointerdown','touchend','keydown'].forEach(function(ev){
    document.addEventListener(ev,unlock,{once:false});
  });

  window.SND={
    ctx:function(){ return ensure(); },
    bus:function(){ ensure(); return sfxBus; },
    xp:SFX.xp, click:SFX.click, correct:SFX.correct, wrong:SFX.wrong,
    stamp:SFX.stamp, clear:SFX.clear, levelup:SFX.levelup,
    badge:SFX.badge, fanfare:SFX.fanfare
  };
})();
