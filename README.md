# Jack Higher — landing page

One-page site for **Jack Higher**, two cannabis dispensaries in Ekkamai, Bangkok:

- **Jack Higher 1 · The OG Place**: 8 Soi Sukhumvit 63 (Mon–Sat, 8AM–midnight)
- **Jack Higher 2 · The Smoking Lounge**: 19/1 Soi Sukhumvit 65 (Tue–Sun, 8AM–midnight)

The site exists to send people to **LINE** (`https://lin.ee/HHEX6xq`), which is how orders are placed. It also shows both shops and their Google reviews.

## Stack

Plain HTML, CSS and JS with **zero dependencies**. A ~150-line Node script (`scripts/build.mjs`) inlines all CSS, JS, SVG and the reviews into a single `dist/index.html` (about 44 KB gzipped) and copies `public/` beside it.

```
src/
  index.html          page template (markers like <!-- @reviews --> get filled at build)
  styles.css          all styles, mobile-first (breakpoints 720px / 1040px)
  app.js              age gate, live open/closed status (Bangkok time), reveals, review filter
  data/reviews.json   curated Google reviews (54) rendered into static HTML
  data/images.json    photo dimensions (written by optimize-images.py)
  partials/           SVG sprite (vectorised logo), icons, LINE QR code
public/               fonts (self-hosted, subset), responsive images, favicons, og.jpg
scripts/
  build.mjs           build → dist/
  serve.mjs           local preview server
  optimize-images.py  raw photos → AVIF/WebP/JPEG at 480/800/1200w
netlify.toml          build settings, cache headers, short redirects
```

## Develop

```bash
npm run dev        # build + serve at http://localhost:4321
npm run build      # build only → dist/
```

Node 20+ is required. Nothing needs installing.

## Deploy (Netlify)

1. In Netlify, choose **Add new site → Import an existing project** and pick this repo.
2. Netlify reads `netlify.toml`, so the build command is `npm run build` and the publish dir is `dist`.
3. After adding a custom domain, set the environment variable **`SITE_URL`** (for example `https://jackhigher.com`) so canonical, Open Graph and sitemap URLs use it. Without it, Netlify's own `URL` is used.

Short links that work once deployed: `/line`, `/review`, `/ig`. They're handy for printed menus, stickers and bios.

## Common edits

| Change | Where |
|---|---|
| Copy, hours, addresses, links | `src/index.html` (hours also live in `data-open-days` on each `.shop`, 0 = Sunday) |
| Review count / rating | `src/index.html` (sticker, shop facts, score block) and the meta description |
| Reviews shown | `src/data/reviews.json` |
| Photos | Put originals in a folder, edit `PHOTOS` in `scripts/optimize-images.py`, then run `python3 scripts/optimize-images.py <folder>` |
| Colours / type | CSS custom properties at the top of `src/styles.css` |

## Analytics

Every LINE link has `data-line="<placement>"`. When GA4 (`gtag`) or Plausible is on the page, `app.js` sends a `line_click` event with the placement, so you can see which button converts.

## Notes

- **Age gate:** visitors confirm they're 20+ (Thai law). The answer is remembered in `localStorage`. Content stays in the HTML underneath, so search engines can still index it.
- **Accessibility:** the page respects `prefers-reduced-motion`, has real buttons and links, alt text on every photo, a skip link, a focus trap in the gate, and AA contrast.
- **Reviews:** these are real Google reviews, shown as first name plus last initial, each linking back to the original. A few long ones are trimmed (marked with "…").
- **Photos:** pulled from the shops' Google Maps listings. Swap in the owner's own originals whenever possible.
