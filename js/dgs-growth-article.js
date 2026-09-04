/* ============================================================
   GROWTH HUB — ARTICLE TEMPLATE
   Vanilla JS: reading progress bar, sticky on-page nav active-state,
   mobile TOC collapse/expand, back-to-top button. No dependencies.
   ============================================================ */
(function () {
  'use strict';

  var body = document.querySelector('.dgs-ga-body');

  /* ─── Reading progress bar ─── */
  var progress = document.querySelector('[data-ga-progress]');
  function updateProgress() {
    if (!progress || !body) return;
    var rect = body.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var scrolled = -rect.top;
    var pct = total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;
    progress.style.width = (pct * 100) + '%';
  }

  /* ─── Back to top ─── */
  var topBtn = document.querySelector('[data-ga-top]');
  function updateTopBtn() {
    if (!topBtn) return;
    topBtn.classList.toggle('is-visible', window.scrollY > 900);
  }
  if (topBtn) {
    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateProgress();
      updateTopBtn();
      ticking = false;
    });
  }, { passive: true });

  updateProgress();
  updateTopBtn();

  /* ─── Mobile TOC collapse/expand ─── */
  var toc = document.querySelector('[data-ga-toc]');
  var tocToggle = document.querySelector('[data-ga-toc-toggle]');
  if (toc && tocToggle) {
    tocToggle.addEventListener('click', function () {
      var open = toc.getAttribute('data-open') === 'true';
      toc.setAttribute('data-open', open ? 'false' : 'true');
      tocToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  }

  /* ─── On-page nav active-state, tracks the heading currently in view ─── */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('[data-ga-toc] a[href^="#"]'));
  var headings = tocLinks
    .map(function (link) {
      var id = link.getAttribute('href').slice(1);
      return document.getElementById(id);
    })
    .filter(Boolean);

  if (headings.length && 'IntersectionObserver' in window) {
    var headingObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        tocLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

    headings.forEach(function (h) { headingObserver.observe(h); });
  }
})();
