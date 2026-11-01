(function(){
  // ===== الإعدادات =====
  var NEW_SITE_URL = "https://bdalrhmnalnjar434-bot.github.io/TXT-Vault0/";
  var AUTO_REDIRECT_SECONDS = 0;
  // =====================
  var ok = /^https:\/\//.test(NEW_SITE_URL);
  var o = document.createElement("div");
  o.setAttribute("dir","rtl");
  o.style.cssText="position:fixed;inset:0;z-index:2147483647;background:#0f1115;color:#f1f3f6;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,Tahoma,Arial,sans-serif;text-align:center";
  o.innerHTML='<div style="max-width:440px"><div style="font-size:44px">🔒</div>'+
    '<h1 style="font-size:22px;margin:12px 0 10px">تم إيقاف هذا الموقع</h1>'+
    '<p style="color:#9aa3b2;line-height:1.8;margin:0 0 22px">صدر إصدار أحدث من المنصة، انتقل إلى الموقع الجديد للمتابعة</p>'+
    (ok?'<a href="'+NEW_SITE_URL+'" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600">الانتقال إلى الموقع الجديد</a>':'')+
    '</div>';
  function mount(){
    try{Array.prototype.slice.call(document.body.children).forEach(function(n){n.remove();});}catch(e){}
    document.body.appendChild(o);
    document.documentElement.style.overflow="hidden";
    ["keydown","keypress","keyup","click","submit"].forEach(function(e){
      document.addEventListener(e,function(ev){
        if(o.contains(ev.target)&&ev.type==="click")return;
        ev.stopPropagation();ev.preventDefault();
      },true);
    });
  }
  if(document.body)mount();else document.addEventListener("DOMContentLoaded",mount);
  if(ok&&AUTO_REDIRECT_SECONDS>0)setTimeout(function(){location.href=NEW_SITE_URL},AUTO_REDIRECT_SECONDS*1000);
})();   
