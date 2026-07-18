function track(eventName, params = {}) {
  try {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    } else if (window.dataLayer) {
      window.dataLayer.push({ event: eventName, ...params });
    }
  } catch (_) {}
}

const trackedEvents = {
  booking: 'booking_click',
  contact: 'contact_click',
  instagram: 'social_click',
  language: 'language_click',
  partner: 'partner_click',
  section: 'section_nav_click',
  services: 'services_click'
};

function getCtaPosition(link) {
  if (link.id === 'stickyBook') return 'sticky';
  if (link.closest('.site-header')) return 'nav';
  if (link.closest('.hero')) return 'hero';
  if (link.closest('.gallery-section')) return 'gallery';
  if (link.closest('.events-section')) return 'events';
  if (link.closest('.social-section')) return 'social';
  if (link.closest('.site-footer')) return 'footer';
  if (link.closest('.intro')) return 'intro';
  return 'body';
}

function getLinkParams(link) {
  return {
    link_text: link.textContent.trim(),
    link_url: link.href,
    link_type: link.dataset.track,
    page_language: document.documentElement.lang || 'en',
    cta_position: getCtaPosition(link),
    target_section: link.dataset.trackSection || '',
    target_language: link.dataset.trackLanguage || '',
    service_type: link.dataset.trackService || '',
    transport_type: 'beacon'
  };
}

function bindTrackedLinks() {
  document.querySelectorAll('[data-track]').forEach((link) => {
    if (link.dataset.bound === '1') return;
    link.dataset.bound = '1';
    link.addEventListener('click', () => {
      track(trackedEvents[link.dataset.track] || 'engagement_click', getLinkParams(link));
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

function bindTidyCalEmbed() {
  const iframe = document.getElementById('tidycal-booking');
  const script = document.getElementById('tidycal-resizer-script');
  if (!iframe || !script) return;

  const resizeToContent = () => {
    if (typeof window.iFrameResize !== 'function' || iframe.iFrameResizer) return;

    window.iFrameResize({
      checkOrigin: false,
      log: false,
      minHeight: 500,
      warningTimeout: 0
    }, iframe);
  };

  resizeToContent();
  script.addEventListener('load', resizeToContent, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  bindTrackedLinks();
  bindTidyCalEmbed();
  updateStickyCta();

  window.addEventListener('scroll', updateStickyCta, { passive: true });
  window.addEventListener('resize', updateStickyCta, { passive: true });
});
