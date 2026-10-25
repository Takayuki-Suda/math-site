/* ════════════════════════════════════════════════════════
   フィールド探索型RPGマップ・エンジン（サイト共通）
   地下に降りていく5層構造：
     地上   = 小学生   (sho)  boss1
     1階層下 = 中学生   (chu)  boss2
     2階層下 = 高校生   (ko)   boss3
     3階層下 = 大学生   (dai)  boss4
     4階層下 = 大学院   (in)   boss5
   各 <zone>/map.html は  FieldMap('<zone>')  を呼ぶだけ。

   既存システムとの互換：
     - XP/レベル/ボス撃破は window.RPG（rpg.js）をそのまま使用
     - 効果音は window.SND（sound.js）
     - 知識カードの収集状況は localStorage 'rpg_cards'（追加キー・後方互換）
   ════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── 知識カード収集（図鑑） ── */
function getCards(){
  try{ return JSON.parse(localStorage.getItem('rpg_cards')||'[]')||[]; }catch(e){ return []; }
}
function hasCard(id){ return getCards().indexOf(id)>=0; }
function addCardId(id){
  var a=getCards();
  if(a.indexOf(id)<0){ a.push(id); localStorage.setItem('rpg_cards',JSON.stringify(a)); }
}

/* ── クイズ定義のショートハンド ── */
function E(emoji,name,xp,color,q){ return {emoji:emoji,name:name,xp:xp,color:color,q:q}; }

/* ── 知識カードのビジュアル：数式テキストを 1枚のSVGに ──
   各カードは canvas/SVG の簡単な図 or 数式を自前で持ち、ポップアップ内で完結する。 */
function SVG(inner){
  return '<svg viewBox="0 0 240 120" width="100%" preserveAspectRatio="xMidYMid meet" '+
    'xmlns="http://www.w3.org/2000/svg" font-family="Georgia, \'Noto Sans JP\', serif">'+inner+'</svg>';
}
function F(main,sub){
  var n=(main||'').length, fs=n>13?22:(n>9?27:34);
  return SVG(
    '<text x="120" y="'+(sub?56:70)+'" text-anchor="middle" font-weight="bold" font-size="'+fs+'" fill="#ffe9a8">'+main+'</text>'+
    (sub?'<text x="120" y="91" text-anchor="middle" font-family="\'Noto Sans JP\',sans-serif" font-size="13" fill="#9fb0d0">'+sub+'</text>':'')
  );
}
function DOTS(cols,rows){
  var s='',i,j;
  for(j=0;j<rows;j++) for(i=0;i<cols;i++) s+='<circle cx="'+(26+i*18)+'" cy="'+(22+j*15)+'" r="4.5" fill="#7ec850"/>';
  return s;
}

/* ════════════════════════════════════════════════════════
   プレイヤーキャラクター（タイトルで選択・フィールド描画と共有）
   各キャラは1枚の自己完結SVGで定義する。
     ・キャラ選択画面 … DOMにそのまま表示（くっきり大きく）
     ・フィールドのcanvas … このSVGを画像化し drawPlayer() で描画
   localStorage 'rpg_char' に 'yuusha' / 'mahou' を保存。
   ════════════════════════════════════════════════════════ */
var HEROES={
  yuusha:{
    name:'Hero', color:'#5b8cff',
    svg:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120" viewBox="0 0 100 120">'+
      '<line x1="80" y1="32" x2="76" y2="104" stroke="#9c6b3f" stroke-width="5" stroke-linecap="round"/>'+
      '<circle cx="81" cy="28" r="8" fill="#7ee8fa"/><circle cx="81" cy="28" r="8" fill="none" stroke="#e8f9ff" stroke-width="1.5"/><circle cx="78" cy="25" r="2" fill="#fff" opacity=".9"/>'+
      '<path d="M30 58 Q18 92 26 108 L50 96 L74 108 Q82 92 70 58 Z" fill="#2a4fa8"/>'+
      '<path d="M34 60 Q50 54 66 60 L62 96 Q50 102 38 96 Z" fill="#3a6fd8"/>'+
      '<path d="M34 60 Q50 54 66 60 L64 72 Q50 66 36 72 Z" fill="#5b8cff"/>'+
      '<rect x="37" y="84" width="26" height="6" rx="3" fill="#1f3a78"/>'+
      '<rect x="40" y="98" width="9" height="12" rx="3" fill="#4a3220"/><rect x="51" y="98" width="9" height="12" rx="3" fill="#4a3220"/>'+
      '<circle cx="72" cy="74" r="5" fill="#ffd9b3"/><circle cx="33" cy="78" r="5" fill="#ffd9b3"/>'+
      '<circle cx="50" cy="42" r="15" fill="#ffd9b3"/>'+
      '<circle cx="36" cy="44" r="3" fill="#ffcaa0"/><circle cx="64" cy="44" r="3" fill="#ffcaa0"/>'+
      '<circle cx="44" cy="43" r="2.2" fill="#3a2a2a"/><circle cx="56" cy="43" r="2.2" fill="#3a2a2a"/>'+
      '<path d="M45 49 Q50 53 55 49" fill="none" stroke="#b5654a" stroke-width="1.8" stroke-linecap="round"/>'+
      '<circle cx="40" cy="47" r="2.4" fill="#ffb0a0" opacity=".6"/><circle cx="60" cy="47" r="2.4" fill="#ffb0a0" opacity=".6"/>'+
      '<ellipse cx="50" cy="30" rx="22" ry="6" fill="#274a96"/>'+
      '<path d="M32 30 Q50 31 68 30 Q56 9 50 3 Q45 14 32 30 Z" fill="#3a6fd8"/>'+
      '<path d="M50 3 Q45 14 32 30 Q42 31 50 31 Z" fill="#2f5bbf"/>'+
      '<path d="M34 27 Q50 31 66 27 L64 22 Q50 26 36 22 Z" fill="#e8c96b"/>'+
      '<path d="M50 11 L52.5 17 L58 19 L52.5 21 L50 27 L47.5 21 L42 19 L47.5 17 Z" fill="#ffe9a8"/>'+
      '</svg>'
  },
  mahou:{
    name:'Wizard', color:'#ff7ec8',
    svg:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120" viewBox="0 0 100 120">'+
      '<path d="M30 40 Q10 50 16 80 Q24 70 32 62 Z" fill="#ff8fc4"/>'+
      '<path d="M70 40 Q90 50 84 80 Q76 70 68 62 Z" fill="#ff8fc4"/>'+
      '<circle cx="17" cy="76" r="7" fill="#ff8fc4"/><circle cx="83" cy="76" r="7" fill="#ff8fc4"/>'+
      '<path d="M11 66 l-7 -4 v8 z" fill="#ff4f8b"/><path d="M23 66 l7 -4 v8 z" fill="#ff4f8b"/><circle cx="17" cy="66" r="3" fill="#ffd54f"/>'+
      '<path d="M77 66 l-7 -4 v8 z" fill="#ff4f8b"/><path d="M89 66 l7 -4 v8 z" fill="#ff4f8b"/><circle cx="83" cy="66" r="3" fill="#ffd54f"/>'+
      '<line x1="72" y1="64" x2="84" y2="100" stroke="#ffd54f" stroke-width="4" stroke-linecap="round"/>'+
      '<g transform="translate(70,58)" fill="#ff4f8b"><path d="M0 -2 C -2 -6 -8 -6 -8 -1 C -8 3 -3 6 0 9 C 3 6 8 3 8 -1 C 8 -6 2 -6 0 -2 Z"/></g>'+
      '<path d="M34 66 Q50 60 66 66 L74 104 Q50 98 26 104 Z" fill="#ff6fb0"/>'+
      '<path d="M26 104 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0" fill="none" stroke="#ffb3d9" stroke-width="4"/>'+
      '<path d="M40 66 Q50 62 60 66 L58 80 Q50 76 42 80 Z" fill="#ffb3d9"/>'+
      '<rect x="42" y="102" width="6" height="11" rx="3" fill="#ffe0c2"/><rect x="52" y="102" width="6" height="11" rx="3" fill="#ffe0c2"/>'+
      '<ellipse cx="45" cy="113" rx="5" ry="3" fill="#ff4f8b"/><ellipse cx="55" cy="113" rx="5" ry="3" fill="#ff4f8b"/>'+
      '<circle cx="70" cy="68" r="4.5" fill="#ffe0c2"/><circle cx="32" cy="72" r="4.5" fill="#ffe0c2"/>'+
      '<circle cx="50" cy="44" r="16" fill="#ffe0c2"/>'+
      '<path d="M34 44 Q30 54 34 60 L39 51 Z" fill="#ff8fc4"/><path d="M66 44 Q70 54 66 60 L61 51 Z" fill="#ff8fc4"/>'+
      '<path d="M34 42 Q34 24 50 24 Q66 24 66 42 Q60 34 54 37 Q50 30 46 37 Q40 34 34 42 Z" fill="#ff8fc4"/>'+
      '<path d="M50 23 l-10 -6 v12 z" fill="#ff4f8b"/><path d="M50 23 l10 -6 v12 z" fill="#ff4f8b"/><circle cx="50" cy="23" r="4" fill="#ffd54f"/>'+
      '<ellipse cx="43" cy="46" rx="3.6" ry="4.6" fill="#7a2f5a"/><ellipse cx="57" cy="46" rx="3.6" ry="4.6" fill="#7a2f5a"/>'+
      '<circle cx="44.4" cy="44.4" r="1.4" fill="#fff"/><circle cx="58.4" cy="44.4" r="1.4" fill="#fff"/>'+
      '<path d="M46 53 Q50 56 54 53" fill="none" stroke="#cc4477" stroke-width="1.6" stroke-linecap="round"/>'+
      '<circle cx="37" cy="50" r="2.6" fill="#ff8fb0" opacity=".7"/><circle cx="63" cy="50" r="2.6" fill="#ff8fb0" opacity=".7"/>'+
      '</svg>'
  }
};
function heroId(){ var c=null; try{ c=localStorage.getItem('rpg_char'); }catch(e){} return (c==='mahou'||c==='yuusha')?c:'yuusha'; }
var _heroImg={};
function heroImage(id){
  if(_heroImg[id]) return _heroImg[id];
  var img=new Image();
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(HEROES[id].svg);
  _heroImg[id]=img; return img;
}

/* ════════════════════════════════════════════════════════
   全層データ（マップ・敵・カード）
   マップ凡例：
     P=主人公 . =床  S=下り階段(ボス撃破で解錠)  U=上り階段
     B=ボスの扉  C=宝箱（知識カード）  E=敵
     # T R ~ 空白 =通行不可（壁・木・岩・水）
   ════════════════════════════════════════════════════════ */
var LAYERS={

/* ═══════════════ 小学生フィールド 1-1〜1-6（6分割） ═══════════════ */
/* 1-1 たしざん・ひきざん（明るい森・草原） */
sho1:{
  zone:'sho1', kids:true, border:'T', decor:'forest',
  title:'Forest of Addition', depth:'1-1 ─ Addition & Subtraction',
  theme:{bg:'#16361f', floorA:'#2f7d3f', floorB:'#2b7339', accent:'#ffe08a', wall:'#5a3a22'},
  boss:'1-1', bossName:'The Addition King', bossEmoji:'👑', bossPage:'/math-site/en/boss_sho_1.html',
  requireBoss:null, requireBossPage:null, requireBossName:null,
  up:{href:'/math-site/en/', name:'Back to the entrance'},
  next:{href:'/math-site/en/sho/map_2.html', name:'1-2 Volcano of Multiplication'},
  map:[
    'TTTTTTTTTTTTTTTTTTT',
    'TU.P..............T',
    'T..E..C..T..E..C..T',
    'T.................T',
    'T..E..T..C..E..T..T',
    'T.................T',
    'T..E..............T',
    'T.................T',
    'T.................T',
    'TbTgT.............T',
    'TBTST.............T',
    'TTTTTTTTTTTTTTTTTTT'
  ],
  enemies:[ E('🟢','Plus Slime',24,'#4fc3f7',[]), E('🦇','Minus Bat',26,'#9575cd',[]), E('🐛','Count Bug',22,'#9ccc65',[]) ],
  cards:[
    {id:'sho1-tashi',e:'➕',t:'Addition tip',b:'8+5: 8 and 2 make 10, then 3 more makes 13. "Make 10 first, then add" is fast!',svg:F('8 + 5 = 13','Make 10 first, then add')},
    {id:'sho1-hiki',e:'➖',t:'Subtraction tip',b:'13−5: split 13 into 10 and 3, 10−5=5, and 5 and 3 make 8. The key is "take away from 10".',svg:F('13 − 5 = 8','Think of taking away from 10')},
    {id:'sho1-kurai',e:'🔢',t:'How place value works',b:'28 is 2 tens and 8 ones. Line up the places when you calculate and you won\'t make mistakes.',svg:F('28 = 20 + 8','The tens place and the ones place')}
  ]
},
/* 1-2 かけざん・わりざん（火山・溶岩） */
sho2:{
  zone:'sho2', kids:true, border:'R', decor:'cave',
  title:'Volcano of Multiplication', depth:'1-2 ─ Multiplication & Division',
  theme:{bg:'#2a0e08', floorA:'#5a241a', floorB:'#4d1f16', accent:'#ff9a3c', wall:'#7a2f1a'},
  boss:'1-2', bossName:'The Times Table Dragon', bossEmoji:'🐲', bossPage:'/math-site/en/boss_sho_2.html',
  requireBoss:'1-1', requireBossPage:'/math-site/en/boss_sho_1.html', requireBossName:'The Addition King',
  up:{href:'/math-site/en/sho/map_1.html', name:'1-1 Forest of Addition'},
  next:{href:'/math-site/en/sho/map_3.html', name:'1-3 Lake of Fractions'},
  map:[
    'RRRRRRRRRRRRRRRRRRR',
    'RU.P..............R',
    'R..E..C..R..E..C..R',
    'R.................R',
    'R..E..R..C..E..R..R',
    'R.................R',
    'R..E..............R',
    'R.................R',
    'R.................R',
    'RbRgR.............R',
    'RBRSR.............R',
    'RRRRRRRRRRRRRRRRRRR'
  ],
  enemies:[ E('🐍','Times Table Snake',30,'#66bb6a',[]), E('🦀','Division Crab',32,'#ef5350',[]), E('🐲','Baby Dragon',34,'#42a5f5',[]) ],
  cards:[
    {id:'sho2-kuku',e:'✖️',t:'Secrets of the times table',b:'7×6 is 7×5=35 plus 7, which is 42. Multiplication gives the same answer even if you swap the order!',svg:F('7 × 6 = 42','Learn the times table')},
    {id:'sho2-wari',e:'➗',t:'Division',b:'For 24÷6, think "6×?=24" and get 4. Division is the reverse of multiplication.',svg:F('24 ÷ 6 = 4','6 × 4 = 24')},
    {id:'sho2-amari',e:'🔁',t:'Division with remainders',b:'14÷4: 4×3=12, remainder 2. We write 14=4×3+2.',svg:F('14 ÷ 4 = 3 R2','Watch out for remainders')}
  ]
},
/* 1-3 分数・小数（水辺・湖） */
sho3:{
  zone:'sho3', kids:true, border:'R', decor:'island',
  title:'Lake of Fractions', depth:'1-3 ─ Fractions & Decimals',
  theme:{bg:'#07203a', floorA:'#16557d', floorB:'#134a6e', accent:'#8be0ff', wall:'#2a5f7a'},
  boss:'1-3', bossName:'The Fraction Genie', bossEmoji:'🧞', bossPage:'/math-site/en/boss_sho_3.html',
  requireBoss:'1-2', requireBossPage:'/math-site/en/boss_sho_2.html', requireBossName:'The Times Table Dragon',
  up:{href:'/math-site/en/sho/map_2.html', name:'1-2 Volcano of Multiplication'},
  next:{href:'/math-site/en/sho/map_4.html', name:'1-4 Temple of Area'},
  map:[
    'RRRRRRRRRRRRRRRRRRR',
    'RU.P..............R',
    'R..E..C..R..E..C..R',
    'R.................R',
    'R..E..R..C..E..R..R',
    'R.................R',
    'R..E..............R',
    'R.................R',
    'R.................R',
    'RbRgR.............R',
    'RBRSR.............R',
    'RRRRRRRRRRRRRRRRRRR'
  ],
  enemies:[ E('🪼','Fraction Jellyfish',30,'#ba68c8',[]), E('🦑','Decimal Squid',32,'#7e57c2',[]), E('👻','Half Ghost',28,'#b0bec5',[]) ],
  cards:[
    {id:'sho3-bun',e:'🍕',t:'Adding fractions',b:'If the denominators are the same, just add the numerators. 1/4+2/4=3/4.',svg:F('1/4 + 2/4 = 3/4','Keep the denominator')},
    {id:'sho3-yaku',e:'✂️',t:'Reducing',b:'2/4: divide top and bottom by 2 to get 1/2. It\'s a fraction of the same size.',svg:F('2/4 = 1/2','Divide top and bottom by the same number')},
    {id:'sho3-sho',e:'🔟',t:'How decimals work',b:'Think of how many 0.1s there are. 0.3+0.4 is seven 0.1s, so 0.7.',svg:F('0.3 + 0.4 = 0.7','How many 0.1s')}
  ]
},
/* 1-4 図形・面積（神殿・石造り） */
sho4:{
  zone:'sho4', kids:true, border:'#', decor:'ruins',
  title:'Temple of Area', depth:'1-4 ─ Shapes & Area',
  theme:{bg:'#1c1a14', floorA:'#5a5440', floorB:'#514b39', accent:'#ffe08a', wall:'#7b7460'},
  boss:'1-4', bossName:'The Area Monster', bossEmoji:'📐', bossPage:'/math-site/en/boss_sho_4.html',
  requireBoss:'1-3', requireBossPage:'/math-site/en/boss_sho_3.html', requireBossName:'The Fraction Genie',
  up:{href:'/math-site/en/sho/map_3.html', name:'1-3 Lake of Fractions'},
  next:{href:'/math-site/en/sho/map_5.html', name:'1-5 Clock Tower'},
  map:[
    '###################',
    '#U.P..............#',
    '#..E..C..#..E..C..#',
    '#.................#',
    '#..E..#..C..E..#..#',
    '#.................#',
    '#..E..............#',
    '#.................#',
    '#.................#',
    '#b#g#.............#',
    '#B#S#.............#',
    '###################'
  ],
  enemies:[ E('🔺','Triangle Golem',34,'#26a69a',[]), E('🟦','Square Golem',34,'#5c6bc0',[]), E('📐','Area Bat',32,'#26c6da',[]) ],
  cards:[
    {id:'sho4-cho',e:'▭',t:'Area of a rectangle',b:'Height×width. Height 3 and width 5 gives 15cm². Don\'t mix it up with the perimeter.',svg:F('height × width','Area of a rectangle')},
    {id:'sho4-sei',e:'□',t:'Area of a square',b:'Side×side. If a side is 4cm, it\'s 16cm².',svg:F('side × side','Area of a square')},
    {id:'sho4-san',e:'📐',t:'Area of a triangle',b:'Base×height÷2. It\'s half a rectangle, so don\'t forget ÷2.',svg:F('base × height ÷ 2','Area of a triangle')}
  ]
},
/* 1-5 時計・単位（時計塔・機械） */
sho5:{
  zone:'sho5', kids:true, border:'R', decor:'void',
  title:'Clock Tower', depth:'1-5 ─ Clocks & Units',
  theme:{bg:'#241a0e', floorA:'#5a4524', floorB:'#4d3b1f', accent:'#ffd54f', wall:'#7a5e2a'},
  boss:'1-5', bossName:'The Clock Genie', bossEmoji:'⏰', bossPage:'/math-site/en/boss_sho_5.html',
  requireBoss:'1-4', requireBossPage:'/math-site/en/boss_sho_4.html', requireBossName:'The Area Monster',
  up:{href:'/math-site/en/sho/map_4.html', name:'1-4 Temple of Area'},
  next:{href:'/math-site/en/sho/map_6.html', name:'1-6 Castle of Arithmetic'},
  map:[
    'RRRRRRRRRRRRRRRRRRR',
    'RU.P..............R',
    'R..E..C..R..E..C..R',
    'R.................R',
    'R..E..R..C..E..R..R',
    'R.................R',
    'R..E..............R',
    'R.................R',
    'R.................R',
    'RbRgR.............R',
    'RBRSR.............R',
    'RRRRRRRRRRRRRRRRRRR'
  ],
  enemies:[ E('🦉','Clock Owl',34,'#ffb74d',[]), E('🐰','Unit Rabbit',32,'#f06292',[]), E('🐭','Time Mouse',30,'#bdbdbd',[]) ],
  cards:[
    {id:'sho5-tokei',e:'🕐',t:'Reading a clock',b:'On the long hand, each number is 5 minutes. Pointing at 3 means 15 minutes. Count by 5s.',svg:F('Long hand at 3 = 15 min','Each number = 5 min')},
    {id:'sho5-jikan',e:'⏳',t:'Units of time',b:'1 hour = 60 min, 1 min = 60 sec. Watch out: it carries over at 60.',svg:F('1 hour = 60 min','Carry over at 60')},
    {id:'sho5-tani',e:'📏',t:'Length, weight, volume',b:'1cm=10mm, 1m=100cm, 1kg=1000g, 1L=1000mL.',svg:F('1m = 100cm','How units relate')}
  ]
},
/* 1-6 小学生 総まとめ（城・最終エリア） */
sho6:{
  zone:'sho6', kids:true, border:'R', decor:'void',
  title:'Castle of Arithmetic', depth:'1-6 ─ Elementary Review',
  theme:{bg:'#0e0820', floorA:'#2a2348', floorB:'#251f40', accent:'#e8c96b', wall:'#3a3460'},
  boss:'1-6', bossName:'The Guardian of Arithmetic', bossEmoji:'🛡️', bossPage:'/math-site/en/boss_sho_6.html',
  requireBoss:'1-5', requireBossPage:'/math-site/en/boss_sho_5.html', requireBossName:'The Clock Genie',
  up:{href:'/math-site/en/sho/map_5.html', name:'1-5 Clock Tower'},
  next:{href:'/math-site/en/chu/map.html', name:'Middle School Field (Caves)'},
  map:[
    'RRRRRRRRRRRRRRRRRRR',
    'RU.P..............R',
    'R..E..C..R..E..C..R',
    'R.................R',
    'R..E..R..C..E..R..R',
    'R.................R',
    'R..E..............R',
    'R.................R',
    'R.................R',
    'RbRgR.............R',
    'RBRSR.............R',
    'RRRRRRRRRRRRRRRRRRR'
  ],
  enemies:[ E('🟣','Review Slime',38,'#ab47bc',[]), E('🤖','Calc Robot',40,'#78909c',[]), E('🐉','Arithmetic Dragon',42,'#7e57c2',[]) ],
  cards:[
    {id:'sho6-fukushu',e:'📚',t:'Review is power',b:'From addition to units, it\'s all connected. Keep going a little every day.',svg:F('1-1 to 1-5','It all connects')},
    {id:'sho6-mistake',e:'💡',t:'Mistakes are treasure',b:'The places you got wrong are where you grow the most. Think about why it works that way.',svg:F('mistake → growth','Treasure the "why?"')},
    {id:'sho6-next',e:'🚪',t:'The door to middle school',b:'Get past here and it\'s middle-school math. Letters and equations are waiting for you.',svg:F('Elementary → Middle school','On to the next world')}
  ]
},

/* ───────────────────────── 地上：小学生（森・草原・旧 / フォールバック） ───────────────────────── */
sho:{
  zone:'sho', kids:true, border:'T', decor:'forest',
  title:'Forest of Beginnings', depth:'Surface ─ Elementary Field',
  theme:{bg:'#16361f', floorA:'#2f7d3f', floorB:'#2b7339', accent:'#ffe08a', wall:'#5a3a22'},
  boss:1, bossName:'The Wall of Algebra', bossEmoji:'🗿', bossPage:'/math-site/en/boss_1.html',
  requireBoss:null, requireBossPage:null, requireBossName:null,
  up:{href:'/math-site/en/', name:'Back to the entrance'},
  next:{href:'/math-site/en/chu/map.html', name:'Middle School Field (Caves)'},
  map:[
    'TTTTTTTTTTTTTTTTTTT',
    'TU.P..............T',
    'T..C..E..T..C..E..T',
    'T.................T',
    'T..C..T..E..C..T..T',
    'T.................T',
    'T..E..C..E..C..E..T',
    'T...........C..C..T',
    'T.................T',
    'TbTgT.............T',
    'TBTST.............T',
    'TTTTTTTTTTTTTTTTTTT'
  ],
  enemies:[
    E('🐛','Count Bug',30,'#9ccc65',[
      {q:'3 groups of 10 and 4 loose ones. How many in all?',c:['7','34','304'],a:1,exp:'3 tens make 30. 30 and 4 make 34!'},
      {q:'28 is how many groups of 10 and how many loose ones?',c:['2 tens and 8 ones','8 tens and 2 ones','2 tens and 2 ones'],a:0,exp:'28 is 20 and 8. That\'s 2 groups of 10.'},
      {q:'Counting by 2s: 2, 4, 6, 8… What comes next?',c:['9','12','10'],a:2,exp:'It goes up by 2, so after 8 comes 10!'}
    ]),
    E('🟢','Plus Slime',30,'#4fc3f7',[
      {q:'What is 8+5?',c:['12','13','14'],a:1,exp:'Add 2 to 8 to make 10. Then add the other 3 to get 13!'},
      {q:'9+7. First, what do you add to 9 to make 10?',c:['1','2','3'],a:0,exp:'9+1 makes 10. 10 and the other 6 make 16!'},
      {q:'What is 30+40?',c:['70','34','60'],a:0,exp:'3 tens and 4 tens make 7 tens. 70!'}
    ]),
    E('🦇','Minus Bat',32,'#9575cd',[
      {q:'What is 13−5?',c:['7','9','8'],a:2,exp:'Split 13 into 10 and 3. 10−5=5, and 5 and 3 make 8!'},
      {q:'What is 15−9?',c:['6','7','5'],a:0,exp:'10−9=1, and 1 and 5 make 6!'},
      {q:'What is 70−20?',c:['90','50','5'],a:1,exp:'In tens, 7−2=5. So it\'s 50!'}
    ]),
    E('🐲','The Times Table Dragon',40,'#e57373',[
      {q:'What is 7×6?',c:['42','48','36'],a:0,exp:'7×5=35, plus 7 is 42!'},
      {q:'Which one has the same answer as 4×8?',c:['4+8','8×4','6×6'],a:1,exp:'Multiplication gives the same answer even if you swap the order!'},
      {q:'What is 9×9?',c:['72','99','81'],a:2,exp:'The last one in the 9s. It\'s 81!'}
    ]),
    E('👻','Half Ghost',34,'#b0bec5',[
      {q:'What is 1/2 + 1/4?',c:['2/6','3/4','2/4'],a:1,exp:'1/2 is the same as 2/4. 2/4+1/4=3/4!'},
      {q:'1/3 and 2/6: which is bigger?',c:['1/3','2/6','the same'],a:2,exp:'Reduce 2/6 and you get 1/3. They\'re the same size!'},
      {q:'What is 1/2 + 1/3?',c:['5/6','2/5','1/6'],a:0,exp:'Make both denominators 6: 3/6+2/6=5/6!'}
    ]),
    E('🗿','Triangle Gargoyle',36,'#a1887f',[
      {q:'What is the area of a triangle with base 6 cm and height 4 cm?',c:['24cm²','10cm²','12cm²'],a:2,exp:'6×4÷2=12. Don\'t forget the ÷2 at the end!'},
      {q:'Why do we "÷2" for the area of a triangle?',c:['because it\'s half a rectangle','because there are 2 heights','because that\'s the rule'],a:0,exp:'Put two of the same triangle together and you get a rectangle!'},
      {q:'If you double the base, what happens to the area?',c:['it stays the same','it doubles','it becomes 4 times'],a:1,exp:'It\'s base×height÷2, so if the base doubles, the area doubles too!'}
    ]),
    E('🟡','Round Spirit',34,'#ffd54f',[
      {q:'If you cut a circle into thin slices and line them up, what does it get close to?',c:['triangle','a star shape','a rectangle'],a:2,exp:'It becomes a rectangle with height = radius and width = half the circumference!'},
      {q:'What is the area of a circle with radius 10 cm? (π = 3.14)',c:['314cm²','31.4cm²','100cm²'],a:0,exp:'10×10×3.14=314!'},
      {q:'In the rectangle you made, how long is the "height"?',c:['the diameter','the radius','the circumference'],a:1,exp:'The length of one slice = the radius!'}
    ]),
    E('🧩','Puzzle Keeper',38,'#4db6ac',[
      {q:'1, 2, 4, 8… it keeps growing. What comes next?',c:['16','10','12'],a:0,exp:'It doubles each time! Double 8 is 16.'},
      {q:'◯+◯=10. What same number goes in ◯?',c:['2','10','5'],a:2,exp:'5+5=10!'},
      {q:'Which one doesn\'t belong with 3, 6, 9, 12…?',c:['15','20','18'],a:1,exp:'They\'re all numbers in the 3s. 20 can\'t be divided evenly by 3!'}
    ])
  ],
  cards:[
    {id:'sho-ten',e:'🔟',t:'Groups of 10',b:'When you gather 10, it moves up one place. 28 is 2 tens and 8 ones. This is the foundation of the world of numbers.',
      svg:SVG('<rect x="14" y="32" width="40" height="56" rx="7" fill="#7e57c2"/><text x="34" y="67" text-anchor="middle" font-size="20" font-weight="bold" fill="#fff" font-family="sans-serif">10</text><rect x="60" y="32" width="40" height="56" rx="7" fill="#7e57c2"/><text x="80" y="67" text-anchor="middle" font-size="20" font-weight="bold" fill="#fff" font-family="sans-serif">10</text><text x="116" y="64" text-anchor="middle" font-size="20" fill="#ffe9a8">+</text><circle cx="140" cy="48" r="6" fill="#ffd54f"/><circle cx="158" cy="48" r="6" fill="#ffd54f"/><circle cx="176" cy="48" r="6" fill="#ffd54f"/><circle cx="194" cy="48" r="6" fill="#ffd54f"/><circle cx="140" cy="70" r="6" fill="#ffd54f"/><circle cx="158" cy="70" r="6" fill="#ffd54f"/><circle cx="176" cy="70" r="6" fill="#ffd54f"/><circle cx="194" cy="70" r="6" fill="#ffd54f"/><text x="167" y="106" text-anchor="middle" font-size="16" font-weight="bold" fill="#fff" font-family="sans-serif">= 28</text>')},
    {id:'sho-tashi',e:'➕',t:'Addition tip',b:'8+5: add 2 to 8 to make 10, then 3 more makes 13. "Make 10 first, then add" is fast!',
      svg:F('8 + 5 = 13','Make 10 first, then add')},
    {id:'sho-hiki',e:'➖',t:'Subtraction tip',b:'13−5: split 13 into 10 and 3, 10−5=5, and with the 3 that\'s 8. The key is "take away from 10".',
      svg:F('13 − 5 = 8','Think of taking away from 10')},
    {id:'sho-kuku',e:'✖️',t:'Secrets of the times table',b:'7×6 is 7×5=35 plus 7, which is 42. The times table is repeated addition. Swap the order and the answer stays the same!',
      svg:SVG(DOTS(7,6)+'<text x="192" y="50" text-anchor="middle" font-size="15" fill="#cfe3ff" font-family="sans-serif">7 × 6</text><text x="192" y="86" text-anchor="middle" font-size="30" font-weight="bold" fill="#ffe9a8">42</text>')},
    {id:'sho-bunsu',e:'🍕',t:'What is a fraction?',b:'1/2 is one slice of a pizza cut into 2. To add, first make the denominators (bottom numbers) the same, then add the tops.',
      svg:SVG('<path d="M70,60 L70,20 A40,40 0 0 1 110,60 Z" fill="#ff8a9b"/><path d="M70,60 L110,60 A40,40 0 0 1 70,100 Z" fill="#ff8a9b"/><path d="M70,60 L70,100 A40,40 0 0 1 30,60 Z" fill="#ff8a9b"/><path d="M70,60 L30,60 A40,40 0 0 1 70,20 Z" fill="#3a2233"/><circle cx="70" cy="60" r="40" fill="none" stroke="#ffe9a8" stroke-width="2"/><line x1="30" y1="60" x2="110" y2="60" stroke="#ffe9a8" stroke-width="1.5"/><line x1="70" y1="20" x2="70" y2="100" stroke="#ffe9a8" stroke-width="1.5"/><text x="175" y="56" text-anchor="middle" font-size="34" font-weight="bold" fill="#ffe9a8">¾</text><text x="175" y="84" text-anchor="middle" font-size="14" fill="#9fb0d0" font-family="sans-serif">½ + ¼</text>')},
    {id:'sho-sankaku',e:'📐',t:'Area of a triangle',b:'A triangle is half a rectangle. That\'s why it\'s "base×height÷2". Don\'t forget ÷2.',
      svg:SVG('<polygon points="40,92 170,92 95,34" fill="rgba(126,200,80,.25)" stroke="#7ec850" stroke-width="2"/><line x1="95" y1="34" x2="95" y2="92" stroke="#ffe9a8" stroke-width="1.5" stroke-dasharray="5 3"/><path d="M95,82 L105,82 L105,92" fill="none" stroke="#ffe9a8" stroke-width="1.2"/><text x="105" y="108" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">base</text><text x="58" y="64" font-size="12" fill="#cfe3ff" font-family="sans-serif">height</text><text x="205" y="58" text-anchor="middle" font-size="22" font-weight="bold" fill="#ffe9a8">÷2</text>')},
    {id:'sho-en',e:'⭕',t:'Area of a circle',b:'Cut a circle into thin slices and line them up, and you get a rectangle. Height = radius, width = half the circumference. So it\'s radius×radius×3.14.',
      svg:SVG('<circle cx="78" cy="60" r="42" fill="rgba(255,213,79,.18)" stroke="#ffd54f" stroke-width="2"/><circle cx="78" cy="60" r="3" fill="#ffe9a8"/><line x1="78" y1="60" x2="120" y2="60" stroke="#ffe9a8" stroke-width="2"/><text x="98" y="53" text-anchor="middle" font-size="14" fill="#ffe9a8">r</text><text x="188" y="56" text-anchor="middle" font-size="26" font-weight="bold" fill="#ffe9a8">πr²</text><text x="188" y="80" text-anchor="middle" font-size="11" fill="#9fb0d0" font-family="sans-serif">radius×radius×3.14</text>')},
    {id:'sho-puzzle',e:'🧩',t:'Find the pattern',b:'1, 2, 4, 8… doubles each time. A row of numbers always hides a "pattern". Find it and you can read the future!',
      svg:SVG('<g font-size="22" font-weight="bold" font-family="Georgia"><text x="22" y="72" fill="#7ec850">1</text><text x="70" y="72" fill="#7ec850">2</text><text x="118" y="72" fill="#7ec850">4</text><text x="164" y="72" fill="#7ec850">8</text><text x="200" y="72" fill="#ffd54f">16</text></g><g fill="none" stroke="#9fb0d0" stroke-width="1.6"><path d="M34,60 Q48,42 60,60"/><path d="M82,60 Q96,42 108,60"/><path d="M130,60 Q144,42 154,60"/><path d="M176,60 Q190,42 200,60"/></g><g fill="#9fb0d0" font-size="11" font-family="sans-serif" text-anchor="middle"><text x="47" y="38">×2</text><text x="95" y="38">×2</text><text x="142" y="38">×2</text><text x="188" y="38">×2</text></g>')}
  ]
},

/* ───────────────────────── 1階層下：中学生（洞窟・岩場） ───────────────────────── */
chu:{
  zone:'chu', kids:false, border:'#', decor:'cave',
  title:'Caves of Letters', depth:'B1 ─ Middle School Field',
  theme:{bg:'#0c0a14', floorA:'#2c2636', floorB:'#272031', accent:'#8be0ff', wall:'#3a3346'},
  boss:2, bossName:'The Wall of Functions', bossEmoji:'🐲', bossPage:'/math-site/en/boss_2.html',
  requireBoss:'1-6', requireBossPage:'/math-site/en/boss_sho_6.html', requireBossName:'The Guardian of Arithmetic',
  up:{href:'/math-site/en/sho/map_6.html', name:'Back to 1-6 Castle of Arithmetic'},
  next:{href:'/math-site/en/ko/map.html', name:'High School Field (Ruins)'},
  map:[
    '###################',
    '#U.P..............#',
    '#..C..E..R..C..E..#',
    '#.................#',
    '#..C..R..E..C..R..#',
    '#.................#',
    '#..E..R..C..E..C..#',
    '#..............E..#',
    '#.................#',
    '#bRgR.............#',
    '#BRSR.............#',
    '###################'
  ],
  enemies:[
    E('👤','Shadow X',46,'#90a4ae',[
      {q:'How do you write a×3 using the rules for letters?',c:['3a','a3','3×a'],a:0,exp:'Put the number in front and leave out the × sign.'},
      {q:'Simplify x+x+x.',c:['x³','3x','3+x'],a:1,exp:'3 x\'s make 3x. x³ is x×x×x, which is different.'},
      {q:'You buy n apples at 150 yen each. What is the total cost?',c:['150+n yen','n÷150 yen','150n yen'],a:2,exp:'150×n. Leave out × and write 150n.'}
    ]),
    E('⚖️','Balance Chimera',48,'#b39ddb',[
      {q:'If x+7=15, what is x?',c:['8','7','22'],a:0,exp:'Subtract 7 from both sides: x=8. Take the same amount from both sides of the balance.'},
      {q:'If 3x=12, what is x?',c:['36','4','9'],a:1,exp:'Divide both sides by 3: x=4.'},
      {q:'2x−3=7. What is the first move?',c:['Divide both sides by 2','subtract 7 from both sides','add 3 to both sides'],a:2,exp:'First +3 gives 2x=10. Then divide by 2: x=5.'}
    ]),
    E('🐺','Graph Wolf',50,'#81d4fa',[
      {q:'What is the "slope" of y=2x+3?',c:['3','2','x'],a:1,exp:'When x goes up by 1, y goes up by 2. That\'s the slope.'},
      {q:'Where does y=2x+3 cross the y-axis?',c:['(0, 3)','(3, 0)','(0, 2)'],a:0,exp:'When x=0, y=3. The intercept is where it meets the y-axis.'},
      {q:'What does a line with negative slope look like?',c:['rising to the right','horizontal','falling to the right'],a:2,exp:'As x increases, y decreases = it falls to the right.'}
    ]),
    E('🦅','Parabola Falcon',52,'#4fc3f7',[
      {q:'What is the vertex of y=(x−2)²+1?',c:['(2, 1)','(−2, 1)','(2, −1)'],a:0,exp:'The vertex of y=a(x−p)²+q is (p, q).'},
      {q:'In y=ax², if you make a bigger, the parabola…?',c:['opens wider','gets narrower and steeper','doesn\'t change'],a:1,exp:'For the same x, y jumps up more, so it gets narrower and steeper.'},
      {q:'What does the graph of y=−x² look like?',c:['opens downward (a hill)','opens upward (a valley)','a straight line'],a:0,exp:'If a is negative it opens downward = a hill.'}
    ]),
    E('🦂','Pythagoras Scorpion',54,'#ff8a65',[
      {q:'The two sides of a right angle are 3 and 4. What is the hypotenuse?',c:['6','5','7'],a:1,exp:'3²+4²=9+16=25=5².'},
      {q:'When does the Pythagorean theorem a²+b²=c² hold?',c:['right triangles','all triangles','only isosceles triangles'],a:0,exp:'Only for right triangles. Conversely, if it holds, you know there\'s a right angle.'},
      {q:'A right triangle has hypotenuse 13 and one side 5. What is the other side?',c:['8','18','12'],a:2,exp:'13²−5²=169−25=144=12².'}
    ])
  ],
  cards:[
    {id:'chu-moji',e:'✏️',t:'What letters really are',b:'A letter is "a box anything can go in". a×3 is 3a (leave out ×, number in front). x+x+x=3x. One letter can stand for infinitely many cases at once.',
      svg:F('a × 3 = 3a','Leave out ×, number in front')},
    {id:'chu-hou',e:'⚖️',t:'An equation = a balance',b:'= is a balance with both sides level. Subtract or divide the same amount from both sides to get x on its own. x+7=15 → x=8.',
      svg:SVG('<line x1="40" y1="44" x2="200" y2="44" stroke="#e8c96b" stroke-width="3"/><polygon points="120,44 108,80 132,80" fill="#b08d57"/><line x1="60" y1="44" x2="60" y2="62" stroke="#9fb0d0" stroke-width="1.5"/><line x1="180" y1="44" x2="180" y2="62" stroke="#9fb0d0" stroke-width="1.5"/><path d="M44,62 a16,9 0 0 0 32,0" fill="none" stroke="#cfe3ff" stroke-width="2"/><path d="M164,62 a16,9 0 0 0 32,0" fill="none" stroke="#cfe3ff" stroke-width="2"/><text x="60" y="58" text-anchor="middle" font-size="13" fill="#fff" font-family="sans-serif">x+7</text><text x="180" y="58" text-anchor="middle" font-size="13" fill="#fff" font-family="sans-serif">15</text><text x="120" y="102" text-anchor="middle" font-size="12" fill="#9fb0d0" font-family="sans-serif">take 7 from both sides → x=8</text>')},
    {id:'chu-ikiji',e:'📈',t:'What is the slope of a linear function?',b:'The "2" in y=2x+3 is the slope: the "rate of change" where y goes up by 2 when x goes up by 1. The 3 is where it meets the y-axis (the intercept).',
      svg:SVG('<line x1="30" y1="92" x2="222" y2="92" stroke="#5a6b85" stroke-width="1.5"/><line x1="48" y1="16" x2="48" y2="100" stroke="#5a6b85" stroke-width="1.5"/><line x1="48" y1="80" x2="208" y2="28" stroke="#67e8f9" stroke-width="2.5"/><line x1="112" y1="60" x2="150" y2="60" stroke="#ffe9a8" stroke-width="1.3" stroke-dasharray="3 2"/><line x1="150" y1="60" x2="150" y2="47" stroke="#ffe9a8" stroke-width="1.3" stroke-dasharray="3 2"/><text x="130" y="74" text-anchor="middle" font-size="11" fill="#ffe9a8">1</text><text x="158" y="56" font-size="11" fill="#ffe9a8">2</text><text x="200" y="22" text-anchor="middle" font-size="13" fill="#67e8f9">y=2x+3</text>')},
    {id:'chu-niji',e:'🌉',t:'Quadratic function = parabola',b:'The graph of y=x² is a U-shaped curve. For y=a(x−p)²+q the vertex is (p,q). The bigger a is, the narrower and steeper; if negative, it\'s a hill.',
      svg:SVG('<line x1="30" y1="95" x2="222" y2="95" stroke="#5a6b85" stroke-width="1.5"/><line x1="125" y1="16" x2="125" y2="102" stroke="#5a6b85" stroke-width="1.5"/><path d="M72,30 Q125,118 178,30" fill="none" stroke="#67e8f9" stroke-width="2.5"/><circle cx="125" cy="74" r="3.5" fill="#ffe9a8"/><text x="150" y="70" font-size="12" fill="#ffe9a8">vertex</text><text x="196" y="40" text-anchor="middle" font-size="13" fill="#67e8f9">y=x²</text>')},
    {id:'chu-sanpei',e:'📐',t:'The Pythagorean theorem',b:'In a right triangle a²+b²=c² (c is the hypotenuse). 3,4,5 and 5,12,13 are famous. A magic formula for spotting right angles.',
      svg:SVG('<polygon points="60,90 140,90 60,30" fill="rgba(103,232,249,.18)" stroke="#67e8f9" stroke-width="2"/><rect x="60" y="80" width="10" height="10" fill="none" stroke="#67e8f9" stroke-width="1.2"/><text x="50" y="64" text-anchor="end" font-size="13" fill="#cfe3ff">a</text><text x="100" y="104" text-anchor="middle" font-size="13" fill="#cfe3ff">b</text><text x="106" y="56" font-size="13" fill="#ffe9a8">c</text><text x="188" y="62" text-anchor="middle" font-size="16" font-weight="bold" fill="#ffe9a8">a²+b²</text><text x="188" y="84" text-anchor="middle" font-size="16" font-weight="bold" fill="#ffe9a8">= c²</text>')},
    {id:'chu-neg',e:'❄️',t:'What negative numbers really are',b:'Numbers smaller than 0. On the number line, to the left of 0. "Minus × minus = plus" means the opposite of the opposite is back where you started.',
      svg:SVG('<text x="120" y="30" text-anchor="middle" font-size="17" font-weight="bold" fill="#ffe9a8">(−)×(−) = +</text><line x1="20" y1="62" x2="220" y2="62" stroke="#9fb0d0" stroke-width="2"/><g stroke="#9fb0d0" stroke-width="1.3"><line x1="30" y1="56" x2="30" y2="68"/><line x1="60" y1="56" x2="60" y2="68"/><line x1="90" y1="56" x2="90" y2="68"/><line x1="120" y1="54" x2="120" y2="70"/><line x1="150" y1="56" x2="150" y2="68"/><line x1="180" y1="56" x2="180" y2="68"/><line x1="210" y1="56" x2="210" y2="68"/></g><circle cx="120" cy="62" r="4" fill="#ffe9a8"/><g fill="#9fb0d0" font-size="11" text-anchor="middle" font-family="sans-serif"><text x="30" y="84">-3</text><text x="60" y="84">-2</text><text x="90" y="84">-1</text><text x="120" y="86" fill="#ffe9a8">0</text><text x="150" y="84">1</text><text x="180" y="84">2</text><text x="210" y="84">3</text></g>')}
  ]
},

/* ───────────────────────── 2階層下：高校生（霧の遺跡） ───────────────────────── */
ko:{
  zone:'ko', kids:false, border:'#', decor:'ruins',
  title:'Ruins in the Mist', depth:'B2 ─ High School Field',
  theme:{bg:'#101820', floorA:'#39424f', floorB:'#333b47', accent:'#9fe8da', wall:'#566072'},
  boss:3, bossName:'The Wall of ε-δ', bossEmoji:'👁️', bossPage:'/math-site/en/boss_3.html',
  requireBoss:2, requireBossPage:'/math-site/en/boss_2.html', requireBossName:'The Wall of Functions',
  up:{href:'/math-site/en/chu/map.html', name:'Back to the caves'},
  next:{href:'/math-site/en/dai/map.html', name:'University Field (Floating Islands)'},
  map:[
    '###################',
    '#U.P..............#',
    '#..C..E..R..C..E..#',
    '#.................#',
    '#..C..R..E..C..R..#',
    '#.................#',
    '#..E..R..C..E..E..#',
    '#.................#',
    '#.................#',
    '#bRgR.............#',
    '#BRSR.............#',
    '###################'
  ],
  enemies:[
    E('🌊','Phantom of the Sinusoid',56,'#4dd0e1',[
      {q:'What is the value of sin 30°?',c:['1/2','√3/2','1'],a:0,exp:'A 30°-60°-90° triangle. With hypotenuse 2, the side opposite 30° is 1.'},
      {q:'What is the value of sin²θ+cos²θ?',c:['it depends on θ','always 1','always 0'],a:1,exp:'The point (cosθ, sinθ) on the unit circle. Its distance from the origin is always 1 ── that\'s the Pythagorean theorem itself.'},
      {q:'What does tanθ represent geometrically?',c:['the slope of a line through the origin','the area of a sector','the period of a circle'],a:0,exp:'tanθ=sinθ/cosθ=rise/run=slope.'}
    ]),
    E('⚡','Shadow of the Tangent',60,'#9575cd',[
      {q:'What is the derivative of f(x)=x²?',c:['x','x³/3','2x'],a:2,exp:'From the definition lim{f(x+h)−f(x)}/h, (x²)′=2x.'},
      {q:'What does the derivative f′(a) mean geometrically?',c:['the slope of the tangent at x=a','the area up to x=a','the value of the y-intercept'],a:0,exp:'The limit of lines through two points that get infinitely close = the slope of the tangent.'},
      {q:'What can happen at a point where f′(a)=0?',c:['it\'s always a maximum','a candidate for local max/min','the graph breaks'],a:1,exp:'A point where the tangent is horizontal. There are exceptions, like the origin for y=x³.'}
    ]),
    E('🧱','Riemann Wall Soldier',62,'#a1887f',[
      {q:'What is the value of ∫₀¹ x dx?',c:['1','1/2','0'],a:1,exp:'The triangle under y=x. 1×1÷2=1/2.'},
      {q:'A definite integral is really the limit of what?',c:['the average slope of tangents','the sum of areas of thin rectangles','differences of a sequence'],a:1,exp:'The sum of rectangles made infinitely thin ── the limit of Riemann sums.'},
      {q:'If F′(x)=f(x), what is ∫ₐᵇ f(x)dx?',c:['F(b)−F(a)','F(a)−F(b)','F(b)×F(a)'],a:0,exp:'The fundamental theorem of calculus. The reverse of differentiation gives area.'}
    ]),
    E('🚪','Gatekeeper of the University',66,'#7986cb',[
      {q:'What is the negation of "P(x) for all x"?',c:['not P(x) for all x','not P(x) for some x','P(x) is always true'],a:1,exp:'Not "all fail" but "there exists one counterexample".'},
      {q:'Why does high school\'s "gets arbitrarily close" become a problem at university?',c:['it\'s vague and useless as a tool for proof','calculation is slow','the answer changes'],a:0,exp:'Unless "getting close" is defined with formulas, you can\'t write rigorous proofs.'},
      {q:'Why do we need rigorous definitions?',c:['for tradition','for exams','because real examples exist where intuition fails'],a:2,exp:'Things beyond intuition really exist, like continuous functions that are differentiable nowhere.'}
    ]),
    E('🌫️','Mist of Epsilon',70,'#b0bec5',[
      {q:'What is the ε-δ formulation of lim x→a f(x)=L?',c:['for every ε>0 there exists δ>0 such that…','for some ε>0 and every δ>0…','choose ε=δ'],a:0,exp:'However small a tolerance ε, you can answer with a δ ── that\'s what "getting close" really is.'},
      {q:'When can you use the squeeze theorem?',c:['both sides converge to the same value','only one side converges','the middle is increasing'],a:0,exp:'If g≤f≤h and lim g=lim h=L, then lim f=L.'},
      {q:'What happens to 1/n as n→∞?',c:['it approaches 0','it approaches 1','it diverges to ∞'],a:0,exp:'The bigger n gets, the closer 1/n gets to 0, without end.'}
    ])
  ],
  cards:[
    {id:'ko-sin',e:'🌊',t:'What sin and cos really are',b:'For a point on the unit circle (radius 1), the height is sinθ and the width is cosθ. So sin²θ+cos²θ=1. It\'s the Pythagorean theorem itself.',
      svg:SVG('<line x1="20" y1="62" x2="150" y2="62" stroke="#5a6b85" stroke-width="1.5"/><line x1="80" y1="14" x2="80" y2="106" stroke="#5a6b85" stroke-width="1.5"/><circle cx="80" cy="62" r="40" fill="none" stroke="#9fb0d0" stroke-width="1.5"/><line x1="80" y1="62" x2="111" y2="36" stroke="#67e8f9" stroke-width="2.5"/><line x1="111" y1="36" x2="111" y2="62" stroke="#ff8a9b" stroke-width="2" stroke-dasharray="3 2"/><line x1="80" y1="62" x2="111" y2="62" stroke="#7ec850" stroke-width="2.5"/><circle cx="111" cy="36" r="3" fill="#ffe9a8"/><text x="118" y="48" font-size="11" fill="#ff8a9b">sin</text><text x="92" y="76" font-size="11" fill="#7ec850">cos</text><text x="186" y="56" text-anchor="middle" font-size="13" fill="#cfe3ff">sin²+cos²</text><text x="186" y="78" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffe9a8">= 1</text>')},
    {id:'ko-bibun',e:'🎢',t:'Picturing the derivative',b:'The derivative is "the slope at that instant": the slope of the tangent drawn at one point of a curve. Speed = the derivative of position. A tool for capturing change.',
      svg:SVG('<path d="M30,96 Q95,18 212,52" fill="none" stroke="#9fb0d0" stroke-width="2.5"/><line x1="66" y1="80" x2="190" y2="38" stroke="#ff8a9b" stroke-width="2"/><circle cx="125" cy="55" r="4" fill="#ffe9a8"/><text x="138" y="46" font-size="12" fill="#ff8a9b">tangent</text><text x="120" y="108" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">slope at that instant</text>')},
    {id:'ko-sekibun',e:'🧱',t:'Integral = area',b:'An integral is "the areas of thin rectangles added up infinitely". The reverse of the derivative. ∫ₐᵇf(x)dx=F(b)−F(a).',
      svg:SVG('<path d="M40,90 Q120,22 200,42 L200,95 L40,95 Z" fill="rgba(103,232,249,.2)"/><path d="M40,90 Q120,22 200,42" fill="none" stroke="#67e8f9" stroke-width="2.5"/><line x1="30" y1="95" x2="214" y2="95" stroke="#5a6b85" stroke-width="1.5"/><g stroke="#67e8f9" stroke-width="0.8" opacity="0.55"><line x1="70" y1="95" x2="70" y2="58"/><line x1="100" y1="95" x2="100" y2="44"/><line x1="130" y1="95" x2="130" y2="38"/><line x1="160" y1="95" x2="160" y2="38"/><line x1="190" y1="95" x2="190" y2="43"/></g><text x="120" y="112" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">sum of areas of thin rectangles</text>')},
    {id:'ko-epsilon',e:'👁️',t:'ε-δ and rigor',b:'"Getting arbitrarily close" defined with formulas. However small an error ε, you can answer with a δ ── that\'s what a limit really is.',
      svg:F('∀ε&gt;0  ∃δ&gt;0','Answer any error ε with a δ')},
    {id:'ko-kyoku',e:'🔭',t:'What is a limit?',b:'The value you approach. As n grows, 1/n goes toward 0 without end. Even if it never arrives, math captures "where it\'s heading".',
      svg:SVG('<line x1="30" y1="64" x2="215" y2="64" stroke="#9fb0d0" stroke-width="2"/><circle cx="40" cy="64" r="5" fill="#ffe9a8"/><circle cx="205" cy="64" r="4" fill="#67e8f9"/><circle cx="122" cy="64" r="4" fill="#67e8f9"/><circle cx="95" cy="64" r="4" fill="#67e8f9"/><circle cx="81" cy="64" r="4" fill="#67e8f9"/><circle cx="73" cy="64" r="4" fill="#67e8f9"/><g fill="#9fb0d0" font-size="11" text-anchor="middle" font-family="sans-serif"><text x="40" y="84">0</text><text x="205" y="84">1</text></g><text x="120" y="34" text-anchor="middle" font-size="16" font-weight="bold" fill="#ffe9a8">1/n → 0</text>')}
  ]
},

/* ───────────────────────── 3階層下：大学生（幾何学的な浮遊島） ───────────────────────── */
dai:{
  zone:'dai', kids:false, border:'R', decor:'island',
  title:'Floating Islands of Abstraction', depth:'B3 ─ University Field',
  theme:{bg:'#070b18', floorA:'#162343', floorB:'#13203c', accent:'#67e8f9', wall:'#2a3f6e'},
  boss:4, bossName:'The Wall of Abstraction', bossEmoji:'💠', bossPage:'/math-site/en/boss_4.html',
  requireBoss:3, requireBossPage:'/math-site/en/boss_3.html', requireBossName:'The Wall of ε-δ',
  up:{href:'/math-site/en/ko/map.html', name:'Back to the ruins'},
  next:{href:'/math-site/en/in/map.html', name:'Graduate School Field (The Void)'},
  map:[
    'RRRRRRRRRRRRRRRRRRR',
    'RU.P..............R',
    'R..C..E..R..C..E..R',
    'R.................R',
    'R..C..R..E..C..R..R',
    'R.................R',
    'R..E..R..C..E..C..R',
    'R..............E..R',
    'R.................R',
    'RbRgR.............R',
    'RBRSR.............R',
    'RRRRRRRRRRRRRRRRRRR'
  ],
  enemies:[
    E('🧮','Guardian of Dimensions',66,'#4dd0e1',[
      {q:'For a linear map f:R⁵→R³ with rank f=3, what is dim Ker f?',c:['3','2','5'],a:1,exp:'Rank–nullity: dim Ker f+rank f=5. 5−3=2.'},
      {q:'Which condition is part of the definition of a linear map?',c:['f(x+y)=f(x)+f(y) and f(cx)=cf(x)','f(xy)=f(x)f(y)','f(x)≧0'],a:0,exp:'Preserving sums and scalar multiples ── linearity.'},
      {q:'What does rank f represent?',c:['the dimension of the kernel Ker f','the number of entries in the matrix','the dimension of the image Im f'],a:2,exp:'The number of dimensions the map keeps without crushing.'}
    ]),
    E('🔁','Spirit of Symmetry',70,'#9575cd',[
      {q:'Which is NOT one of the group axioms?',c:['associativity','commutativity (ab=ba)','existence of inverses'],a:1,exp:'Commutativity is not required. A commutative group is called an abelian group.'},
      {q:'What is the identity of the integer group (Z, +)?',c:['0','1','−1'],a:0,exp:'a+0=a. The identity for addition is 0.'},
      {q:'What is the order (number of elements) of the symmetric group S₃?',c:['3','9','6'],a:2,exp:'There are 3!=6 ways to arrange 3 things. The smallest non-commutative group.'}
    ]),
    E('🌀','Complex Vortex',74,'#4fc3f7',[
      {q:'What is the value of e^iπ?',c:['−1','1','i'],a:0,exp:'Put θ=π into Euler\'s formula e^iθ=cosθ+isinθ.'},
      {q:'Which equations do holomorphic functions satisfy?',c:['the wave equation','the Cauchy–Riemann equations','the heat equation'],a:1,exp:'u_x=v_y, u_y=−v_x. A translation of complex differentiability.'},
      {q:'What does multiplying by the imaginary number i do on the plane?',c:['rotate by 90°','translate','only scale up'],a:0,exp:'Multiplying by i = rotating 90° counterclockwise.'}
    ]),
    E('🎵','Singer of Frequencies',76,'#4db6ac',[
      {q:'A Fourier series breaks a function into a sum of what?',c:['sin and cos (pure waves)','polynomials','step functions'],a:0,exp:'Any periodic function can be written as a superposition of pure tones.'},
      {q:'What does the spectrum show?',c:['the maximum value of the function','the strength of each frequency component','how many times it can be differentiated'],a:1,exp:'A list of which pure tones, and how much of each, are included.'},
      {q:'The Fourier coefficients of a square wave, as the frequency increases…?',c:['stay constant','grow','decays like 1/n'],a:2,exp:'Corners make the decay slow. Smoothness and coefficient decay are two sides of the same coin.'}
    ]),
    E('🔢','Miner of Primes',78,'#ffb74d',[
      {q:'Fermat\'s little theorem: if p is prime and a is coprime to p, then?',c:['a^(p−1) ≡ 1 (mod p)','a^p ≡ 0 (mod p)','a ≡ p (mod a)'],a:0,exp:'Mod p, the (p−1)th power returns to 1.'},
      {q:'What is 17 mod 5?',c:['3','2','1'],a:1,exp:'17=5×3+2. The remainder is 2.'},
      {q:'What does the security of RSA rely on?',c:['the irrationality of π','the invertibility of matrices','the difficulty of factoring huge numbers'],a:2,exp:'Multiplying takes an instant; factoring takes astronomical time. That asymmetry.'}
    ]),
    E('🌐','Beast of Manifolds',82,'#81c784',[
      {q:'Which direction does grad f (the gradient) point?',c:['the direction in which f increases fastest','along the contour lines','always along the x-axis'],a:0,exp:'Perpendicular to the contour lines, pointing in the direction of greatest increase.'},
      {q:'What does Stokes\' theorem connect?',c:['derivatives and limits','the integral over a region and the integral over its boundary','matrices and determinants'],a:1,exp:'∫_M dω=∫_∂M ω. The boundary speaks for the inside.'},
      {q:'In which geometry are a coffee cup and a donut "the same shape"?',c:['topology','Euclidean geometry','analytic geometry'],a:0,exp:'Same number of holes means homeomorphic. Stretching is allowed, cutting is forbidden.'}
    ])
  ],
  cards:[
    {id:'dai-dim',e:'🧮',t:'Rank–Nullity Theorem',b:'For a linear map, "crushed dimensions + remaining dimensions = original dimension". dim Ker f + rank f = n. A theorem that measures the skeleton of space.',
      svg:F('dim Ker f + rank f','= n  (rank–nullity)')},
    {id:'dai-gun',e:'🔁',t:'What is a group?',b:'A set with "an operation, associativity, an identity, and inverses". What rotations and symmetry really are. Adding numbers and even ladder lotteries are groups.',
      svg:SVG('<polygon points="90,30 64,80 116,80" fill="rgba(179,157,219,.22)" stroke="#b39ddb" stroke-width="2"/><path d="M124,32 A60,60 0 0 1 150,86" fill="none" stroke="#ffe9a8" stroke-width="2"/><polygon points="150,86 142,76 154,75" fill="#ffe9a8"/><text x="120" y="110" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">rotate it and it fits perfectly = symmetry</text>')},
    {id:'dai-fukuso',e:'🌀',t:'Complex = rotation',b:'Multiplying by i rotates 90°. e^iθ=cosθ+isinθ. Complex numbers are numbers that express "rotation and scaling" on the plane.',
      svg:SVG('<line x1="20" y1="62" x2="184" y2="62" stroke="#5a6b85" stroke-width="1.5"/><line x1="100" y1="12" x2="100" y2="108" stroke="#5a6b85" stroke-width="1.5"/><line x1="100" y1="62" x2="150" y2="62" stroke="#67e8f9" stroke-width="2.5"/><line x1="100" y1="62" x2="100" y2="14" stroke="#ff8a9b" stroke-width="2.5"/><path d="M150,62 A50,50 0 0 0 100,12" fill="none" stroke="#ffe9a8" stroke-width="1.5" stroke-dasharray="3 2"/><text x="156" y="60" font-size="12" fill="#67e8f9">1</text><text x="104" y="22" font-size="12" fill="#ff8a9b">i</text><text x="138" y="38" font-size="11" fill="#ffe9a8">90°</text><text x="205" y="64" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">×i rotates</text>')},
    {id:'dai-fourier',e:'🎵',t:'Fourier = breaking down waves',b:'Any wave can be broken into a sum of pure sin and cos. Sound and images alike can be cut into frequencies with this technique.',
      svg:SVG('<path d="M20,38 C50,8 70,68 100,38 C130,8 150,68 180,38 C200,18 212,52 222,38" fill="none" stroke="#67e8f9" stroke-width="2.5"/><text x="120" y="72" text-anchor="middle" font-size="15" fill="#ffe9a8">=</text><path d="M20,92 Q45,74 70,92 T120,92 T170,92 T220,92" fill="none" stroke="#9fb0d0" stroke-width="1.6"/><path d="M20,92 Q33,82 45,92 T70,92 T95,92 T120,92 T145,92 T170,92 T195,92 T220,92" fill="none" stroke="#b39ddb" stroke-width="1.4"/><text x="120" y="110" text-anchor="middle" font-size="11" fill="#cfe3ff" font-family="sans-serif">a superposition of pure waves</text>')},
    {id:'dai-mod',e:'🔢',t:'Congruence',b:'Clock math. 17 mod 5 = 2 (the remainder when divided by 5). RSA encryption is protected by how hard factoring is.',
      svg:SVG('<circle cx="70" cy="60" r="40" fill="none" stroke="#9fb0d0" stroke-width="2"/><circle cx="70" cy="20" r="3" fill="#9fb0d0"/><text x="70" y="14" text-anchor="middle" font-size="11" fill="#cfe3ff">0</text><circle cx="108" cy="48" r="3" fill="#9fb0d0"/><text x="120" y="46" font-size="11" fill="#cfe3ff">1</text><circle cx="94" cy="92" r="5" fill="#ffe9a8"/><text x="106" y="104" font-size="12" font-weight="bold" fill="#ffe9a8">2</text><circle cx="46" cy="92" r="3" fill="#9fb0d0"/><text x="32" y="104" font-size="11" fill="#cfe3ff">3</text><circle cx="32" cy="48" r="3" fill="#9fb0d0"/><text x="18" y="46" font-size="11" fill="#cfe3ff">4</text><line x1="70" y1="60" x2="94" y2="92" stroke="#ffe9a8" stroke-width="2"/><text x="186" y="56" text-anchor="middle" font-size="14" fill="#cfe3ff">17 mod 5</text><text x="186" y="80" text-anchor="middle" font-size="20" font-weight="bold" fill="#ffe9a8">= 2</text>')},
    {id:'dai-iso',e:'🌐',t:'Intuition for topology',b:'A geometry that looks only at "how things are connected". A coffee cup and a donut both have one hole, so they\'re the same shape. Stretching is OK, cutting is not.',
      svg:SVG('<ellipse cx="80" cy="60" rx="52" ry="34" fill="#b39ddb" stroke="#cfb8f0" stroke-width="2"/><ellipse cx="80" cy="60" rx="20" ry="12" fill="#241a4a" stroke="#cfb8f0" stroke-width="2"/><text x="80" y="64" text-anchor="middle" font-size="11" fill="#cfe3ff" font-family="sans-serif">hole</text><text x="190" y="54" text-anchor="middle" font-size="13" fill="#cfe3ff" font-family="sans-serif">one hole means</text><text x="190" y="78" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffe9a8" font-family="sans-serif">same shape</text>')}
  ]
},

/* ───────────────────────── 4階層下：大学院（暗黒の虚空・数式の漂う空間） ───────────────────────── */
in:{
  zone:'in', kids:false, border:'R', decor:'void',
  title:'The Void of Formulas', depth:'B4 ─ Graduate School Field',
  theme:{bg:'#04050d', floorA:'#0d1330', floorB:'#0a0f26', accent:'#c4b5fd', wall:'#241a4a'},
  boss:5, bossName:'The Wall of Research', bossEmoji:'🌌', bossPage:'/math-site/en/boss_5.html',
  requireBoss:4, requireBossPage:'/math-site/en/boss_4.html', requireBossName:'The Wall of Abstraction',
  up:{href:'/math-site/en/dai/map.html', name:'Back to the floating islands'},
  next:{href:'/math-site/en/mikaiketsu.html', name:'The World of Unsolved Problems'},
  map:[
    'RRRRRRRRRRRRRRRRRRR',
    'RU.P..............R',
    'R..C..E..R..C..E..R',
    'R.................R',
    'R..C..R..E..C..R..R',
    'R.................R',
    'R..E..R..C..E.....R',
    'R.................R',
    'R.................R',
    'RbRgR.............R',
    'RBRSR.............R',
    'RRRRRRRRRRRRRRRRRRR'
  ],
  enemies:[
    E('📜','Guardian of Proofs',84,'#b39ddb',[
      {q:'What is the first step in proving "every even number is divisible by 2"?',c:['write an even number as 2k','give three examples','try dividing'],a:0,exp:'Any even number can be written as 2k with an integer k ── generalizing is where a proof starts.'},
      {q:'If you find a single counterexample, the claim is…?',c:['known to be false','maybe still true','provable'],a:0,exp:'A universal statement falls with a single counterexample.'},
      {q:'What is proof by contradiction?',c:['deny the conclusion and derive a contradiction','collect examples','draw a diagram'],a:0,exp:'Assume "it doesn\'t hold" and derive a contradiction → so it holds.'}
    ]),
    E('🔮','Ghost of Conjectures',92,'#9575cd',[
      {q:'What is the difference between a "conjecture" and a "theorem"?',c:['whether it has been proved','difficulty','field'],a:0,exp:'Only once proved is it a theorem. Unproved, it\'s a conjecture.'},
      {q:'Why did Fermat\'s Last Theorem stay unsolved for so long?',c:['the proof was extremely hard','it was wrong','nobody knew about it'],a:0,exp:'It took over 350 years, until Wiles proved it in 1994.'},
      {q:'In math, what ultimately makes something "true"?',c:['having a proof','a majority vote','experiments'],a:0,exp:'Only proof guarantees truth.'}
    ]),
    E('♾️','Envoy of Infinity',100,'#7dd3fc',[
      {q:'Natural numbers and even numbers: how do their sizes compare?',c:['the same (one-to-one correspondence)','there are more natural numbers','they can\'t be compared'],a:0,exp:'n↔2n is a bijection. With infinity, "part = whole" can happen.'},
      {q:'What did Cantor\'s diagonal argument show?',c:['there are more real numbers than natural numbers','they\'re all the same','infinity doesn\'t exist'],a:0,exp:'The real numbers can\'t be counted ── uncountable infinity.'},
      {q:'What do we call a "countable infinity"?',c:['countably infinite','continuum','finite'],a:0,exp:'Countably infinite (cardinality aleph-null).'}
    ]),
    E('🌌','Shadow of the Unsolved',110,'#a78bfa',[
      {q:'What is the P≠NP problem about?',c:['how hard computation is (complexity)','shapes','probability'],a:0,exp:'Checking an answer is fast, but is finding one fast too? One of the Millennium Problems.'},
      {q:'What is the Riemann Hypothesis about?',c:['the distribution of primes','π','triangle'],a:0,exp:'The mystery of the zeta function\'s zeros and the arrangement of primes.'},
      {q:'What does it mean to take on an unsolved problem?',c:['searching for an answer nobody knows','memorizing','doing past exam papers'],a:0,exp:'There\'s no guarantee of a right answer ── that is research.'}
    ])
  ],
  cards:[
    {id:'in-proof',e:'📜',t:'What is a proof?',b:'Showing "this is absolutely true" in a form anyone has to accept. Experiments and examples aren\'t enough. You build a bridge from assumptions to conclusion using logic alone.',
      svg:SVG('<rect x="18" y="44" width="60" height="34" rx="6" fill="rgba(179,157,219,.2)" stroke="#b39ddb" stroke-width="1.6"/><text x="48" y="65" text-anchor="middle" font-size="13" fill="#fff" font-family="sans-serif">assume</text><rect x="162" y="44" width="60" height="34" rx="6" fill="rgba(179,157,219,.2)" stroke="#b39ddb" stroke-width="1.6"/><text x="192" y="65" text-anchor="middle" font-size="13" fill="#fff" font-family="sans-serif">conclude</text><line x1="82" y1="61" x2="158" y2="61" stroke="#ffe9a8" stroke-width="2"/><polygon points="158,61 148,55 148,67" fill="#ffe9a8"/><text x="120" y="50" text-anchor="middle" font-size="12" fill="#ffe9a8" font-family="sans-serif">logic alone</text><text x="120" y="100" text-anchor="middle" font-size="11" fill="#9fb0d0" font-family="sans-serif">connect them by proof, not examples</text>')},
    {id:'in-counter',e:'⚡',t:'The power of a counterexample',b:'However many examples work, it\'s not a proof. But a single counterexample completely shatters a claim. What overturns "all" is "one".',
      svg:SVG('<g text-anchor="middle"><text x="40" y="66" font-size="30" fill="#7ec850">✓</text><text x="80" y="66" font-size="30" fill="#7ec850">✓</text><text x="120" y="66" font-size="30" fill="#7ec850">✓</text><text x="178" y="68" font-size="44" fill="#ff5a5a">✗</text></g><text x="120" y="100" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">many examples, toppled by one counterexample</text>')},
    {id:'in-inf',e:'♾️',t:'The secret of infinity',b:'In the world of infinity, intuition betrays you. Natural numbers and even numbers are "the same size". But the real numbers are "more". Even infinities come in different sizes.',
      svg:SVG('<text x="55" y="28" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">naturals</text><text x="185" y="28" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">evens</text><g font-size="15" fill="#fff"><text x="55" y="52" text-anchor="middle">1</text><text x="185" y="52" text-anchor="middle">2</text><text x="55" y="76" text-anchor="middle">2</text><text x="185" y="76" text-anchor="middle">4</text><text x="55" y="100" text-anchor="middle">3</text><text x="185" y="100" text-anchor="middle">6</text></g><g stroke="#ffe9a8" stroke-width="1.6"><line x1="72" y1="47" x2="166" y2="47"/><line x1="72" y1="71" x2="166" y2="71"/><line x1="72" y1="95" x2="166" y2="95"/></g><g fill="#ffe9a8"><polygon points="168,47 158,42 158,52"/><polygon points="168,71 158,66 158,76"/><polygon points="168,95 158,90 158,100"/></g>')},
    {id:'in-conj',e:'🔮',t:'Conjectures and theorems',b:'"Probably true" is a conjecture; "proved" is a theorem. Fermat\'s Last Theorem was a conjecture for 350 years. The moment it\'s proved, the world changes.',
      svg:SVG('<rect x="16" y="44" width="64" height="34" rx="6" fill="rgba(149,117,205,.22)" stroke="#9575cd" stroke-width="1.6"/><text x="48" y="65" text-anchor="middle" font-size="13" fill="#fff" font-family="sans-serif">conjecture</text><rect x="160" y="44" width="64" height="34" rx="6" fill="rgba(232,201,107,.2)" stroke="#e8c96b" stroke-width="1.6"/><text x="192" y="65" text-anchor="middle" font-size="13" fill="#ffe9a8" font-family="sans-serif">theorem</text><line x1="84" y1="61" x2="156" y2="61" stroke="#ffe9a8" stroke-width="2"/><polygon points="156,61 146,55 146,67" fill="#ffe9a8"/><text x="120" y="50" text-anchor="middle" font-size="12" fill="#ffe9a8" font-family="sans-serif">proof</text><text x="120" y="98" text-anchor="middle" font-size="11" fill="#9fb0d0" font-family="sans-serif">once proved, the world changes</text>')},
    {id:'in-open',e:'🌌',t:'Unsolved problems',b:'Math still has questions no one has solved. The Riemann Hypothesis, P≠NP… Outside the textbook, at humanity\'s frontier. Maybe it\'s your turn to solve one.',
      svg:F('P ≟ NP','ζ(s)=0 ?   humanity\'s frontier')}
  ]
}
};

/* 図鑑用：全層のカードを順番に */
function dexOrder(){ return ['sho','chu','ko','dai','in']; }
function allCards(){
  var out=[];
  dexOrder().forEach(function(z){
    (LAYERS[z].cards||[]).forEach(function(c){ out.push({zone:z,card:c}); });
  });
  return out;
}

/* ════════════════════════════════════════════════════════
   戦闘クイズ・プール（ゾーン別）
   ・各ゾーンのプール ＝ 既存の敵クイズ ＋ 新規問題（数値ランダム生成を多数）
   ・要素は {q,c,a,exp} の静的オブジェクト、または それを返す関数（ジェネレータ）
   ・毎回プールからランダム選択／直前と同じ問題は出さない／数値問題は毎回再生成
   ════════════════════════════════════════════════════════ */
function qrand(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
function qnz(){ return qrand(2,9)*(Math.random()<0.5?1:-1); }
function qshuf(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t; } return a; }
function dec1(n){ return (Math.round(n*10)/10).toFixed(1); }
function qsg(n){ return n<0?'(−'+(-n)+')':'(+'+n+')'; }
function qdt(co,pw){ return co+(pw===0?'':(pw===1?'x':'x^'+pw)); }
/* 選択肢を組み立てる：正解＋ダミー（重複除去・シャッフル）。数値正解は3択に満たなければ自動補充 */
function Qn(text,correct,distractors,exp){
  var opts=[correct];
  (distractors||[]).forEach(function(d){ if(opts.indexOf(d)<0) opts.push(d); });
  if(typeof correct==='number'){
    var g=1;
    while(opts.length<3 && g<80){ var e=correct+(g%2?g:-g); if(e!==correct && opts.indexOf(e)<0) opts.push(e); g++; }
  }
  qshuf(opts);
  return { q:text, c:opts.map(String), a:opts.indexOf(correct), exp:exp };
}

var QUIZGEN={
  /* ── 小学生：たし・ひき・かけ・わり・分数・小数・時計・面積・単位換算 ── */
  sho:[
    function(){ var a=qrand(6,9),b=qrand(5,9),s=a+b; return Qn(a+' + '+b+' = ?',s,[s-1,s+2],'Add the ones first, then the tens. Making 10 is fast.'); },
    function(){ var a=qrand(13,49),b=qrand(13,49),s=a+b; return Qn(a+' + '+b+' = ?',s,[s-10,s+1],'Add tens with tens and ones with ones.'); },
    function(){ var m=qrand(11,18),n=qrand(3,9),s=m-n; return Qn(m+' − '+n+' = ?',s,[s+1,s-2],'Take away from 10, then add the rest.'); },
    function(){ var a=qrand(40,99),b=qrand(11,39),s=a-b; return Qn(a+' − '+b+' = ?',s,[s+10,s-1],'Subtract place by place.'); },
    function(){ var a=qrand(2,9),b=qrand(2,9),s=a*b; return Qn(a+' × '+b+' = ?',s,[s+a,s-b],'Remember your times tables. '); },
    function(){ var a=qrand(11,19),b=qrand(2,9),s=a*b; return Qn(a+' × '+b+' = ?',s,[s+b,s-a],'(10+□)×'+b+': split it up and calculate.'); },
    function(){ var b=qrand(2,9),ans=qrand(2,9),a=b*ans; return Qn(a+' ÷ '+b+' = ?',ans,[ans+1,ans-1],b+'×?='+a+' — think about it.'); },
    function(){ var b=qrand(3,9),ans=qrand(2,8),r=qrand(1,b-1),a=b*ans+r; return Qn(a+' ÷ '+b+': what is the remainder?',r,[r+1,(r+2)%b],a+'='+b+'×'+ans+'+'+r+'.'); },
    function(){ var d=qrand(4,8),p=qrand(1,d-2),q=qrand(1,d-p-1); return Qn(p+'/'+d+' + '+q+'/'+d+' = ?',(p+q)+'/'+d,[(p+q)+'/'+(2*d),(p+q+1)+'/'+d],'Keep the denominator, just add the numerators.'); },
    function(){ return Qn('Reduce 2/4.','1/2',['1/4','2/2'],'Divide top and bottom by 2.'); },
    function(){ var a=qrand(1,8),b=qrand(1,8),s=a+b; return Qn(dec1(a/10)+' + '+dec1(b/10)+' = ?',dec1(s/10),[dec1((s+1)/10),dec1((s-1)/10)],'0.1 × ('+a+'+'+b+') = '+dec1(s/10)+'.'); },
    function(){ var a=qrand(3,9),b=qrand(1,a-1),s=a-b; return Qn(dec1(a/10)+' − '+dec1(b/10)+' = ?',dec1(s/10),[dec1((s+1)/10),dec1((s+2)/10)],'0.1 × ('+a+'−'+b+') = '+dec1(s/10)+'.'); },
    function(){ var k=qrand(1,11),m=k*5; return Qn('The long hand of the clock points to '+k+'. How many minutes?',m,[m+5,k],'Each number on the long hand is 5 minutes. '+k+'×5='+m+' min.'); },
    function(){ var h=qrand(1,11),ms=[15,30,45],m=ms[qrand(0,2)]; return Qn(h+' o\'clock + '+m+' min = ?',h+' h '+m+' min',[(h===12?1:h+1)+' h '+m+' min',(h===1?12:h-1)+' h '+m+' min'],'The hour stays the same; only the minutes go forward '+m+' min.'); },
    function(){ var w=qrand(3,12),h=qrand(2,9),A=w*h; return Qn('Rectangle: height '+h+' cm, width '+w+' cm. What is its area? (cm²)',A,[2*(w+h),A+h],'height×width='+h+'×'+w+'='+A+'. Don\'t mix it up with the perimeter.'); },
    function(){ var s=qrand(2,12),A=s*s; return Qn('Square with side '+s+' cm. What is its area? (cm²)',A,[4*s,2*s],'side×side='+s+'×'+s+'='+A+'.'); },
    function(){ var b=qrand(2,12),h=qrand(1,5)*2,A=b*h/2; return Qn('Triangle: base '+b+' cm, height '+h+' cm. What is its area? (cm²)',A,[b*h,A+b],'base×height÷2='+b+'×'+h+'÷2='+A+'. Don\'t forget ÷2.'); },
    function(){ var x=qrand(2,20); return Qn(x+' cm is how many mm?',x*10,[x*100,x+10],'1cm=10mm. '); },
    function(){ var x=qrand(2,9); return Qn(x+' m is how many cm?',x*100,[x*10,x*1000],'1m=100cm.'); },
    function(){ var x=qrand(2,9); return Qn(x+' kg is how many g?',x*1000,[x*100,x*10],'1kg=1000g.'); },
    function(){ var x=qrand(2,9); return Qn(x+' L is how many mL?',x*1000,[x*100,x*500],'1L=1000mL.'); },
    function(){ var x=qrand(2,6); return Qn(x+' hours is how many minutes?',x*60,[x*100,x*6],'1 hour = 60 min. '); }
  ],
  /* ── 1-1：たしざん・ひきざん ── */
  sho1:[
    function(){ var a=qrand(6,9),b=qrand(5,9),s=a+b; return Qn(a+' + '+b+' = ?',s,[s-1,s+2],'Making 10 is fast.'); },
    function(){ var a=qrand(13,49),b=qrand(13,49),s=a+b; return Qn(a+' + '+b+' = ?',s,[s-10,s+1],'Add the tens and the ones.'); },
    function(){ var a=qrand(120,480),b=qrand(120,480),s=a+b; return Qn(a+' + '+b+' = ?',s,[s-10,s+1],'3-digit addition. '); },
    function(){ var m=qrand(11,18),n=qrand(3,9),s=m-n; return Qn(m+' − '+n+' = ?',s,[s+1,s-2],'Take away from 10, then add the rest.'); },
    function(){ var a=qrand(40,99),b=qrand(11,39),s=a-b; return Qn(a+' − '+b+' = ?',s,[s+10,s-1],'Subtract place by place.'); },
    function(){ var x=qrand(6,29),b=qrand(11,49),s=x+b; return Qn('□ + '+b+' = '+s+'. What is □?',x,[x+1,s],'Subtraction undoes addition.'); }
  ],
  /* ── 1-2：かけざん・わりざん ── */
  sho2:[
    function(){ var a=qrand(2,9),b=qrand(2,9),s=a*b; return Qn(a+' × '+b+' = ?',s,[s+a,s-b],'Remember your times tables. '); },
    function(){ var a=qrand(11,19),b=qrand(2,9),s=a*b; return Qn(a+' × '+b+' = ?',s,[s+b,s-a],'(10+□)×'+b+': split it up and calculate.'); },
    function(){ var b=qrand(2,9),ans=qrand(2,9),a=b*ans; return Qn(a+' ÷ '+b+' = ?',ans,[ans+1,ans-1],b+'×?='+a+'.'); },
    function(){ var b=qrand(3,9),ans=qrand(2,8),r=qrand(1,b-1),a=b*ans+r; return Qn(a+' ÷ '+b+': what is the remainder?',r,[r+1,(r+2)%b],a+'='+b+'×'+ans+'+'+r+'.'); },
    function(){ var b=qrand(3,9),ans=qrand(2,8),r=qrand(1,b-1),a=b*ans+r; return Qn(a+' ÷ '+b+': what is the quotient?',ans,[ans+1,ans-1],a+'='+b+'×'+ans+'+'+r+'. The quotient is '+ans+'.'); },
    function(){ var a=qrand(2,9),b=qrand(2,9),c=qrand(2,5),p=a*b*c; return Qn(a+' × '+b+' × '+c+' = ?',p,[p+c,a*b+c],'Multiply left to right.'); }
  ],
  /* ── 1-3：分数・小数 ── */
  sho3:[
    function(){ var d=qrand(4,8),p=qrand(1,d-2),q=qrand(1,d-p-1); return Qn(p+'/'+d+' + '+q+'/'+d+' = ?',(p+q)+'/'+d,[(p+q)+'/'+(2*d),(p+q+1)+'/'+d],'Keep the denominator, just add the numerators.'); },
    function(){ var d=qrand(5,9),p=qrand(2,d-1),q=qrand(1,p-1); return Qn(p+'/'+d+' − '+q+'/'+d+' = ?',(p-q)+'/'+d,[(p-q)+'/'+(2*d),(p-q+1)+'/'+d],'Just subtract the numerators.'); },
    function(){ return Qn('Reduce 2/4.','1/2',['1/4','2/2'],'Divide top and bottom by 2.'); },
    function(){ var a=qrand(1,8),b=qrand(1,8),s=a+b; return Qn(dec1(a/10)+' + '+dec1(b/10)+' = ?',dec1(s/10),[dec1((s+1)/10),dec1((s-1)/10)],'0.1 × ('+a+'+'+b+').'); },
    function(){ var a=qrand(3,9),b=qrand(1,a-1),s=a-b; return Qn(dec1(a/10)+' − '+dec1(b/10)+' = ?',dec1(s/10),[dec1((s+1)/10),dec1((s+2)/10)],'0.1 × ('+a+'−'+b+').'); },
    function(){ var a=qrand(2,9),b=qrand(2,9),p=a*b; return Qn(dec1(a/10)+' × '+b+' = ?',dec1(p/10),[dec1(p/100),''+p],'0.'+a+'×'+b+'='+dec1(p/10)+'.'); }
  ],
  /* ── 1-4：図形・面積 ── */
  sho4:[
    function(){ var w=qrand(3,12),h=qrand(2,9),A=w*h; return Qn('Rectangle: height '+h+' cm, width '+w+' cm. What is its area? (cm²)',A,[2*(w+h),A+h],'height×width='+A+'.'); },
    function(){ var s=qrand(2,12),A=s*s; return Qn('Square with side '+s+' cm. What is its area? (cm²)',A,[4*s,2*s],'side×side='+A+'.'); },
    function(){ var b=qrand(2,12),h=qrand(1,5)*2,A=b*h/2; return Qn('Triangle: base '+b+' cm, height '+h+' cm. What is its area? (cm²)',A,[b*h,A+b],'base×height÷2='+A+'.'); },
    function(){ var w=qrand(3,12),h=qrand(2,9),P=2*(w+h); return Qn('Rectangle: height '+h+' cm, width '+w+' cm. What is its perimeter? (cm)',P,[w*h,w+h],'(height+width)×2='+P+'.'); },
    function(){ var s=qrand(2,12),P=4*s; return Qn('Square with side '+s+' cm. What is its perimeter? (cm)',P,[s*s,2*s],'side×4='+P+'.'); }
  ],
  /* ── 1-5：時計・単位 ── */
  sho5:[
    function(){ var k=qrand(1,11),m=k*5; return Qn('The long hand of the clock points to '+k+'. How many minutes?',m,[m+5,k],'Each number on the long hand is 5 minutes. '); },
    function(){ var h=qrand(1,11),ms=[15,30,45],m=ms[qrand(0,2)]; return Qn(h+' o\'clock + '+m+' min = ?',h+' h '+m+' min',[(h===12?1:h+1)+' h '+m+' min',(h===1?12:h-1)+' h '+m+' min'],'The hour stays the same; only the minutes go forward.'); },
    function(){ var x=qrand(2,20); return Qn(x+' cm is how many mm?',x*10,[x*100,x+10],'1cm=10mm. '); },
    function(){ var x=qrand(2,9); return Qn(x+' m is how many cm?',x*100,[x*10,x*1000],'1m=100cm.'); },
    function(){ var x=qrand(2,9); return Qn(x+' kg is how many g?',x*1000,[x*100,x*10],'1kg=1000g.'); },
    function(){ var x=qrand(2,9); return Qn(x+' L is how many mL?',x*1000,[x*100,x*500],'1L=1000mL.'); },
    function(){ var x=qrand(2,6); return Qn(x+' hours is how many minutes?',x*60,[x*100,x*6],'1 hour = 60 min. '); }
  ],
  /* ── 1-6：小学生 総まとめ（混合） ── */
  sho6:[
    function(){ var a=qrand(120,680),b=qrand(120,680),s=a+b; return Qn(a+' + '+b+' = ?',s,[s-10,s+1],'3-digit addition. '); },
    function(){ var a=qrand(400,990),b=qrand(120,390),s=a-b; return Qn(a+' − '+b+' = ?',s,[s+10,s-1],'3-digit subtraction. '); },
    function(){ var a=qrand(11,19),b=qrand(2,9),s=a*b; return Qn(a+' × '+b+' = ?',s,[s+b,s-a],'(10+□)×'+b+'.'); },
    function(){ var b=qrand(3,9),ans=qrand(2,8),r=qrand(1,b-1),a=b*ans+r; return Qn(a+' ÷ '+b+': what is the remainder?',r,[r+1,(r+2)%b],a+'='+b+'×'+ans+'+'+r+'.'); },
    function(){ var d=qrand(4,8),p=qrand(1,d-2),q=qrand(1,d-p-1); return Qn(p+'/'+d+' + '+q+'/'+d+' = ?',(p+q)+'/'+d,[(p+q)+'/'+(2*d),(p+q+1)+'/'+d],'Just add the numerators.'); },
    function(){ var a=qrand(1,8),b=qrand(1,8),s=a+b; return Qn(dec1(a/10)+' + '+dec1(b/10)+' = ?',dec1(s/10),[dec1((s+1)/10),dec1((s-1)/10)],'0.1 × ('+a+'+'+b+').'); },
    function(){ var b=qrand(2,12),h=qrand(1,5)*2,A=b*h/2; return Qn('Triangle: base '+b+' cm, height '+h+' cm. What is its area? (cm²)',A,[b*h,A+b],'base×height÷2='+A+'.'); },
    function(){ var w=qrand(3,12),h=qrand(2,9),A=w*h; return Qn('Rectangle: height '+h+' cm, width '+w+' cm. What is its area? (cm²)',A,[2*(w+h),A+h],'height×width='+A+'.'); },
    function(){ var x=qrand(2,6); return Qn(x+' hours is how many minutes?',x*60,[x*100,x*6],'1 hour = 60 min. '); },
    function(){ var x=qrand(2,9); return Qn(x+' kg is how many g?',x*1000,[x*100,x*10],'1kg=1000g.'); }
  ],
  /* ── 中学生：正負の数・文字式・一次方程式・比例反比例・平行と合同・確率 ── */
  chu:[
    function(){ var a=qrand(-9,9),b=qrand(-9,9),s=a+b; return Qn(qsg(a)+' + '+qsg(b)+' = ?',s,[a-b,-(a+b)],'Watch the signs and think on the number line.'); },
    function(){ var a=qrand(-9,9),b=qrand(-9,9),s=a-b; return Qn(qsg(a)+' − '+qsg(b)+' = ?',s,[a+b,-(a-b)],'Flip the sign of the number you subtract, then add.'); },
    function(){ var a=qnz(),b=qnz(),p=a*b; return Qn(qsg(a)+' × '+qsg(b)+' = ?',p,[-p,a+b],'Same signs give +, different signs give −.'); },
    function(){ var m=qrand(2,6),n=qrand(2,6); if(m===2&&n===2)n=3; return Qn(m+'x + '+n+'x = ?',(m+n)+'x',[(m*n)+'x',(m+n)+'x²'],'For like terms, add the coefficients. It doesn\'t become x².'); },
    function(){ var m=qrand(5,9),n=qrand(1,m-1); return Qn(m+'x − '+n+'x = ?',(m-n)+'x',[(m+n)+'x',m+'x'],'Subtract the coefficients: '+m+'−'+n+'.'); },
    function(){ var c1=qrand(2,5),c0=qrand(1,9),x=qrand(2,6),v=c1*x+c0; return Qn('x='+x+', '+c1+'x + '+c0+' = ?',v,[c1*x,c1+x+c0],c1+'×'+x+'+'+c0+'='+v+'.'); },
    function(){ var a=qrand(1,9),x=qrand(1,12),b=x+a; return Qn('x + '+a+' = '+b+'. What is x?',x,[b+a,a-b],'Subtract '+a+' from both sides.'); },
    function(){ var a=qrand(2,9),x=qrand(2,9),b=a*x; return Qn(a+'x = '+b+'. What is x?',x,[b-a,b+a],'Divide both sides by '+a+'. '); },
    function(){ var a=qrand(2,5),x=qrand(2,8),b=qrand(1,9),c=a*x+b; return Qn(a+'x + '+b+' = '+c+'. What is x?',x,[c-b,x+1],'First subtract '+b+' (move it over): '+a+'x='+(c-b)+'.'); },
    function(){ var k=qrand(2,5),x1=qrand(2,4),y1=k*x1,x2=qrand(5,8),y2=k*x2; return Qn('y is proportional to x. When x='+x1+', y='+y1+'. When x='+x2+', what is y?',y2,[y1+x2,k+x2],'Constant of proportionality k='+k+', y='+k+'x. '); },
    function(){ var ks=[12,24,36,48],k=ks[qrand(0,3)],ds=[],i; for(i=2;i<=12;i++) if(k%i===0) ds.push(i); qshuf(ds); var x1=ds[0],x2=ds[1]; return Qn('y is inversely proportional to x. When x='+x1+', y='+(k/x1)+'. When x='+x2+', what is y?',k/x2,[k-x2,k/x1],'Inverse proportion: xy = constant. k='+k+', y='+k+'/x.'); },
    function(){ var t=qrand(1,6); return Qn('With one die, what is the probability of rolling a '+t+'?','1/6',['1/3','1/2'],'1 out of 6 outcomes.'); },
    function(){ return Qn('With one die, what is the probability of rolling an even number?','1/2',['1/3','2/3'],'2, 4, 6: 3 outcomes = 3/6 = 1/2.'); },
    function(){ return Qn('Toss 2 coins. What is the probability both are heads?','1/4',['1/2','1/3'],'HH, HT, TH, TT: 1 out of 4 outcomes.'); },
    function(){ var n=qrand(4,8),w=qrand(1,n-2); return Qn(n+' lottery tickets, '+w+' are winners. Draw 1: what is the probability of winning?',w+'/'+n,[n+'/'+w,w+'/'+(n-w)],'Winners '+w+' ÷ total '+n+'.'); },
    function(){ return Qn('What is the sum of the 3 interior angles of a triangle?','180°',['360°','90°'],'180° for any triangle.'); },
    function(){ return Qn('What is the sum of the 4 interior angles of a quadrilateral?','360°',['180°','720°'],'A diagonal splits it into 2 triangles: 180°×2.'); },
    function(){ return Qn('When two lines cross, the vertical angles are…?','equal',['add up to 90°','add up to 180°'],'Opposite angles are always equal.'); },
    function(){ return Qn('When a line crosses two parallel lines, the alternate angles are…?','equal',['add up to 180°','add up to 90°'],'If the lines are parallel, alternate and corresponding angles are equal.'); },
    function(){ return Qn('Which is NOT a congruence condition for triangles?','all three angles are equal',['all three sides are equal','two sides and the angle between them are equal'],'Only equal angles means "similar". The size isn\'t fixed.'); }
  ],
  /* ── 高校生：二次方程式・三角比・指数対数・数列・ベクトル・微分 ── */
  ko:[
    function(){ var r1=qrand(1,5),r2=qrand(r1,6),s=r1+r2,p=r1*r2; return Qn('x² − '+s+'x + '+p+' = 0. Solutions?','x='+r1+', '+r2,['x=−'+r1+', −'+r2,'x='+s+', '+p],'(x−'+r1+')(x−'+r2+')=0.'); },
    function(){ var x=qrand(2,9); return Qn('x² = '+(x*x)+': positive solution?',x,[x*x,x*2],'The positive number whose square is '+(x*x)+'.'); },
    function(){ return Qn('What is the value of sin30°?','1/2',['√3/2','1'],'The sides of a 30°-60°-90° triangle are in the ratio 1:√3:2.'); },
    function(){ return Qn('What is the value of cos60°?','1/2',['√3/2','1/√2'],'Adjacent/hypotenuse for 60° = 1/2.'); },
    function(){ return Qn('What is the value of tan45°?','1',['√3','1/√3'],'An isosceles right triangle: rise = run.'); },
    function(){ return Qn('sin²θ + cos²θ = ?','1',['0','2'],'It\'s the unit circle and the Pythagorean theorem itself.'); },
    function(){ var a=qrand(2,5),b=qrand(2,4); return Qn(a+'^'+b+' = ?',Math.pow(a,b),[a*b,Math.pow(a,b)+a],a+': '+b+' copies multiplied together.'); },
    function(){ var a=qrand(2,4),m=qrand(2,4),n=qrand(2,3); return Qn(a+'^'+m+' × '+a+'^'+n+' = '+a+'^?. What is ?',m+n,[m*n,m-n],'Add the exponents: '+m+'+'+n+'.'); },
    function(){ var b=qrand(2,3),e=qrand(2,4),arg=Math.pow(b,e); return Qn('log_'+b+' '+arg+' = ?',e,[arg,e+1],b+' to what power gives '+arg+'? → '+e+'.'); },
    function(){ var e=qrand(2,4); return Qn('log₁₀ '+Math.pow(10,e)+' = ?',e,[Math.pow(10,e)/10,e*10],'10 to the power '+e+'.'); },
    function(){ var a1=qrand(1,5),d=qrand(2,5),n=qrand(4,8),an=a1+(n-1)*d; return Qn('First term '+a1+', common difference '+d+': arithmetic sequence. Term #'+n+'?',an,[a1+n*d,a1*n],'a_n=a1+(n−1)d='+a1+'+'+(n-1)+'×'+d+'.'); },
    function(){ var a1=qrand(1,5),d=qrand(1,4),n=qrand(3,6),sum=n*(2*a1+(n-1)*d)/2; return Qn('First term '+a1+', common difference '+d+': sum of terms 1 to '+n+'?',sum,[sum+n,a1*n],'S=n(2a1+(n−1)d)/2.'); },
    function(){ var a1=qrand(1,3),r=qrand(2,3),n=qrand(3,5),an=a1*Math.pow(r,n-1); return Qn('First term '+a1+', common ratio '+r+': geometric sequence. Term #'+n+'?',an,[a1*r*n,a1+r*(n-1)],'a_n=a1·r^(n−1).'); },
    function(){ var a1=qrand(1,6),a2=qrand(1,6),b1=qrand(1,6),b2=qrand(1,6); if(a1===2&&b1===2&&a2===2&&b2===2)b2=3; return Qn('('+a1+', '+a2+') + ('+b1+', '+b2+') = ?','('+(a1+b1)+', '+(a2+b2)+')',['('+(a1*b1)+', '+(a2*b2)+')','('+(a1-b1)+', '+(a2-b2)+')'],'Add component by component.'); },
    function(){ var P=[[3,4,5],[6,8,10],[5,12,13],[8,15,17]][qrand(0,3)]; return Qn('Length of the vector ('+P[0]+', '+P[1]+')?',P[2],[P[0]+P[1],P[2]+1],'√('+P[0]+'²+'+P[1]+'²)=√'+(P[0]*P[0]+P[1]*P[1])+'='+P[2]+'.'); },
    function(){ var a1=qrand(1,5),a2=qrand(1,5),b1=qrand(1,5),b2=qrand(1,5),dot=a1*b1+a2*b2; return Qn('('+a1+', '+a2+')·('+b1+', '+b2+') = ?',dot,[a1*b1,(a1+a2)*(b1+b2)],'Dot product='+a1+'×'+b1+'+'+a2+'×'+b2+'='+dot+'.'); },
    function(){ var n=qrand(2,5); return Qn('(x^'+n+')′ = ?',qdt(n,n-1),[qdt(n-1,n),qdt(n,n)],'The derivative of x^n is n·x^(n−1).'); },
    function(){ var a=qrand(2,4),b=qrand(2,5); return Qn('('+a+'x² + '+b+'x)′ = ?',(2*a)+'x + '+b,[a+'x + '+b,(2*a)+'x'],'Differentiate each term: '+a+'x²→'+(2*a)+'x, '+b+'x→'+b+'.'); },
    function(){ var a=qrand(1,3),x0=qrand(1,4); return Qn('f(x)='+(a===1?'':a)+'x². At x='+x0+', what is the slope of the tangent?',2*a*x0,[a*x0,a*x0*x0],'f′(x)='+(2*a)+'x. Substitute x='+x0+'.'); }
  ],
  /* ── 大学生：群・環・体・線形代数・位相（○×／選択） ── */
  dai:[
    function(){ return Qn('Which is NOT one of the group axioms?','commutativity (ab=ba)',['associativity','existence of an identity'],'Commutativity is not required. A commutative group = an abelian group.'); },
    function(){ return Qn('How many identity elements does a group have?','exactly one',['at least two','sometimes none'],'The identity is unique.'); },
    function(){ return Qn('What is an abelian group?','a commutative group',['a finite group','a group without inverses'],'A group where ab=ba holds.'); },
    function(){ return Qn('What does NOT necessarily hold in a general ring?','commutativity of multiplication',['associativity of addition','the distributive law'],'Non-commutative rings exist.'); },
    function(){ return Qn('What characterizes a field?','every nonzero element has a multiplicative inverse',['it has zero divisors','it need not be commutative'],'A field = a commutative ring where you can divide by anything except 0.'); },
    function(){ return Qn('Are the integers Z a field? (True/False)','× (not a field)',['○ (a field)','can\'t say either way'],'The inverse of 2, 1/2, isn\'t in Z.'); },
    function(){ return Qn('Are the rationals Q a field? (True/False)','○ (a field)',['× (not a field)','not even a ring'],'You can divide by anything except 0.'); },
    function(){ return Qn('What is the order of the symmetric group S₃?',6,[3,9],'3!=6. The smallest non-commutative group.'); },
    function(){ var a=qrand(1,5),b=qrand(1,5),c=qrand(1,5),d=qrand(1,5),det=a*d-b*c; return Qn('Matrix [['+a+','+b+'],['+c+','+d+']]: what is its determinant?',det,[a*d+b*c,a*b-c*d],'ad − bc='+a+'×'+d+'−'+b+'×'+c+'='+det+'.'); },
    function(){ return Qn('What are the eigenvalues of the n×n identity matrix?','1 (multiplicity n)',['0','n'],'Ix=x, so the eigenvalue is 1.'); },
    function(){ return Qn('For a linear map f, rank f + dim Ker f = ?','the dimension n of the domain',['the dimension m of the image','m+n'],'The rank–nullity theorem.'); },
    function(){ return Qn('A square matrix is invertible (has an inverse) ⇔ ?','determinant ≠ 0',['determinant = 0','it is symmetric'],'det≠0 and invertible are equivalent.'); },
    function(){ return Qn('In n-dimensional space, what is the most linearly independent vectors you can have?','n',['n+1','infinitely many'],'Number of basis vectors = dimension.'); },
    function(){ return Qn('In a topological space, a union of (any number of) open sets is…?','open',['closed','unknown in general'],'Axiom of topology: unions are always open.'); },
    function(){ return Qn('A finite intersection of open sets is…?','open',['closed','only the empty set'],'Finite intersections are open (infinitely many can fail).'); },
    function(){ return Qn('Which is closest to the definition of compact?','every open cover has a finite subcover',['just bounded','connected'],'The existence of a finite subcover.'); },
    function(){ return Qn('Why are a coffee cup and a donut homeomorphic?','same number of holes (one)',['same volume','same color'],'Topology classifies by the number of holes (genus).'); },
    function(){ return Qn('What is a Hausdorff space?','any two distinct points can be separated by disjoint open sets',['a compact space','a discrete space'],'The T₂ separation axiom.'); },
    function(){ return Qn('How are continuous maps characterized?','the preimage of an open set is always open',['always bijective','preserves distance'],'Preimages of open sets are open ⇔ continuous.'); }
  ]
};

/* ゾーンの問題プール（既存の敵クイズ ＋ 新規ジェネレータ） */
function quizPool(zone){
  var base=[];
  ((LAYERS[zone]&&LAYERS[zone].enemies)||[]).forEach(function(e){ (e.q||[]).forEach(function(qq){ base.push(qq); }); });
  return base.concat(QUIZGEN[zone]||[]);
}
/* ランダム出題器：直前と同じ問題は出さない・数値問題は毎回再生成 */
function quizPicker(zone){
  var pool=quizPool(zone);
  if(!pool.length) pool=quizPool('sho');
  var last=-1;
  return function(){
    var i=Math.floor(Math.random()*pool.length);
    if(pool.length>1){ var g=0; while(i===last&&g<8){ i=Math.floor(Math.random()*pool.length); g++; } }
    last=i;
    var it=pool[i];
    return (typeof it==='function')?it():it;
  };
}

/* ════════════════════════════════════════════════════════
   エンジン本体
   ════════════════════════════════════════════════════════ */
window.FieldMap=function(zoneId){
  var CFG=LAYERS[zoneId];
  if(!CFG){ document.body.innerHTML='<p style="color:#fff;padding:20px;">unknown zone: '+zoneId+'</p>'; return; }
  var KIDS=CFG.kids;
  var BLOCK={'#':1,'T':1,'R':1,'~':1,' ':1};
  var TILE=46;

  /* ── ボス扉の解錠条件：このフィールドで敵を一定数倒すと扉が開く ──
     撃破数は localStorage 'rpg_kills_<zone>' に保存。リセット時は rpg_ 一括削除でクリアされる。 */
  var KILLS_NEEDED=3;
  function killsKey(){ return 'rpg_kills_'+CFG.zone; }
  function zoneKills(){ try{ return parseInt(localStorage.getItem(killsKey())||'0',10)||0; }catch(e){ return 0; } }
  function addZoneKill(){ try{ localStorage.setItem(killsKey(),String(zoneKills()+1)); }catch(e){} }
  function killsLeft(){ return Math.max(0,KILLS_NEEDED-zoneKills()); }
  /* 撃破済みのボスはいつでも再戦可。未撃破なら規定数の撃破で解錠 */
  function bossUnlocked(){ return (window.RPG&&RPG.bossCleared(CFG.boss))||zoneKills()>=KILLS_NEEDED; }

  /* ── フィールド上の一時ヒント（封印の壁に近づいた時など） ── */
  var hintEl=null, hintUntil=0;
  function fieldHint(msg){
    var now=performance.now();
    if(now<hintUntil) return;           /* 連発防止 */
    hintUntil=now+1500;
    if(!hintEl){ hintEl=document.createElement('div'); hintEl.className='fm-hint'; document.body.appendChild(hintEl); }
    hintEl.textContent=msg;
    hintEl.classList.remove('show'); void hintEl.offsetWidth; hintEl.classList.add('show');
  }

  /* ── マップ整形：最大幅にパディングし、外周を border で囲う ── */
  var rows=CFG.map.slice();
  var W=0; rows.forEach(function(r){ if(r.length>W) W=r.length; });
  var grid=[];
  for(var y=0;y<rows.length;y++){
    var r=rows[y];
    while(r.length<W) r+=CFG.border;
    grid.push(r.split(''));
  }
  var H=grid.length;
  for(var x=0;x<W;x++){ grid[0][x]=CFG.border; grid[H-1][x]=CFG.border; }
  for(var yy=0;yy<H;yy++){ grid[yy][0]=CFG.border; grid[yy][W-1]=CFG.border; }

  /* ── 配置スキャン ── */
  var spawn={x:1,y:1}, enemies=[], chestTiles=[], enemyIdx=0, cardIdx=0;
  for(var ty=0;ty<H;ty++){
    for(var tx=0;tx<W;tx++){
      var ch=grid[ty][tx];
      if(ch==='P'){ spawn={x:tx,y:ty}; grid[ty][tx]='.'; }
      else if(ch==='E'){
        var def=CFG.enemies[enemyIdx%CFG.enemies.length]; enemyIdx++;
        enemies.push({def:def,emoji:def.emoji,name:def.name,color:def.color,
          px:(tx+0.5)*TILE, py:(ty+0.5)*TILE, hx:(tx+0.5)*TILE, hy:(ty+0.5)*TILE,
          dir:Math.random()*Math.PI*2, dirT:0, alive:true, cool:0, bob:Math.random()*6});
        grid[ty][tx]='.';
      }
      else if(ch==='C'){
        var card=CFG.cards[cardIdx]; cardIdx++;
        if(card){ chestTiles.push({tx:tx,ty:ty,card:card}); grid[ty][tx]='c'; }
        else grid[ty][tx]='.';
      }
    }
  }

  /* ── DOM/スタイル ── */
  injectCSS();
  document.body.innerHTML='';
  document.body.style.margin='0';
  var canvas=document.createElement('canvas');
  canvas.className='fm-canvas';
  document.body.appendChild(canvas);
  var ctx=canvas.getContext('2d');

  buildHUD();
  var dpad=buildDpad();

  /* ── 入力 ── */
  var keys={u:false,d:false,l:false,r:false};
  var mode='field'; /* field | battle | menu | gate */
  function setKey(e,v){
    var k=e.key;
    if(k==='ArrowUp'||k==='w'||k==='W'){ keys.u=v; e.preventDefault(); }
    else if(k==='ArrowDown'||k==='s'||k==='S'){ keys.d=v; e.preventDefault(); }
    else if(k==='ArrowLeft'||k==='a'||k==='A'){ keys.l=v; e.preventDefault(); }
    else if(k==='ArrowRight'||k==='d'||k==='D'){ keys.r=v; e.preventDefault(); }
  }
  window.addEventListener('keydown',function(e){ if(mode==='field') setKey(e,true); });
  window.addEventListener('keyup',function(e){ setKey(e,false); });

  /* ── プレイヤー ──
     通常入場は P（左上）スポーン。ボス撃破後の復帰（?from=boss）だけは、
     ボス／階段エリアの入口付近（左下＝階段のすぐ上）にスポーンさせ、
     そのまま開いた階段へ歩いて行けるようにする。 */
  (function(){
    if(location.search.indexOf('from=boss')<0) return;
    var sx=-1, sy=-1, x, y;
    for(y=0;y<H&&sy<0;y++) for(x=0;x<W;x++){ if(grid[y][x]==='S'){ sx=x; sy=y; break; } }
    if(sx<0) return;
    /* 階段Sの上（フィールド側）の通行可能（床）マスを優先的に探す */
    var cands=[[sx,sy-2],[sx,sy-3],[sx-1,sy-2],[sx+1,sy-2],[sx,sy-4]];
    for(var i=0;i<cands.length;i++){ var cx=cands[i][0], cy=cands[i][1];
      if(cy>=0&&cx>=0&&cy<H&&cx<W&&grid[cy][cx]==='.'){ spawn={x:cx,y:cy}; break; }
    }
    /* 再読み込み時は通常スポーンに戻るよう URL を掃除 */
    try{ if(window.history&&history.replaceState) history.replaceState(null,'',location.pathname); }catch(e){}
  })();
  var player={px:(spawn.x+0.5)*TILE, py:(spawn.y+0.5)*TILE, dir:0};
  var cam={x:0,y:0};
  var lastSpecial=null; /* "tx,ty" 直近に発動した特殊タイル */
  var battlePick=quizPicker(zoneId); /* このゾーンの出題器（直前と同じ問題は出さない） */

  /* ── 衝突判定 ── */
  function solidAt(wx,wy){
    var tx=Math.floor(wx/TILE), ty=Math.floor(wy/TILE);
    if(tx<0||ty<0||tx>=W||ty>=H) return true;
    var ch=grid[ty][tx];
    if(ch==='b') return !bossUnlocked();                            /* ボス封印壁：このフィールドで3体撃破すると消える */
    if(ch==='g') return !(window.RPG&&RPG.bossCleared(CFG.boss));   /* 階段封印壁：ボス撃破で消える */
    return !!BLOCK[ch];
  }
  var RAD=TILE*0.30;
  function canBe(px,py){
    return !solidAt(px-RAD,py-RAD)&&!solidAt(px+RAD,py-RAD)&&
           !solidAt(px-RAD,py+RAD)&&!solidAt(px+RAD,py+RAD);
  }

  /* ── ゲート（前ゾーンのボス未撃破時の封印） ── */
  function maybeGate(){
    if(!CFG.requireBoss) return false;
    if(window.RPG&&RPG.bossCleared(CFG.requireBoss)) return false;
    if(sessionStorage.getItem('rpg_gate_skip_'+CFG.zone)==='1') return false;
    showGate();
    return true;
  }

  /* ── ループ ── */
  var lastT=performance.now();
  function loop(now){
    var dt=Math.min(40,now-lastT)/1000; lastT=now;
    if(mode==='field') update(dt);
    render(now/1000);
    requestAnimationFrame(loop);
  }

  function update(dt){
    /* プレイヤー移動 */
    var vx=(keys.r?1:0)-(keys.l?1:0);
    var vy=(keys.d?1:0)-(keys.u?1:0);
    if(vx||vy){
      var len=Math.hypot(vx,vy)||1;
      var sp=190*dt;
      var nx=player.px+vx/len*sp, ny=player.py+vy/len*sp;
      if(canBe(nx,player.py)) player.px=nx;
      if(canBe(player.px,ny)) player.py=ny;
      if(Math.abs(vx)>Math.abs(vy)) player.dir=vx>0?0:Math.PI; else player.dir=vy>0?Math.PI/2:-Math.PI/2;
    }
    /* 敵の徘徊 */
    enemies.forEach(function(en){
      if(!en.alive) return;
      if(en.cool>0) en.cool-=dt;
      en.dirT-=dt;
      if(en.dirT<=0){ en.dir=Math.random()*Math.PI*2; en.dirT=0.8+Math.random()*1.4; }
      var sp=42*dt;
      var nx=en.px+Math.cos(en.dir)*sp, ny=en.py+Math.sin(en.dir)*sp;
      /* ホームから離れすぎない */
      if(Math.hypot(nx-en.hx,ny-en.hy)>TILE*2.6){ en.dir=Math.atan2(en.hy-en.py,en.hx-en.px); }
      else{
        if(canBe(nx,en.py)) en.px=nx; else en.dir=Math.PI-en.dir;
        if(canBe(en.px,ny)) en.py=ny; else en.dir=-en.dir;
      }
      /* 接触で戦闘 */
      if(en.cool<=0&&Math.hypot(en.px-player.px,en.py-player.py)<TILE*0.66){
        startBattle(en);
      }
    });
    /* 特殊タイル判定 */
    var ptx=Math.floor(player.px/TILE), pty=Math.floor(player.py/TILE);
    var key=ptx+','+pty, c=grid[pty]&&grid[pty][ptx];
    if(c==='c'){
      var ct=findChest(ptx,pty);
      if(ct&&!hasCard(ct.card.id)){ pickupCard(ct); }
    }
    if(c==='S'||c==='U'||c==='B'){
      if(lastSpecial!==key){ lastSpecial=key; handleSpecial(c); }
    } else if(c!=='c'){
      if(lastSpecial){
        var sp2=lastSpecial.split(','); var lx=+sp2[0], ly=+sp2[1];
        if(lx!==ptx||ly!==pty) lastSpecial=null;
      }
    }
    /* 封印の壁へ向かって進もうとしたら、解錠条件をヒント表示する */
    if(vx||vy){
      var ah=[];
      if(vx>0) ah.push([ptx+1,pty]); else if(vx<0) ah.push([ptx-1,pty]);
      if(vy>0) ah.push([ptx,pty+1]); else if(vy<0) ah.push([ptx,pty-1]);
      for(var ai=0;ai<ah.length;ai++){
        var ac=grid[ah[ai][1]]&&grid[ah[ai][1]][ah[ai][0]];
        if(ac==='b'&&!bossUnlocked()){ fieldHint((KIDS?'':'')+killsLeft()+(KIDS?' more to beat!':' more to defeat!')); break; }
        if(ac==='g'&&!(window.RPG&&RPG.bossCleared(CFG.boss))){ fieldHint(KIDS?'Beat the boss to open it!':'Defeat the boss to open the way!'); break; }
      }
    }
  }
  function findChest(tx,ty){
    for(var i=0;i<chestTiles.length;i++){ if(chestTiles[i].tx===tx&&chestTiles[i].ty===ty) return chestTiles[i]; }
    return null;
  }

  function handleSpecial(c){
    if(c==='B'){ confirmBoss(); }
    else if(c==='U'){ travel(CFG.up.href,CFG.up.name,false); }
    else if(c==='S'){
      var unlocked=window.RPG&&RPG.bossCleared(CFG.boss);
      if(unlocked) travel(CFG.next.href,CFG.next.name,true);
      else lockedStairs();
    }
  }

  /* ════ 描画 ════ */
  function resize(){
    var dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.floor(window.innerWidth*dpr);
    canvas.height=Math.floor(window.innerHeight*dpr);
    canvas.style.width=window.innerWidth+'px';
    canvas.style.height=window.innerHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize',resize);
  resize();

  function render(t){
    var VW=window.innerWidth, VH=window.innerHeight;
    var mapW=W*TILE, mapH=H*TILE;
    cam.x=(mapW<=VW)?(mapW-VW)/2:clamp(player.px-VW/2,0,mapW-VW);
    cam.y=(mapH<=VH)?(mapH-VH)/2:clamp(player.py-VH/2,0,mapH-VH);

    /* 背景 */
    ctx.fillStyle=CFG.theme.bg;
    ctx.fillRect(0,0,VW,VH);
    drawBackdrop(t,VW,VH);

    /* タイル */
    var x0=Math.max(0,Math.floor(cam.x/TILE)), x1=Math.min(W-1,Math.floor((cam.x+VW)/TILE));
    var y0=Math.max(0,Math.floor(cam.y/TILE)), y1=Math.min(H-1,Math.floor((cam.y+VH)/TILE));
    for(var ty=y0;ty<=y1;ty++) for(var tx=x0;tx<=x1;tx++){
      drawTile(grid[ty][tx],tx,ty,tx*TILE-cam.x,ty*TILE-cam.y,t);
    }
    /* 敵 */
    enemies.forEach(function(en){ if(en.alive) drawEnemy(en,t); });
    /* プレイヤー */
    drawPlayer(t);
    /* 前景（霧・闇・パーティクル） */
    drawForeground(t,VW,VH);
  }

  function drawTile(ch,tx,ty,sx,sy,t){
    var th=CFG.theme;
    var even=((tx+ty)&1)===0;
    if(!BLOCK[ch]||ch==='c'){
      /* 床 */
      ctx.fillStyle=even?th.floorA:th.floorB;
      ctx.fillRect(sx,sy,TILE,TILE);
      drawFloorDecor(tx,ty,sx,sy,t);
    }
    if(ch==='S') drawStairs(sx,sy,t,true);
    else if(ch==='U') drawStairs(sx,sy,t,false);
    else if(ch==='B') drawBossDoor(sx,sy,t);
    else if(ch==='b'){ if(!bossUnlocked()) drawSeal(sx,sy,t,false); }
    else if(ch==='g'){ if(!(window.RPG&&RPG.bossCleared(CFG.boss))) drawSeal(sx,sy,t,true); }
    else if(ch==='c'){ var ct=findChest(tx,ty); drawChest(sx,sy,ct&&hasCard(ct.card.id),t); }
    else if(BLOCK[ch]) drawBlock(ch,tx,ty,sx,sy,t);
  }

  /* 床の装飾（ゾーン別・タイル位置で決定論的に） */
  function drawFloorDecor(tx,ty,sx,sy,t){
    var h=(tx*73856093^ty*19349663)>>>0;
    var d=CFG.decor;
    if(d==='forest'){
      if(h%7===0){ ctx.fillStyle='rgba(255,255,255,.55)';
        var fx=sx+8+(h%20), fy=sy+10+((h>>3)%20);
        for(var i=0;i<5;i++){ ctx.beginPath(); ctx.arc(fx+Math.cos(i*1.25)*4,fy+Math.sin(i*1.25)*4,2.1,0,7); ctx.fill(); }
        ctx.fillStyle=(h%2)?'#ffd54f':'#ff8a9b'; ctx.beginPath(); ctx.arc(fx,fy,2.4,0,7); ctx.fill();
      } else if(h%5===0){ ctx.fillStyle='rgba(0,0,0,.10)'; ctx.fillRect(sx+6+(h%24),sy+18+((h>>2)%18),5,3); }
    } else if(d==='cave'){
      if(h%6===0){ ctx.strokeStyle='rgba(0,0,0,.28)'; ctx.lineWidth=1.4; ctx.beginPath();
        ctx.moveTo(sx+6+(h%20),sy+8); ctx.lineTo(sx+10+(h%18),sy+30); ctx.stroke(); }
    } else if(d==='ruins'){
      ctx.strokeStyle='rgba(0,0,0,.22)'; ctx.lineWidth=1; ctx.strokeRect(sx+2.5,sy+2.5,TILE-5,TILE-5);
      if(h%5===0){ ctx.fillStyle='rgba(120,160,120,.16)'; ctx.fillRect(sx+5+(h%22),sy+6+((h>>2)%22),9,6); }
    } else if(d==='island'){
      ctx.strokeStyle='rgba(103,232,249,.16)'; ctx.lineWidth=1; ctx.strokeRect(sx+1.5,sy+1.5,TILE-3,TILE-3);
      if(h%9===0){ ctx.fillStyle='rgba(103,232,249,.30)'; ctx.beginPath();
        ctx.arc(sx+TILE/2,sy+TILE/2,2,0,7); ctx.fill(); }
    } else if(d==='void'){
      if(h%11===0){ ctx.fillStyle='rgba(196,181,253,.20)'; ctx.beginPath(); ctx.arc(sx+10+(h%24),sy+10+((h>>2)%24),1.4,0,7); ctx.fill(); }
    }
  }

  /* 通行不可ブロック（ゾーン別） */
  function drawBlock(ch,tx,ty,sx,sy,t){
    var cx=sx+TILE/2, cy=sy+TILE/2, d=CFG.decor;
    if(d==='forest'){
      ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(cx,sy+TILE-6,15,5,0,0,7); ctx.fill();
      ctx.fillStyle='#6b4226'; ctx.fillRect(cx-4,cy,8,TILE/2-4);
      ctx.fillStyle='#2e7d32'; circle(cx,cy-2,16); ctx.fillStyle='#388e3c'; circle(cx-9,cy+4,12); circle(cx+9,cy+4,12);
      ctx.fillStyle='rgba(255,255,255,.12)'; circle(cx-5,cy-8,6);
    } else if(d==='cave'){
      ctx.fillStyle='rgba(0,0,0,.30)'; ctx.beginPath(); ctx.ellipse(cx,sy+TILE-6,16,5,0,0,7); ctx.fill();
      ctx.fillStyle='#4a4456'; roundPath(sx+5,sy+8,TILE-10,TILE-12,7); ctx.fill();
      ctx.fillStyle='#5a5468'; roundPath(sx+9,sy+11,TILE-22,12,5); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(sx+12,sy+16); ctx.lineTo(sx+20,sy+34); ctx.stroke();
    } else if(d==='ruins'){
      ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(cx,sy+TILE-6,14,5,0,0,7); ctx.fill();
      ctx.fillStyle='#7b8493'; ctx.fillRect(cx-11,sy+6,22,TILE-12);
      ctx.fillStyle='#8d97a8'; ctx.fillRect(cx-13,sy+6,26,7);
      ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fillRect(cx-3,sy+14,6,TILE-20);
      ctx.fillStyle='rgba(120,160,120,.25)'; ctx.fillRect(cx-11,sy+TILE-16,22,5);
    } else if(d==='island'){
      var bob=Math.sin(t*1.3+tx*0.7+ty)*3;
      ctx.save(); ctx.translate(0,bob);
      ctx.fillStyle='rgba(103,232,249,.10)'; ctx.beginPath(); ctx.ellipse(cx,sy+TILE-2,13,4,0,0,7); ctx.fill();
      ctx.shadowColor='rgba(103,232,249,.6)'; ctx.shadowBlur=14;
      ctx.fillStyle='#1f6f86'; diamond(cx,cy,14,20);
      ctx.fillStyle='#67e8f9'; diamond(cx,cy,8,13);
      ctx.restore();
    } else if(d==='void'){
      var pul=0.5+0.5*Math.sin(t*1.6+tx+ty);
      ctx.save(); ctx.shadowColor='rgba(167,139,250,'+(0.4+0.4*pul)+')'; ctx.shadowBlur=18;
      ctx.fillStyle='#120a28'; circle(cx,cy,14);
      ctx.strokeStyle='rgba(167,139,250,'+(0.5+0.4*pul)+')'; ctx.lineWidth=2.2; ctx.beginPath(); ctx.arc(cx,cy,12,0,7); ctx.stroke();
      ctx.restore();
    } else { ctx.fillStyle=CFG.theme.wall; ctx.fillRect(sx+3,sy+3,TILE-6,TILE-6); }
  }

  function drawStairs(sx,sy,t,down){
    var locked=down&&!(window.RPG&&RPG.bossCleared(CFG.boss));
    ctx.fillStyle=down?'#1a1208':'#10131f';
    roundPath(sx+4,sy+4,TILE-8,TILE-8,6); ctx.fill();
    ctx.fillStyle=down?'#3a2e16':'#26304a';
    for(var i=0;i<4;i++){ ctx.fillRect(sx+7,sy+9+i*8,TILE-14-(down?i*3:-(i*3)),5); }
    ctx.fillStyle='rgba(255,255,255,.10)'; ctx.fillRect(sx+7,sy+9,TILE-14,2);
    /* 矢印 */
    ctx.font='900 16px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=down?CFG.theme.accent:'#9fb0d0';
    ctx.fillText(down?'▼':'▲',sx+TILE/2,sy+TILE/2+1);
    if(locked){
      var pul=0.6+0.4*Math.sin(t*4);
      ctx.save(); ctx.shadowColor='rgba(255,80,60,'+pul+')'; ctx.shadowBlur=10;
      ctx.font='20px sans-serif'; ctx.fillText('🔒',sx+TILE/2,sy+TILE/2);
      ctx.restore();
    } else if(down){
      /* ボス撃破後：奥の階段が光って次のフィールドへ */
      var gp=0.5+0.5*Math.sin(t*3);
      ctx.save(); ctx.shadowColor='rgba(255,220,120,'+gp+')'; ctx.shadowBlur=16;
      ctx.strokeStyle='rgba(255,225,140,'+(0.5+0.4*gp)+')'; ctx.lineWidth=2;
      roundPath(sx+4,sy+4,TILE-8,TILE-8,6); ctx.stroke();
      ctx.restore();
    }
  }
  /* ボスキャラを描く（鳥居の扉ではなく、各フィールドのボスの姿そのもの）
     封印中＝暗く沈み🔒＋撃破進捗 / 解錠＝発光して浮遊（近づくとボス戦） / 撃破済＝👑 */
  function drawBossDoor(sx,sy,t){
    var cleared=window.RPG&&RPG.bossCleared(CFG.boss);
    var open=cleared||bossUnlocked();
    var cx=sx+TILE/2, cy=sy+TILE/2+1;
    var pul=0.55+0.45*Math.sin(t*3);
    var bob=open?Math.sin(t*2.2)*3:0;
    /* 影 */
    ctx.fillStyle='rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(cx,sy+TILE-6,13,4,0,0,7); ctx.fill();
    if(open){
      /* 発光オーラ */
      ctx.save();
      var col=cleared?'rgba(232,201,107,':'rgba(255,150,60,';
      ctx.shadowColor=col+pul+')'; ctx.shadowBlur=22;
      var ag=ctx.createRadialGradient(cx,cy+bob,2,cx,cy+bob,19);
      ag.addColorStop(0,col+(0.55*pul)+')'); ag.addColorStop(1,col+'0)');
      ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(cx,cy+bob,19,0,7); ctx.fill();
      ctx.restore();
    }else{
      /* 封印の暗い台座 */
      ctx.save();
      ctx.fillStyle='rgba(18,16,26,.85)'; ctx.beginPath(); ctx.arc(cx,cy,16,0,7); ctx.fill();
      ctx.strokeStyle='rgba(90,100,130,'+(0.35+0.3*pul)+')'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy,15,0,7); ctx.stroke();
      ctx.restore();
    }
    /* ボスキャラ本体（各フィールド固有の絵）。封印中は暗く沈める */
    ctx.save();
    ctx.font='27px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    if(!open) ctx.globalAlpha=0.45;
    ctx.fillText(CFG.bossEmoji,cx,cy+bob);
    ctx.restore();
    ctx.textAlign='center'; ctx.textBaseline='middle';
    if(open){
      if(cleared){ ctx.font='13px sans-serif'; ctx.fillText('👑',cx,sy+8); }
    }else{
      ctx.save();
      ctx.font='15px sans-serif'; ctx.shadowColor='rgba(255,80,60,'+pul+')'; ctx.shadowBlur=8; ctx.fillStyle='#fff';
      ctx.fillText('🔒',cx,cy);
      ctx.restore();
      ctx.font='bold 10px sans-serif'; ctx.fillStyle='#aab3cd';
      ctx.fillText(zoneKills()+'/'+KILLS_NEEDED,cx,sy+TILE-6);
    }
  }
  /* 封印の壁（ボス前＝赤／階段前＝金）。解錠条件を満たすと drawTile 側で描かれず通行可になる */
  function drawSeal(sx,sy,t,isStairs){
    var pul=0.5+0.5*Math.sin(t*3);
    var rgb=isStairs?'210,175,90':'210,70,60';
    ctx.save();
    ctx.fillStyle='rgba(16,14,26,.92)';
    roundPath(sx+3,sy+3,TILE-6,TILE-6,5); ctx.fill();
    ctx.shadowColor='rgba('+rgb+','+pul+')'; ctx.shadowBlur=12;
    ctx.strokeStyle='rgba('+rgb+','+(0.55+0.4*pul)+')'; ctx.lineWidth=2.5;
    roundPath(sx+3,sy+3,TILE-6,TILE-6,5); ctx.stroke();
    /* 結界の格子 */
    ctx.globalAlpha=0.45+0.3*pul; ctx.lineWidth=1.4; ctx.beginPath();
    for(var i=1;i<3;i++){ var o=i*(TILE-6)/3;
      ctx.moveTo(sx+3,sy+3+o); ctx.lineTo(sx+TILE-3,sy+3+o);
      ctx.moveTo(sx+3+o,sy+3); ctx.lineTo(sx+3+o,sy+TILE-3); }
    ctx.stroke();
    ctx.restore();
    ctx.font='15px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🔒',sx+TILE/2,sy+TILE/2);
  }
  function drawChest(sx,sy,opened,t){
    var cx=sx+TILE/2, cy=sy+TILE/2;
    ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(cx,sy+TILE-7,13,4,0,0,7); ctx.fill();
    if(opened){
      ctx.globalAlpha=0.55;
      ctx.fillStyle='#6b5226'; roundPath(sx+11,sy+22,TILE-22,12,3); ctx.fill();
      ctx.fillStyle='#3a2e16'; ctx.fillRect(sx+11,sy+22,TILE-22,4);
      ctx.globalAlpha=1;
    } else {
      var pul=0.5+0.5*Math.sin(t*3);
      ctx.save(); ctx.shadowColor='rgba(255,220,120,'+pul+')'; ctx.shadowBlur=14;
      ctx.fillStyle='#8a6a2a'; roundPath(sx+10,sy+20,TILE-20,15,3); ctx.fill();
      ctx.fillStyle='#caa24a'; roundPath(sx+10,sy+13,TILE-20,9,4); ctx.fill();
      ctx.fillStyle='#ffe08a'; ctx.fillRect(cx-2,sy+18,4,9);
      ctx.restore();
      ctx.fillStyle='rgba(255,240,180,'+(0.4+0.4*pul)+')'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.fillText('✨',cx,sy+9);
    }
  }

  function drawEnemy(en,t){
    var sx=en.px-cam.x, sy=en.py-cam.y;
    var bob=Math.sin(t*3+en.bob)*3;
    ctx.fillStyle='rgba(0,0,0,.30)'; ctx.beginPath(); ctx.ellipse(sx,sy+16,14,5,0,0,7); ctx.fill();
    ctx.save();
    ctx.shadowColor=en.color; ctx.shadowBlur=12;
    ctx.font='30px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(en.emoji,sx,sy+bob);
    ctx.restore();
    /* 近づくと名前 */
    if(Math.hypot(en.px-player.px,en.py-player.py)<TILE*2.4){
      var label=en.name;
      ctx.font='700 11px "Noto Sans JP",sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      var tw=ctx.measureText(label).width+12;
      ctx.fillStyle='rgba(8,6,20,.85)'; roundPath(sx-tw/2,sy-30,tw,16,8); ctx.fill();
      ctx.strokeStyle=en.color; ctx.lineWidth=1; roundPath(sx-tw/2,sy-30,tw,16,8); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.fillText(label,sx,sy-21);
    }
  }

  function drawPlayer(t){
    var sx=player.px-cam.x, sy=player.py-cam.y;
    var moving=(keys.u||keys.d||keys.l||keys.r);
    var bob=Math.sin(t*5)*(moving?2.5:1.2);
    /* 影 */
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(sx,sy+17,13,5,0,0,7); ctx.fill();
    var id=heroId(), img=heroImage(id);
    if(img&&img.complete&&img.naturalWidth){
      /* 選択キャラのSVGをそのまま描画（選択画面と共通の絵） */
      var hw=42, hh=50;
      ctx.save();
      ctx.shadowColor=HEROES[id].color; ctx.shadowBlur=12;
      ctx.drawImage(img, sx-hw/2, sy+18-hh+bob, hw, hh);
      ctx.restore();
    } else {
      /* 画像読み込み前のフォールバック（レベル絵文字） */
      var emoji=(window.RPG?RPG.levelFor(RPG.getXP()).emoji:'🧒');
      ctx.save(); ctx.shadowColor=CFG.theme.accent; ctx.shadowBlur=14;
      ctx.fillStyle=CFG.theme.accent; ctx.beginPath(); ctx.ellipse(sx,sy+6+bob,12,13,0,0,7); ctx.fill(); ctx.restore();
      ctx.font='22px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(emoji,sx,sy-4+bob);
    }
    /* 向きインジケータ */
    ctx.fillStyle='#fff';
    var dx=Math.cos(player.dir)*15, dy=Math.sin(player.dir)*15;
    ctx.beginPath(); ctx.arc(sx+dx,sy+6+dy+bob,2.4,0,7); ctx.fill();
  }

  /* 背景演出（タイルの下） */
  var stars=[]; for(var s=0;s<70;s++) stars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.6+0.3,p:Math.random()*7});
  function drawBackdrop(t,VW,VH){
    var d=CFG.decor;
    if(d==='island'||d==='void'){
      for(var i=0;i<stars.length;i++){ var st=stars[i];
        var a=0.3+0.5*Math.abs(Math.sin(t*1.5+st.p));
        ctx.fillStyle=(d==='void'?'rgba(196,181,253,':'rgba(160,220,255,')+a+')';
        ctx.beginPath(); ctx.arc(st.x*VW,st.y*VH,st.r,0,7); ctx.fill();
      }
    }
  }

  /* 前景演出（タイルの上：霧・闇・数式・木漏れ日） */
  var formulas=['∫','∑','∂','π','√','∞','λ','θ','dx','e^{iπ}','∇','∀∃','lim','ℝ','dω'];
  var fStream=[]; for(var f=0;f<16;f++) fStream.push({x:Math.random(),y:Math.random(),v:0.01+Math.random()*0.03,txt:formulas[f%formulas.length],s:14+Math.random()*16});
  function drawForeground(t,VW,VH){
    var d=CFG.decor, sxp=player.px-cam.x, syp=player.py-cam.y;
    if(d==='forest'){
      var g=ctx.createRadialGradient(VW*0.5,VH*0.2,40,VW*0.5,VH*0.5,Math.max(VW,VH));
      g.addColorStop(0,'rgba(255,250,200,.10)'); g.addColorStop(1,'rgba(0,20,0,.30)');
      ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH);
    } else if(d==='cave'){
      var g2=ctx.createRadialGradient(sxp,syp,30,sxp,syp,260);
      g2.addColorStop(0,'rgba(0,0,0,0)'); g2.addColorStop(1,'rgba(0,0,0,.74)');
      ctx.fillStyle=g2; ctx.fillRect(0,0,VW,VH);
    } else if(d==='ruins'){
      for(var i=0;i<3;i++){
        var fy=((t*12+i*220)% (VH+200))-100;
        var g3=ctx.createLinearGradient(0,fy,0,fy+120); g3.addColorStop(0,'rgba(200,220,210,0)');
        g3.addColorStop(0.5,'rgba(200,220,210,.10)'); g3.addColorStop(1,'rgba(200,220,210,0)');
        ctx.fillStyle=g3; ctx.fillRect(0,fy,VW,120);
      }
      vignette(VW,VH,'rgba(10,18,24,.45)');
    } else if(d==='island'){
      vignette(VW,VH,'rgba(7,11,24,.5)');
    } else if(d==='void'){
      ctx.font='400 1px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      fStream.forEach(function(fo){
        fo.y-=fo.v*0.016*60/60; if(fo.y<-0.05){ fo.y=1.05; fo.x=Math.random(); }
        ctx.save(); ctx.globalAlpha=0.22; ctx.fillStyle='#c4b5fd';
        ctx.font='italic '+fo.s+'px Georgia,serif';
        ctx.fillText(fo.txt,fo.x*VW,fo.y*VH); ctx.restore();
      });
      var g4=ctx.createRadialGradient(sxp,syp,40,sxp,syp,320);
      g4.addColorStop(0,'rgba(0,0,0,0)'); g4.addColorStop(1,'rgba(0,0,0,.6)');
      ctx.fillStyle=g4; ctx.fillRect(0,0,VW,VH);
    }
  }
  function vignette(VW,VH,col){
    var g=ctx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*0.3,VW/2,VH/2,Math.max(VW,VH)*0.75);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,col);
    ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH);
  }

  /* canvas小道具 */
  function circle(x,y,r){ ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); }
  function diamond(x,y,w,h){ ctx.beginPath(); ctx.moveTo(x,y-h); ctx.lineTo(x+w,y); ctx.lineTo(x,y+h); ctx.lineTo(x-w,y); ctx.closePath(); ctx.fill(); }
  function roundPath(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function clamp(v,a,b){ return v<a?a:(v>b?b:v); }

  /* ════ 戦闘 ════ */
  function startBattle(en){
    mode='battle'; keys.u=keys.d=keys.l=keys.r=false;
    if(window.SND) SND.click();
    var NEED=3, hp=NEED; /* 倒すのに必要な正解数。問題は毎回プールからランダム抽選 */
    var ov=el('div','fm-ov fm-battle');
    ov.innerHTML=
      '<div class="fm-bt-stage">⚔️ '+(KIDS?'BATTLE':'BATTLE')+'</div>'+
      '<div class="fm-bt-enemy">'+
        '<div class="fm-bt-emoji" style="filter:drop-shadow(0 0 18px '+en.color+');">'+en.emoji+'</div>'+
        '<div class="fm-bt-name" style="border-color:'+en.color+';">'+en.name+'</div>'+
        '<div class="fm-bt-hpbar"><div class="fm-bt-hpfill" id="fmHp"></div></div>'+
      '</div>'+
      '<div class="fm-bt-area" id="fmArea"></div>';
    document.body.appendChild(ov);
    var area=ov.querySelector('#fmArea'), hpfill=ov.querySelector('#fmHp');
    function paintHp(){ hpfill.style.width=Math.max(0,hp)/NEED*100+'%'; }
    paintHp();

    function showQ(){
      var Q=battlePick();
      var h='<div class="fm-q">'+
        '<div class="fm-qno">'+(KIDS?'Question ':'Q ')+(NEED-hp+1)+' / '+NEED+'</div>'+
        '<div class="fm-qt">'+Q.q+'</div><div class="fm-cs">';
      for(var i=0;i<Q.c.length;i++) h+='<button class="fm-c" data-i="'+i+'">'+Q.c[i]+'</button>';
      h+='</div><div class="fm-tail"></div>';
      area.innerHTML=h;
      var card=area.querySelector('.fm-q');
      var btns=area.querySelectorAll('.fm-c'), answered=false;
      Array.prototype.forEach.call(btns,function(b){
        b.addEventListener('click',function(){
          if(answered) return; answered=true;
          var i=+b.getAttribute('data-i'), ok=(i===Q.a);
          Array.prototype.forEach.call(btns,function(x){ x.disabled=true; });
          var tail=area.querySelector('.fm-tail');
          if(ok){
            b.classList.add('ok'); if(window.SND) SND.correct();
            if(window.RPG) RPG.quizCorrect();
            hp--; paintHp();
            tail.innerHTML='<div class="fm-fb ok">⚡ '+(KIDS?'Critical hit!':'Critical hit!')+'</div>'+
              (Q.exp?'<div class="fm-exp">'+Q.exp+'</div>':'')+
              '<button class="fm-go" id="fmNext">'+(hp<=0?(KIDS?'Finish it!':'Deliver the final blow'):(KIDS?'Next':'Keep attacking'))+'</button>';
            tail.querySelector('#fmNext').addEventListener('click',function(){
              if(hp<=0){ victory(); } else { showQ(); }
            });
          } else {
            b.classList.add('ng'); if(btns[Q.a]) btns[Q.a].classList.add('ok');
            if(window.SND) SND.wrong(); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
            tail.innerHTML='<div class="fm-fb ng">💥 '+(KIDS?'You got hit…':'You took a counterattack…')+'</div>'+
              (Q.exp?'<div class="fm-exp">'+Q.exp+'</div>':'')+
              '<button class="fm-go retry" id="fmRetry">'+(KIDS?'Once more!':'Again')+'</button>';
            tail.querySelector('#fmRetry').addEventListener('click',function(){ showQ(); });
          }
        });
      });
    }
    function victory(){
      if(window.SND) SND.clear();
      en.alive=false;
      addZoneKill();
      /* ボス扉の解錠状況をフィードバック（撃破済みなら不要） */
      var doorMsg='';
      if(!(window.RPG&&RPG.bossCleared(CFG.boss))){
        if(zoneKills()>=KILLS_NEEDED)
          doorMsg='<div class="fm-win-l" style="color:#ffd96b;">🔓 '+(KIDS?'The seal on the boss door is broken!':'The seal on the boss door is broken!')+'</div>';
        else
          doorMsg='<div class="fm-win-l" style="color:#9fe0ff;">'+(KIDS?'To the boss door: '+killsLeft()+' more to go!':'To the boss door: '+killsLeft()+' more to go!')+'</div>';
      }
      area.innerHTML='<div class="fm-win">'+
        '<div class="fm-win-t">🎉 '+(KIDS?'You beat it!':'Defeated!')+'</div>'+
        '<div class="fm-win-l">'+en.name+' '+(KIDS?'defeated!':'vanquished!')+'</div>'+
        doorMsg+
        '<button class="fm-go" id="fmClose">'+(KIDS?'Back to the field':'Back to the field')+'</button></div>';
      area.querySelector('#fmClose').addEventListener('click',function(){ closeOv(ov); mode='field'; });
      if(window.RPG) setTimeout(function(){ RPG.addXP(en.def.xp,(KIDS?en.name+'Defeated!':en.name+'Defeated!')); },350);
      ov.querySelector('.fm-bt-emoji').classList.add('fm-die');
    }
    /* にげる */
    var flee=el('button','fm-flee'); flee.textContent=KIDS?'← Run away':'← Retreat';
    flee.addEventListener('click',function(){
      if(window.SND) SND.click();
      en.cool=1.6;
      /* 少し押し戻す */
      var ang=Math.atan2(player.py-en.py,player.px-en.px);
      var nx=player.px+Math.cos(ang)*TILE*0.9, ny=player.py+Math.sin(ang)*TILE*0.9;
      if(canBe(nx,player.py)) player.px=nx; if(canBe(player.px,ny)) player.py=ny;
      closeOv(ov); mode='field';
    });
    ov.appendChild(flee);
    /* 導入 → 出題 */
    var warn=el('div','fm-warn'); warn.textContent='⚠️ '+en.name+(KIDS?' appeared!':' appears!');
    ov.appendChild(warn);
    if(window.SND) SND.wrong();
    setTimeout(function(){ warn.remove(); showQ(); },950);
  }

  /* ════ カード入手 ════ */
  function pickupCard(ct){
    mode='menu'; keys.u=keys.d=keys.l=keys.r=false;
    addCardId(ct.card.id);
    if(window.SND) SND.stamp();
    if(window.RPG) RPG.addXP(15,KIDS?'Knowledge card':'Knowledge card obtained');
    var c=ct.card;
    var ov=el('div','fm-ov fm-card');
    ov.innerHTML=
      '<div class="fm-cardbox">'+
        '<div class="fm-card-label">'+(KIDS?'You got a knowledge card!':'You obtained a knowledge card!')+'</div>'+
        '<div class="fm-card-viz">'+(c.svg||('<div class="fm-card-e">'+c.e+'</div>'))+'</div>'+
        '<div class="fm-card-t">'+c.e+' '+c.t+'</div>'+
        '<div class="fm-card-b">'+c.b+'</div>'+
        '<div class="fm-card-hint">'+(KIDS?'It\'s been added to your card book':'Added to your card collection')+'</div>'+
        '<button class="fm-go" id="fmCardClose">'+(KIDS?'Close and go back to the map':'Close and return to the map')+'</button>'+
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector('#fmCardClose').addEventListener('click',function(){ closeOv(ov); mode='field'; });
    ov.addEventListener('click',function(e){ if(e.target===ov){ closeOv(ov); mode='field'; } });
    updateDexBadge();
  }

  /* ════ 図鑑（ポケモン図鑑的） ════ */
  function openDex(){
    if(mode!=='field'&&mode!=='menu') return;
    var prev=mode; mode='menu'; keys.u=keys.d=keys.l=keys.r=false;
    if(window.SND) SND.click();
    var cards=allCards();
    var got=0; cards.forEach(function(o){ if(hasCard(o.card.id)) got++; });
    var zlabel={sho:'Surface • Elementary',chu:'B1 • Middle School',ko:'B2 • High School',dai:'B3 • University',in:'B4 • Graduate School'};
    var ov=el('div','fm-ov fm-dex');
    var h='<div class="fm-dexbox">'+
      '<div class="fm-dex-head">'+
        '<div class="fm-dex-title">📖 '+(KIDS?'Card Book':'Knowledge Card Collection')+'</div>'+
        '<div class="fm-dex-count">'+got+' / '+cards.length+'</div>'+
        '<button class="fm-dex-x" id="fmDexX">✕</button>'+
      '</div><div class="fm-dex-scroll">';
    dexOrder().forEach(function(z){
      var list=LAYERS[z].cards||[];
      h+='<div class="fm-dex-zone">'+zlabel[z]+'</div><div class="fm-dex-grid">';
      list.forEach(function(c){
        if(hasCard(c.id)){
          h+='<button class="fm-dx got" data-id="'+c.id+'" data-zone="'+z+'">'+
            '<span class="fm-dx-e">'+c.e+'</span><span class="fm-dx-t">'+c.t+'</span></button>';
        } else {
          h+='<div class="fm-dx locked"><span class="fm-dx-e">❓</span><span class="fm-dx-t">???</span></div>';
        }
      });
      h+='</div>';
    });
    h+='</div></div>';
    ov.innerHTML=h;
    document.body.appendChild(ov);
    function close(){ closeOv(ov); mode=(prev==='menu'?'field':prev); }
    ov.querySelector('#fmDexX').addEventListener('click',close);
    ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
    Array.prototype.forEach.call(ov.querySelectorAll('.fm-dx.got'),function(b){
      b.addEventListener('click',function(){ showCardDetail(b.getAttribute('data-zone'),b.getAttribute('data-id')); });
    });
  }
  function showCardDetail(z,id){
    var c=null; (LAYERS[z].cards||[]).forEach(function(x){ if(x.id===id) c=x; });
    if(!c) return;
    if(window.SND) SND.click();
    var ov=el('div','fm-ov fm-card');
    ov.style.zIndex='100050';
    ov.innerHTML='<div class="fm-cardbox">'+
      '<div class="fm-card-viz">'+(c.svg||('<div class="fm-card-e">'+c.e+'</div>'))+'</div>'+
      '<div class="fm-card-t">'+c.e+' '+c.t+'</div>'+
      '<div class="fm-card-b">'+c.b+'</div>'+
      '<button class="fm-go" id="fmDcl">'+(KIDS?'Close':'Close')+'</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('#fmDcl').addEventListener('click',function(){ closeOv(ov); });
    ov.addEventListener('click',function(e){ if(e.target===ov) closeOv(ov); });
  }

  /* ════ 階段・ボス・封印 ════ */
  function travel(href,name,down){
    mode='menu';
    var ov=el('div','fm-ov fm-travel');
    ov.innerHTML='<div class="fm-travel-in"><div class="fm-travel-ic">'+(down?'▼':'▲')+'</div>'+
      '<div class="fm-travel-t">'+(down?(KIDS?'Down to a deeper floor…':'Further into the depths…'):(KIDS?'Up to the floor above…':'To the floor above…'))+'</div>'+
      '<div class="fm-travel-n">'+name+'</div></div>';
    document.body.appendChild(ov);
    if(window.SND) SND.clear();
    setTimeout(function(){ location.href=href; },850);
  }
  function lockedStairs(){
    mode='menu';
    if(window.SND) SND.wrong();
    var ov=el('div','fm-ov fm-locked');
    ov.innerHTML='<div class="fm-locked-in">'+
      '<div class="fm-locked-ic">🔒</div>'+
      '<div class="fm-locked-t">'+(KIDS?'The stairs are locked!':'The stairs are sealed')+'</div>'+
      '<div class="fm-locked-d">'+(KIDS
        ?'Boss "'+CFG.bossName+'": beat it to go down to the next floor.'
        :'Boss "'+CFG.bossName+'": defeat it to break the seal to the floor below.')+'</div>'+
      '<a class="fm-go boss" href="'+CFG.bossPage+'">⚔️ '+(KIDS?'Fight the boss':'Challenge the boss')+'</a>'+
      '<button class="fm-go ghost" id="fmLx">'+(KIDS?'Back':'Back')+'</button>'+
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector('#fmLx').addEventListener('click',function(){ closeOv(ov); mode='field'; nudgeOff(); });
    ov.addEventListener('click',function(e){ if(e.target===ov){ closeOv(ov); mode='field'; nudgeOff(); } });
  }
  /* このフィールドの敵を規定数倒すまで、ボス扉は封印されている */
  function bossSealed(){
    mode='menu';
    if(window.SND) SND.wrong();
    var ov=el('div','fm-ov fm-locked');
    ov.innerHTML='<div class="fm-locked-in">'+
      '<div class="fm-locked-ic">🔒</div>'+
      '<div class="fm-locked-t">'+(KIDS?'The boss is sealed!':'The boss is sealed')+'</div>'+
      '<div class="fm-locked-d">'+(KIDS
        ?'Beat the enemies in this field and the seal loosens.<br><strong style="color:#ffd9c8;font-size:1.15em;">'+killsLeft()+' more to beat!</strong>'
        :'Defeat the enemies in this field to loosen the seal.<br><strong style="color:#ffd9c8;font-size:1.15em;">'+killsLeft()+' more to beat!</strong>')+
        '<div style="margin-top:8px;color:#9aa3bd;font-size:.85rem;">'+(KIDS?'Defeated':'Defeated')+' '+zoneKills()+' / '+KILLS_NEEDED+'</div></div>'+
      '<button class="fm-go ghost" id="fmSx">'+(KIDS?'Go find enemies':'Go look for enemies')+'</button>'+
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector('#fmSx').addEventListener('click',function(){ closeOv(ov); mode='field'; nudgeOff(); });
    ov.addEventListener('click',function(e){ if(e.target===ov){ closeOv(ov); mode='field'; nudgeOff(); } });
  }
  function confirmBoss(){
    mode='menu';
    var cleared=window.RPG&&RPG.bossCleared(CFG.boss);
    if(!cleared&&!bossUnlocked()){ bossSealed(); return; }
    if(window.SND) SND.stamp();
    var ov=el('div','fm-ov fm-locked');
    ov.innerHTML='<div class="fm-locked-in">'+
      '<div class="fm-locked-ic" style="filter:drop-shadow(0 0 16px rgba(220,60,40,.7));">'+(cleared?'👑':CFG.bossEmoji)+'</div>'+
      '<div class="fm-locked-t" style="color:#ffd9c8;">'+(cleared?(KIDS?'A boss you already beat':'A defeated boss'):'BOSS ─ '+CFG.bossName)+'</div>'+
      '<div class="fm-locked-d">'+(cleared
        ?(KIDS?'Fight again? It gets stronger every time you fight.':'Rematch? Every time you come, it grows stronger.')
        :(KIDS?'The boss is right in front of you. Are you ready?':'The boss stands before you. Will you challenge it?'))+'</div>'+
      '<a class="fm-go boss" href="'+CFG.bossPage+'">⚔️ '+(cleared?(KIDS?'Rematch':'Rematch'):(KIDS?'Fight the boss':'Challenge the boss'))+'</a>'+
      '<button class="fm-go ghost" id="fmBx">'+(KIDS?'Not now':'Not now')+'</button>'+
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector('#fmBx').addEventListener('click',function(){ closeOv(ov); mode='field'; nudgeOff(); });
    ov.addEventListener('click',function(e){ if(e.target===ov){ closeOv(ov); mode='field'; nudgeOff(); } });
  }
  function nudgeOff(){
    /* 特殊タイルから1歩戻して連続発動を防ぐ */
    player.py+=4; if(!canBe(player.px,player.py)) player.py-=4;
    lastSpecial=Math.floor(player.px/TILE)+','+Math.floor(player.py/TILE);
  }

  function showGate(){
    mode='gate';
    var ov=el('div','fm-ov fm-gate');
    ov.innerHTML='<div class="fm-gate-in">'+
      '<div class="fm-gate-ic">'+(CFG.requireBossName?'🔒':'⛩')+'</div>'+
      '<div class="fm-gate-seal">─ This floor is sealed ─</div>'+
      '<div class="fm-gate-name">'+CFG.title+'</div>'+
      '<div class="fm-gate-d">To come here, you must have defeated the boss of the floor above, "'+CFG.requireBossName+'".</div>'+
      '<a class="fm-go boss" href="'+CFG.requireBossPage+'">⚔️ Challenge the boss "'+CFG.requireBossName+'"</a>'+
      '<button class="fm-gate-skip" id="fmGskip">Slip past the seal and explore (boss later)</button>'+
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector('#fmGskip').addEventListener('click',function(){
      sessionStorage.setItem('rpg_gate_skip_'+CFG.zone,'1');
      closeOv(ov); mode='field';
    });
  }

  /* ════ リセット ════ */
  function confirmReset(){
    if(mode!=='field'&&mode!=='menu') return;
    mode='menu'; keys.u=keys.d=keys.l=keys.r=false;
    if(window.SND) SND.click();
    var ov=el('div','fm-ov fm-reset');
    ov.innerHTML='<div class="fm-reset-in">'+
      '<div class="fm-reset-ic">🔄</div>'+
      '<div class="fm-reset-t">'+(KIDS?'Really reset?':'Are you sure you want to reset?')+'</div>'+
      '<div class="fm-reset-d">'+(KIDS
        ?'All your progress will be erased. Your level, the cards you found, and your boss records all go back to the start.'
        :'All progress will be erased. Your level, knowledge cards, and boss records will all be reset.')+'</div>'+
      '<button class="fm-go fm-reset-yes" id="fmRsYes">'+(KIDS?'Reset':'Reset')+'</button>'+
      '<button class="fm-go ghost" id="fmRsNo">'+(KIDS?'Not now':'Not now')+'</button>'+
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector('#fmRsYes').addEventListener('click',function(){
      if(window.RPG&&RPG.resetAll){ RPG.resetAll(); }
      else { try{ var d=[],i,k; for(i=0;i<localStorage.length;i++){ k=localStorage.key(i); if(/^rpg_/.test(k)) d.push(k); } d.forEach(function(x){ localStorage.removeItem(x); }); }catch(e){} }
      try{ sessionStorage.removeItem('rpg_started'); }catch(e){}
      if(window.SND) SND.clear();
      location.href='/math-site/en/sho/map_1.html';
    });
    ov.querySelector('#fmRsNo').addEventListener('click',function(){ closeOv(ov); mode='field'; });
    ov.addEventListener('click',function(e){ if(e.target===ov){ closeOv(ov); mode='field'; } });
  }

  /* ════ タイトル & キャラ選択 ════ */
  function showTitle(){
    mode='title'; keys.u=keys.d=keys.l=keys.r=false;
    var ov=el('div','fm-ov fm-title');
    ov.innerHTML='<div class="fm-title-in">'+
      '<div class="fm-title-badge">MATH ADVENTURE</div>'+
      '<h1 class="fm-title-main">Math the Japanese Way ― The Great Adventure</h1>'+
      '<p class="fm-title-sub">Collect knowledge cards and explore the world of math!</p>'+
      '<button class="fm-go" id="fmStart">⚔️ Start the adventure</button>'+
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector('#fmStart').addEventListener('click',function(){
      if(window.SND) SND.click();
      renderCharSelect(ov);
    });
  }
  function renderCharSelect(ov){
    ov.className='fm-ov fm-sel';
    var saved=heroId();
    function cardHtml(id){
      return '<div class="fm-sel-card'+(id===saved?' on':'')+'" data-id="'+id+'">'+
        '<div class="fm-sel-viz">'+HEROES[id].svg+'</div>'+
        '<div class="fm-sel-name">'+HEROES[id].name+'</div>'+
        '<button class="fm-go fm-sel-btn" data-id="'+id+'">Adventure with this character</button>'+
        '</div>';
    }
    ov.innerHTML='<div class="fm-sel-in">'+
      '<h2 class="fm-sel-head">Choose your character</h2>'+
      '<div class="fm-sel-grid">'+cardHtml('yuusha')+cardHtml('mahou')+'</div>'+
      '</div>';
    Array.prototype.forEach.call(ov.querySelectorAll('.fm-sel-card'),function(card){
      card.addEventListener('click',function(){
        Array.prototype.forEach.call(ov.querySelectorAll('.fm-sel-card'),function(c){ c.classList.remove('on'); });
        card.classList.add('on'); if(window.SND) SND.click();
      });
    });
    Array.prototype.forEach.call(ov.querySelectorAll('.fm-sel-btn'),function(btn){
      btn.addEventListener('click',function(e){
        e.stopPropagation();
        var id=btn.getAttribute('data-id');
        try{ localStorage.setItem('rpg_char',id); }catch(err){}
        try{ sessionStorage.setItem('rpg_started','1'); }catch(err){}
        heroImage(id);
        if(window.SND) SND.clear();
        closeOv(ov); mode='field';
      });
    });
  }

  /* ════ HUD ════ */
  function buildHUD(){
    var bar=el('div','fm-hud');
    bar.innerHTML=
      '<div class="fm-hud-l">'+
        '<div class="fm-depth">'+CFG.depth+'</div>'+
        '<div class="fm-hero"><span class="fm-hero-face" id="fmFace">🧒</span>'+
          '<span class="fm-hero-lv" id="fmLv">Lv1</span>'+
          '<span class="fm-bar"><span class="fm-fill" id="fmXpFill"></span></span>'+
          '<span class="fm-xp" id="fmXp"></span></div>'+
      '</div>'+
      '<div class="fm-hud-r">'+
        '<button class="fm-btn" id="fmDex">📖 <span>'+(KIDS?'Cards':'Cards')+'</span><i class="fm-badge" id="fmBadge"></i></button>'+
        '<a class="fm-btn" href="'+CFG.up.href+'">🏠 <span>'+(KIDS?'Back':'Back')+'</span></a>'+
        '<button class="fm-btn reset" id="fmReset">🔄 <span>Reset</span></button>'+
      '</div>';
    document.body.appendChild(bar);
    document.getElementById('fmDex').addEventListener('click',openDex);
    document.getElementById('fmReset').addEventListener('click',confirmReset);
    var hint=el('div','fm-hint');
    hint.innerHTML=(KIDS
      ?'Move with the arrows / buttons below • touch an enemy to fight • treasure chests give cards'
      :'Arrow keys / D-pad to move • touch enemies to fight • chests hold knowledge cards • stairs lead to the next floor');
    document.body.appendChild(hint);
    setTimeout(function(){ hint.classList.add('fade'); },5200);
    updateHero(); updateDexBadge();
    document.addEventListener('rpg:xp',updateHero);
  }
  function updateHero(){
    if(!window.RPG) return;
    var xp=RPG.getXP(), lv=RPG.levelFor(xp), nx=RPG.nextLevel(xp);
    var f=document.getElementById('fmFace'); if(!f) return;
    f.textContent=lv.emoji;
    document.getElementById('fmLv').textContent='Lv'+lv.lv;
    document.getElementById('fmXpFill').style.width=nx?Math.min(100,Math.round((xp-lv.xp)/(nx.xp-lv.xp)*100))+'%':'100%';
    document.getElementById('fmXp').textContent=xp+' XP';
  }
  function updateDexBadge(){
    var b=document.getElementById('fmBadge'); if(!b) return;
    var cards=allCards(), got=0; cards.forEach(function(o){ if(hasCard(o.card.id)) got++; });
    b.textContent=got+'/'+cards.length;
  }
  function buildDpad(){
    var pad=el('div','fm-dpad');
    var defs=[['u','▲','up'],['l','◀','left'],['r','▶','right'],['d','▼','down']];
    pad.innerHTML=defs.map(function(d){ return '<button class="fm-dbtn fm-'+d[2]+'" data-k="'+d[0]+'">'+d[1]+'</button>'; }).join('');
    document.body.appendChild(pad);
    Array.prototype.forEach.call(pad.querySelectorAll('.fm-dbtn'),function(b){
      var k=b.getAttribute('data-k');
      function on(e){ e.preventDefault(); if(mode==='field') keys[k]=true; b.classList.add('on'); }
      function off(e){ if(e)e.preventDefault(); keys[k]=false; b.classList.remove('on'); }
      b.addEventListener('pointerdown',on);
      b.addEventListener('pointerup',off);
      b.addEventListener('pointerleave',off);
      b.addEventListener('pointercancel',off);
    });
    return pad;
  }

  /* ════ helpers ════ */
  function el(tag,cls){ var d=document.createElement(tag); if(cls) d.className=cls; return d; }
  function closeOv(ov){ ov.style.transition='opacity .3s'; ov.style.opacity='0'; setTimeout(function(){ ov.remove(); },320); }

  /* ── 起動 ── */
  if(window.SND){} /* sound.js は自動でアンロック */
  var freshSession=(function(){ try{ return sessionStorage.getItem('rpg_started')!=='1'; }catch(e){ return true; } })();
  if(zoneId==='sho1' && freshSession){
    showTitle();          /* 入口（小学生フィールド 1-1）ではまずタイトル → キャラ選択 */
  } else {
    maybeGate();
  }
  requestAnimationFrame(loop);
};

/* ════════════════════════════════════════════════════════
   スタイル注入
   ════════════════════════════════════════════════════════ */
function injectCSS(){
  if(document.getElementById('fmCss')) return;
  if(!document.getElementById('fmFont')){
    var fl=document.createElement('link'); fl.id='fmFont'; fl.rel='stylesheet';
    fl.href='https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap';
    document.head.appendChild(fl);
  }
  var st=document.createElement('style'); st.id='fmCss';
  st.textContent=[
  'html,body{margin:0;height:100%;overflow:hidden;background:#05060c;}',
  '*{-webkit-tap-highlight-color:transparent;}',
  '.fm-canvas{position:fixed;inset:0;display:block;touch-action:none;image-rendering:auto;}',
  '/* HUD */',
  '.fm-hud{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:10px 12px;font-family:"Noto Sans JP",sans-serif;pointer-events:none;background:linear-gradient(180deg,rgba(5,6,12,.85),rgba(5,6,12,0));}',
  '.fm-hud-l,.fm-hud-r{pointer-events:auto;}',
  '.fm-depth{font-size:.66rem;font-weight:700;letter-spacing:.12em;color:#c8a84b;margin-bottom:4px;text-shadow:0 1px 3px #000;}',
  '.fm-hero{display:flex;align-items:center;gap:7px;background:rgba(10,8,26,.82);border:1.5px solid rgba(200,168,75,.5);border-radius:999px;padding:5px 12px 5px 7px;box-shadow:0 3px 12px rgba(0,0,0,.5);}',
  '.fm-hero-face{font-size:1.25rem;}',
  '.fm-hero-lv{font-size:.74rem;font-weight:900;color:#e8c96b;white-space:nowrap;}',
  '.fm-bar{width:70px;height:8px;background:rgba(0,0,0,.5);border:1px solid rgba(200,168,75,.4);border-radius:999px;overflow:hidden;}',
  '.fm-fill{display:block;height:100%;width:0;background:linear-gradient(90deg,#7c5cbf,#3a6fd8 45%,#e8c96b);transition:width .6s;}',
  '.fm-xp{font-size:.62rem;color:#9fb0d0;white-space:nowrap;}',
  '.fm-hud-r{display:flex;gap:8px;}',
  '.fm-btn{position:relative;display:inline-flex;align-items:center;gap:3px;text-decoration:none;cursor:pointer;font-family:inherit;font-weight:900;font-size:.82rem;color:#ffe9a8;background:rgba(20,14,40,.9);border:1.5px solid #c8a84b;border-radius:12px;padding:8px 12px;box-shadow:0 3px 12px rgba(0,0,0,.5);}',
  '.fm-btn span{font-size:.72rem;}',
  '.fm-btn:active{transform:scale(.95);}',
  '.fm-badge{position:absolute;top:-7px;right:-7px;background:#c0392b;color:#fff;font-style:normal;font-size:.56rem;font-weight:900;padding:2px 5px;border-radius:999px;border:1px solid #fff;}',
  '.fm-hint{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:40;font-family:"Noto Sans JP",sans-serif;font-size:.7rem;color:#cfd8ff;background:rgba(8,6,20,.78);border:1px solid rgba(200,168,75,.35);border-radius:999px;padding:7px 16px;max-width:92vw;text-align:center;transition:opacity .8s;pointer-events:none;}',
  '.fm-hint.fade{opacity:0;}',
  '/* D-pad */',
  '.fm-dpad{position:fixed;left:16px;bottom:20px;z-index:45;width:150px;height:150px;}',
  '.fm-dbtn{position:absolute;width:50px;height:50px;font-size:1.2rem;color:#ffe9a8;background:rgba(20,16,42,.7);border:1.6px solid rgba(200,168,75,.55);border-radius:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;touch-action:none;backdrop-filter:blur(2px);}',
  '.fm-dbtn.on{background:rgba(200,168,75,.45);color:#fff;}',
  '.fm-up{left:50px;top:0;}.fm-left{left:0;top:50px;}.fm-right{left:100px;top:50px;}.fm-down{left:50px;top:100px;}',
  '@media(hover:hover) and (pointer:fine){.fm-dpad{opacity:.45;}.fm-dpad:hover{opacity:1;}}',
  '/* overlays */',
  '@keyframes fmIn{from{opacity:0;}to{opacity:1;}}',
  '@keyframes fmPop{0%{transform:scale(.6);opacity:0;}60%{transform:scale(1.05);}100%{transform:scale(1);opacity:1;}}',
  '@keyframes fmFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-12px);}}',
  '@keyframes fmShake{0%,100%{transform:translateX(0);}20%{transform:translateX(-8px);}40%{transform:translateX(7px);}60%{transform:translateX(-5px);}80%{transform:translateX(4px);}}',
  '@keyframes fmWarn{0%{transform:translate(-50%,-50%) scale(.6);opacity:0;}25%{transform:translate(-50%,-50%) scale(1.05);opacity:1;}80%{opacity:1;}100%{opacity:0;}}',
  '@keyframes fmHint{0%{opacity:0;transform:translate(-50%,8px);}15%{opacity:1;transform:translate(-50%,0);}75%{opacity:1;transform:translate(-50%,0);}100%{opacity:0;transform:translate(-50%,-4px);}}',
  '@keyframes fmDie{0%{transform:scale(1);opacity:1;}50%{transform:scale(1.3) rotate(12deg);}100%{transform:scale(.1) rotate(160deg);opacity:0;}}',
  '.fm-ov{position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;font-family:"Noto Sans JP",sans-serif;text-align:center;animation:fmIn .3s ease;overflow-y:auto;}',
  '.fm-battle{background:radial-gradient(circle at 50% 32%,rgba(40,12,18,.96),rgba(6,4,12,.98));}',
  '.fm-go{display:inline-block;margin-top:16px;font-family:inherit;font-weight:900;font-size:1rem;color:#fff;background:linear-gradient(135deg,#8a2020,#c0392b);border:1px solid #ffb09a;border-radius:999px;padding:13px 34px;cursor:pointer;text-decoration:none;}',
  '.fm-go:active{transform:scale(.96);}',
  '.fm-go.ghost{background:transparent;border:1px solid rgba(255,255,255,.3);color:#cfd8ff;}',
  '.fm-go.retry{background:linear-gradient(135deg,#5a4ba8,#7c5cbf);border-color:#bdb2f0;}',
  '.fm-go.boss{background:linear-gradient(135deg,#8a2020,#c0392b);}',
  '/* battle */',
  '.fm-bt-stage{font-size:.7rem;font-weight:700;letter-spacing:.3em;color:#e8c96b;margin-bottom:6px;}',
  '.fm-bt-enemy{margin-bottom:8px;}',
  '.fm-bt-emoji{font-size:4rem;animation:fmFloat 2.6s ease-in-out infinite;}',
  '.fm-bt-emoji.fm-die{animation:fmDie .9s ease forwards;}',
  '.fm-bt-name{display:inline-block;font-size:1.15rem;font-weight:900;color:#fff;background:rgba(3,2,10,.9);border:2px solid #e8c96b;border-radius:12px;padding:6px 20px;margin:8px 0;}',
  '.fm-bt-hpbar{width:min(360px,80vw);height:10px;margin:0 auto;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.25);border-radius:999px;overflow:hidden;}',
  '.fm-bt-hpfill{height:100%;width:100%;background:linear-gradient(90deg,#c0392b,#e8884b);transition:width .4s cubic-bezier(.22,1,.36,1);}',
  '.fm-bt-area{width:min(480px,94vw);}',
  '.fm-q{background:#10142a;border:2px solid #8a2020;border-radius:16px;padding:18px 16px;margin-top:6px;box-shadow:0 0 30px rgba(192,57,43,.3);animation:fmPop .4s cubic-bezier(.34,1.56,.64,1);}',
  '.fm-q.shake{animation:fmShake .4s ease;}',
  '.fm-qno{font-size:.66rem;font-weight:700;letter-spacing:.2em;color:#e8884b;margin-bottom:6px;}',
  '.fm-qt{font-size:1.04rem;font-weight:900;line-height:1.8;color:#f0f4ff;margin-bottom:12px;}',
  '.fm-cs{display:grid;gap:8px;}',
  '.fm-c{font-family:inherit;font-size:.95rem;font-weight:700;color:#f0f4ff;background:#1a2235;border:1px solid rgba(255,255,255,.18);border-radius:11px;padding:12px 14px;cursor:pointer;text-align:left;transition:all .15s;}',
  '.fm-c:hover{border-color:#c8a84b;background:#222c45;}',
  '.fm-c.ok{background:#1d4a2a;border-color:#2ecc71;color:#fff;}',
  '.fm-c.ng{background:#4a1d1d;border-color:#c0392b;}',
  '.fm-c:disabled{cursor:default;}',
  '.fm-tail{}',
  '.fm-fb{margin-top:12px;font-size:.95rem;font-weight:900;line-height:1.7;}',
  '.fm-fb.ok{color:#7bd88a;}.fm-fb.ng{color:#ff9d8a;}',
  '.fm-exp{margin-top:8px;background:rgba(0,0,0,.3);border-left:3px solid #c8a84b;border-radius:8px;padding:9px 12px;font-size:.84rem;color:#cfd8ff;line-height:1.8;text-align:left;}',
  '.fm-win{animation:fmPop .5s cubic-bezier(.34,1.56,.64,1);}',
  '.fm-win-t{font-size:1.6rem;font-weight:900;color:#ffe9a8;text-shadow:0 0 18px rgba(255,217,94,.8);}',
  '.fm-win-l{font-size:.95rem;color:#cfd8ff;margin-top:6px;}',
  '.fm-flee{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);font-family:inherit;font-size:.8rem;color:#99a;background:none;border:none;text-decoration:underline;cursor:pointer;z-index:1;}',
  '.fm-flee:hover{color:#cfd8ff;}',
  '.fm-warn{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:5;font-weight:900;font-size:clamp(1.1rem,4.5vw,1.6rem);color:#fff;background:rgba(3,2,10,.94);border:2px solid #e8c96b;border-radius:999px;padding:13px 30px;box-shadow:0 0 26px rgba(200,168,75,.45);animation:fmWarn 1s ease forwards;pointer-events:none;white-space:nowrap;max-width:94vw;overflow:hidden;text-overflow:ellipsis;}',
  '.fm-hint{position:fixed;bottom:7%;left:50%;transform:translateX(-50%);z-index:90;font-weight:700;font-size:.82rem;color:#fff;background:rgba(8,7,14,.74);border-radius:7px;padding:5px 13px;pointer-events:none;white-space:nowrap;max-width:92vw;opacity:0;letter-spacing:.04em;}',
  '.fm-hint.show{animation:fmHint 1.3s ease forwards;}',
  '/* card */',
  '.fm-card{background:rgba(6,8,18,.9);}',
  '.fm-cardbox{max-width:400px;width:100%;background:linear-gradient(135deg,#1a1040,#241a52 55%,#0f1f4a);border:2px solid #c8a84b;border-radius:20px;padding:26px 22px;box-shadow:0 0 44px rgba(200,168,75,.4);animation:fmPop .5s cubic-bezier(.34,1.56,.64,1);}',
  '.fm-card-label{font-size:.72rem;font-weight:700;letter-spacing:.1em;color:#e8c96b;margin-bottom:10px;}',
  '.fm-card-e{font-size:3.4rem;filter:drop-shadow(0 0 16px rgba(232,201,107,.6));}',
  '.fm-card-t{font-size:1.3rem;font-weight:900;color:#ffe9a8;margin:8px 0 12px;}',
  '.fm-card-b{font-size:.92rem;line-height:1.95;color:#e8eeff;text-align:left;background:rgba(0,0,0,.22);border-radius:12px;padding:14px 16px;}',
  '.fm-card-viz{margin:6px auto 12px;width:100%;max-width:300px;background:rgba(0,0,0,.25);border:1px solid rgba(200,168,75,.3);border-radius:14px;padding:8px 8px 4px;}',
  '.fm-card-viz svg{display:block;width:100%;height:auto;}',
  '.fm-card-hint{font-size:.68rem;color:#9fb0d0;margin-top:12px;}',
  '/* dex */',
  '.fm-dex{background:rgba(5,6,14,.94);}',
  '.fm-dexbox{max-width:640px;width:100%;max-height:88vh;display:flex;flex-direction:column;background:#0d1124;border:2px solid #c8a84b;border-radius:18px;overflow:hidden;animation:fmPop .4s cubic-bezier(.34,1.56,.64,1);}',
  '.fm-dex-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(200,168,75,.3);background:linear-gradient(135deg,#1a1040,#0f1f4a);}',
  '.fm-dex-title{font-size:1.05rem;font-weight:900;color:#ffe9a8;flex:1;text-align:left;}',
  '.fm-dex-count{font-size:.82rem;font-weight:900;color:#e8c96b;background:rgba(0,0,0,.35);border-radius:999px;padding:4px 12px;}',
  '.fm-dex-x{font-size:1rem;color:#cfd8ff;background:none;border:none;cursor:pointer;padding:4px 8px;}',
  '.fm-dex-scroll{overflow-y:auto;padding:14px 16px 20px;}',
  '.fm-dex-zone{font-size:.7rem;font-weight:700;letter-spacing:.15em;color:#c8a84b;margin:14px 0 8px;text-align:left;border-bottom:1px dashed rgba(200,168,75,.25);padding-bottom:4px;}',
  '.fm-dex-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:9px;}',
  '.fm-dx{display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 6px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:#141a30;cursor:default;font-family:inherit;}',
  '.fm-dx.got{border-color:rgba(200,168,75,.55);background:linear-gradient(135deg,#1a2148,#101830);box-shadow:0 0 12px rgba(200,168,75,.15);cursor:pointer;}',
  '.fm-dx.got:hover{border-color:#e8c96b;transform:translateY(-2px);}',
  '.fm-dx.locked{filter:grayscale(1);opacity:.5;}',
  '.fm-dx-e{font-size:1.7rem;}',
  '.fm-dx-t{font-size:.66rem;font-weight:700;color:#e8eeff;line-height:1.3;text-align:center;}',
  '.fm-dx.locked .fm-dx-t{color:#667;}',
  '/* travel / locked / gate */',
  '.fm-travel{background:rgba(3,4,10,.92);}',
  '.fm-travel-in{animation:fmPop .5s ease;}',
  '.fm-travel-ic{font-size:3rem;color:#e8c96b;animation:fmFloat 1.2s ease-in-out infinite;}',
  '.fm-travel-t{font-size:1rem;font-weight:900;color:#ffe9a8;margin-top:8px;}',
  '.fm-travel-n{font-size:.85rem;color:#9fb0d0;margin-top:4px;}',
  '.fm-locked{background:radial-gradient(circle at 50% 35%,rgba(30,14,18,.95),rgba(5,4,12,.97));}',
  '.fm-locked-in{max-width:400px;animation:fmPop .5s cubic-bezier(.34,1.56,.64,1);}',
  '.fm-locked-ic{font-size:3.4rem;}',
  '.fm-locked-t{font-size:1.2rem;font-weight:900;color:#ffd9c8;margin:8px 0 8px;}',
  '.fm-locked-d{font-size:.9rem;line-height:1.9;color:#cdb;margin-bottom:6px;}',
  '.fm-locked .fm-go{display:block;margin:14px auto 0;max-width:280px;}',
  '.fm-gate{background:radial-gradient(circle at 50% 30%,#1c0f1e,#08060e 72%);}',
  '.fm-gate-in{max-width:460px;animation:fmPop .55s cubic-bezier(.34,1.56,.64,1);}',
  '.fm-gate-ic{font-size:3.8rem;filter:drop-shadow(0 0 18px rgba(255,90,60,.5));}',
  '.fm-gate-seal{font-size:.72rem;font-weight:700;letter-spacing:.25em;color:#b06060;margin:8px 0 6px;}',
  '.fm-gate-name{font-size:clamp(1.5rem,6vw,2.2rem);font-weight:900;color:#ffd9c8;letter-spacing:.1em;text-shadow:0 0 22px rgba(255,90,60,.45);margin-bottom:10px;}',
  '.fm-gate-d{font-size:.92rem;line-height:2;color:#caa;margin-bottom:8px;}',
  '.fm-gate .fm-go{display:block;margin:16px auto 0;max-width:320px;}',
  '.fm-gate-skip{display:block;margin:18px auto 0;font-size:.76rem;color:#667;text-decoration:underline;background:none;border:none;cursor:pointer;font-family:inherit;}',
  '.fm-gate-skip:hover{color:#99a;}',
  '/* title & character select */',
  '.fm-title{background:radial-gradient(circle at 50% 28%,rgba(20,14,46,.98),rgba(4,5,12,.99));}',
  '.fm-title-in{max-width:520px;animation:fmPop .6s cubic-bezier(.34,1.56,.64,1);}',
  '.fm-title-badge{font-size:.72rem;font-weight:700;letter-spacing:.35em;color:#c8a84b;margin-bottom:14px;}',
  '.fm-title-main{font-size:clamp(1.8rem,7vw,3rem);font-weight:900;color:#ffe9a8;letter-spacing:.05em;line-height:1.35;margin:0 0 14px;text-shadow:0 0 30px rgba(255,217,94,.6),0 0 60px rgba(200,168,75,.35);}',
  '.fm-title-sub{font-size:clamp(.85rem,3.5vw,1.05rem);color:#cfd8ff;line-height:1.9;margin-bottom:30px;}',
  '.fm-title .fm-go{font-size:1.1rem;padding:15px 42px;background:linear-gradient(135deg,#c8a84b,#e8c96b);color:#1a1040;border-color:#fff3c4;box-shadow:0 0 22px rgba(200,168,75,.5);}',
  '.fm-sel{background:radial-gradient(circle at 50% 25%,rgba(20,14,46,.98),rgba(4,5,12,.99));}',
  '.fm-sel-in{max-width:660px;width:100%;animation:fmPop .5s cubic-bezier(.34,1.56,.64,1);}',
  '.fm-sel-head{font-size:clamp(1.2rem,5vw,1.7rem);font-weight:900;color:#ffe9a8;margin-bottom:20px;text-shadow:0 0 20px rgba(255,217,94,.5);}',
  '.fm-sel-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}',
  '.fm-sel-card{background:linear-gradient(160deg,#1a1040,#241a52 55%,#0f1f4a);border:2px solid rgba(200,168,75,.4);border-radius:18px;padding:16px 14px 18px;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s;}',
  '.fm-sel-card:hover{transform:translateY(-3px);border-color:#c8a84b;}',
  '.fm-sel-card.on{border-color:#e8c96b;box-shadow:0 0 22px rgba(200,168,75,.5);}',
  '.fm-sel-viz{width:100%;max-width:150px;margin:0 auto 10px;background:rgba(0,0,0,.28);border:1px solid rgba(200,168,75,.25);border-radius:14px;padding:8px;}',
  '.fm-sel-viz svg{display:block;width:100%;height:auto;}',
  '.fm-sel-name{font-size:1.15rem;font-weight:900;color:#ffe9a8;margin-bottom:12px;}',
  '.fm-sel-btn{margin-top:4px;width:100%;font-size:.85rem;padding:11px 14px;background:linear-gradient(135deg,#5a4ba8,#7c5cbf);border-color:#bdb2f0;}',
  '/* reset */',
  '.fm-btn.reset{border-color:#c0392b;color:#ff9d8a;background:rgba(40,14,18,.9);}',
  '.fm-reset{background:radial-gradient(circle at 50% 35%,rgba(30,14,18,.96),rgba(5,4,12,.98));}',
  '.fm-reset-in{max-width:420px;animation:fmPop .5s cubic-bezier(.34,1.56,.64,1);}',
  '.fm-reset-ic{font-size:3rem;margin-bottom:6px;}',
  '.fm-reset-t{font-size:1.2rem;font-weight:900;color:#ffd9c8;margin:6px 0 10px;}',
  '.fm-reset-d{font-size:.9rem;line-height:1.9;color:#cdb3b3;margin-bottom:4px;}',
  '.fm-reset .fm-go{display:block;margin:12px auto 0;max-width:300px;}',
  '.fm-reset-yes{background:linear-gradient(135deg,#8a2020,#c0392b);border-color:#ffb09a;}',
  '@media(max-width:420px){.fm-sel-grid{grid-template-columns:1fr;}}',
  '@media(max-width:480px){.fm-btn span{display:none;}.fm-dpad{width:138px;height:138px;}.fm-dbtn{width:46px;height:46px;}.fm-up{left:46px;}.fm-left{top:46px;}.fm-right{left:92px;top:46px;}.fm-down{left:46px;top:92px;}}'
  ].join('\n');
  document.head.appendChild(st);
}

})();
