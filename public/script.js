(function () {
  document.documentElement.classList.add('js');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Footer year
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  // Header: solid after hero
  var header = $('.site-header');
  var onScroll = function () { if (header.dataset.solid) return; header.classList.toggle('is-solid', window.scrollY > 60); };
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile nav
  var burger = $('#burger'), nav = $('#nav');
  var setNav = function (open) {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  burger.addEventListener('click', function () { setNav(!nav.classList.contains('open')); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });

  // Reveal on scroll
  var items = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else { items.forEach(function (el) { el.classList.add('in'); }); }

  // Gallery filter
  var tiles = $$('.tile');
  var lbEl = $('#lightbox');
  $$('.filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $$('.filter').forEach(function (b) { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('is-active'); btn.setAttribute('aria-selected', 'true');
      var f = btn.dataset.filter;
      tiles.forEach(function (t) { t.classList.toggle('is-hidden', f !== 'all' && t.dataset.cat !== f); });
    });
  });

  // Lightbox
  var lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap'), idx = 0, lastFocus = null;
  var visible = function () { return tiles.filter(function (t) { return !t.classList.contains('is-hidden'); }); };
  var show = function (i) {
    var v = visible(); if (!v.length) return;
    idx = (i + v.length) % v.length;
    var img = $('img', v[idx]);
    lbImg.src = img.src; lbImg.alt = img.alt;
    lbCap.textContent = $('figcaption', v[idx]).textContent;
  };
  var open = function (tile) {
    lastFocus = document.activeElement;
    var v = visible(); show(v.indexOf(tile));
    lb.hidden = false; document.body.style.overflow = 'hidden'; $('#lb-close').focus();
  };
  var close = function () {
    lb.hidden = true; document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  };
  tiles.forEach(function (t) { $('button', t).addEventListener('click', function () { open(t); }); });
  $('#lb-close').addEventListener('click', close);
  $('#lb-prev').addEventListener('click', function () { show(idx - 1); });
  $('#lb-next').addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  var sx = null;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (sx === null) return; var dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null;
  });

  // "See the work" links on the explore cards jump to the gallery with a filter applied
  $$('[data-jump]').forEach(function (a) {
    a.addEventListener('click', function () {
      var b = $('.filter[data-filter="' + a.dataset.jump + '"]'); if (b) b.click();
    });
  });

  // Inquiry forms: save to the site's backend; fall back to the visitor's email app if the server can't be reached.
  $$('form[data-inquiry]').forEach(function (form) {
    var status = $('.form-status', form), btn = $('button[type=submit]', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form), data = {};
      d.forEach(function (v, k) { data[k] = typeof v === 'string' ? v.trim() : v; });
      if (!data.topic && data.category === 'architecture') data.topic = 'Architecture: ' + (data.project_type || 'inquiry');
      if (!data.name || !/^\S+@\S+\.\S+$/.test(data.email || '')) { status.textContent = 'Please add your name and a valid email so Erik can write back.'; return; }
      btn.disabled = true; status.textContent = 'Sending…';
      fetch('/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) { status.textContent = res.j.error || 'Something went wrong. Please try again.'; btn.disabled = false; return; }
          var box = document.createElement('div'); box.className = 'thanks'; box.setAttribute('role', 'status');
          var h = document.createElement('h3'); h.textContent = 'Thank you, ' + data.name.split(' ')[0] + '.';
          var p = document.createElement('p'); p.textContent = "Your message is in. Erik will write back soon.";
          box.appendChild(h); box.appendChild(p); form.replaceWith(box);
        })
        .catch(function () {
          var body = 'Hi Erik,\n\n' + (data.message || '') + '\n\n' + data.name + '\n' + data.email + (data.topic ? '\nTopic: ' + data.topic : '');
          window.location.href = 'mailto:erikreynolds1275@gmail.com?subject=' + encodeURIComponent((data.topic || 'Hello') + ' (from ' + data.name + ')') + '&body=' + encodeURIComponent(body);
          status.textContent = 'We could not reach the server, so your email app is opening instead.'; btn.disabled = false;
        });
    });
  });
})();
