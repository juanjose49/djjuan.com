function track(eventName, params = {}) {
  try {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    } else if (window.dataLayer) {
      window.dataLayer.push({ event: eventName, ...params });
    }
  } catch (_) {}
}

function bindTrackedLinks() {
  document.querySelectorAll('[data-track="book"]').forEach((link) => {
    if (link.dataset.bound === '1') return;
    link.dataset.bound = '1';
    link.addEventListener('click', () => {
      track('book_djjuan_click', {
        link_url: link.href,
        cta_position: link.id === 'stickyBook' ? 'sticky' : (link.closest('.hero') ? 'hero' : 'nav')
      });
    });
  });
}

function updateStickyCta() {
  if (window.scrollY > 28) {
    document.body.classList.add('cta-visible');
  } else {
    document.body.classList.remove('cta-visible');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  bindTrackedLinks();
  updateStickyCta();

  window.addEventListener('scroll', updateStickyCta, { passive: true });
  window.addEventListener('resize', updateStickyCta, { passive: true });
});
