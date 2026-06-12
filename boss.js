/* ════════════════════════════════════════════════════════
   ボス戦エンジン（boss_1.html〜boss_4.html 共通）
   使い方：各ボスページで BossBattle(config) を呼ぶ。
   config:
     no        … ボス番号(1〜5)
     name/sub  … ボス名・境界の説明
     intro     … 導入のフレーバー行（配列）
     kids      … 子ども向け文言にする
     theme     … {main, glow, dark} 色
     hp        … ボスHP（=必要正解数。既定5）
     hearts    … プレイヤーのハート数（既定3）
     questions … {q, c:[選択肢], a:正解index, exp:解説} の配列（6問以上推奨）
     draw      … function(ctx,W,H,t,S) ボスを描く
                  S = {hpRatio, hurt(0..1), dead(0..1)}
     victory   … {xp, msg, cta:{label,href}|null, doorHref, doorName, note}
     enterFlag … 撃破後に入るゾーン（sessionStorage rpg_enter_*）
     fleeHref  … 「にげる」の戻り先
   ════════════════════════════════════════════════════════ */
function BossBattle(cfg){
  'use strict';
  var HP=cfg.hp||5, HEARTS=cfg.hearts||3;
  var kids=!!cfg.kids;
  var th=cfg.theme||{main:'#e8884b',glow:'rgba(232,136,75,.5)',dark:'#7a3b12'};

  /* ── スタイル ── */
  var st=document.createElement('style');
  st.textContent=
    '@keyframes bbShake{0%,100%{transform:translate(0,0);}20%{transform:translate(-7px,3px);}40%{transform:translate(6px,-4px);}60%{transform:translate(-5px,-3px);}80%{transform:translate(4px,3px);}}'+
    '@keyframes bbRedFlash{0%{opacity:.55;}100%{opacity:0;}}'+
    '@keyframes bbPop{0%{transform:scale(.4);opacity:0;}60%{transform:scale(1.1);}100%{transform:scale(1);opacity:1;}}'+
    '@keyframes bbFadeUp{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}'+
    '@keyframes bbPulse{from{box-shadow:0 0 12px rgba(200,168,75,.35);}to{box-shadow:0 0 28px rgba(200,168,75,.85);}}'+
    '@keyframes bbDoorL{to{transform:perspective(900px) rotateY(-104deg);}}'+
    '@keyframes bbDoorR{to{transform:perspective(900px) rotateY(104deg);}}'+
    '@keyframes bbDoorLight{0%{opacity:0;}60%{opacity:0;}100%{opacity:1;}}'+
    '@keyframes bbHeartBreak{0%{transform:scale(1);}30%{transform:scale(1.4) rotate(-12deg);}100%{transform:scale(0);opacity:0;}}'+
    '@keyframes bbIntroLine{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}'+
    '.bb-stage{max-width:760px;margin:0 auto;padding:18px 14px 60px;font-family:"Noto Sans JP",sans-serif;}'+
    '.bb-flee{display:inline-block;color:#8899aa;text-decoration:none;font-size:.82rem;font-weight:700;margin-bottom:10px;}'+
    '.bb-flee:hover{color:#c8a84b;}'+
    '.bb-arena{position:relative;border:2px solid '+th.main+';border-radius:18px;overflow:hidden;'+
      'background:#080612;box-shadow:0 0 34px '+th.glow+';}'+
    '.bb-arena.shake{animation:bbShake .45s ease;}'+
    '.bb-arena canvas{display:block;width:100%;height:auto;}'+
    '.bb-redflash{position:absolute;inset:0;background:radial-gradient(circle,rgba(255,40,40,.65),rgba(120,0,0,.85));'+
      'pointer-events:none;opacity:0;}'+
    '.bb-redflash.on{animation:bbRedFlash .6s ease forwards;}'+
    '.bb-bar-row{display:flex;align-items:center;gap:12px;padding:12px 16px 4px;flex-wrap:wrap;}'+
    '.bb-boss-name{font-size:.85rem;font-weight:900;color:#ffd9c8;letter-spacing:.12em;white-space:nowrap;}'+
    '.bb-hpbar{flex:1;min-width:140px;height:16px;border:1px solid rgba(255,255,255,.25);border-radius:999px;'+
      'background:rgba(0,0,0,.6);overflow:hidden;}'+
    '.bb-hpfill{height:100%;width:100%;border-radius:999px;'+
      'background:linear-gradient(90deg,#c0392b,#e8884b);box-shadow:0 0 12px rgba(232,80,60,.7);'+
      'transition:width .55s cubic-bezier(.22,1,.36,1);}'+
    '.bb-status-row{display:flex;justify-content:space-between;align-items:center;padding:6px 16px 12px;flex-wrap:wrap;gap:8px;}'+
    '.bb-hearts{font-size:1.15rem;letter-spacing:.12em;}'+
    '.bb-hearts .dead{filter:grayscale(1) opacity(.3);}'+
    '.bb-hearts .breaking{display:inline-block;animation:bbHeartBreak .7s ease forwards;}'+
    '.bb-dots{display:flex;gap:6px;}'+
    '.bb-dot{width:12px;height:12px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.4);}'+
    '.bb-dot.hit{background:linear-gradient(135deg,#c8a84b,#e8c96b);box-shadow:0 0 8px rgba(232,201,107,.8);border-color:#fff3c4;}'+
    '.bb-panel{margin-top:16px;background:#10142a;border:1px solid rgba(200,168,75,.35);border-radius:16px;'+
      'padding:20px 18px;color:#f0f4ff;animation:bbFadeUp .4s ease;}'+
    '.bb-qno{font-size:.7rem;font-weight:700;letter-spacing:.2em;color:#c8a84b;margin-bottom:8px;}'+
    '.bb-qtext{font-size:1.15rem;font-weight:900;line-height:1.9;margin-bottom:16px;}'+
    '.bb-choices{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;}'+
    '.bb-choice{font-family:inherit;font-size:1rem;font-weight:700;color:#f0f4ff;background:#1a2235;'+
      'border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:13px 10px;cursor:pointer;transition:all .15s;}'+
    '.bb-choice:hover{border-color:#c8a84b;background:#222c45;transform:translateY(-2px);}'+
    '.bb-choice.ok{background:#1d4a2a;border-color:#2ecc71;}'+
    '.bb-choice.ng{background:#4a1d1d;border-color:#c0392b;}'+
    '.bb-choice:disabled{cursor:default;}'+
    '.bb-fb{margin-top:14px;font-size:.95rem;font-weight:700;line-height:1.9;}'+
    '.bb-exp{margin-top:10px;background:rgba(0,0,0,.3);border-left:3px solid #c8a84b;border-radius:8px;'+
      'padding:10px 14px;font-size:.88rem;color:#cfd8ff;line-height:1.9;}'+
    '.bb-next{margin-top:14px;font-family:inherit;font-weight:900;font-size:.92rem;color:#1a1040;'+
      'background:linear-gradient(90deg,#c8a84b,#e8c96b);border:none;border-radius:999px;padding:11px 28px;cursor:pointer;}'+
    '.bb-next:hover{filter:brightness(1.1);}'+
    /* オーバーレイ共通 */
    '.bb-ov{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;'+
      'flex-direction:column;background:rgba(5,4,14,.94);padding:24px;text-align:center;overflow-y:auto;}'+
    '.bb-ov-inner{max-width:560px;width:100%;animation:bbPop .55s cubic-bezier(.34,1.56,.64,1);}'+
    '.bb-intro-no{font-size:.75rem;font-weight:700;letter-spacing:.35em;color:'+th.main+';margin-bottom:10px;}'+
    '.bb-intro-name{font-size:clamp(2rem,9vw,3.2rem);font-weight:900;color:#ffd9c8;letter-spacing:.14em;'+
      'text-shadow:0 0 30px '+th.glow+',0 0 60px '+th.glow+';margin-bottom:6px;}'+
    '.bb-intro-sub{font-size:.8rem;color:#8899aa;letter-spacing:.2em;margin-bottom:22px;}'+
    '.bb-intro-line{font-size:1.02rem;color:#ddc;line-height:2.2;opacity:0;animation:bbIntroLine .8s ease forwards;}'+
    '.bb-fight{display:inline-block;margin-top:28px;font-family:inherit;font-weight:900;font-size:1.1rem;color:#fff;'+
      'background:linear-gradient(135deg,#8a2020,#c0392b);border:1px solid #ffb09a;border-radius:999px;'+
      'padding:15px 46px;cursor:pointer;animation:bbPulse 1.3s ease-in-out infinite alternate;}'+
    '.bb-fight:hover{filter:brightness(1.15);}'+
    '.bb-sub-link{display:block;margin-top:18px;font-size:.8rem;color:#667;text-decoration:underline;cursor:pointer;}'+
    '.bb-sub-link:hover{color:#99a;}'+
    /* 勝利 */
    '.bb-win-title{font-size:clamp(1.8rem,8vw,2.8rem);font-weight:900;color:#ffe9a8;letter-spacing:.1em;'+
      'text-shadow:0 0 30px rgba(255,217,94,.9);margin-bottom:14px;}'+
    '.bb-win-msg{background:linear-gradient(135deg,#fdf3d7,#f6e3b0);color:#5a4314;border:2px solid #c8a84b;'+
      'border-radius:16px;padding:20px 22px;font-family:"Yusei Magic","Noto Sans JP",cursive;'+
      'font-size:1.05rem;line-height:2.1;text-align:left;box-shadow:0 8px 28px rgba(0,0,0,.4);'+
      'animation:bbFadeUp .6s ease .4s backwards;}'+
    '.bb-cta{display:inline-block;margin-top:18px;text-decoration:none;font-weight:900;font-size:.95rem;'+
      'color:#1a1040;background:linear-gradient(90deg,#c8a84b,#e8c96b);padding:13px 30px;border-radius:999px;'+
      'animation:bbPulse 1.5s ease-in-out infinite alternate;}'+
    '.bb-cta:hover{filter:brightness(1.1);}'+
    '.bb-cta-note{font-size:.75rem;color:#8899aa;margin-top:8px;}'+
    /* 扉 */
    '.bb-doorzone{margin-top:30px;animation:bbFadeUp .6s ease .9s backwards;}'+
    '.bb-door-note{font-size:.85rem;color:#cfd8ff;margin-bottom:12px;letter-spacing:.1em;}'+
    '.bb-door{position:relative;width:170px;height:200px;margin:0 auto;perspective:900px;}'+
    '.bb-door-light{position:absolute;inset:6px;background:radial-gradient(circle,#fff8d8 0%,#ffd95e 45%,#c8a84b 100%);'+
      'border-radius:10px 10px 0 0;opacity:0;animation:bbDoorLight 2.2s ease .3s forwards;'+
      'box-shadow:0 0 50px rgba(255,217,94,.9);}'+
    '.bb-door-frame{position:absolute;inset:0;border:5px solid #6a5424;border-bottom-width:8px;'+
      'border-radius:14px 14px 0 0;pointer-events:none;}'+
    '.bb-door-l,.bb-door-r{position:absolute;top:6px;bottom:0;width:50%;'+
      'background:linear-gradient(135deg,#3a2d1a,#241a0e);border:1px solid #8a7340;}'+
    '.bb-door-l{left:6px;border-radius:8px 0 0 0;transform-origin:left;animation:bbDoorL 1.8s cubic-bezier(.6,.04,.3,1) .5s forwards;}'+
    '.bb-door-r{right:6px;border-radius:0 8px 0 0;transform-origin:right;animation:bbDoorR 1.8s cubic-bezier(.6,.04,.3,1) .5s forwards;}'+
    '.bb-door-go{display:inline-block;margin-top:20px;text-decoration:none;font-weight:900;font-size:1.05rem;'+
      'color:#1a1040;background:linear-gradient(90deg,#c8a84b,#e8c96b);padding:14px 36px;border-radius:999px;'+
      'animation:bbPulse 1.3s ease-in-out infinite alternate;}'+
    '.bb-door-go:hover{filter:brightness(1.12);}'+
    '@media(max-width:480px){.bb-qtext{font-size:1.02rem;}}';
  document.head.appendChild(st);

  /* ── 効果音（サイト共通SNDのバスにつなぐ） ── */
  function sfx(fn){
    try{
      if(!window.SND) return;
      var ctx=SND.ctx(); if(!ctx) return;
      if(ctx.state==='suspended') ctx.resume();
      fn(ctx,SND.bus(),ctx.currentTime);
    }catch(e){}
  }
  function tone(ctx,bus,f,type,at,dur,g0){
    var o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g); g.connect(bus);
    o.type=type; o.frequency.setValueAtTime(f,at);
    g.gain.setValueAtTime(g0,at);
    g.gain.exponentialRampToValueAtTime(0.001,at+dur);
    o.start(at); o.stop(at+dur+0.05);
    return o;
  }
  var SfxHit=function(){ sfx(function(c,b,t){
    var o=tone(c,b,200,'sawtooth',t,0.22,0.22);
    o.frequency.exponentialRampToValueAtTime(60,t+0.22);
    tone(c,b,1200,'square',t,0.05,0.08);
    tone(c,b,900,'square',t+0.04,0.05,0.06);
  });};
  var SfxRoar=function(){ sfx(function(c,b,t){
    var o=tone(c,b,90,'sawtooth',t,0.55,0.20);
    o.frequency.setValueAtTime(90,t);
    o.frequency.linearRampToValueAtTime(55,t+0.5);
    var o2=tone(c,b,140,'square',t+0.05,0.4,0.07);
    o2.frequency.linearRampToValueAtTime(70,t+0.45);
  });};
  var SfxDeath=function(){ sfx(function(c,b,t){
    var o=tone(c,b,300,'sawtooth',t,1.1,0.25);
    o.frequency.exponentialRampToValueAtTime(40,t+1.1);
    [800,650,500,380].forEach(function(f,i){ tone(c,b,f,'square',t+i*0.09,0.2,0.07); });
  });};

  /* ── 状態 ── */
  var S={hp:HP,hearts:HEARTS,phase:'intro',hurtT:0,deadT:-1,t0:performance.now()};
  var particles=[];
  var pool=cfg.questions.slice();
  var queue=[],qIdx=0,current=null;

  function shuffle(a){
    for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)),tmp=a[i];a[i]=a[j];a[j]=tmp; }
    return a;
  }
  function resetBattle(){
    S.hp=HP; S.hearts=HEARTS; S.deadT=-1; S.hurtT=0;
    pool=shuffle(cfg.questions.slice());
    queue=pool.splice(0,HP);
    qIdx=0;
  }

  /* ── DOM ── */
  var stage=document.createElement('div');
  stage.className='bb-stage';
  stage.innerHTML=
    '<a class="bb-flee" href="'+cfg.fleeHref+'">← '+(kids?'にげる（マップにもどる）':'退却する（マップに戻る）')+'</a>'+
    '<div class="bb-arena" id="bbArena">'+
      '<div class="bb-bar-row">'+
        '<span class="bb-boss-name">'+cfg.theme.icon+' '+cfg.name+'</span>'+
        '<div class="bb-hpbar"><div class="bb-hpfill" id="bbHp"></div></div>'+
      '</div>'+
      '<canvas id="bbCv"></canvas>'+
      '<div class="bb-status-row">'+
        '<span class="bb-hearts" id="bbHearts"></span>'+
        '<span class="bb-dots" id="bbDots"></span>'+
      '</div>'+
      '<div class="bb-redflash" id="bbRed"></div>'+
    '</div>'+
    '<div class="bb-panel" id="bbPanel"></div>';
  document.body.appendChild(stage);

  var cv=document.getElementById('bbCv');
  var arena=document.getElementById('bbArena');
  var panel=document.getElementById('bbPanel');
  var W=720,H=330,DPR=Math.min(2,window.devicePixelRatio||1);
  cv.width=W*DPR; cv.height=H*DPR;
  var ctx2=cv.getContext('2d');
  ctx2.scale(DPR,DPR);

  function renderHud(){
    document.getElementById('bbHp').style.width=(S.hp/HP*100)+'%';
    var hs='';
    for(var i=0;i<HEARTS;i++) hs+='<span class="'+(i<S.hearts?'':'dead')+'">'+(i<S.hearts?'❤️':'🖤')+'</span>';
    document.getElementById('bbHearts').innerHTML=hs;
    var ds='';
    for(var j=0;j<HP;j++) ds+='<span class="bb-dot'+(j<HP-S.hp?' hit':'')+'"></span>';
    document.getElementById('bbDots').innerHTML=ds;
  }

  /* ── パーティクル ── */
  function burst(n,power,colors){
    for(var i=0;i<n;i++){
      var a=Math.random()*Math.PI*2, sp=(0.4+Math.random())*power;
      particles.push({x:W/2,y:H/2-10,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1,
        c:colors[0|Math.random()*colors.length],a2:1,r:2+Math.random()*3.5});
    }
  }

  /* ── 描画ループ ── */
  function loop(){
    var t=(performance.now()-S.t0)/1000;
    ctx2.clearRect(0,0,W,H);
    /* 背景 */
    var g=ctx2.createRadialGradient(W/2,H*0.42,30,W/2,H*0.42,W*0.62);
    g.addColorStop(0,th.dark); g.addColorStop(1,'#060410');
    ctx2.fillStyle=g; ctx2.fillRect(0,0,W,H);
    /* ただよう光の粒 */
    ctx2.save();
    for(var i=0;i<14;i++){
      var px=(i*97+t*12*(i%3+1))%W, py=H-((i*53+t*22)% (H+40));
      ctx2.globalAlpha=0.08+0.05*Math.sin(t*2+i);
      ctx2.fillStyle=th.main;
      ctx2.beginPath(); ctx2.arc(px,py,1.6+i%3,0,Math.PI*2); ctx2.fill();
    }
    ctx2.restore();

    if(S.hurtT>0) S.hurtT=Math.max(0,S.hurtT-1/60);
    if(S.deadT>=0&&S.deadT<1) S.deadT=Math.min(1,S.deadT+1/100);

    /* ボス本体 */
    ctx2.save();
    if(S.hurtT>0){
      ctx2.translate((Math.random()-0.5)*10*S.hurtT,(Math.random()-0.5)*10*S.hurtT);
    }
    if(S.deadT>=0){
      ctx2.globalAlpha=Math.max(0,1-S.deadT*1.15);
      ctx2.translate(0,S.deadT*26);
    }
    cfg.draw(ctx2,W,H,t,{hpRatio:S.hp/HP,hurt:S.hurtT,dead:Math.max(0,S.deadT)});
    ctx2.restore();

    /* 被弾フラッシュ（ボス側・白） */
    if(S.hurtT>0.4){
      ctx2.save();
      ctx2.globalAlpha=(S.hurtT-0.4)*1.2;
      ctx2.fillStyle='#fff';
      ctx2.fillRect(0,0,W,H);
      ctx2.restore();
    }
    /* 死亡フラッシュ */
    if(S.deadT>=0&&S.deadT<0.25){
      ctx2.save();
      ctx2.globalAlpha=1-S.deadT*4;
      ctx2.fillStyle='#fff8d8';
      ctx2.fillRect(0,0,W,H);
      ctx2.restore();
    }
    /* パーティクル */
    for(var k=particles.length-1;k>=0;k--){
      var p=particles[k];
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.07; p.a2-=0.012;
      if(p.a2<=0){ particles.splice(k,1); continue; }
      ctx2.globalAlpha=p.a2; ctx2.fillStyle=p.c;
      ctx2.beginPath(); ctx2.arc(p.x,p.y,p.r,0,Math.PI*2); ctx2.fill();
    }
    ctx2.globalAlpha=1;
    requestAnimationFrame(loop);
  }
  loop();

  /* ── クイズ進行 ── */
  function showQuestion(){
    current=queue[qIdx];
    var choices=current.c.map(function(c,i){ return {c:c,i:i}; });
    shuffle(choices);
    var h='<div class="bb-qno">'+(kids?'もんだい ':'QUESTION ')+(HP-S.hp+1)+' / '+HP+'</div>'+
      '<div class="bb-qtext">'+current.q+'</div>'+
      '<div class="bb-choices">';
    choices.forEach(function(ch){
      h+='<button class="bb-choice" data-i="'+ch.i+'">'+ch.c+'</button>';
    });
    h+='</div><div class="bb-fb" id="bbFb"></div>';
    panel.innerHTML=h;
    Array.prototype.forEach.call(panel.querySelectorAll('.bb-choice'),function(btn){
      btn.addEventListener('click',function(){ answer(parseInt(btn.dataset.i,10),btn); });
    });
  }

  function answer(i,btn){
    var btns=panel.querySelectorAll('.bb-choice');
    Array.prototype.forEach.call(btns,function(b){ b.disabled=true; });
    var fb=document.getElementById('bbFb');
    if(i===current.a){
      btn.classList.add('ok');
      S.hp--; S.hurtT=1;
      burst(34,4.2,[th.main,'#ffe9a8','#fff']);
      SfxHit();
      arena.classList.remove('shake'); void arena.offsetWidth; arena.classList.add('shake');
      renderHud();
      if(window.RPG) RPG.quizCorrect();
      if(S.hp<=0){
        fb.innerHTML='<span style="color:#2ecc71;">'+(kids?'⚔️ かいしんのいちげき！！':'⚔️ 会心の一撃！！')+'</span>';
        setTimeout(win,900);
      }else{
        fb.innerHTML='<span style="color:#2ecc71;">'+(kids?'⚔️ こうげきがヒット！ボスがひるんでいる！':'⚔️ 攻撃がヒット！ボスがひるんでいる！')+'</span>';
        qIdx++;
        setTimeout(showQuestion,1100);
      }
    }else{
      btn.classList.add('ng');
      Array.prototype.forEach.call(btns,function(b){
        if(parseInt(b.dataset.i,10)===current.a) b.classList.add('ok');
      });
      S.hearts--;
      SfxRoar();
      if(window.RPG) RPG.quizWrong();
      document.getElementById('bbRed').classList.remove('on');
      void document.getElementById('bbRed').offsetWidth;
      document.getElementById('bbRed').classList.add('on');
      arena.classList.remove('shake'); void arena.offsetWidth; arena.classList.add('shake');
      renderHud();
      var expl='<span style="color:#ff8a80;">'+(kids?'💥 ボスのはんげき！':'💥 ボスの反撃を受けた！')+'</span>'+
        '<div class="bb-exp">'+(kids?'こたえ：':'正解：')+'<strong>'+current.c[current.a]+'</strong><br>'+current.exp+'</div>';
      if(S.hearts<=0){
        fb.innerHTML=expl;
        setTimeout(lose,1400);
      }else{
        /* 同じスロットに別の問題を補充（なければ同じ問題に再挑戦） */
        if(pool.length>0) queue[qIdx]=pool.shift();
        fb.innerHTML=expl+'<button class="bb-next" id="bbNext">'+(kids?'たちあがって つぎへ →':'立ち上がって次へ →')+'</button>';
        document.getElementById('bbNext').addEventListener('click',showQuestion);
      }
    }
  }

  /* ── 勝利 ── */
  function win(){
    S.deadT=0;
    SfxDeath();
    burst(130,6.5,[th.main,'#ffe9a8','#fff','#e8c96b']);
    setTimeout(function(){ burst(80,5,[th.main,'#ffe9a8']); },420);
    if(window.SND) setTimeout(SND.fanfare,700);
    var first=!RPG.bossCleared(cfg.no);
    RPG.clearBoss(cfg.no);
    if(cfg.enterFlag){ try{ sessionStorage.setItem('rpg_enter_'+cfg.enterFlag,'1'); }catch(e){} }
    if(first&&!localStorage.getItem('rpg_bossxp_'+cfg.no)){
      localStorage.setItem('rpg_bossxp_'+cfg.no,'1');
      setTimeout(function(){ RPG.addXP(cfg.victory.xp,kids?'ボスげきは！！':'ボス撃破！！'); },1200);
    }
    setTimeout(function(){ victoryOverlay(); },2000);
  }
  function victoryOverlay(){
    var v=cfg.victory;
    var ov=document.createElement('div');
    ov.className='bb-ov';
    var h='<div class="bb-ov-inner">'+
      '<div style="font-size:3.4rem;margin-bottom:6px;">'+cfg.theme.icon+'💥</div>'+
      '<div class="bb-win-title">'+(kids?'ボスをたおした！！':'ボス撃破！！')+'</div>'+
      '<div class="bb-win-msg">'+v.msg+'</div>';
    if(v.cta){
      h+='<div><a class="bb-cta" href="'+v.cta.href+'" target="_blank" rel="noopener">'+v.cta.label+'</a>'+
         '<div class="bb-cta-note">'+v.cta.note+'</div></div>';
    }
    h+='<div class="bb-doorzone">'+
        '<div class="bb-door-note">'+v.note+'</div>'+
        '<div class="bb-door">'+
          '<div class="bb-door-light"></div>'+
          '<div class="bb-door-l"></div><div class="bb-door-r"></div>'+
          '<div class="bb-door-frame"></div>'+
        '</div>'+
        '<a class="bb-door-go" href="'+v.doorHref+'">⛩ '+v.doorName+'へ →</a>'+
      '</div></div>';
    ov.innerHTML=h;
    document.body.appendChild(ov);
  }

  /* ── 敗北 ── */
  function lose(){
    var ov=document.createElement('div');
    ov.className='bb-ov';
    ov.innerHTML='<div class="bb-ov-inner">'+
      '<div style="font-size:3.2rem;margin-bottom:10px;">💫</div>'+
      '<div style="font-size:1.5rem;font-weight:900;color:#ff8a80;margin-bottom:16px;letter-spacing:.1em;">'+
        (kids?'たおれてしまった…':'倒れてしまった…')+'</div>'+
      '<div class="bb-win-msg">'+(kids
        ?'まけは はずかしいことじゃない。<br>たちあがらないことだけが、まけなんだ。<br>きみなら ぜったいに倒せる。— 須田先生'
        :'負けは恥ではない。<br>立ち上がらないことだけが、敗北だ。<br>もう一度、挑んでみよう。— 須田先生')+'</div>'+
      '<button class="bb-fight" id="bbRetry">🔥 '+(kids?'もういちど いどむ':'もう一度挑む')+'</button>'+
      '<a class="bb-sub-link" href="'+cfg.fleeHref+'">'+(kids?'しゅぎょうしてから またくる':'修行してから出直す')+'</a>'+
      '</div>';
    document.body.appendChild(ov);
    document.getElementById('bbRetry').addEventListener('click',function(){
      ov.remove();
      resetBattle();
      renderHud();
      showQuestion();
    });
  }

  /* ── 導入 ── */
  function intro(){
    var cleared=window.RPG&&RPG.bossCleared(cfg.no);
    var ov=document.createElement('div');
    ov.className='bb-ov';
    var h='<div class="bb-ov-inner">'+
      '<div class="bb-intro-no">BOSS '+cfg.no+'</div>'+
      '<div class="bb-intro-name">'+cfg.name+'</div>'+
      '<div class="bb-intro-sub">─ '+cfg.sub+' ─</div>';
    cfg.intro.forEach(function(line,i){
      h+='<div class="bb-intro-line" style="animation-delay:'+(0.5+i*0.8)+'s;">'+line+'</div>';
    });
    if(cleared){
      h+='<div style="margin-top:24px;color:#e8c96b;font-weight:900;">👑 '+(kids?'このボスは すでにたおした！':'このボスは既に撃破済みだ。')+'</div>'+
        '<a class="bb-door-go" style="margin-top:18px;" href="'+cfg.victory.doorHref+'">⛩ '+cfg.victory.doorName+'へ →</a>'+
        '<span class="bb-sub-link" id="bbStart">⚔️ '+(kids?'もういちど たたかう（XPはもらえないよ）':'再戦する（XPは入らない）')+'</span>';
    }else{
      h+='<button class="bb-fight" id="bbStart">⚔️ '+(kids?'たたかう':'立ち向かう')+'</button>'+
        '<a class="bb-sub-link" href="'+cfg.fleeHref+'">'+(kids?'まだ こころのじゅんびが…（もどる）':'まだ心の準備が…（戻る）')+'</a>';
    }
    h+='</div>';
    ov.innerHTML=h;
    document.body.appendChild(ov);
    document.getElementById('bbStart').addEventListener('click',function(){
      if(window.SND) SND.click();
      ov.style.transition='opacity .5s'; ov.style.opacity='0';
      setTimeout(function(){ ov.remove(); },500);
      resetBattle();
      renderHud();
      showQuestion();
    });
  }

  resetBattle();
  renderHud();
  panel.innerHTML='<div style="color:#8899aa;font-size:.9rem;">…</div>';
  intro();
}
