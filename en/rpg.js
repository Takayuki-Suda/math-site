/* ════════════════════════════════════════════════════════
   冒険者RPGシステム（サイト全体共通）
   小学生〜研究者まで一本のRPG。
   ※ 効果音・BGMはサイト共通の /math-site/en/sound.js（window.SND）を使用
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
  /* レベルアップ必要XP（n→n+1）：200,400,700,1100、以降は差分+500ずつ（1600,2100,…）。
     下の xp は累計しきい値。レベルが上がりすぎないよう、獲得XPは addXP で半分にしている。 */
  var LEVELS=[
    /* 小学生 */
    {lv:1,  xp:0,     title:'Apprentice Adventurer',   emoji:'🧒', msg:''},
    {lv:2,  xp:200,   title:'Arithmetic Warrior',     emoji:'⚔️', msg:'Amazing! Your math power is growing. Let\'s keep going together. — Mr. Suda'},
    {lv:3,  xp:600,   title:'Math Wizard', emoji:'🧙', msg:'So you made it this far. You\'ve got real strength now. — Mr. Suda'},
    {lv:4,  xp:1300,  title:'Legendary Mathematician',   emoji:'👑', msg:'You are a true mathematician. — Mr. Suda'},
    /* 中学生 */
    {lv:5,  xp:2400,  title:'Formula Warrior',     emoji:'🗡️', msg:'You\'ve gained a new weapon: letters. Formulas are your sword. — Mr. Suda'},
    {lv:6,  xp:4000,  title:'Equation Decoder', emoji:'📜', msg:''},
    {lv:7,  xp:6100,  title:'Knight of Shapes',     emoji:'🛡️', msg:''},
    {lv:8,  xp:8700,  title:'Function Wizard', emoji:'🔮', msg:'You can wield functions freely now. You should start to see how the world moves, in formulas. — Mr. Suda'},
    /* 高校生 */
    {lv:9,  xp:11800, title:'Knight of Derivatives',     emoji:'♞',  msg:'Welcome to the world of high-school math. I grant you a sword that cuts through change. — Mr. Suda'},
    {lv:10, xp:15400, title:'Master of Integrals',     emoji:'🌀', msg:''},
    {lv:11, xp:19500, title:'Seeker of Limits',   emoji:'🔭', msg:''},
    {lv:12, xp:24100, title:'Sage of Analysis',   emoji:'🦉', msg:'Beyond intuition, you\'re starting to see the beauty of rigor. — Mr. Suda'},
    /* 大学生 */
    {lv:13, xp:29200, title:'Seeker of Abstraction',   emoji:'🚪', msg:'You\'ve opened the door to university math. From here, you fight the concepts themselves. — Mr. Suda'},
    {lv:14, xp:34800, title:'Traveler of Spaces',     emoji:'🧭', msg:''},
    {lv:15, xp:40900, title:'Decoder of Structures',   emoji:'🗝️', msg:''},
    {lv:16, xp:47500, title:'Guardian of Theorems',     emoji:'🏛️', msg:'You\'re now one of those who hold up the building called mathematics. — Mr. Suda'},
    /* 大学院 */
    {lv:17, xp:54600, title:'Alchemist of Proofs', emoji:'⚗️', msg:'A proof is worth more than gold. You have the power to create one. — Mr. Suda'},
    {lv:18, xp:62200, title:'Challenger of Conjectures',   emoji:'🔥', msg:''},
    {lv:19, xp:70300, title:'Builder of Theories',   emoji:'🌌', msg:''},
    {lv:20, xp:78900, title:'Conqueror of Number Theory',     emoji:'🐉', msg:'I know very few people who have walked this far. — Mr. Suda'},
    /* 研究者（これ以降は称号なし・∞） */
    {lv:21, xp:88000, title:'Challenger of the Unknown', emoji:'♾️', msg:'There are no titles beyond this point. Only questions no one knows the answer to. Your journey goes on forever. — Mr. Suda'}
  ];
  var INF_BASE=88000, INF_STEP=10000; /* Lv21以降は10000XPごとにレベルだけ上がり続ける */

  /* ── ボス一覧 ── */
  var BOSSES={
    1:{name:'The Wall of Algebra', emoji:'🗿', page:'/math-site/en/boss_1.html', zone:'sho',
       flavor:'The world of only numbers is ending. x and y have appeared.', nextZone:'/math-site/en/chu/', nextName:'Middle School Zone'},
    2:{name:'The Wall of Functions',   emoji:'🐲', page:'/math-site/en/boss_2.html', zone:'chu',
       flavor:'Straight lines begin to bend. The door to quadratic functions opens.', nextZone:'/math-site/en/ko/', nextName:'High School Zone'},
    3:{name:'The Wall of ε-δ',   emoji:'👁️', page:'/math-site/en/boss_3.html', zone:'ko',
       flavor:'Intuition no longer works. Rigor is required.', nextZone:'/math-site/en/dai/', nextName:'University Zone'},
    4:{name:'The Wall of Abstraction',   emoji:'💠', page:'/math-site/en/boss_4.html', zone:'dai',
       flavor:'The numbers disappear. Only structure remains.', nextZone:'/math-site/en/boss_5.html', nextName:'The Final Wall'},
    5:{name:'The Wall of Research',   emoji:'🌌', page:'/math-site/en/boss_5.html', zone:'dai',
       flavor:'Taking on questions with no known answer. That is research.', nextZone:'/math-site/en/mikaiketsu.html', nextName:'The World of Unsolved Problems'}
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
        'text-shadow:0 0 30px rgba(255,217,94,.95),0 0 60px rgba(200,168,75,.6);">LEVEL UP!!</div>'+
      '<div style="font-size:3.6rem;margin:14px 0 4px;">'+lv.emoji+'</div>'+
      '<div style="font-family:\'Noto Sans JP\',sans-serif;font-weight:900;font-size:1.3rem;color:#fff;">'+
        'Lv'+lv.lv+' '+lv.title+'</div>';
    if(lv.msg){
      box.innerHTML+=
        '<div style="margin:22px auto 0;background:linear-gradient(135deg,#fdf3d7,#f6e3b0);color:#5a4314;'+
          'border:2px solid #c8a84b;border-radius:16px;padding:18px 22px;'+
          'font-family:\'Yusei Magic\',\'Noto Sans JP\',cursive;font-size:1.08rem;line-height:2;'+
          'box-shadow:0 8px 28px rgba(0,0,0,.4);animation:rpgMsgIn .6s ease .5s backwards;">'+lv.msg+'</div>';
    }
    box.innerHTML+='<div style="margin-top:18px;font-size:.78rem;color:#8899aa;font-family:\'Noto Sans JP\',sans-serif;">Tap to close</div>';
    ov.appendChild(box);
    document.body.appendChild(ov);
    function close(){ ov.style.transition='opacity .5s'; ov.style.opacity='0'; setTimeout(function(){ov.remove();},520); }
    ov.addEventListener('click',close);
    setTimeout(close,9000);
  }

  /* ── XP加算 ──
     獲得XPは半分に調整（敵撃破・ボス撃破・知識カード・クイズ正解など、addXP を通る全獲得が対象）。
     敵/ボス/カードのXP量は他ファイルから渡ってくるため、ここで一括して半減するのが唯一の窓口。 */
  function addXP(n,label){
    n=Math.max(1,Math.round(n*0.5));
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
    addXP(20,KIDS?'Quiz correct!':'Quiz correct');
    var s=(parseInt(localStorage.getItem('rpg_streak')||'0',10)||0)+1;
    if(s>=10){
      localStorage.setItem('rpg_streak','0');
      setTimeout(function(){ addXP(100,KIDS?'10 right in a row!':'10 correct in a row!'); },900);
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
      setTimeout(function(){ addXP(10,KIDS?'Opened a page':'Opened a page'); },700);
    }
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',visitBonus);
  }else{
    visitBonus();
  }

  /* ── 冒険のリセット：全RPG関連データを削除 ──
     レベル/XP・スタンプ・バッジ・ボス撃破/再戦記録・名前・花火フラグ・
     ステージ攻略・訪問記録（rpg_ / stamp_ / badge_ / stage_ プレフィックス）*/
  function resetAll(){
    var del=[],i,k;
    for(i=0;i<localStorage.length;i++){
      k=localStorage.key(i);
      if(/^(rpg_|stamp_|badge_|stage_)/.test(k)) del.push(k);
    }
    del.forEach(function(key){ localStorage.removeItem(key); });
    try{
      var sdel=[],j,sk;
      for(j=0;j<sessionStorage.length;j++){
        sk=sessionStorage.key(j);
        if(/^(rpg_|stg2_)/.test(sk)) sdel.push(sk);
      }
      sdel.forEach(function(key){ sessionStorage.removeItem(key); });
    }catch(e){}
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
    clearBoss:clearBoss,
    resetAll:resetAll
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
      {f:'/math-site/en/sho/kazu.html',t:'Counting numbers',e:'🔢'},
      {f:'/math-site/en/sho/tashizan.html',t:'Addition',e:'➕'},
      {f:'/math-site/en/sho/hikizan.html',t:'Subtraction',e:'➖'},
      {f:'/math-site/en/sho/kuku.html',t:'The times table',e:'✖️'},
      {f:'/math-site/en/sho/bunsu.html',t:'Adding fractions',e:'🍕'},
      {f:'/math-site/en/sho/sankaku.html',t:'Area of a triangle',e:'📐'},
      {f:'/math-site/en/sho/en.html',t:'Area of a circle',e:'⭕'},
      {f:'/math-site/en/sho/puzzle.html',t:'Tower of Puzzles',e:'🧩'},
      {f:'/math-site/en/boss_1.html',t:'Boss "The Wall of Algebra"',e:'🗿',boss:1}
    ],
    chu:[
      {f:'/math-site/en/chu/moji.html',t:'What are letters in math?',e:'✏️'},
      {f:'/math-site/en/chu/houteishiki.html',t:'What is an equation?',e:'⚖️'},
      {f:'/math-site/en/chu/ikiji.html',t:'Linear functions and graphs',e:'📈'},
      {f:'/math-site/en/chu/niji.html',t:'Quadratic functions and parabolas',e:'🌉'},
      {f:'/math-site/en/chu/sanpei.html',t:'The Pythagorean theorem',e:'📐'},
      {f:'/math-site/en/boss_2.html',t:'Boss "The Wall of Functions"',e:'🐲',boss:2}
    ],
    ko:[
      {f:'/math-site/en/ko/sankakuhi.html',t:'Trigonometric functions',e:'🌊'},
      {f:'/math-site/en/ko/bibun.html',t:'Derivatives and tangents',e:'🎢'},
      {f:'/math-site/en/ko/sekibun.html',t:'Integrals and area',e:'🧱'},
      {f:'/math-site/en/ko/daigaku.html',t:'The door to university math',e:'🚪'},
      {f:'/math-site/en/ko/kyokugen.html',t:'Limits and ε-δ',e:'🔬'},
      {f:'/math-site/en/boss_3.html',t:'Boss "The Wall of ε-δ"',e:'👁️',boss:3}
    ],
    dai:[
      {f:'/math-site/en/dai/senkei.html',t:'Linear maps and rank–nullity',e:'🧮'},
      {f:'/math-site/en/dai/gun.html',t:'Group theory',e:'🔁'},
      {f:'/math-site/en/dai/fukuso.html',t:'Complex analysis',e:'🌀'},
      {f:'/math-site/en/dai/fourier.html',t:'Fourier analysis',e:'🎵'},
      {f:'/math-site/en/dai/seisuron.html',t:'Number theory',e:'🔢'},
      {f:'/math-site/en/dai/tahensuu.html',t:'Multivariable analysis and differential forms',e:'🌐'},
      {f:'/math-site/en/boss_4.html',t:'Boss "The Wall of Abstraction"',e:'💠',boss:4},
      {f:'/math-site/en/boss_5.html',t:'The final wall: "The Wall of Research"',e:'🌌',boss:5}
    ]
  };
  var ZONE_HOME={sho:'/math-site/en/sho/',chu:'/math-site/en/chu/',ko:'/math-site/en/ko/',dai:'/math-site/en/dai/'};
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
    document.getElementById('rpgAdvXp').textContent=xp+' XP'+(nx?(KIDS?' (to next: '+(nx.xp-xp)+')':' (to next: '+(nx.xp-xp)+')'):' • MAX👑');
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
        ?(KIDS?'⚔️ To the boss: ':'⚔️ To the boss battle: ')+next.e+' '+next.t+' →'
        :(KIDS?'Next adventure: ':'Next quest: ')+next.e+' '+next.t+' →';
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
        '<a class="rpg-adv-map" href="'+ZONE_HOME[ZONE]+'">🗺️ '+(KIDS?'Adventure Map':'Quest Map')+'</a>'+
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
              '<input class="rpgz-name" id="rpgzName" type="text" maxlength="10" placeholder="Adventurer\'s name">'+
              '<span class="rpgz-sub">\'s Adventure</span>'+
            '</div>'+
            '<div class="rpgz-lvrow">'+
              '<span class="rpgz-lv" id="rpgzLv">Lv1</span>'+
              '<span class="rpgz-title" id="rpgzTitle"></span>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div class="rpgz-barwrap">'+
          '<div class="rpgz-bar"><div class="rpgz-fill" id="rpgzFill"></div></div>'+
          '<div class="rpgz-xptext"><span>Experience <em id="rpgzXp">0</em> XP</span><span id="rpgzNext"></span></div>'+
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
        nxEl.innerHTML='Next level in <em>'+(nx.xp-xp)+'</em> XP';
      }else{
        fill.style.width='100%'; nxEl.textContent='MAX';
      }
      var bw=document.getElementById('rpgzBosses');
      var h='<span class="rpgz-bosslabel">Bosses defeated: </span>';
      for(var i=1;i<=5;i++){
        var got=RPG.bossCleared(i);
        h+='<span class="rpgz-bchip'+(got?' got':'')+'">'+(got?B[i].emoji+' '+B[i].name:'???')+'</span>';
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
      '<div class="rpg-bossdoor-label">'+(KIDS?'THE LAST BATTLE':'Boss Gate ─ deepest part of the zone')+'</div>';
    cfg.doors.forEach(function(n){
      var b=B[n];
      var cleared=RPG.bossCleared(n);
      var locked=(n===5&&!RPG.bossCleared(4));
      h+='<div class="rpg-bdcard'+(cleared?' cleared':(locked?' locked':''))+'">'+
        '<div class="rpg-bd-emoji">'+(locked?'🔒':b.emoji)+'</div>'+
        '<div class="rpg-bd-no">BOSS '+n+'</div>'+
        '<div class="rpg-bd-name">'+(locked?'????':b.name)+'</div>'+
        '<div class="rpg-bd-flavor">'+(locked?'It appears only before those who have defeated "The Wall of Abstraction".':b.flavor)+'</div>';
      if(locked){
        h+='<span class="rpg-bd-lock">🔒 Sealed</span>';
      }else if(cleared){
        h+='<div><span class="rpg-bd-done">👑 '+(KIDS?'Defeated!':'Defeated')+'</span></div>'+
           '<div style="font-size:.82rem;color:#ff9d8a;font-weight:700;line-height:2;margin-bottom:12px;position:relative;z-index:1;">"'+(KIDS
             ?'Come again. Every time you come, I get stronger.'
             :'Come again. Each time you come, I grow stronger.')+'"</div>'+
           '<a class="rpg-bd-btn" href="'+b.page+'" style="margin:4px;">⚔️ '+(KIDS?'Rematch the final form!':'Rematch the final form')+'</a>'+
           '<a class="rpg-bd-btn gold" href="'+b.nextZone+'" style="margin:4px;">⛩ '+b.nextName+': go ahead →</a>';
      }else{
        h+='<a class="rpg-bd-btn" href="'+b.page+'">⚔️ '+(KIDS?'Fight the boss':'Challenge the boss')+'</a>';
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
    var ZNAME={chu:'Middle School Zone',ko:'High School Zone',dai:'University Zone'}[ZONE];
    var ov=document.createElement('div');
    ov.className='rpg-gate';
    ov.innerHTML=
      '<div class="rpg-gate-inner">'+
        '<div class="rpg-gate-emoji">'+b.emoji+'</div>'+
        '<div class="rpg-gate-seal">─ '+ZNAME+' is sealed ─</div>'+
        '<div class="rpg-gate-name">'+b.name+'</div>'+
        '<div class="rpg-gate-flavor">'+b.flavor+'<br>To open this door, you must defeat the boss "'+b.name+'".</div>'+
        '<a class="rpg-gate-btn" href="'+b.page+'">⚔️ Challenge the boss</a>'+
        '<button class="rpg-gate-skip" type="button">Slip past the seal and just read the lessons (boss later)</button>'+
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
    var ZNAME={chu:'Middle School Zone',ko:'High School Zone',dai:'University Zone',sho:'Elementary Zone'}[ZONE]||'A new zone';
    var wrap=document.querySelector('.rpg-toast-wrap');
    if(!wrap){ wrap=document.createElement('div'); wrap.className='rpg-toast-wrap'; document.body.appendChild(wrap); }
    var t=document.createElement('div');
    t.className='rpg-toast';
    t.innerHTML='⛩ '+ZNAME+': you\'ve entered! A new adventure begins.';
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
    sho:{mode:'battle',kids:true,boss:1,bossName:'The Wall of Algebra',
      prepLabel:'Getting ready for adventure ─ Gear',
      pages:[
        {f:'kazu.html',    st:'Forest of Numbers',         mn:'Count Bug',         me:'🐛', di:'🗡️', dn:'Sword of Beginnings'},
        {f:'tashizan.html',st:'Plains of Addition',   mn:'Plus Slime',       me:'🟢', di:'🛡️', dn:'Shield of Addition'},
        {f:'hikizan.html', st:'Cave of Subtraction',   mn:'Minus Bat',   me:'🦇', di:'🪖', dn:'Helmet of Subtraction'},
        {f:'kuku.html',    st:'Times Table Volcano',       mn:'The Times Table Dragon',       me:'🐲', di:'🔥', dn:'Flame Sword of the Times Table'},
        {f:'bunsu.html',   st:'Lake of Fractions',     mn:'Half Ghost',   me:'👻', di:'🥾', dn:'Boots of Fractions'},
        {f:'sankaku.html', st:'Tower of Triangles',     mn:'Triangle Gargoyle', me:'🗿', di:'🧤', dn:'Gauntlets of Triangles'},
        {f:'en.html',      st:'Temple of Circles',     mn:'Round Spirit', me:'🟡', di:'🪄', dn:'Staff of Circles'},
        {f:'puzzle.html',  st:'Tower of Puzzles',       mn:'Puzzle Keeper',     me:'🧩', di:'💍', dn:'Ring of Wisdom'}
      ]},
    chu:{mode:'battle',kids:false,boss:2,bossName:'The Wall of Functions',
      prepLabel:'Gear ─ earned by clearing stages',
      pages:[
        {f:'moji.html',       st:'Plains of Letters', mn:'Shadow X',             me:'👤', di:'⚔️', dn:'Sword of Letters'},
        {f:'houteishiki.html',st:'Valley of the Balance',     mn:'Balance Chimera',        me:'⚖️', di:'🛡️', dn:'Shield of Equality'},
        {f:'ikiji.html',      st:'Wastes of Straight Lines',   mn:'Graph Wolf',          me:'🐺', di:'🥾', dn:'Boots of Slope'},
        {f:'niji.html',       st:'Canyon of Parabolas', mn:'Parabola Falcon',    me:'🦅', di:'🪶', dn:'Wings of the Parabola'},
        {f:'sanpei.html',     st:'Ruins of the Right Angle',   mn:'Pythagoras Scorpion',  me:'🦂', di:'💎', dn:'Jewel of Pythagoras'}
      ]},
    ko:{mode:'battle',kids:false,trial:true,boss:3,bossName:'The Wall of ε-δ',
      prepLabel:'Crystals of Knowledge ─ gather them by passing the trials',
      pages:[
        {f:'sankakuhi.html',st:'Trial of Waves',   mn:'Phantom of the Sinusoid', me:'🌊', di:'🔷', dn:'Crystal of Trigonometry'},
        {f:'bibun.html',    st:'Trial of the Instant', mn:'Shadow of the Tangent', me:'⚡', di:'💠', dn:'Crystal of Derivatives'},
        {f:'sekibun.html',  st:'Trial of Area', mn:'Riemann Wall Soldier',   me:'🧱', di:'🧊', dn:'Crystal of Integrals'},
        {f:'daigaku.html',  st:'Trial of the Rift', mn:'Gatekeeper of the University',       me:'🚪', di:'🔮', dn:'Crystal of Rigor'},
        {f:'kyokugen.html', st:'Trial of the Infinite', mn:'Mist of Epsilon',   me:'🌫️', di:'🌀', dn:'Crystal of Limits'}
      ]},
    dai:{mode:'explore',kids:false,boss:4,bossName:'The Wall of Abstraction',
      prepLabel:'Unlocked Skills ─ master them by exploring',
      pages:[
        {f:'senkei.html',  st:'Ruins of Linear Space',   me:'🧮', di:'🧮', dn:'Rank–Nullity Theorem',         fl:'rank + nullity = n ── the power to see the skeleton of space'},
        {f:'gun.html',     st:'Sanctuary of Symmetry',     me:'🔁', di:'🔁', dn:'Group Axioms',         fl:'associativity, identity, inverses ── a third eye for seeing structure'},
        {f:'fukuso.html',  st:'Seas of the Complex Plane',   me:'🌀', di:'🌀', dn:'Residue theorem',         fl:'The imaginary axis reveals flows the real axis cannot see'},
        {f:'fourier.html', st:'Library of Frequencies',   me:'🎵', di:'🎵', dn:'Fourier Expansion',     fl:'Any wave can be broken into a sum of pure tones'},
        {f:'seisuron.html',st:'Vein of Primes',       me:'🔢', di:'🔢', dn:'Congruence',           fl:'The art of cutting out the world of numbers mod p'},
        {f:'tahensuu.html',st:'Highlands of Manifolds',     me:'🌐', di:'🌐', dn:'Stokes\' theorem', fl:'The boundary tells everything about the inside'}
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
        (got?p.dn+' ('+p.st+')':'??? ('+p.st+': clear to unlock)')+'" style="text-decoration:none;">'+
        (got?p.di:'❓')+'</a>';
    });
    h+='</div>';
    var word=isExp?'Skills':(ZONE==='ko'?'Crystals':'Gear');
    if(n===total){
      h+='<div class="stg-prep-txt full">🔥 '+(KIDS
        ?word+': all collected! You should be able to beat the boss "'+Z.bossName+'"!'
        :(isExp?'All skills unlocked ── you\'re ready to challenge "'+Z.bossName+'".'
               :word+': all gathered. You\'re ready to challenge "'+Z.bossName+'".'))+'</div>';
    }else if(n>0){
      h+='<div class="stg-prep-txt">'+word+' <em>'+n+'</em> / '+total+
        (KIDS?' ── clear stages to collect them':' ── earned by clearing each stage')+'</div>';
    }else{
      h+='<div class="stg-prep-txt">'+(KIDS
        ?'Clear stages to get '+word+'!'
        :(isExp?'Fully explore each lesson to master its skill':'Clear each stage to obtain '+word+'.'))+'</div>';
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
      {q:'3 groups of 10 and 4 loose ones. How many in all?',c:['7','34','304'],a:1,exp:'3 tens make 30. 30 and 4 make 34!'},
      {q:'28 is how many groups of 10 and how many loose ones?',c:['2 tens and 8 ones','8 tens and 2 ones','2 tens and 2 ones'],a:0,exp:'28 is 20 and 8. That\'s 2 groups of 10.'},
      {q:'Counting by 2s: 2, 4, 6, 8… What comes next?',c:['9','12','10'],a:2,exp:'It goes up by 2, so after 8 comes 10!'}
    ],
    'sho/tashizan.html':[
      {q:'What is 8+5?',c:['12','13','14'],a:1,exp:'Add 2 to 8 to make 10. Then add the other 3 to get 13!'},
      {q:'9+7. First, what do you add to 9 to make 10?',c:['1','2','3'],a:0,exp:'9+1 makes 10. 10 and the other 6 make 16!'},
      {q:'What is 30+40?',c:['70','34','60'],a:0,exp:'3 tens and 4 tens make 7 tens. 70!'}
    ],
    'sho/hikizan.html':[
      {q:'What is 13−5?',c:['7','9','8'],a:2,exp:'Split 13 into 10 and 3. 10−5=5, and 5 and 3 make 8!'},
      {q:'What is 15−9?',c:['6','7','5'],a:0,exp:'10−9=1, and 1 and 5 make 6!'},
      {q:'What is 70−20?',c:['90','50','5'],a:1,exp:'In tens, 7−2=5. So it\'s 50!'}
    ],
    'sho/kuku.html':[
      {q:'What is 7×6?',c:['42','48','36'],a:0,exp:'7×5=35, plus 7 is 42!'},
      {q:'Which one has the same answer as 4×8?',c:['4+8','8×4','6×6'],a:1,exp:'Multiplication gives the same answer even if you swap the order!'},
      {q:'What is 9×9?',c:['72','99','81'],a:2,exp:'The last one in the 9s. It\'s 81!'}
    ],
    'sho/bunsu.html':[
      {q:'What is 1/2 + 1/4?',c:['2/6','3/4','2/4'],a:1,exp:'1/2 is the same as 2/4. 2/4+1/4=3/4!'},
      {q:'1/3 and 2/6: which is bigger?',c:['1/3','2/6','the same'],a:2,exp:'Reduce 2/6 and you get 1/3. They\'re the same size!'},
      {q:'What is 1/2 + 1/3?',c:['5/6','2/5','1/6'],a:0,exp:'Make both denominators 6: 3/6+2/6=5/6!'}
    ],
    'sho/sankaku.html':[
      {q:'What is the area of a triangle with base 6 cm and height 4 cm?',c:['24cm²','10cm²','12cm²'],a:2,exp:'6×4÷2=12. Don\'t forget the ÷2 at the end!'},
      {q:'Why do we "÷2" for the area of a triangle?',c:['because it\'s half a rectangle','because there are 2 heights','because that\'s just the rule'],a:0,exp:'Put two of the same triangle together and you get a rectangle (parallelogram)!'},
      {q:'If you double the base, what happens to the area?',c:['it stays the same','it doubles','it becomes 4 times'],a:1,exp:'It\'s base×height÷2, so if the base doubles, the area doubles too!'}
    ],
    'sho/en.html':[
      {q:'If you cut a circle into thin slices and line them up, what does it get close to?',c:['triangle','a star shape','a rectangle'],a:2,exp:'It becomes a rectangle with height = radius and width = half the circumference!'},
      {q:'What is the area of a circle with radius 10 cm? (π = 3.14)',c:['314cm²','31.4cm²','100cm²'],a:0,exp:'10×10×3.14=314!'},
      {q:'In the rectangle you made, how long is the "height"?',c:['the diameter','the radius','the circumference'],a:1,exp:'The length of one slice, cut like a pizza = the radius!'}
    ],
    'sho/puzzle.html':[
      {q:'1, 2, 4, 8… it keeps growing. What comes next?',c:['16','10','12'],a:0,exp:'It doubles each time! Double 8 is 16.'},
      {q:'◯+◯=10. What same number goes in ◯?',c:['2','10','5'],a:2,exp:'5+5=10!'},
      {q:'Which one doesn\'t belong with 3, 6, 9, 12…?',c:['15','20','18'],a:1,exp:'They\'re all numbers in the 3s. 20 can\'t be divided evenly by 3!'}
    ],
    'chu/moji.html':[
      {q:'How do you write a×3 using the rules for letters?',c:['3a','a3','3×a'],a:0,exp:'Put the number in front and leave out the × sign.'},
      {q:'Simplify x+x+x.',c:['x³','3x','3+x'],a:1,exp:'3 x\'s make 3x. x³ is x×x×x, which is different.'},
      {q:'You buy n apples at 150 yen each. What is the total cost?',c:['150+n yen','n÷150 yen','150n yen'],a:2,exp:'150×n. When multiplying by a letter, leave out × and write 150n.'}
    ],
    'chu/houteishiki.html':[
      {q:'If x+7=15, what is x?',c:['8','7','22'],a:0,exp:'Subtract 7 from both sides: x=8. Take the same amount from both sides of the balance.'},
      {q:'If 3x=12, what is x?',c:['36','4','9'],a:1,exp:'Divide both sides by 3: x=4.'},
      {q:'2x−3=7. What is the first move?',c:['Divide both sides by 2','subtract 7 from both sides','add 3 to both sides'],a:2,exp:'First +3 gives 2x=10. Then divide by 2: x=5.'}
    ],
    'chu/ikiji.html':[
      {q:'What is the "slope" of y=2x+3?',c:['3','2','x'],a:1,exp:'When x goes up by 1, y goes up by 2. That\'s the slope.'},
      {q:'Where does y=2x+3 cross the y-axis?',c:['(0, 3)','(3, 0)','(0, 2)'],a:0,exp:'When x=0, y=3. The intercept is where it meets the y-axis.'},
      {q:'What does a line with negative slope look like?',c:['rising to the right','horizontal','falling to the right'],a:2,exp:'As x increases, y decreases = it falls to the right.'}
    ],
    'chu/niji.html':[
      {q:'What is the vertex of y=(x−2)²+1?',c:['(2, 1)','(−2, 1)','(2, −1)'],a:0,exp:'The vertex is (p, q). Read it off the form y=a(x−p)²+q.'},
      {q:'In y=ax², if you make a bigger, the parabola…?',c:['opens wider','gets narrower and steeper','doesn\'t change'],a:1,exp:'For the same x, y jumps up more, so it gets narrower and steeper.'},
      {q:'What does the graph of y=−x² look like?',c:['opens downward (a hill)','opens upward (a valley)','a straight line'],a:0,exp:'If a is negative it opens downward = a hill.'}
    ],
    'chu/sanpei.html':[
      {q:'The two sides of a right angle are 3 and 4. What is the hypotenuse?',c:['6','5','7'],a:1,exp:'3²+4²=9+16=25=5².'},
      {q:'When does the Pythagorean theorem a²+b²=c² hold?',c:['right triangles','all triangles','only isosceles triangles'],a:0,exp:'Only for right triangles. Conversely, if it holds, you know it\'s a right triangle.'},
      {q:'A right triangle has hypotenuse 13 and one side 5. What is the other side?',c:['8','18','12'],a:2,exp:'13²−5²=169−25=144=12².'}
    ],
    'ko/sankakuhi.html':[
      {q:'What is the value of sin 30°?',c:['1/2','√3/2','1'],a:0,exp:'A 30°-60°-90° triangle. With hypotenuse 2, the side opposite 30° is 1.'},
      {q:'What is the value of sin²θ+cos²θ?',c:['it depends on θ','always 1','always 0'],a:1,exp:'The point (cosθ, sinθ) on the unit circle. Its distance from the origin is always 1 ── that\'s the Pythagorean theorem itself.'},
      {q:'What does tanθ represent geometrically?',c:['the slope of a line through the origin','the area of a sector','the period of a circle'],a:0,exp:'tanθ=sinθ/cosθ=rise/run=slope.'}
    ],
    'ko/bibun.html':[
      {q:'What is the derivative of f(x)=x²?',c:['x','x³/3','2x'],a:2,exp:'From the definition lim {f(x+h)−f(x)}/h, (x²)′=2x.'},
      {q:'What does the derivative f′(a) mean geometrically?',c:['the slope of the tangent at x=a','the area up to x=a','the value of the y-intercept'],a:0,exp:'The limit of lines through two points that get infinitely close = the slope of the tangent.'},
      {q:'What can happen at a point where f′(a)=0?',c:['it\'s always a maximum','it\'s a candidate for a local max/min','the graph breaks'],a:1,exp:'A point where the tangent is horizontal. But there are exceptions, like the origin for y=x³.'}
    ],
    'ko/sekibun.html':[
      {q:'What is the value of ∫₀¹ x dx?',c:['1','1/2','0'],a:1,exp:'The triangle under y=x. 1×1÷2=1/2.'},
      {q:'A definite integral is really the limit of what?',c:['the average slope of tangents','the sum of areas of thin rectangles','differences of a sequence'],a:1,exp:'The sum of rectangles made infinitely thin ── the limit of Riemann sums.'},
      {q:'If F′(x)=f(x), what is ∫ₐᵇ f(x)dx?',c:['F(b)−F(a)','F(a)−F(b)','F(b)×F(a)'],a:0,exp:'The fundamental theorem of calculus. The reverse of differentiation gives area.'}
    ],
    'ko/daigaku.html':[
      {q:'What is the negation of "P(x) holds for all x"?',c:['P(x) fails for all x','P(x) fails for some x','P(x) is always true'],a:1,exp:'Not "all fail" but "there exists one counterexample". The most basic and most important rule of logic.'},
      {q:'Why does high school\'s "gets arbitrarily close" become a problem at university?',c:['it\'s vague and can\'t be used as a tool for proof','it makes calculation slower','it changes the answer'],a:0,exp:'Unless "getting close" is defined with formulas, you can\'t write rigorous proofs. That\'s why ε-δ was born.'},
      {q:'Why do we need rigorous definitions?',c:['to keep with tradition','because it\'s on the exam','because real examples exist where intuition fails'],a:2,exp:'Things beyond intuition really exist, like continuous functions that are differentiable nowhere.'}
    ],
    'ko/kyokugen.html':[
      {q:'How is lim x→a f(x)=L formulated with ε-δ?',c:['for every ε>0 there exists δ>0 such that…','for some ε>0 and every δ>0…','choose them so that ε=δ'],a:0,exp:'However small a tolerance ε you\'re handed, you can answer with a δ ── that\'s what "getting close" really is.'},
      {q:'What is the hidden "circularity" in the area-based proof for sin x/x?',c:['that you can\'t divide by x at 0','justifying the area of a sector involves this very limit','that the figure isn\'t drawn to scale'],a:1,exp:'If you try to rigorously justify radians and the area of a sector, you end up at the derivative of sin ── that is, this very limit.'},
      {q:'When can you use the squeeze theorem?',c:['when the limits on both sides converge to the same value','when just one side converges','when the middle function is increasing'],a:0,exp:'If g≤f≤h and lim g=lim h=L, then lim f=L. Both sides must agree.'}
    ],
    'dai/senkei.html':[
      {q:'For a linear map f: R⁵→R³ with rank f=3, what is dim Ker f?',c:['3','2','5'],a:1,exp:'Rank–nullity: dim Ker f+rank f=5. So 5−3=2.'},
      {q:'Which condition is part of the definition of a linear map?',c:['f(x+y)=f(x)+f(y) and f(cx)=cf(x)','f(xy)=f(x)f(y)','f(x)≧0'],a:0,exp:'Preserving sums and scalar multiples ── linearity is where everything starts.'},
      {q:'What does rank f represent?',c:['the dimension of the kernel Ker f','the number of entries in the matrix','the dimension of the image Im f'],a:2,exp:'The number of dimensions the map keeps without crushing.'}
    ],
    'dai/gun.html':[
      {q:'Which is NOT one of the group axioms?',c:['associativity','commutativity (ab=ba)','existence of inverses'],a:1,exp:'Commutativity is not required. A commutative group is specially called an "abelian group".'},
      {q:'What is the identity of the integer group (Z, +)?',c:['0','1','−1'],a:0,exp:'a+0=a. The identity for addition is 0. For multiplication it would be 1.'},
      {q:'What is the order (number of elements) of the symmetric group S₃?',c:['3','9','6'],a:2,exp:'There are 3!=6 ways to arrange 3 things. It\'s also the smallest non-commutative group.'}
    ],
    'dai/fukuso.html':[
      {q:'What is the value of e^iπ?',c:['−1','1','i'],a:0,exp:'Put θ=π into Euler\'s formula e^iθ=cosθ+i sinθ.'},
      {q:'Which equations do holomorphic functions satisfy?',c:['the wave equation','the Cauchy–Riemann equations','the heat equation'],a:1,exp:'u_x=v_y, u_y=−v_x. Complex differentiability translated into real and imaginary parts.'},
      {q:'What is ∮ dz/z once counterclockwise around the unit circle?',c:['0','π','2πi'],a:2,exp:'Set z=e^iθ and you get ∮i dθ=2πi. The trace left by the singularity at the origin ── the residue.'}
    ],
    'dai/fourier.html':[
      {q:'A Fourier series breaks a function into a sum of what?',c:['sin and cos (pure waves)','polynomials','step functions'],a:0,exp:'Any periodic function can be written as a superposition of pure tones of different frequencies.'},
      {q:'What does the spectrum (size of the Fourier coefficients) show?',c:['the maximum value of the function','the strength of each frequency component','how many times it can be differentiated'],a:1,exp:'A table of "which pure tones, and how much of each, are included".'},
      {q:'The Fourier coefficients of a square wave, as the frequency increases…?',c:['stay constant','grow','decay on the order of 1/n'],a:2,exp:'Corners (discontinuities) make the decay slow. Smoothness and how fast the coefficients decay are two sides of the same coin.'}
    ],
    'dai/seisuron.html':[
      {q:'Fermat\'s little theorem: if p is prime and a is coprime to p, then?',c:['a^(p−1) ≡ 1 (mod p)','a^p ≡ 0 (mod p)','a ≡ p (mod a)'],a:0,exp:'In the world mod p, the (p−1)th power always returns to 1. The theoretical backbone of RSA encryption.'},
      {q:'What is 17 mod 5?',c:['3','2','1'],a:1,exp:'17=5×3+2. The remainder is 2.'},
      {q:'What does the security of RSA rely on?',c:['the irrationality of π','the invertibility of matrices','the difficulty of factoring huge numbers'],a:2,exp:'Multiplying takes an instant; factoring back takes astronomical time ── that asymmetry.'}
    ],
    'dai/tahensuu.html':[
      {q:'Which direction does grad f (the gradient) point?',c:['the direction in which f increases fastest','along the contour lines','always along the x-axis'],a:0,exp:'A vector perpendicular to the contour lines, pointing in the direction of greatest increase.'},
      {q:'What does Stokes\' theorem connect?',c:['derivatives and limits','the integral over a region and the integral over its boundary','matrices and determinants'],a:1,exp:'∫_M dω=∫_∂M ω. The boundary tells everything about the inside.'},
      {q:'What does div F (divergence) represent?',c:['the strength of rotation of the flow','the slope of the vectors','how strongly it springs out at that point'],a:2,exp:'Sources are positive, sinks are negative. Gauss\'s theorem links it to a volume integral.'}
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
      h+='<div class="stg2-label">EXPEDITION '+R+' ── Ruins Expedition</div>'+
        '<div class="stg2-emoji">'+pg.me+'</div>'+
        '<div class="stg2-name">'+pg.st+'</div>'+
        '<div class="stg2-line" style="animation-delay:.3s">Sealed in these ruins is the skill “'+pg.dn+'”.</div>'+
        '<div class="stg2-line" style="animation-delay:1s">'+pg.fl+'</div>'+
        '<div class="stg2-line" style="animation-delay:1.7s">Decode the inscriptions and master the skill at 100% decoded.</div>'+
        '<div><button class="stg2-btn" type="button">🔦 Begin exploring</button></div>';
    }else if(TRIAL){
      h+='<div class="stg2-label">TRIAL '+R+'</div>'+
        '<div class="stg2-emoji">'+pg.me+'</div>'+
        '<div class="stg2-name">'+pg.st+'</div>'+
        '<div class="stg2-line" style="animation-delay:.3s">'+pg.mn+' watches you in silence.</div>'+
        '<div class="stg2-line" style="animation-delay:1.1s">── Can you truly say, "I understand"?</div>'+
        '<div class="stg2-line" style="animation-delay:1.9s">Three questions will put it to the test.</div>'+
        '<div><button class="stg2-btn" type="button">Step into the trial</button></div>';
    }else{
      h+='<div class="stg2-label">STAGE '+(idx+1)+'</div>'+
        '<div class="stg2-emoji">'+pg.me+'</div>'+
        '<div class="stg2-name">'+pg.st+'</div>'+
        '<div class="stg2-line" style="animation-delay:.3s">'+pg.mn+(KIDS?' appeared!':' appears!')+'</div>'+
        '<div class="stg2-mis">'+(KIDS
          ?'📖 Read = attack<br>🖐 Touch = attack<br>⚔️ Beat 3 questions = special move'
          :'📖 Read = attack<br>🖐 Interact = attack<br>⚔️ Master 3 questions = special move')+'</div>'+
        '<div><button class="stg2-btn" type="button">⚔️ '+(KIDS?'Fight!':'Begin battle')+'</button></div>';
    }
    h+='<button class="stg2-skip" type="button">'+(KIDS?'Skip the show and just read':'Skip the effects and read')+'</button></div>';
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
          '<span class="stg3-name" style="color:#ffe9a8;">'+(isExp?'['+pg.dn+'] mastered':(KIDS?'Cleared!':'Conquered'))+'</span></div>'+
          '<div class="stg3-hpbar"><div class="stg3-hpfill" style="background:linear-gradient(90deg,#c8a84b,#e8c96b);"></div></div>'+
        '</div>'+
        '<div class="stg3-right"><span class="stg3-sub">'+(KIDS?'Let\'s play again tomorrow!':(isExp?'Today\'s exploration is complete':'Conquered today'))+'</span></div>'+
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
          '<div class="stg3-top"><span class="stg3-stage">Expedition '+(ROMAN[idx]||'')+' • '+pg.st+'</span>'+
          '<span class="stg3-name" style="color:#bdfff2;">“'+pg.dn+'” sealed</span></div>'+
          '<div class="stg3-hpbar"><div class="stg3-hpfill" id="stgHp" style="width:0%;background:linear-gradient(90deg,#0a6e5c,#2ee6c8);"></div></div>'+
        '</div>'+
        '<div class="stg3-right"><span class="stg3-sub" id="stgSub">Decoded 0%</span><div class="stg-qdots" id="stgDots"></div></div>'+
      '</div>';
    }else{
      w.innerHTML='<div class="stg3-inner">'+
        '<div class="stg3-face" id="stgFace" title="'+(KIDS?'Fight!':'Attack')+'">'+pg.me+'</div>'+
        '<div class="stg3-mid">'+
          '<div class="stg3-top"><span class="stg3-stage">'+(TRIAL?'Trial '+(ROMAN[idx]||''):(KIDS?'STAGE':'STAGE')+' '+(idx+1))+' • '+pg.st+'</span>'+
          '<span class="stg3-name">'+pg.mn+'</span></div>'+
          '<div class="stg3-hpbar"><div class="stg3-hpfill" id="stgHp"></div></div>'+
        '</div>'+
        '<div class="stg3-right"><span class="stg3-sub" id="stgSub">'+(KIDS?'Read and touch to attack!':(TRIAL?'Read, interact, and answer the questions':'Read • Interact • Solve = attack'))+'</span><div class="stg-qdots" id="stgDots"></div></div>'+
      '</div>';
    }
    document.body.appendChild(w);
    var face=document.getElementById('stgFace');

    function paint(){
      if(isExp){
        var pct=Math.round((MAX-Math.max(0,hp))/MAX*100);
        document.getElementById('stgHp').style.width=pct+'%';
        document.getElementById('stgSub').textContent='Decoded '+pct+'%';
      }else{
        document.getElementById('stgHp').style.width=Math.max(0,hp)/MAX*100+'%';
        var sub=document.getElementById('stgSub');
        if(hp<=MAX*0.3) sub.textContent=KIDS?'Almost there!':'One more hit…!';
        else if(hp<=MAX*0.6) sub.textContent=KIDS?'It\'s getting weak!':'It\'s staggering!';
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

    var EXPLORE_LOGS=['✦ You decoded a fragment','✦ The outline of the structure is coming into view','✦ You found traces of an old proof','✦ You\'re getting close to the core'];
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
      wv.textContent=isExp?'📜 An inscription has surfaced…'
        :(TRIAL?'── The phantom poses a question'
        :'⚠️ '+pg.mn+(KIDS?' attacks!':' attacks!'));
      document.body.appendChild(wv);
      setTimeout(function(){ wv.remove(); openQ(); },1000);

      function openQ(){
        var dim=document.createElement('div'); dim.className='stg2-dim';
        var card=document.createElement('div');
        card.className='stg2-q'+(TRIAL?' trial':(isExp?' exp':''));
        var qlabel=isExp?'Inscription ':(TRIAL?'Phantom\'s question ':(KIDS?'Question ':'Enemy\'s question '));
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
                (isExp?'✦ Decoded. The seal loosens.':(TRIAL?'── Correct. The phantom takes a step back.':(KIDS?'⚡ Critical hit!':'⚡ Critical hit!')))+'</div>'+
                (Q.exp?'<div class="stg2-exp">'+Q.exp+'</div>':'')+
                '<button class="stg2-go" type="button">'+
                (isExp?'Keep decoding':(TRIAL?'Move on':(KIDS?'⚔️ Strike back!':'⚔️ Counterattack')))+'</button>';
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
                (isExp?'── You misread it. But you got a fragment.'
                :(TRIAL?'── The phantom swallowed you. Burn the right answer into your memory.'
                :(KIDS?'💥 You got hit! '+pg.mn+' got its health back…':'💥 Hit! '+pg.mn+' is recovering…')))+'</div>'+
                (Q.exp?'<div class="stg2-exp">'+Q.exp+'</div>':'')+
                '<button class="stg2-go" type="button">'+
                (isExp?'Back to exploring':(KIDS?'Get up':'Rise again'))+'</button>';
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
      if(lb.indexOf('Quiz')>=0||lb.indexOf('Puzzle')>=0) hit(12);
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
            '<span class="stg3-name" style="color:#ffe9a8;">'+(isExp?'“'+pg.dn+'” mastered!':(KIDS?'Stage clear!':'Stage conquered!'))+'</span></div>'+
            '<div class="stg3-hpbar"><div class="stg3-hpfill" style="background:linear-gradient(90deg,#c8a84b,#e8c96b);"></div></div>'+
          '</div>'+
          '<div class="stg3-right"><span class="stg3-sub" style="color:#e8c96b;">'+(KIDS?'Great job!':'Victory')+'</span></div>';
      },1000);

      var xp=firstClear?(isExp?60:40):10;
      var xLabel;
      if(firstClear) xLabel=isExp?'Skill mastered!':(KIDS?'Stage clear!':'Stage conquered!');
      else xLabel=KIDS?'Review cleared!':'Review cleared!';
      setTimeout(function(){ if(window.RPG) RPG.addXP(xp,xLabel); },1100);
      if(isPerfect){
        setTimeout(function(){ if(window.RPG) RPG.addXP(25,KIDS?'Perfect!':'Flawless victory!'); },2000);
      }

      if(firstClear){
        setTimeout(function(){ clearPop(isPerfect); },1600);
      }
    }

    function clearPop(isPerfect){
      var allNow=(clearedCount()===Z.pages.length);
      var bossDone=window.RPG&&RPG.bossCleared(Z.boss);
      var bossPage='/math-site/en/boss_'+Z.boss+'.html';
      var ov=document.createElement('div');
      ov.className='stg-clear-ov';
      var h='<div class="stg-clear-card'+(isExp?' exp':'')+'">';
      if(isExp){
        h+='<div class="stg-cl-title">SKILL UNLOCKED</div>'+
          '<div class="stg-cl-item">'+pg.di+'</div>'+
          '<div class="stg-cl-iname">['+pg.dn+']</div>'+
          '<div class="stg-cl-fl">'+pg.fl+'</div>';
      }else{
        h+='<div class="stg-cl-title">⭐ '+(KIDS?'Stage clear!':'Stage conquered!')+'</div>'+
          '<div class="stg-cl-line">'+pg.mn+' '+(KIDS?'defeated!':'vanquished!')+'</div>'+
          '<div class="stg-cl-item">'+pg.di+'</div>'+
          '<div class="stg-cl-iname">'+pg.dn+': '+(KIDS?'obtained!':'obtained!')+'</div>';
      }
      if(isPerfect){
        h+='<div class="stg-cl-line" style="color:#ffe9a8;">⚡ '+(KIDS
          ?'Perfect! You got every question right on the first try!'
          :'Flawless victory ── every question right on the first try.')+'</div>';
      }
      if(allNow&&!bossDone){
        h+='<div class="stg-cl-line" style="margin-top:10px;color:#ffd9c8;">'+(KIDS
          ?'🔥 You\'ve got all the gear!<br>Now\'s your chance to beat the boss!'
          :(isExp?'All skills unlocked.<br>You\'re ready to challenge "'+Z.bossName+'".'
            :'All gathered.<br>You\'re ready to challenge "'+Z.bossName+'".'))+'</div>'+
          '<a class="stg-cl-boss" href="'+bossPage+'">⚔️ Challenge the boss "'+Z.bossName+'"</a>';
      }else if(!bossDone){
        var remain=Z.pages.length-clearedCount();
        h+='<div class="stg-cl-fl" style="margin-top:8px;">'+(KIDS
          ?'Boss "'+Z.bossName+'" in '+remain+' more stages!'
          :'Boss "'+Z.bossName+'" battle in '+remain+' stages.')+'</div>';
      }
      h+='<div class="stg-cl-close">'+(KIDS?'Tap to close':'Click to close')+'</div></div>';
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
