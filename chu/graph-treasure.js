/* ════════════════════════════════════════════════════════
   グラフ・トレジャー（オンライン版）
   座標平面に直線（中3は放物線も）を引いて、お宝を集めるゲーム。
   コンピュータ（CPU）と対戦する。
   前半：計算の部品（分数・交点・答えの読み取り）… node でもテストできる
   後半：画面（document があるときだけ動く）
   ════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var N = 5;              // 盤は −5 〜 5
  var MINUS = '−';   // −

  /* ────────── 分数 ────────── */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function F(n, d) {
    if (d === undefined) d = 1;
    if (d === 0) throw new Error('0で割れません');
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d);
    return { n: (n / g) + 0, d: d / g };
  }
  function fadd(a, b) { return F(a.n * b.d + b.n * a.d, a.d * b.d); }
  function fsub(a, b) { return F(a.n * b.d - b.n * a.d, a.d * b.d); }
  function fmul(a, b) { return F(a.n * b.n, a.d * b.d); }
  function fdiv(a, b) { return F(a.n * b.d, a.d * b.n); }
  function fneg(a) { return F(-a.n, a.d); }
  function feq(a, b) { return a.n === b.n && a.d === b.d; }
  function fnum(a) { return a.n / a.d; }
  function fint(a) { return a.d === 1; }
  function fstr(a) {
    var abs = Math.abs(a.n);
    var s = a.d === 1 ? String(abs) : abs + '/' + a.d;
    return (a.n < 0 ? MINUS : '') + s;
  }
  function parseF(s) { var p = String(s).split('/'); return F(parseInt(p[0], 10), p[1] ? parseInt(p[1], 10) : 1); }
  function nstr(n) { return (n < 0 ? MINUS : '') + Math.abs(n); }

  /* 係数つきの項（例：−2x、½x、x²） */
  function coefStr(c, v) {
    if (c.n === 0) return '';
    var sign = c.n < 0 ? MINUS : '';
    var an = Math.abs(c.n), body;
    if (an === 1 && c.d === 1) body = '';
    else if (c.d === 1) body = String(an);
    else if (an === 1 && c.d === 2) body = '½';
    else body = '(' + an + '/' + c.d + ')';
    return sign + body + v;
  }
  /* 右辺の文字列（"−2x + 3" など） */
  function rhs(c) {
    if (c.type === 'para') return coefStr(c.a, 'x²');
    var t = coefStr(c.m, 'x');
    if (!t) return fstr(c.b);
    if (c.b.n === 0) return t;
    return t + (c.b.n < 0 ? ' ' + MINUS + ' ' : ' + ') + fstr(F(Math.abs(c.b.n), c.b.d));
  }
  function curveStr(c) { return 'y = ' + rhs(c); }

  /* ────────── 線（曲線） ────────── */
  function makeLine(m, b, owner) { return { type: 'line', m: m, b: b, owner: owner }; }
  function makePara(a, owner) { return { type: 'para', a: a, owner: owner }; }
  function yAt(c, x) {
    var X = F(x);
    return c.type === 'line' ? fadd(fmul(c.m, X), c.b) : fmul(c.a, fmul(X, X));
  }
  function latticeOn(c) {
    var pts = [];
    for (var x = -N; x <= N; x++) {
      var y = yAt(c, x);
      if (fint(y) && Math.abs(y.n) <= N) pts.push({ x: x, y: y.n });
    }
    return pts;
  }
  function sameCurve(a, b) {
    if (a.type !== b.type) return false;
    return a.type === 'line' ? (feq(a.m, b.m) && feq(a.b, b.b)) : feq(a.a, b.a);
  }

  /* (u + v√s)/den を見やすい文字列に */
  function surdStr(u, v, s, den) {
    var g = gcd(gcd(u, v), den);
    u /= g; v /= g; den /= g;
    if (den < 0) { u = -u; v = -v; den = -den; }
    var va = Math.abs(v);
    var vs = (va === 1 ? '' : String(va)) + '√' + s;
    var num;
    if (u !== 0) num = nstr(u) + (v < 0 ? ' ' + MINUS + ' ' : ' + ') + vs;
    else num = (v < 0 ? MINUS : '') + vs;
    if (den === 1) return num;
    return u !== 0 ? '(' + num + ')/' + den : num + '/' + den;
  }
  /* 整数係数の 2 次式 Ax² + Bx + C の文字列 */
  function quadStr(A, B, C) {
    var s = coefStr(F(A), 'x²');
    if (B !== 0) s += (B < 0 ? ' ' + MINUS + ' ' : ' + ') + coefStr(F(Math.abs(B)), 'x');
    if (C !== 0) s += (C < 0 ? ' ' + MINUS + ' ' : ' + ') + Math.abs(C);
    return s;
  }
  function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }
  function inBoard(x, y) { return Math.abs(x) <= N + 1e-9 && Math.abs(y) <= N + 1e-9; }

  /* 2 つの線の交点（盤の中だけ）。なければ null。
     score：格子点 1、分数 2、放物線と直線 2（解の公式が必要なら 3） */
  function intersect(c1, c2) {
    if (c1.type === 'para' && c2.type === 'para') return null;
    var steps = [];
    if (c1.type === 'line' && c2.type === 'line') {
      if (feq(c1.m, c2.m)) return null;
      var dm = fsub(c1.m, c2.m), db = fsub(c2.b, c1.b);
      var x = fdiv(db, dm), y = fadd(fmul(c1.m, x), c1.b);
      if (!inBoard(fnum(x), fnum(y))) return null;
      steps.push(rhs(c1) + ' = ' + rhs(c2));
      steps.push(coefStr(dm, 'x') + ' = ' + fstr(db));
      steps.push('x = ' + fstr(x) + '、 y = ' + fstr(y));
      var whole = fint(x) && fint(y);
      return {
        pts: [{ xv: fnum(x), yv: fnum(y), xs: fstr(x), ys: fstr(y) }],
        score: whole ? 1 : 2, kind: whole ? '格子点' : '分数', steps: steps
      };
    }
    var L = c1.type === 'line' ? c1 : c2, P = c1.type === 'para' ? c1 : c2;
    /* a x² − m x − b = 0 を整数係数に */
    var a = P.a, m = L.m, b = L.b;
    var k = lcm(lcm(a.d, m.d), b.d);
    var A = a.n * k / a.d, B = -m.n * k / m.d, C = -b.n * k / b.d;
    var g = gcd(gcd(A, B), C);
    A /= g; B /= g; C /= g;
    if (A < 0) { A = -A; B = -B; C = -C; }
    var D = B * B - 4 * A * C;
    steps.push(rhs(P) + ' = ' + rhs(L));
    steps.push(quadStr(A, B, C) + ' = 0');
    if (D < 0) return null;
    var s = D, r = 1;
    for (var f = 2; f * f <= s; f++) while (s % (f * f) === 0) { s /= f * f; r *= f; }
    var pts = [], rational = (s === 1 || D === 0);
    var signs = D === 0 ? [1] : [1, -1];
    signs.forEach(function (sg) {
      if (rational) {
        var rr = D === 0 ? 0 : r;
        var X = F(-B + sg * rr, 2 * A);
        var Y = fadd(fmul(m, X), b);
        if (inBoard(fnum(X), fnum(Y))) pts.push({ xv: fnum(X), yv: fnum(Y), xs: fstr(X), ys: fstr(Y) });
      } else {
        var xv = (-B + sg * r * Math.sqrt(s)) / (2 * A);
        /* y = m x + b = (mn(−B) ± mn r √s)/(md·2A) + bn/bd */
        var den = m.d * 2 * A * b.d;
        var u = m.n * (-B) * b.d + b.n * m.d * 2 * A;
        var v = sg * m.n * r * b.d;
        var yv = (u + v * Math.sqrt(s)) / den;
        if (inBoard(xv, yv)) {
          pts.push({
            xv: xv, yv: yv,
            xs: surdStr(-B, sg * r, s, 2 * A),
            ys: m.n === 0 ? fstr(b) : surdStr(u, v, s, den)
          });
        }
      }
    });
    if (!pts.length) return null;
    if (rational) steps.push('x = ' + pts.map(function (p) { return p.xs; }).join('、 '));
    else steps.push('解の公式で x = ' + surdStr(-B, r, s, 2 * A).replace(' + ', ' ± '));
    steps.push(pts.map(function (p) { return '(' + p.xs + ', ' + p.ys + ')'; }).join(' と '));
    return { pts: pts, score: rational ? 2 : 3, kind: rational ? '放物線' : '解の公式', steps: steps };
  }

  /* ────────── 答えの読み取り（分数・√ を含む式） ────────── */
  function evalExpr(str) {
    var s = String(str == null ? '' : str).trim();
    if (!s) return NaN;
    s = s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); })
      .replace(/ルート|sqrt|√/gi, 'r')
      .replace(/[−ー－‐–]/g, '-')
      .replace(/＋/g, '+').replace(/[／÷]/g, '/').replace(/[×＊]/g, '*')
      .replace(/（/g, '(').replace(/）/g, ')').replace(/．/g, '.')
      .replace(/½/g, '(1/2)')
      .replace(/\s+/g, '');
    var i = 0;
    function expr() {
      var v = term();
      while (s[i] === '+' || s[i] === '-') { var op = s[i++]; var w = term(); v = op === '+' ? v + w : v - w; }
      return v;
    }
    function term() {
      var v = unary();
      for (;;) {
        var c = s[i];
        if (c === '*' || c === '/') { i++; var w = unary(); v = c === '*' ? v * w : v / w; }
        else if (c === 'r' || c === '(') { v = v * unary(); }
        else break;
      }
      return v;
    }
    function unary() {
      if (s[i] === '-') { i++; return -unary(); }
      if (s[i] === '+') { i++; return unary(); }
      return atom();
    }
    function atom() {
      var c = s[i];
      if (c === 'r') { i++; var v = atom(); return v < 0 ? NaN : Math.sqrt(v); }
      if (c === '(') { i++; var w = expr(); if (s[i] !== ')') throw 0; i++; return w; }
      var mm = /^\d+(\.\d+)?/.exec(s.slice(i));
      if (!mm) throw 0;
      i += mm[0].length;
      return parseFloat(mm[0]);
    }
    try { var v = expr(); return i === s.length ? v : NaN; } catch (e) { return NaN; }
  }
  function close(a, b) { return isFinite(a) && Math.abs(a - b) < 1e-6; }
  /* 入力された点の組が、正しい点の組と（順番を問わず）一致するか */
  function matchPoints(inputs, pts) {
    if (inputs.length !== pts.length) return false;
    var used = [];
    return inputs.every(function (p) {
      for (var j = 0; j < pts.length; j++) {
        if (!used[j] && close(p.x, pts[j].xv) && close(p.y, pts[j].yv)) { used[j] = true; return true; }
      }
      return false;
    });
  }

  /* ────────── カード ────────── */
  var SLOPES = ['0', '0', '1', '1', '1', '-1', '-1', '-1', '2', '2', '-2', '-2', '3', '-3', '1/2', '1/2', '-1/2', '-1/2'];
  var ICPTS = ['-4', '-4', '-3', '-3', '-2', '-2', '-1', '-1', '0', '0', '1', '1', '2', '2', '3', '3', '4', '4'];
  var EQS = [
    ['2x + y = 3', '-2', '3'], ['y − 3x = −1', '3', '-1'], ['x − y = 2', '1', '-2'],
    ['2y = 4x − 6', '2', '-3'], ['x + y = 0', '-1', '0'], ['3x + y − 4 = 0', '-3', '4'],
    ['2y − x = 4', '1/2', '2'], ['−y = 2x + 1', '-2', '-1'], ['y + 4 = x', '1', '-4'],
    ['6x − 2y = 4', '3', '-2'], ['4x + 2y = −8', '-2', '-4'], ['y − 2 = 0', '0', '2']
  ];
  var PARAS = ['1', '-1', '2', '-2', '1/2', '-1/2'];

  function shuffle(a, rnd) {
    rnd = rnd || Math.random;
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  var core = {
    N: N, F: F, fstr: fstr, parseF: parseF, fnum: fnum, feq: feq, fneg: fneg, fint: fint,
    makeLine: makeLine, makePara: makePara, curveStr: curveStr, rhs: rhs, coefStr: coefStr,
    latticeOn: latticeOn, sameCurve: sameCurve, intersect: intersect, yAt: yAt,
    evalExpr: evalExpr, close: close, matchPoints: matchPoints, surdStr: surdStr,
    SLOPES: SLOPES, ICPTS: ICPTS, EQS: EQS, PARAS: PARAS, shuffle: shuffle
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  root.GTCore = core;
  if (typeof document === 'undefined') return;

  /* ════════════════════════════════════════════════════════
     ここから画面
     ════════════════════════════════════════════════════════ */
  var $ = function (id) { return document.getElementById(id); };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var U = 56, O = 6 * U;  // 1 目盛り 56px、原点は (336, 336)
  function px(x) { return O + U * x; }
  function py(y) { return O - U * y; }
  var NAME = { you: 'あなた', cpu: 'CPU' };
  var CPU_SET = {
    easy: { label: 'やさしい', mistake: 0.3, bonus: 0.5, pickTop: 3 },
    normal: { label: 'ふつう', mistake: 0.12, bonus: 0.85, pickTop: 1 },
    strong: { label: 'つよい', mistake: 0, bonus: 1, pickTop: 1 }
  };

  var S = null;

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ────────── 新しいゲーム ────────── */
  function newGame(opt) {
    S = {
      level: opt.level, cpu: CPU_SET[opt.cpu], turnsEach: opt.turns, first: opt.first,
      view: opt.view || 'show', placeMode: (opt.view && opt.view !== 'show') ? 'auto' : opt.place,
      treasures: [], curves: [], marks: [],
      deck: {
        s: shuffle(SLOPES.map(parseF)), b: shuffle(ICPTS.map(parseF)),
        e: shuffle(EQS.map(function (q) { return { text: q[0], m: parseF(q[1]), b: parseF(q[2]) }; })),
        p: shuffle(PARAS.map(parseF))
      },
      used: { s: [], b: [], e: [], p: [] },
      hands: { you: { s: [], b: [] }, cpu: { s: [], b: [] } },
      score: { you: { t: 0, x: 0 }, cpu: { t: 0, x: 0 } },
      done: { you: 0, cpu: 0 },
      turn: opt.first, phase: 'place', sel: { s: -1, b: -1 },
      log: [], placeQueue: [], lastCpu: null, bonus: null, eqCard: null, msg: ''
    };
    var ns = S.level === 1 ? 3 : 2, nb = S.level === 1 ? 0 : 2;
    ['you', 'cpu'].forEach(function (p) {
      for (var i = 0; i < ns; i++) S.hands[p].s.push(draw('s'));
      for (var j = 0; j < nb; j++) S.hands[p].b.push(draw('b'));
    });
    if (opt.tutorial) { setupTutorial(); render(); scrollToGame(); return; }
    /* お宝の置き方 */
    var other = S.first === 'you' ? 'cpu' : 'you';
    for (var t = 0; t < 24; t++) S.placeQueue.push({ who: t % 2 === 0 ? S.first : other, v: t < 20 ? 1 : 3 });
    if (S.placeMode === 'auto') {
      var spots = [];
      for (var x = -N; x <= N; x++) for (var y = -N; y <= N; y++) if (x || y) spots.push({ x: x, y: y });
      shuffle(spots);
      S.placeQueue.forEach(function (q, i) { S.treasures.push({ x: spots[i].x, y: spots[i].y, v: q.v, by: null }); });
      S.placeQueue = [];
      addLog('お宝 24 個（★ 20 個・金 4 個）をおまかせで置きました。');
      startTurn();
    } else {
      addLog('お宝を交代で置きます。座標を言いながら置こう。');
      S.phase = 'place';
      advancePlace();
    }
    render();
    scrollToGame();
  }
  /* ゲームが画面いっぱいに見える位置までスクロールする */
  function scrollToGame() {
    var g = document.querySelector('.gt-game'), nav = document.querySelector('.site-nav');
    if (!g) return;
    var top = g.getBoundingClientRect().top + window.pageYOffset - (nav ? nav.getBoundingClientRect().height : 0) - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  /* ────────── チュートリアル（決まった流れで 3 手番ぶん体験する） ──────────
     あなた①  y = 2x + 1（お宝 3 個）
     CPU①    y = −x + 4（交点 (1, 3) のボーナスを見せる）
     あなた②  y = x − 2 → CPU の線との交点 (3, 1) に挑戦
     CPU②    「y = −2x − 1」と言って y = −2x − 2 を引く → 待った！
     あなた③  式カード 2x + y = 3 → y = −2x + 3 */
  var TUT_TREASURES = [
    [1, 3, 1], [-2, -3, 1], [2, 5, 1],          // あなた①の線の上
    [-1, 5, 1], [4, 0, 1],                      // CPU①の線の上
    [0, -2, 1], [5, 3, 3], [4, 2, 1],         // あなた②の線の上
    [-3, 4, 1], [-2, 2, 1], [-2, 3, 1],         // CPU②（まちがった線と、言った線）
    [0, 3, 1], [1, 1, 1], [3, -3, 1],           // あなた③の線の上
    [-4, -1, 1], [4, -4, 1], [-3, 2, 1], [-4, 3, 3], [2, -5, 1], [-5, 1, 1]
  ];
  var TUT_ALLOW = [{ s: F(2), b: F(1) }, { s: F(1), b: F(-2) }, { eq: true }];
  function setupTutorial() {
    S.tut = true;
    S.hands.you = { s: [F(-3), F(2)], b: [F(4), F(1)] };
    S.deck.s.push(F(1)); S.deck.b.push(F(-2));               // 次に引くカード
    S.deck.e.push({ text: '2x + y = 3', m: F(-2), b: F(3) });
    S.treasures = TUT_TREASURES.map(function (t) { return { x: t[0], y: t[1], v: t[2], by: null }; });
    S.placeQueue = [];
    addLog('チュートリアルを始めます。');
    startTurn();
  }
  function tutAllow() { return S.tut ? (TUT_ALLOW[S.done.you] || {}) : null; }
  function cpuTutorial() {
    var n = S.done.cpu;
    var declared = n === 0 ? makeLine(F(-1), F(4), 'cpu') : makeLine(F(-2), F(-1), 'cpu');
    var drawn = n === 0 ? declared : makeLine(F(-2), F(-2), 'cpu');
    var rec = { kind: 'line', taken: [], pts: 0, wrong: n === 1, curveIndex: -1, declared: declared };
    S.lastCpu = rec;
    rec.taken = place(drawn, 'cpu', declared);
    rec.curveIndex = S.curves.length - 1;
    addLog('CPU：「' + curveStr(declared) + '」を引いた' + gotText(rec.taken), 'cpu');
    if (n === 0) cpuBonus(rec, drawn, true);
    S.phase = 'cpuShow';
  }
  function hint(t) { return '<details class="gt-hint"><summary>ヒントを見る</summary>' + t + '</details>'; }
  function tutGuide() {
    var T = S.done.you, c = S.phase === 'choose' ? selectedCurve() : null, g = '';
    switch (S.phase) {
      case 'choose':
        if (T === 0) g = c && S.sel.b >= 0 ?
          '点線が <b>y = 2x + 1</b> です。切片が 1 なので y 軸の <b>(0, 1)</b> を通り、傾きが 2 なので<b>右へ 1 進むと上へ 2</b> 上がります。点線の上に ★ が 3 つあるね。「この線を引く」を押そう。' :
          '<b>ようこそ！</b> 盤の点（格子点）にお宝が置いてあります。★ は 1 点、金色の <b>3</b> は 3 点。自分の番に直線を 1 本引くと、その線が通る点のお宝がもらえます。<br>まず、光っている<b>傾きカード「2」</b>と<b>切片カード「1」</b>をえらんでみよう。';
        else if (T === 1) g = c && S.sel.b >= 0 ?
          '<b>y = x − 2</b> は、CPU の線 y = −x + 4 と交わりそうだね。「この線を引く」を押そう。' :
          '今度は<b>傾き「1」</b>と<b>切片「−2」</b>をえらんで、線を引こう。';
        else g = '最後は<b>式カード</b>。手札を使うかわりに、式カードに挑戦することもできます。「式カードに挑戦」を押そう。';
        break;
      case 'bonus':
        if (T === 1) g = S.bonus.pick < 0 ?
          'CPU の線と交わったので、<b>交点ボーナス</b>に挑戦できます。下のボタンで交点をえらぼう。' :
          '2 つの式を「=」でつなぐと <b>x − 2 = −x + 4</b>。これを解いて x を求め、y = x − 2 に入れて y を求めよう。' +
          hint('x を左に、数を右に集めると 2x = 6。だから x = 3、y = 3 − 2 = 1。(3, 1) と入れよう。');
        else g = 'また CPU の線と交わったね。挑戦してもいいし、「今回は挑戦しない」でも OK。';
        break;
      case 'eq':
        g = '<b>2x + y = 3</b> を y = ax + b の形に直そう。2x を右辺に<b>移項</b>すると、符号が変わります。' + hint('y = −2x + 3。a に −2、b に 3 を入れよう。');
        break;
      case 'yourEnd':
        if (T === 0) g = 'お宝を 3 つゲット！ 次は CPU の番です。「次へ」を押そう。';
        else if (T === 1) g = '交点を求めることは、<b>連立方程式を解く</b>ことです。グラフの上で答えが見えるね。次は CPU の番。CPU はときどき<b>まちがえる</b>ので、よく見ていてね。';
        else g = 'これでルールはひと通りおしまい！「チュートリアルのまとめへ」を押そう。';
        break;
      case 'cpuShow':
        if (S.done.cpu === 0) g = 'CPU は <b>y = −x + 4</b> を引きました。さらに、あなたの線 y = 2x + 1 との<b>交点 (1, 3)</b> を計算してボーナスをもらっています（下の計算を見てね）。<br>CPU の言った式と盤の線が合っているかも、毎回確かめよう。今回は合っているので「次へ」。';
        else g = S.lastCpu.checked ?
          'その通り！ まちがった線は消えて、お宝ももとにもどりました。あなたに ＋1 点。「次へ」を押そう。' :
          'CPU は「<b>y = −2x − 1</b>」と言いました。でも盤の赤い線は、y 軸のどこを通っている？ (0, −1) ではなく <b>(0, −2)</b> を通っているね。言った式とちがう線を見つけたら「<b>待った！</b>」を押そう。';
        break;
    }
    return g ? '<div class="gt-guide"><div class="gt-guide-lab">チュートリアル ' + Math.min(S.done.you + S.done.cpu + 1, 5) + ' / 5</div>' + g + '</div>' : '';
  }
  function tutDoneHTML() {
    return '<h3>チュートリアル完了！</h3><p>ルールのまとめ</p><ul class="gt-sum">' +
      '<li>傾きカードと切片カードで直線 y = ax + b を引き、線の上のお宝をもらう</li>' +
      '<li>相手の線との<b>交点</b>を計算できたらボーナス（交点は連立方程式で求める）</li>' +
      '<li><b>式カード</b>は移項して y = ax + b に直す（正解で ＋1 点）</li>' +
      '<li>CPU が言った式とちがう線を引いたら「<b>待った！</b>」で ＋1 点</li>' +
      '<li>決まった回数の手番が終わったとき、点数の多いほうが勝ち</li></ul>' +
      '<button type="button" class="gt-btn gt-main" id="gt-reset">本番を始める（設定へ）</button>' +
      '<button type="button" class="gt-btn gt-ghost" id="gt-tutorial">もう一度チュートリアル</button>';
  }

  function draw(kind) {
    if (!S.deck[kind].length) { S.deck[kind] = shuffle(S.used[kind]); S.used[kind] = []; }
    return S.deck[kind].pop();
  }
  function addLog(t, who) { S.log.unshift({ t: t, who: who || '' }); if (S.log.length > 60) S.log.pop(); }

  function treasureAt(x, y) {
    for (var i = 0; i < S.treasures.length; i++) { var t = S.treasures[i]; if (t.x === x && t.y === y) return t; }
    return null;
  }
  function isDup(c) { return S.curves.some(function (o) { return sameCurve(o.curve, c); }); }
  function valueOn(c) {
    return latticeOn(c).reduce(function (s, p) { var t = treasureAt(p.x, p.y); return s + (t && !t.by ? t.v : 0); }, 0);
  }
  function bonusOptions(c, against) {
    var out = [];
    if (S.level === 1) return out;
    S.curves.forEach(function (o) {
      if (o.owner !== against) return;
      var r = intersect(c, o.curve);
      if (r) out.push({ other: o, res: r });
    });
    return out;
  }

  /* ────────── お宝を交代で置く ────────── */
  function advancePlace() {
    while (S.placeQueue.length && S.placeQueue[0].who === 'cpu') {
      var q = S.placeQueue.shift();
      var p = cpuPlaceSpot();
      S.treasures.push({ x: p.x, y: p.y, v: q.v, by: null });
      addLog('CPU：(' + nstr(p.x) + ', ' + nstr(p.y) + ') に' + (q.v === 3 ? '金のお宝' : 'お宝') + 'を置いた', 'cpu');
    }
    if (!S.placeQueue.length) { addLog('お宝をぜんぶ置きました。ゲーム開始！'); startTurn(); }
  }
  function cpuPlaceSpot() {
    var spots = [];
    for (var x = -N; x <= N; x++) for (var y = -N; y <= N; y++) if ((x || y) && !treasureAt(x, y)) spots.push({ x: x, y: y });
    return spots[Math.floor(Math.random() * spots.length)];
  }
  function humanPlace(x, y) {
    if (!(x || y)) return '原点 (0, 0) には置けません。';
    if (Math.abs(x) > N || Math.abs(y) > N) return '−5 〜 5 の範囲で置こう。';
    if (treasureAt(x, y)) return 'そこにはもうお宝があります。';
    var q = S.placeQueue.shift();
    S.treasures.push({ x: x, y: y, v: q.v, by: null });
    addLog('あなた：(' + nstr(x) + ', ' + nstr(y) + ') に' + (q.v === 3 ? '金のお宝' : 'お宝') + 'を置いた', 'you');
    advancePlace();
    return '';
  }

  /* ────────── 手番 ────────── */
  function startTurn() {
    S.sel = { s: -1, b: -1 }; S.bonus = null; S.eqCard = null; S.msg = '';
    if (isOver()) { S.phase = 'over'; return; }
    if (S.turn === 'you') S.phase = 'choose';
    else { S.phase = 'cpu'; cpuTurn(); }
  }
  function treasuresLeft() { return S.treasures.some(function (t) { return !t.by; }); }
  function isOver() {
    if (S.done.you !== S.done.cpu) return false;     // 周の途中では終わらない
    return S.done.you >= S.turnsEach || !treasuresLeft();
  }
  function endTurn() {
    S.done[S.turn]++;
    if (S.tut && S.turn === 'you' && S.done.you >= 3) { S.phase = 'tutDone'; S.msg = ''; render(); return; }
    S.turn = S.turn === 'you' ? 'cpu' : 'you';
    startTurn();
    render();
  }

  /* 線を引いてお宝を取る。取ったお宝の一覧を返す */
  function place(curve, owner, declared) {
    var taken = [];
    latticeOn(curve).forEach(function (p) {
      var t = treasureAt(p.x, p.y);
      if (t && !t.by) { t.by = owner; taken.push(t); S.score[owner].t += t.v; }
    });
    S.newest = { curve: curve, owner: owner, label: curveStr(declared || curve), turn: S.done[owner] + 1 };
    S.curves.push(S.newest);
    return taken;
  }
  function discardHand(who, si, bi) {
    var h = S.hands[who];
    if (si >= 0) { S.used.s.push(h.s[si]); h.s[si] = draw('s'); }
    if (bi >= 0) { S.used.b.push(h.b[bi]); h.b[bi] = draw('b'); }
  }
  function sumV(list) { return list.reduce(function (s, t) { return s + t.v; }, 0); }

  /* ── あなたの番 ── */
  function selectedCurve() {
    var h = S.hands.you;
    if (S.sel.s < 0) return null;
    if (S.level === 1) return makeLine(h.s[S.sel.s], F(0), 'you');
    if (S.sel.b < 0) return null;
    return makeLine(h.s[S.sel.s], h.b[S.sel.b], 'you');
  }
  function anyHandMove(who) {
    var h = S.hands[who];
    for (var i = 0; i < h.s.length; i++) {
      if (S.level === 1) { if (!isDup(makeLine(h.s[i], F(0), who))) return true; continue; }
      for (var j = 0; j < h.b.length; j++) if (!isDup(makeLine(h.s[i], h.b[j], who))) return true;
    }
    return false;
  }
  function humanDrawSelected() {
    var c = selectedCurve();
    if (!c || isDup(c)) return;
    var taken = place(c, 'you');
    addLog('あなた：' + curveStr(c) + ' を引いた' + gotText(taken), 'you');
    discardHand('you', S.sel.s, S.level === 1 ? -1 : S.sel.b);
    afterHumanCurve(c, taken);
  }
  function gotText(taken) {
    if (!taken.length) return '（お宝なし）';
    return '→ お宝 ' + taken.length + ' 個（' + sumV(taken) + ' 点）';
  }
  function afterHumanCurve(c, taken) {
    var opts = bonusOptions(c, 'cpu');
    S.msg = taken.length ? 'お宝を ' + taken.length + ' 個（' + sumV(taken) + ' 点）取りました！' : 'この線の上にお宝はありませんでした。';
    if (opts.length) { S.bonus = { curve: c, opts: opts, pick: -1 }; S.phase = 'bonus'; }
    else S.phase = 'yourEnd';
    render();
  }
  function humanEqStart() {
    S.eqCard = S.deck.e.length || S.used.e.length ? draw('e') : null;
    if (!S.eqCard) { S.msg = '式カードがもうありません。'; render(); return; }
    S.phase = 'eq'; S.msg = ''; render();
  }
  function humanEqAnswer(aStr, bStr) {
    var a = evalExpr(aStr), b = evalExpr(bStr);
    if (!isFinite(a) || !isFinite(b)) { S.msg = 'a と b の両方に数を入れてね（0 のときは 0）。'; render(); return; }
    var card = S.eqCard; S.used.e.push(card); S.eqCard = null;
    var right = makeLine(card.m, card.b, 'you');
    if (close(a, fnum(card.m)) && close(b, fnum(card.b))) {
      S.score.you.x += 1;
      if (isDup(right)) {
        addLog('あなた：式カード ' + card.text + ' → ' + curveStr(right) + '（正解 ＋1点。同じ線があるので引けない）', 'you');
        S.msg = '正解！ ＋1点。ただし同じ線がもう引かれているので、今回は線を引けません。';
        S.phase = 'yourEnd'; render(); return;
      }
      var taken = place(right, 'you');
      addLog('あなた：式カード ' + card.text + ' → ' + curveStr(right) + '（正解 ＋1点）' + gotText(taken), 'you');
      afterHumanCurve(right, taken);
      S.msg = '正解！ ＋1点。 ' + S.msg;
      render();
    } else {
      addLog('あなた：式カード ' + card.text + ' はまちがい（答え ' + curveStr(right) + '）', 'you');
      S.msg = 'ざんねん。答えは ' + curveStr(right) + ' でした。この番は線を引けません。';
      S.phase = 'yourEnd'; render();
    }
  }
  function humanPara() {
    var a = draw('p'); S.used.p.push(a);
    var c = makePara(a, 'you');
    if (isDup(c)) {
      addLog('あなた：放物線カード ' + curveStr(c) + '（同じ放物線があるので引けない）', 'you');
      S.msg = curveStr(c) + ' はもう引かれているので、今回は引けません。';
      S.phase = 'yourEnd'; render(); return;
    }
    var taken = place(c, 'you');
    addLog('あなた：放物線 ' + curveStr(c) + ' を引いた' + gotText(taken), 'you');
    afterHumanCurve(c, taken);
  }
  function humanBonusAnswer(vals) {
    var opt = S.bonus.opts[S.bonus.pick], res = opt.res;
    var inputs = [];
    for (var i = 0; i < res.pts.length; i++) inputs.push({ x: evalExpr(vals[2 * i]), y: evalExpr(vals[2 * i + 1]) });
    if (inputs.some(function (p) { return !isFinite(p.x) || !isFinite(p.y); })) {
      S.msg = '空らんがあるか、読めない式があります。分数は 2/3、ルートは √5 のように入れてね。'; render(); return;
    }
    var ans = res.pts.map(function (p) { return '(' + p.xs + ', ' + p.ys + ')'; }).join(' と ');
    if (matchPoints(inputs, res.pts)) {
      S.score.you.x += res.score;
      S.marks.push({ pts: res.pts, owner: 'you' });
      addLog('あなた：' + opt.other.label + ' との交点 ' + ans + '（正解 ＋' + res.score + '点）', 'you');
      S.msg = '正解！ 交点ボーナス ＋' + res.score + '点。';
    } else {
      addLog('あなた：交点ボーナスはまちがい（答え ' + ans + '）', 'you');
      S.msg = 'ざんねん。交点は ' + ans + ' でした。';
    }
    S.bonus.result = res;
    S.phase = 'yourEnd'; render();
  }

  /* ── CPU の番 ── */
  function cpuTurn() {
    if (S.tut) return cpuTutorial();
    var h = S.hands.cpu, set = S.cpu, moves = [];
    for (var i = 0; i < h.s.length; i++) {
      var bs = S.level === 1 ? [-1] : h.b.map(function (_, j) { return j; });
      bs.forEach(function (j) {
        var c = makeLine(h.s[i], j < 0 ? F(0) : h.b[j], 'cpu');
        if (isDup(c)) return;
        var bo = bonusOptions(c, 'you').reduce(function (m, o) { return Math.max(m, o.res.score); }, 0);
        /* お宝を隠すモードでは、CPU もお宝の場所を知らない */
        moves.push({ si: i, bi: j, curve: c, value: (S.view === 'hide' ? 0 : valueOn(c)) + bo + Math.random() * 0.3 });
      });
    }
    moves.sort(function (a, b) { return b.value - a.value; });
    var best = moves.length ? moves[0].value : -1;
    var rec = { kind: '', taken: [], pts: 0, wrong: false, curveIndex: -1 };
    S.lastCpu = rec;

    var eqLeft = S.deck.e.length + S.used.e.length > 0;
    if (S.level >= 2 && eqLeft && (best < 0 || (best <= 1 && Math.random() < (set.pickTop > 1 ? 0.3 : 0.6)))) return cpuEq(rec);
    if (S.level === 3 && (best < 0 || (best <= 1.3 && Math.random() < 0.5))) return cpuPara(rec);
    if (!moves.length) { addLog('CPU：引ける線がないのでパス', 'cpu'); rec.kind = 'pass'; S.phase = 'cpuShow'; return; }

    var pick = moves[Math.floor(Math.random() * Math.min(set.pickTop, moves.length))];
    var drawn = pick.curve;
    /* ときどき、言った式とちがう線を引いてしまう（「待った」の練習） */
    if (Math.random() < set.mistake) {
      var shifts = shuffle([1, -1]);
      for (var k = 0; k < shifts.length; k++) {
        var nb = fadd(pick.curve.b, F(shifts[k]));
        var w = makeLine(pick.curve.m, nb, 'cpu');
        if (Math.abs(nb.n) <= 4 && !isDup(w)) { drawn = w; rec.wrong = true; break; }
      }
    }
    rec.kind = 'line';
    rec.declared = pick.curve;
    rec.taken = place(drawn, 'cpu', pick.curve);
    rec.curveIndex = S.curves.length - 1;
    discardHand('cpu', pick.si, pick.bi);
    addLog('CPU：「' + curveStr(pick.curve) + '」を引いた' + gotText(rec.taken), 'cpu');
    cpuBonus(rec, drawn);
    S.phase = 'cpuShow';
  }
  function cpuEq(rec) {
    var card = draw('e'); S.used.e.push(card);
    var c = makeLine(card.m, card.b, 'cpu');
    rec.kind = 'eq'; rec.card = card; rec.declared = c;
    S.score.cpu.x += 1; rec.pts += 1;
    if (isDup(c)) {
      addLog('CPU：式カード ' + card.text + ' → ' + curveStr(c) + '（＋1点。同じ線があるので引けない）', 'cpu');
    } else {
      rec.taken = place(c, 'cpu');
      rec.curveIndex = S.curves.length - 1;
      addLog('CPU：式カード ' + card.text + ' → ' + curveStr(c) + '（＋1点）' + gotText(rec.taken), 'cpu');
      cpuBonus(rec, c);
    }
    S.phase = 'cpuShow';
  }
  function cpuPara(rec) {
    var a = draw('p'); S.used.p.push(a);
    var c = makePara(a, 'cpu');
    rec.kind = 'para'; rec.declared = c;
    if (isDup(c)) { addLog('CPU：放物線 ' + curveStr(c) + '（同じ放物線があるので引けない）', 'cpu'); S.phase = 'cpuShow'; return; }
    rec.taken = place(c, 'cpu');
    rec.curveIndex = S.curves.length - 1;
    addLog('CPU：放物線 ' + curveStr(c) + ' を引いた' + gotText(rec.taken), 'cpu');
    cpuBonus(rec, c);
    S.phase = 'cpuShow';
  }
  function cpuBonus(rec, c, force) {
    var opts = bonusOptions(c, 'you');
    if (!opts.length || (!force && Math.random() > S.cpu.bonus)) return;
    opts.sort(function (a, b) { return b.res.score - a.res.score; });
    var o = opts[0];
    S.score.cpu.x += o.res.score; rec.pts += o.res.score;
    rec.bonus = o; rec.mark = { pts: o.res.pts, owner: 'cpu' };
    S.marks.push(rec.mark);
    addLog('CPU：' + o.other.label + ' との交点 ' + o.res.pts.map(function (p) { return '(' + p.xs + ', ' + p.ys + ')'; }).join(' と ') + '（＋' + o.res.score + '点）', 'cpu');
  }
  function humanMatta() {
    var rec = S.lastCpu;
    if (!rec || rec.checked) return;
    rec.checked = true;
    if (rec.wrong) {
      rec.taken.forEach(function (t) { t.by = null; S.score.cpu.t -= t.v; });
      S.score.cpu.x -= rec.pts;
      if (rec.mark) S.marks.splice(S.marks.indexOf(rec.mark), 1);
      var drawn = S.curves[rec.curveIndex].curve;
      S.curves.splice(rec.curveIndex, 1);
      S.newest = null;
      S.score.you.x += 1;
      addLog('あなた：待った！ CPU は「' + curveStr(rec.declared) + '」と言ったのに、' + curveStr(drawn) + ' を引いていた（＋1点）', 'you');
      S.msg = '大正解！ CPU が引いたのは ' + curveStr(drawn) + ' でした。線を消して、あなたに ＋1点。';
    } else {
      addLog('あなた：待った → CPU の線は合っていた', 'you');
      S.msg = 'CPU の線は合っていました。でも、確かめたのはえらい！（減点はありません）';
    }
    render();
  }

  /* ────────── 描画：盤 ────────── */
  var board, gCurves, gPreview, gTreas, gMarks, tip;
  function buildBoard() {
    board = $('gt-board');
    board.setAttribute('viewBox', '0 0 ' + (12 * U) + ' ' + (12 * U));
    var defs = el('defs', {}, board);
    var cp = el('clipPath', { id: 'gt-clip' }, defs);
    el('rect', { x: px(-5.4), y: py(5.4), width: U * 10.8, height: U * 10.8 }, cp);
    el('rect', { x: px(-5.4), y: py(5.4), width: U * 10.8, height: U * 10.8, rx: 10, 'class': 'gt-plate' }, board);
    var grid = el('g', { 'class': 'gt-grid' }, board);
    for (var k = -N; k <= N; k++) {
      if (k === 0) continue;
      el('line', { x1: px(k), y1: py(N), x2: px(k), y2: py(-N) }, grid);
      el('line', { x1: px(-N), y1: py(k), x2: px(N), y2: py(k) }, grid);
    }
    var ax = el('g', { 'class': 'gt-axis' }, board);
    el('line', { x1: px(-5.4), y1: py(0), x2: px(5.55), y2: py(0) }, ax);
    el('line', { x1: px(0), y1: py(-5.4), x2: px(0), y2: py(5.55) }, ax);
    el('polygon', { points: (px(5.85)) + ',' + py(0) + ' ' + (px(5.55)) + ',' + (py(0) - 8) + ' ' + (px(5.55)) + ',' + (py(0) + 8), 'class': 'gt-arrow' }, board);
    el('polygon', { points: px(0) + ',' + py(5.85) + ' ' + (px(0) - 8) + ',' + py(5.55) + ' ' + (px(0) + 8) + ',' + py(5.55), 'class': 'gt-arrow' }, board);
    /* 目盛りの数字は盤の外（下と左）に置き、お宝と重ならないようにする */
    var lab = el('g', { 'class': 'gt-label' }, board);
    for (var t = -N; t <= N; t++) {
      var a = el('text', { x: px(t), y: py(-5.72) + 7, 'text-anchor': 'middle', 'class': t === 0 ? 'gt-zero' : '' }, lab); a.textContent = nstr(t);
      var b = el('text', { x: px(-5.72), y: py(t) + 7, 'text-anchor': 'middle', 'class': t === 0 ? 'gt-zero' : '' }, lab); b.textContent = nstr(t);
    }
    var o = el('text', { x: px(0) - 7, y: py(0) + 19, 'text-anchor': 'end', 'class': 'gt-origin' }, board); o.textContent = 'O';
    var xl = el('text', { x: px(5.62), y: py(0) - 14, 'class': 'gt-axname' }, board); xl.textContent = 'x';
    var yl = el('text', { x: px(0) + 14, y: py(5.6), 'class': 'gt-axname' }, board); yl.textContent = 'y';
    var dots = el('g', { 'class': 'gt-dots' }, board);
    for (var x = -N; x <= N; x++) for (var y = -N; y <= N; y++) el('circle', { cx: px(x), cy: py(y), r: 2.8 }, dots);
    gCurves = el('g', { 'clip-path': 'url(#gt-clip)' }, board);
    gPreview = el('g', { 'clip-path': 'url(#gt-clip)' }, board);
    gMarks = el('g', {}, board);
    gTreas = el('g', {}, board);
    tip = el('g', { 'class': 'gt-tip', visibility: 'hidden' }, board);
    el('rect', { rx: 6, width: 74, height: 26 }, tip);
    el('text', { x: 37, y: 18, 'text-anchor': 'middle' }, tip);

    board.addEventListener('pointermove', function (e) { hover(e, false); });
    board.addEventListener('pointerleave', function () { tip.setAttribute('visibility', 'hidden'); });
    board.addEventListener('click', function (e) { hover(e, true); });
  }
  function toBoard(e) {
    var pt = board.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    var p = pt.matrixTransform(board.getScreenCTM().inverse());
    return { x: (p.x - O) / U, y: (O - p.y) / U };
  }
  function hover(e, clicked) {
    var p = toBoard(e), x = Math.round(p.x), y = Math.round(p.y);
    if (Math.abs(x) > N || Math.abs(y) > N || Math.hypot(p.x - x, p.y - y) > 0.35) { tip.setAttribute('visibility', 'hidden'); return; }
    tip.setAttribute('visibility', 'visible');
    var tx = Math.min(px(x) + 10, 12 * U - 80), ty = Math.max(py(y) - 36, 4);
    tip.setAttribute('transform', 'translate(' + tx + ',' + ty + ')');
    tip.querySelector('text').textContent = '(' + nstr(x) + ', ' + nstr(y) + ')';
    if (clicked && S && S.phase === 'place' && $('gt-px')) { $('gt-px').value = x; $('gt-py').value = y; }
  }
  function curvePath(c) {
    if (c.type === 'line') {
      var x1 = -6, x2 = 6, y1 = fnum(yAt(c, x1)), y2 = fnum(yAt(c, x2));
      return 'M' + px(x1) + ',' + py(y1) + 'L' + px(x2) + ',' + py(y2);
    }
    var d = '', a = fnum(c.a);
    for (var i = 0; i <= 240; i++) {
      var x = -6 + i * 0.05, y = a * x * x;
      y = Math.max(-40, Math.min(40, y));
      d += (i ? 'L' : 'M') + px(x).toFixed(1) + ',' + py(y).toFixed(1);
    }
    return d;
  }
  function renderBoard() {
    gCurves.textContent = ''; gPreview.textContent = ''; gTreas.textContent = ''; gMarks.textContent = '';
    if (!S) return;
    S.curves.forEach(function (o, i) {
      var p = el('path', { d: curvePath(o.curve), 'class': 'gt-curve gt-' + o.owner + (o === S.newest ? ' gt-new' : '') }, gCurves);
      var t = el('title', {}, p); t.textContent = NAME[o.owner] + '：' + o.label;
    });
    var prev = S.phase === 'choose' ? selectedCurve() : null;
    if (prev) el('path', { d: curvePath(prev), 'class': 'gt-preview' + (isDup(prev) ? ' gt-bad' : '') }, gPreview);
    S.marks.forEach(function (m) {
      m.pts.forEach(function (p) { el('circle', { cx: px(p.xv), cy: py(p.yv), r: 9, 'class': 'gt-mark gt-' + m.owner }, gMarks); });
    });
    S.treasures.forEach(function (t) {
      if (t.by) return;
      if (S.view !== 'show' && S.phase !== 'over') return;   // 宝の地図・かくすモードでは盤に出さない
      var g = el('g', { 'class': t.v === 3 ? 'gt-gold' : 'gt-coin', transform: 'translate(' + px(t.x) + ',' + py(t.y) + ')' }, gTreas);
      el('circle', { r: t.v === 3 ? 15 : 12 }, g);
      var tx = el('text', { y: t.v === 3 ? 6 : 5, 'text-anchor': 'middle' }, g);
      tx.textContent = t.v === 3 ? '3' : '★';
    });
  }

  /* ────────── 描画：右側のパネル ────────── */
  function cardBtn(kind, val, idx, selected) {
    var al = tutAllow(), disabled = false, hl = false;
    if (al) { var want = al[kind]; disabled = !want || !feq(want, val); hl = !disabled && !selected; }
    var lab = kind === 's' ? '傾き' : '切片';
    var v = kind === 's' && val.d === 2 ? (val.n < 0 ? MINUS : '') + '½' : fstr(val);
    return '<button type="button" class="gt-card gt-card-' + kind + (selected ? ' is-sel' : '') + (hl ? ' is-hint' : '') + '" data-k="' + kind + '" data-i="' + idx + '" aria-pressed="' + (selected ? 'true' : 'false') + '"' + (disabled ? ' disabled' : '') + '>' +
      '<span class="gt-card-lab">' + lab + '</span><span class="gt-card-v">' + v + '</span></button>';
  }
  function scoreRow(who) {
    var s = S.score[who], tot = s.t + s.x;
    return '<div class="gt-score gt-' + who + (S.turn === who && S.phase !== 'over' ? ' is-turn' : '') + '"><div class="gt-score-name">' + NAME[who] + '</div>' +
      '<div class="gt-score-tot">' + tot + '<small>点</small></div><div class="gt-score-sub">お宝 ' + s.t + '・ボーナス ' + s.x + '</div></div>';
  }
  function bonusInputs(res) {
    var h = '';
    res.pts.forEach(function (_, i) {
      h += '<div class="gt-row">' + (res.pts.length > 1 ? '<span class="gt-tag">交点' + (i + 1) + '</span>' : '') +
        '<span>(</span><label class="sr">x</label><input class="gt-in" data-b="' + (2 * i) + '" inputmode="text" autocomplete="off" placeholder="x">' +
        '<span>,</span><input class="gt-in" data-b="' + (2 * i + 1) + '" inputmode="text" autocomplete="off" placeholder="y"><span>)</span></div>';
    });
    return h;
  }
  var lastKey = '';
  function renderPanel() {
    var P = $('gt-panel');
    if (!S) { P.innerHTML = setupHTML(); bindSetup(); return; }
    var h = '<div class="gt-scores">' + scoreRow('you') + scoreRow('cpu') + '</div>';
    var turnNo = Math.min(S.done[S.turn] + 1, S.turnsEach);
    if (S.phase !== 'place' && S.phase !== 'over' && S.phase !== 'tutDone') h += '<div class="gt-turninfo">' + (S.tut ? 'チュートリアル・' : '') + NAME[S.turn] + 'の番（' + turnNo + ' / ' + S.turnsEach + ' 回目）・残りのお宝 ' + S.treasures.filter(function (t) { return !t.by; }).length + ' 個</div>';
    if (S.view === 'map' && S.phase !== 'over') {
      var left = S.treasures.filter(function (t) { return !t.by; }).sort(function (a, b) { return a.x - b.x || b.y - a.y; });
      h += '<div class="gt-map"><b>宝の地図</b>（盤には出ません。座標から場所を見つけよう）<div class="gt-map-list">' +
        left.map(function (t) { return '<span class="' + (t.v === 3 ? 'gt-map-gold' : '') + '">' + (t.v === 3 ? '金' : '\u2605') + ' (' + nstr(t.x) + ', ' + nstr(t.y) + ')</span>'; }).join('') + '</div></div>';
    }
    if (S.view === 'hide' && S.phase !== 'over') h += '<div class="gt-map">お宝はかくれています。線を引いて、いくつ見つかるかな？（ゲームの最後に場所がわかります）</div>';
    if (S.tut) h += tutGuide();
    if (S.msg) h += '<div class="gt-msg" role="status">' + esc(S.msg) + '</div>';
    h += '<div class="gt-box">' + (S.phase === 'tutDone' ? tutDoneHTML() : phaseHTML()) + '</div>';
    h += '<details class="gt-lines"' + (S.curves.length ? ' open' : '') + '><summary>引かれた線（' + S.curves.length + '）</summary><ul>' +
      S.curves.map(function (o) { return '<li class="gt-' + o.owner + '"><span class="gt-dot"></span>' + NAME[o.owner] + '：' + esc(o.label) + '</li>'; }).join('') + '</ul></details>';
    h += '<details class="gt-log"><summary>記録</summary><ol>' + S.log.map(function (l) { return '<li class="gt-' + l.who + '">' + esc(l.t) + '</li>'; }).join('') + '</ol></details>';
    P.innerHTML = h;
    var key = S.phase + S.done.you + S.done.cpu;
    if (key !== lastKey) { P.scrollTop = 0; lastKey = key; }
    bindPanel();
  }
  function phaseHTML() {
    var h = '';
    switch (S.phase) {
      case 'place': {
        var q = S.placeQueue[0], left = S.placeQueue.filter(function (p) { return p.who === 'you'; }).length;
        h += '<h3>お宝を置こう（あと ' + left + ' 個）</h3><p class="gt-note">' + (q.v === 3 ? '<b>金のお宝（3点）</b>' : 'お宝（1点）') + 'を置く座標を入れてね。盤の点をタップすると入ります。原点には置けません。</p>' +
          '<div class="gt-row"><span>(</span><input id="gt-px" class="gt-in" inputmode="numeric" placeholder="x" aria-label="x 座標"><span>,</span><input id="gt-py" class="gt-in" inputmode="numeric" placeholder="y" aria-label="y 座標"><span>)</span>' +
          '<button type="button" class="gt-btn" id="gt-place">ここに置く</button></div>';
        break;
      }
      case 'choose': {
        var hd = S.hands.you, c = selectedCurve();
        h += '<h3>手札から線をえらぶ</h3><p class="gt-note">' + (S.level === 1 ? '傾きカードを 1 枚えらぶと、原点を通る直線 y = ax になります。' : '傾きカードと切片カードを 1 枚ずつえらぼう。') + '</p>';
        h += '<div class="gt-hand">' + hd.s.map(function (v, i) { return cardBtn('s', v, i, S.sel.s === i); }).join('') + '</div>';
        if (S.level > 1) h += '<div class="gt-hand">' + hd.b.map(function (v, i) { return cardBtn('b', v, i, S.sel.b === i); }).join('') + '</div>';
        if (c) {
          var dup = isDup(c);
          h += '<div class="gt-eq">' + esc(curveStr(c)) + '</div>';
          h += dup ? '<p class="gt-warn">この線はもう引かれています。別の組み合わせにしよう。</p>' : '<button type="button" class="gt-btn gt-main gt-sticky" id="gt-drawline">この線を引く</button>';
        }
        var alt = '';
        var al = tutAllow();
        if (S.level >= 2 && (!al || al.eq)) alt += '<button type="button" class="gt-btn gt-eqbtn' + (al ? ' is-hint' : '') + '" id="gt-eqstart">式カードに挑戦（正解で ＋1点）</button>';
        if (S.level === 3 && !al) alt += '<button type="button" class="gt-btn gt-parabtn" id="gt-para">放物線カードを引く</button>';
        if (alt) h += '<div class="gt-alt"><span>または</span>' + alt + '</div>';
        if (!anyHandMove('you') && !al) h += '<button type="button" class="gt-btn" id="gt-pass">引ける線がないのでパス</button>';
        break;
      }
      case 'eq':
        h += '<h3>式カード</h3><div class="gt-eqcard">' + esc(S.eqCard.text) + '</div>' +
          '<p class="gt-note">移項して y = ax + b の形に直そう。分数は 1/2 のように入れてね。</p>' +
          '<div class="gt-row gt-yax"><span>y =</span><input class="gt-in" id="gt-ea" placeholder="a" aria-label="a（傾き）"><span>x +</span><input class="gt-in" id="gt-eb" placeholder="b" aria-label="b（切片）"></div>' +
          '<p class="gt-note">例：y = −2x + 3 なら a に −2、b に 3。b がマイナスなら −3 と入れる。</p>' +
          '<button type="button" class="gt-btn gt-main gt-sticky" id="gt-eqok">決定</button>';
        break;
      case 'bonus': {
        var B = S.bonus;
        h += '<h3>交点ボーナスに挑戦！</h3><p class="gt-note">CPU の線と交わりました。交点を 1 つえらんで、座標を計算しよう（1 回の番で 1 つ）。</p><div class="gt-opts">';
        B.opts.forEach(function (o, i) {
          h += '<button type="button" class="gt-opt' + (B.pick === i ? ' is-sel' : '') + '" data-o="' + i + '" aria-pressed="' + (B.pick === i) + '">' + esc(o.other.label) + ' との交点' +
            (o.res.pts.length > 1 ? '（2 つ）' : '') + '<span class="gt-pts">＋' + o.res.score + '点</span></button>';
        });
        h += '</div>';
        if (B.pick >= 0) {
          var res = B.opts[B.pick].res;
          h += '<p class="gt-note">' + esc(curveStr(B.curve)) + ' と ' + esc(B.opts[B.pick].other.label) + ' の交点' + (res.pts.length > 1 ? 'を 2 つとも' : 'を') + '入れてね。' +
            (res.score === 3 ? '答えは √ を使って (1 + √5)/2 のように入れられます。' : '分数は 2/3 のように入れてね。') + '</p>' + bonusInputs(res) +
            '<button type="button" class="gt-btn gt-main gt-sticky" id="gt-bok">決定</button>';
        }
        h += '<button type="button" class="gt-btn gt-ghost" id="gt-bskip">今回は挑戦しない</button>';
        break;
      }
      case 'yourEnd':
        if (S.bonus && S.bonus.result) h += '<div class="gt-steps"><b>交点の求め方</b><ol>' + S.bonus.result.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>';
        h += '<button type="button" class="gt-btn gt-main gt-sticky" id="gt-next">' + (S.tut && S.done.you === 2 ? 'チュートリアルのまとめへ' : willEnd() ? '結果を見る' : '次へ（CPU の番）') + '</button>';
        break;
      case 'cpuShow': {
        var r = S.lastCpu;
        h += '<h3>CPU の番</h3>';
        if (r.kind === 'pass') h += '<p>CPU はパスしました。</p>';
        else {
          if (r.kind === 'eq') h += '<p>式カード「' + esc(r.card.text) + '」を直して…</p>';
          h += '<div class="gt-eq gt-cpu-eq">CPU「' + esc(curveStr(r.declared)) + '」</div>';
          if (r.checked && r.wrong) h += '<p>まちがった線は消して、お宝はもとの場所にもどしました。</p>';
          else h += '<p>' + (r.taken.length ? 'お宝 ' + r.taken.length + ' 個（' + sumV(r.taken) + ' 点）を取った。' : 'お宝はなかった。') + '</p>';
          if (r.kind === 'line' && !r.checked) h += '<p class="gt-note">CPU が言った式と、盤に引かれた線は合っている？ 切片と傾きを確かめよう。まちがいを見つけたら ＋1点（まちがえても減点なし）。</p>' +
            '<button type="button" class="gt-btn gt-matta' + (S.tut && r.wrong ? ' is-hint' : '') + '" id="gt-matta">待った！</button>';
          if (r.bonus && !(r.checked && r.wrong)) h += '<div class="gt-steps"><b>CPU の交点の計算</b><ol>' + r.bonus.res.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>';
        }
        var lock = S.tut && r.wrong && !r.checked;
        h += '<button type="button" class="gt-btn gt-main gt-sticky" id="gt-next"' + (lock ? ' disabled' : '') + '>' + (willEnd() ? '結果を見る' : '次へ（あなたの番）') + '</button>';
        break;
      }
      case 'over': {
        var y = S.score.you.t + S.score.you.x, c2 = S.score.cpu.t + S.score.cpu.x;
        h += '<h3>' + (y > c2 ? 'あなたの勝ち！' : y < c2 ? 'CPU の勝ち' : '引き分け') + '</h3><p class="gt-big">あなた ' + y + ' 点 ／ CPU ' + c2 + ' 点</p>' +
          '<div class="gt-steps"><b>ふり返り</b><p>いちばんうまくいった線を 1 本えらんで、なぜその傾きと切片にしたのか説明してみよう。</p></div>' +
          '<button type="button" class="gt-btn gt-main" id="gt-again">同じ設定でもう一度</button><button type="button" class="gt-btn gt-ghost" id="gt-reset">設定を変える</button>';
        break;
      }
    }
    return h;
  }
  function willEnd() {
    var d = { you: S.done.you, cpu: S.done.cpu }; d[S.turn]++;
    if (d.you !== d.cpu) return false;
    return d.you >= S.turnsEach || !treasuresLeft();
  }

  function setupHTML() {
    return '<div class="gt-box gt-tutbox"><h3>はじめての人へ</h3><p class="gt-note">実際に 3 回ほど線を引きながら、ルールを順番に覚えられます（約 3 分）。</p>' +
      '<button type="button" class="gt-btn gt-main" id="gt-tutorial">チュートリアルで遊び方を覚える</button></div>' +
      '<div class="gt-box"><h3>ゲームの設定</h3>' +
      '<fieldset><legend>学年（ルール）</legend>' +
      radio('lv', '1', '中1：比例 y = ax', false) + radio('lv', '2', '中2：一次関数・連立方程式・移項', true) + radio('lv', '3', '中3：＋放物線 y = ax²', false) + '</fieldset>' +
      '<fieldset><legend>CPU の強さ</legend>' + radio('cp', 'easy', 'やさしい（よくまちがえる）', true) + radio('cp', 'normal', 'ふつう', false) + radio('cp', 'strong', 'つよい', false) + '</fieldset>' +
      '<fieldset><legend>1 人の手番の回数</legend>' + radio('tn', '5', '5 回（約 15 分）', true) + radio('tn', '8', '8 回（じっくり）', false) + '</fieldset>' +
      '<fieldset><legend>お宝の見え方</legend>' + radio('tv', 'show', '見える（はじめての人に）', true) + radio('tv', 'map', '宝の地図：座標だけわかる（座標の練習）', false) + radio('tv', 'hide', 'かくれている（運だめし）', false) + '</fieldset>' +
      '<fieldset><legend>お宝の置き方（「見える」のとき）</legend>' + radio('pl', 'auto', 'おまかせ（すぐ始める）', true) + radio('pl', 'manual', '交代で置く（座標の練習）', false) + '</fieldset>' +
      '<fieldset><legend>先に引く人</legend>' + radio('fs', 'you', 'あなた', true) + radio('fs', 'cpu', 'CPU', false) + '</fieldset>' +
      '<button type="button" class="gt-btn gt-main" id="gt-start">ゲーム開始</button></div>';
  }
  function radio(name, val, label, checked) {
    return '<label class="gt-radio"><input type="radio" name="gt-' + name + '" value="' + val + '"' + (checked ? ' checked' : '') + '><span>' + label + '</span></label>';
  }
  var lastOpt = null;
  function readOpt() {
    function v(n) { var e = document.querySelector('input[name="gt-' + n + '"]:checked'); return e ? e.value : ''; }
    return { level: +v('lv'), cpu: v('cp'), turns: +v('tn'), place: v('pl'), first: v('fs'), view: v('tv') };
  }
  function bindSetup() {
    $('gt-start').onclick = function () { lastOpt = readOpt(); newGame(lastOpt); };
    on('gt-tutorial', startTutorial);
  }
  function on(id, fn) { var e = $(id); if (e) e.onclick = fn; }
  function bindPanel() {
    on('gt-place', function () {
      var x = evalExpr($('gt-px').value), y = evalExpr($('gt-py').value);
      if (!isFinite(x) || !isFinite(y) || x % 1 || y % 1) { S.msg = 'x と y に整数を入れてね。'; render(); return; }
      S.msg = humanPlace(x, y); render();
    });
    Array.prototype.forEach.call(document.querySelectorAll('.gt-card'), function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-k'), i = +b.getAttribute('data-i');
        S.sel[k] = S.sel[k] === i ? -1 : i; S.msg = ''; render();
      };
    });
    on('gt-drawline', humanDrawSelected);
    on('gt-eqstart', humanEqStart);
    on('gt-para', humanPara);
    on('gt-pass', function () { addLog('あなた：パス', 'you'); endTurn(); });
    on('gt-eqok', function () { humanEqAnswer($('gt-ea').value, $('gt-eb').value); });
    Array.prototype.forEach.call(document.querySelectorAll('.gt-opt'), function (b) {
      b.onclick = function () { S.bonus.pick = +b.getAttribute('data-o'); S.msg = ''; render(); };
    });
    on('gt-bok', function () {
      var vals = [];
      Array.prototype.forEach.call(document.querySelectorAll('[data-b]'), function (e) { vals[+e.getAttribute('data-b')] = e.value; });
      humanBonusAnswer(vals);
    });
    on('gt-bskip', function () { S.phase = 'yourEnd'; S.msg = ''; render(); });
    on('gt-next', function () { S.msg = ''; endTurn(); });
    on('gt-matta', humanMatta);
    on('gt-again', function () { newGame(lastOpt); });
    on('gt-reset', function () { S = null; render(); });
    on('gt-tutorial', startTutorial);
    /* Enter で決定 */
    Array.prototype.forEach.call(document.querySelectorAll('.gt-in'), function (e) {
      e.onkeydown = function (ev) {
        if (ev.key !== 'Enter') return;
        var b = $('gt-place') || $('gt-eqok') || $('gt-bok');
        if (b) b.click();
      };
    });
  }
  function render() {
    renderBoard();
    renderPanel();
    var first = document.querySelector('#gt-panel .gt-in');
    if (first && S && (S.phase === 'eq' || (S.phase === 'bonus' && S.bonus.pick >= 0))) first.focus({ preventScroll: true });
  }

  function startTutorial() {
    newGame({ level: 2, cpu: 'easy', turns: 3, first: 'you', place: 'auto', tutorial: true });
  }
  root.__gtState = function () { return S; };  // 動作確認用
  function init() { buildBoard(); render(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
