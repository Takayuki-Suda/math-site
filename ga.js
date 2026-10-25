/* ════════════════════════════════════════════════════════
   アクセス解析（Google アナリティクス 4）
   ・GA_ID が空のあいだは何もしない
   ・自分の端末を数えない：ページのURLの末尾に ?me=1 を付けて一度開くと、
     その端末（そのブラウザ）は以後カウントされない。?me=0 で元に戻る。
   ════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var GA_ID = '';   /* 例: 'G-XXXXXXXXXX' */
  var KEY = 'suda_no_count';

  function get(){ try{ return localStorage.getItem(KEY)==='1'; }catch(e){ return false; } }
  function set(v){ try{ if(v) localStorage.setItem(KEY,'1'); else localStorage.removeItem(KEY); }catch(e){} }

  function toast(msg){
    function show(){
      var d=document.createElement('div');
      d.textContent=msg;
      d.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:100000;'+
        'background:#111827;color:#f0f4ff;border:1px solid #c8a84b;border-radius:10px;padding:12px 18px;'+
        'font:14px/1.5 sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.5);max-width:90vw;text-align:center;';
      document.body.appendChild(d);
      setTimeout(function(){ d.remove(); },6000);
    }
    if(document.body) show(); else document.addEventListener('DOMContentLoaded',show);
  }

  var m=/[?&]me=([01])/.exec(location.search);
  if(m){
    set(m[1]==='1');
    toast(m[1]==='1'
      ? '✅ この端末のアクセスは数えません'
      : 'この端末のアクセスも数えるように戻しました');
  }

  if(!GA_ID || get()) return;
  if(/^(localhost|127\.|192\.168\.)/.test(location.hostname)) return;

  var s=document.createElement('script');
  s.async=true;
  s.src='https://www.googletagmanager.com/gtag/js?id='+GA_ID;
  document.head.appendChild(s);
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){ dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', GA_ID);
})();
