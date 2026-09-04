/* ============================================================
   LEGAL / POLICY PAGES — TABLE OF CONTENTS ACTIVE STATE
   Tracks which section heading is currently in view and marks
   the matching table-of-contents link with .is-active. Mirrors
   the Growth Hub article template's on-page nav behavior
   (js/dgs-growth-article.js), scoped to .dgs-legal-toc.
   ============================================================ */
(function () {
  'use strict';

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.dgs-legal-toc-list a[href^="#"]'));
  if (!tocLinks.length) return;

  var headings = tocLinks
    .map(function (link) {
      var id = link.getAttribute('href').slice(1);
      return document.getElementById(id);
    })
    .filter(Boolean);

  if (!headings.length) return;

  function setActive(id) {
    tocLinks.forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
    });
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        setActive(entry.target.id);
      });
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

    headings.forEach(function (h) { observer.observe(h); });
  }
})();
