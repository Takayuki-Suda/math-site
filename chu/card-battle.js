/* ════════════════════════════════════════════════════════
   数学カードバトル（試作版）
   問題カードを相手に出し、相手が答える。まちがえたらダメージ。
   ライフが 0 になったら負け。相手はコンピュータ（CPU）。
   前半：カードと答え合わせ（node でもテストできる）
   後半：画面
   ════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var MINUS = '−';

  /* ────────── 問題カード ──────────
     [★, 単元, 問題, 答え, ヒント, 解き方]
     答えは数、または [x, y] / [a, b] の組（labels で名前を決める） */
  /* 問題カードは card-battle-decks.js（CB_DECKS）にある。デッキ：sho-low / sho-high / chu / ko / dai */
  var DECKS = root.CB_DECKS || (typeof require === 'function' ? require('./card-battle-decks.js') : {});
  var DEFAULT_DECK = 'chu';
  /* [種類, 名前, 説明, 枚数]。特殊カードは全部で 8 枚 */
  var SPECIALS = [
    ['swap', '入れかえ', '自分の番に使う。手札から好きな枚数をえらんで、山札と入れかえる。', 2],
    ['counter', '倍返し', '答える前に使う。正解したら、反撃ダメージが ★＋1 になる。', 2],
    ['shield', 'シールド', 'まちがえたときに使える。受けるダメージを 2 へらす。', 2],
    ['draw', '2 枚ドロー', '自分の番に使う。山札から 2 枚引く。', 1],
    ['heal', '回復', '自分の番に使う。ライフを 2 回復する。', 1]
  ];
  /* キャラクター 6 人（数学者）。once は「1 回だけ」の能力 */
  var CHARS = {
    euclid: { name: 'ユークリッド', sym: '△', era: '古代ギリシャ', story: '『原論』で、定義から順に証明を積み上げた。', skill: '証明の達人', desc: '相手がまちがえたとき、説明できなくてもダメージが半分にならない。' },
    gauss: { name: 'ガウス', sym: 'Σ', era: 'ドイツ', story: '子どものころ、1 から 100 までの和を一瞬で求めた。', skill: '速算', desc: '★1 の問題に正解したとき、反撃ダメージ ＋1。' },
    riemann: { name: 'リーマン', sym: 'ζ', era: 'ドイツ', story: '今も解かれていない「リーマン予想」を残した。', skill: '未解決の謎', desc: '★3 の問題を出して相手がまちがえたら、ダメージ ＋1。' },
    euler: { name: 'オイラー', sym: 'e', era: 'スイス', story: '史上最多ともいわれる数の論文を書いた。', skill: '多作', desc: '「2 枚ドロー」が 3 枚ドローになる。' },
    fermat: { name: 'フェルマー', sym: 'xⁿ', era: 'フランス', story: '「余白が狭すぎて書けない」と最終定理を書き残した。', skill: '余白が足りない', desc: '1 回だけ、自分がまちがえたときのダメージを 0 にできる。', once: true },
    takagi: { name: '高木貞治', sym: '類', era: '日本', story: '類体論をつくり、日本の近代数学を切りひらいた。', skill: '類体論', desc: '1 回だけ、同じ単元の問題カードを 2 枚まとめて出せる。', once: true }
  };
  var CHAR_ORDER = ['euclid', 'gauss', 'riemann', 'euler', 'fermat', 'takagi'];
  function unitGroup(u) { return u === '反比例' ? '比例' : u; }
  function unitsOf(key) {
    var seen = {}, out = [];
    DECKS[key].problems.forEach(function (p) { var g = unitGroup(p[1]); if (!seen[g]) { seen[g] = 1; out.push(g); } });
    return out;
  }
  function makeDeck(key) {
    var d = [];
    DECKS[key || DEFAULT_DECK].problems.forEach(function (p, i) {
      d.push({ id: 'p' + i, kind: 'q', star: p[0], unit: p[1], text: p[2], ans: p[3], hint: p[4], sol: p[5], labels: p[6] || ['x', 'y'], wrongs: p[7] || null });
    });
    SPECIALS.forEach(function (s, i) {
      for (var k = 0; k < s[3]; k++) d.push({ id: 's' + i + k, kind: s[0], name: s[1], desc: s[2] });
    });
    return d;
  }
  function fmt(n) {
    if (Array.isArray(n)) return '(' + fmt(n[0]) + ', ' + fmt(n[1]) + ')';
    if (typeof n === 'string') return n;
    return (n < 0 ? MINUS : '') + Math.abs(n);
  }
  function val(a) { return typeof a === 'string' ? evalExpr(a) : a; }
  function ansStr(card) {
    if (!Array.isArray(card.ans)) return fmt(card.ans);
    return card.labels[0] + ' = ' + fmt(card.ans[0]) + '、' + card.labels[1] + ' = ' + fmt(card.ans[1]);
  }

  /* 答えの読み取り（全角・マイナス記号・分数・√ に対応。2√3 のようなかけ算の省略も読む） */
  function evalExpr(str) {
    var s = String(str == null ? '' : str).trim();
    if (!s) return NaN;
    s = s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); })
      .replace(/ルート|sqrt|√/gi, 'r').replace(/pi|π/gi, 'P').replace(/e/g, 'E')
      .replace(/[−ー－‐–]/g, '-').replace(/＋/g, '+').replace(/[／÷]/g, '/').replace(/[×＊]/g, '*')
      .replace(/（/g, '(').replace(/）/g, ')').replace(/．/g, '.').replace(/\s+/g, '');
    var i = 0;
    function expr() { var v = term(); while (s[i] === '+' || s[i] === '-') { var op = s[i++]; var w = term(); v = op === '+' ? v + w : v - w; } return v; }
    function term() {
      var v = unary();
      for (;;) {
        if (s[i] === '*' || s[i] === '/') { var op = s[i++]; var w = unary(); v = op === '*' ? v * w : v / w; }
        else if (s[i] === 'r' || s[i] === '(' || s[i] === 'P' || s[i] === 'E') v = v * unary();
        else break;
      }
      return v;
    }
    function unary() { if (s[i] === '-') { i++; return -unary(); } if (s[i] === '+') { i++; return unary(); } return atom(); }
    function atom() {
      if (s[i] === 'r') { i++; var r = atom(); return r < 0 ? NaN : Math.sqrt(r); }
      if (s[i] === 'P') { i++; return Math.PI; }
      if (s[i] === 'E') { i++; return Math.E; }
      if (s[i] === '(') { i++; var w = expr(); if (s[i] !== ')') throw 0; i++; return w; }
      var m = /^\d+(\.\d+)?/.exec(s.slice(i)); if (!m) throw 0; i += m[0].length; return parseFloat(m[0]);
    }
    try { var v = expr(); return i === s.length ? v : NaN; } catch (e) { return NaN; }
  }
  function close(a, b) { return isFinite(a) && Math.abs(a - b) < 1e-9; }
  function squareFree(str) {
    var m, re = /(?:√|ルート|sqrt)\s*\(?\s*(\d+)/gi;
    while ((m = re.exec(String(str)))) { var n = +m[1]; for (var k = 2; k * k <= n; k++) if (n % (k * k) === 0) return false; }
    return true;
  }
  function reduced(str) {
    var m = /^\s*[−\-]?\s*(\d+)\s*[\/／]\s*(\d+)\s*$/.exec(String(str));
    if (!m) return true;
    var a = +m[1], b = +m[2], x = a, y = b; while (y) { var t = x % y; x = y; y = t; }
    return x === 1 && b !== 1;
  }
  function check(card, inputs) {
    if (/の形に/.test(card.text) && !squareFree(inputs[0])) return false;
    var fr = function (a) { return typeof a === 'string' && /^[−\-]?\d+\/\d+$/.test(a); };
    if (!Array.isArray(card.ans) && fr(card.ans) && !reduced(inputs[0])) return false;
    if (Array.isArray(card.ans)) return close(evalExpr(inputs[0]), val(card.ans[0])) && close(evalExpr(inputs[1]), val(card.ans[1]));
    return close(evalExpr(inputs[0]), val(card.ans));
  }
  /* CPU がまちがえるときの答え（よくあるまちがい） */
  function wrongAnswer(card, rnd) {
    rnd = rnd || Math.random;
    function bad(n) {
      var c = [n + 1, n - 1, n * 2 || 2];
      if (n !== 0) c.push(-n, -n, -n);   // 符号のまちがいがいちばん多い
      var w; do { w = c[Math.floor(rnd() * c.length)]; } while (w === n);
      return w;
    }
    if (card.wrongs) { var w = card.wrongs[Math.floor(rnd() * card.wrongs.length)]; return Array.isArray(w) ? w.slice() : w; }
    if (typeof card.ans === 'string') {
      var f = /^([−\-]?)(\d+)\/(\d+)$/.exec(card.ans);
      if (f) { var n = +f[2], dd = +f[3]; var c2 = [dd + '/' + n, (n + 1) + '/' + dd, (f[1] ? '' : MINUS) + n + '/' + dd]; c2 = c2.filter(function (x) { return Math.abs(evalExpr(x) - evalExpr(card.ans)) > 1e-9; }); return c2[Math.floor(rnd() * c2.length)]; }
      return card.ans.charAt(0) === MINUS ? card.ans.slice(1) : MINUS + card.ans;
    }
    if (!Array.isArray(card.ans)) return bad(card.ans);
    var a = card.ans.slice(); var k = rnd() < 0.5 ? 0 : 1; a[k] = bad(a[k]); return a;
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var core = { CHARS: CHARS, val: val, DECKS: DECKS, unitsOf: unitsOf, makeDeck: makeDeck, evalExpr: evalExpr, check: check, wrongAnswer: wrongAnswer, fmt: fmt, ansStr: ansStr };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  root.CBCore = core;
  if (typeof document === 'undefined') return;

  /* ════════════════════════════════════════════════════════
     画面
     ════════════════════════════════════════════════════════ */
  var $ = function (id) { return document.getElementById(id); };
  var HAND = 5;
  var CPU_SET = {
    easy: { label: 'やさしい', p: [0, 0.8, 0.6, 0.4], explain: 0.7 },
    normal: { label: 'ふつう', p: [0, 0.9, 0.75, 0.55], explain: 0.85 },
    strong: { label: 'つよい', p: [0, 0.96, 0.88, 0.75], explain: 0.95 }
  };
  var S = null, lastOpt = null, timerId = null, lastIn = null, curChar = null;
  /* レベル（デッキ）は ?deck=sho-low のように URL で決める */
  var ORDER = ['sho-low', 'sho-high', 'chu', 'ko', 'dai'];
  var curDeck = (function () {
    var m = /[?&]deck=([\w-]+)/.exec(location.search);
    return m && DECKS[m[1]] ? m[1] : DEFAULT_DECK;
  })();
  function showLevel() {
    var d = DECKS[curDeck], e = $('cb-level');
    if (e) e.textContent = d.name + '編（' + d.range + '）';
    document.title = '数学カードバトル ' + d.name + '編 - 会津若松の数学教室';
  }
  function setDeck(k) {
    curDeck = k; showLevel();
    try { history.replaceState(null, '', location.pathname + '?deck=' + k); } catch (e) {}
  }
  /* 音（card-battle-sound.js）。読み込めなくてもゲームは動く */
  function snd(n, d) { if (window.CBSound) window.CBSound.play(n, d); }
  function bgm(on) { if (!window.CBSound) return; if (on) window.CBSound.bgmStart(); else window.CBSound.bgmStop(); }

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function br(t) { return esc(t).replace(/\n/g, '<br>'); }

  function newGame(opt) {
    S = {
      cpu: CPU_SET[opt.cpu], time: opt.time,
      life: { you: opt.lifeYou, cpu: opt.lifeCpu }, max: { you: opt.lifeYou, cpu: opt.lifeCpu },
      deckKey: opt.deck, deck: shuffle(makeDeck(opt.deck)), used: [],
      hand: { you: [], cpu: [] }, turn: 'you', phase: '', sel: -1,
      q: null, counter: false, shield: false, swapCard: null, swapPick: [], result: null, log: [], msg: '', used1: {},
      char: { you: opt.charYou, cpu: opt.charCpu }, once: { you: false, cpu: false }, pendingQ: null, fermatNow: false
    };
    var u = shuffle(unitsOf(opt.deck));
    S.weak = [u[0], u[1]]; S.good = u[2];
    for (var i = 0; i < HAND; i++) { S.hand.you.push(draw()); S.hand.cpu.push(draw()); }
    addLog('バトル開始！ あなた：' + CHARS[S.char.you].name + '（' + CHARS[S.char.you].skill + '）、CPU：' + CHARS[S.char.cpu].name + '（' + CHARS[S.char.cpu].skill + '）。CPU の苦手は ' + S.weak.join('・') + '、得意は ' + S.good + '。');
    startTurn();
  }
  function draw() {
    if (!S.deck.length) { S.deck = shuffle(S.used); S.used = []; }
    return S.deck.pop();
  }
  function refill(who) { while (S.hand[who].length < HAND && (S.deck.length || S.used.length)) S.hand[who].push(draw()); }
  function ensureQuestion(who) {
    /* 問題カードが 1 枚もなければ、出るまで引く */
    var n = 0;
    while (!S.hand[who].some(function (c) { return c.kind === 'q'; }) && n++ < 30) S.hand[who].push(draw());
  }
  function addLog(t, who) { S.log.unshift({ t: t, who: who || '' }); if (S.log.length > 60) S.log.pop(); }
  function other(w) { return w === 'you' ? 'cpu' : 'you'; }
  function name(w) { return w === 'you' ? 'あなた' : 'CPU'; }
  function discard(who, idx) { var c = S.hand[who].splice(idx, 1)[0]; S.used.push(c); return c; }
  function hasChar(who, k) { return S.char[who] === k; }
  function canOnce(who, k) { return hasChar(who, k) && !S.once[who]; }
  function drawN(who) { return hasChar(who, 'euler') ? 3 : 2; }
  function findKind(who, kind) { for (var i = 0; i < S.hand[who].length; i++) if (S.hand[who][i].kind === kind) return i; return -1; }

  function startTurn() {
    S.sel = -1; S.q = null; S.counter = false; S.shield = false; S.result = null; S.used1 = {}; S.pendingQ = null; S.fermatNow = false;
    if (window.CBSound) window.CBSound.setTense(S.life.you <= 3 || S.life.cpu <= 3);
    if (S.life.you <= 0 || S.life.cpu <= 0) {
      S.phase = 'over'; bgm(false);
      snd(S.life.cpu <= 0 && S.life.you > 0 ? 'win' : 'lose', 0.1);
      render(); return;
    }
    ensureQuestion(S.turn);
    if (S.turn === 'you') { S.phase = 'attack'; render(); }
    else cpuAttack();
  }

  /* ── あなたが出す ── */
  function youPlaySpecial(idx) {
    var c = S.hand.you[idx];
    if (!c || S.used1[c.kind]) return;
    discard('you', idx); S.used1[c.kind] = true;
    if (c.kind === 'draw') { snd('draw'); var n = drawN('you'); for (var k = 0; k < n; k++) S.hand.you.push(draw()); addLog('あなた：' + n + ' 枚ドロー' + (n === 3 ? '（オイラーの多作）' : ''), 'you'); }
    if (c.kind === 'heal') { snd('heal'); var b = S.life.you; S.life.you = Math.min(S.max.you, S.life.you + 2); addLog('あなた：回復（ライフ ' + b + ' → ' + S.life.you + '）', 'you'); }
    render();
  }
  function sameUnitPartners(who, card) {
    return S.hand[who].filter(function (c) { return c !== card && c.kind === 'q' && unitGroup(c.unit) === unitGroup(card.unit); });
  }
  function youAttack(partner) {
    var card = S.hand.you[S.sel];
    if (!card || card.kind !== 'q') return;
    S.q = discard('you', S.sel); S.sel = -1;
    addLog('あなた：★' + S.q.star + '「' + S.q.text.replace(/\n/g, '／') + '」を出した', 'you');
    if (partner && canOnce('you', 'takagi')) {
      S.pendingQ = discard('you', S.hand.you.indexOf(partner)); S.once.you = true;
      addLog('あなた：高木の類体論！ ★' + S.pendingQ.star + '「' + S.pendingQ.text.replace(/\n/g, '／') + '」もまとめて出した', 'you');
    }
    S.phase = 'cpuThink'; render();
    snd('card'); snd('think', 0.3);
    setTimeout(cpuAnswer, 1100);
  }
  /* CPU の正解しやすさ：強さ × 得意・苦手 */
  function cpuChance(q) {
    var p = S.cpu.p[q.star], g = unitGroup(q.unit);
    if (S.weak.indexOf(g) >= 0) p *= 0.6;
    else if (g === S.good) p = Math.min(0.99, p + 0.08);
    return p;
  }
  /* 正解したときの反撃（answerer = 答えた人）。ガウスは ★1 で ＋1 */
  function counterDmg(q, answerer) { return (S.counter ? q.star + 1 : 1) + (hasChar(answerer, 'gauss') && q.star === 1 ? 1 : 0); }
  function cpuAnswer() {
    var q = S.q, p = cpuChance(q);
    /* CPU の作戦：自信があれば倍返し（シールドはまちがえたあとに使う） */
    var ci = findKind('cpu', 'counter');
    if (ci >= 0 && p >= 0.8 && Math.random() < 0.6) { discard('cpu', ci); S.counter = true; addLog('CPU：倍返しを宣言！', 'cpu'); snd('counter', 0.2); }
    var ok = Math.random() < p;
    var ans = ok ? q.ans : wrongAnswer(q);
    S.result = { who: 'cpu', ok: ok, given: ans };
    if (ok) {
      S.hand.cpu.push(draw());
      var d = counterDmg(q, 'cpu'); damage('you', d); S.result.dmg = d;
      snd('wrong', 0.3); snd('hit', 0.65);
      addLog('CPU：' + fmt(ans) + ' と答えて正解 → あなたに反撃 ' + d + ' ダメージ。CPU はカードを 1 枚引いた', 'cpu');
      S.phase = 'cpuResult';
    } else {
      addLog('CPU：' + fmt(ans) + ' と答えた（まちがい）', 'cpu');
      snd('correct', 0.3);
      var si = findKind('cpu', 'shield');
      if (si >= 0 && q.star >= 2) { discard('cpu', si); S.shield = true; addLog('CPU：シールドを使った（ダメージ −2）', 'cpu'); snd('shield', 0.8); }
      S.phase = 'explain';
    }
    render();
  }
  /* まちがえたときのダメージ（attacker = 問題を出した人）。リーマンは ★3 で ＋1、シールドで −2 */
  function wrongDmg(q, full, attacker) {
    var base = full ? q.star : Math.floor(q.star / 2);
    if (hasChar(attacker, 'riemann') && q.star === 3) base += 1;
    return Math.max(0, base - (S.shield ? 2 : 0));
  }
  function youExplain(could) {
    var full = could || hasChar('you', 'euclid');
    var d = wrongDmg(S.q, full, 'you');
    /* CPU のフェルマー：大きいダメージ、またはやられそうなときに使う */
    if (d > 0 && canOnce('cpu', 'fermat') && (d >= 3 || d >= S.life.cpu)) {
      S.once.cpu = true; S.result.fermat = true; addLog('CPU：フェルマー「余白が足りない！」→ ダメージ 0', 'cpu'); d = 0;
    }
    damage('cpu', d);
    if (d > 0) snd('hit'); else snd('shield');
    addLog('あなた：解き方を' + (could ? '説明できた' : '説明できなかった') + (full && !could ? '（ユークリッドの力で全ダメージ）' : '') + ' → CPU に ' + d + ' ダメージ', 'you');
    S.result.dmg = d; S.result.explained = could;
    S.phase = 'cpuResult'; render();
  }
  function damage(who, n) { S.life[who] = Math.max(0, S.life[who] - n); }
  function nextProblem() { S.q = S.pendingQ; S.pendingQ = null; S.counter = false; S.shield = false; S.fermatNow = false; S.result = null; S.msg = ''; }
  function endYourTurn() {
    if (S.pendingQ && S.life.you > 0 && S.life.cpu > 0) {
      nextProblem(); S.phase = 'cpuThink'; render(); snd('card'); snd('think', 0.3); setTimeout(cpuAnswer, 1100); return;
    }
    refill('you'); S.turn = 'cpu'; startTurn();
  }

  /* ── CPU が出す ── */
  function cpuAttack() {
    var h = S.hand.cpu;
    var hl = findKind('cpu', 'heal');
    if (hl >= 0 && S.life.cpu <= S.max.cpu - 3) { discard('cpu', hl); snd('heal'); var b0 = S.life.cpu; S.life.cpu = Math.min(S.max.cpu, S.life.cpu + 2); addLog('CPU：回復（ライフ ' + b0 + ' → ' + S.life.cpu + '）', 'cpu'); }
    var sw = findKind('cpu', 'swap');
    if (sw >= 0) {
      var low = h.filter(function (c, i) { return i !== sw && (c.kind === 'q' && c.star === 1); });
      if (low.length >= 2) {
        discard('cpu', sw);
        low.forEach(function (c) { S.used.push(h.splice(h.indexOf(c), 1)[0]); });
        low.forEach(function () { h.push(draw()); });
        addLog('CPU：入れかえ（' + low.length + ' 枚）', 'cpu'); snd('draw', 0.2);
      }
    }
    var di = findKind('cpu', 'draw');
    if (di >= 0 && h.filter(function (c) { return c.kind === 'q'; }).length <= 2) {
      discard('cpu', di); var dn = drawN('cpu'); for (var k2 = 0; k2 < dn; k2++) h.push(draw()); addLog('CPU：' + dn + ' 枚ドロー', 'cpu'); snd('draw', 0.3);
    }
    /* あなたのライフが少ないときは強いカード、ふだんは少しランダムに */
    var qs = [];
    h.forEach(function (c, i) { if (c.kind === 'q') qs.push(i); });
    qs.sort(function (a, b) { return h[b].star - h[a].star; });
    var pick = S.life.you <= 3 ? qs[0] : qs[Math.floor(Math.random() * Math.min(2, qs.length))];
    S.q = discard('cpu', pick);
    addLog('CPU：★' + S.q.star + '「' + S.q.text.replace(/\n/g, '／') + '」を出した', 'cpu');
    if (canOnce('cpu', 'takagi')) {
      var pt = sameUnitPartners('cpu', S.q);
      if (pt.length && Math.random() < 0.6) {
        S.pendingQ = discard('cpu', h.indexOf(pt[0])); S.once.cpu = true;
        addLog('CPU：高木の類体論！ 同じ単元のカードを 2 枚まとめて出した', 'cpu');
      }
    }
    S.phase = 'answer';
    render();
    snd('card', 0.4);
    startTimer();
  }
  function startTimer() {
    stopTimer();
    if (!S.time) return;
    S.left = S.time;
    timerId = setInterval(function () {
      S.left--;
      var t = $('cb-timer'); if (t) t.textContent = S.left;
      if (S.left <= 0) { stopTimer(); youAnswer(true); }
    }, 1000);
  }
  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
  function youSwapStart(idx) { S.swapCard = S.hand.you[idx]; S.swapPick = []; S.sel = -1; S.phase = 'swap'; S.msg = ''; render(); }
  function youSwapToggle(idx) {
    var c = S.hand.you[idx]; if (c === S.swapCard) return;
    var k = S.swapPick.indexOf(c); if (k >= 0) S.swapPick.splice(k, 1); else S.swapPick.push(c);
    snd('click'); render();
  }
  function youSwapDo() {
    var n = S.swapPick.length; if (!n) return;
    var h = S.hand.you;
    S.used.push(h.splice(h.indexOf(S.swapCard), 1)[0]);
    S.swapPick.forEach(function (c) { S.used.push(h.splice(h.indexOf(c), 1)[0]); });
    for (var i = 0; i < n; i++) h.push(draw());
    S.used1.swap = true; S.swapCard = null; S.swapPick = [];
    addLog('あなた：入れかえ（' + n + ' 枚）', 'you'); snd('draw');
    S.phase = 'attack'; ensureQuestion('you'); render();
  }
  function youSwapCancel() { S.swapCard = null; S.swapPick = []; S.phase = 'attack'; render(); }
  function youUseCounter() {
    var i = findKind('you', 'counter'); if (i < 0) return;
    discard('you', i); S.counter = true; addLog('あなた：倍返しを宣言！', 'you'); snd('counter'); render();
  }
  function youAnswer(timeout) {
    var ins = [];
    Array.prototype.forEach.call(document.querySelectorAll('.cb-in'), function (e) { ins.push(e.value); });
    if (!timeout && ins.some(function (v) { return !String(v).trim(); })) { S.msg = '答えを入れてね。'; render(); return; }
    if (!timeout && ins.some(function (v) { return !isFinite(evalExpr(v)); })) { S.msg = '数として読めませんでした。−3 や 1/2 のように入れてね。'; render(); return; }
    stopTimer();
    S.msg = '';
    var q = S.q, ok = !timeout && check(q, ins);
    S.result = { who: 'you', ok: ok, given: ins, timeout: !!timeout };
    if (ok) {
      S.hand.you.push(draw());
      var d = counterDmg(q, 'you'); damage('cpu', d); S.result.dmg = d;
      snd('correct'); snd('hit', 0.4);
      addLog('あなた：正解！ CPU に反撃 ' + d + ' ダメージ。カードを 1 枚引いた', 'you');
    } else {
      snd('wrong');
      /* CPU が解き方を説明できたか（ユークリッドならいつも全ダメージ） */
      S.cpuExp = hasChar('cpu', 'euclid') || Math.random() < S.cpu.explain;
      if (findKind('you', 'shield') >= 0 || canOnce('you', 'fermat')) { S.phase = 'shieldAsk'; render(); return; }
      applyYourWrong();
      return;
    }
    S.phase = 'yourResult'; render();
  }
  function applyYourWrong() {
    var q = S.q, d2 = S.fermatNow ? 0 : wrongDmg(q, S.cpuExp, 'cpu');
    damage('you', d2); S.result.dmg = d2; S.result.cpuExp = S.cpuExp;
    if (d2 > 0) snd('hit', 0.3);
    addLog('あなた：' + (S.result.timeout ? '時間切れ' : 'まちがい') + ' → ' + d2 + ' ダメージ（CPU は解き方を' + (S.cpuExp ? '説明できた' : '説明できなかった') + '）', 'you');
    S.phase = 'yourResult'; render();
  }
  function youShieldDecide(use) {
    if (use === 'fermat' && canOnce('you', 'fermat')) {
      S.once.you = true; S.fermatNow = true; addLog('あなた：フェルマー「余白が足りない！」→ ダメージ 0', 'you'); snd('shield');
    } else if (use) {
      var i = findKind('you', 'shield');
      if (i >= 0) { discard('you', i); S.shield = true; addLog('あなた：シールドを使った（ダメージ −2）', 'you'); snd('shield'); }
    }
    applyYourWrong();
  }
  function endCpuTurn() {
    if (S.pendingQ && S.life.you > 0 && S.life.cpu > 0) {
      nextProblem(); S.phase = 'answer'; render(); snd('card', 0.2); startTimer(); return;
    }
    refill('cpu'); S.turn = 'you'; startTurn();
  }

  /* ────────── 描画 ────────── */
  function stars(n) { return '★'.repeat(n) + '<span class="cb-off">' + '★'.repeat(3 - n) + '</span>'; }
  function cardHTML(c, opts) {
    opts = opts || {};
    var cls = 'cb-card' + (opts.big ? ' cb-big' : '') + (opts.sel ? ' is-sel' : '');
    if (c.kind === 'q') {
      cls += ' cb-q cb-s' + c.star;
      var mark = '';
      if (opts.mark) {
        var g = unitGroup(c.unit);
        if (S.weak.indexOf(g) >= 0) mark = '<span class="cb-mark cb-weak">CPU の苦手</span>';
        else if (g === S.good) mark = '<span class="cb-mark cb-goodu">CPU の得意</span>';
      }
      return '<div class="' + cls + '"><div class="cb-top"><span class="cb-unit">' + esc(c.unit) + '</span><span class="cb-stars" aria-label="★' + c.star + '">' + stars(c.star) + '</span></div>' +
        '<div class="cb-text">' + br(c.text) + '</div>' + mark + '<div class="cb-foot">ダメージ ' + c.star + '</div></div>';
    }
    cls += ' cb-sp cb-' + c.kind;
    return '<div class="' + cls + '"><div class="cb-top"><span class="cb-unit">特殊カード</span></div><div class="cb-spname">' + esc(c.name) + '</div><div class="cb-desc">' + esc(c.desc) + '</div></div>';
  }
  function lifeHTML(who) {
    var l = S.life[who], m = S.max[who], h = '';
    for (var i = 0; i < m; i++) h += '<span class="cb-heart' + (i < l ? '' : ' is-lost') + '"></span>';
    return '<div class="cb-life cb-' + who + (S.turn === who && S.phase !== 'over' ? ' is-turn' : '') + '"><span class="cb-lname">' + name(who) + '</span>' + charChip(who) + '<span class="cb-hearts" aria-label="ライフ ' + l + '">' + h + '</span><span class="cb-lnum">' + l + '</span></div>';
  }
  function render() {
    var A = $('cb-app');
    if (!S) { A.className = 'cb-ph-setup'; A.innerHTML = setupHTML(); bindSetup(); return; }
    var keep = Array.prototype.map.call(document.querySelectorAll('.cb-in'), function (e) { return e.value; });
    var h = '<div class="cb-bar">' + lifeHTML('cpu') + '<div class="cb-traits"><span class="cb-weak">苦手：' + S.weak.join('・') + '</span><span class="cb-goodu">得意：' + S.good + '</span></div><div class="cb-cpuhand" aria-label="CPU の手札 ' + S.hand.cpu.length + ' 枚">' + S.hand.cpu.map(function () { return '<span class="cb-back"></span>'; }).join('') + '</div><div class="cb-deck">山札 ' + S.deck.length + '</div></div>';
    h += '<div class="cb-field">' + fieldHTML() + '</div>';
    A.className = 'cb-ph-' + S.phase;
    h += '<div class="cb-bar cb-bar-you">' + lifeHTML('you') + soundHTML() + '<details class="cb-log"><summary>記録</summary><ol>' + S.log.map(function (l) { return '<li class="cb-' + l.who + '">' + esc(l.t) + '</li>'; }).join('') + '</ol></details></div>';
    h += '<div class="cb-hand" role="list" aria-label="あなたの手札">' + S.hand.you.map(function (c, i) {
      var picked = S.phase === 'swap' && S.swapPick.indexOf(c) >= 0;
      return '<button type="button" class="cb-slot' + (picked ? ' is-picked' : '') + '" role="listitem" data-i="' + i + '" aria-pressed="' + (S.sel === i || picked) + '"' + (handUsable(c) ? '' : ' disabled') + '>' + cardHTML(c, { sel: S.sel === i, mark: S.phase === 'attack' }) + '</button>';
    }).join('') + '</div>';
    A.innerHTML = h;
    bind();
    var inps = document.querySelectorAll('.cb-in');
    Array.prototype.forEach.call(inps, function (e, i) { if (keep[i] != null) e.value = keep[i]; });
    if (inps.length && S.phase === 'answer' && !keep.length) inps[0].focus({ preventScroll: true });
  }
  function soundHTML() {
    if (!window.CBSound) return '';
    var m = window.CBSound.music(), f = window.CBSound.sfx();
    return '<div class="cb-sound"><button type="button" class="cb-tg" id="cb-music" aria-pressed="' + m + '">♪ 音楽 ' + (m ? 'ON' : 'OFF') + '</button>' +
      '<button type="button" class="cb-tg" id="cb-sfx" aria-pressed="' + f + '">効果音 ' + (f ? 'ON' : 'OFF') + '</button></div>';
  }
  function nextLabel(who) {
    if (S.life.you <= 0 || S.life.cpu <= 0) return '結果を見る';
    return S.pendingQ ? '2 問目へ（高木の類体論）' : '次へ（' + who + '）';
  }
  function charChip(who) {
    var c = CHARS[S.char[who]], used = c.once && S.once[who];
    return '<span class="cb-chip' + (used ? ' is-used' : '') + '" title="' + esc(c.skill + '：' + c.desc) + '"><span class="cb-chip-sym">' + c.sym + '</span>' + esc(c.name) + '<span class="cb-chip-skill">' + esc(c.skill) + (used ? '（使用済み）' : '') + '</span></span>';
  }
  function chanceWord(p) {
    var t = p >= 0.85 ? 'とても高い' : p >= 0.7 ? '高い' : p >= 0.5 ? 'ふつう' : '低い';
    return t + '（約 ' + Math.round(p * 10) * 10 + '%）';
  }
  function handUsable(c) {
    if (S.phase === 'attack') return c.kind === 'q' || ((c.kind === 'draw' || c.kind === 'heal' || c.kind === 'swap') && !S.used1[c.kind]);
    if (S.phase === 'swap') return c !== S.swapCard;
    if (S.phase === 'answer') return c.kind === 'counter' && !S.counter;
    if (S.phase === 'shieldAsk') return c.kind === 'shield';
    return false;
  }
  function fieldHTML() {
    var h = '', q = S.q;
    if (S.msg) h += '<div class="cb-msg" role="status">' + esc(S.msg) + '</div>';
    switch (S.phase) {
      case 'attack': {
        var c = S.hand.you[S.sel];
        h += '<div class="cb-side"><h2>あなたの番：問題カードを出そう</h2><p class="cb-note">CPU がまちがえたら ★ の数だけダメージ。でも正解されると、あなたが<b>反撃 1 ダメージ</b>を受けます。CPU の<b>苦手な単元</b>をねらおう。</p>';
        if (c && c.kind === 'q') {
          h += '<p class="cb-chance">CPU が正解しそうな確率：' + chanceWord(cpuChance(c)) + '</p>';
          h += '<button type="button" class="cb-btn cb-main" id="cb-attack">このカードを出す</button>';
          if (canOnce('you', 'takagi')) {
            var pts = sameUnitPartners('you', c);
            if (pts.length) h += '<p class="cb-note"><b class="cb-skill">高木の類体論（1 回だけ）</b>：同じ単元のカードを 2 枚まとめて出せます。</p>' +
              pts.map(function (pc) { return '<button type="button" class="cb-btn cb-takagi" data-partner="' + S.hand.you.indexOf(pc) + '">＋「' + esc(pc.text.replace(/\n/g, ' ')) + '」（★' + pc.star + '）もまとめて出す</button>'; }).join('');
          }
        }
        else if (c && (c.kind === 'draw' || c.kind === 'heal')) h += '<button type="button" class="cb-btn cb-main" id="cb-usesp">' + esc(c.name) + 'を使う</button>';
        else if (c && c.kind === 'swap') h += '<button type="button" class="cb-btn cb-main" id="cb-swapstart">入れかえを使う</button>';
        else h += '<p class="cb-note cb-point">↓ 手札のカードをえらんでね</p>';
        h += '</div>';
        if (c) h = '<div class="cb-stage">' + cardHTML(c, { big: true }) + h + '</div>';
        else h = '<div class="cb-stage cb-empty"><div class="cb-slotbig">？</div>' + h + '</div>';
        return h;
      }
      case 'swap': {
        var n = S.swapPick.length;
        return '<div class="cb-stage">' + cardHTML(S.swapCard, { big: true }) + '<div class="cb-side"><h2>入れかえるカードをえらぼう</h2>' +
          '<p class="cb-note">手札から好きな枚数をタップしてえらびます（もう一度タップで取り消し）。えらんだカードは捨てて、同じ枚数を山札から引きます。</p>' +
          '<div class="cb-row"><button type="button" class="cb-btn cb-main" id="cb-swapdo"' + (n ? '' : ' disabled') + '>えらんだ ' + n + ' 枚を入れかえる</button>' +
          '<button type="button" class="cb-btn" id="cb-swapcancel">やめる</button></div></div></div>';
      }
      case 'cpuThink':
        return '<div class="cb-stage">' + cardHTML(q, { big: true }) + '<div class="cb-side"><h2>CPU が考えています…</h2><div class="cb-dots"><span></span><span></span><span></span></div></div></div>';
      case 'explain': {
        var r = S.result;
        return '<div class="cb-stage">' + cardHTML(q, { big: true }) + '<div class="cb-side"><h2>CPU は「' + esc(fmt(r.given)) + '」と答えた → まちがい！</h2>' +
          '<div class="cb-back-ans"><b>カードの裏</b>：答え ' + esc(ansStr(q)) + '<br>' + esc(q.sol) + '<br><span class="cb-pt">ポイント：' + esc(q.hint) + '</span></div>' +
          '<p class="cb-note">ダメージを入れるには、出した人が<b>解き方を説明</b>します。声に出して説明してみよう。' +
          (hasChar('you', 'euclid') ? '<b class="cb-skill">ユークリッドの力</b>で、説明できてもできなくても ' + wrongDmg(q, true, 'you') + ' ダメージ。' : '説明できたら ' + wrongDmg(q, true, 'you') + ' ダメージ、できなければ ' + wrongDmg(q, false, 'you') + ' ダメージ。') +
          (hasChar('you', 'riemann') && q.star === 3 ? '（<b class="cb-skill">リーマンの力</b>で ＋1）' : '') + (S.shield ? '（CPU のシールドで 2 へっています）' : '') + '</p>' +
          '<div class="cb-row"><button type="button" class="cb-btn cb-main" id="cb-exp-ok">説明できた</button><button type="button" class="cb-btn" id="cb-exp-ng">できなかった</button></div></div></div>';
      }
      case 'cpuResult': {
        var r2 = S.result, t;
        if (r2.ok) t = '<h2 class="cb-bad">CPU が正解（' + esc(fmt(r2.given)) + '）→ 反撃 ' + r2.dmg + ' ダメージ</h2><p>' + (S.counter ? '<b class="cb-hit">倍返しが効いた！</b>' : '') + 'CPU はカードを 1 枚引きました。</p>';
        else if (r2.fermat) t = '<h2 class="cb-bad">CPU のフェルマー「余白が足りない！」→ ダメージ 0</h2><p>CPU は 1 回だけの能力を使いました。</p>';
        else t = '<h2 class="cb-good">CPU に ' + r2.dmg + ' ダメージ！</h2><p>' + (S.shield ? 'CPU のシールドで 2 へった。' : '') + (r2.explained ? 'ちゃんと説明できたね。' : '次は説明できるように、カードの裏の解き方を読んでおこう。') + '</p>';
        return '<div class="cb-stage">' + cardHTML(q, { big: true }) + '<div class="cb-side">' + t + '<button type="button" class="cb-btn cb-main" id="cb-next">' + nextLabel('CPU の番') + '</button></div></div>';
      }
      case 'answer': {
        var pair = Array.isArray(q.ans);
        var ins = pair ? '<div class="cb-row"><label>' + q.labels[0] + ' =<input class="cb-in" inputmode="text" autocomplete="off"></label><label>' + q.labels[1] + ' =<input class="cb-in" inputmode="text" autocomplete="off"></label></div>'
          : '<div class="cb-row"><label>答え<input class="cb-in cb-in-1" inputmode="text" autocomplete="off"></label></div>';
        var tools = '';
        if (findKind('you', 'counter') >= 0 && !S.counter) tools += '<button type="button" class="cb-btn cb-counterbtn" id="cb-counter">倍返しを宣言</button>';
        return '<div class="cb-stage">' + cardHTML(q, { big: true }) + '<div class="cb-side"><h2>CPU の攻撃！ 答えよう' + (S.time ? '<span class="cb-timer" id="cb-timer">' + S.left + '</span>' : '') + '</h2>' +
          '<p class="cb-note">正解すれば CPU に反撃 ' + counterDmg(q, 'you') + ' ダメージ。まちがえると最大 ' + wrongDmg(q, true, 'cpu') + ' ダメージ。</p>' +
          (S.pendingQ ? '<p class="cb-tag cb-counterbtn">高木の類体論：このあともう 1 問あります</p>' : '') +
          (S.counter ? '<p class="cb-tag cb-counterbtn">倍返し宣言中</p>' : '') +
          ins + (DECKS[S.deckKey].keys.length ? '<div class="cb-keys" aria-label="記号を入れる">' + DECKS[S.deckKey].keys.map(function (k) { return '<button type="button" class="cb-key" data-ins="' + k + '">' + k + '</button>'; }).join('') + '</div>' : '') +
          '<p class="cb-note">' + esc(DECKS[S.deckKey].note) + '</p>' +
          (tools ? '<div class="cb-row">' + tools + '</div>' : '') +
          '<button type="button" class="cb-btn cb-main" id="cb-answer">答える</button></div></div>';
      }
      case 'shieldAsk': {
        var full = wrongDmg(q, S.cpuExp, 'cpu'), cut = Math.max(0, full - 2);
        var btns = '';
        if (findKind('you', 'shield') >= 0) btns += '<button type="button" class="cb-btn cb-main" id="cb-sh-yes">シールドを使う（' + full + ' → ' + cut + '）</button>';
        if (canOnce('you', 'fermat')) btns += '<button type="button" class="cb-btn cb-main cb-fermat" id="cb-sh-fermat">フェルマー「余白が足りない」（' + full + ' → 0・1 回だけ）</button>';
        return '<div class="cb-stage">' + cardHTML(q, { big: true }) + '<div class="cb-side"><h2 class="cb-bad">' + (S.result.timeout ? '時間切れ' : 'まちがい') + '… ダメージを減らす？</h2>' +
          '<p>CPU は解き方を' + (S.cpuExp ? '説明できた' : '説明できなかった') + '。このままだと <b class="cb-hit">' + full + ' ダメージ</b>です。</p>' +
          '<p class="cb-note">シールドもフェルマーの力も使いきり。大きいダメージのときまで取っておくのも作戦です。</p>' +
          '<div class="cb-row">' + btns + '<button type="button" class="cb-btn" id="cb-sh-no">使わない</button></div></div></div>';
      }
      case 'yourResult': {
        var r3 = S.result, t3;
        if (r3.ok) t3 = '<h2 class="cb-good">正解！ CPU に反撃 ' + r3.dmg + ' ダメージ</h2><p>' + (S.counter ? '<b class="cb-hit">倍返しが効いた！</b>' : '') + 'カードを 1 枚引きました。</p>';
        else t3 = '<h2 class="cb-bad">' + (r3.timeout ? '時間切れ' : 'ざんねん') + '… ' + r3.dmg + ' ダメージ</h2>' + (S.shield ? '<p>シールドで 2 へらせた！</p>' : '') + (S.fermatNow ? '<p><b class="cb-skill">余白が足りない！</b> ダメージを 0 にした。</p>' : '') + (!S.fermatNow && !r3.cpuExp ? '<p>CPU は説明できなかったので、ダメージは半分。</p>' : '') +
          '<div class="cb-back-ans"><b>CPU の説明</b>：答えは ' + esc(ansStr(q)) + '<br>' + esc(q.sol) + '<br><span class="cb-pt">ポイント：' + esc(q.hint) + '</span></div>';
        return '<div class="cb-stage">' + cardHTML(q, { big: true }) + '<div class="cb-side">' + t3 + '<button type="button" class="cb-btn cb-main" id="cb-next">' + nextLabel('あなたの番') + '</button></div></div>';
      }
      case 'over': {
        var win = S.life.cpu <= 0 && S.life.you > 0;
        return '<div class="cb-stage cb-over"><div class="cb-side"><h2 class="' + (win ? 'cb-good' : 'cb-bad') + '">' + (win ? 'あなたの勝ち！' : 'CPU の勝ち…') + '</h2>' +
          '<p>のこりライフ　あなた ' + S.life.you + '　／　CPU ' + S.life.cpu + '</p>' +
          '<div class="cb-row"><button type="button" class="cb-btn cb-main" id="cb-again">同じ設定でもう一度</button><button type="button" class="cb-btn" id="cb-reset">設定を変える</button></div></div></div>';
      }
    }
    return h;
  }

  function setupHTML() {
    function radio(n, v, l, c) { return '<label class="cb-radio"><input type="radio" name="cb-' + n + '" value="' + v + '"' + (c ? ' checked' : '') + '><span>' + l + '</span></label>'; }
    var pick = curChar || 'euclid';
    var chars = '<div class="cb-box cb-charbox"><h2>キャラクターをえらぶ</h2><div class="cb-chars" role="radiogroup" aria-label="あなたのキャラクター">' +
      CHAR_ORDER.map(function (k) {
        var c = CHARS[k];
        return '<label class="cb-charcard cb-ch-' + k + '"><input type="radio" name="cb-ch" value="' + k + '"' + (k === pick ? ' checked' : '') + '>' +
          '<span class="cb-ch-sym">' + c.sym + '</span><span class="cb-ch-name">' + esc(c.name) + '</span><span class="cb-ch-era">' + esc(c.era) + '</span>' +
          '<span class="cb-ch-skill">' + esc(c.skill) + (c.once ? '（1 回だけ）' : '') + '</span><span class="cb-ch-desc">' + esc(c.desc) + '</span>' +
          '<span class="cb-ch-story">' + esc(c.story) + '</span></label>';
      }).join('') + '</div>' +
      '<label class="cb-cpuch">CPU のキャラクター：<select id="cb-cc"><option value="random">おまかせ</option>' + CHAR_ORDER.map(function (k) { return '<option value="' + k + '">' + esc(CHARS[k].name) + '</option>'; }).join('') + '</select></label></div>';
    return chars + '<div class="cb-setup"><div class="cb-box"><h2>ルール</h2><ol class="cb-rules">' +
      '<li>手札は 5 枚。自分の番に<b>問題カード</b>を 1 枚えらんで、相手に出す。</li>' +
      '<li>相手が答える。<b>正解</b>なら、出した人に<b>反撃 1 ダメージ</b>。答えた人はカードを 1 枚引ける。</li>' +
      '<li><b>まちがい</b>なら、出した人が解き方を説明して、★ の数だけダメージ（説明できなければ半分）。</li>' +
      '<li>CPU には<b>苦手な単元</b>と<b>得意な単元</b>がある。苦手をねらおう。</li>' +
      '<li><b>キャラクター</b>：6 人の数学者から 1 人えらぶ。それぞれ能力が 1 つある（「1 回だけ」の能力は、使ったら終わり）。</li>' +
      '<li><b>特殊カード</b>：答える番に「倍返し（反撃が ★＋1 に）」、まちがえたときに「シールド（ダメージ −2）」、自分の番に「入れかえ（好きな枚数を山札と交換）」「2 枚ドロー」「回復（ライフ ＋2）」。</li>' +
      '<li>相手のライフを 0 にしたら勝ち！</li></ol></div>' +
      '<div class="cb-box"><h2>設定</h2>' +
      '<fieldset><legend>レベル（問題カードの束）</legend>' + ORDER.map(function (k) { return radio('dk', k, DECKS[k].name + '（' + DECKS[k].range + '）', k === curDeck); }).join('') + '</fieldset>' +
      '<fieldset><legend>CPU の強さ</legend>' + radio('cp', 'easy', 'やさしい', true) + radio('cp', 'normal', 'ふつう', false) + radio('cp', 'strong', 'つよい', false) + '</fieldset>' +
      '<fieldset><legend>あなたのライフ</legend>' + radio('ly', '10', '10', true) + radio('ly', '7', '7', false) + radio('ly', '5', '5（ハンデ）', false) + '</fieldset>' +
      '<fieldset><legend>CPU のライフ</legend>' + radio('lc', '10', '10', true) + radio('lc', '7', '7', false) + radio('lc', '5', '5', false) + '</fieldset>' +
      '<fieldset><legend>答える時間</legend>' + radio('tm', '0', '制限なし', true) + radio('tm', '60', '60 秒', false) + radio('tm', '30', '30 秒', false) + '</fieldset>' +
      '<div class="cb-row"><span class="cb-note">音：</span>' + soundHTML() + '</div>' +
      '<button type="button" class="cb-btn cb-main" id="cb-start">バトル開始</button></div></div>';
  }
  function readOpt() {
    function v(n) { var e = document.querySelector('input[name="cb-' + n + '"]:checked'); return e ? e.value : ''; }
    var you = v('ch') || 'euclid', cc = ($('cb-cc') || {}).value || 'random';
    if (cc === 'random') { var others = CHAR_ORDER.filter(function (k) { return k !== you; }); cc = others[Math.floor(Math.random() * others.length)]; }
    curChar = you;
    return { deck: v('dk') || curDeck, cpu: v('cp'), lifeYou: +v('ly'), lifeCpu: +v('lc'), time: +v('tm'), charYou: you, charCpu: cc };
  }
  function on(id, fn) { var e = $(id); if (e) e.onclick = fn; }
  function bindSetup() {
    Array.prototype.forEach.call(document.querySelectorAll('input[name="cb-dk"]'), function (r) { r.onchange = function () { setDeck(r.value); }; });
    on('cb-start', function () { lastOpt = readOpt(); setDeck(lastOpt.deck); if (window.CBSound) window.CBSound.unlock(); newGame(lastOpt); bgm(true); scrollToApp(); });
    bindSound();
  }
  function bindSound() {
    on('cb-music', function () { var v = !window.CBSound.music(); window.CBSound.setMusic(v); if (v && S && S.phase !== 'over') bgm(true); render(); });
    on('cb-sfx', function () { var v = !window.CBSound.sfx(); window.CBSound.setSfx(v); if (v) snd('click'); render(); });
  }
  function scrollToApp() {
    var a = $('cb-app'), nav = document.querySelector('.site-nav');
    var top = a.getBoundingClientRect().top + window.pageYOffset - (nav ? nav.getBoundingClientRect().height : 0) - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
  function bind() {
    Array.prototype.forEach.call(document.querySelectorAll('.cb-slot'), function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-i'), c = S.hand.you[i];
        if (S.phase === 'attack') { S.sel = S.sel === i ? -1 : i; S.msg = ''; snd('click'); render(); }
        else if (S.phase === 'swap') youSwapToggle(i);
        else if (S.phase === 'answer') { if (c.kind === 'counter') youUseCounter(); }
        else if (S.phase === 'shieldAsk') { if (c.kind === 'shield') youShieldDecide(true); }
      };
    });
    on('cb-attack', function () { youAttack(null); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-partner]'), function (b) {
      b.onclick = function () { youAttack(S.hand.you[+b.getAttribute('data-partner')]); };
    });
    on('cb-sh-fermat', function () { youShieldDecide('fermat'); });
    on('cb-usesp', function () { var i = S.sel; S.sel = -1; youPlaySpecial(i); });
    on('cb-sh-yes', function () { youShieldDecide(true); });
    on('cb-sh-no', function () { youShieldDecide(false); });
    on('cb-exp-ok', function () { youExplain(true); });
    on('cb-exp-ng', function () { youExplain(false); });
    on('cb-next', function () { if (S.phase === 'cpuResult') endYourTurn(); else endCpuTurn(); });
    on('cb-swapstart', function () { youSwapStart(S.sel); });
    on('cb-swapdo', youSwapDo);
    on('cb-swapcancel', youSwapCancel);
    Array.prototype.forEach.call(document.querySelectorAll('[data-ins]'), function (b) {
      b.onmousedown = function (ev) { ev.preventDefault(); };
      b.onclick = function () {
        var inp = document.activeElement && document.activeElement.classList.contains('cb-in') ? document.activeElement : (lastIn || document.querySelector('.cb-in'));
        if (!inp) return;
        var t = b.getAttribute('data-ins'), a = inp.selectionStart == null ? inp.value.length : inp.selectionStart, z = inp.selectionEnd == null ? a : inp.selectionEnd;
        inp.value = inp.value.slice(0, a) + t + inp.value.slice(z);
        inp.focus(); try { inp.setSelectionRange(a + t.length, a + t.length); } catch (e) {}
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll('.cb-in'), function (e) { e.addEventListener('focus', function () { lastIn = e; }); });
    on('cb-counter', youUseCounter);
    on('cb-answer', function () { youAnswer(false); });
    on('cb-again', function () { newGame(lastOpt); bgm(true); });
    bindSound();
    on('cb-reset', function () { S = null; render(); });
    Array.prototype.forEach.call(document.querySelectorAll('.cb-in'), function (e) {
      e.onkeydown = function (ev) { if (ev.key === 'Enter') youAnswer(false); };
    });
  }
  root.__cbState = function () { return S; };  // 動作確認用
  root.__cbRender = function () { render(); };
  function init() { showLevel(); render(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
