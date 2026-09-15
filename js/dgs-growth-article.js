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

  /* ─── GHL: hero description from the post's own meta description ───
     .dgs-ga-hero shows a dek/description paragraph under the date;
     GHL's native Blog Content widget doesn't render one. Reuses the
     post's own <meta name="description"> — the same text the static
     template's own dek is hand-typed from (verified identical on
     founder-dependency-test.html), so this is real per-post data, not
     invented copy. Guarded the same way as the TOC below: only on a
     GHL post, only once.

     GHL's blog widget is a Nuxt/Vue component that can still be mid-
     hydration (or re-render for an unrelated reason, e.g. lazy-loaded
     image swap) after this script's first pass — Vue doesn't know
     about a node we inserted outside its own virtual DOM, so a later
     re-render of .blog-html-container-single's children silently drops
     it (confirmed live: the dek would flash in, then vanish once the
     page finished rendering). insertDek() is idempotent (no-ops once
     the dek already exists), so a MutationObserver just re-runs it
     every time that container's children change, for the life of the
     page, instead of a single fire-and-forget insert. */
  function insertDek() {
    var ghlHero = document.querySelector('.blog-html-container-single');
    var ghlTitle = ghlHero && ghlHero.querySelector(':scope > .blog-content-title');
    var descMeta = document.querySelector('meta[name="description"]');
    if (ghlHero && ghlTitle && descMeta && descMeta.content && !ghlHero.querySelector(':scope > .dgs-ga-dek')) {
      var dek = document.createElement('p');
      dek.className = 'dgs-ga-dek';
      dek.textContent = descMeta.content;
      ghlHero.insertBefore(dek, ghlTitle.nextSibling);
    }
  }
  var ghlHeroEl = document.querySelector('.blog-html-container-single');
  if (ghlHeroEl) {
    insertDek();
    new MutationObserver(insertDek).observe(ghlHeroEl, { childList: true });
  }

  /* ─── GHL: build the on-page nav from .dgs-blog-render's headings ───
     The static article template hand-authors .dgs-ga-toc with its links
     and heading ids per post. A GHL post's .dgs-blog-render body varies
     every time, so instead of hand-authoring that html, this reads
     whatever h2 headings actually exist and builds the same markup.
     Guarded to a GHL post specifically (.dgs-blog-render present) with
     no hand-authored sidebar already there, so the static template's
     own .dgs-ga-toc is never touched or duplicated. */
  var ghlRender = document.querySelector('.dgs-blog-render');
  if (ghlRender && !document.querySelector('.dgs-ga-toc')) {
    var ghlHeadings = Array.prototype.slice.call(ghlRender.querySelectorAll('h2'));
    if (ghlHeadings.length) {
      var slugify = function (text) {
        return text.toLowerCase().trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-') || 'section';
      };
      var usedIds = {};
      var listItems = ghlHeadings.map(function (h) {
        var base = h.id || slugify(h.textContent);
        var id = base;
        var n = 2;
        while (usedIds[id]) { id = base + '-' + (n++); }
        usedIds[id] = true;
        h.id = id;

        var a = document.createElement('a');
        a.href = '#' + id;
        a.textContent = h.textContent;
        var li = document.createElement('li');
        li.appendChild(a);
        return li;
      });

      var ghlAside = document.createElement('aside');
      ghlAside.className = 'dgs-ga-toc';
      ghlAside.setAttribute('data-ga-toc', '');
      ghlAside.setAttribute('data-open', 'false');
      ghlAside.innerHTML =
        '<button class="dgs-ga-toc-toggle" data-ga-toc-toggle aria-expanded="false">On This Page' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>' +
        '<span class="dgs-ga-toc-label">On This Page</span>';
      var ghlList = document.createElement('ul');
      ghlList.className = 'dgs-ga-toc-list';
      listItems.forEach(function (li) { ghlList.appendChild(li); });
      ghlAside.appendChild(ghlList);

      ghlRender.parentNode.insertBefore(ghlAside, ghlRender);
    }
  }

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
