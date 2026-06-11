/* ── 冒険者RPGシステム（小学生ゾーン共通） ──
   ※ 効果音・BGMはサイト共通の /math-site/sound.js（window.SND）を使用
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
