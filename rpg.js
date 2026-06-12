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
    document.dispatchEvent(new CustomEvent('rpg:xp',{detail:{xp:xp,level:after}}));
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
           '<a class="rpg-bd-btn gold" href="'+b.nextZone+'">⛩ '+b.nextName+'へ進む →</a>';
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
