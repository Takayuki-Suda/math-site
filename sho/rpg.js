/* ── 冒険者RPGシステム（小学生ゾーン共通） ──
   localStorage:
     rpg_name   … 冒険者の名前
     rpg_xp     … 累計経験値
     rpg_streak … クイズ連続正解数
     rpg_visit_<path> … その日ページを開いたか（日付文字列）
*/
(function(){
  'use strict';

  var LEVELS=[
    {lv:1, xp:0,   title:'見習い冒険者', emoji:'🧒', msg:''},
    {lv:2, xp:100, title:'算数の戦士',   emoji:'⚔️', msg:'すごい！算数の力がついてきたね。一緒にもっと進もう。— 須田先生'},
    {lv:3, xp:300, title:'数学の魔法使い', emoji:'🧙', msg:'ここまで来たか。本物の力がついている。— 須田先生'},
    {lv:4, xp:600, title:'伝説の数学者', emoji:'👑', msg:'君は本物の数学者だ。いつでも会いに来てください。— 須田先生'}
  ];

  /* 手書き風フォント読み込み */
  if(!document.getElementById('rpgFont')){
    var fl=document.createElement('link');
    fl.id='rpgFont'; fl.rel='stylesheet';
    fl.href='https://fonts.googleapis.com/css2?family=Yusei+Magic&display=swap';
    document.head.appendChild(fl);
  }

  /* 共通スタイル */
  if(!document.getElementById('rpgStyle')){
    var st=document.createElement('style');
    st.id='rpgStyle';
    st.textContent=
      '@keyframes rpgToastIn{from{transform:translateY(16px);opacity:0;}to{transform:translateY(0);opacity:1;}}'+
      '@keyframes rpgToastOut{to{transform:translateY(-10px);opacity:0;}}'+
      '@keyframes rpgFlash{0%{opacity:0;}18%{opacity:1;}100%{opacity:0;}}'+
      '@keyframes rpgLvPop{0%{transform:scale(.3);opacity:0;}60%{transform:scale(1.12);}100%{transform:scale(1);opacity:1;}}'+
      '@keyframes rpgRay{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}'+
      '@keyframes rpgMsgIn{from{transform:translateY(18px);opacity:0;}to{transform:translateY(0);opacity:1;}}'+
      '.rpg-toast-wrap{position:fixed;right:14px;bottom:84px;z-index:99990;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none;}'+
      '.rpg-toast{background:linear-gradient(135deg,#311b92,#1a2a6c);border:2px solid #c8a84b;color:#ffe9a8;font-weight:900;'+
        'font-family:"Noto Sans JP",sans-serif;font-size:.95rem;padding:10px 18px;border-radius:999px;'+
        'box-shadow:0 4px 18px rgba(0,0,0,.5),0 0 12px rgba(200,168,75,.45);animation:rpgToastIn .35s cubic-bezier(.34,1.56,.64,1);}'+
      '.rpg-toast small{color:#cfd8ff;font-weight:700;margin-left:6px;}';
    document.head.appendChild(st);
  }

  function getXP(){ return parseInt(localStorage.getItem('rpg_xp')||'0',10)||0; }
  function levelFor(xp){
    var cur=LEVELS[0];
    for(var i=0;i<LEVELS.length;i++){ if(xp>=LEVELS[i].xp) cur=LEVELS[i]; }
    return cur;
  }
  function nextLevel(xp){
    for(var i=0;i<LEVELS.length;i++){ if(xp<LEVELS[i].xp) return LEVELS[i]; }
    return null; /* 最高レベル */
  }

  /* ── +XP トースト ── */
  function toast(text,sub){
    var wrap=document.querySelector('.rpg-toast-wrap');
    if(!wrap){ wrap=document.createElement('div'); wrap.className='rpg-toast-wrap'; document.body.appendChild(wrap); }
    var t=document.createElement('div');
    t.className='rpg-toast';
    t.innerHTML='✨ '+text+(sub?'<small>'+sub+'</small>':'');
    wrap.appendChild(t);
    setTimeout(function(){ t.style.animation='rpgToastOut .4s ease forwards'; setTimeout(function(){t.remove();},420); },2200);
  }

  /* ── レベルアップ演出 ── */
  function levelUpShow(lv){
    if(window.SND) SND.levelup();
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:99995;display:flex;align-items:center;justify-content:center;'+
      'flex-direction:column;background:rgba(8,8,24,.88);cursor:pointer;overflow:hidden;padding:24px;';
    /* 画面が光るフラッシュ */
    var flash=document.createElement('div');
    flash.style.cssText='position:fixed;inset:0;background:radial-gradient(circle,#fff8d8 0%,#ffd95e 35%,transparent 75%);'+
      'animation:rpgFlash 1.1s ease forwards;pointer-events:none;';
    ov.appendChild(flash);
    /* 回転する光線 */
    var rays=document.createElement('div');
    rays.style.cssText='position:absolute;width:160vmax;height:160vmax;left:50%;top:50%;margin:-80vmax 0 0 -80vmax;'+
      'background:repeating-conic-gradient(rgba(200,168,75,.16) 0deg 12deg,transparent 12deg 24deg);'+
      'animation:rpgRay 24s linear infinite;pointer-events:none;';
    ov.appendChild(rays);

    var box=document.createElement('div');
    box.style.cssText='position:relative;z-index:1;text-align:center;animation:rpgLvPop .6s cubic-bezier(.34,1.56,.64,1);max-width:560px;width:100%;';
    box.innerHTML=
      '<div style="font-size:clamp(2.2rem,9vw,3.6rem);font-weight:900;letter-spacing:.08em;'+
        'font-family:\'Noto Sans JP\',sans-serif;color:#ffe9a8;'+
        'text-shadow:0 0 30px rgba(255,217,94,.95),0 0 60px rgba(200,168,75,.6);">レベルアップ！！</div>'+
      '<div style="font-size:3.6rem;margin:14px 0 4px;">'+lv.emoji+'</div>'+
      '<div style="font-family:\'Noto Sans JP\',sans-serif;font-weight:900;font-size:1.3rem;color:#fff;">'+
        'Lv'+lv.lv+'　'+lv.title+'</div>';
    if(lv.msg){
      box.innerHTML+=
        '<div style="margin:22px auto 0;background:linear-gradient(135deg,#fdf3d7,#f6e3b0);color:#5a4314;'+
          'border:2px solid #c8a84b;border-radius:16px;padding:18px 22px;'+
          'font-family:\'Yusei Magic\',\'Noto Sans JP\',cursive;font-size:1.08rem;line-height:2;'+
          'box-shadow:0 8px 28px rgba(0,0,0,.4);animation:rpgMsgIn .6s ease .5s backwards;">'+lv.msg+'</div>';
    }
    box.innerHTML+='<div style="margin-top:18px;font-size:.78rem;color:#8899aa;font-family:\'Noto Sans JP\',sans-serif;">タップでとじる</div>';
    ov.appendChild(box);
    document.body.appendChild(ov);
    function close(){ ov.style.transition='opacity .5s'; ov.style.opacity='0'; setTimeout(function(){ov.remove();},520); }
    ov.addEventListener('click',close);
    setTimeout(close,9000);
  }

  /* ── XP加算 ── */
  function addXP(n,label){
    var before=levelFor(getXP());
    var xp=getXP()+n;
    localStorage.setItem('rpg_xp',String(xp));
    toast('+'+n+' XP',label||'');
    if(window.SND) SND.xp();
    var after=levelFor(xp);
    if(after.lv>before.lv){ setTimeout(function(){ levelUpShow(after); },500); }
    document.dispatchEvent(new CustomEvent('rpg:xp',{detail:{xp:xp,level:after}}));
  }

  /* ── クイズ連携（連続正解ボーナス付き） ── */
  function quizCorrect(){
    addXP(20,'クイズせいかい');
    var s=(parseInt(localStorage.getItem('rpg_streak')||'0',10)||0)+1;
    if(s>=10){
      localStorage.setItem('rpg_streak','0');
      setTimeout(function(){ addXP(100,'10もん れんぞくせいかい！'); },900);
    }else{
      localStorage.setItem('rpg_streak',String(s));
    }
  }
  function quizWrong(){ localStorage.setItem('rpg_streak','0'); }

  /* ── ページを開いたら +10XP（1ページ1日1回） ── */
  function visitBonus(){
    var key='rpg_visit_'+location.pathname;
    var today=new Date().toISOString().slice(0,10);
    if(localStorage.getItem(key)!==today){
      localStorage.setItem(key,today);
      setTimeout(function(){ addXP(10,'ページをひらいた'); },700);
    }
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',visitBonus);
  }else{
    visitBonus();
  }

  window.RPG={
    LEVELS:LEVELS,
    getXP:getXP,
    levelFor:levelFor,
    nextLevel:nextLevel,
    addXP:addXP,
    quizCorrect:quizCorrect,
    quizWrong:quizWrong
  };
})();

/* ════════════════════════════════════════════════════════
   サウンドエンジン（Web Audio API・外部ファイル不要）
   BGM「星降る学びの旅」…完全オリジナル楽曲（kazu.html から共通化）
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
    bgm.idx={m:0,h:0,b:0,p:0};
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

  /* ── 自動再生制限への対応：最初のタップでBGM開始 ── */
  function unlock(){
    if(unlocked) return;
    unlocked=true;
    if(!ensure()) return;
    if(ctx.state==='suspended') ctx.resume();
    if(st.bgm) startBgm();
  }
  document.addEventListener('pointerdown',unlock);
  document.addEventListener('keydown',unlock);
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
      '.rpg-snd{position:fixed;right:14px;bottom:14px;z-index:99985;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:"Noto Sans JP",sans-serif;}'+
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
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',buildPanel);
  }else{
    buildPanel();
  }

  window.SND={
    ctx:function(){ return ensure(); },
    bus:function(){ ensure(); return sfxBus; },
    xp:SFX.xp, click:SFX.click, correct:SFX.correct, wrong:SFX.wrong,
    stamp:SFX.stamp, clear:SFX.clear, levelup:SFX.levelup,
    badge:SFX.badge, fanfare:SFX.fanfare
  };
})();

/* ════════════════════════════════════════════════════════
   ぼうけんナビ（教材ページ下部に自動表示）
   いまのステータス＋つぎのぼうけん＋マップへのリンク
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var QUESTS=[
    {f:'kazu.html',t:'かずのかぞえかた',e:'🔢'},
    {f:'tashizan.html',t:'たしざん',e:'➕'},
    {f:'hikizan.html',t:'ひきざん',e:'➖'},
    {f:'kuku.html',t:'九九の表',e:'✖️'},
    {f:'bunsu.html',t:'分数の足し算',e:'🍕'},
    {f:'sankaku.html',t:'三角形の面積',e:'📐'},
    {f:'en.html',t:'円の面積',e:'⭕'},
    {f:'puzzle.html',t:'パズルの塔',e:'🧩'}
  ];
  var m=location.pathname.match(/\/([a-z]+\.html)$/);
  if(!m) return;
  var idx=-1;
  QUESTS.forEach(function(q,i){ if(q.f===m[1]) idx=i; });
  if(idx<0) return;
  var next=QUESTS[idx+1]||null;

  function update(){
    if(!window.RPG) return;
    var xp=RPG.getXP(), lv=RPG.levelFor(xp), nx=RPG.nextLevel(xp);
    var face=document.getElementById('rpgAdvFace');
    if(!face) return;
    face.textContent=lv.emoji;
    document.getElementById('rpgAdvLv').textContent='Lv'+lv.lv;
    document.getElementById('rpgAdvFill').style.width=
      nx?Math.min(100,Math.round((xp-lv.xp)/(nx.xp-lv.xp)*100))+'%':'100%';
    document.getElementById('rpgAdvXp').textContent=xp+' XP'+(nx?'（あと'+(nx.xp-xp)+'）':'・MAX👑');
  }
  function build(){
    var css=document.createElement('style');
    css.textContent=
      '.rpg-adv{max-width:720px;margin:28px auto;padding:16px 18px;'+
        'background:linear-gradient(135deg,#1a1040,#241a52 50%,#0f1f4a);border:2px solid #c8a84b;border-radius:16px;'+
        'font-family:"Noto Sans JP",sans-serif;color:#f0f4ff;display:flex;align-items:center;gap:14px;flex-wrap:wrap;'+
        'box-shadow:0 6px 24px rgba(0,0,0,.35);line-height:1.6;}'+
      '.rpg-adv-hero{display:flex;align-items:center;gap:10px;flex:1;min-width:190px;}'+
      '.rpg-adv-face{font-size:1.7rem;}'+
      '.rpg-adv-lv{font-size:.82rem;font-weight:900;color:#e8c96b;white-space:nowrap;}'+
      '.rpg-adv-bar{flex:1;height:9px;min-width:70px;background:rgba(0,0,0,.45);border:1px solid rgba(200,168,75,.45);border-radius:999px;overflow:hidden;}'+
      '.rpg-adv-fill{height:100%;background:linear-gradient(90deg,#7c5cbf,#3a6fd8 45%,#e8c96b);transition:width .8s;}'+
      '.rpg-adv-xp{font-size:.7rem;color:#8899aa;white-space:nowrap;}'+
      '.rpg-adv-links{display:flex;gap:10px;flex-wrap:wrap;}'+
      '.rpg-adv-links a{text-decoration:none;font-weight:900;font-size:.82rem;padding:9px 16px;border-radius:999px;white-space:nowrap;}'+
      '.rpg-adv-map{color:#cfd8ff;border:1px solid rgba(200,168,75,.5);}'+
      '.rpg-adv-map:hover{color:#e8c96b;}'+
      '.rpg-adv-next{color:#1a1040;background:linear-gradient(90deg,#c8a84b,#e8c96b);box-shadow:0 0 14px rgba(200,168,75,.4);}'+
      '.rpg-adv-next:hover{filter:brightness(1.1);}'+
      '@media(max-width:480px){.rpg-adv{margin:20px 12px;}}';
    document.head.appendChild(css);

    var d=document.createElement('div');
    d.className='rpg-adv';
    d.innerHTML=
      '<div class="rpg-adv-hero">'+
        '<span class="rpg-adv-face" id="rpgAdvFace">🧒</span>'+
        '<span class="rpg-adv-lv" id="rpgAdvLv">Lv1</span>'+
        '<div class="rpg-adv-bar"><div class="rpg-adv-fill" id="rpgAdvFill" style="width:0%"></div></div>'+
        '<span class="rpg-adv-xp" id="rpgAdvXp"></span>'+
      '</div>'+
      '<div class="rpg-adv-links">'+
        '<a class="rpg-adv-map" href="index.html">🗺️ ぼうけんマップ</a>'+
        (next?'<a class="rpg-adv-next" href="'+next.f+'">つぎのぼうけん：'+next.e+' '+next.t+' →</a>':'')+
      '</div>';
    document.body.appendChild(d);
    update();
    document.addEventListener('rpg:xp',update);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',build);
  }else{
    build();
  }
})();
