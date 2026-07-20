function track(eventName, params = {}) {
  try {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    } else if (window.dataLayer) {
      window.dataLayer.push({ event: eventName, ...params });
    }
  } catch (_) {}
}

const themeStorageKey = 'djjuan-theme';
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

function getStoredTheme() {
  try {
    const theme = localStorage.getItem(themeStorageKey);
    return theme === 'dark' || theme === 'light' ? theme : null;
  } catch (_) {
    return null;
  }
}

function getSystemTheme() {
  return systemTheme.matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  const isSpanish = document.documentElement.lang.startsWith('es');
  const label = isSpanish
    ? (isDark ? 'Cambiar al modo claro' : 'Cambiar al modo oscuro')
    : (isDark ? 'Switch to light mode' : 'Switch to dark mode');
  const toggle = document.querySelector('.theme-toggle');
  const themeColors = document.querySelectorAll('meta[name="theme-color"]');
  const bookingIframe = document.getElementById('tidycal-booking');

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  themeColors.forEach((meta) => {
    meta.content = isDark ? '#0f1113' : '#fbfaf7';
  });
  if (bookingIframe) {
    const bookingSrc = isDark ? bookingIframe.dataset.darkSrc : bookingIframe.dataset.lightSrc;
    if (bookingSrc && bookingIframe.getAttribute('src') !== bookingSrc) {
      bookingIframe.setAttribute('src', bookingSrc);
    }
  }
  if (toggle) {
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.title = label;
  }
}

function bindThemeToggle() {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;

  applyTheme(getStoredTheme() || getSystemTheme());

  toggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';

    try {
      localStorage.setItem(themeStorageKey, nextTheme);
    } catch (_) {}

    applyTheme(nextTheme);
  });

  const syncWithSystem = (event) => {
    if (!getStoredTheme()) applyTheme(event.matches ? 'dark' : 'light');
  };

  if (typeof systemTheme.addEventListener === 'function') {
    systemTheme.addEventListener('change', syncWithSystem);
  } else {
    systemTheme.addListener(syncWithSystem);
  }

  window.addEventListener('storage', (event) => {
    if (event.key === themeStorageKey) applyTheme(getStoredTheme() || getSystemTheme());
  });
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

  bindThemeToggle();
  bindTrackedLinks();
  bindTidyCalEmbed();
});
