/* Hover, focus or tap an equation reference to preview the cited equation. */
(function () {
  if (window.__eqHoverInitialized) return;
  window.__eqHoverInitialized = true;

  var refSelector = '.eqref[data-eq], .eqref[data-eq-preview]';
  var tip = document.createElement('div');
  tip.className = 'eq-tip';
  tip.id = 'equation-preview';
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tip);

  var cur = null;
  var hideTimer = 0;
  var escapedRef = null;
  var touchPrimedRef = null;
  var lastPointerType = '';
  var lastPointerRef = null;
  var positionFrame = 0;
  var focusScrollGraceRef = null;
  var focusScrollGraceTimer = 0;

  function cancelHide() {
    window.clearTimeout(hideTimer);
    hideTimer = 0;
  }

  function hideSoon() {
    cancelHide();
    hideTimer = window.setTimeout(function () { hide(); }, 160);
  }

  function removeDescription(ref) {
    if (!ref) return;
    var ids = (ref.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (id) {
      return id && id !== tip.id;
    });
    if (ids.length) ref.setAttribute('aria-describedby', ids.join(' '));
    else ref.removeAttribute('aria-describedby');
  }

  function hide(options) {
    options = options || {};
    cancelHide();
    if (positionFrame) window.cancelAnimationFrame(positionFrame);
    positionFrame = 0;
    tip.classList.remove('show');
    tip.setAttribute('aria-hidden', 'true');
    removeDescription(cur);
    cur = null;
    if (!options.keepTouchState) touchPrimedRef = null;
  }

  function grantFocusScrollGrace(ref) {
    window.clearTimeout(focusScrollGraceTimer);
    focusScrollGraceRef = ref;
    focusScrollGraceTimer = window.setTimeout(function () {
      focusScrollGraceRef = null;
      focusScrollGraceTimer = 0;
    }, 600);
  }

  function place(ref) {
    if (!ref || ref !== cur) return;
    var rect = ref.getBoundingClientRect();
    var width = document.documentElement.clientWidth;
    var height = document.documentElement.clientHeight;
    var edge = 12;

    tip.style.left = edge + 'px';
    tip.style.top = edge + 'px';
    var tipWidth = tip.offsetWidth;
    var tipHeight = tip.offsetHeight;
    var left = Math.max(edge, Math.min(rect.left, width - tipWidth - edge));
    var top = rect.bottom + 10;
    if (top + tipHeight > height - edge) top = rect.top - tipHeight - 10;
    top = Math.max(edge, Math.min(top, height - tipHeight - edge));
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function placeAfterRender(ref) {
    if (positionFrame) window.cancelAnimationFrame(positionFrame);
    positionFrame = window.requestAnimationFrame(function () {
      positionFrame = window.requestAnimationFrame(function () {
        positionFrame = 0;
        place(ref);
      });
    });
  }

  function stripDuplicateIds(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[id]'), function (element) {
      element.removeAttribute('id');
    });
  }

  function renderMath(root) {
    if (typeof window.renderMathInElement !== 'function') return false;
    window.renderMathInElement(root, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ]
    });
    return true;
  }

  function equationContent(ref) {
    var keys = (ref.getAttribute('data-eq') || '').trim().split(/\s+/).filter(Boolean);
    if (!keys.length) return null;
    var sources = keys.map(function (key) { return document.getElementById('eq' + key); });
    if (sources.some(function (source) { return !source; })) return null;

    var holder = document.createElement('div');
    sources.forEach(function (source) {
      Array.prototype.forEach.call(source.childNodes, function (node) {
        holder.appendChild(node.cloneNode(true));
      });
    });
    stripDuplicateIds(holder);
    if (!holder.querySelector('.katex') && !renderMath(holder)) return null;
    return holder;
  }

  function customContent(ref) {
    var key = (ref.getAttribute('data-eq-preview') || '').trim();
    var template = key && document.getElementById('eq-preview-' + key);
    if (!template || template.tagName !== 'TEMPLATE') return null;
    var holder = document.createElement('div');
    holder.appendChild(template.content.cloneNode(true));
    stripDuplicateIds(holder);
    if (!renderMath(holder)) return null;
    return holder;
  }

  function show(ref) {
    if (!ref || escapedRef === ref) return false;
    cancelHide();
    var content = ref.hasAttribute('data-eq-preview') ? customContent(ref) : equationContent(ref);
    if (!content) return false;

    if (cur !== ref) hide({ keepTouchState: true });
    while (tip.firstChild) tip.removeChild(tip.firstChild);
    while (content.firstChild) tip.appendChild(content.firstChild);
    tip.classList.add('show');
    tip.setAttribute('aria-hidden', 'false');
    cur = ref;
    var described = (ref.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (described.indexOf(tip.id) === -1) described.push(tip.id);
    ref.setAttribute('aria-describedby', described.join(' '));
    // Move off any previous reference immediately so a touch click cannot be
    // intercepted by the tooltip before the post-render measurements settle.
    place(ref);
    placeAfterRender(ref);
    return true;
  }

  function reference(target) {
    return target && target.closest ? target.closest(refSelector) : null;
  }

  function isModifiedClick(event) {
    return event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
  }

  document.addEventListener('pointerdown', function (event) {
    lastPointerType = event.pointerType || '';
    lastPointerRef = reference(event.target);
  });

  document.addEventListener('pointerover', function (event) {
    var ref = reference(event.target);
    if (!ref || event.pointerType === 'touch') return;
    if (event.relatedTarget && ref.contains(event.relatedTarget)) return;
    cancelHide();
    show(ref);
  });

  document.addEventListener('pointerout', function (event) {
    var ref = reference(event.target);
    if (!ref || (event.relatedTarget && ref.contains(event.relatedTarget))) return;
    if (escapedRef === ref) escapedRef = null;
    if (ref === cur && document.activeElement !== ref && !(event.relatedTarget && tip.contains(event.relatedTarget))) {
      hideSoon();
    }
  });

  tip.addEventListener('pointerenter', cancelHide);
  tip.addEventListener('pointerleave', function () {
    if (cur && document.activeElement !== cur) hideSoon();
  });

  document.addEventListener('focusin', function (event) {
    var ref = reference(event.target);
    if (ref && escapedRef !== ref) {
      grantFocusScrollGrace(ref);
      show(ref);
    }
  });

  document.addEventListener('focusout', function (event) {
    var ref = reference(event.target);
    if (!ref) return;
    if (focusScrollGraceRef === ref) {
      window.clearTimeout(focusScrollGraceTimer);
      focusScrollGraceRef = null;
      focusScrollGraceTimer = 0;
    }
    if (escapedRef === ref) escapedRef = null;
    if (ref === cur && !(event.relatedTarget && tip.contains(event.relatedTarget))) hideSoon();
  });

  document.addEventListener('click', function (event) {
    var ref = reference(event.target);
    if (ref) {
      var isLink = ref.tagName === 'A' && ref.hasAttribute('href');
      var isTouch = lastPointerRef === ref && lastPointerType === 'touch';

      if (isLink && !isModifiedClick(event)) {
        if (isTouch && (touchPrimedRef !== ref || cur !== ref)) {
          event.preventDefault();
          touchPrimedRef = ref;
          show(ref);
        } else if (isTouch) {
          touchPrimedRef = null;
        }
      } else if (!isLink) {
        event.preventDefault();
        if (isTouch && touchPrimedRef === ref && cur === ref) {
          hide();
        } else {
          if (isTouch) touchPrimedRef = ref;
          show(ref);
        }
      }
    } else if (!tip.contains(event.target)) {
      hide();
    }
    lastPointerType = '';
    lastPointerRef = null;
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && cur) {
      escapedRef = cur;
      hide();
    }
  });

  window.addEventListener('scroll', function (event) {
    if (event.target === tip || tip.contains(event.target) || !cur) return;
    var rect = cur.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      if (focusScrollGraceRef !== cur) hide();
    }
    else place(cur);
  }, true);

  window.addEventListener('resize', function () {
    if (cur) place(cur);
  });

  new MutationObserver(function () {
    if (cur) hide();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
})();
