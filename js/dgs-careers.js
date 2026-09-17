/* ============================================================
   DGS CAREERS — LISTING + DETAIL TEMPLATE
   Vanilla JS, no dependencies. Mirrors the proven technique set from
   js/dgs-growth-article.js (native-GHL-content lifecycle: idempotent
   re-assertion via a body-level MutationObserver, since GHL's Vue
   hydration can replace .blog-html-container-single wholesale — see
   that file's own header comments for the full rationale, not
   re-derived here). Kept in its own file per project convention:
   Careers is isolated from Growth Hub, so dgs-growth-article.js is
   never touched and this never runs anything on a Growth Hub page
   (every selector below is Careers-specific: .dgs-career-post,
   .dgs-car-*, or generic GHL blog-post classes scoped through them).
   Safe to load on BOTH career-main-layout.html (listing — most of
   this file simply no-ops there, nothing on that page matches
   .blog-html-container-single) and career-blog.html (detail).
   ============================================================ */
(function () {
  'use strict';

  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  whenReady(function () {

  /* ─── Shared helpers ─── */
  function getCareerPost() {
    return document.querySelector('.dgs-career-post');
  }

  function getHero() {
    return document.querySelector('.blog-html-container-single');
  }

  /* Lenis-aware smooth scroll, same reasoning as
     js/dgs-growth-article.js's scrollToTarget(): js/main.js drives
     Lenis with autoRaf:true, so a raw window.scrollTo() gets fought
     and pulled back by Lenis's own untouched internal scroll state
     one frame later. */
  function scrollToTarget(target, offsetPx) {
    if (window.dgsLenis && typeof window.dgsLenis.scrollTo === 'function') {
      window.dgsLenis.scrollTo(target, { offset: -(offsetPx || 0) });
      return;
    }
    var y = typeof target === 'number'
      ? target
      : target.getBoundingClientRect().top + window.scrollY - (offsetPx || 0);
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  var TOC_SCROLL_OFFSET = 104;

  /* ============================================================
     DETAIL PAGE (career-blog.html) — everything below no-ops
     harmlessly on the listing page, which has no
     .blog-html-container-single at all.
     ============================================================ */

  /* ─── Reading progress bar ─── */
  function ensureProgressBar() {
    if (document.querySelector('[data-car-progress]')) return;
    var bar = document.createElement('div');
    bar.className = 'dgs-car-progress';
    bar.setAttribute('data-car-progress', '');
    bar.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(bar, document.body.firstChild);
  }

  var progress = null;
  function updateProgress() {
    progress = progress || document.querySelector('[data-car-progress]');
    var articleEl = document.getElementById('blogPostContent');
    if (!progress || !articleEl) return;
    var rect = articleEl.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var scrolled = -rect.top;
    var pct = total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;
    progress.style.width = (pct * 100) + '%';
  }

  /* ─── GHL: hero meta line (Location · Employment Type) ───
     GHL has no native field for this (confirmed against the live
     posting: only category, title, date and body content exist).
     The job author instead includes it as real content at the top
     of their own posting, `.dgs-career-post > .dgs-career-meta`
     — same authoring convention already used for the lead paragraph
     and responsibilities. This relocates that real text into the
     hero as a new element (mirrors insertDek() in
     dgs-growth-article.js: creates a fresh node rather than moving
     the original, so GHL's Vue hydration re-diffing the body content
     never fights over ownership of a node it expects to still be
     there). The original stays in the DOM, visually hidden via CSS
     (dgs-careers-detail.css), so nothing is duplicated on screen. */
  function insertMetaLine() {
    var hero = getHero();
    var title = hero && hero.querySelector(':scope > .blog-content-title');
    var post = getCareerPost();
    var metaSrc = post && post.querySelector('.dgs-career-meta');
    if (!hero || !title || !metaSrc || !metaSrc.textContent.trim()) return;
    if (hero.querySelector(':scope > .dgs-car-meta-line')) return;
    var meta = document.createElement('div');
    meta.className = 'dgs-car-meta-line';
    /* Confirmed live (Account Manager posting, 2026-09-18):
       .dgs-career-meta is authored as several <span> lines (e.g.
       "Work Set up: ..." / "Work Shift: ..."), not one string —
       .textContent would concatenate them with no separator at all.
       Cloning the real child nodes preserves each fact as its own
       line; a plain-text posting (no <span> children) still works
       since cloning a single text node behaves the same as copying
       its text. */
    Array.prototype.forEach.call(metaSrc.childNodes, function (node) {
      meta.appendChild(node.cloneNode(true));
    });
    hero.insertBefore(meta, title.nextSibling);
  }

  /* ─── GHL: hero description from the post's own meta description ───
     Same proven technique as insertDek() in dgs-growth-article.js —
     real per-post SEO data, not invented copy. */
  function insertDek() {
    var hero = getHero();
    var title = hero && hero.querySelector(':scope > .blog-content-title');
    var descMeta = document.querySelector('meta[name="description"]');
    if (!hero || !title || !descMeta || !descMeta.content) return;
    if (hero.querySelector(':scope > .dgs-car-dek')) return;
    var dek = document.createElement('p');
    dek.className = 'dgs-car-dek';
    dek.textContent = descMeta.content;
    var metaLine = hero.querySelector(':scope > .dgs-car-meta-line');
    hero.insertBefore(dek, (metaLine || title).nextSibling);
  }

  /* ─── GHL: relabel the native "Back to Blog" link ───
     Same TreeWalker approach as renameBackButton() in
     dgs-growth-article.js: the visible text is a text node nested
     inside <span>, not a direct child of the <a>, and GHL hardcodes
     both the text and aria-label. */
  function renameBackButton() {
    var backBtn = document.querySelector('.blog-html-container-single > .blog-back-button');
    if (!backBtn) return;
    if (backBtn.getAttribute('aria-label') !== 'Back to Careers') {
      backBtn.setAttribute('aria-label', 'Back to Careers');
    }
    var walker = document.createTreeWalker(backBtn, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (/back to blog/i.test(node.textContent)) {
        node.textContent = node.textContent.replace(/back to blog/i, 'Back to Careers');
      }
    }
  }

  /* ─── GHL: fix the native "Back to Top" button ───
     Same clone-to-strip-GHL's-own-handler fix as fixBackToTop() in
     dgs-growth-article.js — a capture-phase document listener alone
     was proven insufficient there (GHL's Vue @click binding is
     attached directly to the button node), so this removes it
     outright by replacing the node with a clone. Lands on the job
     content's first H2 (matching whatever the on-page TOC's first
     entry points to), falling back to window top when the posting
     has no headings. */
  function fixBackToTop() {
    var btn = document.querySelector('.hl-blog-content-back-to-top-container .back-to-top');
    if (!btn || btn.getAttribute('data-car-fixed')) return;
    var clean = btn.cloneNode(true);
    clean.setAttribute('data-car-fixed', '1');
    btn.parentNode.replaceChild(clean, btn);
    clean.addEventListener('click', function (e) {
      e.preventDefault();
      var post = getCareerPost();
      var firstHeading = post && post.querySelector('h2');
      if (firstHeading) {
        scrollToTarget(firstHeading, TOC_SCROLL_OFFSET);
      } else {
        scrollToTarget(0, 0);
      }
    });
  }

  /* ─── On This Page (TOC) ───
     Built only when the posting actually has 2+ H2 sections — a
     single-section job posting doesn't justify a sidebar nav (see
     project brief: "if the structure doesn't have enough content,
     don't force a TOC"). */
  function buildToc() {
    var post = getCareerPost();
    if (!post || document.querySelector('.dgs-car-toc')) return;
    var headings = Array.prototype.slice.call(post.querySelectorAll('h2'));
    if (headings.length < 2) return;

    var slugify = function (text) {
      return text.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-') || 'section';
    };
    var usedIds = {};
    var listItems = headings.map(function (h) {
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

    var toc = document.createElement('aside');
    toc.className = 'dgs-car-toc';
    toc.setAttribute('data-car-toc', '');
    toc.innerHTML = '<span class="dgs-car-toc-label">On This Page</span>';
    var list = document.createElement('ul');
    list.className = 'dgs-car-toc-list';
    listItems.forEach(function (li) { list.appendChild(li); });
    toc.appendChild(list);

    post.parentNode.insertBefore(toc, post);
  }

  function wireToc() {
    var toc = document.querySelector('[data-car-toc]');
    if (!toc || toc.getAttribute('data-wired')) return;
    toc.setAttribute('data-wired', '1');

    var tocLinks = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var headings = tocLinks
      .map(function (link) { return document.getElementById(link.getAttribute('href').slice(1)); })
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
  }

  function syncGhlCareer() {
    insertMetaLine();
    insertDek();
    renameBackButton();
    updateProgress();
    buildToc();
    wireToc();
    fixBackToTop();
  }

  ensureProgressBar();

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateProgress();
      ticking = false;
    });
  }, { passive: true });

  updateProgress();
  window.addEventListener('load', updateProgress);

  /* Always run once AND always observe — not gated behind an initial
     .blog-html-container-single presence check, which would race
     GHL's own render (same reasoning as dgs-growth-article.js).
     Every function above already no-ops safely when its target
     doesn't exist yet, so this is also a safe no-op on the listing
     page for the life of that page. */
  syncGhlCareer();
  new MutationObserver(syncGhlCareer).observe(document.body, { childList: true, subtree: true });

  /* ─── TOC link clicks: smooth-scroll accounting for the fixed navbar ─── */
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-car-toc] a[href^="#"]');
    if (!link) return;
    var target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    scrollToTarget(target, TOC_SCROLL_OFFSET);
  }, true);

  }); // whenReady
})();
