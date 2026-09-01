/* ═══════════════════════════════════════════════════════════════════════════
   eq-number.js — equation numbers that never collide with the equation.

   KaTeX renders \tag as a span pinned with `position:absolute; right:0` INSIDE
   the equation box, so a formula wider than the reading column runs straight
   under its own number, and no CSS can rescue it: the number lives inside the
   element that would have to scroll.

   So lift the number into its own lane:

       .katex-display
       └ .eq-row      flex, align-items:center      ← one line, centred
         ├ .eq-body   flex:1, min-width:0, scrolls  ← the formula
         └ .eq-num    flex:none                     ← the number

   The formula stays centred in the space left over and scrolls inside it when
   it is too long; the number keeps its place on the same line, vertically
   centred with the formula, and the two can never overlap at any width.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  function lift(disp) {
    if (disp.getAttribute('data-eqnum')) return;
    var katex = disp.querySelector(':scope > .katex');
    if (!katex) return;                                   // not rendered yet
    var tag = katex.querySelector(':scope > .katex-html > .tag');
    if (!tag) { disp.setAttribute('data-eqnum', 'none'); return; }

    var row = document.createElement('span'); row.className = 'eq-row';
    var body = document.createElement('span'); body.className = 'eq-body';
    var num = document.createElement('span'); num.className = 'eq-num';

    disp.insertBefore(row, katex);
    row.appendChild(body);
    body.appendChild(katex);
    tag.parentNode.removeChild(tag);
    num.appendChild(tag);
    row.appendChild(num);
    disp.setAttribute('data-eqnum', 'done');
  }

  function run() {
    var list = document.querySelectorAll('.katex-display');
    for (var i = 0; i < list.length; i++) lift(list[i]);
  }

  function start() {
    run();                                   // KaTeX renders in a deferred
    window.addEventListener('load', run);    // script; catch both orders
    setTimeout(run, 400);
    setTimeout(run, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
