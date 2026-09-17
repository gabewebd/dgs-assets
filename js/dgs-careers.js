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

  /* ─── GHL: build ONE hero-inner wrapper (title + description share it) ───
     GHL renders back-link, category, title (and, hidden, cover-image
     and date) as flat siblings directly under .blog-html-container-
     single — there is no native wrapper grouping them, which is
     exactly why earlier attempts to give title/description a shared
     "readable content width" kept drifting out of sync: each one was
     independently computing its own width/padding against the same
     ancestor, and any tiny mismatch between those independent
     calculations showed up as a broken/collapsed box (confirmed live
     across multiple postings and viewport widths).
     This creates ONE real wrapper (.dgs-car-hero-inner), MOVES the
     real back-link/category/title nodes into it (not clones — these
     are the actual native elements, so GHL's own attached behavior,
     e.g. the back-link's click binding, keeps working), and leaves
     .blog-cover-image-container and the date meta-section exactly
     where they are as hidden siblings of the wrapper — never part of
     the hero's content structure at all. insertDek() below then
     inserts the description as the LAST child of this same wrapper,
     so the CSS only ever needs to size ONE element
     (.dgs-car-hero-inner) for both title and description to share.
     Idempotent: no-ops the instant the wrapper already exists, so the
     shared MutationObserver can call this on every GHL hydration pass
     without re-wrapping or duplicating anything. */
  function buildHeroInner() {
    var hero = getHero();
    if (!hero) return null;
    var existing = hero.querySelector(':scope > .dgs-car-hero-inner');
    if (existing) return existing;
    var title = hero.querySelector(':scope > .blog-content-title');
    if (!title) return null;
    var backBtn = hero.querySelector(':scope > .blog-back-button');
    var category = hero.querySelector(':scope > .meta-section-1:has(.blog-category)');
    var inner = document.createElement('div');
    inner.className = 'dgs-car-hero-inner';
    hero.insertBefore(inner, title);
    if (backBtn) inner.appendChild(backBtn);
    if (category) inner.appendChild(category);
    inner.appendChild(title);
    return inner;
  }

  /* ─── GHL: hero description from the post's own meta description ───
     GHL has no native description/summary element on the single-post
     hero (confirmed against three separate live postings — only
     cover-image, title, category, date and body content exist).
     meta[name="description"] is real per-posting data GHL exposes,
     confirmed identical to that job's listing-card excerpt text, so
     this is the same underlying field, not invented copy. Appended as
     the last child of the SAME hero-inner wrapper title lives in (see
     buildHeroInner() above) — not an independent hero element with
     its own width/padding. The Work Setup/Work Shift-style metadata a
     job author writes in .dgs-career-meta stays in the article body
     where they put it; this file never relocates it into the hero. */
  function insertDek() {
    var inner = buildHeroInner();
    if (!inner) return;
    if (inner.querySelector(':scope > .dgs-car-dek')) return;
    var descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta || !descMeta.content) return;
    var dek = document.createElement('p');
    dek.className = 'dgs-car-dek';
    dek.textContent = descMeta.content;
    inner.appendChild(dek);
  }

  /* ─── GHL: relabel the native "Back to Blog" link ───
     Same TreeWalker approach as renameBackButton() in
     dgs-growth-article.js: the visible text is a text node nested
     inside <span>, not a direct child of the <a>, and GHL hardcodes
     both the text and aria-label. */
  function renameBackButton() {
    /* Not scoped to a DIRECT child anymore — buildHeroInner() moves
       this real node inside .dgs-car-hero-inner, so it's a grandchild
       of the hero once that wrapper exists. */
    var backBtn = document.querySelector('.blog-html-container-single .blog-back-button');
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
     content's first H2, falling back to window top when the posting
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

  /* ─── GHL: move "Back to Top" inside the article body ───
     GHL renders .hl-blog-content-back-to-top-container as a sibling
     of .blog-html (the white article body), directly under
     .blog-html-container-single — confirmed live. Visually that made
     it read as its own separate section below the white card instead
     of belonging to the article. This reparents the REAL existing
     node (never a clone/duplicate) to be the last child of .blog-html
     itself, so it sits inside the same white background as the rest
     of the article content, as its final element. Idempotent: no-ops
     once the node is already inside .blog-html, so the shared
     MutationObserver can call this on every GHL hydration pass
     without moving it back and forth. */
  function moveBackToTop() {
    var content = document.querySelector('.blog-html-container-single > .blog-html');
    var container = document.querySelector('.blog-html-container-single > .hl-blog-content-back-to-top-container');
    if (!content || !container) return;
    if (content.contains(container)) return;
    content.appendChild(container);
  }

  /* ─── On This Page (TOC): deliberately not built ───
     Career Detail pages never show a table of contents (explicit
     project decision, 2026-09-17) — removed outright rather than kept
     as unused dead code. Growth Hub's own .dgs-ga-toc equivalent in
     dgs-growth-article.js is untouched. */

  /* ============================================================
     LISTING PAGE (career-main-layout.html) — everything below
     no-ops harmlessly on the detail page, which has no
     .hl-blog-post-home at all.
     ============================================================ */

  /* ─── GHL: un-nest the "Grid" layout widget's cards ───
     GHL's Blog List widget renders TWO different DOM shapes depending
     on its own "Compact" vs "Grid" layout setting. Compact (confirmed
     live) repeats .blog-post-wrapper-compact as proper siblings under
     .flex.flex-wrap — that shape already works correctly with the
     CSS grid in dgs-careers.css. Grid mode (also confirmed live,
     2026-09-19 saved copy of the Careers page) instead renders each
     job's .blog-post-wrapper-list ONE CLOSING </div> SHORT of properly
     closing itself before the next job starts — so every job after
     the first ends up nested INSIDE the previous job's card instead
     of sitting beside it as a sibling. A CSS grid only ever lays out
     its own DIRECT children, so with every card after the first
     buried inside card #1, the grid has exactly one item to place:
     card #1 (narrow, in column 1) with every other job rendering in
     plain block flow underneath it and the other 1-2 grid columns
     sitting empty — the "3 items became 1 narrow column + a huge gap"
     symptom. No CSS selector can undo bad nesting, so this walks the
     real (already browser-corrected) DOM and promotes every
     .blog-post-wrapper-list to a direct child of .blog-post-wrapper,
     in document order, restoring a flat sibling list dgs-careers.css's
     grid can actually distribute into columns. Idempotent: no-ops the
     moment the structure is already flat, so the MutationObserver
     below can call this on every mutation (including its own) without
     looping. */
  function flattenGridCards() {
    var wrapper = document.querySelector('.hl-blog-post-home .blog-post-wrapper');
    if (!wrapper) return;
    var cards = Array.prototype.slice.call(wrapper.querySelectorAll('.blog-post-wrapper-list'));
    if (!cards.length) return;
    var alreadyFlat = cards.every(function (card) { return card.parentNode === wrapper; });
    if (alreadyFlat) return;
    cards.forEach(function (card) { wrapper.appendChild(card); });
  }

  function syncGhlCareer() {
    buildHeroInner();
    insertDek();
    renameBackButton();
    updateProgress();
    fixBackToTop();
    moveBackToTop();
    flattenGridCards();
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

  }); // whenReady
})();
