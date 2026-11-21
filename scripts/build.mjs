#!/usr/bin/env node
/**
 * Zero-dependency build for the Jack Higher landing page.
 *
 *   src/index.html  ─┐
 *   src/styles.css   ├─▶ dist/index.html  (CSS, JS, SVG sprite and reviews all inlined)
 *   src/app.js       │
 *   src/data/*.json ─┘
 *   public/**        ──▶ dist/**  (copied as-is: fonts, images, icons)
 *
 * Env:  SITE_URL (or Netlify's URL) — absolute origin for canonical / Open Graph tags.
 */
import { readFile, writeFile, mkdir, cp, readdir, rm, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => path.join(root, 'src', p);
const DIST = path.join(root, 'dist');
const SITE_URL = (process.env.SITE_URL || process.env.URL || 'https://jack-higher.netlify.app').replace(/\/$/, '');

const read = (p) => readFile(p, 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- minifiers (deliberately conservative) ---------- */
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/:\s*(\d)/g, ':$1')
    .trim();
}
function minifyJs(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
}
const minifySvg = (svg) => svg.replace(/>\s+</g, '><').replace(/\n/g, '').trim();

/* ---------- responsive images ---------- */
const imgDir = path.join(root, 'public', 'img');
const imgFiles = new Set(await readdir(imgDir));
const imgMeta = JSON.parse(await read(src('data/images.json')));
const WIDTHS = [480, 800, 1200];

function picture(attrs) {
  const get = (k) => (attrs.match(new RegExp(`${k}="([^"]*)"`)) || [])[1];
  const slug = get('data-pic');
  const meta = imgMeta[slug];
  if (!meta) throw new Error(`Unknown image slug: ${slug}`);
  const widths = WIDTHS.filter((w) => imgFiles.has(`${slug}-${w}.avif`));
  const set = (ext) => widths.map((w) => `/img/${slug}-${w}.${ext} ${w}w`).join(', ');
  const sizes = get('sizes') || '100vw';
  const eager = /\bdata-eager\b/.test(attrs);
  const w = widths[1] || widths[0];
  const h = Math.round((meta.h / meta.w) * w);
  const alt = get('alt') ?? '';
  return `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="/img/${slug}-${w}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${w}" height="${h}" alt="${alt}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
}

/* ---------- reviews ---------- */
const STORE = { 1: 'The OG Place', 2: 'The Lounge' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function initials(name) {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '★';
}
function hue(name) { let h = 0; for (const c of name) h = (h * 31 + c.codePointAt(0)) % 360; return h; }
const stars = '<svg><use href="#i-star"/></svg>'.repeat(5);
function review(r) {
  const [y, m] = r.date.split('-');
  return `<article class="rv" data-store="${r.store}">
<header class="rv__head"><span class="rv__av" style="--h:${hue(r.name)}" aria-hidden="true">${esc(initials(r.name))}</span><div><p class="rv__name">${esc(r.name)}</p><span class="rv__meta">${MONTHS[+m - 1]} ${y} · ${STORE[r.store]}</span></div></header>
<div class="rv__stars" role="img" aria-label="Rated ${r.rating} out of 5">${stars}</div>
<p class="rv__text">${esc(r.text).replace(/\n+/g, '<br>')}</p>
${r.reply ? `<p class="rv__reply"><strong>Jack Higher replied</strong>${esc(r.reply)}</p>` : ''}
<a class="rv__link" href="${esc(r.url)}" target="_blank" rel="noopener nofollow">View on Google<svg class="ico" aria-hidden="true"><use href="#i-ext"/></svg></a>
</article>`;
}

/* ---------- structured data ---------- */
function jsonld() {
  const base = {
    '@type': 'Store',
    telephone: '+66988828822',
    url: `${SITE_URL}/`,
    priceRange: '฿฿',
    parentOrganization: { '@type': 'Organization', name: 'Jack Higher', url: `${SITE_URL}/` },
    sameAs: ['https://www.instagram.com/jackhigherbkk/', 'https://www.facebook.com/profile.php?id=100092378542062', 'https://lin.ee/HHEX6xq'],
  };
  const hours = (days) => [{ '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens: '08:00', closes: '23:59' }];
  const addr = (street) => ({ '@type': 'PostalAddress', streetAddress: street, addressLocality: 'Watthana, Bangkok', postalCode: '10110', addressCountry: 'TH' });
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { ...base, '@id': `${SITE_URL}/#og-place`, name: 'Jack Higher Ekkamai (The OG Place)', image: `${SITE_URL}/img/og-storefront-800.jpg`,
        address: addr('8 Soi Sukhumvit 63, Phra Khanong Nuea'), geo: { '@type': 'GeoCoordinates', latitude: 13.7210536, longitude: 100.584888 },
        hasMap: 'https://maps.google.com/?cid=1968882816502996377',
        openingHoursSpecification: hours(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) },
      { ...base, '@id': `${SITE_URL}/#lounge`, name: 'Jack Higher Sukhumvit 65 (Smoking Lounge)', image: `${SITE_URL}/img/lounge-night-800.jpg`,
        address: addr('19/1 Soi Sukhumvit 65, Phra Khanong Nuea'), geo: { '@type': 'GeoCoordinates', latitude: 13.7189573, longitude: 100.5885062 },
        hasMap: 'https://maps.google.com/?cid=9737774704516356388',
        openingHoursSpecification: hours(['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) },
    ],
  };
}

/* ---------- assemble ---------- */
const [tpl, css, js, sprite, icons, qr, reviews] = await Promise.all([
  read(src('index.html')), read(src('styles.css')), read(src('app.js')),
  read(src('partials/sprite.svg')), read(src('partials/icons.svg')), read(src('partials/line-qr.svg')),
  read(src('data/reviews.json')).then(JSON.parse),
]);

let html = tpl
  .replace('<!-- @css -->', () => minifyCss(css))
  .replace('<!-- @js -->', () => minifyJs(js))
  .replace('<!-- @sprite -->', () => minifySvg(sprite))
  .replace('<!-- @icons -->', () => minifySvg(icons))
  .replaceAll('<!-- @qr -->', () => minifySvg(qr))
  .replace('<!-- @reviews -->', () => reviews.map(review).join('\n'))
  .replace('<!-- @jsonld -->', () => `<script type="application/ld+json">${JSON.stringify(jsonld())}</script>`)
  .replaceAll('{{SITE_URL}}', SITE_URL)
  .replace(/<img ([^>]*data-pic="[^"]+"[^>]*)>/g, (_, a) => picture(a));

// collapse inter-tag whitespace + strip HTML comments (keeps <pre>-free markup intact)
html = html.replace(/<!--(?!\s*@)[\s\S]*?-->/g, '').replace(/>\s*\n\s*</g, '><').replace(/\n{2,}/g, '\n');

const leftovers = html.match(/<!-- @\w+ -->|\{\{\w+\}\}|data-pic=/g);
if (leftovers) throw new Error(`Unresolved template markers: ${[...new Set(leftovers)].join(', ')}`);

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
await cp(path.join(root, 'public'), DIST, { recursive: true });
await writeFile(path.join(DIST, 'index.html'), html);

// sitemap with the real origin
await writeFile(path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc><changefreq>monthly</changefreq></url></urlset>\n`);
await writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
const size = Buffer.byteLength(html);
console.log(`✔ dist/index.html  ${kb(size)} raw · ${kb(gzipSync(html).length)} gzip  (${reviews.length} reviews, site ${SITE_URL})`);
const imgs = await readdir(path.join(DIST, 'img'));
let total = 0; for (const f of imgs) total += (await stat(path.join(DIST, 'img', f))).size;
console.log(`✔ dist/img        ${imgs.length} files · ${kb(total)}`);
