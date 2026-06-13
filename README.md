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
