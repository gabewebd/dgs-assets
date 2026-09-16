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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─── GHL: fix the native "Back to Top" button ───
     GHL's own widget renders `.hl-blog-content-back-to-top-container
     > button.back-to-top` — a bare <button> with no href/onclick; its
     scroll behavior depends entirely on GHL's own Vue click binding.
     A previous fix here used a bubble-phase `document` listener, which
     only runs AFTER any handler GHL itself attached directly to the
     button. That explains the reported symptom (lands on a heading
     instead of page top, as if something else is driving the scroll):
     GHL's own handler runs first and, if it calls stopPropagation()
     (routine in framework-generated handlers), our bubble-phase
     listener never even fires — GHL's own behavior is the only thing
     that ran. Capture phase (the `true` 3rd arg) runs BEFORE that
     handler instead of after it, and stopPropagation() here then
     blocks GHL's handler from running at all, so ours is the only
     scroll that happens. Delegation (not a direct listener on the
     button) still means no MutationObserver is needed — Vue can
     re-render the button underneath this with no effect, since we
     never hold a reference to it, only check what was clicked. */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.hl-blog-content-back-to-top-container .back-to-top');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, true);

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

  /* ─── GHL: build the on-page nav from .dgs-blog-render's headings ───
     The static article template hand-authors .dgs-ga-toc with its links
     and heading ids per post. A GHL post's .dgs-blog-render body varies
     every time, so instead of hand-authoring that html, this reads
     whatever h2 headings actually exist and builds the same markup.
     Guarded to a GHL post specifically (.dgs-blog-render present) with
     no hand-authored sidebar already there, so the static template's
     own .dgs-ga-toc is never touched or duplicated.

     This used to run once, standalone, at script level — confirmed
     live that it never actually built anything on a real GHL post:
     .dgs-blog-render's own rich-text body (with its 6 real h2s) lands
     in the DOM on a separate, later timeline from the hero elements
     insertDek()/renameBackButton() react to, so by the time this ran,
     .dgs-blog-render either didn't exist yet or GHL was still filling
     it in. Now called from the same body-level MutationObserver as
     insertDek/renameBackButton, for the identical reason: it re-checks
     every time GHL touches the DOM instead of gambling on one exact
     moment, and its own guard (`!document.querySelector('.dgs-ga-toc')`)
     keeps it a no-op once the sidebar exists. */
  function buildToc() {
    var ghlRender = document.querySelector('.dgs-blog-render');
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
     this computes the offset in JS — 104px / 6.5rem matches the exact
     value already used for the same purpose sitewide (this file's own
     .dgs-ga-body h2/h3, plus dgs-legal.css/dgs-event-detail.css/
     dgs-playbook-detail.css). Capture phase + stopPropagation for the
     same reason as the Back to Top fix above: without it, Lenis's own
     anchor handling could act on the same click first and scroll to
     the raw (un-offset) position before this ever runs. */
  var TOC_SCROLL_OFFSET = 104;
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-ga-toc] a[href^="#"]');
    if (!link) return;
    var target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    var y = target.getBoundingClientRect().top + window.scrollY - TOC_SCROLL_OFFSET;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }, true);

  }); // whenReady
})();
