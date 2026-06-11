/* ════════════════════════════════════════════════════════
   サイト共通サウンドエンジン（Web Audio API・外部ファイル不要）
   BGM「星降る学びの旅」…完全オリジナル楽曲
   全ページで読み込み：BGMループ＋効果音＋右下サウンドパネル
   localStorage: rpg_vol(0-100) / rpg_mute('1'=OFF) / rpg_bgm('0'=OFF)
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var ctx=null, master=null, bgmBus=null, sfxBus=null;
  var unlocked=false;
  var BGM_LEVEL=0.35;

  var st={
    vol : parseInt(localStorage.getItem('rpg_vol')||'60',10),
    mute: localStorage.getItem('rpg_mute')==='1',
    bgm : localStorage.getItem('rpg_bgm')!=='0'
  };
  if(isNaN(st.vol)||st.vol<0||st.vol>100) st.vol=60;

  function ensure(){
    if(ctx) return ctx;
    var AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return null;
    ctx=new AC();
    master=ctx.createGain(); master.connect(ctx.destination);
    bgmBus=ctx.createGain(); bgmBus.gain.value=BGM_LEVEL; bgmBus.connect(master);
    sfxBus=ctx.createGain(); sfxBus.gain.value=1.0; sfxBus.connect(master);
    applyVol();
    return ctx;
  }
  function applyVol(){ if(master) master.gain.value=st.mute?0:(st.vol/100); }
  function save(){
    localStorage.setItem('rpg_vol',String(st.vol));
    localStorage.setItem('rpg_mute',st.mute?'1':'0');
    localStorage.setItem('rpg_bgm',st.bgm?'1':'0');
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
        if(st.mute) return;
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

  /* ── BGM「星降る学びの旅」 ── */
  var F={
    'R':0,'C2':65.41,'E2':82.41,'F2':87.31,'G2':98.00,
    'A2':110.00,'C3':130.81,'D3':146.83,'E3':164.81,'F3':174.61,'G3':196.00,'A3':220.00,'B3':246.94,
    'C4':261.63,'D4':293.66,'E4':329.63,'F4':349.23,'G4':392.00,'A4':440.00,'B4':493.88,
    'C5':523.25,'D5':587.33,'E5':659.25,'F5':698.46,'G5':783.99,'A5':880.00,'B5':987.77,
    'C6':1046.50,'D6':1174.66,'E6':1318.51
  };
  function nf(k){ return F[k]||0; }
  var BPM=108, U=60/BPM/4; /* 16分音符 */

  var MELODY=[
    ['R',8],['A4',2],['R',2],['C5',2],['R',2],
    ['E5',2],['R',2],['A4',4],['R',4],
    ['A4',1],['C5',1],['E5',2],['A5',2],['R',2],
    ['G5',2],['E5',2],['C5',2],['R',2],
    ['F5',2],['E5',1],['D5',1],['C5',2],['D5',2],
    ['E5',4],['R',4],
    ['A4',2],['D5',2],['C5',2],['B4',2],
    ['A4',2],['G4',2],['A4',4],
    ['C5',2],['E5',2],['G5',2],['A5',2],
    ['G5',2],['F5',2],['E5',4],
    ['E5',2],['G5',2],['C6',4],['B5',2],['A5',2],
    ['G5',2],['A5',2],['B5',2],['C6',2],
    ['D6',2],['C6',2],['B5',2],['A5',2],
    ['G5',4],['R',4],
    ['G5',2],['E5',2],['F5',2],['D5',2],
    ['E5',2],['C5',2],['D5',4],
    ['F5',2],['A5',2],['G5',2],['E5',2],
    ['C5',4],['R',4],
    ['A5',2],['R',1],['A5',1],['G5',2],['F5',2],
    ['E5',2],['D5',2],['C5',2],['B4',2],
    ['A4',1],['B4',1],['C5',1],['D5',1],['E5',2],['F5',2],
    ['G5',2],['A5',2],['E5',4],
    ['A5',2],['C6',2],['E6',2],['A5',2],
    ['G5',2],['E5',2],['D5',2],['C5',2],
    ['E5',4],['A4',4],
    ['A4',2],['C5',2],['E5',2],['A5',4],['R',6]
  ];
  var HARMONY=[
    ['A3',4],['A3',4],['C4',4],['E4',4],
    ['A3',4],['A3',4],['F3',4],['F3',4],
    ['C4',4],['C4',4],['G3',4],['G3',4],
    ['A3',4],['A3',4],['F3',4],['F3',4],
    ['C4',4],['C4',4],['E3',4],['E3',4],
    ['C4',4],['C4',4],['G3',4],['G3',4],
    ['A3',4],['A3',4],['F3',4],['F3',4],
    ['C4',4],['G3',4],['A3',4],['F3',4],
    ['G3',4],['G3',4],['C4',4],['C4',4],
    ['A3',4],['F3',4],['C4',4],['G3',4],
    ['A3',4],['F3',4],['C4',4],['E3',4],
    ['A3',4],['A3',4],['A3',8]
  ];
  var BASS=[
    ['A2',4],['R',4],['A2',4],['R',4],
    ['A2',2],['R',2],['A2',2],['R',2],['F2',2],['R',2],['F2',2],['R',2],
    ['C3',2],['R',2],['C3',2],['R',2],['G2',2],['R',2],['G2',2],['R',2],
    ['A2',2],['R',2],['A2',2],['R',2],['F2',2],['R',2],['F2',2],['R',2],
    ['C3',2],['R',2],['C3',2],['R',2],['E2',2],['R',2],['E2',2],['R',2],
    ['C3',2],['R',2],['C3',2],['R',2],['G2',2],['R',2],['G2',2],['R',2],
    ['A2',2],['R',2],['A2',2],['R',2],['F2',2],['R',2],['F2',2],['R',2],
    ['C3',2],['R',2],['G2',2],['R',2],['A2',2],['R',2],['F2',2],['R',2],
    ['G2',2],['R',2],['G2',2],['R',2],['C3',4],['C3',4],
    ['A2',2],['R',2],['F2',2],['R',2],['C3',2],['R',2],['G2',2],['R',2],
    ['A2',2],['R',2],['F2',2],['R',2],['C3',2],['R',2],['E2',2],['R',2],
    ['A2',4],['R',4],['A2',8]
  ];
  var PERC=[
    ['A2',1],['R',3],['A2',1],['R',3],['A2',1],['R',1],['A2',1],['R',1],
    ['A2',2],['R',6],
    ['A2',1],['R',7],['A2',1],['R',7],
    ['A2',1],['R',7],['A2',1],['R',7],
    ['A2',1],['R',7],['A2',1],['R',7],
    ['A2',1],['R',7],['A2',1],['R',7],
    ['C3',1],['R',7],['G2',1],['R',7],
    ['A2',1],['R',7],['F2',1],['R',7],
    ['C3',1],['R',3],['G2',1],['R',3],['A2',1],['R',3],['E2',1],['R',3],
    ['G2',1],['R',3],['G2',1],['R',3],['C3',2],['R',6],
    ['A2',1],['R',3],['A2',1],['R',3],['A2',1],['R',1],['A2',1],['R',1],
    ['A2',1],['R',1],['A2',1],['R',1],['A2',1],['R',1],['A2',1],['R',1],
    ['A2',2],['R',2],['A2',1],['R',1],['R',4],
    ['A2',4],['R',12]
  ];

  var bgm={playing:false,timer:null,nextTime:0,idx:{m:0,h:0,b:0,p:0},sched:[]};
  var PARTIALS={
    violin:[[1,1.0],[2,0.7],[3,0.5],[4,0.3],[5,0.15],[6,0.08]],
    horn:[[1,1.0],[2,0.3],[3,0.5],[4,0.1],[5,0.2]],
    cello:[[1,1.0],[2,0.6],[3,0.4],[4,0.2],[5,0.1]],
    timpani:[[1,1.0],[1.5,0.3],[2,0.2]]
  };
  function makeNote(freq,instr,t,dur,vol){
    if(!freq) return;
    var atk=Math.min(0.06,dur*0.12), rel=Math.min(0.12,dur*0.25), sus=dur-atk-rel;
    (PARTIALS[instr]||PARTIALS.violin).forEach(function(pa){
      var ratio=pa[0],amp=pa[1];
      var o=ctx.createOscillator(), g=ctx.createGain();
      o.connect(g); g.connect(bgmBus);
      o.type=(instr==='timpani')?'triangle':'sine';
      o.frequency.value=freq*ratio;
      if((instr==='violin'||instr==='horn')&&ratio===1){
        var vib=ctx.createOscillator(), vg=ctx.createGain();
        vib.frequency.value=5.5; vg.gain.value=freq*0.004;
        vib.connect(vg); vg.connect(o.frequency);
        vib.start(t+atk); vib.stop(t+dur);
        bgm.sched.push(vib);
      }
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(vol*amp,t+atk);
      if(sus>0) g.gain.setValueAtTime(vol*amp*0.85,t+atk+sus);
      g.gain.linearRampToValueAtTime(0,t+dur);
      o.start(t); o.stop(t+dur+0.05);
      bgm.sched.push(o);
    });
  }
  function schedVoice(notes,key,instr,vol,start){
    var t=start;
    while(t<start+6.0){
      var nd=notes[bgm.idx[key]%notes.length];
      var dur=nd[1]*U;
      makeNote(nf(nd[0]),instr,t,Math.max(dur*0.88,0.05),vol);
      t+=dur; bgm.idx[key]++;
    }
    return t;
  }
  function pump(){
    if(!bgm.playing||!ctx) return;
    var now=ctx.currentTime;
    if(bgm.nextTime<now+0.8){
      var s=Math.max(now,bgm.nextTime);
      var e1=schedVoice(MELODY,'m','violin',0.22,s);
      var e2=schedVoice(HARMONY,'h','horn',0.14,s);
      var e3=schedVoice(BASS,'b','cello',0.18,s);
      var e4=schedVoice(PERC,'p','timpani',0.15,s);
      bgm.nextTime=Math.max(e1,e2,e3,e4);
      /* 古いノード参照を捨てる（メモリ対策） */
      if(bgm.sched.length>900) bgm.sched.splice(0,bgm.sched.length-450);
    }
    bgm.timer=setTimeout(pump,500);
  }
  function startBgm(){
    if(bgm.playing) return;
    if(!ensure()) return;
    if(ctx.state==='suspended') ctx.resume();
    bgm.playing=true;
    var now=ctx.currentTime;
    bgmBus.gain.cancelScheduledValues(now);
    bgmBus.gain.setValueAtTime(0,now);
    bgmBus.gain.linearRampToValueAtTime(BGM_LEVEL,now+0.6);
    bgm.nextTime=now+0.15;
    /* ページをまたいでも曲のつづきから再生 */
    var pos=null;
    try{ pos=JSON.parse(localStorage.getItem('rpg_bgm_pos')||'null'); }catch(e){}
    if(pos&&typeof pos.m==='number'&&typeof pos.h==='number'&&typeof pos.b==='number'&&typeof pos.p==='number'){
      bgm.idx=pos;
      localStorage.removeItem('rpg_bgm_pos');
    }else{
      bgm.idx={m:0,h:0,b:0,p:0};
    }
    pump();
  }
  function stopBgm(){
    if(!bgm.playing) return;
    bgm.playing=false;
    clearTimeout(bgm.timer);
    var now=ctx?ctx.currentTime:0;
    if(bgmBus){
      bgmBus.gain.cancelScheduledValues(now);
      bgmBus.gain.setValueAtTime(bgmBus.gain.value,now);
      bgmBus.gain.linearRampToValueAtTime(0,now+0.4);
    }
    var os=bgm.sched.slice(); bgm.sched.length=0;
    os.forEach(function(o){ try{o.stop(now+0.45);}catch(e){} });
  }
  /* ページ移動時に曲の位置を保存 → 次のページでつづきから */
  window.addEventListener('pagehide',function(){
    if(bgm.playing){
      try{ localStorage.setItem('rpg_bgm_pos',JSON.stringify(bgm.idx)); }catch(e){}
    }
  });

  /* ── BGM自動開始 ──
     ページを開いたら即 resume を試みる（同じサイト内を移動中なら
     ブラウザが許可していることが多く、タップなしで鳴り始める）。
     ブロックされた場合は最初のタップ・キー操作で開始。 */
  function tryAutostart(){
    if(!st.bgm||st.mute) return;
    if(!ensure()) return;
    var p=null;
    try{ p=ctx.resume(); }catch(e){}
    if(p&&p.then){
      p.then(function(){
        if(ctx.state==='running'){ unlocked=true; if(st.bgm&&!st.mute) startBgm(); }
      }).catch(function(){});
    }else if(ctx.state==='running'){
      unlocked=true; startBgm();
    }
  }
  function unlock(){
    if(unlocked) return;
    unlocked=true;
    if(!ensure()) return;
    if(ctx.state==='suspended') ctx.resume();
    if(st.bgm&&!st.mute) startBgm();
  }
  ['pointerdown','touchend','keydown','click'].forEach(function(ev){
    document.addEventListener(ev,unlock);
  });
  document.addEventListener('visibilitychange',function(){
    if(!ctx) return;
    if(document.hidden){ ctx.suspend(); }
    else if(unlocked){ ctx.resume(); }
  });

  /* ── 右下サウンドパネル ── */
  function buildPanel(){
    var css=document.createElement('style');
    css.id='rpgSndStyle';
    css.textContent=
      '.rpg-snd{position:fixed;right:14px;bottom:14px;z-index:99985;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",sans-serif;}'+
      '.rpg-snd-pop{display:none;background:#131032;border:2px solid #c8a84b;border-radius:14px;padding:12px 14px;width:215px;box-shadow:0 8px 28px rgba(0,0,0,.6);}'+
      '.rpg-snd-pop.open{display:block;}'+
      '.rpg-snd-title{font-size:.68rem;color:#e8c96b;font-weight:900;text-align:center;letter-spacing:.08em;margin-bottom:10px;}'+
      '.rpg-snd-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px;color:#cfd8ff;font-size:.78rem;font-weight:700;}'+
      '.rpg-snd-row:last-child{margin-bottom:0;}'+
      '.rpg-snd-tgl{border:none;border-radius:999px;padding:4px 14px;font-family:inherit;font-weight:900;font-size:.74rem;cursor:pointer;min-width:54px;}'+
      '.rpg-snd-tgl.on{background:linear-gradient(90deg,#c8a84b,#e8c96b);color:#1a1040;}'+
      '.rpg-snd-tgl.off{background:#2a2a44;color:#778;}'+
      '.rpg-snd-vol{width:100%;accent-color:#c8a84b;height:5px;cursor:pointer;}'+
      '.rpg-snd-btn{width:50px;height:50px;border-radius:50%;border:2px solid #c8a84b;cursor:pointer;font-size:1.35rem;'+
        'background:linear-gradient(135deg,#311b92,#1a2a6c);display:flex;align-items:center;justify-content:center;'+
        'box-shadow:0 4px 16px rgba(0,0,0,.5),0 0 10px rgba(200,168,75,.35);transition:transform .15s;}'+
      '.rpg-snd-btn:hover{transform:scale(1.08);}';
    document.head.appendChild(css);

    var wrap=document.createElement('div');
    wrap.className='rpg-snd';
    wrap.innerHTML=
      '<div class="rpg-snd-pop" id="rpgSndPop">'+
        '<div class="rpg-snd-title">🎼 BGM「星降る学びの旅」</div>'+
        '<div class="rpg-snd-row"><span>🔊 おと ぜんぶ</span><button class="rpg-snd-tgl" id="rpgSndMute"></button></div>'+
        '<div class="rpg-snd-row"><span>🎵 おんがく</span><button class="rpg-snd-tgl" id="rpgSndBgm"></button></div>'+
        '<div class="rpg-snd-row"><input type="range" class="rpg-snd-vol" id="rpgSndVol" min="0" max="100"></div>'+
      '</div>'+
      '<button class="rpg-snd-btn" id="rpgSndBtn" aria-label="サウンド設定"></button>';
    document.body.appendChild(wrap);

    var btn=document.getElementById('rpgSndBtn');
    var pop=document.getElementById('rpgSndPop');
    var muteB=document.getElementById('rpgSndMute');
    var bgmB=document.getElementById('rpgSndBgm');
    var vol=document.getElementById('rpgSndVol');

    function paint(){
      btn.textContent=st.mute?'🔇':'🎵';
      muteB.textContent=st.mute?'OFF':'ON';
      muteB.className='rpg-snd-tgl '+(st.mute?'off':'on');
      bgmB.textContent=st.bgm?'ON':'OFF';
      bgmB.className='rpg-snd-tgl '+(st.bgm?'on':'off');
      vol.value=st.vol;
    }
    paint();

    btn.addEventListener('click',function(){ pop.classList.toggle('open'); });
    muteB.addEventListener('click',function(){
      st.mute=!st.mute; applyVol(); save(); paint();
      if(!st.mute){ unlock(); if(st.bgm&&!bgm.playing) startBgm(); SFX.click(); }
    });
    bgmB.addEventListener('click',function(){
      st.bgm=!st.bgm; save(); paint();
      if(st.bgm){ unlocked=true; startBgm(); }
      else stopBgm();
    });
    vol.addEventListener('input',function(){
      st.vol=parseInt(vol.value,10)||0; applyVol(); save();
    });
  }
  function init(){
    buildPanel();
    tryAutostart();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }

  window.SND={
    ctx:function(){ return ensure(); },
    bus:function(){ ensure(); return sfxBus; },
    xp:SFX.xp, click:SFX.click, correct:SFX.correct, wrong:SFX.wrong,
    stamp:SFX.stamp, clear:SFX.clear, levelup:SFX.levelup,
    badge:SFX.badge, fanfare:SFX.fanfare
  };
})();
