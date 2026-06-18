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
      '}';
    var s=document.createElement('style');
    s.textContent=css;
    document.head.appendChild(s);
  }

  function init(){
    var nav=document.querySelector('.site-nav');
    if(!nav) return;
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
