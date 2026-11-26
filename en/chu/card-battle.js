/* ════════════════════════════════════════════════════════
   Math Card Battle (English version of /math-site/chu/card-battle.js)
   Play a problem card; the other side answers. A wrong answer takes damage.
   Whoever reaches 0 life loses. The opponent is the computer (CPU).
   First half: cards and answer checking (testable in node)
   Second half: the screen
   ════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var MINUS = '−';

  /* ────────── 問題カード ──────────
     [★, 単元, 問題, 答え, ヒント, 解き方]
     答えは数、または [x, y] / [a, b] の組（labels で名前を決める） */
  /* 問題カードは card-battle-decks.js（CB_DECKS）にある。デッキ：sho-low / sho-high / chu / ko / dai */
  var DECKS = root.CB_DECKS || (typeof require === 'function' ? require('./card-battle-decks.js') : {});  /* English decks (en/chu/card-battle-decks.js) */
  var DEFAULT_DECK = 'chu';
  /* [種類, 名前, 説明, 枚数]。特殊カードは全部で 8 枚 */
  var SPECIALS = [
    ['swap', 'Swap', 'Use on your turn. Pick any number of cards in your hand and swap them with the deck.', 2],
    ['counter', 'Payback', 'Use before you answer. If you get it right, your counterattack does ★+1 damage.', 2],
    ['shield', 'Shield', 'Use when you get one wrong. Take 2 less damage.', 2],
    ['draw', 'Draw 2', 'Use on your turn. Draw 2 cards from the deck.', 1],
    ['heal', 'Heal', 'Use on your turn. Get 2 life back.', 1]
  ];
  /* キャラクター 6 人（数学者）。limit は回数に限りがある能力（1 回だけ／2 回まで）
     強さは CPU どうしの大量対戦で、どのキャラも勝率がほぼ同じになるように調整した */
  var CHARS = {
    euclid: { name: 'Euclid', sym: '△', era: 'Ancient Greece', story: 'His Elements built everything by proof from definitions and axioms, and was a math textbook for over 2000 years.', skill: 'Master of Proof', desc: 'When your opponent gets one wrong and you can explain the solution, you deal 1 more damage.' },
    gauss: { name: 'Gauss', sym: 'Σ', era: 'Germany', story: 'He constructed the regular 17-gon with ruler and compass, something no one had managed for 2000 years.', skill: 'Quick Calculation', desc: 'When you answer a ★1 problem correctly, your counterattack does 2 more damage.' },
    riemann: { name: 'Riemann', sym: 'ζ', era: 'Germany', story: 'His conjecture about the zeros of the zeta function is still unsolved after more than 160 years.', skill: 'Unsolved Mystery', desc: 'When your opponent gets a ★3 problem wrong, you deal 2 more damage.' },
    euler: { name: 'Euler', sym: 'e', era: 'Switzerland', story: 'Even after losing his sight he kept dictating papers, and may have written more than anyone in history.', skill: 'Unbreakable', desc: 'When you get a ★2 or ★3 problem wrong, you take 1 less damage.' },
    fermat: { name: 'Fermat', sym: 'xⁿ', era: 'France', story: 'The note he left in a margin stayed a mystery for 358 years until it was finally proved in 1995.', skill: 'The Margin Is Too Small', desc: 'When you get one wrong, you can take 0 damage.', limit: 1 },
    takagi: { name: 'Teiji Takagi', sym: '類', era: 'Japan', story: 'With class field theory, he brought Japanese mathematics to the front line of the world.', skill: 'Class Field Theory', desc: 'Play 2 problem cards from the same topic at once. Your opponent cannot counterattack even if they answer correctly.', limit: 2 }
  };
  var CHAR_ORDER = ['euclid', 'gauss', 'riemann', 'euler', 'fermat', 'takagi'];
  function unitGroup(u) { return u === 'Inverse proportion' ? 'Proportion' : u; }
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
    return card.labels[0] + ' = ' + fmt(card.ans[0]) + ', ' + card.labels[1] + ' = ' + fmt(card.ans[1]);
  }

  /* 答えの読み取り（全角・マイナス記号・分数・√ に対応。2√3 のようなかけ算の省略も読む） */
  function evalExpr(str) {
    var s = String(str == null ? '' : str).trim();
    if (!s) return NaN;
    s = s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); })
      .replace(/ルート|sqrt|√/gi, 'r').replace(/pi|π/gi, 'P').replace(/e/g, 'E')
      .replace(/[−ー－‐–]/g, '-').replace(/＋/g, '+').replace(/[／÷]/g, '/').replace(/[×＊]/g, '*')
      .replace(/（/g, '(').replace(/）/g, ')').replace(/．/g, '.').replace(/[$¢,]/g, '').replace(/\s+/g, '');  /* $160 / 180¢ / 1,000 も読む */
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
    if (/in the form/.test(card.text) && !squareFree(inputs[0])) return false;
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
    easy: { label: 'Easy', p: [0, 0.8, 0.6, 0.4], explain: 0.7 },
    normal: { label: 'Normal', p: [0, 0.9, 0.75, 0.55], explain: 0.85 },
    strong: { label: 'Strong', p: [0, 0.96, 0.88, 0.75], explain: 0.95 }
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
    if (e) e.textContent = d.name + ' (' + d.range + ')';
    document.title = 'Math Card Battle: ' + d.name + ' - Math the Japanese Way';
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
      char: { you: opt.charYou, cpu: opt.charCpu }, once: { you: 0, cpu: 0 }, combo: false, pendingQ: null, fermatNow: false
    };
    var u = shuffle(unitsOf(opt.deck));
    S.weak = [u[0], u[1]]; S.good = u[2];
    for (var i = 0; i < HAND; i++) { S.hand.you.push(draw()); S.hand.cpu.push(draw()); }
    addLog('Battle start! You: ' + CHARS[S.char.you].name + ' (' + CHARS[S.char.you].skill + '), CPU: ' + CHARS[S.char.cpu].name + ' (' + CHARS[S.char.cpu].skill + '). CPU is weak at ' + S.weak.join(' and ') + ' and strong at ' + S.good + '.');
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
  function name(w) { return w === 'you' ? 'You' : 'CPU'; }
  function discard(who, idx) { var c = S.hand[who].splice(idx, 1)[0]; S.used.push(c); return c; }
  function hasChar(who, k) { return S.char[who] === k; }
  function canOnce(who, k) { return hasChar(who, k) && S.once[who] < (CHARS[k].limit || 1); }
  function limitLabel(c) { return c.limit ? (c.limit === 1 ? ' (once only)' : ' (up to ' + c.limit + ' times)') : ''; }
  function drawN() { return 2; }
  function findKind(who, kind) { for (var i = 0; i < S.hand[who].length; i++) if (S.hand[who][i].kind === kind) return i; return -1; }

  function startTurn() {
    S.sel = -1; S.q = null; S.counter = false; S.shield = false; S.result = null; S.used1 = {}; S.pendingQ = null; S.fermatNow = false; S.combo = false;
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
    if (c.kind === 'draw') { snd('draw'); var n = drawN('you'); for (var k = 0; k < n; k++) S.hand.you.push(draw()); addLog('You: drew ' + n + ' cards', 'you'); }
    if (c.kind === 'heal') { snd('heal'); var b = S.life.you; S.life.you = Math.min(S.max.you, S.life.you + 2); addLog('You: healed (life ' + b + ' → ' + S.life.you + ')', 'you'); }
    render();
  }
  function sameUnitPartners(who, card) {
    return S.hand[who].filter(function (c) { return c !== card && c.kind === 'q' && unitGroup(c.unit) === unitGroup(card.unit); });
  }
  function youAttack(partner) {
    var card = S.hand.you[S.sel];
    if (!card || card.kind !== 'q') return;
    S.q = discard('you', S.sel); S.sel = -1;
    addLog('You played ★' + S.q.star + ' “' + S.q.text.replace(/\n/g, ' / ') + '”', 'you');
    if (partner && canOnce('you', 'takagi')) {
      S.pendingQ = discard('you', S.hand.you.indexOf(partner)); S.once.you++; S.combo = true;
      addLog('You: Takagi\'s Class Field Theory! Also played ★' + S.pendingQ.star + ' “' + S.pendingQ.text.replace(/\n/g, ' / ') + '” (CPU cannot counterattack even if correct)', 'you');
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
  /* 正解したときの反撃（answerer = 答えた人）。ガウスは ★1 で ＋2。高木の 2 枚出しには反撃できない */
  function counterDmg(q, answerer) { if (S.combo) return 0; return (S.counter ? q.star + 1 : 1) + (hasChar(answerer, 'gauss') && q.star === 1 ? 2 : 0); }
  function cpuAnswer() {
    var q = S.q, p = cpuChance(q);
    /* CPU の作戦：自信があれば倍返し（シールドはまちがえたあとに使う） */
    var ci = findKind('cpu', 'counter');
    if (ci >= 0 && !S.combo && p >= 0.8 && Math.random() < 0.6) { discard('cpu', ci); S.counter = true; addLog('CPU declared Payback!', 'cpu'); snd('counter', 0.2); }
    var ok = Math.random() < p;
    var ans = ok ? q.ans : wrongAnswer(q);
    S.result = { who: 'cpu', ok: ok, given: ans };
    if (ok) {
      S.hand.cpu.push(draw());
      var d = counterDmg(q, 'cpu'); damage('you', d); S.result.dmg = d;
      snd('wrong', 0.3); snd('hit', 0.65);
      addLog('CPU answered ' + fmt(ans) + ': correct → counterattack, ' + d + ' damage to you. CPU drew 1 card', 'cpu');
      S.phase = 'cpuResult';
    } else {
      addLog('CPU answered ' + fmt(ans) + ' (wrong)', 'cpu');
      snd('correct', 0.3);
      var si = findKind('cpu', 'shield');
      if (si >= 0 && q.star >= 2) { discard('cpu', si); S.shield = true; addLog('CPU used a Shield (damage −2)', 'cpu'); snd('shield', 0.8); }
      S.phase = 'explain';
    }
    render();
  }
  /* まちがえたときのダメージ（attacker = 問題を出した人、full = 説明できた）
     ユークリッドは説明できたら ＋1、リーマンは ★3 で ＋2、シールドで −2、答えた人がオイラーなら ★2・★3 で −1 */
  function wrongDmg(q, full, attacker) {
    var base = full ? q.star : Math.floor(q.star / 2);
    if (hasChar(attacker, 'euclid') && full) base += 1;
    if (hasChar(attacker, 'riemann') && q.star === 3) base += 2;
    if (S.shield) base -= 2;
    if (hasChar(other(attacker), 'euler') && q.star >= 2) base -= 1;
    return Math.max(0, base);
  }
  function youExplain(could) {
    var full = could;
    var d = wrongDmg(S.q, full, 'you');
    /* CPU のフェルマー：大きいダメージ、またはやられそうなときに使う */
    if (d > 0 && canOnce('cpu', 'fermat') && (d >= 3 || d >= S.life.cpu)) {
      S.once.cpu++; S.result.fermat = true; addLog('CPU: Fermat, “The margin is too small!” → 0 damage', 'cpu'); d = 0;
    }
    damage('cpu', d);
    if (d > 0) snd('hit'); else snd('shield');
    addLog('You ' + (could ? 'explained' : 'could not explain') + ' the solution' + (could && hasChar('you', 'euclid') ? ' (+1 from Euclid)' : '') + ' → ' + d + ' damage to CPU', 'you');
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
    if (hl >= 0 && S.life.cpu <= S.max.cpu - 3) { discard('cpu', hl); snd('heal'); var b0 = S.life.cpu; S.life.cpu = Math.min(S.max.cpu, S.life.cpu + 2); addLog('CPU healed (life ' + b0 + ' → ' + S.life.cpu + ')', 'cpu'); }
    var sw = findKind('cpu', 'swap');
    if (sw >= 0) {
      var low = h.filter(function (c, i) { return i !== sw && (c.kind === 'q' && c.star === 1); });
      if (low.length >= 2) {
        discard('cpu', sw);
        low.forEach(function (c) { S.used.push(h.splice(h.indexOf(c), 1)[0]); });
        low.forEach(function () { h.push(draw()); });
        addLog('CPU swapped ' + low.length + ' cards', 'cpu'); snd('draw', 0.2);
      }
    }
    var di = findKind('cpu', 'draw');
    if (di >= 0 && h.filter(function (c) { return c.kind === 'q'; }).length <= 2) {
      discard('cpu', di); var dn = drawN('cpu'); for (var k2 = 0; k2 < dn; k2++) h.push(draw()); addLog('CPU drew ' + dn + ' cards', 'cpu'); snd('draw', 0.3);
    }
    /* あなたのライフが少ないときは強いカード、ふだんは少しランダムに */
    var qs = [];
    h.forEach(function (c, i) { if (c.kind === 'q') qs.push(i); });
    qs.sort(function (a, b) { return h[b].star - h[a].star; });
    var pick = S.life.you <= 3 || (hasChar('cpu', 'riemann') && h[qs[0]].star === 3) ? qs[0] : qs[Math.floor(Math.random() * Math.min(2, qs.length))];
    S.q = discard('cpu', pick);
    addLog('CPU played ★' + S.q.star + ' “' + S.q.text.replace(/\n/g, ' / ') + '”', 'cpu');
    if (canOnce('cpu', 'takagi')) {
      var pt = sameUnitPartners('cpu', S.q);
      if (pt.length && Math.random() < 0.6) {
        S.pendingQ = discard('cpu', h.indexOf(pt[0])); S.once.cpu++; S.combo = true;
        addLog('CPU: Takagi\'s Class Field Theory! Played 2 cards from the same topic (no counterattack even if you are correct)', 'cpu');
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
    addLog('You swapped ' + n + ' cards', 'you'); snd('draw');
    S.phase = 'attack'; ensureQuestion('you'); render();
  }
  function youSwapCancel() { S.swapCard = null; S.swapPick = []; S.phase = 'attack'; render(); }
  function youUseCounter() {
    var i = findKind('you', 'counter'); if (i < 0) return;
    discard('you', i); S.counter = true; addLog('You declared Payback!', 'you'); snd('counter'); render();
  }
  function youAnswer(timeout) {
    var ins = [];
    Array.prototype.forEach.call(document.querySelectorAll('.cb-in'), function (e) { ins.push(e.value); });
    if (!timeout && ins.some(function (v) { return !String(v).trim(); })) { S.msg = 'Please type your answer.'; render(); return; }
    if (!timeout && ins.some(function (v) { return !isFinite(evalExpr(v)); })) { S.msg = 'That could not be read as a number. Try something like −3 or 1/2.'; render(); return; }
    stopTimer();
    S.msg = '';
    var q = S.q, ok = !timeout && check(q, ins);
    S.result = { who: 'you', ok: ok, given: ins, timeout: !!timeout };
    if (ok) {
      S.hand.you.push(draw());
      var d = counterDmg(q, 'you'); damage('cpu', d); S.result.dmg = d;
      snd('correct'); snd('hit', 0.4);
      addLog('You: correct! Counterattack, ' + d + ' damage to CPU. You drew 1 card', 'you');
    } else {
      snd('wrong');
      /* CPU が解き方を説明できたか（ユークリッドならいつも全ダメージ） */
      S.cpuExp = Math.random() < S.cpu.explain;
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
    addLog('You: ' + (S.result.timeout ? 'time up' : 'wrong') + ' → ' + d2 + ' damage (CPU ' + (S.cpuExp ? 'explained' : 'could not explain') + ' the solution)', 'you');
    S.phase = 'yourResult'; render();
  }
  function youShieldDecide(use) {
    if (use === 'fermat' && canOnce('you', 'fermat')) {
      S.once.you++; S.fermatNow = true; addLog('You: Fermat, “The margin is too small!” → 0 damage', 'you'); snd('shield');
    } else if (use) {
      var i = findKind('you', 'shield');
      if (i >= 0) { discard('you', i); S.shield = true; addLog('You used a Shield (damage −2)', 'you'); snd('shield'); }
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
      cls += ' cb-q cb-s' + c.star + (c.text.length > 64 ? ' cb-xlong' : c.text.length > 40 ? ' cb-long' : '');  /* English text is longer: shrink the font */
      var mark = '';
      if (opts.mark) {
        var g = unitGroup(c.unit);
        if (S.weak.indexOf(g) >= 0) mark = '<span class="cb-mark cb-weak">CPU weak</span>';
        else if (g === S.good) mark = '<span class="cb-mark cb-goodu">CPU strong</span>';
      }
      return '<div class="' + cls + '"><div class="cb-top"><span class="cb-unit">' + esc(c.unit) + '</span><span class="cb-stars" aria-label="★' + c.star + '">' + stars(c.star) + '</span></div>' +
        '<div class="cb-text">' + br(c.text) + '</div>' + mark + '<div class="cb-foot">DAMAGE ' + c.star + '</div></div>';
    }
    cls += ' cb-sp cb-' + c.kind;
    return '<div class="' + cls + '"><div class="cb-top"><span class="cb-unit">Special card</span></div><div class="cb-spname">' + esc(c.name) + '</div><div class="cb-desc">' + esc(c.desc) + '</div></div>';
  }
  function lifeHTML(who) {
    var l = S.life[who], m = S.max[who], h = '';
    for (var i = 0; i < m; i++) h += '<span class="cb-heart' + (i < l ? '' : ' is-lost') + '"></span>';
    return '<div class="cb-life cb-' + who + (S.turn === who && S.phase !== 'over' ? ' is-turn' : '') + '"><span class="cb-lname">' + name(who) + '</span>' + charChip(who) + '<span class="cb-hearts" aria-label="Life ' + l + '">' + h + '</span><span class="cb-lnum">' + l + '</span></div>';
  }
  function render() {
    var A = $('cb-app');
    if (!S) { A.className = 'cb-ph-setup'; A.innerHTML = setupHTML(); bindSetup(); return; }
    var keep = Array.prototype.map.call(document.querySelectorAll('.cb-in'), function (e) { return e.value; });
    var h = '<div class="cb-bar">' + lifeHTML('cpu') + '<div class="cb-traits"><span class="cb-weak">Weak: ' + S.weak.join(', ') + '</span><span class="cb-goodu">Strong: ' + S.good + '</span></div><div class="cb-cpuhand" aria-label="CPU hand: ' + S.hand.cpu.length + ' cards">' + S.hand.cpu.map(function () { return '<span class="cb-back"></span>'; }).join('') + '</div><div class="cb-deck">Deck ' + S.deck.length + '</div></div>';
    h += '<div class="cb-field">' + fieldHTML() + '</div>';
    A.className = 'cb-ph-' + S.phase;
    h += '<div class="cb-bar cb-bar-you">' + lifeHTML('you') + soundHTML() + '<details class="cb-log"><summary>Log</summary><ol>' + S.log.map(function (l) { return '<li class="cb-' + l.who + '">' + esc(l.t) + '</li>'; }).join('') + '</ol></details></div>';
    h += '<div class="cb-hand" role="list" aria-label="Your hand">' + S.hand.you.map(function (c, i) {
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
    return '<div class="cb-sound"><button type="button" class="cb-tg" id="cb-music" aria-pressed="' + m + '">♪ Music ' + (m ? 'ON' : 'OFF') + '</button>' +
      '<button type="button" class="cb-tg" id="cb-sfx" aria-pressed="' + f + '">Sound FX ' + (f ? 'ON' : 'OFF') + '</button></div>';
  }
  function nextLabel(who) {
    if (S.life.you <= 0 || S.life.cpu <= 0) return 'See the result';
    return S.pendingQ ? 'Next problem (Class Field Theory)' : 'Next (' + who + ')';
  }
  function charChip(who) {
    var c = CHARS[S.char[who]], used = c.limit && S.once[who] >= c.limit;
    return '<span class="cb-chip' + (used ? ' is-used' : '') + '" title="' + esc(c.skill + ': ' + c.desc) + '"><span class="cb-chip-sym">' + c.sym + '</span>' + esc(c.name) + '<span class="cb-chip-skill">' + esc(c.skill) + (used ? ' (used)' : '') + '</span></span>';
  }
  function chanceWord(p) {
    var t = p >= 0.85 ? 'very high' : p >= 0.7 ? 'high' : p >= 0.5 ? 'medium' : 'low';
    return t + ' (about ' + Math.round(p * 10) * 10 + '%)';
  }
  function handUsable(c) {
    if (S.phase === 'attack') return c.kind === 'q' || ((c.kind === 'draw' || c.kind === 'heal' || c.kind === 'swap') && !S.used1[c.kind]);
    if (S.phase === 'swap') return c !== S.swapCard;
    if (S.phase === 'answer') return c.kind === 'counter' && !S.counter && !S.combo;
    if (S.phase === 'shieldAsk') return c.kind === 'shield';
    return false;
  }
  function fieldHTML() {
    var h = '', q = S.q;
    if (S.msg) h += '<div class="cb-msg" role="status">' + esc(S.msg) + '</div>';
    switch (S.phase) {
      case 'attack': {
        var c = S.hand.you[S.sel];
        h += '<div class="cb-side"><h2>Your turn: play a problem card</h2><p class="cb-note">If CPU gets it wrong, it takes damage equal to the ★s. But if CPU gets it right, you take a <b>counterattack of 1 damage</b>. Aim for the topics CPU is <b>weak</b> at.</p>';
        if (c && c.kind === 'q') {
          h += '<p class="cb-chance">Chance CPU gets it right: ' + chanceWord(cpuChance(c)) + '</p>';
          h += '<button type="button" class="cb-btn cb-main" id="cb-attack">Play this card</button>';
          if (canOnce('you', 'takagi')) {
            var pts = sameUnitPartners('you', c);
            if (pts.length) h += '<p class="cb-note"><b class="cb-skill">Takagi\'s Class Field Theory (' + (CHARS.takagi.limit - S.once.you) + ' left)</b>: you can play 2 cards from the same topic at once. CPU cannot counterattack even if correct.</p>' +
              pts.map(function (pc) { return '<button type="button" class="cb-btn cb-takagi" data-partner="' + S.hand.you.indexOf(pc) + '">+ Also play “' + esc(pc.text.replace(/\n/g, ' ')) + '” (★' + pc.star + ')</button>'; }).join('');
          }
        }
        else if (c && (c.kind === 'draw' || c.kind === 'heal')) h += '<button type="button" class="cb-btn cb-main" id="cb-usesp">Use ' + esc(c.name) + '</button>';
        else if (c && c.kind === 'swap') h += '<button type="button" class="cb-btn cb-main" id="cb-swapstart">Use Swap</button>';
        else h += '<p class="cb-note cb-point">↓ Pick a card from your hand</p>';
        h += '</div>';
        if (c) h = '<div class="cb-stage">' + cardHTML(c, { big: true }) + h + '</div>';
        else h = '<div class="cb-stage cb-empty"><div class="cb-slotbig">？</div>' + h + '</div>';
        return h;
      }
      case 'swap': {
        var n = S.swapPick.length;
        return '<div class="cb-stage">' + cardHTML(S.swapCard, { big: true }) + '<div class="cb-side"><h2>Choose cards to swap</h2>' +
          '<p class="cb-note">Tap as many cards in your hand as you like (tap again to undo). They are discarded and you draw the same number from the deck.</p>' +
          '<div class="cb-row"><button type="button" class="cb-btn cb-main" id="cb-swapdo"' + (n ? '' : ' disabled') + '>Swap ' + n + ' card' + (n === 1 ? '' : 's') + '</button>' +
          '<button type="button" class="cb-btn" id="cb-swapcancel">Cancel</button></div></div></div>';
      }
      case 'cpuThink':
        return '<div class="cb-stage">' + cardHTML(q, { big: true }) + '<div class="cb-side"><h2>CPU is thinking…</h2><div class="cb-dots"><span></span><span></span><span></span></div></div></div>';
      case 'explain': {
        var r = S.result;
        return '<div class="cb-stage">' + cardHTML(q, { big: true }) + '<div class="cb-side"><h2>CPU answered “' + esc(fmt(r.given)) + '” → wrong!</h2>' +
          '<div class="cb-back-ans"><b>Back of the card</b>: answer ' + esc(ansStr(q)) + '<br>' + esc(q.sol) + '<br><span class="cb-pt">Key point: ' + esc(q.hint) + '</span></div>' +
          '<p class="cb-note">To deal the damage, the player who played the card must <b>explain the solution</b>. Try explaining it out loud. ' +
          'If you can, ' + wrongDmg(q, true, 'you') + ' damage; if not, ' + wrongDmg(q, false, 'you') + ' damage.' +
          (hasChar('you', 'euclid') ? ' (<b class="cb-skill">Euclid</b>: +1 if you explain it)' : '') +
          (hasChar('you', 'riemann') && q.star === 3 ? ' (<b class="cb-skill">Riemann</b>: +2)' : '') + (S.shield ? ' (reduced by 2 by CPU\'s Shield)' : '') +
          (hasChar('cpu', 'euler') && q.star >= 2 ? ' (−1 from CPU\'s <b class="cb-skill">Euler</b>)' : '') + '</p>' +
          '<div class="cb-row"><button type="button" class="cb-btn cb-main" id="cb-exp-ok">I explained it</button><button type="button" class="cb-btn" id="cb-exp-ng">I couldn\'t</button></div></div></div>';
      }
      case 'cpuResult': {
        var r2 = S.result, t;
        if (r2.ok && S.combo) t = '<h2 class="cb-good">CPU is correct (' + esc(fmt(r2.given)) + ') → but no counterattack, thanks to Class Field Theory!</h2><p>CPU drew 1 card.</p>';
        else if (r2.ok) t = '<h2 class="cb-bad">CPU is correct (' + esc(fmt(r2.given)) + ') → counterattack, ' + r2.dmg + ' damage</h2><p>' + (S.counter ? '<b class="cb-hit">Payback worked!</b> ' : '') + 'CPU drew 1 card.</p>';
        else if (r2.fermat) t = '<h2 class="cb-bad">CPU\'s Fermat: “The margin is too small!” → 0 damage</h2><p>CPU used its once-only ability.</p>';
        else t = '<h2 class="cb-good">' + r2.dmg + ' damage to CPU!</h2><p>' + (S.shield ? 'CPU\'s Shield took off 2. ' : '') + (r2.explained ? 'Nice explaining.' : 'Read the solution on the back of the card so you can explain it next time.') + '</p>';
        return '<div class="cb-stage">' + cardHTML(q, { big: true }) + '<div class="cb-side">' + t + '<button type="button" class="cb-btn cb-main" id="cb-next">' + nextLabel('CPU\'s turn') + '</button></div></div>';
      }
      case 'answer': {
        var pair = Array.isArray(q.ans);
        var ins = pair ? '<div class="cb-row"><label>' + q.labels[0] + ' =<input class="cb-in" inputmode="text" autocomplete="off"></label><label>' + q.labels[1] + ' =<input class="cb-in" inputmode="text" autocomplete="off"></label></div>'
          : '<div class="cb-row"><label>Answer<input class="cb-in cb-in-1" inputmode="text" autocomplete="off"></label></div>';
        var tools = '';
        if (findKind('you', 'counter') >= 0 && !S.counter && !S.combo) tools += '<button type="button" class="cb-btn cb-counterbtn" id="cb-counter">Declare Payback</button>';
        return '<div class="cb-stage">' + cardHTML(q, { big: true }) + '<div class="cb-side"><h2>CPU attacks! Answer it' + (S.time ? '<span class="cb-timer" id="cb-timer">' + S.left + '</span>' : '') + '</h2>' +
          '<p class="cb-note">' + (S.combo ? 'Class Field Theory: no counterattack even if you are correct. ' : 'Get it right and you counterattack CPU for ' + counterDmg(q, 'you') + ' damage. ') + 'Get it wrong and you take up to ' + wrongDmg(q, true, 'cpu') + ' damage.</p>' +
          (S.pendingQ ? '<p class="cb-tag cb-counterbtn">Class Field Theory: one more problem after this</p>' : '') +
          (S.counter ? '<p class="cb-tag cb-counterbtn">Payback declared</p>' : '') +
          ins + (DECKS[S.deckKey].keys.length ? '<div class="cb-keys" aria-label="Insert a symbol">' + DECKS[S.deckKey].keys.map(function (k) { return '<button type="button" class="cb-key" data-ins="' + k + '">' + k + '</button>'; }).join('') + '</div>' : '') +
          '<p class="cb-note">' + esc(DECKS[S.deckKey].note) + '</p>' +
          (tools ? '<div class="cb-row">' + tools + '</div>' : '') +
          '<button type="button" class="cb-btn cb-main" id="cb-answer">Answer</button></div></div>';
      }
      case 'shieldAsk': {
        var full = wrongDmg(q, S.cpuExp, 'cpu'), cut = Math.max(0, full - 2);
        var btns = '';
        if (findKind('you', 'shield') >= 0) btns += '<button type="button" class="cb-btn cb-main" id="cb-sh-yes">Use Shield (' + full + ' → ' + cut + ')</button>';
        if (canOnce('you', 'fermat')) btns += '<button type="button" class="cb-btn cb-main cb-fermat" id="cb-sh-fermat">Fermat: “The margin is too small” (' + full + ' → 0, once only)</button>';
        return '<div class="cb-stage">' + cardHTML(q, { big: true }) + '<div class="cb-side"><h2 class="cb-bad">' + (S.result.timeout ? 'Time up' : 'Wrong') + '… reduce the damage?</h2>' +
          '<p>CPU ' + (S.cpuExp ? 'explained' : 'could not explain') + ' the solution. If you do nothing, you take <b class="cb-hit">' + full + ' damage</b>.</p>' +
          '<p class="cb-note">Shields and Fermat\'s power are used up once played. Saving them for a big hit is a good plan too.</p>' +
          '<div class="cb-row">' + btns + '<button type="button" class="cb-btn" id="cb-sh-no">Don\'t use</button></div></div></div>';
      }
      case 'yourResult': {
        var r3 = S.result, t3;
        if (r3.ok && S.combo) t3 = '<h2 class="cb-good">Correct!</h2><p>It was CPU\'s Class Field Theory, so no counterattack. You drew 1 card.</p>';
        else if (r3.ok) t3 = '<h2 class="cb-good">Correct! Counterattack, ' + r3.dmg + ' damage to CPU</h2><p>' + (S.counter ? '<b class="cb-hit">Payback worked!</b> ' : '') + 'You drew 1 card.</p>';
        else t3 = '<h2 class="cb-bad">' + (r3.timeout ? 'Time up' : 'Not quite') + '… ' + r3.dmg + ' damage</h2>' + (S.shield ? '<p>Your Shield took off 2!</p>' : '') + (S.fermatNow ? '<p><b class="cb-skill">The margin is too small!</b> Damage reduced to 0.</p>' : '') + (!S.fermatNow && !r3.cpuExp ? '<p>CPU could not explain it, so the damage is halved.</p>' : '') +
          '<div class="cb-back-ans"><b>CPU\'s explanation</b>: the answer is ' + esc(ansStr(q)) + '<br>' + esc(q.sol) + '<br><span class="cb-pt">Key point: ' + esc(q.hint) + '</span></div>';
        return '<div class="cb-stage">' + cardHTML(q, { big: true }) + '<div class="cb-side">' + t3 + '<button type="button" class="cb-btn cb-main" id="cb-next">' + nextLabel('your turn') + '</button></div></div>';
      }
      case 'over': {
        var win = S.life.cpu <= 0 && S.life.you > 0;
        return '<div class="cb-stage cb-over"><div class="cb-side"><h2 class="' + (win ? 'cb-good' : 'cb-bad') + '">' + (win ? 'You win!' : 'CPU wins…') + '</h2>' +
          '<p>Life left: You ' + S.life.you + ' / CPU ' + S.life.cpu + '</p>' +
          '<div class="cb-row"><button type="button" class="cb-btn cb-main" id="cb-again">Play again (same settings)</button><button type="button" class="cb-btn" id="cb-reset">Change settings</button></div></div></div>';
      }
    }
    return h;
  }

  function setupHTML() {
    function radio(n, v, l, c) { return '<label class="cb-radio"><input type="radio" name="cb-' + n + '" value="' + v + '"' + (c ? ' checked' : '') + '><span>' + l + '</span></label>'; }
    var pick = curChar || 'euclid';
    var chars = '<div class="cb-box cb-charbox"><h2>Choose your character</h2><div class="cb-chars" role="radiogroup" aria-label="Your character">' +
      CHAR_ORDER.map(function (k) {
        var c = CHARS[k];
        return '<label class="cb-charcard cb-ch-' + k + '"><input type="radio" name="cb-ch" value="' + k + '"' + (k === pick ? ' checked' : '') + '>' +
          '<span class="cb-ch-sym">' + c.sym + '</span><span class="cb-ch-name">' + esc(c.name) + '</span><span class="cb-ch-era">' + esc(c.era) + '</span>' +
          '<span class="cb-ch-skill">' + esc(c.skill) + limitLabel(c) + '</span><span class="cb-ch-desc">' + esc(c.desc) + '</span>' +
          '<span class="cb-ch-story">' + esc(c.story) + '</span></label>';
      }).join('') + '</div>' +
      '<label class="cb-cpuch">CPU character: <select id="cb-cc"><option value="random">Random</option>' + CHAR_ORDER.map(function (k) { return '<option value="' + k + '">' + esc(CHARS[k].name) + '</option>'; }).join('') + '</select></label></div>';
    var quick = '<div class="cb-box cb-quick"><h2>Play now</h2><p class="cb-quick-how">Take turns playing problem cards. <b>A wrong answer costs damage equal to the card\'s ★s.</b> Bring your opponent\'s life to 0 to win!</p>' +
      '<div class="cb-lvs" role="group" aria-label="Level">' + ORDER.map(function (k) { return '<button type="button" class="cb-lv" data-qlv="' + k + '" aria-pressed="' + (k === curDeck) + '">' + esc(DECKS[k].name) + '<small>' + esc(DECKS[k].range) + '</small></button>'; }).join('') + '</div>' +
      '<button type="button" class="cb-btn cb-main cb-quick-go" id="cb-quick">' + esc('▶ Play now (' + DECKS[curDeck].name + ')') + '</button>' +
      '<p class="cb-note">You start with an Easy CPU, 10 life each and no time limit. Pick a character (6 mathematicians) and other settings below if you like.</p></div>' +
      '<p class="cb-more" id="cb-more">Want more? Characters, full rules and settings (optional)</p>';
    return quick + chars + '<div class="cb-setup"><div class="cb-box"><h2>Rules</h2><ol class="cb-rules">' +
      '<li>You hold 5 cards. On your turn, choose 1 <b>problem card</b> and play it against your opponent.</li>' +
      '<li>Your opponent answers. If they are <b>correct</b>, the player who played the card takes a <b>counterattack of 1 damage</b>, and the one who answered draws 1 card.</li>' +
      '<li>If they are <b>wrong</b>, the player who played the card explains the solution and deals damage equal to the ★s (half if they cannot explain it).</li>' +
      '<li>CPU has topics it is <b>weak</b> at and a topic it is <b>strong</b> at. Aim for its weak spots.</li>' +
      '<li><b>Characters</b>: choose 1 of 6 mathematicians. Each has one ability (abilities with a limited number of uses are gone once used up).</li>' +
      '<li><b>Special cards</b>: when answering, “Payback” (counterattack becomes ★+1); when you get one wrong, “Shield” (damage −2); on your turn, “Swap” (trade any number of cards with the deck), “Draw 2” and “Heal” (life +2).</li>' +
      '<li>Bring your opponent\'s life to 0 to win!</li></ol></div>' +
      '<div class="cb-box"><h2>Settings</h2>' +
      '<fieldset><legend>Level (problem deck)</legend>' + ORDER.map(function (k) { return radio('dk', k, DECKS[k].name + ' (' + DECKS[k].range + ')', k === curDeck); }).join('') + '</fieldset>' +
      '<fieldset><legend>CPU strength</legend>' + radio('cp', 'easy', 'Easy', true) + radio('cp', 'normal', 'Normal', false) + radio('cp', 'strong', 'Strong', false) + '</fieldset>' +
      '<fieldset><legend>Your life</legend>' + radio('ly', '10', '10', true) + radio('ly', '7', '7', false) + radio('ly', '5', '5 (handicap)', false) + '</fieldset>' +
      '<fieldset><legend>CPU life</legend>' + radio('lc', '10', '10', true) + radio('lc', '7', '7', false) + radio('lc', '5', '5', false) + '</fieldset>' +
      '<fieldset><legend>Time to answer</legend>' + radio('tm', '0', 'No limit', true) + radio('tm', '60', '60 sec', false) + radio('tm', '30', '30 sec', false) + '</fieldset>' +
      '<div class="cb-row"><span class="cb-note">Sound:</span>' + soundHTML() + '</div>' +
      '<button type="button" class="cb-btn cb-main" id="cb-start">Start battle</button></div></div>';
  }
  function readOpt() {
    function v(n) { var e = document.querySelector('input[name="cb-' + n + '"]:checked'); return e ? e.value : ''; }
    var you = v('ch') || 'euclid', cc = ($('cb-cc') || {}).value || 'random';
    if (cc === 'random') { var others = CHAR_ORDER.filter(function (k) { return k !== you; }); cc = others[Math.floor(Math.random() * others.length)]; }
    curChar = you;
    return { deck: v('dk') || curDeck, cpu: v('cp'), lifeYou: +v('ly'), lifeCpu: +v('lc'), time: +v('tm'), charYou: you, charCpu: cc };
  }
  function on(id, fn) { var e = $(id); if (e) e.onclick = fn; }
  function syncDeckUI() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-qlv]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-qlv') === curDeck)); });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="cb-dk"]'), function (r) { r.checked = r.value === curDeck; });
    var q = $('cb-quick'); if (q) q.textContent = '▶ Play now (' + DECKS[curDeck].name + ')';
  }
  function startGame() { lastOpt = readOpt(); setDeck(lastOpt.deck); if (window.CBSound) window.CBSound.unlock(); newGame(lastOpt); bgm(true); scrollToApp(); }
  function bindSetup() {
    Array.prototype.forEach.call(document.querySelectorAll('input[name="cb-dk"]'), function (r) { r.onchange = function () { setDeck(r.value); syncDeckUI(); }; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-qlv]'), function (b) { b.onclick = function () { setDeck(b.getAttribute('data-qlv')); syncDeckUI(); }; });
    on('cb-start', startGame);
    on('cb-quick', startGame);
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
