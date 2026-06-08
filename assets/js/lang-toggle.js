(function(){
  var lang = localStorage.getItem('lang') || 'en';
  document.documentElement.setAttribute('data-lang', lang);

  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.querySelector('.lang-btn');
    if(!btn) return;
    // The button shows a static "EN / 日本語" segmented label; CSS highlights
    // the active language from the <html data-lang> attribute.
    btn.addEventListener('click', function(){
      lang = lang === 'en' ? 'ja' : 'en';
      document.documentElement.setAttribute('data-lang', lang);
      localStorage.setItem('lang', lang);
    });
  });
})();
