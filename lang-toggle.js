(function(){
  var lang = localStorage.getItem('lang') || 'en';
  document.documentElement.setAttribute('data-lang', lang);

  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.querySelector('.lang-btn');
    if(!btn) return;
    btn.textContent = lang === 'en' ? '日本語' : 'English';
    btn.addEventListener('click', function(){
      lang = lang === 'en' ? 'ja' : 'en';
      document.documentElement.setAttribute('data-lang', lang);
      localStorage.setItem('lang', lang);
      btn.textContent = lang === 'en' ? '日本語' : 'English';
    });
  });
})();
