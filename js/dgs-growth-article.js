/* ============================================================
   GROWTH HUB — ARTICLE TEMPLATE
   Vanilla JS: reading progress bar, sticky on-page nav active-state,
   mobile TOC collapse/expand, back-to-top button. No dependencies.
   ============================================================ */
(function () {
  'use strict';

  /* Guards every selector/DOM-creation below against running before
     <body> is parsed at all — this script's own placement in the page
     is GHL page-builder content outside this repo, not something this
     file controls, so it can't assume it always loads at the end of
     body the way the static template's own copy does. Checking
     readyState (not a bare `addEventListener('DOMContentLoaded', ...)`)
     matters here specifically: if this script is injected/loads AFTER
     DOMContentLoaded has already fired (the common case, since it's
     usually placed late in body), a bare listener would never fire at
     all and silently disable everything in this file. */
  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  whenReady(function () {

  /* ─── Reading progress bar ───
     Measures the article/content element, NOT the static template's
     own `.dgs-ga-body` specifically: that class doesn't exist at all
     on a native GHL post, so this always re-queries both possible
     targets fresh on every call rather than caching one reference at
     script-load time. Two reasons this has to stay a live query
     instead of a cached `var`:
     1. On a GHL post, `.dgs-ga-body` never exists — `#blogPostContent`
        (a fixed GHL id, not a per-widget random hash, so this is
        safe/stable) is the equivalent "just the written content, not
        hero/TOC/related/CTA" element there.
     2. GHL's Vue hydration can replace .blog-html-container-single
        (and everything inside it, #blogPostContent included) wholesale
        — documented in insertDek() below. A cached reference to the
        old node would go stale/detached, and a detached element's
        getBoundingClientRect() is always all-zero, which would look
        exactly like "the bar stopped updating" with no error thrown. */
  function getArticleEl() {
    return document.querySelector('.dgs-ga-body') || document.getElementById('blogPostContent');
  }

  /* ─── The real per-post content wrapper, across every Growth Hub pillar ───
     Every native GHL post's rich body is authored as a "Custom Code"
     element in the blog editor, and whoever wrote that post's HTML wraps
     it in one class of their own choosing — confirmed live to differ by
     pillar, not a single fixed name: Learn posts (regular articles) use
     `.dgs-blog-render`, Implement posts (playbooks/checklists) use
     `.dgs-checklist-template-page`, Connect posts (events) use
     `.dgs-event-template-page`. buildToc() and the Back to Top fix below
     both need "whichever of these actually exists on this post" — a
     single query for one specific class (the original bug: TOC/Back to
     Top silently did nothing on playbooks and events, since neither
     wrapper is named `.dgs-blog-render`). Listed explicitly rather than
     matched by a generic heuristic (e.g. "the code-embed-container's
     first non-style child") to stay consistent with this file's existing
     pattern of targeting known, stable hooks — add a new class here if a
     future pillar introduces one. */
  function getGhlRender() {
    return document.querySelector('.dgs-blog-render, .dgs-checklist-template-page, .dgs-event-template-page');
  }

  /* ─── Smooth-scroll helper, routed through Lenis when it's active ───
     js/main.js initializes Lenis sitewide with `autoRaf: true` and
     exposes the instance as `window.dgsLenis`. Confirmed live (the
     actual bug behind Back to Top and TOC links landing on the wrong
     heading — not a wrong offset calculation): autoRaf means Lenis runs
     its own continuous requestAnimationFrame loop that keeps driving the
     native scroll position from Lenis's OWN internal virtual scroll
     state. Calling `window.scrollTo()` directly doesn't inform that
     state — it fights it instead, so the page starts moving toward the
     right target and then gets pulled back toward wherever Lenis's
     untouched internal position still says it should be, one frame
     later. Every programmatic scroll in this file has to go through
     Lenis's own `scrollTo(target, { offset })` API instead once Lenis
     exists, which updates that internal state directly so there's
     nothing left to fight. `target` is a number (absolute scroll Y) or
     an element; `offsetPx` (positive = clearance) shifts the landing
     point up by that many px, e.g. to clear the fixed navbar — Lenis's
     own `offset` option is ADDED to the target position, so this negates
     it to match. Falls back to native `window.scrollTo` only when Lenis
     truly isn't on the page (e.g. prefers-reduced-motion, which
     js/main.js's initSmoothScroll() never initializes Lenis for at
     all). */
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

  /* The bar's own markup, `<div class="dgs-ga-progress" data-ga-progress
     aria-hidden="true"></div>`, is hand-authored directly in the static
     template's HTML — but a native GHL post's page (built entirely in
     GHL's page builder, outside this repo) never had it pasted in at
     all, on any post checked live. Same situation as the dek paragraph
     and the TOC sidebar below: a decorative piece GHL doesn't render
     natively, so this creates it once (idempotent, guarded by the same
     query used everywhere else here) rather than requiring a manual
     per-post GHL edit. Inserted as body's first child so it sits above
     everything, matching the static template's own placement. */
  function ensureProgressBar() {
    if (document.querySelector('[data-ga-progress]')) return;
    var bar = document.createElement('div');
    bar.className = 'dgs-ga-progress';
    bar.setAttribute('data-ga-progress', '');
    bar.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(bar, document.body.firstChild);
  }
  ensureProgressBar();

  var progress = document.querySelector('[data-ga-progress]');
  function updateProgress() {
    progress = progress || document.querySelector('[data-ga-progress]');
    var articleEl = getArticleEl();
    if (!progress || !articleEl) return;
    var rect = articleEl.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var scrolled = -rect.top;
    var pct = total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;
    progress.style.width = (pct * 100) + '%';
  }

  /* ─── Back to top (our own floating button, [data-ga-top]) ─── */
  var topBtn = document.querySelector('[data-ga-top]');
  function updateTopBtn() {
    if (!topBtn) return;
    topBtn.classList.toggle('is-visible', window.scrollY > 900);
  }
  if (topBtn) {
    topBtn.addEventListener('click', function () {
      scrollToTarget(0, 0);
    });
  }

  /* Shared with the TOC link-click handler further down — declared here
     (not just there) so both can reference the same constant; `var`
     hoists the declaration but not the assignment, and this one runs
     first in source order, so it's already assigned by the time either
     click handler actually fires (both only run later, on a real
     click). 104px / 6.5rem matches the offset already used sitewide for
     the fixed header (.dgs-ga-body h2/h3 scroll-margin-top, plus
     dgs-legal.css/dgs-event-detail.css/dgs-playbook-detail.css). */
  var TOC_SCROLL_OFFSET = 104;

  /* ─── GHL: fix the native "Back to Top" button ───
     GHL's own widget renders `.hl-blog-content-back-to-top-container
     > button.back-to-top` — a bare <button> with no href/onclick; its
     scroll behavior depends entirely on GHL's own Vue click binding,
     which is attached DIRECTLY to that button element (standard Vue
     `@click="handler"` compiles to `element.addEventListener('click',
     handler)` on the actual rendered node — not a document-level
     delegate), so GHL's handler always runs for a click on that node
     regardless of what else is listening elsewhere.

     A capture-phase `document` listener (tried first) should in theory
     still run before that — capturing always finishes before a
     listener on the target itself fires, per spec, regardless of
     registration order — but user testing after that version still
     showed the OLD symptom (lands on whatever heading is nearest the
     current scroll position, not the first one), meaning GHL's handler
     was still the one actually driving the scroll. Rather than keep
     guessing at event-phase timing, this instead REMOVES GHL's handler
     outright: cloning the button (`cloneNode`) copies its markup but
     not any JS listeners attached to the original node, so the clone
     is a clean element with zero click behavior of its own.
     Swapping it in and attaching only our own listener means there is
     no longer a second handler to race against — deterministic
     regardless of registration order or how many listeners GHL had
     attached. `data-ga-fixed` guards this idempotent (skips an
     already-cloned button) the same way every other GHL-sync function
     here guards against the shared MutationObserver re-running it, and
     lets this correctly re-fix a wholesale replacement button if GHL's
     Vue hydration ever swaps the subtree back in (same documented
     behavior as insertDek() above).

     Destination is the article's FIRST heading, not window top (user
     feedback: this button lives at the bottom of the article, and the
     desired behavior is "back to the top of the article", not all the
     way past the hero) — same element buildToc() below reads, so this
     always agrees with whatever the on-page nav's first entry points
     to. Falls back to window top only if the post has no headings at
     all for buildToc() to have found either. */
  function fixBackToTop() {
    var btn = document.querySelector('.hl-blog-content-back-to-top-container .back-to-top');
    if (!btn || btn.getAttribute('data-ga-fixed')) return;
    var clean = btn.cloneNode(true);
    clean.setAttribute('data-ga-fixed', '1');
    btn.parentNode.replaceChild(clean, btn);
    clean.addEventListener('click', function (e) {
      e.preventDefault();
      var articleEl = getGhlRender() || getArticleEl();
      /* h2 only, matching exactly what buildToc() below reads to build
         the "On This Page" nav — so this always lands on the same
         section its own first entry points to, not some other heading
         level it never listed. */
      var firstHeading = articleEl && articleEl.querySelector('h2');
      if (firstHeading) {
        scrollToTarget(firstHeading, TOC_SCROLL_OFFSET);
      } else {
        scrollToTarget(0, 0);
      }
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
  /* Content height can change after this point (GHL hydration,
     images finishing loading), independent of any scroll event —
     recalculate once more when the page is fully loaded so the bar
     reflects final content height even if the user hasn't scrolled
     since. */
  window.addEventListener('load', updateProgress);

  /* ─── GHL: hero description from the post's own meta description ───
     .dgs-ga-hero shows a dek/description paragraph under the date;
     GHL's native Blog Content widget doesn't render one. Reuses the
     post's own <meta name="description"> — the same text the static
     template's own dek is hand-typed from (verified identical on
     founder-dependency-test.html), so this is real per-post data, not
     invented copy. Guarded the same way as the TOC below: only on a
     GHL post, only once.

     GHL's blog widget is a Nuxt/Vue component that server-renders the
     post markup, then hydrates client-side. Because insertDek() adds a
     real DOM node inside .blog-html-container-single BEFORE that
     hydration pass runs, Vue's hydration walk finds a child-list
     mismatch it can't reconcile in place, and Vue 3's documented
     recovery is to discard and fully REPLACE that DOM subtree with
     freshly client-rendered nodes rather than patch it — this can
     replace .blog-html-container-single itself, not just its children
     (confirmed live: the dek would flash in, then vanish for good once
     the page finished rendering — a one-time event, not a flicker).
     A MutationObserver watching only .blog-html-container-single's own
     childList is blind to that: if the container node itself gets
     swapped out, the observer keeps watching the old, now-detached
     node and never fires again. So instead this observes document.body
     (guaranteed to survive any such replacement) with subtree:true,
     and insertDek() re-queries the live DOM fresh every time — it's
     idempotent (no-ops once the dek already exists), so it just keeps
     re-asserting the dek for the life of the page no matter how many
     times GHL rebuilds the subtree underneath it. */
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
  /* ─── GHL: relabel the native "Back to Blog" link ───
     GHL's blog widget hardcodes this link's visible text and
     aria-label; our HTML/CSS never touches it, so it can only be
     changed from here. The real markup is
     `<a class="blog-back-button"><i class="blog-left-arrow"></i>
     <span>Back to Blog</span></a>` — the text is NOT a direct text-node
     child of the <a> (a childNodes-only scan tried that previously and
     silently matched nothing, since <i> and <span> are both element
     nodes), it's one level deeper inside the <span>. A TreeWalker
     visits every descendant text node regardless of nesting, so this
     keeps working even if GHL changes the wrapper markup again. Only
     rewrites nodes that still say "Back to Blog" so re-runs are
     no-ops. Reuses insertDek's own MutationObserver/re-query strategy
     for the same reason: GHL's Vue hydration can replace this subtree
     wholesale. */
  function renameBackButton() {
    var backBtn = document.querySelector('.blog-html-container-single > .blog-back-button');
    if (!backBtn) return;
    if (backBtn.getAttribute('aria-label') !== 'Back to Growth Hub') {
      backBtn.setAttribute('aria-label', 'Back to Growth Hub');
    }
    var walker = document.createTreeWalker(backBtn, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (/back to blog/i.test(node.textContent)) {
        node.textContent = node.textContent.replace(/back to blog/i, 'Back to Growth Hub');
      }
    }
  }

  /* ─── GHL: build the on-page nav from the post body's headings ───
     The static article template hand-authors .dgs-ga-toc with its links
     and heading ids per post. A GHL post's real content wrapper (see
     getGhlRender() above) varies every time, so instead of hand-authoring
     that html, this reads whatever h2 headings actually exist inside it
     and builds the same markup. Guarded to a GHL post specifically
     (getGhlRender() found something) with no hand-authored sidebar
     already there, so the static template's own .dgs-ga-toc is never
     touched or duplicated.

     This used to run once, standalone, at script level — confirmed
     live that it never actually built anything on a real GHL post: the
     post's own rich-text body (with its real h2s) lands in the DOM on a
     separate, later timeline from the hero elements
     insertDek()/renameBackButton() react to, so by the time this ran,
     the content wrapper either didn't exist yet or GHL was still filling
     it in. Now called from the same body-level MutationObserver as
     insertDek/renameBackButton, for the identical reason: it re-checks
     every time GHL touches the DOM instead of gambling on one exact
     moment, and its own guard (`!document.querySelector('.dgs-ga-toc')`)
     keeps it a no-op once the sidebar exists. */
  function buildToc() {
    var ghlRender = getGhlRender();
    if (!ghlRender || document.querySelector('.dgs-ga-toc')) return;
    var ghlHeadings = Array.prototype.slice.call(ghlRender.querySelectorAll('h2'));
    if (!ghlHeadings.length) return;

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

  /* ─── Wire up the TOC once it exists: mobile toggle + active-section
     tracking ───
     Same "used to run once at script level" bug as buildToc() above —
     if `[data-ga-toc]` didn't exist at that one moment, this silently
     never wired anything, forever, even after buildToc() (or the
     static template's own hand-authored markup) added it. Guarded by
     a `data-wired` flag on the toc element itself so calling this
     repeatedly from the shared observer doesn't attach duplicate
     listeners or create a second IntersectionObserver. */
  function wireToc() {
    var toc = document.querySelector('[data-ga-toc]');
    if (!toc || toc.getAttribute('data-wired')) return;
    toc.setAttribute('data-wired', '1');

    var tocToggle = toc.querySelector('[data-ga-toc-toggle]');
    if (tocToggle) {
      tocToggle.addEventListener('click', function () {
        var open = toc.getAttribute('data-open') === 'true';
        toc.setAttribute('data-open', open ? 'false' : 'true');
        tocToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      });
    }

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

  function syncGhlHero() {
    insertDek();
    renameBackButton();
    updateProgress();
    buildToc();
    wireToc();
    fixBackToTop();
  }
  /* Always run once AND always observe — not gated behind an initial
     `.blog-html-container-single` presence check. That check would
     race GHL's own render: if this script executes before GHL has
     inserted anything yet, the gate would skip creating the observer
     entirely, and nothing here would ever run again even once GHL
     does render (this is the most likely reason the previous
     "Back to Growth Hub" attempt never took effect on some loads).
     Every function called above already no-ops safely when its own
     target doesn't exist yet. */
  syncGhlHero();
  new MutationObserver(syncGhlHero).observe(document.body, { childList: true, subtree: true });

  /* ─── TOC link clicks: smooth-scroll accounting for the fixed navbar ───
     A native anchor jump (or Lenis's own `anchors: true` handling,
     since this site runs Lenis sitewide) would land a heading flush
     against the viewport top, underneath the fixed .dgs-header, UNLESS
     the target has `scroll-margin-top` set. The static template's own
     headings get that via `.dgs-ga-body h2/h3` in dgs-growth-article.css
     — but a GHL post's `.dgs-blog-render` headings are styled by a
     <style> block pasted per-post directly in GHL's editor (confirmed
     on the live page), outside this repo, with no such offset. Rather
     than depend on every post's own pasted CSS getting this right,
     this computes the offset in JS, reusing the same TOC_SCROLL_OFFSET
     the Back to Top fix above declares. Capture phase + stopPropagation
     stops Lenis's own `anchors: true` handling from also acting on the
     same click and scrolling to the raw (un-offset) position; routing
     the actual scroll through scrollToTarget() (Lenis-aware, see above)
     stops Lenis's autoRaf loop from fighting a raw window.scrollTo() and
     pulling the page back toward the wrong position afterward — the
     same bug that was behind Back to Top landing on the wrong
     heading. */
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-ga-toc] a[href^="#"]');
    if (!link) return;
    var target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    scrollToTarget(target, TOC_SCROLL_OFFSET);
  }, true);

  }); // whenReady
})();
