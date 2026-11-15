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
    var bodyProbe = document.createElement('span'); bodyProbe.className = 'eq-axis-probe';
    var numProbe = document.createElement('span'); numProbe.className = 'eq-axis-probe';
    bodyProbe.setAttribute('aria-hidden', 'true');
    numProbe.setAttribute('aria-hidden', 'true');

    disp.insertBefore(row, katex);
    row.appendChild(body);
    body.appendChild(katex);
    tag.parentNode.removeChild(tag);
    katex.querySelector(':scope > .katex-html').appendChild(bodyProbe);
    num.appendChild(tag);
    tag.appendChild(numProbe);
    row.appendChild(num);
    disp.setAttribute('data-eqnum', 'done');
  }

  /* KaTeX's tag contains a strut as tall as the complete formula.  Centring
     that box aligns containers, not the printed number: fractions and
     underbraces then leave the number visibly above the math axis.  Zero-size
     inline probes expose the real baseline on both sides, so only the number
     lane can be translated onto the formula baseline without changing or
     clipping the equation body. */
  function align(disp) {
    if (disp.getAttribute('data-eqnum') !== 'done') return;
    var bodyProbe = disp.querySelector('.eq-body .eq-axis-probe');
    var numProbe = disp.querySelector('.eq-num .eq-axis-probe');
    var num = disp.querySelector('.eq-num');
    var formula = disp.querySelector('.eq-body > .katex');
    if (!bodyProbe || !numProbe || !num || !formula) return;
    /* A long formula may be reduced at a narrow breakpoint.  The extracted
       tag no longer inherits that selector, so explicitly keep its printed
       size in sync with the formula before comparing baselines. */
    num.style.fontSize = getComputedStyle(formula).fontSize;
    num.style.transform = 'none';
    var delta = bodyProbe.getBoundingClientRect().top - numProbe.getBoundingClientRect().top;
    num.style.transform = 'translateY(' + delta.toFixed(3) + 'px)';
  }

  function alignAll() {
    var list = document.querySelectorAll('.katex-display[data-eqnum="done"]');
    for (var i = 0; i < list.length; i++) align(list[i]);
  }

  function run() {
    var list = document.querySelectorAll('.katex-display');
    for (var i = 0; i < list.length; i++) lift(list[i]);
    requestAnimationFrame(alignAll);
  }

  function start() {
    run();                                   // KaTeX renders in a deferred
    window.addEventListener('load', run);    // script; catch both orders
    setTimeout(run, 400);
    setTimeout(run, 1500);
    window.addEventListener('resize', alignAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignAll);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
