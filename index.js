function track(eventName, params = {}) {
  try {
    if (typeof window.djJuanAnalyticsTrack === 'function') {
      window.djJuanAnalyticsTrack(eventName, params);
    } else if (typeof gtag === 'function') {
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
  if (bookingIframe &&
    !bookingIframe.hidden &&
    bookingIframe.dataset.deferLoad !== 'true') {
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
  estimate_new: 'estimate_new_click',
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
    source_page: document.body.classList.contains('proposal-body') ? 'estimate' : 'site',
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

const estimateRates = {
  special: 199,
  wedding: 299
};
const estimateBothSurcharge = 99;

function getEstimateSurcharge(eventTiming, venueSetting) {
  return (eventTiming === 'both' ? estimateBothSurcharge : 0) +
    (venueSetting === 'both' ? estimateBothSurcharge : 0);
}

function formatEstimateCurrency(amount, language) {
  return new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function encodeEstimateDetails(details) {
  const bytes = new TextEncoder().encode(JSON.stringify(details));
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function bindEstimateForm() {
  const form = document.getElementById('estimate-form');
  if (!form) return;

  const language = document.documentElement.lang.startsWith('es') ? 'es' : 'en';
  const totalElement = document.getElementById('estimate-total');
  const mathElement = document.getElementById('estimate-math');
  const titleElement = document.getElementById('live-estimate-title');
  const includedElement = document.getElementById('estimate-includes');
  const dateInput = document.getElementById('event-date');
  const strings = language === 'es'
    ? {
        special: 'Evento especial',
        wedding: 'Boda',
        hour: 'hora',
        hours: 'horas',
        timingSurcharge: 'recargo por evento de día y de noche',
        settingSurcharge: 'recargo por venue interior y al aire libre',
        items: {
          speakers: 'Hasta 4 potentes bocinas PA',
          microphones: '2 micrófonos inalámbricos',
          mc: 'DJ Juan como MC',
          daytime: 'Efecto de burbujas para un evento de día, donde esté permitido',
          nighttime: 'Iluminación de pista y haze para un evento de noche, donde estén permitidos',
          metro: 'Traslado y servicio en el área metropolitana del DMV',
          outdoor: 'Energía proporcionada por el DJ para audio e iluminación al aire libre',
          collaboration: 'Colaboración detallada en el timeline y las selecciones musicales',
          backup: 'Protección garantizada con energía de respaldo para el audio y la iluminación del DJ'
        }
      }
    : {
        special: 'Special event',
        wedding: 'Wedding',
        hour: 'hour',
        hours: 'hours',
        timingSurcharge: 'daytime and nighttime surcharge',
        settingSurcharge: 'indoor and outdoor surcharge',
        items: {
          speakers: 'Up to 4 powerful PA speakers',
          microphones: '2 wireless microphones',
          mc: 'DJ Juan as MC',
          daytime: 'Bubble effect for a daytime event, where permitted',
          nighttime: 'Dance-floor lighting and haze for a nighttime event, where permitted',
          metro: 'Travel and service anywhere in the Metro DMV',
          outdoor: 'DJ-provided outdoor power for audio and lighting',
          collaboration: 'Higher-touch collaboration on the timeline and music selections',
          backup: 'Guaranteed backup-power protection for DJ audio and lighting'
        }
      };

  if (dateInput) {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.min = `${today.getFullYear()}-${month}-${day}`;
  }

  const getCurrentSelections = () => {
    const data = new FormData(form);
    const eventType = data.get('eventType') === 'wedding' ? 'wedding' : 'special';
    const timingValue = String(data.get('eventTiming') || '');
    const settingValue = String(data.get('venueSetting') || '');
    const eventTiming = ['daytime', 'nighttime', 'both'].includes(timingValue) ? timingValue : 'daytime';
    const venueSetting = ['indoor', 'outdoor', 'both'].includes(settingValue) ? settingValue : 'indoor';
    const durationValue = Number(data.get('durationHours'));
    const durationHours = Number.isFinite(durationValue) && durationValue > 0 ? durationValue : 0;

    return { eventType, eventTiming, venueSetting, durationHours };
  };

  const updateEstimate = () => {
    const { eventType, eventTiming, venueSetting, durationHours } = getCurrentSelections();
    const rate = estimateRates[eventType];
    const surcharge = getEstimateSurcharge(eventTiming, venueSetting);
    const total = (durationHours * rate) + surcharge;
    const durationLabel = durationHours === 1 ? strings.hour : strings.hours;
    const calculationParts = [
      `${durationHours || 0} ${durationLabel} × ${formatEstimateCurrency(rate, language)}/${language === 'es' ? 'hora' : 'hour'}`
    ];
    const items = [
      strings.items.speakers,
      strings.items.microphones,
      strings.items.mc
    ];

    if (eventType === 'wedding') {
      items.push(strings.items.collaboration, strings.items.backup);
    }

    if (eventTiming === 'both') {
      items.push(strings.items.daytime, strings.items.nighttime);
      calculationParts.push(`${formatEstimateCurrency(estimateBothSurcharge, language)} ${strings.timingSurcharge}`);
    } else {
      items.push(eventTiming === 'nighttime' ? strings.items.nighttime : strings.items.daytime);
    }

    if (venueSetting === 'outdoor' || venueSetting === 'both') items.push(strings.items.outdoor);
    if (venueSetting === 'both') {
      calculationParts.push(`${formatEstimateCurrency(estimateBothSurcharge, language)} ${strings.settingSurcharge}`);
    }
    items.push(strings.items.metro);

    titleElement.textContent = strings[eventType];
    totalElement.textContent = formatEstimateCurrency(total, language);
    mathElement.textContent = calculationParts.join(' + ');
    includedElement.replaceChildren(...items.map((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    }));

    form.querySelectorAll('.package-row').forEach((row) => {
      row.classList.toggle('is-selected', Boolean(row.querySelector('input:checked')));
    });
  };

  form.querySelectorAll('.package-row').forEach((row) => {
    row.addEventListener('click', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLLabelElement) return;
      const radio = row.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  form.addEventListener('input', updateEstimate);
  form.addEventListener('change', updateEstimate);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const { eventType, eventTiming, venueSetting, durationHours } = getCurrentSelections();
    const details = {
      version: 3,
      pricingVersion: '2026-07-26',
      language,
      eventType,
      eventName: String(data.get('eventName') || '').trim(),
      eventDate: String(data.get('eventDate') || ''),
      startTime: String(data.get('startTime') || ''),
      durationHours,
      eventTiming,
      venueSetting,
      serviceLanguage: String(data.get('serviceLanguage') || ''),
      eventMoments: data.getAll('eventMoments').map(String),
      venueName: String(data.get('venueName') || '').trim(),
      venueAddress: String(data.get('venueAddress') || '').trim(),
      guestCount: data.get('guestCount') ? Number(data.get('guestCount')) : null,
      clientName: String(data.get('clientName') || '').trim(),
      partnerName: String(data.get('partnerName') || '').trim(),
      email: String(data.get('email') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      coordinatorName: String(data.get('coordinatorName') || '').trim(),
      coordinatorContact: String(data.get('coordinatorContact') || '').trim(),
      musicPreferences: String(data.get('musicPreferences') || '').trim(),
      doNotPlay: String(data.get('doNotPlay') || '').trim(),
      specialMoments: String(data.get('specialMoments') || '').trim(),
      productionInterests: data.getAll('productionInterests').map(String),
      performerDetails: String(data.get('performerDetails') || '').trim(),
      logisticsNotes: String(data.get('logisticsNotes') || '').trim(),
      notes: String(data.get('notes') || '').trim(),
      bookingClosed: false,
      createdAt: new Date().toISOString()
    };

    track('estimate_generated', {
      event_type: eventType,
      event_timing: eventTiming,
      venue_setting: venueSetting,
      duration_hours: durationHours,
      estimate_total: (durationHours * estimateRates[eventType]) + getEstimateSurcharge(eventTiming, venueSetting),
      estimate_surcharge: getEstimateSurcharge(eventTiming, venueSetting),
      event_moment_count: details.eventMoments.length,
      production_interest_count: details.productionInterests.length,
      page_language: language,
      transport_type: 'beacon'
    });

    window.location.assign(`/estimate?details=${encodeURIComponent(encodeEstimateDetails(details))}`);
  });

  updateEstimate();
}

document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  bindThemeToggle();
  bindTrackedLinks();
  bindTidyCalEmbed();
  bindEstimateForm();
});
