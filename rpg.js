/* ════════════════════════════════════════════════════════
   冒険者RPGシステム（サイト全体共通）
   小学生〜研究者まで一本のRPG。
   ※ 効果音・BGMはサイト共通の /math-site/sound.js（window.SND）を使用
   localStorage:
     rpg_name   … 冒険者の名前
     rpg_xp     … 累計経験値
     rpg_streak … クイズ連続正解数
     rpg_visit_<path> … その日ページを開いたか（日付文字列）
     rpg_boss1〜rpg_boss5 … ボス撃破フラグ（'1'）
     rpg_bossxp_1〜5      … ボス撃破XP受取済みフラグ
   sessionStorage:
     rpg_gate_skip_<zone> … ゾーン封印ゲートのすり抜け
     rpg_enter_<zone>     … ボス撃破直後の入場演出用
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── ゾーン判定 ── */
  var ZONE=(function(){
    var p=location.pathname;
    if(p.indexOf('/sho/')>=0) return 'sho';
    if(p.indexOf('/chu/')>=0) return 'chu';
    if(p.indexOf('/ko/')>=0)  return 'ko';
    if(p.indexOf('/dai/')>=0) return 'dai';
    return 'root';
  })();
  var KIDS=(ZONE==='sho');

  /* ── レベル表（小学生〜研究者）── */
  var LEVELS=[
    /* 小学生 */
    {lv:1,  xp:0,     title:'見習い冒険者',   emoji:'🧒', msg:''},
    {lv:2,  xp:100,   title:'算数の戦士',     emoji:'⚔️', msg:'すごい！算数の力がついてきたね。一緒にもっと進もう。— 須田先生'},
    {lv:3,  xp:300,   title:'数学の魔法使い', emoji:'🧙', msg:'ここまで来たか。本物の力がついている。— 須田先生'},
    {lv:4,  xp:600,   title:'伝説の数学者',   emoji:'👑', msg:'君は本物の数学者だ。いつでも会いに来てください。— 須田先生'},
    /* 中学生 */
    {lv:5,  xp:1000,  title:'数式の戦士',     emoji:'🗡️', msg:'文字という新しい武器を手に入れたな。数式は君の剣だ。— 須田先生'},
    {lv:6,  xp:1500,  title:'方程式の解読者', emoji:'📜', msg:''},
    {lv:7,  xp:2100,  title:'図形の騎士',     emoji:'🛡️', msg:''},
    {lv:8,  xp:2800,  title:'関数の魔法使い', emoji:'🔮', msg:'関数を自在に操れるようになった。世界の動きが、式で見えてくるはずだ。— 須田先生'},
    /* 高校生 */
    {lv:9,  xp:3600,  title:'微分の騎士',     emoji:'♞',  msg:'高校数学の世界へようこそ。変化を斬る剣を授けよう。— 須田先生'},
    {lv:10, xp:4500,  title:'積分の導師',     emoji:'🌀', msg:''},
    {lv:11, xp:5500,  title:'極限の探究者',   emoji:'🔭', msg:''},
    {lv:12, xp:6600,  title:'解析学の賢者',   emoji:'🦉', msg:'直感を超えて、厳密さの美しさが見え始めたな。— 須田先生'},
    /* 大学生 */
    {lv:13, xp:7800,  title:'抽象の探求者',   emoji:'🚪', msg:'大学数学の扉を開いたか。ここからは概念そのものと戦う。— 須田先生'},
    {lv:14, xp:9100,  title:'空間の旅人',     emoji:'🧭', msg:''},
    {lv:15, xp:10500, title:'構造の解読者',   emoji:'🗝️', msg:''},
    {lv:16, xp:12000, title:'定理の番人',     emoji:'🏛️', msg:'数学という建築物を、君はもう支える側にいる。— 須田先生'},
    /* 大学院 */
    {lv:17, xp:13600, title:'証明の錬金術師', emoji:'⚗️', msg:'証明は黄金より価値がある。それを生み出す力が君にはある。— 須田先生'},
    {lv:18, xp:15300, title:'予想に挑む者',   emoji:'🔥', msg:''},
    {lv:19, xp:17100, title:'理論の構築者',   emoji:'🌌', msg:''},
    {lv:20, xp:19000, title:'数論の覇者',     emoji:'🐉', msg:'ここまで歩いてきた人間を、私はほとんど知らない。— 須田先生'},
    /* 研究者（これ以降は称号なし・∞） */
    {lv:21, xp:21000, title:'未知への挑戦者', emoji:'♾️', msg:'ここから先に称号はない。あるのは、誰も知らない問いだけだ。君の旅は無限に続く。— 須田先生'}
  ];
  var INF_BASE=21000, INF_STEP=3000; /* Lv21以降は3000XPごとにレベルだけ上がり続ける */

  /* ── ボス一覧 ── */
  var BOSSES={
    1:{name:'文字式の壁', emoji:'🗿', page:'/math-site/boss_1.html', zone:'sho',
       flavor:'数字だけの世界が終わる。xとyが現れた。', nextZone:'/math-site/chu/', nextName:'中学ゾーン'},
    2:{name:'関数の壁',   emoji:'🐲', page:'/math-site/boss_2.html', zone:'chu',
       flavor:'直線が曲がり始める。二次関数の扉が開く。', nextZone:'/math-site/ko/', nextName:'高校ゾーン'},
    3:{name:'εδの壁',   emoji:'👁️', page:'/math-site/boss_3.html', zone:'ko',
       flavor:'直感が通用しなくなる。厳密さが要求される。', nextZone:'/math-site/dai/', nextName:'大学ゾーン'},
    4:{name:'抽象の壁',   emoji:'💠', page:'/math-site/boss_4.html', zone:'dai',
       flavor:'数字が消える。構造だけが残る。', nextZone:'/math-site/boss_5.html', nextName:'最後の壁'},
    5:{name:'研究の壁',   emoji:'🌌', page:'/math-site/boss_5.html', zone:'dai',
       flavor:'正解がない問いに挑む。それが研究だ。', nextZone:'/math-site/mikaiketsu.html', nextName:'未解決問題の世界'}
  };
  function bossCleared(n){ return localStorage.getItem('rpg_boss'+n)==='1'; }
  function clearBoss(n){ localStorage.setItem('rpg_boss'+n,'1'); }

  /* ── 手書き風フォント読み込み ── */
  if(!document.getElementById('rpgFont')){
    var fl=document.createElement('link');
    fl.id='rpgFont'; fl.rel='stylesheet';
    fl.href='https://fonts.googleapis.com/css2?family=Yusei+Magic&display=swap';
    document.head.appendChild(fl);
  }

  /* ── 共通スタイル ── */
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
      '@keyframes rpgGatePulse{from{box-shadow:0 0 14px rgba(200,168,75,.35);}to{box-shadow:0 0 30px rgba(200,168,75,.85);}}'+
      '@keyframes rpgGateFog{0%{transform:translateX(-6%) scale(1);}50%{transform:translateX(6%) scale(1.08);}100%{transform:translateX(-6%) scale(1);}}'+
      '@keyframes rpgEnterFlash{0%{opacity:1;}100%{opacity:0;}}'+
      '.rpg-toast-wrap{position:fixed;right:14px;bottom:84px;z-index:99990;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none;}'+
      '.rpg-toast{background:linear-gradient(135deg,#311b92,#1a2a6c);border:2px solid #c8a84b;color:#ffe9a8;font-weight:900;'+
        'font-family:"Noto Sans JP",sans-serif;font-size:.95rem;padding:10px 18px;border-radius:999px;'+
        'box-shadow:0 4px 18px rgba(0,0,0,.5),0 0 12px rgba(200,168,75,.45);animation:rpgToastIn .35s cubic-bezier(.34,1.56,.64,1);}'+
      '.rpg-toast small{color:#cfd8ff;font-weight:700;margin-left:6px;}';
    document.head.appendChild(st);
  }

  function getXP(){ return parseInt(localStorage.getItem('rpg_xp')||'0',10)||0; }
  function levelFor(xp){
    if(xp>=INF_BASE){
      var n=Math.floor((xp-INF_BASE)/INF_STEP);
      var base=LEVELS[LEVELS.length-1];
      if(n<=0) return base;
      return {lv:21+n, xp:INF_BASE+n*INF_STEP, title:base.title, emoji:base.emoji, msg:'', infinite:true};
    }
    var cur=LEVELS[0];
    for(var i=0;i<LEVELS.length;i++){ if(xp>=LEVELS[i].xp) cur=LEVELS[i]; }
    return cur;
  }
  function nextLevel(xp){
    if(xp>=INF_BASE){
      var n=Math.floor((xp-INF_BASE)/INF_STEP)+1;
      var base=LEVELS[LEVELS.length-1];
      return {lv:21+n, xp:INF_BASE+n*INF_STEP, title:base.title, emoji:base.emoji, msg:'', infinite:true};
    }
    for(var i=0;i<LEVELS.length;i++){ if(xp<LEVELS[i].xp) return LEVELS[i]; }
    return null;
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
    var flash=document.createElement('div');
    flash.style.cssText='position:fixed;inset:0;background:radial-gradient(circle,#fff8d8 0%,#ffd95e 35%,transparent 75%);'+
      'animation:rpgFlash 1.1s ease forwards;pointer-events:none;';
    ov.appendChild(flash);
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
    document.dispatchEvent(new CustomEvent('rpg:xp',{detail:{xp:xp,level:after,amount:n,label:label||''}}));
  }

  /* ── クイズ連携（連続正解ボーナス付き） ── */
  function quizCorrect(){
    addXP(20,KIDS?'クイズせいかい':'クイズ正解');
    var s=(parseInt(localStorage.getItem('rpg_streak')||'0',10)||0)+1;
    if(s>=10){
      localStorage.setItem('rpg_streak','0');
      setTimeout(function(){ addXP(100,KIDS?'10もん れんぞくせいかい！':'10問連続正解！'); },900);
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
      setTimeout(function(){ addXP(10,KIDS?'ページをひらいた':'ページを開いた'); },700);
    }
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',visitBonus);
  }else{
    visitBonus();
  }

  window.RPG={
    LEVELS:LEVELS,
    BOSSES:BOSSES,
    ZONE:ZONE,
    getXP:getXP,
    levelFor:levelFor,
    nextLevel:nextLevel,
    addXP:addXP,
    quizCorrect:quizCorrect,
    quizWrong:quizWrong,
    bossCleared:bossCleared,
    clearBoss:clearBoss
  };
})();

/* ════════════════════════════════════════════════════════
   クエストナビ（教材ページ下部に自動表示）
   いまのステータス＋つぎのクエスト＋マップへのリンク
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var ZONE=window.RPG.ZONE;
  var QUESTS={
    sho:[
      {f:'/math-site/sho/kazu.html',t:'かずのかぞえかた',e:'🔢'},
      {f:'/math-site/sho/tashizan.html',t:'たしざん',e:'➕'},
      {f:'/math-site/sho/hikizan.html',t:'ひきざん',e:'➖'},
      {f:'/math-site/sho/kuku.html',t:'九九の表',e:'✖️'},
      {f:'/math-site/sho/bunsu.html',t:'分数の足し算',e:'🍕'},
      {f:'/math-site/sho/sankaku.html',t:'三角形の面積',e:'📐'},
      {f:'/math-site/sho/en.html',t:'円の面積',e:'⭕'},
      {f:'/math-site/sho/puzzle.html',t:'パズルの塔',e:'🧩'},
      {f:'/math-site/boss_1.html',t:'ボス「文字式の壁」',e:'🗿',boss:1}
    ],
    chu:[
      {f:'/math-site/chu/moji.html',t:'文字式ってなに？',e:'✏️'},
      {f:'/math-site/chu/houteishiki.html',t:'方程式ってなに？',e:'⚖️'},
      {f:'/math-site/chu/ikiji.html',t:'一次関数・グラフ',e:'📈'},
      {f:'/math-site/chu/niji.html',t:'二次関数・放物線',e:'🌉'},
      {f:'/math-site/chu/sanpei.html',t:'三平方の定理',e:'📐'},
      {f:'/math-site/boss_2.html',t:'ボス「関数の壁」',e:'🐲',boss:2}
    ],
    ko:[
      {f:'/math-site/ko/sankakuhi.html',t:'三角関数',e:'🌊'},
      {f:'/math-site/ko/bibun.html',t:'微分・接線',e:'🎢'},
      {f:'/math-site/ko/sekibun.html',t:'積分と面積',e:'🧱'},
      {f:'/math-site/ko/daigaku.html',t:'大学数学への扉',e:'🚪'},
      {f:'/math-site/ko/kyokugen.html',t:'極限とε-δ',e:'🔬'},
      {f:'/math-site/boss_3.html',t:'ボス「εδの壁」',e:'👁️',boss:3}
    ],
    dai:[
      {f:'/math-site/dai/senkei.html',t:'線形写像と次元定理',e:'🧮'},
      {f:'/math-site/dai/gun.html',t:'群論',e:'🔁'},
      {f:'/math-site/dai/fukuso.html',t:'複素関数論',e:'🌀'},
      {f:'/math-site/dai/fourier.html',t:'フーリエ解析',e:'🎵'},
      {f:'/math-site/dai/seisuron.html',t:'整数論',e:'🔢'},
      {f:'/math-site/dai/tahensuu.html',t:'多変数解析・微分形式',e:'🌐'},
      {f:'/math-site/boss_4.html',t:'ボス「抽象の壁」',e:'💠',boss:4},
      {f:'/math-site/boss_5.html',t:'最後の壁「研究の壁」',e:'🌌',boss:5}
    ]
  };
  var ZONE_HOME={sho:'/math-site/sho/',chu:'/math-site/chu/',ko:'/math-site/ko/',dai:'/math-site/dai/'};
  var list=QUESTS[ZONE];
  if(!list) return;
  /* index ページには出さない（専用ステータスがあるため） */
  var path=location.pathname;
  if(/\/(index\.html)?$/.test(path)) return;
  var idx=-1;
  list.forEach(function(q,i){ if(path.indexOf(q.f.replace('/math-site',''))>=0||path===q.f) idx=i; });
  if(idx<0) return;
  var next=list[idx+1]||null;
  var KIDS=(ZONE==='sho');

  function update(){
    if(!window.RPG) return;
    var xp=RPG.getXP(), lv=RPG.levelFor(xp), nx=RPG.nextLevel(xp);
    var face=document.getElementById('rpgAdvFace');
    if(!face) return;
    face.textContent=lv.emoji;
    document.getElementById('rpgAdvLv').textContent='Lv'+lv.lv;
    document.getElementById('rpgAdvFill').style.width=
      nx?Math.min(100,Math.round((xp-lv.xp)/(nx.xp-lv.xp)*100))+'%':'100%';
    document.getElementById('rpgAdvXp').textContent=xp+' XP'+(nx?(KIDS?'（あと'+(nx.xp-xp)+'）':'（あと'+(nx.xp-xp)+'）'):'・MAX👑');
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
      '.rpg-adv-next.boss{color:#ffe9a8;background:linear-gradient(90deg,#5a1010,#8a2020);border:1px solid #e8c96b;'+
        'animation:rpgGatePulse 1.4s ease-in-out infinite alternate;}'+
      '@media(max-width:480px){.rpg-adv{margin:20px 12px;}}';
    document.head.appendChild(css);

    var nextHtml='';
    if(next){
      var isBoss=!!next.boss;
      var label=isBoss
        ?(KIDS?'⚔️ ボスせんへ：':'⚔️ ボス戦へ：')+next.e+' '+next.t+' →'
        :(KIDS?'つぎのぼうけん：':'次のクエスト：')+next.e+' '+next.t+' →';
      nextHtml='<a class="rpg-adv-next'+(isBoss?' boss':'')+'" href="'+next.f+'">'+label+'</a>';
    }
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
        '<a class="rpg-adv-map" href="'+ZONE_HOME[ZONE]+'">🗺️ '+(KIDS?'ぼうけんマップ':'クエストマップ')+'</a>'+
        nextHtml+
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

/* ════════════════════════════════════════════════════════
   ゾーンindex用ウィジェット
   ① #rpgZoneStatus … 冒険者ステータスカード（chu/ko/dai用）
   ② #rpgBossDoor   … ゾーン最深部のボス扉
   ③ ゾーン封印ゲート（未クリアのボスがいる場合の全画面演出）
   ④ ボス撃破直後の入場演出
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var ZONE=window.RPG.ZONE;
  var B=window.RPG.BOSSES;
  var KIDS=(ZONE==='sho');

  /* ゾーンごとの設定：gate=入場に必要なボス / doors=最下部に置くボス扉 */
  var ZCFG={
    sho:{doors:[1]},
    chu:{gate:1, doors:[2]},
    ko :{gate:2, doors:[3]},
    dai:{gate:3, doors:[4,5]}
  };
  var cfg=ZCFG[ZONE];
  if(!cfg) return;

  function isIndex(){ return /\/(index\.html)?$/.test(location.pathname); }

  function css(){
    if(document.getElementById('rpgZoneCss')) return;
    var st=document.createElement('style');
    st.id='rpgZoneCss';
    st.textContent=
      /* ステータスカード */
      '.rpgz-hero{background:linear-gradient(135deg,#1a1040 0%,#241a52 45%,#0f1f4a 100%);'+
        'border:2px solid #c8a84b;border-radius:18px;padding:20px 18px;margin-bottom:28px;'+
        'font-family:"Noto Sans JP",sans-serif;position:relative;overflow:hidden;}'+
      '.rpgz-hero::before{content:"⚔️";position:absolute;font-size:110px;right:-12px;bottom:-26px;opacity:.07;transform:rotate(-12deg);pointer-events:none;}'+
      '.rpgz-top{display:flex;gap:14px;align-items:center;flex-wrap:wrap;}'+
      '.rpgz-avatar{width:64px;height:64px;border-radius:50%;flex-shrink:0;'+
        'background:radial-gradient(circle at 35% 30%,#3a2d7a,#171036);border:3px solid #c8a84b;'+
        'display:flex;align-items:center;justify-content:center;font-size:2.1rem;box-shadow:0 0 16px rgba(200,168,75,.4);}'+
      '.rpgz-info{flex:1;min-width:200px;}'+
      '.rpgz-name-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;}'+
      '.rpgz-name{background:rgba(0,0,0,.35);border:1px solid rgba(200,168,75,.5);border-radius:8px;'+
        'color:#f0f4ff;font-family:inherit;font-weight:700;font-size:.95rem;padding:5px 11px;width:150px;outline:none;}'+
      '.rpgz-name:focus{border-color:#e8c96b;box-shadow:0 0 10px rgba(200,168,75,.3);}'+
      '.rpgz-name::placeholder{color:#667;font-weight:400;}'+
      '.rpgz-sub{font-size:.75rem;color:#8899aa;}'+
      '.rpgz-lvrow{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}'+
      '.rpgz-lv{font-size:1.1rem;font-weight:900;color:#e8c96b;}'+
      '.rpgz-title{font-size:.92rem;font-weight:700;color:#cfd8ff;}'+
      '.rpgz-barwrap{margin-top:10px;}'+
      '.rpgz-bar{height:14px;border-radius:999px;background:rgba(0,0,0,.45);border:1px solid rgba(200,168,75,.45);overflow:hidden;}'+
      '.rpgz-fill{height:100%;border-radius:999px;width:0;background:linear-gradient(90deg,#7c5cbf,#3a6fd8 45%,#e8c96b);'+
        'box-shadow:0 0 12px rgba(200,168,75,.6);transition:width .8s cubic-bezier(.22,1,.36,1);}'+
      '.rpgz-xptext{display:flex;justify-content:space-between;font-size:.72rem;color:#8899aa;margin-top:5px;}'+
      '.rpgz-xptext em{color:#c8a84b;font-style:normal;font-weight:900;}'+
      '.rpgz-bosses{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center;}'+
      '.rpgz-bosslabel{font-size:.68rem;color:#8899aa;font-weight:700;}'+
      '.rpgz-bchip{font-size:.72rem;font-weight:700;border-radius:999px;padding:3px 11px;'+
        'background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);color:#556;}'+
      '.rpgz-bchip.got{color:#e8c96b;border-color:rgba(200,168,75,.55);box-shadow:0 0 8px rgba(200,168,75,.25);}'+
      /* ボス扉 */
      '.rpg-bossdoor{margin-top:36px;font-family:"Noto Sans JP",sans-serif;}'+
      '.rpg-bossdoor-label{font-size:.68rem;font-weight:700;letter-spacing:.2em;color:#c8a84b;text-transform:uppercase;margin-bottom:16px;}'+
      '.rpg-bdcard{position:relative;overflow:hidden;border-radius:18px;border:2px solid #8a2020;'+
        'background:radial-gradient(circle at 50% 0%,#2a1020 0%,#160a14 55%,#0a0810 100%);'+
        'padding:30px 22px;text-align:center;margin-bottom:16px;}'+
      '.rpg-bdcard.cleared{border-color:#c8a84b;background:radial-gradient(circle at 50% 0%,#241a52 0%,#171036 55%,#0a0e1a 100%);}'+
      '.rpg-bdcard.locked{border-color:#333;filter:saturate(.4);}'+
      '.rpg-bdcard::before{content:"";position:absolute;inset:-40%;'+
        'background:radial-gradient(ellipse at 50% 60%,rgba(180,40,40,.16),transparent 60%);'+
        'animation:rpgGateFog 9s ease-in-out infinite;pointer-events:none;}'+
      '.rpg-bdcard.cleared::before{background:radial-gradient(ellipse at 50% 60%,rgba(200,168,75,.14),transparent 60%);}'+
      '.rpg-bd-emoji{font-size:3.2rem;margin-bottom:6px;filter:drop-shadow(0 0 14px rgba(255,120,80,.5));}'+
      '.rpg-bdcard.cleared .rpg-bd-emoji{filter:drop-shadow(0 0 14px rgba(232,201,107,.6));}'+
      '.rpg-bd-no{font-size:.68rem;font-weight:700;letter-spacing:.25em;color:#b06060;margin-bottom:4px;}'+
      '.rpg-bdcard.cleared .rpg-bd-no{color:#c8a84b;}'+
      '.rpg-bd-name{font-size:clamp(1.3rem,5vw,1.8rem);font-weight:900;color:#ffd9c8;letter-spacing:.1em;'+
        'text-shadow:0 0 18px rgba(255,90,60,.45);margin-bottom:8px;}'+
      '.rpg-bdcard.cleared .rpg-bd-name{color:#ffe9a8;text-shadow:0 0 18px rgba(232,201,107,.5);}'+
      '.rpg-bd-flavor{font-size:.88rem;color:#caa;line-height:2;margin-bottom:18px;}'+
      '.rpg-bdcard.cleared .rpg-bd-flavor{color:#aab;}'+
      '.rpg-bd-btn{display:inline-block;text-decoration:none;font-weight:900;font-size:.95rem;'+
        'color:#fff;background:linear-gradient(135deg,#8a2020,#c0392b);padding:13px 34px;border-radius:999px;'+
        'border:1px solid #ffb09a;animation:rpgGatePulse 1.4s ease-in-out infinite alternate;position:relative;z-index:1;}'+
      '.rpg-bd-btn:hover{filter:brightness(1.15);}'+
      '.rpg-bd-btn.gold{background:linear-gradient(135deg,#c8a84b,#e8c96b);color:#1a1040;border-color:#fff3c4;}'+
      '.rpg-bd-done{display:inline-block;font-weight:900;font-size:.85rem;color:#e8c96b;'+
        'border:1px solid rgba(200,168,75,.55);padding:8px 20px;border-radius:999px;margin-bottom:12px;position:relative;z-index:1;}'+
      '.rpg-bd-lock{display:inline-block;font-weight:700;font-size:.85rem;color:#778;padding:8px 4px;position:relative;z-index:1;}'+
      /* 封印ゲート */
      '.rpg-gate{position:fixed;inset:0;z-index:99980;display:flex;align-items:center;justify-content:center;'+
        'flex-direction:column;background:radial-gradient(circle at 50% 30%,#1c0f1e 0%,#0a0810 70%);'+
        'font-family:"Noto Sans JP",sans-serif;text-align:center;padding:24px;overflow:hidden;}'+
      '.rpg-gate::before{content:"";position:absolute;inset:-30%;'+
        'background:radial-gradient(ellipse at 30% 70%,rgba(160,40,40,.18),transparent 55%),'+
        'radial-gradient(ellipse at 70% 40%,rgba(80,40,120,.2),transparent 55%);'+
        'animation:rpgGateFog 11s ease-in-out infinite;pointer-events:none;}'+
      '.rpg-gate-inner{position:relative;z-index:1;max-width:520px;animation:rpgLvPop .55s cubic-bezier(.34,1.56,.64,1);}'+
      '.rpg-gate-emoji{font-size:4rem;filter:drop-shadow(0 0 20px rgba(255,90,60,.55));margin-bottom:10px;}'+
      '.rpg-gate-seal{font-size:.72rem;font-weight:700;letter-spacing:.3em;color:#b06060;margin-bottom:8px;}'+
      '.rpg-gate-name{font-size:clamp(1.6rem,7vw,2.4rem);font-weight:900;color:#ffd9c8;letter-spacing:.12em;'+
        'text-shadow:0 0 24px rgba(255,90,60,.5);margin-bottom:12px;}'+
      '.rpg-gate-flavor{font-size:.95rem;color:#caa;line-height:2.1;margin-bottom:26px;}'+
      '.rpg-gate-btn{display:inline-block;text-decoration:none;font-weight:900;font-size:1.05rem;color:#fff;'+
        'background:linear-gradient(135deg,#8a2020,#c0392b);padding:15px 40px;border-radius:999px;border:1px solid #ffb09a;'+
        'animation:rpgGatePulse 1.3s ease-in-out infinite alternate;}'+
      '.rpg-gate-btn:hover{filter:brightness(1.15);}'+
      '.rpg-gate-skip{display:block;margin-top:22px;font-size:.78rem;color:#667;text-decoration:underline;cursor:pointer;background:none;border:none;font-family:inherit;}'+
      '.rpg-gate-skip:hover{color:#99a;}';
    document.head.appendChild(st);
  }

  /* ── ① ステータスカード ── */
  function buildStatus(){
    var host=document.getElementById('rpgZoneStatus');
    if(!host) return;
    css();
    host.innerHTML=
      '<div class="rpgz-hero">'+
        '<div class="rpgz-top">'+
          '<div class="rpgz-avatar" id="rpgzAvatar">🧒</div>'+
          '<div class="rpgz-info">'+
            '<div class="rpgz-name-row">'+
              '<input class="rpgz-name" id="rpgzName" type="text" maxlength="10" placeholder="冒険者の名前">'+
              '<span class="rpgz-sub">の冒険</span>'+
            '</div>'+
            '<div class="rpgz-lvrow">'+
              '<span class="rpgz-lv" id="rpgzLv">Lv1</span>'+
              '<span class="rpgz-title" id="rpgzTitle"></span>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="rpgz-barwrap">'+
          '<div class="rpgz-bar"><div class="rpgz-fill" id="rpgzFill"></div></div>'+
          '<div class="rpgz-xptext"><span>経験値 <em id="rpgzXp">0</em> XP</span><span id="rpgzNext"></span></div>'+
        '</div>'+
        '<div class="rpgz-bosses" id="rpgzBosses"></div>'+
      '</div>';
    var nameInput=document.getElementById('rpgzName');
    nameInput.value=localStorage.getItem('rpg_name')||'';
    nameInput.addEventListener('input',function(){ localStorage.setItem('rpg_name',nameInput.value.trim()); });
    function render(){
      var xp=RPG.getXP(), lv=RPG.levelFor(xp), nx=RPG.nextLevel(xp);
      document.getElementById('rpgzAvatar').textContent=lv.emoji;
      document.getElementById('rpgzLv').textContent='Lv'+lv.lv;
      document.getElementById('rpgzTitle').textContent=lv.title+lv.emoji;
      document.getElementById('rpgzXp').textContent=xp;
      var fill=document.getElementById('rpgzFill'), nxEl=document.getElementById('rpgzNext');
      if(nx){
        fill.style.width=Math.min(100,Math.round((xp-lv.xp)/(nx.xp-lv.xp)*100))+'%';
        nxEl.innerHTML='次のレベルまで あと <em>'+(nx.xp-xp)+'</em> XP';
      }else{
        fill.style.width='100%'; nxEl.textContent='MAX';
      }
      var bw=document.getElementById('rpgzBosses');
      var h='<span class="rpgz-bosslabel">撃破したボス：</span>';
      for(var i=1;i<=5;i++){
        var got=RPG.bossCleared(i);
        h+='<span class="rpgz-bchip'+(got?' got':'')+'">'+(got?B[i].emoji+' '+B[i].name:'？？？')+'</span>';
      }
      bw.innerHTML=h;
    }
    render();
    document.addEventListener('rpg:xp',render);
  }

  /* ── ② ボス扉 ── */
  function buildDoors(){
    var host=document.getElementById('rpgBossDoor');
    if(!host) return;
    css();
    var h='<div class="rpg-bossdoor">'+
      '<div class="rpg-bossdoor-label">'+(KIDS?'さいごのたたかい':'Boss Gate ─ ゾーン最深部')+'</div>';
    cfg.doors.forEach(function(n){
      var b=B[n];
      var cleared=RPG.bossCleared(n);
      var locked=(n===5&&!RPG.bossCleared(4));
      h+='<div class="rpg-bdcard'+(cleared?' cleared':(locked?' locked':''))+'">'+
        '<div class="rpg-bd-emoji">'+(locked?'🔒':b.emoji)+'</div>'+
        '<div class="rpg-bd-no">BOSS '+n+'</div>'+
        '<div class="rpg-bd-name">'+(locked?'？？？？':b.name)+'</div>'+
        '<div class="rpg-bd-flavor">'+(locked?'「抽象の壁」を倒した者の前にのみ、姿を現す。':b.flavor)+'</div>';
      if(locked){
        h+='<span class="rpg-bd-lock">🔒 封印されている</span>';
      }else if(cleared){
        h+='<div><span class="rpg-bd-done">👑 '+(KIDS?'げきはずみ！':'撃破済み')+'</span></div>'+
           '<div style="font-size:.82rem;color:#ff9d8a;font-weight:700;line-height:2;margin-bottom:12px;position:relative;z-index:1;">「'+(KIDS
             ?'またこい。おまえが くるたびに、おれは つよくなるぞ。'
             :'また来い。お前が来るたびに、俺は強くなる。')+'」</div>'+
           '<a class="rpg-bd-btn" href="'+b.page+'" style="margin:4px;">⚔️ '+(KIDS?'さいしゅうけいたいに さいちょうせん！':'最終形態に再挑戦')+'</a>'+
           '<a class="rpg-bd-btn gold" href="'+b.nextZone+'" style="margin:4px;">⛩ '+b.nextName+'へ進む →</a>';
      }else{
        h+='<a class="rpg-bd-btn" href="'+b.page+'">⚔️ '+(KIDS?'ボスにいどむ':'ボスに挑む')+'</a>';
      }
      h+='</div>';
    });
    h+='</div>';
    host.innerHTML=h;
  }

  /* ── ③ ゾーン封印ゲート（index のみ・未クリア時） ── */
  function buildGate(){
    if(!cfg.gate||!isIndex()) return;
    var n=cfg.gate, b=B[n];
    if(RPG.bossCleared(n)) return;
    if(sessionStorage.getItem('rpg_gate_skip_'+ZONE)==='1') return;
    css();
    document.documentElement.style.overflow='hidden';
    var ZNAME={chu:'中学ゾーン',ko:'高校ゾーン',dai:'大学ゾーン'}[ZONE];
    var ov=document.createElement('div');
    ov.className='rpg-gate';
    ov.innerHTML=
      '<div class="rpg-gate-inner">'+
        '<div class="rpg-gate-emoji">'+b.emoji+'</div>'+
        '<div class="rpg-gate-seal">─ '+ZNAME+'は封印されている ─</div>'+
        '<div class="rpg-gate-name">'+b.name+'</div>'+
        '<div class="rpg-gate-flavor">'+b.flavor+'<br>この扉を開くには、ボス「'+b.name+'」を倒す必要がある。</div>'+
        '<a class="rpg-gate-btn" href="'+b.page+'">⚔️ ボスに挑む</a>'+
        '<button class="rpg-gate-skip" type="button">封印をすり抜けて教材だけ見る（ボスはあとで）</button>'+
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector('.rpg-gate-skip').addEventListener('click',function(){
      sessionStorage.setItem('rpg_gate_skip_'+ZONE,'1');
      document.documentElement.style.overflow='';
      ov.style.transition='opacity .45s'; ov.style.opacity='0';
      setTimeout(function(){ ov.remove(); },460);
    });
  }

  /* ── ④ ボス撃破直後の入場演出 ── */
  function enterFlash(){
    if(!isIndex()) return;
    if(sessionStorage.getItem('rpg_enter_'+ZONE)!=='1') return;
    sessionStorage.removeItem('rpg_enter_'+ZONE);
    var f=document.createElement('div');
    f.style.cssText='position:fixed;inset:0;z-index:99996;pointer-events:none;'+
      'background:radial-gradient(circle,#fff8d8 0%,#ffd95e 30%,transparent 75%);'+
      'animation:rpgEnterFlash 1.6s ease forwards;';
    document.body.appendChild(f);
    setTimeout(function(){ f.remove(); },1700);
    var ZNAME={chu:'中学ゾーン',ko:'高校ゾーン',dai:'大学ゾーン',sho:'小学生ゾーン'}[ZONE]||'新たなゾーン';
    var wrap=document.querySelector('.rpg-toast-wrap');
    if(!wrap){ wrap=document.createElement('div'); wrap.className='rpg-toast-wrap'; document.body.appendChild(wrap); }
    var t=document.createElement('div');
    t.className='rpg-toast';
    t.innerHTML='⛩ '+ZNAME+'に入った！新たな冒険のはじまりだ。';
    wrap.appendChild(t);
    setTimeout(function(){ t.style.animation='rpgToastOut .4s ease forwards'; setTimeout(function(){t.remove();},420); },3800);
  }

  function init(){ buildStatus(); buildDoors(); buildGate(); enterFlash(); }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();

/* ════════════════════════════════════════════════════════
   ステージ体験システム（通常教材ページ）
   小・中学生 … ページモンスターとの戦闘（読む・さわる・解く＝攻撃）
   高校生     … 試練（幻影との戦い＋知識の結晶）
   大学生     … 遺跡探索（解読率→スキル解放）
   ゾーンindex … ボス扉の上に「準備状況」パネル
   localStorage:
     stage_clear_<zone>_<file> … 初回クリア（装備・スキル獲得）
     stage_day_<zone>_<file>   … その日のクリア日付
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var ZONE=window.RPG.ZONE;
  if(ZONE==='root') return;

  var STAGES={
    sho:{mode:'battle',kids:true,boss:1,bossName:'文字式の壁',
      prepLabel:'ぼうけんのじゅんび ─ そうび',
      pages:[
        {f:'kazu.html',    st:'かずの森',         mn:'かぞえムシ',         me:'🐛', di:'🗡️', dn:'はじまりの剣'},
        {f:'tashizan.html',st:'たしざんの草原',   mn:'プラスライム',       me:'🟢', di:'🛡️', dn:'たしざんの盾'},
        {f:'hikizan.html', st:'ひきざんの洞窟',   mn:'マイナスコウモリ',   me:'🦇', di:'🪖', dn:'ひきざんのかぶと'},
        {f:'kuku.html',    st:'九九の火山',       mn:'九九ドラゴン',       me:'🐲', di:'🔥', dn:'九九のほのおの剣'},
        {f:'bunsu.html',   st:'ぶんすうの湖',     mn:'はんぶんゴースト',   me:'👻', di:'🥾', dn:'ぶんすうのブーツ'},
        {f:'sankaku.html', st:'さんかくの塔',     mn:'さんかくガーゴイル', me:'🗿', di:'🧤', dn:'さんかくのこて'},
        {f:'en.html',      st:'まんまる神殿',     mn:'まるまるスピリット', me:'🟡', di:'🪄', dn:'えんのつえ'},
        {f:'puzzle.html',  st:'パズルの塔',       mn:'パズルキーパー',     me:'🧩', di:'💍', dn:'ちえのゆびわ'}
      ]},
    chu:{mode:'battle',kids:false,boss:2,bossName:'関数の壁',
      prepLabel:'装備 ─ ステージクリアで入手',
      pages:[
        {f:'moji.html',       st:'文字式の平原', mn:'シャドウX',             me:'👤', di:'⚔️', dn:'文字の剣'},
        {f:'houteishiki.html',st:'天秤の谷',     mn:'バランスキメラ',        me:'⚖️', di:'🛡️', dn:'等式の盾'},
        {f:'ikiji.html',      st:'直線の荒野',   mn:'グラフウルフ',          me:'🐺', di:'🥾', dn:'傾きのブーツ'},
        {f:'niji.html',       st:'放物線の渓谷', mn:'パラボラファルコン',    me:'🦅', di:'🪶', dn:'放物線の翼'},
        {f:'sanpei.html',     st:'直角の遺跡',   mn:'ピタゴラスコーピオン',  me:'🦂', di:'💎', dn:'三平方の宝玉'}
      ]},
    ko:{mode:'battle',kids:false,trial:true,boss:3,bossName:'εδの壁',
      prepLabel:'知識の結晶 ─ 試練を越えて集めよ',
      pages:[
        {f:'sankakuhi.html',st:'波の試練',   mn:'シヌソイドの幻影', me:'🌊', di:'🔷', dn:'三角関数の結晶'},
        {f:'bibun.html',    st:'瞬間の試練', mn:'タンジェントの影', me:'⚡', di:'💠', dn:'微分の結晶'},
        {f:'sekibun.html',  st:'面積の試練', mn:'リーマンの壁兵',   me:'🧱', di:'🧊', dn:'積分の結晶'},
        {f:'daigaku.html',  st:'亀裂の試練', mn:'大学の門番',       me:'🚪', di:'🔮', dn:'厳密の結晶'},
        {f:'kyokugen.html', st:'無限の試練', mn:'イプシロンの霧',   me:'🌫️', di:'🌀', dn:'極限の結晶'}
      ]},
    dai:{mode:'explore',kids:false,boss:4,bossName:'抽象の壁',
      prepLabel:'解放スキル ─ 探索で会得せよ',
      pages:[
        {f:'senkei.html',  st:'線形空間の遺跡',   me:'🧮', di:'🧮', dn:'次元定理',         fl:'rank + nullity = n ── 空間の骨格を見抜く力'},
        {f:'gun.html',     st:'対称性の聖域',     me:'🔁', di:'🔁', dn:'群の公理',         fl:'結合・単位元・逆元 ── 構造を見る第三の眼'},
        {f:'fukuso.html',  st:'複素平面の海域',   me:'🌀', di:'🌀', dn:'留数定理',         fl:'実軸では見えない流れを、虚軸が教える'},
        {f:'fourier.html', st:'周波数の図書館',   me:'🎵', di:'🎵', dn:'フーリエ展開',     fl:'どんな波も、純音の和に分解できる'},
        {f:'seisuron.html',st:'素数の鉱脈',       me:'🔢', di:'🔢', dn:'合同式',           fl:'数の世界を mod p で切り出す技'},
        {f:'tahensuu.html',st:'多様体の高原',     me:'🌐', di:'🌐', dn:'ストークスの定理', fl:'境界の情報が、内部のすべてを語る'}
      ]}
  };
  var Z=STAGES[ZONE];
  if(!Z) return;
  var KIDS=!!Z.kids;
  var path=location.pathname;
  var today=new Date().toISOString().slice(0,10);

  function clearKey(f){ return 'stage_clear_'+ZONE+'_'+f; }
  function dayKey(f){ return 'stage_day_'+ZONE+'_'+f; }
  function isCleared(f){ return localStorage.getItem(clearKey(f))==='1'; }
  function clearedCount(){
    var n=0; Z.pages.forEach(function(p){ if(isCleared(p.f)) n++; });
    return n;
  }

  /* ── スタイル ── */
  function css(){
    if(document.getElementById('stgCss')) return;
    var st=document.createElement('style');
    st.id='stgCss';
    st.textContent=
      '@keyframes stgShake{0%,100%{transform:translate(0,0) rotate(0);}25%{transform:translate(-3px,1px) rotate(-6deg);}'+
        '50%{transform:translate(3px,-2px) rotate(5deg);}75%{transform:translate(-2px,2px) rotate(-3deg);}}'+
      '@keyframes stgDmg{0%{transform:translateY(0);opacity:1;}100%{transform:translateY(-34px);opacity:0;}}'+
      '@keyframes stgDie{0%{transform:scale(1) rotate(0);opacity:1;}40%{transform:scale(1.25) rotate(8deg);}100%{transform:scale(.1) rotate(180deg);opacity:0;}}'+
      '@keyframes stgPop{0%{transform:scale(.4);opacity:0;}60%{transform:scale(1.08);}100%{transform:scale(1);opacity:1;}}'+
      '@keyframes stgRibbon{0%{transform:translate(-50%,-130%);opacity:0;}12%{transform:translate(-50%,0);opacity:1;}'+
        '85%{transform:translate(-50%,0);opacity:1;}100%{transform:translate(-50%,-130%);opacity:0;}}'+
      '@keyframes stgPart{0%{transform:translate(0,0) scale(1);opacity:1;}100%{transform:translate(var(--dx),var(--dy)) scale(.3);opacity:0;}}'+
      '@keyframes stgLogIn{0%{opacity:0;transform:translateY(8px);}15%{opacity:1;transform:translateY(0);}'+
        '80%{opacity:1;}100%{opacity:0;transform:translateY(-6px);}}'+
      '@keyframes stgGlowP{from{box-shadow:0 0 10px rgba(200,168,75,.4);}to{box-shadow:0 0 26px rgba(200,168,75,.9);}}'+
      '@keyframes stgRingDone{0%{filter:brightness(1);}50%{filter:brightness(2.2);}100%{filter:brightness(1);}}'+
      '.stg-w{position:fixed;left:14px;bottom:14px;z-index:99960;display:flex;align-items:center;gap:9px;'+
        'background:rgba(10,8,26,.92);border:2px solid #c8a84b;border-radius:999px;padding:7px 14px 7px 8px;'+
        'font-family:"Noto Sans JP",sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.55);max-width:235px;}'+
      '.stg-w.gone{transition:opacity .6s,transform .6s;opacity:0;transform:translateY(20px);pointer-events:none;}'+
      '.stg-face{width:46px;height:46px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;'+
        'font-size:1.65rem;background:radial-gradient(circle at 35% 30%,#3a2d5a,#14102a);border:2px solid rgba(200,168,75,.6);'+
        'cursor:pointer;user-select:none;-webkit-user-select:none;}'+
      '.stg-face.hit{animation:stgShake .4s ease;}'+
      '.stg-face.die{animation:stgDie .9s ease forwards;}'+
      '.stg-info{min-width:96px;}'+
      '.stg-name{font-size:.66rem;font-weight:900;color:#ffd9c8;white-space:nowrap;letter-spacing:.04em;}'+
      '.stg-hpbar{height:7px;border-radius:999px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.2);overflow:hidden;margin:3px 0 2px;}'+
      '.stg-hpfill{height:100%;border-radius:999px;width:100%;background:linear-gradient(90deg,#c0392b,#e8884b);transition:width .45s cubic-bezier(.22,1,.36,1);}'+
      '.stg-sub{font-size:.6rem;color:#8899aa;white-space:nowrap;}'+
      '.stg-dmg{position:absolute;top:-6px;left:30px;font-weight:900;font-size:.95rem;color:#ffe9a8;'+
        'text-shadow:0 0 8px rgba(255,180,80,.9);animation:stgDmg .8s ease forwards;pointer-events:none;}'+
      '.stg-part{position:fixed;font-size:1rem;z-index:99961;pointer-events:none;animation:stgPart .8s ease forwards;}'+
      '.stg-w.exp{border-color:#2ee6c8;border-radius:16px;}'+
      '.stg-ring{width:48px;height:48px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;position:relative;}'+
      '.stg-ring-in{width:38px;height:38px;border-radius:50%;background:#0a1420;display:flex;align-items:center;justify-content:center;font-size:1.25rem;}'+
      '.stg-ring.done{animation:stgRingDone 1.2s ease;}'+
      '.stg-w.exp .stg-name{color:#bdfff2;}'+
      '.stg-log{position:fixed;left:18px;bottom:84px;z-index:99959;font-family:"Noto Sans JP",sans-serif;'+
        'font-size:.72rem;font-weight:700;color:#9fe8da;text-shadow:0 0 8px rgba(46,230,200,.6);'+
        'animation:stgLogIn 2.8s ease forwards;pointer-events:none;}'+
      '.stg-ribbon{position:fixed;top:64px;left:50%;transform:translate(-50%,-130%);z-index:99950;'+
        'background:linear-gradient(135deg,#311b92,#1a2a6c);border:2px solid #c8a84b;color:#ffe9a8;'+
        'font-family:"Noto Sans JP",sans-serif;font-weight:900;font-size:.85rem;padding:9px 22px;border-radius:999px;'+
        'box-shadow:0 6px 22px rgba(0,0,0,.55);animation:stgRibbon 3.2s ease forwards;pointer-events:none;'+
        'max-width:92vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'+
      '.stg-ribbon.exp{background:linear-gradient(135deg,#04302a,#0a1420);border-color:#2ee6c8;color:#bdfff2;}'+
      '.stg-clear-ov{position:fixed;inset:0;z-index:99992;display:flex;align-items:center;justify-content:center;'+
        'background:rgba(5,4,14,.78);padding:24px;cursor:pointer;}'+
      '.stg-clear-card{max-width:430px;width:100%;text-align:center;background:linear-gradient(135deg,#1a1040,#241a52 55%,#0f1f4a);'+
        'border:2px solid #c8a84b;border-radius:20px;padding:28px 22px;font-family:"Noto Sans JP",sans-serif;'+
        'box-shadow:0 0 40px rgba(200,168,75,.35);animation:stgPop .5s cubic-bezier(.34,1.56,.64,1);}'+
      '.stg-clear-card.exp{background:linear-gradient(135deg,#04302a,#062430 55%,#0a1420);border-color:#2ee6c8;'+
        'box-shadow:0 0 40px rgba(46,230,200,.3);}'+
      '.stg-cl-title{font-size:1.35rem;font-weight:900;color:#ffe9a8;letter-spacing:.12em;'+
        'text-shadow:0 0 18px rgba(255,217,94,.8);margin-bottom:8px;}'+
      '.stg-clear-card.exp .stg-cl-title{color:#bdfff2;text-shadow:0 0 18px rgba(46,230,200,.8);}'+
      '.stg-cl-line{font-size:.85rem;color:#cfd8ff;margin-bottom:14px;line-height:1.9;}'+
      '.stg-cl-item{font-size:2.6rem;margin:6px 0 2px;filter:drop-shadow(0 0 14px rgba(232,201,107,.7));}'+
      '.stg-cl-iname{font-size:1rem;font-weight:900;color:#e8c96b;margin-bottom:4px;}'+
      '.stg-clear-card.exp .stg-cl-iname{color:#2ee6c8;}'+
      '.stg-cl-fl{font-size:.78rem;color:#8899aa;line-height:1.9;margin-bottom:6px;}'+
      '.stg-cl-boss{display:inline-block;margin-top:12px;text-decoration:none;font-weight:900;font-size:.92rem;color:#fff;'+
        'background:linear-gradient(135deg,#8a2020,#c0392b);border:1px solid #ffb09a;border-radius:999px;padding:12px 28px;'+
        'animation:stgGlowP 1.4s ease-in-out infinite alternate;}'+
      '.stg-cl-close{font-size:.68rem;color:#667;margin-top:12px;}'+
      '.stg-prep{background:#10142a;border:1px solid rgba(200,168,75,.4);border-radius:14px;'+
        'padding:16px 16px 13px;margin-bottom:16px;font-family:"Noto Sans JP",sans-serif;}'+
      '.stg-prep.exp{border-color:rgba(46,230,200,.45);}'+
      '.stg-prep-label{font-size:.66rem;font-weight:700;letter-spacing:.18em;color:#c8a84b;margin-bottom:10px;}'+
      '.stg-prep.exp .stg-prep-label{color:#2ee6c8;}'+
      '.stg-prep-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;}'+
      '.stg-slot{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;'+
        'font-size:1.35rem;background:#0a0e1a;border:1.5px solid rgba(255,255,255,.14);}'+
      '.stg-slot.got{border-color:rgba(200,168,75,.7);box-shadow:0 0 10px rgba(200,168,75,.35);}'+
      '.stg-prep.exp .stg-slot.got{border-color:rgba(46,230,200,.7);box-shadow:0 0 10px rgba(46,230,200,.35);}'+
      '.stg-slot.no{filter:grayscale(1) opacity(.35);}'+
      '.stg-prep-txt{font-size:.76rem;color:#8899aa;line-height:1.8;}'+
      '.stg-prep-txt em{color:#e8c96b;font-style:normal;font-weight:900;}'+
      '.stg-prep-txt.full{color:#ffd9c8;font-weight:700;}'+
      '@media(max-width:480px){.stg-w{max-width:200px;padding:6px 10px 6px 6px;}.stg-info{min-width:80px;}}';
    document.head.appendChild(st);
  }

  /* ════ index：準備状況パネル ════ */
  function renderPrep(){
    var host=document.getElementById('rpgBossDoor');
    if(!host) return;
    css();
    var wrap=host.querySelector('.rpg-bossdoor');
    var n=clearedCount(), total=Z.pages.length;
    var isExp=(Z.mode==='explore');
    var box=document.createElement('div');
    box.className='stg-prep'+(isExp?' exp':'');
    var h='<div class="stg-prep-label">'+Z.prepLabel+'</div><div class="stg-prep-row">';
    Z.pages.forEach(function(p){
      var got=isCleared(p.f);
      h+='<a class="stg-slot '+(got?'got':'no')+'" href="'+p.f+'" title="'+
        (got?p.dn+'（'+p.st+'）':'？？？（'+p.st+'でクリア）')+'" style="text-decoration:none;">'+
        (got?p.di:'❓')+'</a>';
    });
    h+='</div>';
    var word=isExp?'スキル':(ZONE==='ko'?'結晶':'そうび');
    if(n===total){
      h+='<div class="stg-prep-txt full">🔥 '+(KIDS
        ?word+'が ぜんぶ そろった！ボス「'+Z.bossName+'」を たおせるはずだ！'
        :(isExp?'全スキル解放──「'+Z.bossName+'」に挑む準備は整った。'
               :word+'がすべて揃った。「'+Z.bossName+'」に挑む準備は整った。'))+'</div>';
    }else if(n>0){
      h+='<div class="stg-prep-txt">'+word+' <em>'+n+'</em> / '+total+
        (KIDS?' ── ステージをクリアして あつめよう':' ── 各ステージのクリアで入手できる')+'</div>';
    }else{
      h+='<div class="stg-prep-txt">'+(KIDS
        ?'ステージを クリアすると '+word+'が もらえるよ'
        :(isExp?'各教材を探索しきるとスキルを会得できる':'各ステージをクリアすると'+word+'を入手できる'))+'</div>';
    }
    box.innerHTML=h;
    if(wrap&&wrap.firstChild){
      wrap.insertBefore(box,wrap.children[1]||null);
    }else{
      host.appendChild(box);
    }
  }

  /* ════ チェックポイントの問い（ページ別・3問ずつ） ════
     ページを読み進めると敵（幻影・碑文）が問いを仕掛けてくる。
     正解＝大ダメージ／解読前進、不正解＝被弾（解説を読んで立ち上がる）。 */
  var QS={
    'sho/kazu.html':[
      {q:'10の まとまりが 3つ、ばらが 4つ。ぜんぶで いくつ？',c:['7','34','304'],a:1,exp:'10が 3つで 30。30と 4で 34！'},
      {q:'28は 10の まとまりが いくつと、ばらが いくつ？',c:['10が2つと ばら8つ','10が8つと ばら2つ','10が2つと ばら2つ'],a:0,exp:'28は 20と 8。10の まとまりは 2つだね。'},
      {q:'2とびで かぞえると 2, 4, 6, 8…。つぎは？',c:['9','12','10'],a:2,exp:'2ずつ ふえるから、8の つぎは 10！'}
    ],
    'sho/tashizan.html':[
      {q:'8＋5は いくつ？',c:['12','13','14'],a:1,exp:'8に 2を たして 10。のこりの 3を たして 13！'},
      {q:'9＋7。まず 9に いくつ たすと 10に なる？',c:['1','2','3'],a:0,exp:'9＋1で 10。10と のこりの 6で 16！'},
      {q:'30＋40は いくつ？',c:['70','34','60'],a:0,exp:'10の まとまりが 3つと 4つで 7つ。70！'}
    ],
    'sho/hikizan.html':[
      {q:'13－5は いくつ？',c:['7','9','8'],a:2,exp:'13を 10と 3に わける。10－5＝5、5と 3で 8！'},
      {q:'15－9は いくつ？',c:['6','7','5'],a:0,exp:'10－9＝1、1と 5で 6！'},
      {q:'70－20は いくつ？',c:['90','50','5'],a:1,exp:'10の まとまりで 7－2＝5。だから 50！'}
    ],
    'sho/kuku.html':[
      {q:'7×6は いくつ？',c:['42','48','36'],a:0,exp:'7×5＝35に 7を たして 42！'},
      {q:'4×8と おなじ こたえに なるのは？',c:['4＋8','8×4','6×6'],a:1,exp:'かけざんは じゅんばんを かえても おなじ こたえ！'},
      {q:'9×9は いくつ？',c:['72','99','81'],a:2,exp:'9のだんの さいご。81だね！'}
    ],
    'sho/bunsu.html':[
      {q:'1/2 ＋ 1/4 は いくつ？',c:['2/6','3/4','2/4'],a:1,exp:'1/2は 2/4と おなじ。2/4＋1/4＝3/4！'},
      {q:'1/3 と 2/6、おおきいのは どっち？',c:['1/3','2/6','おなじ'],a:2,exp:'2/6を やくぶんすると 1/3。おなじ おおきさ！'},
      {q:'1/2 ＋ 1/3 は いくつ？',c:['5/6','2/5','1/6'],a:0,exp:'分母を 6に そろえて 3/6＋2/6＝5/6！'}
    ],
    'sho/sankaku.html':[
      {q:'底辺6cm・高さ4cmの 三角形の面積は？',c:['24cm²','10cm²','12cm²'],a:2,exp:'6×4÷2＝12。さいごの ÷2を わすれずに！'},
      {q:'三角形の面積で「÷2」するのは なぜ？',c:['長方形の はんぶんだから','たかさが 2つ あるから','そういう きまりだから'],a:0,exp:'おなじ三角形を 2つ あわせると 長方形（平行四辺形）に なるから！'},
      {q:'底辺を 2ばいに すると、面積は？',c:['かわらない','2ばいに なる','4ばいに なる'],a:1,exp:'底辺×高さ÷2 だから、底辺が 2ばいなら 面積も 2ばい！'}
    ],
    'sho/en.html':[
      {q:'円を こまかく切って ならべると、なにに ちかづく？',c:['三角形','星のかたち','長方形'],a:2,exp:'たて＝半径、よこ＝円周の半分の 長方形に なる！'},
      {q:'半径10cmの 円の面積は？（円周率3.14）',c:['314cm²','31.4cm²','100cm²'],a:0,exp:'10×10×3.14＝314！'},
      {q:'ならべて できた長方形の「たて」の ながさは？',c:['直径','半径','円周'],a:1,exp:'ピザのように 切った ひとつぶんの ながさ＝半径！'}
    ],
    'sho/puzzle.html':[
      {q:'1, 2, 4, 8…と ふえていく。つぎは？',c:['16','10','12'],a:0,exp:'2ばいずつ ふえている！8の 2ばいで 16。'},
      {q:'◯＋◯＝10。◯に はいる おなじ かずは？',c:['2','10','5'],a:2,exp:'5＋5＝10！'},
      {q:'3, 6, 9, 12…の なかまで ないのは？',c:['15','20','18'],a:1,exp:'みんな 3のだんの かず。20は 3で わりきれない！'}
    ],
    'chu/moji.html':[
      {q:'a×3 を文字式のルールで書くと？',c:['3a','a3','3×a'],a:0,exp:'数字を前に置き、×記号は省略する。'},
      {q:'x＋x＋x を簡単にすると？',c:['x³','3x','3＋x'],a:1,exp:'xが3個ぶんで 3x。x³は x×x×x なので別物。'},
      {q:'1個150円のりんごを n個買う。代金は？',c:['150＋n 円','n÷150 円','150n 円'],a:2,exp:'150×n。文字との掛け算は ×を省略して 150n。'}
    ],
    'chu/houteishiki.html':[
      {q:'x＋7＝15 のとき、xは？',c:['8','7','22'],a:0,exp:'両辺から7を引いて x＝8。天秤の両側から同じだけ取る。'},
      {q:'3x＝12 のとき、xは？',c:['36','4','9'],a:1,exp:'両辺を3で割って x＝4。'},
      {q:'2x－3＝7。最初の一手は？',c:['両辺を2で割る','両辺から7を引く','両辺に3を足す'],a:2,exp:'まず＋3で 2x＝10。それから2で割って x＝5。'}
    ],
    'chu/ikiji.html':[
      {q:'y＝2x＋3 の「傾き」は？',c:['3','2','x'],a:1,exp:'xが1増えるとyが2増える。それが傾き。'},
      {q:'y＝2x＋3 がy軸と交わる点は？',c:['(0, 3)','(3, 0)','(0, 2)'],a:0,exp:'x＝0のとき y＝3。切片はy軸との交点。'},
      {q:'傾きがマイナスの直線は？',c:['右上がり','水平','右下がり'],a:2,exp:'xが増えるとyが減る＝右下がり。'}
    ],
    'chu/niji.html':[
      {q:'y＝(x－2)²＋1 の頂点は？',c:['(2, 1)','(－2, 1)','(2, －1)'],a:0,exp:'頂点は (p, q)。y＝a(x－p)²＋q の形から読み取る。'},
      {q:'y＝ax² で aを大きくすると、放物線は？',c:['開きが広がる','細く急になる','変わらない'],a:1,exp:'同じxでもyが大きく跳ね上がるので、細く急になる。'},
      {q:'y＝－x² のグラフは？',c:['上に凸（山型）','下に凸（谷型）','直線になる'],a:0,exp:'aが負なら上に凸＝山型。'}
    ],
    'chu/sanpei.html':[
      {q:'直角をはさむ2辺が 3と4。斜辺は？',c:['6','5','7'],a:1,exp:'3²＋4²＝9＋16＝25＝5²。'},
      {q:'三平方の定理 a²＋b²＝c² が成り立つのは？',c:['直角三角形','すべての三角形','二等辺三角形だけ'],a:0,exp:'直角三角形だけ。逆に成り立てば直角三角形だと分かる。'},
      {q:'斜辺13、一辺5の直角三角形。残りの辺は？',c:['8','18','12'],a:2,exp:'13²－5²＝169－25＝144＝12²。'}
    ],
    'ko/sankakuhi.html':[
      {q:'sin 30° の値は？',c:['1/2','√3/2','1'],a:0,exp:'30°・60°・90°の三角形。斜辺2に対して、30°の向かいの辺は1。'},
      {q:'sin²θ＋cos²θ の値は？',c:['θによって変わる','常に1','常に0'],a:1,exp:'単位円上の点(cosθ, sinθ)。原点からの距離は常に1──三平方の定理そのもの。'},
      {q:'tanθ が図形的に表すものは？',c:['原点を通る直線の傾き','扇形の面積','円の周期'],a:0,exp:'tanθ＝sinθ/cosθ＝縦/横＝傾き。'}
    ],
    'ko/bibun.html':[
      {q:'f(x)＝x² の導関数は？',c:['x','x³/3','2x'],a:2,exp:'定義 lim {f(x＋h)－f(x)}/h から (x²)′＝2x。'},
      {q:'微分係数 f′(a) の図形的な意味は？',c:['x＝aでの接線の傾き','x＝aまでの面積','y切片の値'],a:0,exp:'限りなく近い2点を結ぶ直線の極限＝接線の傾き。'},
      {q:'f′(a)＝0 となる点で起こりうるのは？',c:['必ず最大になる','極大・極小の候補になる','グラフが切れる'],a:1,exp:'接線が水平になる点。ただし y＝x³ の原点のような例外もある。'}
    ],
    'ko/sekibun.html':[
      {q:'∫₀¹ x dx の値は？',c:['1','1/2','0'],a:1,exp:'y＝x の下にできる三角形。1×1÷2＝1/2。'},
      {q:'定積分の正体は、何の極限？',c:['接線の傾きの平均','細い長方形の面積の和','数列の差'],a:1,exp:'幅を限りなく細くした長方形たちの和──リーマン和の極限。'},
      {q:'F′(x)＝f(x) のとき、∫ₐᵇ f(x)dx は？',c:['F(b)－F(a)','F(a)－F(b)','F(b)×F(a)'],a:0,exp:'微積分学の基本定理。微分の逆演算が面積を与える。'}
    ],
    'ko/daigaku.html':[
      {q:'「すべてのxでP(x)が成り立つ」の否定は？',c:['すべてのxでP(x)が成り立たない','あるxでP(x)が成り立たない','P(x)は常に真'],a:1,exp:'全否定ではなく「反例が1つ存在する」。論理の基本にして最重要。'},
      {q:'高校の「限りなく近づく」が大学で問題になる理由は？',c:['曖昧で証明の道具にならないから','計算が遅くなるから','答えが変わってしまうから'],a:0,exp:'「近づく」を数式で定義しない限り、厳密な証明は書けない。だからε-δが生まれた。'},
      {q:'なぜ厳密な定義が必要になる？',c:['伝統を守るため','試験に出るため','直感が裏切られる例が実在するから'],a:2,exp:'至るところ微分不可能な連続関数など、直感を超える存在が実際にある。'}
    ],
    'ko/kyokugen.html':[
      {q:'lim x→a f(x)＝L のε-δによる定式化は？',c:['任意のε>0に対し、あるδ>0が存在して…','あるε>0に対し、任意のδ>0で…','ε＝δとなるように選ぶ'],a:0,exp:'どんなに小さな許容誤差εを突きつけられても、応じるδを返せる──それが「近づく」の正体。'},
      {q:'sin x/x の面積による証明に潜む「循環」とは？',c:['xが0で割れないこと','扇形の面積の正当化に、この極限自身が関わること','図の縮尺が不正確なこと'],a:1,exp:'弧度法と扇形の面積を厳密に正当化しようとすると、sinの微分──つまりこの極限──に行き着く。'},
      {q:'はさみうちの原理が使える条件は？',c:['両側の極限が同じ値に収束する','片側だけ収束すればよい','中央の関数が単調増加'],a:0,exp:'g≦f≦h で lim g＝lim h＝L なら lim f＝L。両側が一致してこそ。'}
    ],
    'dai/senkei.html':[
      {q:'線形写像 f: R⁵→R³ で rank f＝3。dim Ker f は？',c:['3','2','5'],a:1,exp:'次元定理：dim Ker f＋rank f＝5。よって 5－3＝2。'},
      {q:'線形写像の定義に含まれる条件は？',c:['f(x＋y)＝f(x)＋f(y) かつ f(cx)＝cf(x)','f(xy)＝f(x)f(y)','f(x)≧0'],a:0,exp:'和とスカラー倍を保つ──線形性こそがすべての出発点。'},
      {q:'rank f が表すものは？',c:['核 Ker f の次元','行列の成分の個数','像 Im f の次元'],a:2,exp:'写像がつぶさずに残せた次元の数。'}
    ],
    'dai/gun.html':[
      {q:'群の公理に含まれないものは？',c:['結合法則','可換性（ab＝ba）','逆元の存在'],a:1,exp:'可換性は不要。可換な群は特別に「アーベル群」と呼ぶ。'},
      {q:'整数の群 (Z, ＋) の単位元は？',c:['0','1','－1'],a:0,exp:'a＋0＝a。加法の単位元は0。乗法なら1。'},
      {q:'3次対称群 S₃ の位数（元の個数）は？',c:['3','9','6'],a:2,exp:'3つの物の並べ替えは 3!＝6通り。最小の非可換群でもある。'}
    ],
    'dai/fukuso.html':[
      {q:'e^iπ の値は？',c:['－1','1','i'],a:0,exp:'オイラーの公式 e^iθ＝cosθ＋i sinθ に θ＝π を代入。'},
      {q:'正則関数が満たす方程式は？',c:['波動方程式','コーシー・リーマンの方程式','熱方程式'],a:1,exp:'u_x＝v_y, u_y＝－v_x。複素微分可能性を実部・虚部へ翻訳したもの。'},
      {q:'単位円周を反時計回りに一周する ∮ dz/z は？',c:['0','π','2πi'],a:2,exp:'z＝e^iθ と置けば ∮i dθ＝2πi。原点の特異点が残す痕跡──留数。'}
    ],
    'dai/fourier.html':[
      {q:'フーリエ級数は、関数を何の和に分解する？',c:['sinとcos（純粋な波）','多項式','階段関数'],a:0,exp:'どんな周期関数も、周波数の異なる純音の重ね合わせで書ける。'},
      {q:'スペクトル（フーリエ係数の大きさ）が表すのは？',c:['関数の最大値','各周波数成分の強さ','微分可能な回数'],a:1,exp:'「どの高さの純音が、どれだけ含まれているか」の一覧表。'},
      {q:'矩形波のフーリエ係数は、高周波になるほど？',c:['一定のまま','増大する','1/n のオーダーで減衰'],a:2,exp:'角（不連続）があると減衰が遅い。滑らかさと係数の減衰速度は表裏一体。'}
    ],
    'dai/seisuron.html':[
      {q:'フェルマーの小定理：pが素数、aがpと互いに素のとき？',c:['a^(p－1) ≡ 1 (mod p)','a^p ≡ 0 (mod p)','a ≡ p (mod a)'],a:0,exp:'mod p の世界では p－1乗で必ず1に戻る。RSA暗号の理論的支柱。'},
      {q:'17 mod 5 は？',c:['3','2','1'],a:1,exp:'17＝5×3＋2。余りは2。'},
      {q:'RSA暗号の安全性が依拠するのは？',c:['円周率の無理性','行列の可逆性','巨大な数の素因数分解の困難さ'],a:2,exp:'掛けるのは一瞬、分解して戻すのは天文学的時間──その非対称性。'}
    ],
    'dai/tahensuu.html':[
      {q:'grad f（勾配）が指す方向は？',c:['fが最も急に増える方向','等高線に沿う方向','常にx軸方向'],a:0,exp:'等高線に直交し、最大増加率の方向を向くベクトル。'},
      {q:'ストークスの定理が結びつけるのは？',c:['微分と極限','領域内部の積分と境界の積分','行列と行列式'],a:1,exp:'∫_M dω＝∫_∂M ω。境界の情報が内部のすべてを語る。'},
      {q:'div F（発散）が表すのは？',c:['流れの回転の強さ','ベクトルの傾き','その点での湧き出しの強さ'],a:2,exp:'湧き出しが正、吸い込みが負。ガウスの定理で体積積分と結ばれる。'}
    ]
  };
  var ROMAN=['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ'];
  var isExp=(Z.mode==='explore');
  var TRIAL=!!Z.trial;

  /* ── 追加スタイル（遭遇演出・問いモーダル） ── */
  function css2(){
    if(document.getElementById('stg2Css')) return;
    var st=document.createElement('style');
    st.id='stg2Css';
    st.textContent=
      '@keyframes stg2In{from{opacity:0;}to{opacity:1;}}'+
      '@keyframes stg2Pop{0%{transform:scale(.4);opacity:0;}60%{transform:scale(1.1);}100%{transform:scale(1);opacity:1;}}'+
      '@keyframes stg2Line{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}'+
      '@keyframes stg2Float{0%,100%{transform:translateY(0);}50%{transform:translateY(-14px);}}'+
      '@keyframes stg2Shake{0%,100%{transform:translate(0,0);}20%{transform:translate(-7px,3px);}40%{transform:translate(6px,-4px);}60%{transform:translate(-5px,-3px);}80%{transform:translate(4px,3px);}}'+
      '@keyframes stg2Red{0%{opacity:.55;}100%{opacity:0;}}'+
      '@keyframes stg2Warn{0%{transform:translate(-50%,-50%) scale(.6);opacity:0;}22%{transform:translate(-50%,-50%) scale(1.06);opacity:1;}78%{opacity:1;}100%{transform:translate(-50%,-50%) scale(1);opacity:0;}}'+
      '@keyframes stg2Pulse{from{box-shadow:0 0 12px rgba(200,168,75,.35);}to{box-shadow:0 0 28px rgba(200,168,75,.85);}}'+
      '.stg2-ov{position:fixed;inset:0;z-index:99985;display:flex;align-items:center;justify-content:center;flex-direction:column;'+
        'padding:24px;text-align:center;font-family:"Noto Sans JP",sans-serif;overflow-y:auto;animation:stg2In .4s ease;}'+
      '.stg2-ov.battle{background:radial-gradient(circle at 50% 30%,#251022 0%,#0a0810 75%);}'+
      '.stg2-ov.trial{background:radial-gradient(circle at 50% 30%,#141022 0%,#07060e 75%);}'+
      '.stg2-ov.exp{background:radial-gradient(circle at 50% 30%,#06251f 0%,#050d12 75%);}'+
      '.stg2-inner{max-width:540px;width:100%;animation:stg2Pop .55s cubic-bezier(.34,1.56,.64,1);}'+
      '.stg2-label{font-size:.72rem;font-weight:700;letter-spacing:.35em;margin-bottom:10px;color:#c8a84b;}'+
      '.stg2-ov.trial .stg2-label{color:#8a7ec8;}'+
      '.stg2-ov.exp .stg2-label{color:#2ee6c8;}'+
      '.stg2-emoji{font-size:4.4rem;margin:8px 0 6px;animation:stg2Float 2.6s ease-in-out infinite;filter:drop-shadow(0 0 18px rgba(255,120,80,.55));}'+
      '.stg2-ov.trial .stg2-emoji{filter:drop-shadow(0 0 18px rgba(138,126,200,.6));}'+
      '.stg2-ov.exp .stg2-emoji{animation:none;filter:drop-shadow(0 0 18px rgba(46,230,200,.55));}'+
      '.stg2-name{display:inline-block;font-size:clamp(1.5rem,6.5vw,2.3rem);font-weight:900;color:#fff;letter-spacing:.12em;'+
        'background:rgba(3,2,10,.92);border:2px solid #e8c96b;border-radius:16px;padding:10px 28px;margin-bottom:12px;'+
        'box-shadow:0 0 24px rgba(200,168,75,.4),inset 0 0 18px rgba(0,0,0,.6);text-shadow:0 2px 6px rgba(0,0,0,.85);}'+
      '.stg2-line{font-size:.98rem;color:#ddccc4;line-height:2.1;opacity:0;animation:stg2Line .7s ease forwards;}'+
      '.stg2-ov.trial .stg2-line{color:#c8c4dd;}'+
      '.stg2-ov.exp .stg2-line{color:#bdd8d2;}'+
      '.stg2-mis{margin:18px auto 0;display:inline-block;text-align:left;background:rgba(0,0,0,.35);'+
        'border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:12px 22px;font-size:.85rem;color:#cfd8ff;line-height:2.1;'+
        'opacity:0;animation:stg2Line .7s ease .9s forwards;}'+
      '.stg2-btn{display:inline-block;margin-top:24px;font-family:inherit;font-weight:900;font-size:1.05rem;color:#fff;'+
        'background:linear-gradient(135deg,#8a2020,#c0392b);border:1px solid #ffb09a;border-radius:999px;'+
        'padding:14px 42px;cursor:pointer;animation:stg2Pulse 1.3s ease-in-out infinite alternate;}'+
      '.stg2-ov.trial .stg2-btn{background:linear-gradient(135deg,#3a2d7a,#5a4ba8);border-color:#bdb2f0;}'+
      '.stg2-ov.exp .stg2-btn{background:linear-gradient(135deg,#0a6e5c,#13a08a);border-color:#9ef0e0;}'+
      '.stg2-btn:hover{filter:brightness(1.15);}'+
      '.stg2-skip{display:block;margin:18px auto 0;font-size:.76rem;color:#667;text-decoration:underline;cursor:pointer;'+
        'background:none;border:none;font-family:inherit;}'+
      '.stg2-skip:hover{color:#99a;}'+
      '.stg2-warn{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99987;'+
        'font-family:"Noto Sans JP",sans-serif;font-weight:900;font-size:clamp(1.1rem,4.6vw,1.7rem);color:#fff;'+
        'background:rgba(3,2,10,.94);border:2px solid #e8c96b;border-radius:999px;padding:14px 32px;'+
        'box-shadow:0 0 28px rgba(200,168,75,.45);text-shadow:0 2px 6px rgba(0,0,0,.85);'+
        'letter-spacing:.1em;animation:stg2Warn 1s ease forwards;'+
        'pointer-events:none;white-space:nowrap;max-width:94vw;overflow:hidden;text-overflow:ellipsis;}'+
      '.stg2-dim{position:fixed;inset:0;z-index:99986;background:rgba(5,4,14,.84);animation:stg2In .3s ease;'+
        'display:flex;align-items:center;justify-content:center;padding:18px;overflow-y:auto;}'+
      '.stg2-q{max-width:480px;width:100%;background:#10142a;border:2px solid #8a2020;border-radius:18px;'+
        'padding:22px 20px;font-family:"Noto Sans JP",sans-serif;color:#f0f4ff;'+
        'animation:stg2Pop .45s cubic-bezier(.34,1.56,.64,1);box-shadow:0 0 34px rgba(192,57,43,.35);margin:auto;}'+
      '.stg2-q.trial{border-color:#5a4ba8;box-shadow:0 0 34px rgba(90,75,168,.4);}'+
      '.stg2-q.exp{border-color:#13a08a;box-shadow:0 0 34px rgba(19,160,138,.35);}'+
      '.stg2-q.shake{animation:stg2Shake .45s ease;}'+
      '.stg2-qno{font-size:.68rem;font-weight:700;letter-spacing:.25em;color:#e8884b;margin-bottom:8px;}'+
      '.stg2-q.trial .stg2-qno{color:#8a7ec8;}'+
      '.stg2-q.exp .stg2-qno{color:#2ee6c8;}'+
      '.stg2-qt{font-size:1.05rem;font-weight:900;line-height:1.9;margin-bottom:14px;}'+
      '.stg2-cs{display:grid;gap:9px;}'+
      '.stg2-c{font-family:inherit;font-size:.95rem;font-weight:700;color:#f0f4ff;background:#1a2235;'+
        'border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:12px 14px;cursor:pointer;transition:all .15s;text-align:left;}'+
      '.stg2-c:hover{border-color:#c8a84b;background:#222c45;}'+
      '.stg2-c.ok{background:#1d4a2a;border-color:#2ecc71;}'+
      '.stg2-c.ng{background:#4a1d1d;border-color:#c0392b;}'+
      '.stg2-c:disabled{cursor:default;}'+
      '.stg2-fb{margin-top:12px;font-size:.92rem;font-weight:900;line-height:1.8;}'+
      '.stg2-exp{margin-top:10px;background:rgba(0,0,0,.3);border-left:3px solid #c8a84b;border-radius:8px;'+
        'padding:9px 13px;font-size:.84rem;color:#cfd8ff;line-height:1.9;font-weight:400;}'+
      '.stg2-go{margin-top:14px;font-family:inherit;font-weight:900;font-size:.92rem;color:#1a1040;'+
        'background:linear-gradient(90deg,#c8a84b,#e8c96b);border:none;border-radius:999px;padding:11px 26px;cursor:pointer;}'+
      '.stg2-go:hover{filter:brightness(1.1);}'+
      '.stg2-red{position:fixed;inset:0;z-index:99999;pointer-events:none;'+
        'background:radial-gradient(circle,rgba(255,40,40,.5),rgba(120,0,0,.75));opacity:0;}'+
      '.stg2-red.on{animation:stg2Red .6s ease forwards;}'+
      '.stg-qdots{display:flex;gap:4px;margin-top:4px;}'+
      '.stg-qdot{width:10px;height:10px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.4);}'+
      '.stg-qdot.ok{background:linear-gradient(135deg,#c8a84b,#e8c96b);border-color:#fff3c4;box-shadow:0 0 6px rgba(232,201,107,.8);}'+
      '.stg-qdot.ng{background:#555;border-color:#777;}'+
      /* 雰囲気レイヤー：ページ全体を「ステージの中」に */
      '.stg3-atmo{position:fixed;inset:0;pointer-events:none;z-index:99940;}'+
      '.stg3-atmo.battle{background:radial-gradient(ellipse at 50% 38%,transparent 52%,rgba(120,20,40,.42) 130%);}'+
      '.stg3-atmo.trial{background:radial-gradient(ellipse at 50% 38%,transparent 52%,rgba(58,45,122,.45) 130%);}'+
      '.stg3-atmo.exp{background:radial-gradient(ellipse at 50% 38%,transparent 52%,rgba(10,90,80,.4) 130%);}'+
      /* 戦闘バー：画面下に常駐するステージHUD */
      '.stg3-bar{position:fixed;left:0;right:0;bottom:0;z-index:99960;'+
        'background:linear-gradient(180deg,rgba(12,9,28,.94),rgba(8,6,20,.99));'+
        'border-top:2px solid #8a2020;box-shadow:0 -6px 24px rgba(0,0,0,.55);'+
        'font-family:"Noto Sans JP",sans-serif;padding:8px 14px;}'+
      '.stg3-bar.trial{border-top-color:#5a4ba8;}'+
      '.stg3-bar.exp{border-top-color:#13a08a;}'+
      '.stg3-bar.clearbar{border-top-color:#c8a84b;box-shadow:0 -6px 24px rgba(200,168,75,.25);}'+
      '.stg3-inner{max-width:760px;margin:0 auto;display:flex;align-items:center;gap:12px;position:relative;}'+
      '.stg3-face{width:44px;height:44px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;'+
        'font-size:1.55rem;background:radial-gradient(circle at 35% 30%,#3a2d5a,#14102a);'+
        'border:2px solid rgba(200,168,75,.6);cursor:pointer;user-select:none;-webkit-user-select:none;}'+
      '.stg3-face.hit{animation:stgShake .4s ease;}'+
      '.stg3-face.die{animation:stgDie .9s ease forwards;}'+
      '.stg3-mid{flex:1;min-width:0;}'+
      '.stg3-top{display:flex;align-items:baseline;gap:8px;white-space:nowrap;overflow:hidden;}'+
      '.stg3-stage{font-size:.6rem;font-weight:700;letter-spacing:.12em;color:#c8a84b;flex-shrink:0;}'+
      '.stg3-bar.trial .stg3-stage{color:#a99ee0;}'+
      '.stg3-bar.exp .stg3-stage{color:#2ee6c8;}'+
      '.stg3-name{font-size:.8rem;font-weight:900;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.9);overflow:hidden;text-overflow:ellipsis;}'+
      '.stg3-hpbar{height:8px;border-radius:999px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.2);overflow:hidden;margin-top:4px;}'+
      '.stg3-hpfill{height:100%;border-radius:999px;width:100%;background:linear-gradient(90deg,#c0392b,#e8884b);'+
        'transition:width .45s cubic-bezier(.22,1,.36,1);}'+
      '.stg3-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;}'+
      '.stg3-sub{font-size:.62rem;color:#8899aa;white-space:nowrap;}'+
      '.stg3-bar .stg-dmg{top:-22px;left:54px;}'+
      '@media(max-width:480px){.stg3-stage{display:none;}.stg3-face{width:38px;height:38px;font-size:1.3rem;}'+
        '.stg3-sub{max-width:120px;overflow:hidden;text-overflow:ellipsis;}}';
    document.head.appendChild(st);
  }

  /* ── 遭遇演出（ボス戦と同格のオープニング） ── */
  function showIntro(pg,idx,onStart){
    var mode=isExp?'exp':(TRIAL?'trial':'battle');
    var ov=document.createElement('div');
    ov.className='stg2-ov '+mode;
    var R=ROMAN[idx]||String(idx+1);
    var h='<div class="stg2-inner">';
    if(isExp){
      h+='<div class="stg2-label">EXPEDITION '+R+' ── 遺跡探索</div>'+
        '<div class="stg2-emoji">'+pg.me+'</div>'+
        '<div class="stg2-name">'+pg.st+'</div>'+
        '<div class="stg2-line" style="animation-delay:.3s">この遺跡には、スキル『'+pg.dn+'』が封印されている。</div>'+
        '<div class="stg2-line" style="animation-delay:1s">'+pg.fl+'</div>'+
        '<div class="stg2-line" style="animation-delay:1.7s">碑文を読み解き、解読率100%でスキルを会得せよ。</div>'+
        '<div><button class="stg2-btn" type="button">🔦 探索を開始する</button></div>';
    }else if(TRIAL){
      h+='<div class="stg2-label">試練 '+R+'</div>'+
        '<div class="stg2-emoji">'+pg.me+'</div>'+
        '<div class="stg2-name">'+pg.st+'</div>'+
        '<div class="stg2-line" style="animation-delay:.3s">'+pg.mn+'が、静かにお前を見ている。</div>'+
        '<div class="stg2-line" style="animation-delay:1.1s">──「理解した」と、言い切れるか。</div>'+
        '<div class="stg2-line" style="animation-delay:1.9s">3つの問いが、それを試す。</div>'+
        '<div><button class="stg2-btn" type="button">試練に踏み込む</button></div>';
    }else{
      h+='<div class="stg2-label">STAGE '+(idx+1)+'</div>'+
        '<div class="stg2-emoji">'+pg.me+'</div>'+
        '<div class="stg2-name">'+pg.st+'</div>'+
        '<div class="stg2-line" style="animation-delay:.3s">'+pg.mn+(KIDS?'が あらわれた！':'が現れた！')+'</div>'+
        '<div class="stg2-mis">'+(KIDS
          ?'📖 よむ ＝ こうげき<br>🖐 さわる ＝ こうげき<br>⚔️ 3つの もんだいに かつ ＝ ひっさつわざ'
          :'📖 読む ＝ 攻撃<br>🖐 操作する ＝ 攻撃<br>⚔️ 3つの問いを制する ＝ 必殺技')+'</div>'+
        '<div><button class="stg2-btn" type="button">⚔️ '+(KIDS?'たたかう！':'戦闘開始')+'</button></div>';
    }
    h+='<button class="stg2-skip" type="button">'+(KIDS?'えんしゅつを とばして よむ':'演出を飛ばして読む')+'</button></div>';
    ov.innerHTML=h;
    document.documentElement.style.overflow='hidden';
    document.body.appendChild(ov);
    if(window.SND) SND.stamp();
    var doneIntro=false;
    function go(){
      if(doneIntro) return;
      doneIntro=true;
      document.documentElement.style.overflow='';
      ov.style.transition='opacity .45s'; ov.style.opacity='0';
      setTimeout(function(){ ov.remove(); },460);
      onStart();
    }
    ov.querySelector('.stg2-btn').addEventListener('click',function(){ if(window.SND) SND.click(); go(); });
    ov.querySelector('.stg2-skip').addEventListener('click',go);
  }

  /* ════ 教材ページ：ステージエンジン v2 ════
     遭遇演出 → ミッション（読む・さわる・問い）→ チェックポイント戦闘 → 勝利
     ボス戦と同じ緊張の弧を、通常ステージにも。 */
  function runStage(pg,idx){
    css(); css2();
    var doneToday=(localStorage.getItem(dayKey(pg.f))===today);
    var firstClear=!isCleared(pg.f);
    var noIntro=(pg.f==='kyokugen.html'); /* kyokugen は独自の冒頭演出を完全保護 */
    var mode=isExp?'exp':(TRIAL?'trial':'battle');

    /* 雰囲気レイヤー：ページ全体を薄くゾーン色で包む */
    if(!noIntro){
      var atmo=document.createElement('div');
      atmo.className='stg3-atmo '+mode;
      document.body.appendChild(atmo);
    }
    document.body.style.paddingBottom='84px';

    /* 既に今日クリア済み → 金色の制圧済みバーを常駐 */
    if(doneToday){
      var cb=document.createElement('div');
      cb.className='stg3-bar clearbar';
      cb.innerHTML='<div class="stg3-inner">'+
        '<div class="stg3-face" style="cursor:default;border-color:#e8c96b;">'+(isExp?pg.di:'👑')+'</div>'+
        '<div class="stg3-mid">'+
          '<div class="stg3-top"><span class="stg3-stage">'+pg.st+'</span>'+
          '<span class="stg3-name" style="color:#ffe9a8;">'+(isExp?'【'+pg.dn+'】会得済み':(KIDS?'クリアずみ！':'攻略済み'))+'</span></div>'+
          '<div class="stg3-hpbar"><div class="stg3-hpfill" style="background:linear-gradient(90deg,#c8a84b,#e8c96b);"></div></div>'+
        '</div>'+
        '<div class="stg3-right"><span class="stg3-sub">'+(KIDS?'また あした あそぼう！':(isExp?'今日の探索は完了':'本日の攻略済み'))+'</span></div>'+
      '</div>';
      document.body.appendChild(cb);
      return;
    }

    var qsArr=QS[ZONE+'/'+pg.f]||[];
    var MAX=isExp?110:130;
    var hp=MAX;
    var perfect=0;
    var questDone=[];           /* 'ok' | 'ng' */
    var started=false, busy=false, done=false;
    var startT=Date.now();

    /* ── 戦闘バー（画面下に常駐するステージHUD） ── */
    var w=document.createElement('div');
    w.className='stg3-bar'+(mode==='battle'?'':' '+mode);
    if(isExp){
      w.innerHTML='<div class="stg3-inner">'+
        '<div class="stg3-face" id="stgFace" style="cursor:default;border-color:rgba(46,230,200,.6);">'+pg.me+'</div>'+
        '<div class="stg3-mid">'+
          '<div class="stg3-top"><span class="stg3-stage">遺跡探索 '+(ROMAN[idx]||'')+'・'+pg.st+'</span>'+
          '<span class="stg3-name" style="color:#bdfff2;">『'+pg.dn+'』封印中</span></div>'+
          '<div class="stg3-hpbar"><div class="stg3-hpfill" id="stgHp" style="width:0%;background:linear-gradient(90deg,#0a6e5c,#2ee6c8);"></div></div>'+
        '</div>'+
        '<div class="stg3-right"><span class="stg3-sub" id="stgSub">解読率 0%</span><div class="stg-qdots" id="stgDots"></div></div>'+
      '</div>';
    }else{
      w.innerHTML='<div class="stg3-inner">'+
        '<div class="stg3-face" id="stgFace" title="'+(KIDS?'たたかう！':'攻撃する')+'">'+pg.me+'</div>'+
        '<div class="stg3-mid">'+
          '<div class="stg3-top"><span class="stg3-stage">'+(TRIAL?'試練 '+(ROMAN[idx]||''):(KIDS?'ステージ':'STAGE')+' '+(idx+1))+'・'+pg.st+'</span>'+
          '<span class="stg3-name">'+pg.mn+'</span></div>'+
          '<div class="stg3-hpbar"><div class="stg3-hpfill" id="stgHp"></div></div>'+
        '</div>'+
        '<div class="stg3-right"><span class="stg3-sub" id="stgSub">'+(KIDS?'よんで・さわって こうげき！':(TRIAL?'読み・操作し・問いに答えよ':'読む・操作する・解く＝攻撃'))+'</span><div class="stg-qdots" id="stgDots"></div></div>'+
      '</div>';
    }
    document.body.appendChild(w);
    var face=document.getElementById('stgFace');

    function paint(){
      if(isExp){
        var pct=Math.round((MAX-Math.max(0,hp))/MAX*100);
        document.getElementById('stgHp').style.width=pct+'%';
        document.getElementById('stgSub').textContent='解読率 '+pct+'%';
      }else{
        document.getElementById('stgHp').style.width=Math.max(0,hp)/MAX*100+'%';
        var sub=document.getElementById('stgSub');
        if(hp<=MAX*0.3) sub.textContent=KIDS?'あとすこし！':'あと一撃か…！';
        else if(hp<=MAX*0.6) sub.textContent=KIDS?'よわってきた！':'ひるんでいる！';
      }
    }
    function paintDots(){
      var d=document.getElementById('stgDots');
      if(!d) return;
      if(!qsArr.length){ d.style.display='none'; return; }
      var h='';
      for(var i=0;i<qsArr.length;i++){
        h+='<span class="stg-qdot'+(questDone[i]==='ok'?' ok':(questDone[i]==='ng'?' ng':''))+'"></span>';
      }
      d.innerHTML=h;
    }

    function floatDmg(n){
      var d=document.createElement('span');
      d.className='stg-dmg';
      d.textContent=isExp?'+'+n+'%':'-'+n;
      if(isExp) d.style.color='#9fe8da';
      w.appendChild(d);
      setTimeout(function(){ d.remove(); },820);
    }
    function explodeAt(el,emojis){
      if(!el) return;
      var r=el.getBoundingClientRect();
      var ex=r.left+r.width/2, ey=r.top+r.height/2;
      for(var i=0;i<10;i++){
        var p=document.createElement('span');
        p.className='stg-part';
        p.textContent=emojis[i%emojis.length];
        var a=Math.PI*2*i/10;
        p.style.left=ex+'px'; p.style.top=ey+'px';
        p.style.setProperty('--dx',(Math.cos(a)*(40+Math.random()*40))+'px');
        p.style.setProperty('--dy',(Math.sin(a)*(40+Math.random()*40)-20)+'px');
        document.body.appendChild(p);
        (function(pp){ setTimeout(function(){ pp.remove(); },850); })(p);
      }
    }
    function log(text){
      var l=document.createElement('div');
      l.className='stg-log';
      l.textContent=text;
      document.body.appendChild(l);
      setTimeout(function(){ l.remove(); },2900);
    }

    var EXPLORE_LOGS=['✦ 断章を解読した','✦ 構造の輪郭が見えてきた','✦ 古い証明の跡を見つけた','✦ 核心に近づいている'];
    var logIdx=0;
    function hit(n){
      if(done) return;
      hp-=n;
      paint();
      floatDmg(n);
      if(isExp){
        var pct=(MAX-hp)/MAX*100;
        if(logIdx<EXPLORE_LOGS.length&&pct>=25*(logIdx+1)){
          log(EXPLORE_LOGS[logIdx]); logIdx++;
        }
      }else{
        face.classList.remove('hit'); void face.offsetWidth; face.classList.add('hit');
        if(window.SND) SND.click();
      }
      if(hp<=0){ done=true; finish(); }
    }

    /* ── チェックポイント戦闘（敵の問い） ── */
    function ambush(qi){
      busy=true;
      var Q=qsArr[qi];
      if(window.SND){ if(isExp){SND.badge();}else{SND.wrong();} }
      var wv=document.createElement('div');
      wv.className='stg2-warn';
      wv.textContent=isExp?'📜 碑文が浮かび上がった…'
        :(TRIAL?'──幻影が、問いを放つ'
        :'⚠️ '+pg.mn+(KIDS?'の こうげき！':'の攻撃！'));
      document.body.appendChild(wv);
      setTimeout(function(){ wv.remove(); openQ(); },1000);

      function openQ(){
        var dim=document.createElement('div'); dim.className='stg2-dim';
        var card=document.createElement('div');
        card.className='stg2-q'+(TRIAL?' trial':(isExp?' exp':''));
        var qlabel=isExp?'碑文の解読 ':(TRIAL?'幻影の問い ':(KIDS?'もんだい ':'敵の問い '));
        var h='<div class="stg2-qno">'+qlabel+(qi+1)+' / '+qsArr.length+'</div>'+
          '<div class="stg2-qt">'+Q.q+'</div><div class="stg2-cs">';
        for(var i=0;i<Q.c.length;i++){
          h+='<button class="stg2-c" type="button" data-i="'+i+'">'+Q.c[i]+'</button>';
        }
        h+='</div><div class="stg2-tail"></div>';
        card.innerHTML=h;
        dim.appendChild(card);
        document.body.appendChild(dim);
        var answered=false;
        var btns=card.querySelectorAll('.stg2-c');
        Array.prototype.forEach.call(btns,function(btn){
          btn.addEventListener('click',function(){
            if(answered) return;
            answered=true;
            var i=parseInt(btn.getAttribute('data-i'),10);
            var ok=(i===Q.a);
            Array.prototype.forEach.call(btns,function(bb){ bb.disabled=true; });
            var tail=card.querySelector('.stg2-tail');
            if(ok){
              btn.classList.add('ok');
              if(window.SND) SND.correct();
              tail.innerHTML='<div class="stg2-fb" style="color:#7bd88a;">'+
                (isExp?'✦ 解読成功。封印が緩む。':(TRIAL?'──正答。幻影が一歩、退いた。':(KIDS?'⚡ かいしんの いちげき！':'⚡ 会心の一撃！')))+'</div>'+
                (Q.exp?'<div class="stg2-exp">'+Q.exp+'</div>':'')+
                '<button class="stg2-go" type="button">'+
                (isExp?'解読を続ける':(TRIAL?'先へ進む':(KIDS?'⚔️ はんげき！':'⚔️ 反撃する')))+'</button>';
            }else{
              btn.classList.add('ng');
              if(btns[Q.a]) btns[Q.a].classList.add('ok');
              if(window.SND) SND.wrong();
              card.classList.add('shake');
              var red=document.createElement('div'); red.className='stg2-red on';
              document.body.appendChild(red);
              setTimeout(function(){ red.remove(); },650);
              if(!isExp){ hp=Math.min(MAX,hp+8); paint(); }
              tail.innerHTML='<div class="stg2-fb" style="color:#ff9d8a;">'+
                (isExp?'──解読を誤った。だが、断片は手に入れた。'
                :(TRIAL?'──幻影に呑まれた。正しい答えを目に焼き付けろ。'
                :(KIDS?'💥 こうげきを うけた！ '+pg.mn+'は かいふくした…':'💥 被弾！ '+pg.mn+'は回復している…')))+'</div>'+
                (Q.exp?'<div class="stg2-exp">'+Q.exp+'</div>':'')+
                '<button class="stg2-go" type="button">'+
                (isExp?'探索に戻る':(KIDS?'たちあがる':'立ち上がる'))+'</button>';
            }
            tail.querySelector('.stg2-go').addEventListener('click',function(){
              dim.remove();
              busy=false;
              questDone[qi]=ok?'ok':'ng';
              paintDots();
              if(ok){
                perfect++;
                if(!isExp) explodeAt(face,['💥','✨','⭐']);
                hit(22);
              }else{
                hit(isExp?6:10);
              }
            });
          });
        });
      }
    }

    /* 問いのスケジューラ：スクロール到達 or 経過時間で発動 */
    var THRESH=[0.25,0.5,0.78];
    var nextQ=0;
    function depth(){
      var h=document.documentElement;
      var total=h.scrollHeight-window.innerHeight;
      if(total<200) return 1;
      return (window.scrollY||h.scrollTop)/total;
    }
    var qIv=setInterval(function(){
      if(done||nextQ>=qsArr.length){ clearInterval(qIv); return; }
      if(!started||busy) return;
      if(document.visibilityState!=='visible') return;
      var due=depth()>=(THRESH[nextQ]||0.9)||(Date.now()-startT)>(nextQ+1)*50000;
      if(due){ var qi=nextQ; nextQ++; ambush(qi); }
    },1500);

    /* ── 進行ソース ── */
    /* ① スクロール到達度 */
    var marks=[0.15,0.35,0.55,0.75,0.92], mi=0;
    var scTm=null;
    window.addEventListener('scroll',function(){
      if(scTm||!started||busy) return;
      scTm=setTimeout(function(){
        scTm=null;
        if(!started||busy||done) return;
        var d=depth();
        while(mi<marks.length&&d>=marks[mi]){ hit(10); mi++; }
      },350);
    },{passive:true});
    /* 短いページ救済：スクロール不可なら時間で消化 */
    if(document.documentElement.scrollHeight-window.innerHeight<200){
      var shortIv=setInterval(function(){
        if(mi>=marks.length||done){ clearInterval(shortIv); return; }
        if(!started||busy) return;
        if(document.visibilityState==='visible'){ hit(10); mi++; }
      },8000);
    }
    /* ② 滞在（じっくり読む） */
    var ticks=0;
    var tickIv=setInterval(function(){
      if(done){ clearInterval(tickIv); return; }
      if(!started||busy) return;
      if(document.visibilityState!=='visible') return;
      if(ticks>=5){ clearInterval(tickIv); return; }
      ticks++; hit(4);
    },15000);
    /* ③ 操作（さわって学ぶ） */
    var inter=0, lastInter=0;
    document.addEventListener('pointerdown',function(e){
      if(done||busy||!started||inter>=5) return;
      var t=e.target;
      if(!t||w.contains(t)) return;
      if(t.closest&&t.closest('.rpg-adv,.stg3-bar,.site-nav,.stg-clear-ov,.stg2-ov,.stg2-dim')) return;
      if(!(t.closest&&t.closest('button,input,select,canvas,[type=range],.choice-btn'))) return;
      var now=Date.now();
      if(now-lastInter<2000) return;
      lastInter=now; inter++;
      hit(6);
    },true);
    /* ④ ページ内クイズ・パズル正解＝大ダメージ */
    document.addEventListener('rpg:xp',function(e){
      if(done) return;
      var lb=(e.detail&&e.detail.label)||'';
      if(lb.indexOf('クイズ')>=0||lb.indexOf('パズル')>=0) hit(12);
    });
    /* ⑤ モンスターを直接たたく（battleのみ・上限あり） */
    if(!isExp){
      var taps=0, lastTap=0;
      face.addEventListener('pointerdown',function(){
        if(done||taps>=10) return;
        var now=Date.now();
        if(now-lastTap<500) return;
        lastTap=now; taps++;
        hit(1);
      });
    }

    /* ── クリア ── */
    function finish(){
      localStorage.setItem(dayKey(pg.f),today);
      if(firstClear) localStorage.setItem(clearKey(pg.f),'1');
      var isPerfect=(qsArr.length>0&&perfect===qsArr.length);
      if(isExp){
        if(window.SND) SND.badge();
        explodeAt(face,['✦','✧','💠']);
      }else{
        if(window.SND) SND.clear();
        face.classList.add('die');
        explodeAt(face,['💥','✨','⭐']);
      }
      /* バーは消さず「制圧済み」の金色状態へ ── ステージ感を最後まで維持 */
      setTimeout(function(){
        w.classList.add('clearbar');
        w.querySelector('.stg3-inner').innerHTML=
          '<div class="stg3-face" style="cursor:default;border-color:#e8c96b;">'+(isExp?pg.di:'👑')+'</div>'+
          '<div class="stg3-mid">'+
            '<div class="stg3-top"><span class="stg3-stage">'+pg.st+'</span>'+
            '<span class="stg3-name" style="color:#ffe9a8;">'+(isExp?'『'+pg.dn+'』会得！':(KIDS?'ステージクリア！':'ステージ攻略！'))+'</span></div>'+
            '<div class="stg3-hpbar"><div class="stg3-hpfill" style="background:linear-gradient(90deg,#c8a84b,#e8c96b);"></div></div>'+
          '</div>'+
          '<div class="stg3-right"><span class="stg3-sub" style="color:#e8c96b;">'+(KIDS?'よく がんばった！':'勝利')+'</span></div>';
      },1000);

      var xp=firstClear?(isExp?60:40):10;
      var xLabel;
      if(firstClear) xLabel=isExp?'スキル会得！':(KIDS?'ステージクリア！':'ステージ攻略！');
      else xLabel=KIDS?'ふくしゅうクリア！':'復習クリア！';
      setTimeout(function(){ if(window.RPG) RPG.addXP(xp,xLabel); },1100);
      if(isPerfect){
        setTimeout(function(){ if(window.RPG) RPG.addXP(25,KIDS?'パーフェクト！':'完全勝利！'); },2000);
      }

      if(firstClear){
        setTimeout(function(){ clearPop(isPerfect); },1600);
      }
    }

    function clearPop(isPerfect){
      var allNow=(clearedCount()===Z.pages.length);
      var bossDone=window.RPG&&RPG.bossCleared(Z.boss);
      var bossPage='/math-site/boss_'+Z.boss+'.html';
      var ov=document.createElement('div');
      ov.className='stg-clear-ov';
      var h='<div class="stg-clear-card'+(isExp?' exp':'')+'">';
      if(isExp){
        h+='<div class="stg-cl-title">スキル解放</div>'+
          '<div class="stg-cl-item">'+pg.di+'</div>'+
          '<div class="stg-cl-iname">【'+pg.dn+'】</div>'+
          '<div class="stg-cl-fl">'+pg.fl+'</div>';
      }else{
        h+='<div class="stg-cl-title">⭐ '+(KIDS?'ステージクリア！':'ステージ攻略！')+'</div>'+
          '<div class="stg-cl-line">'+pg.mn+'を '+(KIDS?'たおした！':'打ち破った！')+'</div>'+
          '<div class="stg-cl-item">'+pg.di+'</div>'+
          '<div class="stg-cl-iname">'+pg.dn+' を '+(KIDS?'てにいれた！':'手に入れた！')+'</div>';
      }
      if(isPerfect){
        h+='<div class="stg-cl-line" style="color:#ffe9a8;">⚡ '+(KIDS
          ?'パーフェクト！すべての もんだいに いちげきで せいかい！'
          :'完全勝利 ── すべての問いに一発で正解。')+'</div>';
      }
      if(allNow&&!bossDone){
        h+='<div class="stg-cl-line" style="margin-top:10px;color:#ffd9c8;">'+(KIDS
          ?'🔥 そうびが ぜんぶ そろった！<br>ボスを たおせるのは いまだ！'
          :(isExp?'全スキルを解放した。<br>「'+Z.bossName+'」に挑む準備は整った。'
            :'すべて揃った。<br>「'+Z.bossName+'」に挑む準備は整った。'))+'</div>'+
          '<a class="stg-cl-boss" href="'+bossPage+'">⚔️ ボス「'+Z.bossName+'」に挑む</a>';
      }else if(!bossDone){
        var remain=Z.pages.length-clearedCount();
        h+='<div class="stg-cl-fl" style="margin-top:8px;">'+(KIDS
          ?'ボス「'+Z.bossName+'」までに あと '+remain+'ステージ！'
          :'ボス「'+Z.bossName+'」戦まで、残り'+remain+'ステージ。')+'</div>';
      }
      h+='<div class="stg-cl-close">'+(KIDS?'タップでとじる':'クリックで閉じる')+'</div></div>';
      ov.innerHTML=h;
      document.body.appendChild(ov);
      if(window.SND&&!isExp) SND.stamp();
      function close(){ ov.style.transition='opacity .4s'; ov.style.opacity='0'; setTimeout(function(){ ov.remove(); },420); }
      ov.addEventListener('click',function(e){ if(!(e.target.closest&&e.target.closest('a'))) close(); });
      setTimeout(close,9000);
    }

    paint();
    paintDots();

    /* ── 開始：遭遇演出（1セッション1回）or 入場リボン ── */
    function startStage(){
      started=true;
      startT=Date.now();
    }
    var introKey='stg2_intro_'+ZONE+'_'+pg.f;
    if(!noIntro&&!sessionStorage.getItem(introKey)){
      sessionStorage.setItem(introKey,'1');
      showIntro(pg,idx,startStage);
    }else{
      startStage();
    }
  }

  /* ── 起動 ── */
  function init(){
    if(/\/(index\.html)?$/.test(path)){ renderPrep(); return; }
    var m=path.match(/([a-z]+\.html)$/);
    if(!m) return;
    var pg=null, idx=0;
    Z.pages.forEach(function(p,i){ if(p.f===m[1]){ pg=p; idx=i; } });
    if(pg) runStage(pg,idx);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
