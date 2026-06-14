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
    name:'ゆうしゃ', color:'#5b8cff',
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
    name:'まほうつかい', color:'#ff7ec8',
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

/* ───────────────────────── 地上：小学生（森・草原） ───────────────────────── */
sho:{
  zone:'sho', kids:true, border:'T', decor:'forest',
  title:'はじまりの森', depth:'地上 ─ 小学生フィールド',
  theme:{bg:'#16361f', floorA:'#2f7d3f', floorB:'#2b7339', accent:'#ffe08a', wall:'#5a3a22'},
  boss:1, bossName:'文字式の壁', bossEmoji:'🗿', bossPage:'/math-site/boss_1.html',
  requireBoss:null, requireBossPage:null, requireBossName:null,
  up:{href:'/math-site/', name:'入口にもどる'},
  next:{href:'/math-site/chu/map.html', name:'中学フィールド（洞窟）'},
  map:[
    'TTTTTTTTTTTTTTTTTTT',
    'TP...C....T....E..T',
    'T...TT.......TT..CT',
    'T.E.....C.......T.T',
    'T....TT.....E....T.T',
    'T.C.......TT.....ET',
    'T....E.......C..T.T',
    'T.TT......E.....T.T',
    'T...C....T....TT.CT',
    'T.U....TT.....E...T',
    'TB...E......C....ST',
    'T....TT.......T...T',
    'TTTTTTTTTTTTTTTTTTT'
  ],
  enemies:[
    E('🐛','かぞえムシ',30,'#9ccc65',[
      {q:'10の まとまりが 3つ、ばらが 4つ。ぜんぶで いくつ？',c:['7','34','304'],a:1,exp:'10が 3つで 30。30と 4で 34！'},
      {q:'28は 10の まとまりが いくつと、ばらが いくつ？',c:['10が2つと ばら8つ','10が8つと ばら2つ','10が2つと ばら2つ'],a:0,exp:'28は 20と 8。10の まとまりは 2つだね。'},
      {q:'2とびで かぞえると 2, 4, 6, 8…。つぎは？',c:['9','12','10'],a:2,exp:'2ずつ ふえるから、8の つぎは 10！'}
    ]),
    E('🟢','プラスライム',30,'#4fc3f7',[
      {q:'8＋5は いくつ？',c:['12','13','14'],a:1,exp:'8に 2を たして 10。のこりの 3を たして 13！'},
      {q:'9＋7。まず 9に いくつ たすと 10に なる？',c:['1','2','3'],a:0,exp:'9＋1で 10。10と のこりの 6で 16！'},
      {q:'30＋40は いくつ？',c:['70','34','60'],a:0,exp:'10の まとまりが 3つと 4つで 7つ。70！'}
    ]),
    E('🦇','マイナスコウモリ',32,'#9575cd',[
      {q:'13－5は いくつ？',c:['7','9','8'],a:2,exp:'13を 10と 3に わける。10－5＝5、5と 3で 8！'},
      {q:'15－9は いくつ？',c:['6','7','5'],a:0,exp:'10－9＝1、1と 5で 6！'},
      {q:'70－20は いくつ？',c:['90','50','5'],a:1,exp:'10の まとまりで 7－2＝5。だから 50！'}
    ]),
    E('🐲','九九ドラゴン',40,'#e57373',[
      {q:'7×6は いくつ？',c:['42','48','36'],a:0,exp:'7×5＝35に 7を たして 42！'},
      {q:'4×8と おなじ こたえに なるのは？',c:['4＋8','8×4','6×6'],a:1,exp:'かけざんは じゅんばんを かえても おなじ こたえ！'},
      {q:'9×9は いくつ？',c:['72','99','81'],a:2,exp:'9のだんの さいご。81だね！'}
    ]),
    E('👻','はんぶんゴースト',34,'#b0bec5',[
      {q:'1/2 ＋ 1/4 は いくつ？',c:['2/6','3/4','2/4'],a:1,exp:'1/2は 2/4と おなじ。2/4＋1/4＝3/4！'},
      {q:'1/3 と 2/6、おおきいのは どっち？',c:['1/3','2/6','おなじ'],a:2,exp:'2/6を やくぶんすると 1/3。おなじ おおきさ！'},
      {q:'1/2 ＋ 1/3 は いくつ？',c:['5/6','2/5','1/6'],a:0,exp:'分母を 6に そろえて 3/6＋2/6＝5/6！'}
    ]),
    E('🗿','さんかくガーゴイル',36,'#a1887f',[
      {q:'底辺6cm・高さ4cmの 三角形の面積は？',c:['24cm²','10cm²','12cm²'],a:2,exp:'6×4÷2＝12。さいごの ÷2を わすれずに！'},
      {q:'三角形の面積で「÷2」するのは なぜ？',c:['長方形の はんぶんだから','たかさが 2つ あるから','きまりだから'],a:0,exp:'おなじ三角形を 2つ あわせると 長方形に なるから！'},
      {q:'底辺を 2ばいに すると、面積は？',c:['かわらない','2ばいに なる','4ばいに なる'],a:1,exp:'底辺×高さ÷2 だから、底辺が 2ばいなら 面積も 2ばい！'}
    ]),
    E('🟡','まるまるスピリット',34,'#ffd54f',[
      {q:'円を こまかく切って ならべると、なにに ちかづく？',c:['三角形','星のかたち','長方形'],a:2,exp:'たて＝半径、よこ＝円周の半分の 長方形に なる！'},
      {q:'半径10cmの 円の面積は？（円周率3.14）',c:['314cm²','31.4cm²','100cm²'],a:0,exp:'10×10×3.14＝314！'},
      {q:'ならべて できた長方形の「たて」の ながさは？',c:['直径','半径','円周'],a:1,exp:'切った ひとつぶんの ながさ＝半径！'}
    ]),
    E('🧩','パズルキーパー',38,'#4db6ac',[
      {q:'1, 2, 4, 8…と ふえていく。つぎは？',c:['16','10','12'],a:0,exp:'2ばいずつ ふえている！8の 2ばいで 16。'},
      {q:'◯＋◯＝10。◯に はいる おなじ かずは？',c:['2','10','5'],a:2,exp:'5＋5＝10！'},
      {q:'3, 6, 9, 12…の なかまで ないのは？',c:['15','20','18'],a:1,exp:'みんな 3のだんの かず。20は 3で わりきれない！'}
    ])
  ],
  cards:[
    {id:'sho-ten',e:'🔟',t:'10のまとまり',b:'10こ あつまると くらいが ひとつ あがる。28は 10が2つと ばらが8つ。これが 数の せかいの きほんだよ。',
      svg:SVG('<rect x="14" y="32" width="40" height="56" rx="7" fill="#7e57c2"/><text x="34" y="67" text-anchor="middle" font-size="20" font-weight="bold" fill="#fff" font-family="sans-serif">10</text><rect x="60" y="32" width="40" height="56" rx="7" fill="#7e57c2"/><text x="80" y="67" text-anchor="middle" font-size="20" font-weight="bold" fill="#fff" font-family="sans-serif">10</text><text x="116" y="64" text-anchor="middle" font-size="20" fill="#ffe9a8">＋</text><circle cx="140" cy="48" r="6" fill="#ffd54f"/><circle cx="158" cy="48" r="6" fill="#ffd54f"/><circle cx="176" cy="48" r="6" fill="#ffd54f"/><circle cx="194" cy="48" r="6" fill="#ffd54f"/><circle cx="140" cy="70" r="6" fill="#ffd54f"/><circle cx="158" cy="70" r="6" fill="#ffd54f"/><circle cx="176" cy="70" r="6" fill="#ffd54f"/><circle cx="194" cy="70" r="6" fill="#ffd54f"/><text x="167" y="106" text-anchor="middle" font-size="16" font-weight="bold" fill="#fff" font-family="sans-serif">＝ 28</text>')},
    {id:'sho-tashi',e:'➕',t:'たしざんのコツ',b:'8＋5は、8に2を たして10、のこり3で13。「10を つくってから たす」と はやい！',
      svg:F('8 ＋ 5 ＝ 13','10を つくってから たす')},
    {id:'sho-hiki',e:'➖',t:'ひきざんのコツ',b:'13－5は、13を10と3に わけて、10－5＝5、それと3で8。「10から ひく」が ポイント。',
      svg:F('13 − 5 ＝ 8','10から ひいて かんがえる')},
    {id:'sho-kuku',e:'✖️',t:'九九のひみつ',b:'7×6は 7×5＝35に 7を たして42。九九は たしざんの くりかえし。じゅんばんを かえても こたえは おなじ！',
      svg:SVG(DOTS(7,6)+'<text x="192" y="50" text-anchor="middle" font-size="15" fill="#cfe3ff" font-family="sans-serif">7 × 6</text><text x="192" y="86" text-anchor="middle" font-size="30" font-weight="bold" fill="#ffe9a8">42</text>')},
    {id:'sho-bunsu',e:'🍕',t:'分数って何',b:'1/2は ピザを2つに わった1きれ。たすときは 分母（下の数）を そろえてから 上を たすよ。',
      svg:SVG('<path d="M70,60 L70,20 A40,40 0 0 1 110,60 Z" fill="#ff8a9b"/><path d="M70,60 L110,60 A40,40 0 0 1 70,100 Z" fill="#ff8a9b"/><path d="M70,60 L70,100 A40,40 0 0 1 30,60 Z" fill="#ff8a9b"/><path d="M70,60 L30,60 A40,40 0 0 1 70,20 Z" fill="#3a2233"/><circle cx="70" cy="60" r="40" fill="none" stroke="#ffe9a8" stroke-width="2"/><line x1="30" y1="60" x2="110" y2="60" stroke="#ffe9a8" stroke-width="1.5"/><line x1="70" y1="20" x2="70" y2="100" stroke="#ffe9a8" stroke-width="1.5"/><text x="175" y="56" text-anchor="middle" font-size="34" font-weight="bold" fill="#ffe9a8">¾</text><text x="175" y="84" text-anchor="middle" font-size="14" fill="#9fb0d0" font-family="sans-serif">½ ＋ ¼</text>')},
    {id:'sho-sankaku',e:'📐',t:'三角形の面積',b:'三角形は 長方形の はんぶん。だから「底辺×高さ÷2」。÷2を わすれないでね。',
      svg:SVG('<polygon points="40,92 170,92 95,34" fill="rgba(126,200,80,.25)" stroke="#7ec850" stroke-width="2"/><line x1="95" y1="34" x2="95" y2="92" stroke="#ffe9a8" stroke-width="1.5" stroke-dasharray="5 3"/><path d="M95,82 L105,82 L105,92" fill="none" stroke="#ffe9a8" stroke-width="1.2"/><text x="105" y="108" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">底辺</text><text x="58" y="64" font-size="12" fill="#cfe3ff" font-family="sans-serif">高さ</text><text x="205" y="58" text-anchor="middle" font-size="22" font-weight="bold" fill="#ffe9a8">÷2</text>')},
    {id:'sho-en',e:'⭕',t:'円の面積',b:'円を こまかく切って ならべると 長方形に なる。たて＝半径、よこ＝円周の半分。だから 半径×半径×3.14。',
      svg:SVG('<circle cx="78" cy="60" r="42" fill="rgba(255,213,79,.18)" stroke="#ffd54f" stroke-width="2"/><circle cx="78" cy="60" r="3" fill="#ffe9a8"/><line x1="78" y1="60" x2="120" y2="60" stroke="#ffe9a8" stroke-width="2"/><text x="98" y="53" text-anchor="middle" font-size="14" fill="#ffe9a8">r</text><text x="188" y="56" text-anchor="middle" font-size="26" font-weight="bold" fill="#ffe9a8">πr²</text><text x="188" y="80" text-anchor="middle" font-size="11" fill="#9fb0d0" font-family="sans-serif">半径×半径×3.14</text>')},
    {id:'sho-puzzle',e:'🧩',t:'きまりを見つける',b:'1,2,4,8…は 2ばいずつ。数の ならびには かならず「きまり」が かくれている。見つけると 未来が よめる！',
      svg:SVG('<g font-size="22" font-weight="bold" font-family="Georgia"><text x="22" y="72" fill="#7ec850">1</text><text x="70" y="72" fill="#7ec850">2</text><text x="118" y="72" fill="#7ec850">4</text><text x="164" y="72" fill="#7ec850">8</text><text x="200" y="72" fill="#ffd54f">16</text></g><g fill="none" stroke="#9fb0d0" stroke-width="1.6"><path d="M34,60 Q48,42 60,60"/><path d="M82,60 Q96,42 108,60"/><path d="M130,60 Q144,42 154,60"/><path d="M176,60 Q190,42 200,60"/></g><g fill="#9fb0d0" font-size="11" font-family="sans-serif" text-anchor="middle"><text x="47" y="38">×2</text><text x="95" y="38">×2</text><text x="142" y="38">×2</text><text x="188" y="38">×2</text></g>')}
  ]
},

/* ───────────────────────── 1階層下：中学生（洞窟・岩場） ───────────────────────── */
chu:{
  zone:'chu', kids:false, border:'#', decor:'cave',
  title:'文字の洞窟', depth:'B1 ─ 中学生フィールド',
  theme:{bg:'#0c0a14', floorA:'#2c2636', floorB:'#272031', accent:'#8be0ff', wall:'#3a3346'},
  boss:2, bossName:'関数の壁', bossEmoji:'🐲', bossPage:'/math-site/boss_2.html',
  requireBoss:1, requireBossPage:'/math-site/boss_1.html', requireBossName:'文字式の壁',
  up:{href:'/math-site/sho/map.html', name:'地上（森）にもどる'},
  next:{href:'/math-site/ko/map.html', name:'高校フィールド（遺跡）'},
  map:[
    '###################',
    '#P..R....RR....E..#',
    '#..RR.......C....R#',
    '#.E....C......RR..#',
    '#...RR....E......C#',
    '#.C.....RR.....E..#',
    '#....E......C..R..#',
    '#.RR.....C.....R..#',
    '#U..C...RR....E...#',
    '#B...E.....C....S.#',
    '#...RR.......R....#',
    '###################'
  ],
  enemies:[
    E('👤','シャドウX',46,'#90a4ae',[
      {q:'a×3 を文字式のルールで書くと？',c:['3a','a3','3×a'],a:0,exp:'数字を前に置き、×記号は省略する。'},
      {q:'x＋x＋x を簡単にすると？',c:['x³','3x','3＋x'],a:1,exp:'xが3個ぶんで 3x。x³は x×x×x なので別物。'},
      {q:'1個150円のりんごを n個買う。代金は？',c:['150＋n 円','n÷150 円','150n 円'],a:2,exp:'150×n。×を省略して 150n。'}
    ]),
    E('⚖️','バランスキメラ',48,'#b39ddb',[
      {q:'x＋7＝15 のとき、xは？',c:['8','7','22'],a:0,exp:'両辺から7を引いて x＝8。天秤の両側から同じだけ取る。'},
      {q:'3x＝12 のとき、xは？',c:['36','4','9'],a:1,exp:'両辺を3で割って x＝4。'},
      {q:'2x－3＝7。最初の一手は？',c:['両辺を2で割る','両辺から7を引く','両辺に3を足す'],a:2,exp:'まず＋3で 2x＝10。それから2で割って x＝5。'}
    ]),
    E('🐺','グラフウルフ',50,'#81d4fa',[
      {q:'y＝2x＋3 の「傾き」は？',c:['3','2','x'],a:1,exp:'xが1増えるとyが2増える。それが傾き。'},
      {q:'y＝2x＋3 がy軸と交わる点は？',c:['(0, 3)','(3, 0)','(0, 2)'],a:0,exp:'x＝0のとき y＝3。切片はy軸との交点。'},
      {q:'傾きがマイナスの直線は？',c:['右上がり','水平','右下がり'],a:2,exp:'xが増えるとyが減る＝右下がり。'}
    ]),
    E('🦅','パラボラファルコン',52,'#4fc3f7',[
      {q:'y＝(x－2)²＋1 の頂点は？',c:['(2, 1)','(－2, 1)','(2, －1)'],a:0,exp:'y＝a(x－p)²＋q の頂点は (p, q)。'},
      {q:'y＝ax² で aを大きくすると、放物線は？',c:['開きが広がる','細く急になる','変わらない'],a:1,exp:'同じxでもyが大きく跳ね上がり、細く急になる。'},
      {q:'y＝－x² のグラフは？',c:['上に凸（山型）','下に凸（谷型）','直線になる'],a:0,exp:'aが負なら上に凸＝山型。'}
    ]),
    E('🦂','ピタゴラスコーピオン',54,'#ff8a65',[
      {q:'直角をはさむ2辺が 3と4。斜辺は？',c:['6','5','7'],a:1,exp:'3²＋4²＝9＋16＝25＝5²。'},
      {q:'三平方の定理 a²＋b²＝c² が成り立つのは？',c:['直角三角形','すべての三角形','二等辺三角形だけ'],a:0,exp:'直角三角形だけ。逆に成り立てば直角と分かる。'},
      {q:'斜辺13、一辺5の直角三角形。残りの辺は？',c:['8','18','12'],a:2,exp:'13²－5²＝169－25＝144＝12²。'}
    ])
  ],
  cards:[
    {id:'chu-moji',e:'✏️',t:'文字式の正体',b:'文字は「なんでも入る箱」。a×3は 3a（×は省略・数字が前）。x＋x＋x＝3x。一文字で 無限の場合をまとめて表せる。',
      svg:F('a × 3 ＝ 3a','×は はぶき 数字を前に')},
    {id:'chu-hou',e:'⚖️',t:'方程式＝天秤',b:'＝は 左右がつり合った天秤。両側から 同じだけ 引いたり割ったりして xを取り出す。x＋7＝15 → x＝8。',
      svg:SVG('<line x1="40" y1="44" x2="200" y2="44" stroke="#e8c96b" stroke-width="3"/><polygon points="120,44 108,80 132,80" fill="#b08d57"/><line x1="60" y1="44" x2="60" y2="62" stroke="#9fb0d0" stroke-width="1.5"/><line x1="180" y1="44" x2="180" y2="62" stroke="#9fb0d0" stroke-width="1.5"/><path d="M44,62 a16,9 0 0 0 32,0" fill="none" stroke="#cfe3ff" stroke-width="2"/><path d="M164,62 a16,9 0 0 0 32,0" fill="none" stroke="#cfe3ff" stroke-width="2"/><text x="60" y="58" text-anchor="middle" font-size="13" fill="#fff" font-family="sans-serif">x+7</text><text x="180" y="58" text-anchor="middle" font-size="13" fill="#fff" font-family="sans-serif">15</text><text x="120" y="102" text-anchor="middle" font-size="12" fill="#9fb0d0" font-family="sans-serif">両側から 7をひく → x=8</text>')},
    {id:'chu-ikiji',e:'📈',t:'一次関数の傾きとは',b:'y＝2x＋3 の「2」が傾き。xが1増えると yが2増える「変化の割合」。3は y軸との交点（切片）。',
      svg:SVG('<line x1="30" y1="92" x2="222" y2="92" stroke="#5a6b85" stroke-width="1.5"/><line x1="48" y1="16" x2="48" y2="100" stroke="#5a6b85" stroke-width="1.5"/><line x1="48" y1="80" x2="208" y2="28" stroke="#67e8f9" stroke-width="2.5"/><line x1="112" y1="60" x2="150" y2="60" stroke="#ffe9a8" stroke-width="1.3" stroke-dasharray="3 2"/><line x1="150" y1="60" x2="150" y2="47" stroke="#ffe9a8" stroke-width="1.3" stroke-dasharray="3 2"/><text x="130" y="74" text-anchor="middle" font-size="11" fill="#ffe9a8">1</text><text x="158" y="56" font-size="11" fill="#ffe9a8">2</text><text x="200" y="22" text-anchor="middle" font-size="13" fill="#67e8f9">y=2x+3</text>')},
    {id:'chu-niji',e:'🌉',t:'二次関数＝放物線',b:'y＝x²のグラフは U字の曲線。y＝a(x－p)²＋q なら頂点は(p,q)。aが大きいほど 細く急に、負なら山型に。',
      svg:SVG('<line x1="30" y1="95" x2="222" y2="95" stroke="#5a6b85" stroke-width="1.5"/><line x1="125" y1="16" x2="125" y2="102" stroke="#5a6b85" stroke-width="1.5"/><path d="M72,30 Q125,118 178,30" fill="none" stroke="#67e8f9" stroke-width="2.5"/><circle cx="125" cy="74" r="3.5" fill="#ffe9a8"/><text x="150" y="70" font-size="12" fill="#ffe9a8">頂点</text><text x="196" y="40" text-anchor="middle" font-size="13" fill="#67e8f9">y=x²</text>')},
    {id:'chu-sanpei',e:'📐',t:'三平方の定理',b:'直角三角形で a²＋b²＝c²（cは斜辺）。3,4,5 や 5,12,13 が有名。直角を見抜く魔法の式。',
      svg:SVG('<polygon points="60,90 140,90 60,30" fill="rgba(103,232,249,.18)" stroke="#67e8f9" stroke-width="2"/><rect x="60" y="80" width="10" height="10" fill="none" stroke="#67e8f9" stroke-width="1.2"/><text x="50" y="64" text-anchor="end" font-size="13" fill="#cfe3ff">a</text><text x="100" y="104" text-anchor="middle" font-size="13" fill="#cfe3ff">b</text><text x="106" y="56" font-size="13" fill="#ffe9a8">c</text><text x="188" y="62" text-anchor="middle" font-size="16" font-weight="bold" fill="#ffe9a8">a²+b²</text><text x="188" y="84" text-anchor="middle" font-size="16" font-weight="bold" fill="#ffe9a8">＝ c²</text>')},
    {id:'chu-neg',e:'❄️',t:'負の数の正体',b:'0より小さい数。数直線で0の左側。「マイナス×マイナス＝プラス」は、反対の反対は元どおり、という意味。',
      svg:SVG('<text x="120" y="30" text-anchor="middle" font-size="17" font-weight="bold" fill="#ffe9a8">(−)×(−) ＝ ＋</text><line x1="20" y1="62" x2="220" y2="62" stroke="#9fb0d0" stroke-width="2"/><g stroke="#9fb0d0" stroke-width="1.3"><line x1="30" y1="56" x2="30" y2="68"/><line x1="60" y1="56" x2="60" y2="68"/><line x1="90" y1="56" x2="90" y2="68"/><line x1="120" y1="54" x2="120" y2="70"/><line x1="150" y1="56" x2="150" y2="68"/><line x1="180" y1="56" x2="180" y2="68"/><line x1="210" y1="56" x2="210" y2="68"/></g><circle cx="120" cy="62" r="4" fill="#ffe9a8"/><g fill="#9fb0d0" font-size="11" text-anchor="middle" font-family="sans-serif"><text x="30" y="84">-3</text><text x="60" y="84">-2</text><text x="90" y="84">-1</text><text x="120" y="86" fill="#ffe9a8">0</text><text x="150" y="84">1</text><text x="180" y="84">2</text><text x="210" y="84">3</text></g>')}
  ]
},

/* ───────────────────────── 2階層下：高校生（霧の遺跡） ───────────────────────── */
ko:{
  zone:'ko', kids:false, border:'#', decor:'ruins',
  title:'霧の遺跡', depth:'B2 ─ 高校生フィールド',
  theme:{bg:'#101820', floorA:'#39424f', floorB:'#333b47', accent:'#9fe8da', wall:'#566072'},
  boss:3, bossName:'εδの壁', bossEmoji:'👁️', bossPage:'/math-site/boss_3.html',
  requireBoss:2, requireBossPage:'/math-site/boss_2.html', requireBossName:'関数の壁',
  up:{href:'/math-site/chu/map.html', name:'洞窟にもどる'},
  next:{href:'/math-site/dai/map.html', name:'大学フィールド（浮遊島）'},
  map:[
    '###################',
    '#P..C...R....E...C#',
    '#..RR.......R.....#',
    '#.E.....C......RR.#',
    '#...R.....E.....C.#',
    '#.C....RR.....E...#',
    '#....E.....C...R..#',
    '#.RR....C......R..#',
    '#U...E....RR.....C#',
    '#B....C....E....S.#',
    '#..R......R.......#',
    '###################'
  ],
  enemies:[
    E('🌊','シヌソイドの幻影',56,'#4dd0e1',[
      {q:'sin 30° の値は？',c:['1/2','√3/2','1'],a:0,exp:'30°-60°-90°の三角形。斜辺2に対し、30°の向かいの辺は1。'},
      {q:'sin²θ＋cos²θ の値は？',c:['θによって変わる','常に1','常に0'],a:1,exp:'単位円上の点(cosθ, sinθ)。原点からの距離は常に1──三平方の定理そのもの。'},
      {q:'tanθ が図形的に表すものは？',c:['原点を通る直線の傾き','扇形の面積','円の周期'],a:0,exp:'tanθ＝sinθ/cosθ＝縦/横＝傾き。'}
    ]),
    E('⚡','タンジェントの影',60,'#9575cd',[
      {q:'f(x)＝x² の導関数は？',c:['x','x³/3','2x'],a:2,exp:'定義 lim{f(x＋h)－f(x)}/h から (x²)′＝2x。'},
      {q:'微分係数 f′(a) の図形的な意味は？',c:['x＝aでの接線の傾き','x＝aまでの面積','y切片の値'],a:0,exp:'限りなく近い2点を結ぶ直線の極限＝接線の傾き。'},
      {q:'f′(a)＝0 となる点で起こりうるのは？',c:['必ず最大になる','極大・極小の候補','グラフが切れる'],a:1,exp:'接線が水平になる点。y＝x³ の原点のような例外もある。'}
    ]),
    E('🧱','リーマンの壁兵',62,'#a1887f',[
      {q:'∫₀¹ x dx の値は？',c:['1','1/2','0'],a:1,exp:'y＝x の下にできる三角形。1×1÷2＝1/2。'},
      {q:'定積分の正体は、何の極限？',c:['接線の傾きの平均','細い長方形の面積の和','数列の差'],a:1,exp:'幅を限りなく細くした長方形の和──リーマン和の極限。'},
      {q:'F′(x)＝f(x) のとき、∫ₐᵇ f(x)dx は？',c:['F(b)－F(a)','F(a)－F(b)','F(b)×F(a)'],a:0,exp:'微積分学の基本定理。微分の逆演算が面積を与える。'}
    ]),
    E('🚪','大学の門番',66,'#7986cb',[
      {q:'「すべてのxでP(x)」の否定は？',c:['すべてのxでP(x)でない','あるxでP(x)でない','P(x)は常に真'],a:1,exp:'全否定ではなく「反例が1つ存在する」。'},
      {q:'高校の「限りなく近づく」が大学で問題になる理由は？',c:['曖昧で証明の道具にならない','計算が遅い','答えが変わる'],a:0,exp:'「近づく」を数式で定義しない限り、厳密な証明は書けない。'},
      {q:'なぜ厳密な定義が必要？',c:['伝統のため','試験のため','直感が裏切られる例が実在するから'],a:2,exp:'至るところ微分不可能な連続関数など、直感を超える存在が実在する。'}
    ]),
    E('🌫️','イプシロンの霧',70,'#b0bec5',[
      {q:'lim x→a f(x)＝L のε-δ定式化は？',c:['任意のε>0に対し あるδ>0が存在し…','あるε>0に対し 任意のδ>0で…','ε＝δと選ぶ'],a:0,exp:'どんな小さな許容誤差εにも 応じるδを返せる──それが「近づく」の正体。'},
      {q:'はさみうちの原理が使える条件は？',c:['両側の極限が同じ値に収束','片側だけ収束','中央が単調増加'],a:0,exp:'g≦f≦h で lim g＝lim h＝L なら lim f＝L。'},
      {q:'1/n は n→∞ でどうなる？',c:['0に近づく','1に近づく','∞に発散'],a:0,exp:'nが大きいほど 1/n は限りなく0へ。'}
    ])
  ],
  cards:[
    {id:'ko-sin',e:'🌊',t:'sinとcosの正体',b:'単位円（半径1の円）上の点の、たて＝sinθ、よこ＝cosθ。だから sin²θ＋cos²θ＝1。三平方の定理そのもの。',
      svg:SVG('<line x1="20" y1="62" x2="150" y2="62" stroke="#5a6b85" stroke-width="1.5"/><line x1="80" y1="14" x2="80" y2="106" stroke="#5a6b85" stroke-width="1.5"/><circle cx="80" cy="62" r="40" fill="none" stroke="#9fb0d0" stroke-width="1.5"/><line x1="80" y1="62" x2="111" y2="36" stroke="#67e8f9" stroke-width="2.5"/><line x1="111" y1="36" x2="111" y2="62" stroke="#ff8a9b" stroke-width="2" stroke-dasharray="3 2"/><line x1="80" y1="62" x2="111" y2="62" stroke="#7ec850" stroke-width="2.5"/><circle cx="111" cy="36" r="3" fill="#ffe9a8"/><text x="118" y="48" font-size="11" fill="#ff8a9b">sin</text><text x="92" y="76" font-size="11" fill="#7ec850">cos</text><text x="186" y="56" text-anchor="middle" font-size="13" fill="#cfe3ff">sin²+cos²</text><text x="186" y="78" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffe9a8">= 1</text>')},
    {id:'ko-bibun',e:'🎢',t:'微分のイメージ',b:'微分は「その瞬間の傾き」。曲線の1点に引いた接線の傾き。速さ＝位置の微分。変化を捉える道具。',
      svg:SVG('<path d="M30,96 Q95,18 212,52" fill="none" stroke="#9fb0d0" stroke-width="2.5"/><line x1="66" y1="80" x2="190" y2="38" stroke="#ff8a9b" stroke-width="2"/><circle cx="125" cy="55" r="4" fill="#ffe9a8"/><text x="138" y="46" font-size="12" fill="#ff8a9b">接線</text><text x="120" y="108" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">その瞬間の傾き</text>')},
    {id:'ko-sekibun',e:'🧱',t:'積分＝面積',b:'積分は「細い長方形の面積を 無限に足したもの」。微分の逆。∫ₐᵇf(x)dx＝F(b)－F(a)。',
      svg:SVG('<path d="M40,90 Q120,22 200,42 L200,95 L40,95 Z" fill="rgba(103,232,249,.2)"/><path d="M40,90 Q120,22 200,42" fill="none" stroke="#67e8f9" stroke-width="2.5"/><line x1="30" y1="95" x2="214" y2="95" stroke="#5a6b85" stroke-width="1.5"/><g stroke="#67e8f9" stroke-width="0.8" opacity="0.55"><line x1="70" y1="95" x2="70" y2="58"/><line x1="100" y1="95" x2="100" y2="44"/><line x1="130" y1="95" x2="130" y2="38"/><line x1="160" y1="95" x2="160" y2="38"/><line x1="190" y1="95" x2="190" y2="43"/></g><text x="120" y="112" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">細い長方形の面積の和</text>')},
    {id:'ko-epsilon',e:'👁️',t:'εδ・厳密さ',b:'「限りなく近づく」を数式で定義したもの。どんな小さな誤差εにも 応じるδを返せる──それが極限の正体。',
      svg:F('∀ε&gt;0  ∃δ&gt;0','どんな誤差εにも δで応える')},
    {id:'ko-kyoku',e:'🔭',t:'極限とは',b:'近づいた先の値。1/nは nが大きくなると 限りなく0へ。届かなくても「向かう先」を数学は捉える。',
      svg:SVG('<line x1="30" y1="64" x2="215" y2="64" stroke="#9fb0d0" stroke-width="2"/><circle cx="40" cy="64" r="5" fill="#ffe9a8"/><circle cx="205" cy="64" r="4" fill="#67e8f9"/><circle cx="122" cy="64" r="4" fill="#67e8f9"/><circle cx="95" cy="64" r="4" fill="#67e8f9"/><circle cx="81" cy="64" r="4" fill="#67e8f9"/><circle cx="73" cy="64" r="4" fill="#67e8f9"/><g fill="#9fb0d0" font-size="11" text-anchor="middle" font-family="sans-serif"><text x="40" y="84">0</text><text x="205" y="84">1</text></g><text x="120" y="34" text-anchor="middle" font-size="16" font-weight="bold" fill="#ffe9a8">1/n → 0</text>')}
  ]
},

/* ───────────────────────── 3階層下：大学生（幾何学的な浮遊島） ───────────────────────── */
dai:{
  zone:'dai', kids:false, border:'R', decor:'island',
  title:'抽象の浮遊島', depth:'B3 ─ 大学生フィールド',
  theme:{bg:'#070b18', floorA:'#162343', floorB:'#13203c', accent:'#67e8f9', wall:'#2a3f6e'},
  boss:4, bossName:'抽象の壁', bossEmoji:'💠', bossPage:'/math-site/boss_4.html',
  requireBoss:3, requireBossPage:'/math-site/boss_3.html', requireBossName:'εδの壁',
  up:{href:'/math-site/ko/map.html', name:'遺跡にもどる'},
  next:{href:'/math-site/in/map.html', name:'大学院フィールド（虚空）'},
  map:[
    'RRRRRRRRRRRRRRRRRRR',
    'RP..C...R....E...CR',
    'R..RR.......R.....R',
    'R.E.....C......RR.R',
    'R...R.....E.....C.R',
    'R.C....RR.....E...R',
    'R....E.....C...R..R',
    'R.RR....C......E..R',
    'RU...C....RR....CR',
    'RB....E....C....SR',
    'R..R......R.......R',
    'RRRRRRRRRRRRRRRRRRR'
  ],
  enemies:[
    E('🧮','次元の番人',66,'#4dd0e1',[
      {q:'線形写像 f:R⁵→R³ で rank f＝3。dim Ker f は？',c:['3','2','5'],a:1,exp:'次元定理：dim Ker f＋rank f＝5。5－3＝2。'},
      {q:'線形写像の定義に含まれる条件は？',c:['f(x＋y)＝f(x)＋f(y) かつ f(cx)＝cf(x)','f(xy)＝f(x)f(y)','f(x)≧0'],a:0,exp:'和とスカラー倍を保つ──線形性。'},
      {q:'rank f が表すものは？',c:['核 Ker f の次元','行列の成分の個数','像 Im f の次元'],a:2,exp:'写像がつぶさず残せた次元の数。'}
    ]),
    E('🔁','対称の精霊',70,'#9575cd',[
      {q:'群の公理に含まれないものは？',c:['結合法則','可換性（ab＝ba）','逆元の存在'],a:1,exp:'可換性は不要。可換な群はアーベル群と呼ぶ。'},
      {q:'整数の群 (Z, ＋) の単位元は？',c:['0','1','－1'],a:0,exp:'a＋0＝a。加法の単位元は0。'},
      {q:'3次対称群 S₃ の位数（元の個数）は？',c:['3','9','6'],a:2,exp:'3つの並べ替えは 3!＝6通り。最小の非可換群。'}
    ]),
    E('🌀','複素の渦',74,'#4fc3f7',[
      {q:'e^iπ の値は？',c:['－1','1','i'],a:0,exp:'オイラーの公式 e^iθ＝cosθ＋isinθ に θ＝π。'},
      {q:'正則関数が満たす方程式は？',c:['波動方程式','コーシー・リーマンの方程式','熱方程式'],a:1,exp:'u_x＝v_y, u_y＝－v_x。複素微分可能性の翻訳。'},
      {q:'虚数 i を掛けることは、平面上で何を表す？',c:['90°回転','平行移動','拡大だけ'],a:0,exp:'iを掛ける＝反時計回りに90°回す。'}
    ]),
    E('🎵','周波数の歌い手',76,'#4db6ac',[
      {q:'フーリエ級数は、関数を何の和に分解する？',c:['sinとcos（純粋な波）','多項式','階段関数'],a:0,exp:'どんな周期関数も 純音の重ね合わせで書ける。'},
      {q:'スペクトルが表すのは？',c:['関数の最大値','各周波数成分の強さ','微分可能な回数'],a:1,exp:'どの高さの純音が どれだけ含まれるかの一覧。'},
      {q:'矩形波のフーリエ係数は、高周波になるほど？',c:['一定のまま','増大する','1/n で減衰'],a:2,exp:'角があると減衰が遅い。滑らかさと係数の減衰は表裏一体。'}
    ]),
    E('🔢','素数の鉱夫',78,'#ffb74d',[
      {q:'フェルマーの小定理：pが素数、aがpと互いに素のとき？',c:['a^(p－1) ≡ 1 (mod p)','a^p ≡ 0 (mod p)','a ≡ p (mod a)'],a:0,exp:'mod p では p－1乗で1に戻る。'},
      {q:'17 mod 5 は？',c:['3','2','1'],a:1,exp:'17＝5×3＋2。余りは2。'},
      {q:'RSA暗号の安全性が依拠するのは？',c:['円周率の無理性','行列の可逆性','巨大な数の素因数分解の困難さ'],a:2,exp:'掛けるのは一瞬、分解は天文学的時間。その非対称性。'}
    ]),
    E('🌐','多様体の獣',82,'#81c784',[
      {q:'grad f（勾配）が指す方向は？',c:['fが最も急に増える方向','等高線に沿う方向','常にx軸方向'],a:0,exp:'等高線に直交し、最大増加の方向を向く。'},
      {q:'ストークスの定理が結びつけるのは？',c:['微分と極限','領域内部の積分と境界の積分','行列と行列式'],a:1,exp:'∫_M dω＝∫_∂M ω。境界が内部を語る。'},
      {q:'コーヒーカップとドーナツが「同じ形」とされる幾何学は？',c:['位相幾何学（トポロジー）','ユークリッド幾何','解析幾何'],a:0,exp:'穴の数が同じなら同相。伸縮は許され、切断は禁止。'}
    ])
  ],
  cards:[
    {id:'dai-dim',e:'🧮',t:'次元定理',b:'線形写像で「つぶれた次元＋残った次元＝元の次元」。dim Ker f ＋ rank f ＝ n。空間の骨格を測る定理。',
      svg:F('dim Ker f + rank f','= n  （次元定理）')},
    {id:'dai-gun',e:'🔁',t:'群とは何か',b:'「演算・結合法則・単位元・逆元」をもつ集合。回転や対称性の正体。数の足し算も あみだくじも 群。',
      svg:SVG('<polygon points="90,30 64,80 116,80" fill="rgba(179,157,219,.22)" stroke="#b39ddb" stroke-width="2"/><path d="M124,32 A60,60 0 0 1 150,86" fill="none" stroke="#ffe9a8" stroke-width="2"/><polygon points="150,86 142,76 154,75" fill="#ffe9a8"/><text x="120" y="110" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">回してもピタリ重なる＝対称性</text>')},
    {id:'dai-fukuso',e:'🌀',t:'複素＝回転',b:'虚数iを掛けると 90°回転。e^iθ＝cosθ＋isinθ。複素数は 平面上の「回転と拡大」を表す数。',
      svg:SVG('<line x1="20" y1="62" x2="184" y2="62" stroke="#5a6b85" stroke-width="1.5"/><line x1="100" y1="12" x2="100" y2="108" stroke="#5a6b85" stroke-width="1.5"/><line x1="100" y1="62" x2="150" y2="62" stroke="#67e8f9" stroke-width="2.5"/><line x1="100" y1="62" x2="100" y2="14" stroke="#ff8a9b" stroke-width="2.5"/><path d="M150,62 A50,50 0 0 0 100,12" fill="none" stroke="#ffe9a8" stroke-width="1.5" stroke-dasharray="3 2"/><text x="156" y="60" font-size="12" fill="#67e8f9">1</text><text x="104" y="22" font-size="12" fill="#ff8a9b">i</text><text x="138" y="38" font-size="11" fill="#ffe9a8">90°</text><text x="205" y="64" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">×i で 回転</text>')},
    {id:'dai-fourier',e:'🎵',t:'フーリエ＝波の分解',b:'どんな波も、純粋なsin・cosの和に分解できる。音も画像も この技で 周波数に切り分けられる。',
      svg:SVG('<path d="M20,38 C50,8 70,68 100,38 C130,8 150,68 180,38 C200,18 212,52 222,38" fill="none" stroke="#67e8f9" stroke-width="2.5"/><text x="120" y="72" text-anchor="middle" font-size="15" fill="#ffe9a8">=</text><path d="M20,92 Q45,74 70,92 T120,92 T170,92 T220,92" fill="none" stroke="#9fb0d0" stroke-width="1.6"/><path d="M20,92 Q33,82 45,92 T70,92 T95,92 T120,92 T145,92 T170,92 T195,92 T220,92" fill="none" stroke="#b39ddb" stroke-width="1.4"/><text x="120" y="110" text-anchor="middle" font-size="11" fill="#cfe3ff" font-family="sans-serif">純粋な波の重ね合わせ</text>')},
    {id:'dai-mod',e:'🔢',t:'合同式',b:'時計の数学。17 mod 5 ＝ 2（5で割った余り）。RSA暗号は 素因数分解の難しさに守られている。',
      svg:SVG('<circle cx="70" cy="60" r="40" fill="none" stroke="#9fb0d0" stroke-width="2"/><circle cx="70" cy="20" r="3" fill="#9fb0d0"/><text x="70" y="14" text-anchor="middle" font-size="11" fill="#cfe3ff">0</text><circle cx="108" cy="48" r="3" fill="#9fb0d0"/><text x="120" y="46" font-size="11" fill="#cfe3ff">1</text><circle cx="94" cy="92" r="5" fill="#ffe9a8"/><text x="106" y="104" font-size="12" font-weight="bold" fill="#ffe9a8">2</text><circle cx="46" cy="92" r="3" fill="#9fb0d0"/><text x="32" y="104" font-size="11" fill="#cfe3ff">3</text><circle cx="32" cy="48" r="3" fill="#9fb0d0"/><text x="18" y="46" font-size="11" fill="#cfe3ff">4</text><line x1="70" y1="60" x2="94" y2="92" stroke="#ffe9a8" stroke-width="2"/><text x="186" y="56" text-anchor="middle" font-size="14" fill="#cfe3ff">17 mod 5</text><text x="186" y="80" text-anchor="middle" font-size="20" font-weight="bold" fill="#ffe9a8">= 2</text>')},
    {id:'dai-iso',e:'🌐',t:'位相の直感',b:'「つながり方」だけを見る幾何学。コーヒーカップとドーナツは 穴が1つで同じ形。伸ばしてOK、切るのはNG。',
      svg:SVG('<ellipse cx="80" cy="60" rx="52" ry="34" fill="#b39ddb" stroke="#cfb8f0" stroke-width="2"/><ellipse cx="80" cy="60" rx="20" ry="12" fill="#241a4a" stroke="#cfb8f0" stroke-width="2"/><text x="80" y="64" text-anchor="middle" font-size="11" fill="#cfe3ff" font-family="sans-serif">穴</text><text x="190" y="54" text-anchor="middle" font-size="13" fill="#cfe3ff" font-family="sans-serif">穴が1つなら</text><text x="190" y="78" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffe9a8" font-family="sans-serif">同じ形</text>')}
  ]
},

/* ───────────────────────── 4階層下：大学院（暗黒の虚空・数式の漂う空間） ───────────────────────── */
in:{
  zone:'in', kids:false, border:'R', decor:'void',
  title:'数式の虚空', depth:'B4 ─ 大学院フィールド',
  theme:{bg:'#04050d', floorA:'#0d1330', floorB:'#0a0f26', accent:'#c4b5fd', wall:'#241a4a'},
  boss:5, bossName:'研究の壁', bossEmoji:'🌌', bossPage:'/math-site/boss_5.html',
  requireBoss:4, requireBossPage:'/math-site/boss_4.html', requireBossName:'抽象の壁',
  up:{href:'/math-site/dai/map.html', name:'浮遊島にもどる'},
  next:{href:'/math-site/mikaiketsu.html', name:'未解決問題の世界'},
  map:[
    'RRRRRRRRRRRRRRRRRRR',
    'RP....C......E....R',
    'R....RR.........C.R',
    'R..E......C.......R',
    'R......RR......E..R',
    'R.C........E......R',
    'R....RR.......C...R',
    'RU......C....R....R',
    'RB....E.........SR',
    'R...RR.......R....R',
    'RRRRRRRRRRRRRRRRRRR'
  ],
  enemies:[
    E('📜','証明の番人',84,'#b39ddb',[
      {q:'「すべての偶数は2で割り切れる」を証明する第一歩は？',c:['偶数を 2k と置く','例を3つ挙げる','割り算してみる'],a:0,exp:'任意の偶数は整数kを使い 2k と書ける──一般化が証明の出発点。'},
      {q:'反例が1つ見つかると、その主張は？',c:['偽だと分かる','まだ正しいかも','証明できる'],a:0,exp:'全称命題は 反例ひとつで崩れる。'},
      {q:'背理法とは？',c:['結論を否定して矛盾を導く','例を集める','図を描く'],a:0,exp:'「成り立たない」と仮定し 矛盾を導く→だから成り立つ。'}
    ]),
    E('🔮','予想の亡霊',92,'#9575cd',[
      {q:'「予想」と「定理」の違いは？',c:['証明されたかどうか','難しさ','分野'],a:0,exp:'証明されて初めて定理。未証明なら予想。'},
      {q:'フェルマーの最終定理が長く未解決だった理由は？',c:['証明が極めて難しかった','間違っていた','誰も知らなかった'],a:0,exp:'1994年ワイルズが証明するまで350年以上かかった。'},
      {q:'数学で「正しい」とは最終的に？',c:['証明があること','多数決','実験'],a:0,exp:'証明だけが真理を保証する。'}
    ]),
    E('♾️','無限の使者',100,'#7dd3fc',[
      {q:'自然数と偶数、個数は？',c:['同じ（1対1対応）','自然数が多い','比べられない'],a:0,exp:'n↔2n で全単射。無限では「部分＝全体」が起こりうる。'},
      {q:'カントールの対角線論法が示したのは？',c:['実数は自然数より多い','すべて同じ','無限はない'],a:0,exp:'実数は数え切れない──非可算無限。'},
      {q:'「数えられる無限」を何という？',c:['可算無限','連続無限','有限'],a:0,exp:'可算無限（濃度アレフゼロ）。'}
    ]),
    E('🌌','未解決の影',110,'#a78bfa',[
      {q:'P≠NP問題は何の問題？',c:['計算の難しさ（計算量）','図形','確率'],a:0,exp:'答えの検証は速いが、発見も速いか？ミレニアム問題のひとつ。'},
      {q:'リーマン予想は何に関する？',c:['素数の分布','円周率','三角形'],a:0,exp:'ゼータ関数の零点と素数の並びの謎。'},
      {q:'未解決問題に挑むとは？',c:['誰も知らない答えを探すこと','暗記','過去問演習'],a:0,exp:'正解の保証がない──それが研究だ。'}
    ])
  ],
  cards:[
    {id:'in-proof',e:'📜',t:'証明とは',b:'「これは絶対に正しい」を、誰が見ても認めるしかない形で示すこと。実験や例では足りない。仮定から結論まで、論理だけで橋を架ける。',
      svg:SVG('<rect x="18" y="44" width="60" height="34" rx="6" fill="rgba(179,157,219,.2)" stroke="#b39ddb" stroke-width="1.6"/><text x="48" y="65" text-anchor="middle" font-size="13" fill="#fff" font-family="sans-serif">仮定</text><rect x="162" y="44" width="60" height="34" rx="6" fill="rgba(179,157,219,.2)" stroke="#b39ddb" stroke-width="1.6"/><text x="192" y="65" text-anchor="middle" font-size="13" fill="#fff" font-family="sans-serif">結論</text><line x1="82" y1="61" x2="158" y2="61" stroke="#ffe9a8" stroke-width="2"/><polygon points="158,61 148,55 148,67" fill="#ffe9a8"/><text x="120" y="50" text-anchor="middle" font-size="12" fill="#ffe9a8" font-family="sans-serif">論理だけで</text><text x="120" y="100" text-anchor="middle" font-size="11" fill="#9fb0d0" font-family="sans-serif">例ではなく 証明でつなぐ</text>')},
    {id:'in-counter',e:'⚡',t:'反例の力',b:'どんなに多くの例で成り立っても証明にはならない。だが たった1つの反例は 主張を完全に打ち砕く。「すべて」を覆すのは「ひとつ」。',
      svg:SVG('<g text-anchor="middle"><text x="40" y="66" font-size="30" fill="#7ec850">✓</text><text x="80" y="66" font-size="30" fill="#7ec850">✓</text><text x="120" y="66" font-size="30" fill="#7ec850">✓</text><text x="178" y="68" font-size="44" fill="#ff5a5a">✗</text></g><text x="120" y="100" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">どれだけ例があっても 反例1つで崩れる</text>')},
    {id:'in-inf',e:'♾️',t:'無限のひみつ',b:'無限の世界では直感が裏切られる。自然数と偶数は「同じ個数」。でも実数はそれより「多い」。無限にも大きさの違いがある。',
      svg:SVG('<text x="55" y="28" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">自然数</text><text x="185" y="28" text-anchor="middle" font-size="12" fill="#cfe3ff" font-family="sans-serif">偶数</text><g font-size="15" fill="#fff"><text x="55" y="52" text-anchor="middle">1</text><text x="185" y="52" text-anchor="middle">2</text><text x="55" y="76" text-anchor="middle">2</text><text x="185" y="76" text-anchor="middle">4</text><text x="55" y="100" text-anchor="middle">3</text><text x="185" y="100" text-anchor="middle">6</text></g><g stroke="#ffe9a8" stroke-width="1.6"><line x1="72" y1="47" x2="166" y2="47"/><line x1="72" y1="71" x2="166" y2="71"/><line x1="72" y1="95" x2="166" y2="95"/></g><g fill="#ffe9a8"><polygon points="168,47 158,42 158,52"/><polygon points="168,71 158,66 158,76"/><polygon points="168,95 158,90 158,100"/></g>')},
    {id:'in-conj',e:'🔮',t:'予想と定理',b:'「たぶん正しい」が予想、「証明された」が定理。フェルマーの最終定理は350年間 予想だった。証明された瞬間、世界が変わる。',
      svg:SVG('<rect x="16" y="44" width="64" height="34" rx="6" fill="rgba(149,117,205,.22)" stroke="#9575cd" stroke-width="1.6"/><text x="48" y="65" text-anchor="middle" font-size="13" fill="#fff" font-family="sans-serif">予想</text><rect x="160" y="44" width="64" height="34" rx="6" fill="rgba(232,201,107,.2)" stroke="#e8c96b" stroke-width="1.6"/><text x="192" y="65" text-anchor="middle" font-size="13" fill="#ffe9a8" font-family="sans-serif">定理</text><line x1="84" y1="61" x2="156" y2="61" stroke="#ffe9a8" stroke-width="2"/><polygon points="156,61 146,55 146,67" fill="#ffe9a8"/><text x="120" y="50" text-anchor="middle" font-size="12" fill="#ffe9a8" font-family="sans-serif">証明</text><text x="120" y="98" text-anchor="middle" font-size="11" fill="#9fb0d0" font-family="sans-serif">証明された瞬間 世界が変わる</text>')},
    {id:'in-open',e:'🌌',t:'未解決問題',b:'数学にはまだ誰も解けていない問いがある。リーマン予想、P≠NP…。教科書の外側、人類の最前線。君が解く番かもしれない。',
      svg:F('P ≟ NP','ζ(s)=0 ?   人類の最前線')}
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
function qsg(n){ return n<0?'(−'+(-n)+')':'(＋'+n+')'; }
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
    function(){ var a=qrand(6,9),b=qrand(5,9),s=a+b; return Qn(a+' ＋ '+b+' ＝ ？',s,[s-1,s+2],'一の位を たしてから 十の位。10を つくると はやい。'); },
    function(){ var a=qrand(13,49),b=qrand(13,49),s=a+b; return Qn(a+' ＋ '+b+' ＝ ？',s,[s-10,s+1],'十の位どうし・一の位どうしを たそう。'); },
    function(){ var m=qrand(11,18),n=qrand(3,9),s=m-n; return Qn(m+' − '+n+' ＝ ？',s,[s+1,s-2],'10から ひいて、のこりを たす。'); },
    function(){ var a=qrand(40,99),b=qrand(11,39),s=a-b; return Qn(a+' − '+b+' ＝ ？',s,[s+10,s-1],'位ごとに ひこう。'); },
    function(){ var a=qrand(2,9),b=qrand(2,9),s=a*b; return Qn(a+' × '+b+' ＝ ？',s,[s+a,s-b],'九九を おもいだそう。'); },
    function(){ var a=qrand(11,19),b=qrand(2,9),s=a*b; return Qn(a+' × '+b+' ＝ ？',s,[s+b,s-a],'(10＋□)×'+b+' に分けて計算。'); },
    function(){ var b=qrand(2,9),ans=qrand(2,9),a=b*ans; return Qn(a+' ÷ '+b+' ＝ ？',ans,[ans+1,ans-1],b+'×?＝'+a+' を考えよう。'); },
    function(){ var b=qrand(3,9),ans=qrand(2,8),r=qrand(1,b-1),a=b*ans+r; return Qn(a+' ÷ '+b+' の あまりは？',r,[r+1,(r+2)%b],a+'＝'+b+'×'+ans+'＋'+r+'。'); },
    function(){ var d=qrand(4,8),p=qrand(1,d-2),q=qrand(1,d-p-1); return Qn(p+'/'+d+' ＋ '+q+'/'+d+' は？',(p+q)+'/'+d,[(p+q)+'/'+(2*d),(p+q+1)+'/'+d],'分母はそのまま、分子だけ たす。'); },
    function(){ return Qn('2/4 を やくぶんすると？','1/2',['1/4','2/2'],'上も下も 2でわる。'); },
    function(){ var a=qrand(1,8),b=qrand(1,8),s=a+b; return Qn(dec1(a/10)+' ＋ '+dec1(b/10)+' は？',dec1(s/10),[dec1((s+1)/10),dec1((s-1)/10)],'0.1が ('+a+'＋'+b+') こで '+dec1(s/10)+'。'); },
    function(){ var a=qrand(3,9),b=qrand(1,a-1),s=a-b; return Qn(dec1(a/10)+' − '+dec1(b/10)+' は？',dec1(s/10),[dec1((s+1)/10),dec1((s+2)/10)],'0.1が ('+a+'−'+b+') こで '+dec1(s/10)+'。'); },
    function(){ var k=qrand(1,11),m=k*5; return Qn('とけいの 長いはりが '+k+' を さしています。何分？',m,[m+5,k],'長いはりは 1で5分。'+k+'×5＝'+m+'分。'); },
    function(){ var h=qrand(1,11),ms=[15,30,45],m=ms[qrand(0,2)]; return Qn(h+'時ちょうどから '+m+'分 たつと？',h+'時'+m+'分',[(h===12?1:h+1)+'時'+m+'分',(h===1?12:h-1)+'時'+m+'分'],'時はかわらず、分だけ '+m+'分 すすむ。'); },
    function(){ var w=qrand(3,12),h=qrand(2,9),A=w*h; return Qn('たて '+h+'cm、よこ '+w+'cm の 長方形の 面積は？（cm²）',A,[2*(w+h),A+h],'たて×よこ＝'+h+'×'+w+'＝'+A+'。まわりの長さと まちがえないでね。'); },
    function(){ var s=qrand(2,12),A=s*s; return Qn('1辺 '+s+'cm の 正方形の 面積は？（cm²）',A,[4*s,2*s],'1辺×1辺＝'+s+'×'+s+'＝'+A+'。'); },
    function(){ var b=qrand(2,12),h=qrand(1,5)*2,A=b*h/2; return Qn('底辺 '+b+'cm、高さ '+h+'cm の 三角形の 面積は？（cm²）',A,[b*h,A+b],'底辺×高さ÷2＝'+b+'×'+h+'÷2＝'+A+'。÷2を わすれずに。'); },
    function(){ var x=qrand(2,20); return Qn(x+' cm は 何 mm？',x*10,[x*100,x+10],'1cm＝10mm。'); },
    function(){ var x=qrand(2,9); return Qn(x+' m は 何 cm？',x*100,[x*10,x*1000],'1m＝100cm。'); },
    function(){ var x=qrand(2,9); return Qn(x+' kg は 何 g？',x*1000,[x*100,x*10],'1kg＝1000g。'); },
    function(){ var x=qrand(2,9); return Qn(x+' L は 何 mL？',x*1000,[x*100,x*500],'1L＝1000mL。'); },
    function(){ var x=qrand(2,6); return Qn(x+' 時間は 何分？',x*60,[x*100,x*6],'1時間＝60分。'); }
  ],
  /* ── 中学生：正負の数・文字式・一次方程式・比例反比例・平行と合同・確率 ── */
  chu:[
    function(){ var a=qrand(-9,9),b=qrand(-9,9),s=a+b; return Qn(qsg(a)+' ＋ '+qsg(b)+' ＝ ？',s,[a-b,-(a+b)],'符号に注意して数直線で考える。'); },
    function(){ var a=qrand(-9,9),b=qrand(-9,9),s=a-b; return Qn(qsg(a)+' − '+qsg(b)+' ＝ ？',s,[a+b,-(a-b)],'ひく数の符号を変えて たす。'); },
    function(){ var a=qnz(),b=qnz(),p=a*b; return Qn(qsg(a)+' × '+qsg(b)+' ＝ ？',p,[-p,a+b],'同符号は＋、異符号は−。'); },
    function(){ var m=qrand(2,6),n=qrand(2,6); if(m===2&&n===2)n=3; return Qn(m+'x ＋ '+n+'x ＝ ？',(m+n)+'x',[(m*n)+'x',(m+n)+'x²'],'同類項は係数をたす。x²にはならない。'); },
    function(){ var m=qrand(5,9),n=qrand(1,m-1); return Qn(m+'x − '+n+'x ＝ ？',(m-n)+'x',[(m+n)+'x',m+'x'],'係数を ひく：'+m+'−'+n+'。'); },
    function(){ var c1=qrand(2,5),c0=qrand(1,9),x=qrand(2,6),v=c1*x+c0; return Qn('x＝'+x+' のとき '+c1+'x ＋ '+c0+' の値は？',v,[c1*x,c1+x+c0],c1+'×'+x+'＋'+c0+'＝'+v+'。'); },
    function(){ var a=qrand(1,9),x=qrand(1,12),b=x+a; return Qn('x ＋ '+a+' ＝ '+b+'。x は？',x,[b+a,a-b],'両辺から '+a+' をひく。'); },
    function(){ var a=qrand(2,9),x=qrand(2,9),b=a*x; return Qn(a+'x ＝ '+b+'。x は？',x,[b-a,b+a],'両辺を '+a+' でわる。'); },
    function(){ var a=qrand(2,5),x=qrand(2,8),b=qrand(1,9),c=a*x+b; return Qn(a+'x ＋ '+b+' ＝ '+c+'。x は？',x,[c-b,x+1],'まず '+b+' を移項：'+a+'x＝'+(c-b)+'。'); },
    function(){ var k=qrand(2,5),x1=qrand(2,4),y1=k*x1,x2=qrand(5,8),y2=k*x2; return Qn('y は x に比例し、x＝'+x1+' のとき y＝'+y1+'。x＝'+x2+' のとき y は？',y2,[y1+x2,k+x2],'比例定数 k＝'+k+'、y＝'+k+'x。'); },
    function(){ var ks=[12,24,36,48],k=ks[qrand(0,3)],ds=[],i; for(i=2;i<=12;i++) if(k%i===0) ds.push(i); qshuf(ds); var x1=ds[0],x2=ds[1]; return Qn('y は x に反比例し、x＝'+x1+' のとき y＝'+(k/x1)+'。x＝'+x2+' のとき y は？',k/x2,[k-x2,k/x1],'反比例は xy＝一定。k＝'+k+'、y＝'+k+'/x。'); },
    function(){ var t=qrand(1,6); return Qn('1個のサイコロで '+t+' の目が出る確率は？','1/6',['1/3','1/2'],'6通り中 1通り。'); },
    function(){ return Qn('1個のサイコロで 偶数の目が出る確率は？','1/2',['1/3','2/3'],'2・4・6 の3通り＝3/6＝1/2。'); },
    function(){ return Qn('コインを2枚投げて 両方とも表になる確率は？','1/4',['1/2','1/3'],'表表・表裏・裏表・裏裏の4通り中 1通り。'); },
    function(){ var n=qrand(4,8),w=qrand(1,n-2); return Qn(n+'本のくじに 当たりが '+w+'本。1本引いて 当たる確率は？',w+'/'+n,[n+'/'+w,w+'/'+(n-w)],'当たり'+w+' ÷ 全部'+n+'。'); },
    function(){ return Qn('三角形の 3つの内角の和は？','180°',['360°','90°'],'どんな三角形でも 180°。'); },
    function(){ return Qn('四角形の 4つの内角の和は？','360°',['180°','720°'],'対角線で三角形2つに分けると 180°×2。'); },
    function(){ return Qn('交わる2直線の 対頂角どうしは？','等しい',['たすと90°','たすと180°'],'向かい合う角は つねに等しい。'); },
    function(){ return Qn('平行線に1本の直線が交わるとき、錯角は？','等しい',['たすと180°','たすと90°'],'平行なら 錯角・同位角は等しい。'); },
    function(){ return Qn('三角形の 合同条件でないものは？','3つの角がそれぞれ等しい',['3辺がそれぞれ等しい','2辺とその間の角が等しい'],'角だけ等しいのは「相似」。大きさは決まらない。'); }
  ],
  /* ── 高校生：二次方程式・三角比・指数対数・数列・ベクトル・微分 ── */
  ko:[
    function(){ var r1=qrand(1,5),r2=qrand(r1,6),s=r1+r2,p=r1*r2; return Qn('x² − '+s+'x ＋ '+p+' ＝ 0 の解は？','x＝'+r1+', '+r2,['x＝−'+r1+', −'+r2,'x＝'+s+', '+p],'(x−'+r1+')(x−'+r2+')＝0。'); },
    function(){ var x=qrand(2,9); return Qn('x² ＝ '+(x*x)+' の 正の解は？',x,[x*x,x*2],'2乗して '+(x*x)+' になる正の数。'); },
    function(){ return Qn('sin30° の値は？','1/2',['√3/2','1'],'30°-60°-90° の辺の比 1:√3:2。'); },
    function(){ return Qn('cos60° の値は？','1/2',['√3/2','1/√2'],'60°の となり/斜辺＝1/2。'); },
    function(){ return Qn('tan45° の値は？','1',['√3','1/√3'],'直角二等辺三角形、たて＝よこ。'); },
    function(){ return Qn('sin²θ ＋ cos²θ ＝ ？','1',['0','2'],'単位円・三平方の定理そのもの。'); },
    function(){ var a=qrand(2,5),b=qrand(2,4); return Qn(a+'^'+b+' ＝ ？',Math.pow(a,b),[a*b,Math.pow(a,b)+a],a+' を '+b+'回 かける。'); },
    function(){ var a=qrand(2,4),m=qrand(2,4),n=qrand(2,3); return Qn(a+'^'+m+' × '+a+'^'+n+' ＝ '+a+'^? の ? は？',m+n,[m*n,m-n],'指数は たし算：'+m+'＋'+n+'。'); },
    function(){ var b=qrand(2,3),e=qrand(2,4),arg=Math.pow(b,e); return Qn('log_'+b+' '+arg+' ＝ ？',e,[arg,e+1],b+' を 何乗すると '+arg+'？ → '+e+'乗。'); },
    function(){ var e=qrand(2,4); return Qn('log₁₀ '+Math.pow(10,e)+' ＝ ？',e,[Math.pow(10,e)/10,e*10],'10 を '+e+'乗。'); },
    function(){ var a1=qrand(1,5),d=qrand(2,5),n=qrand(4,8),an=a1+(n-1)*d; return Qn('初項'+a1+'、公差'+d+' の等差数列の 第'+n+'項は？',an,[a1+n*d,a1*n],'a_n＝a1＋(n−1)d＝'+a1+'＋'+(n-1)+'×'+d+'。'); },
    function(){ var a1=qrand(1,5),d=qrand(1,4),n=qrand(3,6),sum=n*(2*a1+(n-1)*d)/2; return Qn('初項'+a1+'、公差'+d+' の 初項から第'+n+'項までの和は？',sum,[sum+n,a1*n],'S＝n(2a1＋(n−1)d)/2。'); },
    function(){ var a1=qrand(1,3),r=qrand(2,3),n=qrand(3,5),an=a1*Math.pow(r,n-1); return Qn('初項'+a1+'、公比'+r+' の等比数列の 第'+n+'項は？',an,[a1*r*n,a1+r*(n-1)],'a_n＝a1·r^(n−1)。'); },
    function(){ var a1=qrand(1,6),a2=qrand(1,6),b1=qrand(1,6),b2=qrand(1,6); if(a1===2&&b1===2&&a2===2&&b2===2)b2=3; return Qn('('+a1+', '+a2+') ＋ ('+b1+', '+b2+') ＝ ？','('+(a1+b1)+', '+(a2+b2)+')',['('+(a1*b1)+', '+(a2*b2)+')','('+(a1-b1)+', '+(a2-b2)+')'],'成分ごとに たす。'); },
    function(){ var P=[[3,4,5],[6,8,10],[5,12,13],[8,15,17]][qrand(0,3)]; return Qn('ベクトル ('+P[0]+', '+P[1]+') の大きさは？',P[2],[P[0]+P[1],P[2]+1],'√('+P[0]+'²＋'+P[1]+'²)＝√'+(P[0]*P[0]+P[1]*P[1])+'＝'+P[2]+'。'); },
    function(){ var a1=qrand(1,5),a2=qrand(1,5),b1=qrand(1,5),b2=qrand(1,5),dot=a1*b1+a2*b2; return Qn('('+a1+', '+a2+')・('+b1+', '+b2+') ＝ ？',dot,[a1*b1,(a1+a2)*(b1+b2)],'内積＝'+a1+'×'+b1+'＋'+a2+'×'+b2+'＝'+dot+'。'); },
    function(){ var n=qrand(2,5); return Qn('(x^'+n+')′ ＝ ？',qdt(n,n-1),[qdt(n-1,n),qdt(n,n)],'x^n の微分は n·x^(n−1)。'); },
    function(){ var a=qrand(2,4),b=qrand(2,5); return Qn('('+a+'x² ＋ '+b+'x)′ ＝ ？',(2*a)+'x ＋ '+b,[a+'x ＋ '+b,(2*a)+'x'],'各項を微分：'+a+'x²→'+(2*a)+'x、'+b+'x→'+b+'。'); },
    function(){ var a=qrand(1,3),x0=qrand(1,4); return Qn('f(x)＝'+(a===1?'':a)+'x²。x＝'+x0+' での接線の傾きは？',2*a*x0,[a*x0,a*x0*x0],'f′(x)＝'+(2*a)+'x。x＝'+x0+' を代入。'); }
  ],
  /* ── 大学生：群・環・体・線形代数・位相（○×／選択） ── */
  dai:[
    function(){ return Qn('群の公理に 含まれないものは？','可換性 (ab＝ba)',['結合法則','単位元の存在'],'可換性は不要。可換な群＝アーベル群。'); },
    function(){ return Qn('群の単位元の 個数は？','ただ1つ',['少なくとも2つ','存在しないこともある'],'単位元は一意に定まる。'); },
    function(){ return Qn('アーベル群とは？','可換な群',['有限群のこと','逆元をもたない群'],'ab＝ba が成り立つ群。'); },
    function(){ return Qn('一般の環で 必ずしも成り立たないものは？','乗法の可換性',['加法の結合法則','分配法則'],'非可換環が存在する。'); },
    function(){ return Qn('体（field）の特徴は？','0以外のすべてが乗法逆元をもつ',['零因子をもつ','可換でなくてよい'],'体＝0以外で割り算できる可換環。'); },
    function(){ return Qn('整数全体 Z は体か？（○×）','×（体でない）',['○（体である）','どちらともいえない'],'2 の逆元 1/2 が Z にない。'); },
    function(){ return Qn('有理数 Q は体か？（○×）','○（体である）',['×（体でない）','環ですらない'],'0以外で割り算できる。'); },
    function(){ return Qn('3次対称群 S₃ の位数は？',6,[3,9],'3!＝6。最小の非可換群。'); },
    function(){ var a=qrand(1,5),b=qrand(1,5),c=qrand(1,5),d=qrand(1,5),det=a*d-b*c; return Qn('行列 [['+a+','+b+'],['+c+','+d+']] の 行列式は？',det,[a*d+b*c,a*b-c*d],'ad − bc＝'+a+'×'+d+'−'+b+'×'+c+'＝'+det+'。'); },
    function(){ return Qn('n次 単位行列の 固有値は？','1（重複度 n）',['0','n'],'Ix＝x なので固有値は1。'); },
    function(){ return Qn('線形写像 f で rank f ＋ dim Ker f ＝ ？','定義域の次元 n',['像の次元 m','m＋n'],'次元定理（rank-nullity）。'); },
    function(){ return Qn('正方行列が正則（逆行列をもつ）⇔ ？','行列式 ≠ 0',['行列式 ＝ 0','対称行列である'],'det≠0 と 可逆は同値。'); },
    function(){ return Qn('n次元空間で 一次独立なベクトルは 最大何本？','n 本',['n＋1 本','無限本'],'基底の本数＝次元。'); },
    function(){ return Qn('位相空間で 開集合の（任意個の）和集合は？','開集合',['閉集合','一般には不明'],'位相の公理：和はつねに開。'); },
    function(){ return Qn('開集合の 有限個の共通部分は？','開集合',['閉集合','空集合のみ'],'有限交叉は開（無限個では崩れうる）。'); },
    function(){ return Qn('コンパクトの定義に 近いのは？','任意の開被覆が 有限部分被覆をもつ',['有界なだけ','連結である'],'有限部分被覆の存在。'); },
    function(){ return Qn('コーヒーカップとドーナツが 同相な理由は？','穴の数が同じ（1つ）',['体積が同じ','色が同じ'],'トポロジーは 穴の数（種数）で分類。'); },
    function(){ return Qn('ハウスドルフ空間とは？','異なる2点を 互いに素な開集合で分離できる',['コンパクトな空間','離散空間のこと'],'T₂ 分離公理。'); },
    function(){ return Qn('連続写像の 特徴づけは？','開集合の逆像が つねに開',['必ず全単射','距離を保つ'],'逆像で開集合が開 ⇔ 連続。'); }
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

  /* ── プレイヤー ── */
  var player={px:(spawn.x+0.5)*TILE, py:(spawn.y+0.5)*TILE, dir:0};
  var cam={x:0,y:0};
  var lastSpecial=null; /* "tx,ty" 直近に発動した特殊タイル */
  var battlePick=quizPicker(zoneId); /* このゾーンの出題器（直前と同じ問題は出さない） */

  /* ── 衝突判定 ── */
  function solidAt(wx,wy){
    var tx=Math.floor(wx/TILE), ty=Math.floor(wy/TILE);
    if(tx<0||ty<0||tx>=W||ty>=H) return true;
    return !!BLOCK[grid[ty][tx]];
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
    }
  }
  function drawBossDoor(sx,sy,t){
    var cleared=window.RPG&&RPG.bossCleared(CFG.boss);
    var open=cleared||bossUnlocked();   /* 解錠＝撃破済み or このフィールドで規定数撃破 */
    var pul=0.55+0.45*Math.sin(t*3);
    /* 扉本体（解錠時は強く発光して「開く」演出、封印時は暗く沈む） */
    ctx.save();
    if(open){ ctx.shadowColor=cleared?'rgba(232,201,107,'+pul+')':'rgba(232,150,60,'+pul+')'; ctx.shadowBlur=22; }
    else{ ctx.shadowColor='rgba(90,100,130,'+(0.25+0.2*pul)+')'; ctx.shadowBlur=7; }
    ctx.fillStyle=cleared?'#2a2418':(open?'#241510':'#14121c');
    roundPath(sx+3,sy+2,TILE-6,TILE-4,5); ctx.fill();
    ctx.restore();
    ctx.strokeStyle=cleared?'#c8a84b':(open?'#e0883c':'#4a4f63'); ctx.lineWidth=2.5;
    roundPath(sx+3,sy+2,TILE-6,TILE-4,5); ctx.stroke();
    /* 鳥居 */
    ctx.strokeStyle=cleared?'#e8c96b':(open?'#ffae6a':'#5a6075'); ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(sx+11,sy+15); ctx.lineTo(sx+TILE-11,sy+15);
    ctx.moveTo(sx+13,sy+20); ctx.lineTo(sx+TILE-13,sy+20);
    ctx.moveTo(sx+15,sy+15); ctx.lineTo(sx+15,sy+TILE-8);
    ctx.moveTo(sx+TILE-15,sy+15); ctx.lineTo(sx+TILE-15,sy+TILE-8); ctx.stroke();
    ctx.font='16px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    if(open){
      ctx.fillText(cleared?'👑':CFG.bossEmoji,sx+TILE/2,sy+TILE/2+4);
      if(!cleared){
        /* 解錠の光の筋（開門演出） */
        ctx.save(); ctx.globalAlpha=0.25+0.4*pul; ctx.fillStyle='#ffe6b0';
        ctx.fillRect(sx+TILE/2-3,sy+16,6,TILE-24); ctx.restore();
      }
    }else{
      /* 封印中：南京錠＋進捗 */
      ctx.fillText('🔒',sx+TILE/2,sy+TILE/2+1);
      ctx.font='bold 10px sans-serif'; ctx.fillStyle='#9aa3bd';
      ctx.fillText(zoneKills()+'/'+KILLS_NEEDED,sx+TILE/2,sy+TILE-6);
    }
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
      '<div class="fm-bt-stage">⚔️ '+(KIDS?'たたかい':'BATTLE')+'</div>'+
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
        '<div class="fm-qno">'+(KIDS?'もんだい ':'問 ')+(NEED-hp+1)+' / '+NEED+'</div>'+
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
            tail.innerHTML='<div class="fm-fb ok">⚡ '+(KIDS?'かいしんの いちげき！':'会心の一撃！')+'</div>'+
              (Q.exp?'<div class="fm-exp">'+Q.exp+'</div>':'')+
              '<button class="fm-go" id="fmNext">'+(hp<=0?(KIDS?'とどめ！':'とどめを刺す'):(KIDS?'つぎへ':'攻撃を続ける'))+'</button>';
            tail.querySelector('#fmNext').addEventListener('click',function(){
              if(hp<=0){ victory(); } else { showQ(); }
            });
          } else {
            b.classList.add('ng'); if(btns[Q.a]) btns[Q.a].classList.add('ok');
            if(window.SND) SND.wrong(); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
            tail.innerHTML='<div class="fm-fb ng">💥 '+(KIDS?'こうげきを うけた…':'反撃を受けた…')+'</div>'+
              (Q.exp?'<div class="fm-exp">'+Q.exp+'</div>':'')+
              '<button class="fm-go retry" id="fmRetry">'+(KIDS?'もういちど！':'もう一度')+'</button>';
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
          doorMsg='<div class="fm-win-l" style="color:#ffd96b;">🔓 '+(KIDS?'ボスの とびらの ふういんが とけた！':'ボスの扉の封印が解けた！')+'</div>';
        else
          doorMsg='<div class="fm-win-l" style="color:#9fe0ff;">'+(KIDS?'ボスの とびらまで あと '+killsLeft()+'体！':'ボスの扉まで あと '+killsLeft()+'体！')+'</div>';
      }
      area.innerHTML='<div class="fm-win">'+
        '<div class="fm-win-t">🎉 '+(KIDS?'やっつけた！':'撃破！')+'</div>'+
        '<div class="fm-win-l">'+en.name+'を '+(KIDS?'たおした！':'打ち破った！')+'</div>'+
        doorMsg+
        '<button class="fm-go" id="fmClose">'+(KIDS?'フィールドに もどる':'フィールドへ戻る')+'</button></div>';
      area.querySelector('#fmClose').addEventListener('click',function(){ closeOv(ov); mode='field'; });
      if(window.RPG) setTimeout(function(){ RPG.addXP(en.def.xp,(KIDS?en.name+'げきは！':en.name+'撃破！')); },350);
      ov.querySelector('.fm-bt-emoji').classList.add('fm-die');
    }
    /* にげる */
    var flee=el('button','fm-flee'); flee.textContent=KIDS?'← にげる':'← 退却する';
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
    var warn=el('div','fm-warn'); warn.textContent='⚠️ '+en.name+(KIDS?' が あらわれた！':' が現れた！');
    ov.appendChild(warn);
    if(window.SND) SND.wrong();
    setTimeout(function(){ warn.remove(); showQ(); },950);
  }

  /* ════ カード入手 ════ */
  function pickupCard(ct){
    mode='menu'; keys.u=keys.d=keys.l=keys.r=false;
    addCardId(ct.card.id);
    if(window.SND) SND.stamp();
    if(window.RPG) RPG.addXP(15,KIDS?'ちしきカード':'知識カード入手');
    var c=ct.card;
    var ov=el('div','fm-ov fm-card');
    ov.innerHTML=
      '<div class="fm-cardbox">'+
        '<div class="fm-card-label">'+(KIDS?'ちしきカードを てにいれた！':'知識カードを手に入れた！')+'</div>'+
        '<div class="fm-card-viz">'+(c.svg||('<div class="fm-card-e">'+c.e+'</div>'))+'</div>'+
        '<div class="fm-card-t">'+c.e+' '+c.t+'</div>'+
        '<div class="fm-card-b">'+c.b+'</div>'+
        '<div class="fm-card-hint">'+(KIDS?'ずかんに とうろくされたよ':'図鑑に登録されました')+'</div>'+
        '<button class="fm-go" id="fmCardClose">'+(KIDS?'とじて マップに もどる':'とじてマップに戻る')+'</button>'+
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
    var zlabel={sho:'地上・小学生',chu:'B1・中学生',ko:'B2・高校生',dai:'B3・大学生',in:'B4・大学院'};
    var ov=el('div','fm-ov fm-dex');
    var h='<div class="fm-dexbox">'+
      '<div class="fm-dex-head">'+
        '<div class="fm-dex-title">📖 '+(KIDS?'ちしき ずかん':'知識カード図鑑')+'</div>'+
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
          h+='<div class="fm-dx locked"><span class="fm-dx-e">❓</span><span class="fm-dx-t">？？？</span></div>';
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
      '<button class="fm-go" id="fmDcl">'+(KIDS?'とじる':'閉じる')+'</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('#fmDcl').addEventListener('click',function(){ closeOv(ov); });
    ov.addEventListener('click',function(e){ if(e.target===ov) closeOv(ov); });
  }

  /* ════ 階段・ボス・封印 ════ */
  function travel(href,name,down){
    mode='menu';
    var ov=el('div','fm-ov fm-travel');
    ov.innerHTML='<div class="fm-travel-in"><div class="fm-travel-ic">'+(down?'▼':'▲')+'</div>'+
      '<div class="fm-travel-t">'+(down?(KIDS?'ふかい かいそうへ…':'さらに深層へ…'):(KIDS?'うえの かいそうへ…':'上の階層へ…'))+'</div>'+
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
      '<div class="fm-locked-t">'+(KIDS?'かいだんに かぎが かかっている！':'階段は封印されている')+'</div>'+
      '<div class="fm-locked-d">'+(KIDS
        ?'ボス「'+CFG.bossName+'」を たおすと、つぎの かいそうへ おりられる。'
        :'ボス「'+CFG.bossName+'」を倒すと、下の階層への封印が解ける。')+'</div>'+
      '<a class="fm-go boss" href="'+CFG.bossPage+'">⚔️ '+(KIDS?'ボスに いどむ':'ボスに挑む')+'</a>'+
      '<button class="fm-go ghost" id="fmLx">'+(KIDS?'もどる':'戻る')+'</button>'+
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
      '<div class="fm-locked-t">'+(KIDS?'ボスの とびらは ふういんされている！':'ボスの扉は封印されている')+'</div>'+
      '<div class="fm-locked-d">'+(KIDS
        ?'このフィールドの てきを たおすと ふういんが ゆるむ。<br><strong style="color:#ffd9c8;font-size:1.15em;">あと '+killsLeft()+'体 たおそう！</strong>'
        :'このフィールドの敵を倒すと封印が緩む。<br><strong style="color:#ffd9c8;font-size:1.15em;">あと '+killsLeft()+'体 たおそう！</strong>')+
        '<div style="margin-top:8px;color:#9aa3bd;font-size:.85rem;">'+(KIDS?'げきは':'撃破')+' '+zoneKills()+' / '+KILLS_NEEDED+'</div></div>'+
      '<button class="fm-go ghost" id="fmSx">'+(KIDS?'てきを さがしに いく':'敵を探しに行く')+'</button>'+
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
      '<div class="fm-locked-t" style="color:#ffd9c8;">'+(cleared?(KIDS?'げきは ずみの ボス':'撃破済みのボス'):'BOSS ─ '+CFG.bossName)+'</div>'+
      '<div class="fm-locked-d">'+(cleared
        ?(KIDS?'もういちど たたかう？ たたかうたびに つよく なるぞ。':'再戦するか？ 来るたびに、奴は強くなる。')
        :(KIDS?'この とびらの おくに ボスが いる。じゅんびは いい？':'この扉の奥にボスがいる。挑むか？'))+'</div>'+
      '<a class="fm-go boss" href="'+CFG.bossPage+'">⚔️ '+(cleared?(KIDS?'さいせん する':'再戦する'):(KIDS?'ボスに いどむ':'ボスに挑む'))+'</a>'+
      '<button class="fm-go ghost" id="fmBx">'+(KIDS?'やめておく':'やめておく')+'</button>'+
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
      '<div class="fm-gate-seal">─ この階層は封印されている ─</div>'+
      '<div class="fm-gate-name">'+CFG.title+'</div>'+
      '<div class="fm-gate-d">ここへ来るには、上の階層のボス「'+CFG.requireBossName+'」を倒している必要がある。</div>'+
      '<a class="fm-go boss" href="'+CFG.requireBossPage+'">⚔️ ボス「'+CFG.requireBossName+'」に挑む</a>'+
      '<button class="fm-gate-skip" id="fmGskip">封印をすり抜けて探索する（ボスはあとで）</button>'+
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
      '<div class="fm-reset-t">'+(KIDS?'ほんとうに リセットする？':'本当にリセットしますか？')+'</div>'+
      '<div class="fm-reset-d">'+(KIDS
        ?'すべての すすみぐあいが きえます。レベル・しらべたカード・ボスの きろくが ぜんぶ さいしょに もどります。'
        :'すべての進行状況が消えます。レベル・知識カード・ボス撃破の記録がすべて初期化されます。')+'</div>'+
      '<button class="fm-go fm-reset-yes" id="fmRsYes">'+(KIDS?'リセットする':'リセットする')+'</button>'+
      '<button class="fm-go ghost" id="fmRsNo">'+(KIDS?'やめておく':'やめておく')+'</button>'+
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector('#fmRsYes').addEventListener('click',function(){
      if(window.RPG&&RPG.resetAll){ RPG.resetAll(); }
      else { try{ var d=[],i,k; for(i=0;i<localStorage.length;i++){ k=localStorage.key(i); if(/^rpg_/.test(k)) d.push(k); } d.forEach(function(x){ localStorage.removeItem(x); }); }catch(e){} }
      try{ sessionStorage.removeItem('rpg_started'); }catch(e){}
      if(window.SND) SND.clear();
      location.href='/math-site/sho/map.html';
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
      '<h1 class="fm-title-main">数学の教室 ― 大冒険</h1>'+
      '<p class="fm-title-sub">知識カードを集めて、数学の世界を探検しよう！</p>'+
      '<button class="fm-go" id="fmStart">⚔️ 冒険をはじめる</button>'+
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
        '<button class="fm-go fm-sel-btn" data-id="'+id+'">このキャラで冒険する</button>'+
        '</div>';
    }
    ov.innerHTML='<div class="fm-sel-in">'+
      '<h2 class="fm-sel-head">キャラを えらぼう</h2>'+
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
        '<button class="fm-btn" id="fmDex">📖 <span>'+(KIDS?'ずかん':'図鑑')+'</span><i class="fm-badge" id="fmBadge"></i></button>'+
        '<a class="fm-btn" href="'+CFG.up.href+'">🏠 <span>'+(KIDS?'もどる':'戻る')+'</span></a>'+
        '<button class="fm-btn reset" id="fmReset">🔄 <span>リセット</span></button>'+
      '</div>';
    document.body.appendChild(bar);
    document.getElementById('fmDex').addEventListener('click',openDex);
    document.getElementById('fmReset').addEventListener('click',confirmReset);
    var hint=el('div','fm-hint');
    hint.innerHTML=(KIDS
      ?'やじるし／下のボタンで うごく　・　てきに ふれると たたかい　・　たからばこで カード'
      :'矢印キー／D-padで移動　・　敵に触れて戦闘　・　宝箱で知識カード　・　階段で次の階層へ');
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
  if(zoneId==='sho' && freshSession){
    showTitle();          /* 入口（小学生フィールド）ではまずタイトル → キャラ選択 */
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
