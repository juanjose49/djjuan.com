# djjuan.com

This repository serves the static personal brand site for `https://djjuan.com/`.

The public site is intentionally static and deploys in the same style as the other simple site repos:

- `index.html`
- `index.css`
- `index.js`
- `es/index.html`
- `robots.txt`
- `sitemap.xml`
- `images/djjuan-hero.png`
- `images/brand/`
- `images/epk/`

## Website Positioning

`djjuan.com` is the personal artist hub for DJ Juan. It should build trust, show the sound and event fit, and send booking traffic to the on-page TidyCal widget.

Primary booking target:

```text
https://djjuan.com/#booking
```

## Event Pricing and Proposal Links

The pricing tool immediately above the booking section calculates event coverage from the selected service and hours:

- House Party: `$149/hour`
- Special events: `$199/hour`
- Weddings: `$299/hour`
- Daytime and nighttime production together: `+$99`
- Indoor and outdoor settings together: `+$99`

The two surcharges are independent. Selecting both combined options adds `$198`.
Every service includes fully insured and licensed coverage. Selecting House Party defaults the hosting language to English; the other services leave it open for discussion.

Only four inputs are required to create a proposal: event date, coverage hours, client name, and email. Start time, venue, partner or co-host, event moments, coordinator, music direction, special dances, performers, production interests, and logistics remain optional so a prospect can create a useful link early and refine it with a spouse or planner later. The estimate conditions appear directly below the proposal-link privacy notice without requiring a separate acknowledgment.

Submitting the form encodes the supplied event details as base64 JSON and opens:

```text
https://djjuan.com/estimate?details=<base64url-json>
```

The static proposal renderer lives in `estimate/`. It validates the payload, recomputes the price from the committed rates, and supports English or Spanish output. Optional planning details can be completed directly on the estimate page. Each edit rerenders the proposal and replaces the address-bar URL with a newly encoded payload; the Copy and Share actions always use that latest URL. The native Share action includes a polished message customized for a House Party, special event, or wedding instead of using the raw event name as the message. New links omit empty optional fields and use unpadded URL-safe Base64 to reduce their length and avoid reserved URL characters. Previously generated standard Base64 links remain supported.

All public pages expose the root `site.webmanifest`, Apple home-screen metadata, Android-compatible web-app metadata, theme colors, touch icons, and a responsive viewport. Native Universal Link and App Link association files are intentionally absent until there is an iOS app bundle identifier, Android package name, and signing certificate to associate with this domain.

The TidyCal meet-and-greet scheduler appears only on a valid generated proposal, keeping proposal creation as the main-site interaction and scheduling as the next step. The proposal's client name and email prefill TidyCal's matching fields. The header and proposal scheduling actions link directly to `#booking` on the estimate page. The scheduler can be hidden and reopened; its `bookingClosed` state is stored in the encoded proposal details so shared links retain that choice. A closed scheduler is unloaded and does not reconnect to TidyCal until it is reopened. The schedule loads in a cross-origin iframe with no referrer, so the proposal query string is not disclosed to the booking service. A small same-site resizer accepts height messages only from the booking iframe and its allowlisted TidyCal origins. The third-party parent-page embed script is intentionally omitted because code running in the proposal document would be able to read its private URL.

Proposal pages are marked `noindex` and send no referrer. Analytics run inside the same-site `estimate/analytics.html` bridge, whose browser history and URL never contain the proposal payload. The bridge manually reports a sanitized `/estimate/` page location and accepts only allowlisted event names and parameters. This avoids GA4 enhanced measurement observing the `history.replaceState` calls that keep the latest share link in the address bar.

Estimate events contain only service configuration, completion state, field names, and interaction types. Names, email addresses, phone numbers, venues, notes, field values, and share URLs are not sent. Base64 is an encoding, not encryption, so proposal links should still be shared only with intended recipients.

Estimate analytics cover:

- `page_view` and `estimate_viewed` for valid proposal visits
- `estimate_invalid_viewed` for missing or invalid proposal payloads
- `estimate_edit_started`, `estimate_field_updated`, and `estimate_section_opened`
- `estimate_scroll_depth` at 50 and 90 percent
- `estimate_link_copied`, `estimate_link_shared`, and `estimate_share_cancelled`
- `estimate_printed`, `estimate_new_click`, and the existing `booking_click`

For GA4 reporting, use `/estimate/` for the Pages and screens view and build a funnel from `estimate_generated` to `estimate_viewed`, then to `estimate_link_shared` or `booking_click`. Useful event-scoped custom dimensions are `event_type`, `event_timing`, `venue_setting`, `estimate_completion_status`, `estimate_field`, and `source_page`. `estimate_total` and `duration_hours` can be registered as custom metrics if numeric reporting is needed.

## Local Preview

From this directory:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Deployment

Deploy the root static files and `images/` folder to the web host for `djjuan.com`.

The site uses relative asset paths for local preview compatibility and absolute canonical/social URLs for crawl metadata.

## Color Theme

The site defaults to the visitor's operating-system light or dark preference. The header toggle lets the visitor override that choice and stores the selection in `localStorage` under `djjuan-theme`, shared by the English and Spanish pages. OS theme changes continue to update the site until the visitor makes an explicit selection. The booking iframe also switches between the committed light-mode embed URL and the dark-mode schedule URL.

Brand assets:

- `images/brand/dj-juan-logo.png` is the header logo.
- `images/brand/dj-juan-icon-192.png`, `images/brand/dj-juan-icon-512.png`, and `favicon.ico` are generated from the DJ Juan logo for browser/app icons.

## Public EPK Review

The public press kit is hosted on Google Drive:

```text
https://drive.google.com/drive/folders/1gHFb1-pKrG2hVmF34OsnnwMkhfVe_Qwi
```

The strongest public-facing photos were copied into `images/epk/` after light AI enhancement and deploy-safe processing. Keep raw review/original files local unless they have been intentionally stripped and approved for public release.

Recommended photo hierarchy:

1. `images/epk/juan-on-mixer-enhanced.png` for hero/social/profile use.
2. `images/epk/juan-formal-enhanced.png` for press kit and planner-facing credibility.
3. `images/epk/juan-on-stage-enhanced.png` for performance context.
4. `images/epk/formal-room-setup-enhanced.png` and `images/epk/dance-floor-pov-enhanced.png` for supporting event proof.

Additional viable event-proof images were normalized, metadata-stripped, warm-graded to better match the title/hero assets, and copied into `images/epk/`:

- `images/epk/cocktail-hour-ceremony-setup.jpeg`
- `images/epk/daytime-event-room-setup.jpeg`
- `images/epk/dinner-room-setup.jpeg`

All viable unique marketing images are included in the on-page Gallery section. Duplicate originals are not needed for deployment when an enhanced version is already stronger. `juan_profile.jpeg` and `juan_profile_square.png` were reviewed and excluded from the Gallery section because they read as casual/personal rather than event-DJ marketing.

Content note: `DJJuanSanEmeterioResume.pdf` is credible, but it reads like a formal career resume. The website now presents the planner-facing essentials directly on-page: artist bio, event fit, music range, production capabilities, highlight credit, direct booking, testimonials, and gallery images.

## Spanish Version

The Spanish mirror lives at:

```text
https://djjuan.com/es/
```

Keep the English and Spanish pages reciprocal:

- English canonical: `https://djjuan.com/`
- Spanish canonical: `https://djjuan.com/es/`
- Both pages should include `hreflang="en"`, `hreflang="es"`, and `hreflang="x-default"` alternates.
- `robots.txt` must allow `/es/` and `/images/`.
- `sitemap.xml` must include both URLs with multilingual alternates.
