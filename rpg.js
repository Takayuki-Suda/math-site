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

  /* ════ 教材ページ：ステージエンジン ════ */
  function runStage(pg){
    css();
    var doneToday=(localStorage.getItem(dayKey(pg.f))===today);
    var firstClear=!isCleared(pg.f);
    var isExp=(Z.mode==='explore');

    /* 既に今日クリア済み → 小さなバッジだけ */
    if(doneToday){
      var b=document.createElement('div');
      b.className='stg-w'+(isExp?' exp':'');
      b.style.opacity='.82';
      b.innerHTML='<div class="stg-face" style="cursor:default;">'+(isExp?pg.di:'👑')+'</div>'+
        '<div class="stg-info"><div class="stg-name">'+(isExp?'【'+pg.dn+'】会得済み':pg.st+(KIDS?' クリアずみ':' 攻略済み'))+'</div>'+
        '<div class="stg-sub">'+(KIDS?'また あした あそぼう！':(isExp?'今日の探索は完了':'本日の攻略済み'))+'</div></div>';
      document.body.appendChild(b);
      return;
    }

    /* 入場リボン */
    var rb=document.createElement('div');
    rb.className='stg-ribbon'+(isExp?' exp':'');
    rb.textContent=isExp
      ?'📜 探索開始 ── '+pg.st
      :'⚔️ '+pg.st+' ── '+pg.mn+(KIDS?'が あらわれた！':'が現れた！');
    document.body.appendChild(rb);
    setTimeout(function(){ rb.remove(); },3300);

    /* ウィジェット */
    var hp=100;
    var w=document.createElement('div');
    if(isExp){
      w.className='stg-w exp';
      w.innerHTML=
        '<div class="stg-ring" id="stgRing"><div class="stg-ring-in" id="stgFace">'+pg.me+'</div></div>'+
        '<div class="stg-info">'+
          '<div class="stg-name">'+pg.st+'</div>'+
          '<div class="stg-sub" id="stgSub">解読率 0%</div>'+
        '</div>';
    }else{
      w.className='stg-w';
      w.innerHTML=
        '<div class="stg-face" id="stgFace" title="'+(KIDS?'たたかう！':'攻撃する')+'">'+pg.me+'</div>'+
        '<div class="stg-info">'+
          '<div class="stg-name">'+pg.mn+'</div>'+
          '<div class="stg-hpbar"><div class="stg-hpfill" id="stgHp"></div></div>'+
          '<div class="stg-sub" id="stgSub">'+(KIDS?'よんで・さわって こうげき！':'読む・操作する・解く＝攻撃')+'</div>'+
        '</div>';
    }
    document.body.appendChild(w);
    var face=document.getElementById('stgFace');
    var done=false;

    function paint(){
      if(isExp){
        var pct=100-Math.max(0,hp);
        var ring=document.getElementById('stgRing');
        ring.style.background='conic-gradient(#2ee6c8 '+(pct*3.6)+'deg, rgba(46,230,200,.16) 0deg)';
        document.getElementById('stgSub').textContent='解読率 '+pct+'%';
      }else{
        document.getElementById('stgHp').style.width=Math.max(0,hp)+'%';
        var sub=document.getElementById('stgSub');
        if(hp<=30) sub.textContent=KIDS?'あとすこし！':'あと一撃か…！';
        else if(hp<=60) sub.textContent=KIDS?'よわってきた！':'ひるんでいる！';
      }
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
        if(logIdx<EXPLORE_LOGS.length&&(100-hp)>=25*(logIdx+1)){
          log(EXPLORE_LOGS[logIdx]); logIdx++;
        }
      }else{
        face.classList.remove('hit'); void face.offsetWidth; face.classList.add('hit');
        if(window.SND) SND.click();
      }
      if(hp<=0){ done=true; finish(); }
    }

    /* ── 進行ソース ── */
    /* ① スクロール到達度 */
    var marks=[0.15,0.35,0.55,0.75,0.92], mi=0;
    function depth(){
      var h=document.documentElement;
      var total=h.scrollHeight-window.innerHeight;
      if(total<200) return 1;
      return (window.scrollY||h.scrollTop)/total;
    }
    var scTm=null;
    window.addEventListener('scroll',function(){
      if(scTm) return;
      scTm=setTimeout(function(){
        scTm=null;
        var d=depth();
        while(mi<marks.length&&d>=marks[mi]){ hit(12); mi++; }
      },350);
    },{passive:true});
    /* 短いページ救済：スクロール不可なら時間で消化 */
    if(document.documentElement.scrollHeight-window.innerHeight<200){
      var shortIv=setInterval(function(){
        if(mi>=marks.length||done){ clearInterval(shortIv); return; }
        if(document.visibilityState==='visible'){ hit(12); mi++; }
      },8000);
    }
    /* ② 滞在（じっくり読む） */
    var ticks=0;
    var tickIv=setInterval(function(){
      if(done){ clearInterval(tickIv); return; }
      if(document.visibilityState!=='visible') return;
      if(ticks>=5){ clearInterval(tickIv); return; }
      ticks++; hit(6);
    },15000);
    /* ③ 操作（さわって学ぶ） */
    var inter=0, lastInter=0;
    document.addEventListener('pointerdown',function(e){
      if(done||inter>=5) return;
      var t=e.target;
      if(!t||w.contains(t)) return;
      if(t.closest&&t.closest('.rpg-snd,.rpg-adv,.stg-w,.site-nav,.stg-clear-ov')) return;
      if(!(t.closest&&t.closest('button,input,select,canvas,[type=range],.choice-btn'))) return;
      var now=Date.now();
      if(now-lastInter<2000) return;
      lastInter=now; inter++;
      hit(8);
    },true);
    /* ④ クイズ・パズル正解＝大ダメージ */
    document.addEventListener('rpg:xp',function(e){
      if(done) return;
      var lb=(e.detail&&e.detail.label)||'';
      if(lb.indexOf('クイズ')>=0||lb.indexOf('パズル')>=0) hit(15);
    });
    /* ⑤ モンスターを直接たたく（battleのみ・上限あり） */
    if(!isExp){
      var taps=0, lastTap=0;
      face.addEventListener('pointerdown',function(){
        if(done||taps>=10) return;
        var now=Date.now();
        if(now-lastTap<500) return;
        lastTap=now; taps++;
        hit(2);
      });
    }

    /* ── クリア ── */
    function finish(){
      localStorage.setItem(dayKey(pg.f),today);
      if(firstClear) localStorage.setItem(clearKey(pg.f),'1');
      if(isExp){
        var ring=document.getElementById('stgRing');
        ring.classList.add('done');
        if(window.SND) SND.badge();
        explodeAt(ring,['✦','✧','💠']);
      }else{
        if(window.SND) SND.clear();
        face.classList.add('die');
        explodeAt(face,['💥','✨','⭐']);
      }
      setTimeout(function(){ w.classList.add('gone'); setTimeout(function(){ w.remove(); },650); },900);

      var xp=firstClear?(isExp?60:40):10;
      var xLabel;
      if(firstClear) xLabel=isExp?'スキル会得！':(KIDS?'ステージクリア！':'ステージ攻略！');
      else xLabel=KIDS?'ふくしゅうクリア！':'復習クリア！';
      setTimeout(function(){ if(window.RPG) RPG.addXP(xp,xLabel); },1100);

      if(firstClear){
        setTimeout(function(){ clearPop(); },1600);
      }
    }

    function clearPop(){
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
  }

  /* ── 起動 ── */
  function init(){
    if(/\/(index\.html)?$/.test(path)){ renderPrep(); return; }
    var m=path.match(/([a-z]+\.html)$/);
    if(!m) return;
    var pg=null;
    Z.pages.forEach(function(p){ if(p.f===m[1]) pg=p; });
    if(pg) runStage(pg);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
