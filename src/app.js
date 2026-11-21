/* Jack Higher — interactions. No dependencies, ~4KB gzipped. */
(function () {
  'use strict';
  var d = document, h = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- age gate ---------- */
  var gate = $('.gate');
  function start() {
    h.classList.remove('gate-on', 'is-leaving');
    h.classList.add('is-ready');
  }
  if (h.classList.contains('gate-on')) {
    var yes = $('[data-gate="yes"]');
    setTimeout(function () { yes && yes.focus(); }, 400);
    yes.addEventListener('click', function () {
      try { localStorage.setItem('jh-age', '1'); } catch (e) {}
      if (reduce) return start();
      h.classList.add('is-leaving');
      setTimeout(start, 380);
    });
    $('[data-gate="no"]').addEventListener('click', function () {
      var m = $('[data-gate-msg]'); m.hidden = false;
    });
    gate.addEventListener('keydown', function (e) { /* keep focus inside the dialog */
      if (e.key !== 'Tab') return;
      var f = $$('button:not([hidden])', gate), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- Bangkok clock → live open / closed ---------- */
  function bkkNow() {
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
      return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), mins: (+o.hour % 24) * 60 + (+o.minute) };
    } catch (e) { var n = new Date(); return { day: n.getDay(), mins: n.getHours() * 60 + n.getMinutes() }; }
  }
  var OPEN = 8 * 60, CLOSE = 24 * 60;
  var DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function shopState(days, t) {
    var openToday = days.indexOf(t.day) > -1;
    if (openToday && t.mins >= OPEN && t.mins < CLOSE) {
      var left = CLOSE - t.mins;
      return { open: true, text: left <= 60 ? 'Open now · closing soon (midnight)' : 'Open now · until midnight' };
    }
    if (openToday && t.mins < OPEN) return { open: false, text: 'Closed · opens today at 8AM' };
    for (var i = 1; i <= 7; i++) {
      var nd = (t.day + i) % 7;
      if (days.indexOf(nd) > -1) return { open: false, text: 'Closed · opens ' + (i === 1 ? 'tomorrow' : DAY[nd]) + ' at 8AM' };
    }
    return { open: false, text: 'Closed' };
  }
  function paintHours() {
    var t = bkkNow(), anyOpen = false;
    $$('[data-shop]').forEach(function (shop) {
      var days = shop.getAttribute('data-open-days').split(',').map(Number);
      var s = shopState(days, t);
      anyOpen = anyOpen || s.open;
      var st = $('[data-status]', shop);
      st.classList.toggle('is-open', s.open);
      st.classList.toggle('is-closed', !s.open);
      $('.dot', st).classList.toggle('is-open', s.open);
      $('[data-status-text]', st).textContent = s.text;
      $$('[data-hours] li', shop).forEach(function (li) {
        li.classList.toggle('is-today', +li.getAttribute('data-day') === t.day);
      });
    });
    var dot = $('[data-open-dot]'), any = $('[data-open-any]');
    if (dot && any) {
      dot.classList.toggle('is-open', anyOpen);
      any.textContent = anyOpen
        ? 'Open right now — and between our two shops, every day 8AM – midnight.'
        : 'Closed for the night — back at 8AM. You can still message us on LINE.';
    }
  }
  paintHours();
  setInterval(paintHours, 60000);

  /* ---------- header + dock ---------- */
  var top = $('[data-top]'), dock = $('[data-dock]'), hero = $('.hero'), cta = $('[data-cta]');
  var heroOut = false, ctaIn = false;
  function syncDock() { dock && dock.classList.toggle('is-on', heroOut && !ctaIn); }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { top.classList.toggle('is-stuck', window.scrollY > 10); ticking = false; });
  }, { passive: true });
  top.classList.toggle('is-stuck', window.scrollY > 10);

  if (hasIO) {
    new IntersectionObserver(function (e) {
      heroOut = !e[0].isIntersecting; hero.classList.toggle('is-off', heroOut); syncDock();
    }, { rootMargin: '-35% 0px 0px 0px' }).observe(hero);
    new IntersectionObserver(function (e) { ctaIn = e[0].isIntersecting; syncDock(); }, { threshold: 0.15 }).observe(cta);

    /* active nav link */
    var links = $$('.nav a');
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['order', 'shops', 'reviews'].forEach(function (id) { var el = d.getElementById(id); el && spy.observe(el); });
  }

  /* ---------- scroll reveals ---------- */
  var revealables = $$('[data-reveal], .rv, [data-cta]');
  if (!hasIO || reduce) {
    revealables.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.classList.contains('rv')) { /* stagger cards that enter together */
          var idx = Array.prototype.indexOf.call(el.parentNode.children, el) % 3;
          el.style.transitionDelay = (idx * 0.07) + 's';
        }
        el.classList.add('in');
        if (el.hasAttribute('data-map')) startWalker();
        $$('[data-count]', el).forEach(countUp);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ---------- count-up numbers ---------- */
  function countUp(el) {
    if (reduce || el.dataset.done) return;
    el.dataset.done = 1;
    var end = parseFloat(el.getAttribute('data-count')), dec = +(el.getAttribute('data-decimals') || 0);
    var t0 = performance.now(), dur = 1400;
    (function tick(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = (end * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- map walker (SMIL animateMotion) ---------- */
  function startWalker() {
    var w = d.getElementById('walk');
    if (!reduce && w && w.beginElement) setTimeout(function () { try { w.beginElement(); } catch (e) {} }, 1300);
  }

  /* ---------- reviews: filter + show more ---------- */
  var wall = $('[data-wall]'), more = $('[data-more]'), chips = $$('[data-filter]').filter(function (c) { return c.tagName === 'BUTTON'; });
  var PAGE = window.matchMedia('(min-width: 1040px)').matches ? 9 : 6, shown = PAGE, filter = 'all';
  function paintWall() {
    var n = 0, total = 0;
    $$('.rv', wall).forEach(function (rv) {
      var match = filter === 'all' || rv.getAttribute('data-store') === filter;
      if (match) total++;
      var vis = match && n < shown;
      if (vis) n++;
      rv.classList.toggle('is-hidden', !vis);
      if (vis && !rv.classList.contains('in') && (!hasIO || reduce)) rv.classList.add('in');
    });
    more.hidden = n >= total;
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      filter = c.getAttribute('data-filter'); shown = PAGE;
      chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
      paintWall();
      $$('.rv:not(.is-hidden)', wall).forEach(function (rv, i) { /* re-play the pin-up */
        rv.classList.remove('in'); rv.style.transitionDelay = (i % 6) * 0.05 + 's';
        requestAnimationFrame(function () { requestAnimationFrame(function () { rv.classList.add('in'); }); });
      });
    });
  });
  more.addEventListener('click', function () {
    var before = $$('.rv:not(.is-hidden)', wall).length;
    shown += PAGE; paintWall();
    var newly = $$('.rv:not(.is-hidden)', wall).slice(before);
    newly.forEach(function (rv, i) {
      rv.style.transitionDelay = (i % 6) * 0.05 + 's';
      if (hasIO && !reduce) io.observe(rv); else rv.classList.add('in');
    });
    if (newly[0]) { var a = $('.rv__link', newly[0]); a && a.focus({ preventScroll: true }); }
  });
  paintWall();

  /* ---------- tiny tilt on fine pointers ---------- */
  if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.qr, .shop').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateX(' + (-y * 3) + 'deg) rotateY(' + (x * 4) + 'deg)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- LINE click analytics hook ---------- */
  /* Fires a "line_click" event to whichever analytics is present (GA4 / Plausible / Netlify). */
  $$('[data-line]').forEach(function (a) {
    a.addEventListener('click', function () {
      var where = a.getAttribute('data-line');
      try {
        if (window.gtag) window.gtag('event', 'line_click', { placement: where });
        if (window.plausible) window.plausible('LINE click', { props: { placement: where } });
      } catch (e) {}
    });
  });

  var y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
