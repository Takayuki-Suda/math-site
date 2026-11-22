/* ════════════════════════════════════════════════════════
   教材ページの最後に「つまずいたら、先生と1対1で」の案内を出す（ストアカへ）
   nav.js から読み込まれる。ゲーム・マップ・英語版のページには出さない。

   ★ 講座のURLを変えるとき（自己集客URLに差し替えるときなど）は、
     下の SA の中だけを直せば、全部の教材ページに反映されます。
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var SA = {
    teacher: 'https://www.street-academy.com/steachers/963434',   // 先生のページ（全講座）
    naze:    'https://www.street-academy.com/myclass/219220',     // 算数〜高校数学の「なぜ？」
    spi:     'https://www.street-academy.com/myclass/223345',     // 文系・転職SPI
    kosotsu: 'https://www.street-academy.com/myclass/224289'      // 高卒認定・数学
  };

  var path = location.pathname.replace(/^\/math-site\//, '');
  if (/^en\//.test(path)) return;                                   // 英語版
  if (document.documentElement.lang && document.documentElement.lang !== 'ja') return;
  if (/(card-battle|graph-treasure|map|boss|sugoroku|index)/.test(path)) return; // ゲーム・入口ページ
  var level = (path.match(/^(sho|chu|ko|dai|in)\//) || [])[1];
  if (!level) return;
  if (document.getElementById('sa-cta')) return;

  /* ページの単元名（タイトルの最初の部分） */
  var topic = (document.title || '').split(/[｜|]| - | ─ /)[0].trim();
  if (topic.length > 18) topic = '';

  var C = {
    sho: {
      lead: topic ? '「' + topic + '」、お子さんにどう説明すればいいか迷ったら。' : '算数でつまずいたら。',
      text: '元小学校教員が、Zoomで1対1で「なぜそうなるか」から一緒に考えます。大人の学び直しも歓迎です。',
      main: ['「なぜ？」個別指導を見る', SA.naze],
      sub:  ['就職・転職のSPIや公務員試験の算数なら', SA.spi]
    },
    chu: {
      lead: topic ? '「' + topic + '」でつまずいたら。' : '中学の数学でつまずいたら。',
      text: '公式を覚えるのではなく、自分で導けるところまで、Zoomで1対1で一緒に考えます。',
      main: ['「なぜ？」個別指導を見る', SA.naze],
      sub:  ['高卒認定に向けて、中学からやり直したい方はこちら', SA.kosotsu]
    },
    ko: {
      lead: topic ? '「' + topic + '」でつまずいたら。' : '高校の数学でつまずいたら。',
      text: '教科書の行間を、Zoomで1対1で埋めていきます。急かしません。',
      main: ['「なぜ？」個別指導を見る', SA.naze],
      sub:  ['高卒認定の数学をやり直したい方はこちら', SA.kosotsu]
    },
    dai: {
      lead: '大学の数学も、1対1で一緒に読めます。',
      text: '大学院で数論を学んだ講師が、教科書やノートの行間を、Zoomで一緒にたどります。',
      main: ['講座を見る', SA.teacher],
      sub:  null
    }
  };
  C['in'] = C.dai;
  var c = C[level];

  var css =
    '#sa-cta{max-width:720px;margin:48px auto 40px;padding:0 16px;box-sizing:border-box;font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;}' +
    '#sa-cta .sa-box{background:linear-gradient(160deg,rgba(200,168,75,.18),rgba(17,24,39,0) 60%),#111827;border:1px solid #c8a84b;border-radius:16px;padding:26px 22px;text-align:center;color:#c8d4e0;box-shadow:0 10px 28px rgba(0,0,0,.35);}' +
    '#sa-cta .sa-label{font-size:.72rem;letter-spacing:.12em;color:#c8a84b;margin:0 0 8px;}' +
    '#sa-cta .sa-lead{font-size:1.05rem;font-weight:700;color:#f0f4ff;line-height:1.6;margin:0 0 10px;}' +
    '#sa-cta .sa-text{font-size:.88rem;line-height:1.85;margin:0 0 18px;text-align:left;}' +
    '#sa-cta .sa-btn{display:inline-block;background:#c8a84b;color:#0a0e1a;font-weight:700;font-size:.92rem;text-decoration:none;border-radius:999px;padding:13px 24px;line-height:1.5;max-width:100%;box-sizing:border-box;}' +
    '#sa-cta .sa-btn:hover{background:#e8c96b;}' +
    '#sa-cta .sa-sub{display:block;margin-top:14px;font-size:.82rem;color:#7ec8e3;line-height:1.7;}' +
    '#sa-cta .sa-note{font-size:.74rem;color:#8899aa;margin:14px 0 0;}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  function esc(t){ return String(t).replace(/[&<>"]/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]; }); }
  function link(cls, item, kind){
    return '<a class="' + cls + '" data-sa="' + kind + '" href="' + item[1] + '" target="_blank" rel="noopener">' + esc(item[0]) + '</a>';
  }

  var box = document.createElement('aside');
  box.id = 'sa-cta';
  box.setAttribute('aria-label', 'オンライン個別指導のご案内');
  box.innerHTML =
    '<div class="sa-box">' +
      '<p class="sa-label">オンライン個別指導（ストアカ）</p>' +
      '<p class="sa-lead">' + esc(c.lead) + '</p>' +
      '<p class="sa-text">' + esc(c.text) + '</p>' +
      link('sa-btn', ['▶ ' + c.main[0], c.main[1]], 'main') +
      (c.sub ? link('sa-sub', c.sub, 'sub') : '') +
      '<p class="sa-note">1回60分・1回だけの受講もできます</p>' +
    '</div>';
  document.body.appendChild(box);

  /* Googleアナリティクスに「ストアカへのクリック」を記録（自分だけが見る） */
  box.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[data-sa]');
    if (a && typeof window.gtag === 'function') {
      window.gtag('event', 'storeaca_click', { page_path: location.pathname, link_kind: a.getAttribute('data-sa') });
    }
  });
})();
