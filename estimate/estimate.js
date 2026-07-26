const proposalRates = {
  special: 199,
  wedding: 299
};
const proposalBothSurcharge = 99;
const proposalAnalyticsPath = '/estimate/';
const proposalAnalyticsTitle = 'Event Proposal Estimate | DJ Juan';
const proposalAnalyticsQueue = [];
let proposalAnalyticsReady = false;

function getProposalAnalyticsLocation() {
  return `${window.location.origin}${proposalAnalyticsPath}`;
}

function postProposalAnalyticsEvent(eventName, params) {
  const frame = document.getElementById('proposal-analytics-frame');
  if (!proposalAnalyticsReady || !frame?.contentWindow) {
    proposalAnalyticsQueue.push({ eventName, params });
    return;
  }

  try {
    if (typeof frame.contentWindow.djJuanEstimateAnalytics === 'function') {
      frame.contentWindow.djJuanEstimateAnalytics(eventName, params);
    } else {
      frame.contentWindow.postMessage({
        type: 'djjuan_estimate_analytics',
        eventName,
        params
      }, window.location.origin);
    }
  } catch (_) {
    frame.contentWindow.postMessage({
      type: 'djjuan_estimate_analytics',
      eventName,
      params
    }, window.location.origin);
  }
  frame.dataset.analyticsEventCount =
    String(Number(frame.dataset.analyticsEventCount || 0) + 1);
}

function initializeProposalAnalyticsBridge() {
  const frame = document.getElementById('proposal-analytics-frame');
  if (!frame) return;

  const flush = () => {
    if (proposalAnalyticsReady) return;
    proposalAnalyticsReady = true;
    frame.dataset.analyticsReady = 'true';
    proposalAnalyticsQueue.splice(0).forEach(({ eventName, params }) => {
      postProposalAnalyticsEvent(eventName, params);
    });
  };

  frame.addEventListener('load', flush, { once: true });
  try {
    if (frame.contentDocument?.readyState === 'complete') flush();
  } catch (_) {}
}

function bindPrivateTidyCalResize() {
  const iframe = document.getElementById('tidycal-booking');
  if (!iframe) return;

  const allowedOrigins = new Set(['https://tidycal.com']);
  [iframe.src, iframe.dataset.lightSrc, iframe.dataset.darkSrc].forEach((source) => {
    if (!source) return;

    try {
      allowedOrigins.add(new URL(source, window.location.origin).origin);
    } catch (_) {}
  });

  const minimumHeight = 500;
  const maximumHeight = 2400;
  const messagePrefix = `[iFrameSizer]${iframe.id}:`;
  const initMessage = `${iframe.id}:8:false:false:32:true:true:null:bodyOffset:null:null:0:false:parent:scroll:false`;

  const postToFrame = (message, targetOrigin) => {
    if (!iframe.contentWindow || !allowedOrigins.has(targetOrigin)) return;
    iframe.contentWindow.postMessage(`[iFrameSizer]${message}`, targetOrigin);
  };

  const getConfiguredOrigin = () => {
    try {
      return new URL(iframe.getAttribute('src'), window.location.origin).origin;
    } catch (_) {
      return '';
    }
  };

  const initializeFrame = (targetOrigin) => {
    postToFrame(initMessage, targetOrigin);
  };

  window.addEventListener('message', (event) => {
    if (event.source !== iframe.contentWindow ||
      !allowedOrigins.has(event.origin) ||
      typeof event.data !== 'string') return;

    if (event.data === '[iFrameResizerChild]Ready') {
      initializeFrame(event.origin);
      return;
    }

    if (!event.data.startsWith(messagePrefix)) return;
    const [height] = event.data.slice(messagePrefix.length).split(':');
    const measuredHeight = Number.parseFloat(height);
    if (!Number.isFinite(measuredHeight)) return;

    const nextHeight = Math.min(
      maximumHeight,
      Math.max(minimumHeight, Math.ceil(measuredHeight))
    );
    iframe.style.height = `${nextHeight}px`;
  });

  iframe.addEventListener('load', () => {
    iframe.style.height = '700px';
    initializeFrame(getConfiguredOrigin());
  });

  window.addEventListener('resize', () => {
    postToFrame('resize', getConfiguredOrigin());
  });

  initializeFrame(getConfiguredOrigin());
}

window.djJuanAnalyticsTrack = postProposalAnalyticsEvent;

function getProposalAnalyticsParams(details) {
  if (!details) return {};

  const surcharge = getProposalSurcharge(details.eventTiming, details.venueSetting);
  return {
    event_type: details.eventType,
    event_timing: details.eventTiming,
    venue_setting: details.venueSetting,
    duration_hours: details.durationHours,
    estimate_total: (proposalRates[details.eventType] * details.durationHours) + surcharge,
    estimate_surcharge: surcharge,
    event_moment_count: details.eventMoments.length,
    production_interest_count: details.productionInterests.length,
    estimate_completion_status: hasOpenProposalDetails(details) ? 'open' : 'complete',
    page_language: details.language
  };
}

function trackProposalEvent(eventName, details, params = {}) {
  if (typeof track !== 'function') return;

  track(eventName, {
    ...getProposalAnalyticsParams(details),
    ...params,
    transport_type: 'beacon'
  });
}

function trackProposalPageView(status, details = null) {
  if (typeof track !== 'function') return;

  track('page_view', {
    page_location: getProposalAnalyticsLocation(),
    page_path: proposalAnalyticsPath,
    page_title: proposalAnalyticsTitle,
    estimate_status: status,
    ...getProposalAnalyticsParams(details),
    transport_type: 'beacon'
  });
}

function getProposalFieldAnalytics(target) {
  if (!(target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement)) {
    return {};
  }

  return {
    estimate_field: target.name || 'unknown',
    estimate_field_type: target instanceof HTMLSelectElement
      ? 'select'
      : (target instanceof HTMLTextAreaElement ? 'textarea' : target.type)
  };
}

function bindProposalScrollTracking(getDetails) {
  const trackedDepths = new Set();
  let frameRequested = false;

  const measure = () => {
    frameRequested = false;
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollableHeight <= 0) return;

    const depth = Math.round((window.scrollY / scrollableHeight) * 100);
    [50, 90].forEach((threshold) => {
      if (depth < threshold || trackedDepths.has(threshold)) return;
      trackedDepths.add(threshold);
      trackProposalEvent('estimate_scroll_depth', getDetails(), {
        scroll_depth_percent: threshold
      });
    });
  };

  window.addEventListener('scroll', () => {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(measure);
  }, { passive: true });
}

const proposalCopy = {
  en: {
    errorTitle: 'This proposal link is incomplete.',
    errorCopy: 'Return to the pricing tool to create a new estimate with the event details included.',
    errorLink: 'Create an estimate',
    bookingHeader: 'Meet DJ Juan',
    eyebrow: 'DJ Juan event proposal',
    specialTitle: 'Special event estimate',
    weddingTitle: 'Wedding estimate',
    preparedFor: 'Prepared for',
    issued: 'Estimate created',
    totalLabel: 'Estimated total',
    copyLink: 'Copy latest link',
    copied: 'Latest estimate link copied',
    shareLink: 'Share latest estimate',
    shared: 'Latest estimate ready to share',
    print: 'Print or save PDF',
    booking: 'Schedule a meet and greet',
    bookingEyebrow: 'Booking',
    bookingTitle: 'Schedule your meet and greet.',
    bookingFrameTitle: 'Schedule a meet and greet with DJ Juan',
    eventEyebrow: 'Event',
    eventDetails: 'Event details',
    pricingEyebrow: 'Pricing',
    pricingBreakdown: 'Pricing breakdown',
    service: 'Service',
    calculation: 'Calculation',
    amount: 'Amount',
    timingSurchargeLabel: 'Production style',
    timingSurcharge: 'Daytime and nighttime surcharge',
    settingSurchargeLabel: 'Venue setting',
    settingSurcharge: 'Indoor and outdoor surcharge',
    scope: 'Scope',
    included: 'What is included',
    planEyebrow: 'Personal plan',
    planTitle: 'The event you are planning',
    momentsTitle: 'Moments to support',
    productionEyebrow: 'Production notes',
    productionTitle: 'Preferences to confirm together',
    productionInterestsTitle: 'Production interests',
    termsEyebrow: 'Terms',
    terms: 'Estimate terms',
    contactEyebrow: 'Prepared for',
    contact: 'Contact',
    notesEyebrow: 'Client notes',
    notes: 'Event priorities',
    newEstimate: 'Create another estimate',
    footer: 'This estimate is not a reservation. DJ Juan will confirm availability and final scope before booking.',
    linkStatus: {
      current: 'This estimate link is current. Copy or share it whenever you are ready.',
      updated: 'Fresh estimate link generated. The address bar is current. Use Copy or Share again before sending it.',
      copied: 'Freshest estimate link copied to your clipboard.',
      shared: 'Freshest estimate link opened in your sharing options.'
    },
    editor: {
      eyebrow: 'Complete together',
      title: 'Add details whenever you are ready',
      intro: 'Blank fields can stay open for now. You or your partner can add what you know, and the shareable estimate link will update automatically.',
      missing: 'A few optional planning details are still open. That is completely okay. Add them now or return to this link later.',
      complete: 'The optional planning details are filled in. You can still revise anything below before sharing.',
      privacy: 'Only include information you are comfortable placing in a shareable link. Do not add door codes or private access instructions.',
      optional: 'Optional',
      sections: {
        event: 'Event, venue, and people',
        planning: 'Music, timeline, and key people',
        production: 'Production and logistics'
      },
      fields: {
        eventName: 'Event or celebration name',
        startTime: 'Start time',
        guestCount: 'Estimated guest count',
        venueName: 'Venue name',
        venueAddress: 'Venue address or city',
        partnerName: 'Partner or co-host',
        phone: 'Phone',
        serviceLanguage: 'Hosting language',
        eventMoments: 'Moments you would like DJ Juan to support',
        coordinatorName: 'Coordinator or onsite contact',
        coordinatorContact: 'Coordinator contact',
        musicPreferences: 'Music direction and must-plays',
        doNotPlay: 'Do-not-play notes',
        specialMoments: 'Special moments or song edits',
        productionInterests: 'Production interests',
        performerDetails: 'Live performers or special program notes',
        logisticsNotes: 'Parking, load-in, power, or weather notes',
        notes: 'Anything else you want reflected in the plan?'
      },
      placeholders: {
        open: 'To be supplied',
        eventName: 'For example, Avery & Jordan’s wedding',
        coordinatorContact: 'Phone or email',
        musicPreferences: 'Favorite genres, artists, songs, or the feeling you want',
        doNotPlay: 'Songs, artists, or styles to avoid',
        specialMoments: 'First dance, parent dances, introductions, announcements, or custom timing',
        performerDetails: 'Performer, approximate time, set length, and equipment needs',
        logisticsNotes: 'Venue access, parking, outdoor power, or weather planning'
      }
    },
    labels: {
      eventType: 'Event type',
      eventName: 'Celebration',
      date: 'Date',
      startTime: 'Start time',
      endTime: 'Estimated end time',
      duration: 'Coverage',
      timing: 'Production',
      serviceLanguage: 'MC language',
      venue: 'Venue',
      address: 'Location',
      setting: 'Setting',
      guests: 'Guests',
      name: 'Name',
      partner: 'Partner or co-host',
      email: 'Email',
      phone: 'Phone',
      coordinator: 'Coordinator or onsite contact',
      coordinatorContact: 'Coordinator contact',
      music: 'Music direction and must-plays',
      doNotPlay: 'Do-not-play notes',
      specialMoments: 'Special moments or song edits',
      performer: 'Live performers or special program',
      logistics: 'Venue and logistics notes'
    },
    values: {
      special: 'Special event',
      wedding: 'Wedding',
      daytime: 'Daytime event',
      nighttime: 'Nighttime event',
      bothTiming: 'Daytime and nighttime',
      indoor: 'Indoor',
      outdoor: 'Outdoor',
      bothSetting: 'Indoor and outdoor',
      hour: 'hour',
      hours: 'hours',
      notProvided: 'Not provided',
      english: 'English',
      spanish: 'Spanish',
      bilingual: 'Bilingual English and Spanish'
    },
    momentLabels: {
      ceremony: 'Ceremony',
      cocktail: 'Cocktail hour',
      dinner: 'Dinner music',
      introductions: 'Introductions',
      toasts: 'Toasts and speeches',
      special_dances: 'Special dances',
      open_dancing: 'Open dancing',
      live_performance: 'Live performer'
    },
    productionLabels: {
      two_zones: 'Second audio zone',
      karaoke: 'Karaoke',
      bubbles: 'Bubbles',
      lighting: 'Event lighting',
      haze: 'Haze or fog',
      lasers: 'Laser effects',
      performer_audio: 'Audio for a performer'
    },
    includedItems: {
      performance: 'Professional DJ performance and equipment setup',
      speakers: 'Up to 4 powerful PA speakers, configured for the room',
      microphones: '2 wireless microphones',
      mc: 'DJ Juan as MC for announcements, toasts, and event flow',
      daytime: 'Bubble effect for a daytime event, where permitted by the venue',
      nighttime: 'Dance-floor lighting and haze for a nighttime event, where permitted by the venue',
      metro: 'Travel and service anywhere in the Metro DMV',
      outdoor: 'DJ-provided outdoor power for audio and lighting',
      collaboration: 'Higher-touch collaboration on the evening timeline and music selections',
      backup: 'Guaranteed backup-power protection for DJ-provided audio and lighting'
    },
    termItems: {
      calculation: 'The estimated price is the selected coverage time multiplied by the displayed hourly rate, plus any displayed $99 both-option surcharges.',
      access: 'Pricing applies only to ADA-accessible venues under normal load-in, setup, operating, weather, and venue conditions.',
      metro: 'The displayed rate includes travel and service anywhere within the Metro DMV.',
      effects: 'Bubbles, haze, and lighting are subject to venue permission and safe operating conditions.',
      outdoor: 'For an outdoor event, DJ-provided power is available for the quoted audio and lighting scope.',
      bothTiming: 'Selecting both daytime and nighttime production adds a $99 surcharge and includes both production styles.',
      bothSetting: 'Selecting both indoor and outdoor settings adds a $99 surcharge and includes DJ-provided outdoor power for the quoted scope.',
      wedding: 'Wedding service includes higher-touch planning, music and timeline collaboration, MC service, and guaranteed backup-power protection.',
      confirmation: 'This proposal estimate is not a reservation. Event availability and final scope must be confirmed directly with DJ Juan.'
    }
  },
  es: {
    errorTitle: 'Este enlace de propuesta está incompleto.',
    errorCopy: 'Regresa a la herramienta de precios para crear un nuevo estimado con los detalles del evento.',
    errorLink: 'Crear un estimado',
    bookingHeader: 'Conoce a DJ Juan',
    eyebrow: 'Propuesta de evento de DJ Juan',
    specialTitle: 'Estimado para evento especial',
    weddingTitle: 'Estimado para boda',
    preparedFor: 'Preparado para',
    issued: 'Estimado creado',
    totalLabel: 'Total estimado',
    copyLink: 'Copiar enlace más reciente',
    copied: 'Enlace más reciente copiado',
    shareLink: 'Compartir estimado más reciente',
    shared: 'Estimado más reciente listo para compartir',
    print: 'Imprimir o guardar PDF',
    booking: 'Programar una llamada inicial',
    bookingEyebrow: 'Reserva',
    bookingTitle: 'Agenda tu llamada inicial.',
    bookingFrameTitle: 'Agenda una llamada inicial con DJ Juan',
    eventEyebrow: 'Evento',
    eventDetails: 'Detalles del evento',
    pricingEyebrow: 'Precio',
    pricingBreakdown: 'Desglose de precio',
    service: 'Servicio',
    calculation: 'Cálculo',
    amount: 'Monto',
    timingSurchargeLabel: 'Estilo de producción',
    timingSurcharge: 'Recargo por evento de día y de noche',
    settingSurchargeLabel: 'Tipo de venue',
    settingSurcharge: 'Recargo por interior y al aire libre',
    scope: 'Alcance',
    included: 'Lo que está incluido',
    planEyebrow: 'Plan personal',
    planTitle: 'El evento que están creando',
    momentsTitle: 'Momentos que apoyaremos',
    productionEyebrow: 'Notas de producción',
    productionTitle: 'Preferencias para confirmar juntos',
    productionInterestsTitle: 'Intereses de producción',
    termsEyebrow: 'Términos',
    terms: 'Términos del estimado',
    contactEyebrow: 'Preparado para',
    contact: 'Contacto',
    notesEyebrow: 'Notas del cliente',
    notes: 'Prioridades del evento',
    newEstimate: 'Crear otro estimado',
    footer: 'Este estimado no es una reservación. DJ Juan confirmará la disponibilidad y el alcance final antes de reservar.',
    linkStatus: {
      current: 'Este enlace del estimado está actualizado. Cópialo o compártelo cuando quieras.',
      updated: 'Se generó un enlace nuevo. La barra del navegador está actualizada. Usa Copiar o Compartir de nuevo antes de enviarlo.',
      copied: 'El enlace más reciente se copió al portapapeles.',
      shared: 'El enlace más reciente se abrió en tus opciones para compartir.'
    },
    editor: {
      eyebrow: 'Completen juntos',
      title: 'Agrega detalles cuando estén listos',
      intro: 'Los campos vacíos pueden quedar pendientes. Tú o tu pareja pueden agregar lo que sepan y el enlace compartible se actualizará automáticamente.',
      missing: 'Todavía quedan algunos detalles opcionales. No hay problema. Agréguenlos ahora o regresen a este enlace después.',
      complete: 'Los detalles opcionales de planificación están completos. Aún pueden revisar cualquier campo antes de compartir.',
      privacy: 'Incluye solo información que puedas colocar en un enlace compartible. No agregues códigos de puerta ni instrucciones privadas de acceso.',
      optional: 'Opcional',
      sections: {
        event: 'Evento, venue y personas',
        planning: 'Música, timeline y personas clave',
        production: 'Producción y logística'
      },
      fields: {
        eventName: 'Nombre del evento o celebración',
        startTime: 'Hora de inicio',
        guestCount: 'Número estimado de invitados',
        venueName: 'Nombre del venue',
        venueAddress: 'Dirección o ciudad del venue',
        partnerName: 'Pareja o coanfitrión',
        phone: 'Teléfono',
        serviceLanguage: 'Idioma del MC',
        eventMoments: 'Momentos que quieres que DJ Juan apoye',
        coordinatorName: 'Coordinador o contacto en el venue',
        coordinatorContact: 'Contacto del coordinador',
        musicPreferences: 'Dirección musical y canciones imprescindibles',
        doNotPlay: 'Música que no quieres',
        specialMoments: 'Momentos especiales o ediciones de canciones',
        productionInterests: 'Intereses de producción',
        performerDetails: 'Artistas en vivo o notas especiales del programa',
        logisticsNotes: 'Estacionamiento, entrada, energía o clima',
        notes: '¿Algo más que quieras reflejar en el plan?'
      },
      placeholders: {
        open: 'Pendiente',
        eventName: 'Por ejemplo, la boda de Avery y Jordan',
        coordinatorContact: 'Teléfono o email',
        musicPreferences: 'Géneros, artistas, canciones o el ambiente que quieres',
        doNotPlay: 'Canciones, artistas o estilos que se deben evitar',
        specialMoments: 'Primer baile, bailes familiares, presentaciones, anuncios o timing personalizado',
        performerDetails: 'Artista, hora aproximada, duración y necesidades de equipo',
        logisticsNotes: 'Acceso, estacionamiento, energía exterior o plan para el clima'
      }
    },
    labels: {
      eventType: 'Tipo de evento',
      eventName: 'Celebración',
      date: 'Fecha',
      startTime: 'Hora de inicio',
      endTime: 'Hora estimada de finalización',
      duration: 'Cobertura',
      timing: 'Producción',
      serviceLanguage: 'Idioma del MC',
      venue: 'Venue',
      address: 'Ubicación',
      setting: 'Espacio',
      guests: 'Invitados',
      name: 'Nombre',
      partner: 'Pareja o coanfitrión',
      email: 'Email',
      phone: 'Teléfono',
      coordinator: 'Coordinador o contacto en el venue',
      coordinatorContact: 'Contacto del coordinador',
      music: 'Dirección musical y canciones imprescindibles',
      doNotPlay: 'Música que no quieres',
      specialMoments: 'Momentos especiales o ediciones',
      performer: 'Artistas en vivo o programa especial',
      logistics: 'Notas del venue y logística'
    },
    values: {
      special: 'Evento especial',
      wedding: 'Boda',
      daytime: 'Evento de día',
      nighttime: 'Evento de noche',
      bothTiming: 'Evento de día y de noche',
      indoor: 'Interior',
      outdoor: 'Al aire libre',
      bothSetting: 'Interior y al aire libre',
      hour: 'hora',
      hours: 'horas',
      notProvided: 'No proporcionado',
      english: 'Inglés',
      spanish: 'Español',
      bilingual: 'Bilingüe, inglés y español'
    },
    momentLabels: {
      ceremony: 'Ceremonia',
      cocktail: 'Hora del cóctel',
      dinner: 'Música de cena',
      introductions: 'Presentaciones',
      toasts: 'Brindis y discursos',
      special_dances: 'Bailes especiales',
      open_dancing: 'Baile abierto',
      live_performance: 'Artista en vivo'
    },
    productionLabels: {
      two_zones: 'Segunda zona de audio',
      karaoke: 'Karaoke',
      bubbles: 'Burbujas',
      lighting: 'Iluminación de evento',
      haze: 'Haze o niebla',
      lasers: 'Efectos láser',
      performer_audio: 'Audio para un artista'
    },
    includedItems: {
      performance: 'DJ profesional y montaje de equipo',
      speakers: 'Hasta 4 potentes bocinas PA, configuradas para el espacio',
      microphones: '2 micrófonos inalámbricos',
      mc: 'DJ Juan como MC para anuncios, brindis y el flujo del evento',
      daytime: 'Efecto de burbujas para un evento de día, donde lo permita el venue',
      nighttime: 'Iluminación de pista y haze para un evento de noche, donde los permita el venue',
      metro: 'Traslado y servicio en cualquier lugar del área metropolitana del DMV',
      outdoor: 'Energía proporcionada por el DJ para audio e iluminación al aire libre',
      collaboration: 'Colaboración detallada en el timeline de la noche y las selecciones musicales',
      backup: 'Protección garantizada con energía de respaldo para el audio y la iluminación del DJ'
    },
    termItems: {
      calculation: 'El precio estimado es el tiempo de cobertura seleccionado multiplicado por la tarifa por hora, más cualquier recargo mostrado de $99 por elegir ambas opciones.',
      access: 'El precio aplica solo a venues accesibles según ADA, bajo condiciones normales de entrada, montaje, operación, clima y venue.',
      metro: 'La tarifa mostrada incluye traslado y servicio en cualquier lugar del área metropolitana del DMV.',
      effects: 'Las burbujas, el haze y la iluminación están sujetos al permiso del venue y condiciones de operación seguras.',
      outdoor: 'Para un evento al aire libre, hay energía proporcionada por el DJ para el alcance de audio e iluminación cotizado.',
      bothTiming: 'Elegir producción de día y de noche agrega un recargo de $99 e incluye ambos estilos de producción.',
      bothSetting: 'Elegir espacios interiores y al aire libre agrega un recargo de $99 e incluye energía proporcionada por el DJ para el alcance cotizado.',
      wedding: 'El servicio de boda incluye planificación detallada, colaboración musical y de timeline, servicio de MC y protección garantizada con energía de respaldo.',
      confirmation: 'Esta propuesta estimada no es una reservación. La disponibilidad y el alcance final deben confirmarse directamente con DJ Juan.'
    }
  }
};

function decodeProposalDetails(encoded) {
  if (!encoded || encoded.length > 40000) throw new Error('Invalid proposal payload');

  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function cleanProposalText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanProposalList(value, allowedValues) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === 'string' && allowedValues.includes(item)))];
}

function normalizeProposalDetails(raw) {
  const durationHours = Number(raw.durationHours);
  const guestCount = raw.guestCount === null || raw.guestCount === undefined || raw.guestCount === ''
    ? null
    : Number(raw.guestCount);
  const details = {
    version: Number(raw.version),
    pricingVersion: cleanProposalText(raw.pricingVersion, 20),
    language: raw.language === 'es' ? 'es' : 'en',
    eventType: raw.eventType,
    eventName: cleanProposalText(raw.eventName, 120),
    eventDate: cleanProposalText(raw.eventDate, 10),
    startTime: cleanProposalText(raw.startTime, 5),
    durationHours,
    eventTiming: raw.eventTiming,
    venueSetting: raw.venueSetting,
    serviceLanguage: ['english', 'spanish', 'bilingual'].includes(raw.serviceLanguage) ? raw.serviceLanguage : '',
    eventMoments: cleanProposalList(raw.eventMoments, [
      'ceremony',
      'cocktail',
      'dinner',
      'introductions',
      'toasts',
      'special_dances',
      'open_dancing',
      'live_performance'
    ]),
    venueName: cleanProposalText(raw.venueName, 120),
    venueAddress: cleanProposalText(raw.venueAddress, 180),
    guestCount,
    clientName: cleanProposalText(raw.clientName, 120),
    partnerName: cleanProposalText(raw.partnerName, 120),
    email: cleanProposalText(raw.email, 160),
    phone: cleanProposalText(raw.phone, 40),
    coordinatorName: cleanProposalText(raw.coordinatorName, 120),
    coordinatorContact: cleanProposalText(raw.coordinatorContact, 160),
    musicPreferences: cleanProposalText(raw.musicPreferences, 1000),
    doNotPlay: cleanProposalText(raw.doNotPlay, 600),
    specialMoments: cleanProposalText(raw.specialMoments, 1000),
    productionInterests: cleanProposalList(raw.productionInterests, [
      'two_zones',
      'karaoke',
      'bubbles',
      'lighting',
      'haze',
      'lasers',
      'performer_audio'
    ]),
    performerDetails: cleanProposalText(raw.performerDetails, 1000),
    logisticsNotes: cleanProposalText(raw.logisticsNotes, 1000),
    notes: cleanProposalText(raw.notes, 1000),
    createdAt: cleanProposalText(raw.createdAt, 40)
  };

  const isValid =
    [1, 2, 3].includes(details.version) &&
    details.pricingVersion === '2026-07-26' &&
    ['special', 'wedding'].includes(details.eventType) &&
    /^\d{4}-\d{2}-\d{2}$/.test(details.eventDate) &&
    (details.startTime === '' || /^\d{2}:\d{2}$/.test(details.startTime)) &&
    Number.isFinite(details.durationHours) &&
    details.durationHours >= 1 &&
    details.durationHours <= 16 &&
    Number.isInteger(details.durationHours * 2) &&
    ['daytime', 'nighttime', 'both'].includes(details.eventTiming) &&
    ['indoor', 'outdoor', 'both'].includes(details.venueSetting) &&
    details.clientName.length > 0 &&
    details.email.length > 0 &&
    (details.guestCount === null || (Number.isInteger(details.guestCount) && details.guestCount >= 1 && details.guestCount <= 2000));

  if (!isValid) throw new Error('Invalid proposal details');
  return details;
}

function formatProposalCurrency(amount, language) {
  return new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatProposalDate(value, language) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(language === 'es' ? 'es-US' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function formatProposalTime(value, language) {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);

  return new Intl.DateTimeFormat(language === 'es' ? 'es-US' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function calculateProposalEndTime(startTime, durationHours) {
  if (!startTime) return '';
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = ((hours * 60) + minutes + Math.round(durationHours * 60)) % (24 * 60);
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

function getProposalSurcharge(eventTiming, venueSetting) {
  return (eventTiming === 'both' ? proposalBothSurcharge : 0) +
    (venueSetting === 'both' ? proposalBothSurcharge : 0);
}

function getProposalTimingLabel(copy, eventTiming) {
  return eventTiming === 'both' ? copy.values.bothTiming : copy.values[eventTiming];
}

function getProposalSettingLabel(copy, venueSetting) {
  return venueSetting === 'both' ? copy.values.bothSetting : copy.values[venueSetting];
}

function addProposalDetails(list, entries) {
  const nodes = [];

  entries.forEach(([term, description]) => {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = term;
    dd.textContent = description;
    nodes.push(dt, dd);
  });

  list.replaceChildren(...nodes);
}

function addProposalList(list, items) {
  list.replaceChildren(...items.map((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    return li;
  }));
}

function applyProposalCopy(copy, details) {
  const setText = (id, text) => {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  };

  document.documentElement.lang = details.language;
  setText('header-booking-link', copy.bookingHeader);
  setText('proposal-eyebrow', copy.eyebrow);
  setText('proposal-title', details.eventType === 'wedding' ? copy.weddingTitle : copy.specialTitle);
  setText('proposal-total-label', copy.totalLabel);
  setText('copy-proposal-link', copy.copyLink);
  setText('share-proposal-link', copy.shareLink);
  setText('print-proposal', copy.print);
  setText('proposal-booking-link', copy.booking);
  setText('booking-eyebrow', copy.bookingEyebrow);
  setText('booking-title', copy.bookingTitle);
  setText('proposal-editor-eyebrow', copy.editor.eyebrow);
  setText('proposal-editor-title', copy.editor.title);
  setText('proposal-editor-intro', copy.editor.intro);
  setText('proposal-editor-privacy', copy.editor.privacy);
  setText('event-details-title', copy.eventDetails);
  setText('pricing-breakdown-title', copy.pricingBreakdown);
  setText('service-column-label', copy.service);
  setText('calculation-column-label', copy.calculation);
  setText('amount-column-label', copy.amount);
  setText('proposal-timing-surcharge-label', copy.timingSurchargeLabel);
  setText('proposal-timing-surcharge-calculation', copy.timingSurcharge);
  setText('proposal-setting-surcharge-label', copy.settingSurchargeLabel);
  setText('proposal-setting-surcharge-calculation', copy.settingSurcharge);
  setText('proposal-total-row-label', copy.totalLabel);
  setText('included-title', copy.included);
  setText('plan-title', copy.planTitle);
  setText('moments-title', copy.momentsTitle);
  setText('production-title', copy.productionTitle);
  setText('production-interests-title', copy.productionInterestsTitle);
  setText('terms-title', copy.terms);
  setText('contact-title', copy.contact);
  setText('notes-title', copy.notes);
  setText('proposal-footer-copy', copy.footer);
  setText('new-estimate-link', copy.newEstimate);
  document.getElementById('tidycal-booking').title = copy.bookingFrameTitle;

  const eyebrowElements = document.querySelectorAll('.proposal-card > .eyebrow');
  const eyebrowCopy = [
    copy.eventEyebrow,
    copy.pricingEyebrow,
    copy.scope,
    copy.planEyebrow,
    copy.productionEyebrow,
    copy.termsEyebrow,
    copy.contactEyebrow,
    copy.notesEyebrow
  ];
  eyebrowElements.forEach((element, index) => {
    if (eyebrowCopy[index]) element.textContent = eyebrowCopy[index];
  });
}

function showProposalError(language = 'en') {
  const copy = proposalCopy[language];
  document.documentElement.lang = language;
  document.getElementById('proposal-error-title').textContent = copy.errorTitle;
  document.getElementById('proposal-error-copy').textContent = copy.errorCopy;
  document.getElementById('proposal-error-link').textContent = copy.errorLink;
  document.getElementById('proposal-error-link').href = language === 'es' ? '../es/#pricing' : '../#pricing';
  document.getElementById('proposal-content').hidden = true;
  document.getElementById('proposal-error').hidden = false;
}

function renderProposal(details) {
  const copy = proposalCopy[details.language];
  const rate = proposalRates[details.eventType];
  const baseTotal = rate * details.durationHours;
  const surcharge = getProposalSurcharge(details.eventTiming, details.venueSetting);
  const total = baseTotal + surcharge;
  const durationUnit = details.durationHours === 1 ? copy.values.hour : copy.values.hours;
  const serviceName = copy.values[details.eventType];
  const sitePrefix = details.language === 'es' ? '../es/' : '../';

  applyProposalCopy(copy, details);
  document.getElementById('proposal-plan-card').hidden = true;
  document.getElementById('proposal-moments-group').hidden = true;
  document.getElementById('proposal-production-card').hidden = true;
  document.getElementById('proposal-production-group').hidden = true;
  document.getElementById('proposal-notes-card').hidden = true;
  document.getElementById('proposal-notes').textContent = '';
  document.getElementById('proposal-timing-surcharge-row').hidden = true;
  document.getElementById('proposal-setting-surcharge-row').hidden = true;
  document.getElementById('header-booking-link').href = '#booking';
  document.getElementById('proposal-booking-link').href = '#booking';
  document.getElementById('new-estimate-link').href = `${sitePrefix}#pricing`;
  document.getElementById('proposal-title').textContent = details.eventName ||
    (details.eventType === 'wedding' ? copy.weddingTitle : copy.specialTitle);
  document.getElementById('proposal-client').textContent = details.partnerName
    ? `${details.clientName}${details.language === 'es' ? ' y ' : ' & '}${details.partnerName}`
    : details.clientName;
  document.getElementById('proposal-lead').firstChild.textContent = `${copy.preparedFor} `;

  const createdDate = new Date(details.createdAt);
  document.getElementById('proposal-issued').textContent = Number.isNaN(createdDate.getTime())
    ? ''
    : `${copy.issued} ${new Intl.DateTimeFormat(details.language === 'es' ? 'es-US' : 'en-US', { dateStyle: 'long' }).format(createdDate)}`;

  const formattedTotal = formatProposalCurrency(total, details.language);
  const formattedBaseTotal = formatProposalCurrency(baseTotal, details.language);
  const formattedRate = formatProposalCurrency(rate, details.language);
  const calculation = `${details.durationHours} ${durationUnit} × ${formattedRate}/${copy.values.hour}`;
  const calculationParts = [calculation];

  if (details.eventTiming === 'both') {
    calculationParts.push(`${formatProposalCurrency(proposalBothSurcharge, details.language)} ${copy.timingSurcharge.toLowerCase()}`);
    document.getElementById('proposal-timing-surcharge-amount').textContent =
      formatProposalCurrency(proposalBothSurcharge, details.language);
    document.getElementById('proposal-timing-surcharge-row').hidden = false;
  }

  if (details.venueSetting === 'both') {
    calculationParts.push(`${formatProposalCurrency(proposalBothSurcharge, details.language)} ${copy.settingSurcharge.toLowerCase()}`);
    document.getElementById('proposal-setting-surcharge-amount').textContent =
      formatProposalCurrency(proposalBothSurcharge, details.language);
    document.getElementById('proposal-setting-surcharge-row').hidden = false;
  }

  document.getElementById('proposal-total').textContent = formattedTotal;
  document.getElementById('proposal-rate').textContent = calculationParts.join(' + ');
  document.getElementById('proposal-service-name').textContent = serviceName;
  document.getElementById('proposal-calculation').textContent = calculation;
  document.getElementById('proposal-line-total').textContent = formattedBaseTotal;
  document.getElementById('proposal-table-total').textContent = formattedTotal;

  const eventDetails = [];
  if (details.eventName) eventDetails.push([copy.labels.eventName, details.eventName]);
  eventDetails.push(
    [copy.labels.eventType, serviceName],
    [copy.labels.date, formatProposalDate(details.eventDate, details.language)]
  );

  if (details.startTime) {
    eventDetails.push(
      [copy.labels.startTime, formatProposalTime(details.startTime, details.language)],
      [copy.labels.endTime, formatProposalTime(calculateProposalEndTime(details.startTime, details.durationHours), details.language)]
    );
  }

  eventDetails.push(
    [copy.labels.duration, `${details.durationHours} ${durationUnit}`],
    [copy.labels.timing, getProposalTimingLabel(copy, details.eventTiming)],
    [copy.labels.setting, getProposalSettingLabel(copy, details.venueSetting)]
  );

  if (details.serviceLanguage) {
    eventDetails.push([copy.labels.serviceLanguage, copy.values[details.serviceLanguage]]);
  }
  if (details.venueName) eventDetails.push([copy.labels.venue, details.venueName]);
  if (details.venueAddress) eventDetails.push([copy.labels.address, details.venueAddress]);

  if (details.guestCount !== null) {
    eventDetails.push([copy.labels.guests, new Intl.NumberFormat(details.language === 'es' ? 'es-US' : 'en-US').format(details.guestCount)]);
  }

  addProposalDetails(document.getElementById('proposal-details'), eventDetails);
  const contactDetails = [
    [copy.labels.name, details.clientName]
  ];
  if (details.partnerName) contactDetails.push([copy.labels.partner, details.partnerName]);
  contactDetails.push([copy.labels.email, details.email]);
  if (details.phone) contactDetails.push([copy.labels.phone, details.phone]);
  addProposalDetails(document.getElementById('proposal-contact'), contactDetails);

  const included = [
    copy.includedItems.performance,
    copy.includedItems.speakers,
    copy.includedItems.microphones,
    copy.includedItems.mc
  ];

  if (details.eventType === 'wedding') {
    included.push(copy.includedItems.collaboration, copy.includedItems.backup);
  }

  if (details.eventTiming === 'both') {
    included.push(copy.includedItems.daytime, copy.includedItems.nighttime);
  } else {
    included.push(details.eventTiming === 'nighttime' ? copy.includedItems.nighttime : copy.includedItems.daytime);
  }
  if (details.venueSetting === 'outdoor' || details.venueSetting === 'both') included.push(copy.includedItems.outdoor);
  included.push(copy.includedItems.metro);
  addProposalList(document.getElementById('proposal-included'), included);

  const planningDetails = [];
  if (details.coordinatorName) planningDetails.push([copy.labels.coordinator, details.coordinatorName]);
  if (details.coordinatorContact) planningDetails.push([copy.labels.coordinatorContact, details.coordinatorContact]);
  if (details.musicPreferences) planningDetails.push([copy.labels.music, details.musicPreferences]);
  if (details.doNotPlay) planningDetails.push([copy.labels.doNotPlay, details.doNotPlay]);
  if (details.specialMoments) planningDetails.push([copy.labels.specialMoments, details.specialMoments]);

  if (details.eventMoments.length > 0) {
    addProposalList(
      document.getElementById('proposal-moments'),
      details.eventMoments.map((moment) => copy.momentLabels[moment])
    );
    document.getElementById('proposal-moments-group').hidden = false;
  }

  if (details.eventMoments.length > 0 || planningDetails.length > 0) {
    addProposalDetails(document.getElementById('proposal-planning-details'), planningDetails);
    document.getElementById('proposal-plan-card').hidden = false;
  }

  const productionDetails = [];
  if (details.performerDetails) productionDetails.push([copy.labels.performer, details.performerDetails]);
  if (details.logisticsNotes) productionDetails.push([copy.labels.logistics, details.logisticsNotes]);

  if (details.productionInterests.length > 0) {
    addProposalList(
      document.getElementById('proposal-production-interests'),
      details.productionInterests.map((interest) => copy.productionLabels[interest])
    );
    document.getElementById('proposal-production-group').hidden = false;
  }

  if (details.productionInterests.length > 0 || productionDetails.length > 0) {
    addProposalDetails(document.getElementById('proposal-production-details'), productionDetails);
    document.getElementById('proposal-production-card').hidden = false;
  }

  const terms = [
    copy.termItems.calculation,
    copy.termItems.access,
    copy.termItems.metro,
    copy.termItems.effects
  ];

  if (details.eventTiming === 'both') terms.push(copy.termItems.bothTiming);
  if (details.venueSetting === 'outdoor') terms.push(copy.termItems.outdoor);
  if (details.venueSetting === 'both') terms.push(copy.termItems.bothSetting);
  if (details.eventType === 'wedding') terms.push(copy.termItems.wedding);
  terms.push(copy.termItems.confirmation);
  addProposalList(document.getElementById('proposal-terms'), terms);

  if (details.notes) {
    document.getElementById('proposal-notes').textContent = details.notes;
    document.getElementById('proposal-notes-card').hidden = false;
  }

  document.getElementById('proposal-error').hidden = true;
  document.getElementById('proposal-content').hidden = false;
}

function appendProposalEditorLabel(label, text, optionalText) {
  const labelText = document.createElement('span');
  const optional = document.createElement('small');
  labelText.textContent = `${text} `;
  optional.textContent = optionalText;
  labelText.append(optional);
  label.append(labelText);
}

function createProposalEditorField(copy, details, config) {
  const label = document.createElement('label');
  label.className = `proposal-edit-field${config.wide ? ' is-wide' : ''}`;
  appendProposalEditorLabel(label, config.label, copy.editor.optional);

  let control;
  if (config.type === 'textarea') {
    control = document.createElement('textarea');
    control.rows = config.rows || 3;
  } else if (config.type === 'select') {
    control = document.createElement('select');
    config.options.forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      control.append(option);
    });
  } else {
    control = document.createElement('input');
    control.type = config.type || 'text';
  }

  control.name = config.name;
  control.value = details[config.name] ?? '';
  if (config.placeholder) control.placeholder = config.placeholder;
  if (config.maxLength) control.maxLength = config.maxLength;
  if (config.min) control.min = config.min;
  if (config.max) control.max = config.max;
  if (config.step) control.step = config.step;
  if (config.inputMode) control.inputMode = config.inputMode;
  if (config.autocomplete) control.autocomplete = config.autocomplete;
  label.append(control);
  return label;
}

function createProposalChoiceGroup(copy, config) {
  const group = document.createElement('div');
  const title = document.createElement('p');
  const optional = document.createElement('small');
  const chips = document.createElement('div');

  group.className = 'proposal-edit-choice-group';
  title.textContent = `${config.label} `;
  optional.textContent = copy.editor.optional;
  title.append(optional);
  chips.className = 'chip-grid';

  Object.entries(config.labels).forEach(([value, text]) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    const span = document.createElement('span');
    label.className = 'check-chip';
    input.type = 'checkbox';
    input.name = config.name;
    input.value = value;
    input.checked = config.selected.includes(value);
    span.textContent = text;
    label.append(input, span);
    chips.append(label);
  });

  group.append(title, chips);
  return group;
}

function createProposalEditSection(title, children, analyticsSection, open = false) {
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  const body = document.createElement('div');
  const grid = document.createElement('div');

  details.className = 'proposal-edit-section';
  details.dataset.analyticsSection = analyticsSection;
  details.open = open;
  summary.textContent = title;
  body.className = 'proposal-edit-section-body';
  grid.className = 'proposal-edit-grid';
  grid.append(...children);
  body.append(grid);
  details.append(summary, body);
  return details;
}

function buildProposalEditor(details) {
  const copy = proposalCopy[details.language];
  const form = document.getElementById('proposal-editor');
  const openPlaceholder = copy.editor.placeholders.open;
  const eventFields = [
    createProposalEditorField(copy, details, {
      name: 'eventName',
      label: copy.editor.fields.eventName,
      placeholder: copy.editor.placeholders.eventName,
      maxLength: 120,
      wide: true
    }),
    createProposalEditorField(copy, details, {
      name: 'startTime',
      label: copy.editor.fields.startTime,
      type: 'time'
    }),
    createProposalEditorField(copy, details, {
      name: 'guestCount',
      label: copy.editor.fields.guestCount,
      type: 'number',
      min: 1,
      max: 2000,
      step: 1,
      inputMode: 'numeric',
      placeholder: openPlaceholder
    }),
    createProposalEditorField(copy, details, {
      name: 'venueName',
      label: copy.editor.fields.venueName,
      placeholder: openPlaceholder,
      maxLength: 120,
      autocomplete: 'organization'
    }),
    createProposalEditorField(copy, details, {
      name: 'venueAddress',
      label: copy.editor.fields.venueAddress,
      placeholder: openPlaceholder,
      maxLength: 180,
      autocomplete: 'street-address'
    }),
    createProposalEditorField(copy, details, {
      name: 'partnerName',
      label: copy.editor.fields.partnerName,
      placeholder: openPlaceholder,
      maxLength: 120,
      autocomplete: 'name'
    }),
    createProposalEditorField(copy, details, {
      name: 'phone',
      label: copy.editor.fields.phone,
      type: 'tel',
      placeholder: openPlaceholder,
      maxLength: 40,
      autocomplete: 'tel'
    }),
    createProposalEditorField(copy, details, {
      name: 'serviceLanguage',
      label: copy.editor.fields.serviceLanguage,
      type: 'select',
      wide: true,
      options: [
        ['', openPlaceholder],
        ['english', copy.values.english],
        ['spanish', copy.values.spanish],
        ['bilingual', copy.values.bilingual]
      ]
    })
  ];

  const planningFields = [
    createProposalChoiceGroup(copy, {
      name: 'eventMoments',
      label: copy.editor.fields.eventMoments,
      labels: copy.momentLabels,
      selected: details.eventMoments
    }),
    createProposalEditorField(copy, details, {
      name: 'coordinatorName',
      label: copy.editor.fields.coordinatorName,
      placeholder: openPlaceholder,
      maxLength: 120
    }),
    createProposalEditorField(copy, details, {
      name: 'coordinatorContact',
      label: copy.editor.fields.coordinatorContact,
      placeholder: copy.editor.placeholders.coordinatorContact,
      maxLength: 160
    }),
    createProposalEditorField(copy, details, {
      name: 'musicPreferences',
      label: copy.editor.fields.musicPreferences,
      type: 'textarea',
      placeholder: copy.editor.placeholders.musicPreferences,
      maxLength: 1000,
      wide: true
    }),
    createProposalEditorField(copy, details, {
      name: 'doNotPlay',
      label: copy.editor.fields.doNotPlay,
      type: 'textarea',
      placeholder: copy.editor.placeholders.doNotPlay,
      maxLength: 600,
      rows: 2,
      wide: true
    }),
    createProposalEditorField(copy, details, {
      name: 'specialMoments',
      label: copy.editor.fields.specialMoments,
      type: 'textarea',
      placeholder: copy.editor.placeholders.specialMoments,
      maxLength: 1000,
      wide: true
    })
  ];

  const productionFields = [
    createProposalChoiceGroup(copy, {
      name: 'productionInterests',
      label: copy.editor.fields.productionInterests,
      labels: copy.productionLabels,
      selected: details.productionInterests
    }),
    createProposalEditorField(copy, details, {
      name: 'performerDetails',
      label: copy.editor.fields.performerDetails,
      type: 'textarea',
      placeholder: copy.editor.placeholders.performerDetails,
      maxLength: 1000,
      wide: true
    }),
    createProposalEditorField(copy, details, {
      name: 'logisticsNotes',
      label: copy.editor.fields.logisticsNotes,
      type: 'textarea',
      placeholder: copy.editor.placeholders.logisticsNotes,
      maxLength: 1000,
      wide: true
    }),
    createProposalEditorField(copy, details, {
      name: 'notes',
      label: copy.editor.fields.notes,
      type: 'textarea',
      placeholder: openPlaceholder,
      maxLength: 1000,
      wide: true
    })
  ];

  form.replaceChildren(
    createProposalEditSection(copy.editor.sections.event, eventFields, 'event', true),
    createProposalEditSection(copy.editor.sections.planning, planningFields, 'planning'),
    createProposalEditSection(copy.editor.sections.production, productionFields, 'production')
  );
}

function readProposalEditor(form, currentDetails) {
  const data = new FormData(form);
  const guestValue = String(data.get('guestCount') || '');
  const guestNumber = Number(guestValue);
  const guestCount = /^\d+$/.test(guestValue) && guestNumber >= 1 && guestNumber <= 2000
    ? guestNumber
    : null;

  return normalizeProposalDetails({
    ...currentDetails,
    version: 3,
    eventName: String(data.get('eventName') || ''),
    startTime: String(data.get('startTime') || ''),
    guestCount,
    venueName: String(data.get('venueName') || ''),
    venueAddress: String(data.get('venueAddress') || ''),
    partnerName: String(data.get('partnerName') || ''),
    phone: String(data.get('phone') || ''),
    serviceLanguage: String(data.get('serviceLanguage') || ''),
    eventMoments: data.getAll('eventMoments').map(String),
    coordinatorName: String(data.get('coordinatorName') || ''),
    coordinatorContact: String(data.get('coordinatorContact') || ''),
    musicPreferences: String(data.get('musicPreferences') || ''),
    doNotPlay: String(data.get('doNotPlay') || ''),
    specialMoments: String(data.get('specialMoments') || ''),
    productionInterests: data.getAll('productionInterests').map(String),
    performerDetails: String(data.get('performerDetails') || ''),
    logisticsNotes: String(data.get('logisticsNotes') || ''),
    notes: String(data.get('notes') || '')
  });
}

function hasOpenProposalDetails(details) {
  return [
    details.eventName,
    details.startTime,
    details.guestCount,
    details.venueName,
    details.venueAddress,
    details.partnerName,
    details.phone,
    details.serviceLanguage,
    details.eventMoments.length,
    details.coordinatorName,
    details.coordinatorContact,
    details.musicPreferences,
    details.specialMoments,
    details.productionInterests.length,
    details.logisticsNotes
  ].some((value) => value === '' || value === null || value === 0);
}

function updateProposalMissingSummary(details) {
  const copy = proposalCopy[details.language];
  document.getElementById('proposal-missing-summary').textContent = hasOpenProposalDetails(details)
    ? copy.editor.missing
    : copy.editor.complete;
}

function createCurrentProposalUrl(details) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('details', encodeEstimateDetails({ ...details, version: 3 }));
  return url.toString();
}

function setProposalLinkStatus(message, fresh = false) {
  const status = document.getElementById('proposal-link-status');
  status.replaceChildren(document.createTextNode(message));
  status.classList.remove('is-fresh');
  if (fresh) {
    void status.offsetWidth;
    status.classList.add('is-fresh');
  }
}

async function copyProposalUrl(url) {
  try {
    await navigator.clipboard.writeText(url);
    return 'clipboard_api';
  } catch (_) {
    const input = document.createElement('textarea');
    input.value = url;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    return 'legacy_copy';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeProposalAnalyticsBridge();
  const encoded = new URLSearchParams(window.location.search).get('details');
  let details;
  let latestProposalUrl = window.location.href;

  try {
    details = normalizeProposalDetails(decodeProposalDetails(encoded));
  } catch (_) {
    showProposalError();
    trackProposalPageView('invalid');
    trackProposalEvent('estimate_invalid_viewed', null, {
      failure_reason: 'invalid_or_missing_details'
    });
    return;
  }

  renderProposal(details);
  buildProposalEditor(details);
  updateProposalMissingSummary(details);
  bindPrivateTidyCalResize();
  setProposalLinkStatus(proposalCopy[details.language].linkStatus.current);
  trackProposalPageView('valid', details);
  trackProposalEvent('estimate_viewed', details);
  bindProposalScrollTracking(() => details);

  const editor = document.getElementById('proposal-editor');
  let editStarted = false;
  editor.addEventListener('input', (event) => {
    details = readProposalEditor(editor, details);
    latestProposalUrl = createCurrentProposalUrl(details);
    window.history.replaceState({ proposalDetails: details }, '', latestProposalUrl);
    renderProposal(details);
    updateProposalMissingSummary(details);
    setProposalLinkStatus(proposalCopy[details.language].linkStatus.updated, true);

    if (!editStarted) {
      editStarted = true;
      trackProposalEvent('estimate_edit_started', details, getProposalFieldAnalytics(event.target));
    }
  });

  editor.addEventListener('change', (event) => {
    trackProposalEvent('estimate_field_updated', details, getProposalFieldAnalytics(event.target));
  });

  editor.querySelectorAll('.proposal-edit-section').forEach((section) => {
    section.addEventListener('toggle', () => {
      if (!section.open || section.dataset.analyticsSection === 'event') return;
      trackProposalEvent('estimate_section_opened', details, {
        estimate_section: section.dataset.analyticsSection
      });
    });
  });

  document.getElementById('print-proposal').addEventListener('click', () => {
    trackProposalEvent('estimate_printed', details);
    window.print();
  });

  document.getElementById('copy-proposal-link').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const copy = proposalCopy[details.language];
    const copyMethod = await copyProposalUrl(latestProposalUrl);

    button.textContent = copy.copied;
    setProposalLinkStatus(copy.linkStatus.copied);
    trackProposalEvent('estimate_link_copied', details, {
      action_source: 'copy_button',
      copy_method: copyMethod
    });
    window.setTimeout(() => {
      button.textContent = copy.copyLink;
    }, 2200);
  });

  document.getElementById('share-proposal-link').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const copy = proposalCopy[details.language];

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: document.title,
          text: details.eventName || (details.eventType === 'wedding' ? copy.weddingTitle : copy.specialTitle),
          url: latestProposalUrl
        });
        button.textContent = copy.shared;
        setProposalLinkStatus(copy.linkStatus.shared);
        trackProposalEvent('estimate_link_shared', details, {
          share_method: 'native_share'
        });
      } catch (error) {
        if (error && error.name === 'AbortError') {
          trackProposalEvent('estimate_share_cancelled', details, {
            share_method: 'native_share'
          });
          return;
        }
        const copyMethod = await copyProposalUrl(latestProposalUrl);
        button.textContent = copy.copied;
        setProposalLinkStatus(copy.linkStatus.copied);
        trackProposalEvent('estimate_link_copied', details, {
          action_source: 'share_fallback',
          copy_method: copyMethod
        });
      }
    } else {
      const copyMethod = await copyProposalUrl(latestProposalUrl);
      button.textContent = copy.copied;
      setProposalLinkStatus(copy.linkStatus.copied);
      trackProposalEvent('estimate_link_copied', details, {
        action_source: 'share_fallback',
        copy_method: copyMethod
      });
    }

    window.setTimeout(() => {
      button.textContent = copy.shareLink;
    }, 2200);
  });
});
