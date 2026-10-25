/* ════════════════════════════════════════════════════════
   サイト共通ナビ：スマホ等タッチ端末でドロップダウンをタップ開閉
   PC（ホバー可）はCSSの :hover に任せ、挙動を変えない。
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* タッチ端末用のCSSを注入（.site-nav を前置して詳細度を上げ既存ルールに勝つ） */
  function injectCSS(){
    var css =
      '@media (hover: none),(pointer: coarse){'+
        /* ホバー/フォーカスでは開かない（タップ開閉に一本化） */
        '.site-nav .site-nav__item:hover>.site-nav__dropdown,'+
        '.site-nav .site-nav__item:focus-within>.site-nav__dropdown{display:none;}'+
        /* タップで開いた項目：画面幅いっぱいの固定パネルにして見切れを防ぐ */
        '.site-nav .site-nav__item.is-open>.site-nav__dropdown{'+
          'display:block;position:fixed;left:8px;right:8px;'+
          'top:var(--site-nav-h,48px);min-width:0;max-height:72vh;'+
          'overflow-y:auto;-webkit-overflow-scrolling:touch;z-index:10000;}'+
        '.site-nav .site-nav__item.is-open .site-nav__arrow{transform:rotate(180deg);}'+
      '}'+
      /* 中くらいの画面幅：メニューが入りきらないときは2段に折り返す（横スクロールを出さない） */
      '@media (min-width:701px) and (max-width:1000px){'+
        '.site-nav .site-nav__inner{flex-wrap:wrap;justify-content:center;}'+
        '.site-nav .site-nav__list{flex-wrap:wrap;justify-content:center;}'+
      '}'+
      /* 英語版：項目名が長いので余白を詰め、幅を広げる */
      'html[lang="en"] .site-nav .site-nav__inner{max-width:1320px;}'+
      'html[lang="en"] .site-nav .site-nav__link{padding-left:8px;padding-right:8px;}'+
      '@media (min-width:701px) and (max-width:1240px){'+
        'html[lang="en"] .site-nav .site-nav__inner{flex-wrap:wrap;justify-content:center;}'+
        'html[lang="en"] .site-nav .site-nav__list{flex-wrap:wrap;justify-content:center;}'+
        'html[lang="en"] .site-nav .site-nav__logo{padding-bottom:0;}'+
      '}';
    var s=document.createElement('style');
    s.textContent=css;
    document.head.appendChild(s);
  }

  /* ── 「大学院」メニューを動的に追加 ──
     各ページのナビHTMLを書き換えずに、全ページ共通でドロップダウンを足す。
     挿入位置は「なぜ学ぶのか」の直前（無ければ末尾）。 */
  function injectGradMenu(nav){
    var list=nav.querySelector('.site-nav__list');
    if(!list || nav.querySelector('.site-nav__item--grad')) return;
    var li=document.createElement('li');
    li.className='site-nav__item site-nav__item--grad';
    li.innerHTML=
      '<a class="site-nav__link" role="button" tabindex="0" aria-haspopup="true">大学院 <span class="site-nav__arrow">▼</span></a>'+
      '<div class="site-nav__dropdown">'+
        '<a href="/math-site/in/aec.html">楕円曲線の数論 ─ 全体地図</a>'+
        '<a href="/math-site/in/weakmw.html">弱Mordell–Weil定理</a>'+
        '<a href="/math-site/in/kummer.html">Kummer対とコホモロジー</a>'+
        '<a href="/math-site/in/descent.html">降下法とMordell–Weil定理</a>'+
        '<a href="/math-site/in/selmer.html">Selmer群とШ群</a>'+
        '<a href="/math-site/in/atec.html">その先へ ─ Advanced Topics</a>'+
        '<a href="/math-site/in/ant.html">代数的整数論の武器庫</a>'+
      '</div>';
    var ref=null, ch=list.children;
    for(var i=0;i<ch.length;i++){
      var a=ch[i].querySelector && ch[i].querySelector('a.site-nav__link[href]');
      if(a && (a.getAttribute('href')||'').indexOf('why.html')>-1){ ref=ch[i]; break; }
    }
    if(ref){ list.insertBefore(li,ref); } else { list.appendChild(li); }
  }

  /* ── 言語切替（日本語 ⇄ English）──
     英語版は /math-site/en/ 以下に同じ構成で置いてある。
     ラベルはUnicodeエスケープ（英語版ビルドの翻訳対象にしないため）。 */
  function injectLangSwitch(nav){
    var list=nav.querySelector('.site-nav__list');
    if(!list || nav.querySelector('.site-nav__item--lang')) return;
    var p=location.pathname, en='/math-site/en/', base=en.slice(0,-3); /* 英語版ビルドのパス書き換えを受けない書き方 */
    var isEn=p.indexOf(en)===0, href;
    if(isEn){ href=base+p.slice(en.length); }
    else if(p.indexOf(base)===0){ href=en+p.slice(base.length); }
    else return;
    var li=document.createElement('li');
    li.className='site-nav__item site-nav__item--lang';
    var a=document.createElement('a');
    a.className='site-nav__link';
    a.href=href+location.hash;
    a.setAttribute('hreflang', isEn?'ja':'en');
    a.setAttribute('lang', isEn?'ja':'en');
    a.textContent=isEn?'日本語':'English';
    li.appendChild(a);
    list.appendChild(li);
  }

  function init(){
    var nav=document.querySelector('.site-nav');
    if(!nav) return;
    injectGradMenu(nav);
    injectLangSwitch(nav);
    injectCSS();

    /* 固定パネルの位置（ナビの高さ）をCSS変数に反映 */
    var root=document.documentElement;
    function setH(){
      root.style.setProperty('--site-nav-h', nav.getBoundingClientRect().height+'px');
    }
    setH();
    window.addEventListener('resize',setH);
    window.addEventListener('orientationchange',setH);

    function closeAll(){
      var open=nav.querySelectorAll('.site-nav__item.is-open');
      for(var i=0;i<open.length;i++) open[i].classList.remove('is-open');
    }

    /* ドロップダウンのトリガー（href無し・role="button"）にタップ開閉を付与 */
    var btns=nav.querySelectorAll('.site-nav__link[role="button"]');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        var item=this.parentNode;
        while(item && (!item.classList || !item.classList.contains('site-nav__item'))){
          item=item.parentNode;
        }
        if(!item) return;
        var wasOpen=item.classList.contains('is-open');
        closeAll();
        if(!wasOpen){ setH(); item.classList.add('is-open'); }
      });
    }

    /* メニュー外をタップしたら閉じる */
    document.addEventListener('click',function(e){
      if(!nav.contains(e.target)) closeAll();
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
