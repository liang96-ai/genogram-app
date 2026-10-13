// 多語言說明頁產生器(1.6.2)
//
// guide/content/<語言>.json(內容) → public/guide/…/index.html(8 個純文字網頁)+ public/sitemap.xml
// - 純 HTML + 內嵌 CSS,不載入任何外部資源、不執行程式:搜尋引擎與 AI 爬蟲都讀得到
// - 每頁互相標註其他語言版(hreflang),Google 才會把日文頁給用日文搜尋的人
// - 平常打開 App 的人看不到這些頁面(App 在 /,說明頁在 /guide/)
// 建置時自動執行(package.json 的 build / dev);產出的檔案不進版控。
// 改內容只改 guide/content/*.json;用詞對照在 guide/content/TERMS.md。
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = 'https://genogram.liang96.workers.dev';
/** 說明頁上所有「開始畫」都連到這裡:App 看到 ?start=1 會直接開一張新圖 */
export const START = '/?start=1';
/** 每頁的「開始」:中文頁進中文介面,其他語言的頁進英文介面(App 目前只有這兩種) */
export const startHref = (c) => (c.lang.startsWith('zh') ? START : `${START}&lang=en`);
/** 照瀏覽器語言選說明頁:zh-CN / zh-SG / zh-Hans → 簡中;其他 zh → 繁中;有頁面的語言照用;其他一律英文 */
export function pickGuideLang(browserLang) {
  const l = String(browserLang || 'en').toLowerCase();
  if (l.startsWith('zh')) return /^zh-(cn|sg|hans)/.test(l) ? 'zh-Hans' : 'zh-Hant';
  const base = l.split('-')[0];
  return ['ja', 'ko', 'fr', 'es', 'de', 'en'].includes(base) ? base : 'en';
}
export const EMAIL = 'genogram.feedback@gmail.com';
export const REPO = 'https://github.com/liang96-ai/genogram-app';
/** 語言順序 = 語言切換列的順序;第一個是 /guide/ 本身 */
export const LANG_ORDER = ['zh-Hant', 'en', 'ja', 'ko', 'zh-Hans', 'fr', 'es', 'de'];

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 內文可用 {email} 代表寄信連結、{app} 代表 App 連結;其餘一律跳脫 */
function rich(s) {
  return esc(s)
    .replace(/\{email\}/g, `<a href="mailto:${EMAIL}">${EMAIL}</a>`)
    .replace(/\{app\}/g, '<a href="/">RenRen Genogram</a>');
}

export const pagePath = (c) => (c.path ? `/guide/${c.path}` : '/guide/');
export const pageUrl = (c) => SITE + pagePath(c);

function section(s, i) {
  const parts = [`<h2>${esc(s.h2)}</h2>`];
  for (const p of s.p ?? []) parts.push(`<p class="body">${rich(p)}</p>`);
  if (s.ul) parts.push(`<ul class="cards">${s.ul.map((x) => `<li>${rich(x)}</li>`).join('')}</ul>`);
  if (s.ol) parts.push(`<ol class="steps">${s.ol.map((x) => `<li>${rich(x)}</li>`).join('')}</ol>`);
  const id = s.id ? ` id="${esc(s.id)}"` : '';
  return `<section class="band${i % 2 ? '' : ' alt'}"${id}><div class="inner">${parts.join('\n')}</div></section>`;
}

/** 字數感(中日韓字算 2):短到一兩句話的說明直接顯示,不用按 + 才看得到 */
const SHORT_LIMIT = 90;
const visualLen = (t) => [...String(t)].reduce((n, ch) => n + (/[\u2e80-\uffff]/.test(ch) ? 2 : 1), 0);
const sentences = (t) => String(t).split(/[。！？!?]|\.(?:\s|$)/).filter((x) => x.trim()).length;
export const isShort = (s) => {
  if (s.ul || s.ol) return false;
  const text = (s.p ?? []).join('');
  return sentences(text) <= 1 || visualLen(text) <= SHORT_LIMIT;
};

/** 短的直接顯示;長的摺起來 */
function item(s) {
  if (!isShort(s)) return details(s);
  const id = s.id ? ` id="${esc(s.id)}"` : '';
  return `<div class="qa"${id}><h3>${esc(s.h2)}</h3>${(s.p ?? []).map((p) => `<p>${rich(p)}</p>`).join('')}</div>`;
}

/** 收合段落:預設摺起來(頁面短、不累),內容仍在網頁裡,搜尋引擎照樣讀得到 */
function details(s) {
  const parts = [];
  for (const p of s.p ?? []) parts.push(`<p>${rich(p)}</p>`);
  if (s.ul) parts.push(`<ul>${s.ul.map((x) => `<li>${rich(x)}</li>`).join('')}</ul>`);
  if (s.ol) parts.push(`<ol>${s.ol.map((x) => `<li>${rich(x)}</li>`).join('')}</ol>`);
  const id = s.id ? ` id="${esc(s.id)}"` : '';
  return `<details${id}><summary><h3>${esc(s.h2)}</h3></summary><div class="d-body">${parts.join('\n')}</div></details>`;
}

const CSS = `
:root{--fg:#1d1d1f;--muted:#6e6e73;--line:#d2d2d7;--accent:#0071e3;--accent-hover:#0077ed;--link:#0066cc;--soft:#f5f5f7}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
:lang(ko){word-break:keep-all}
body{margin:0;background:#fff;color:var(--fg);font:17px/1.6 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue","PingFang TC","PingFang SC","Hiragino Sans","Apple SD Gothic Neo","Noto Sans CJK TC","Microsoft JhengHei","Malgun Gothic",sans-serif;letter-spacing:-.01em}
a{color:var(--link);text-decoration:none}
a:hover{text-decoration:underline}
section[id]{scroll-margin-top:60px}
.nav{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.8);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid rgba(0,0,0,.08)}
.nav .inner{max-width:1024px;margin:0 auto;height:52px;padding:0 22px;display:flex;align-items:center;gap:22px}
.nav .brand{font-size:20px;font-weight:600;color:var(--fg);margin-right:auto}
.nav .brand:hover{text-decoration:none}
.nav .item{font-size:13px;color:#424245}
.nav .pill{font-size:13px;background:var(--accent);color:#fff;padding:5px 14px;border-radius:980px;font-weight:500}
.nav .pill:hover{background:var(--accent-hover);text-decoration:none}
.hero{text-align:center;padding:64px 22px 0}
h1.eyebrow{margin:0;font-size:21px;font-weight:600;color:var(--muted);letter-spacing:0}
.hero-title{margin:10px auto 0;max-width:900px;font-size:76px;line-height:1.08;font-weight:700;letter-spacing:-.03em}
.hero-sub{margin:20px 0 0;font-size:28px;font-weight:500;line-height:1.35}
.ctas{margin-top:34px;display:flex;justify-content:center;align-items:center;gap:28px;flex-wrap:wrap}
.cta{display:inline-flex;align-items:center;justify-content:center;gap:12px;padding:24px 64px;background:var(--accent);color:#fff;font-size:27px;font-weight:600;border-radius:980px;box-shadow:0 14px 34px rgba(0,113,227,.35);transition:background .15s ease,transform .15s ease,box-shadow .15s ease}
.cta .arrow{font-size:32px;line-height:1;transition:transform .15s ease}
.cta:hover .arrow{transform:translateX(5px)}
.cta:hover{background:var(--accent-hover);text-decoration:none;transform:scale(1.04);box-shadow:0 18px 40px rgba(0,113,227,.45)}
.cta:active{transform:scale(.98)}
.more{font-size:22px}
.cta-note{margin:18px 0 0;font-size:14px;color:var(--muted)}
.shot{position:relative;display:block;margin:56px auto 0;max-width:1000px;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.16),0 0 0 1px rgba(0,0,0,.06);cursor:pointer;transition:transform .2s ease,box-shadow .2s ease}
.shot img{display:block;width:100%;height:auto;transition:filter .2s ease}
.shot-cta{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);padding:12px 26px;border-radius:980px;background:rgba(0,113,227,.92);color:#fff;font-size:19px;font-weight:600;white-space:nowrap;box-shadow:0 8px 24px rgba(0,113,227,.35);opacity:0;transition:opacity .2s ease}
.shot:hover{text-decoration:none;transform:translateY(-4px);box-shadow:0 36px 90px rgba(0,0,0,.2),0 0 0 1px rgba(0,0,0,.06)}
.shot:hover img{filter:brightness(.96)}
.shot:hover .shot-cta,.shot:focus-visible .shot-cta{opacity:1}
@media (hover:none){.shot-cta{opacity:1;bottom:16px;font-size:16px;padding:9px 20px}}
.intro{max-width:780px;margin:72px auto 0;padding:0 22px;font-size:21px;line-height:1.6;color:#424245;text-align:center}
.tiles-band{background:var(--soft);padding:96px 22px 104px;margin-top:88px}
.tiles-band h2{margin:0 0 48px;font-size:56px;line-height:1.1;text-align:center;letter-spacing:-.03em}
.tiles{max-width:1024px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.tile{background:#fff;border-radius:28px;padding:36px 32px;min-height:190px}
.tile .big{font-size:44px;line-height:1.1;font-weight:700;color:var(--accent);margin-bottom:16px;letter-spacing:-.02em}
.tile h3{margin:0 0 8px;font-size:22px;line-height:1.3}
.tile p{margin:0;font-size:17px;color:var(--muted);line-height:1.5}
.tile.dark{background:#1d1d1f;color:#f5f5f7}
.tile.dark .big{color:#2997ff}
.tile.dark p{color:#a1a1a6}
.band{padding:88px 22px}
.band.alt{background:var(--soft)}
.inner{max-width:980px;margin:0 auto}
h2{margin:0 0 22px;font-size:44px;line-height:1.15;font-weight:700;letter-spacing:-.025em;text-align:center}
.body{max-width:760px;margin:0 auto 14px;font-size:19px;line-height:1.65;color:#424245;text-align:center}
ul.cards{list-style:none;margin:36px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
ul.cards li{background:#fff;border-radius:20px;padding:22px 24px;font-size:17px;line-height:1.55}
.band:not(.alt) ul.cards li{background:var(--soft)}
ol.steps{list-style:none;counter-reset:s;margin:36px auto 0;padding:0;max-width:760px;display:grid;gap:14px}
ol.steps li{counter-increment:s;position:relative;background:#fff;border-radius:20px;padding:20px 24px 20px 78px;font-size:17px;line-height:1.55}
.band:not(.alt) ol.steps li{background:var(--soft)}
ol.steps li::before{content:counter(s);position:absolute;left:22px;top:50%;transform:translateY(-50%);width:38px;height:38px;border-radius:50%;background:var(--accent);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center}
.more-list{max-width:820px;margin:0 auto;border-top:1px solid var(--line)}
details{border-bottom:1px solid var(--line)}
summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 4px}
summary::-webkit-details-marker{display:none}
summary h3{margin:0;font-size:21px;font-weight:600}
summary::after{content:"+";font-size:28px;font-weight:300;color:var(--accent);transition:transform .2s ease}
details[open] summary::after{transform:rotate(45deg)}
.d-body{padding:0 4px 22px;color:#424245;font-size:17px;line-height:1.65}
.d-body ul,.d-body ol{padding-left:1.3em;margin:8px 0}
.d-body li{margin:6px 0}
.pair{max-width:1024px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
.pair h2{text-align:left;font-size:34px;margin-bottom:18px}
.qa{border-bottom:1px solid var(--line);padding:20px 4px}
.qa h3{margin:0 0 6px;font-size:21px;font-weight:600}
.qa p{margin:0;color:#424245;font-size:17px;line-height:1.6}
.invite{max-width:760px;margin:0 auto;text-align:center}
.invite p{font-size:19px;color:#424245}
.faq{max-width:760px;margin:0 auto}
.faq dl{margin:0;border-top:1px solid var(--line)}
.faq dt{font-size:19px;font-weight:600;padding:22px 0 6px}
.faq dd{margin:0;padding:0 0 22px;color:#424245;border-bottom:1px solid var(--line)}
footer{background:var(--soft);padding:26px 22px 40px;font-size:12px;color:var(--muted)}
footer .inner{max-width:980px}
footer .langs{display:flex;flex-wrap:wrap;gap:6px 18px;padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid var(--line);font-size:13px}
footer .langs strong{color:var(--fg)}
@media (max-width:820px){.tiles{grid-template-columns:1fr 1fr}.pair{grid-template-columns:1fr;gap:56px}}
@media (max-width:640px){
  .nav .item{display:none}
  .hero{padding-top:44px}
  .hero-title{font-size:37px}
  .hero-sub{font-size:18px}
  .cta{width:100%;max-width:360px;padding:18px 22px;font-size:19px;white-space:nowrap}
  .cta .arrow{font-size:24px}
  .more{font-size:19px}
  .shot{margin-top:40px;border-radius:14px}
  .intro{font-size:18px;margin-top:52px}
  .tiles-band{padding:64px 18px 72px;margin-top:64px}
  .tiles-band h2{font-size:38px}
  .tiles{grid-template-columns:1fr}
  .band{padding:60px 18px}
  h2{font-size:32px}
  .body{font-size:17px}
}
`;

/**
 * 自動跳到使用者習慣的語言(1.6.2)。
 * - 使用者在頁尾手動選過語言 → 記住(localStorage),以後照那個
 * - 搜尋引擎爬蟲不跳:每個語言頁都要能被收錄(每個網址給所有人的內容一樣,只是真人會被帶到對的那頁)
 */
function redirectScript(c, all) {
  const paths = Object.fromEntries(all.map((o) => [o.lang, pagePath(o)]));
  return `(function(){try{
var KEY='genogram_guide_lang',P=${JSON.stringify(paths)},CUR=${JSON.stringify(c.lang)};
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[hreflang]');if(a)try{localStorage.setItem(KEY,a.getAttribute('hreflang'))}catch(x){}});
if(/bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse/i.test(navigator.userAgent))return;
var saved=null;try{saved=localStorage.getItem(KEY)}catch(x){}
var pick=${pickGuideLang.toString()};
var want=saved&&P[saved]?saved:pick((navigator.languages&&navigator.languages[0])||navigator.language);
if(want!==CUR&&P[want])location.replace(P[want]+location.hash);
}catch(e){}})();`;
}

export function renderPage(c, all) {
  const alternates = all
    .map((o) => `<link rel="alternate" hreflang="${o.lang}" href="${pageUrl(o)}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${pageUrl(all.find((o) => o.lang === 'en') ?? all[0])}">`)
    .join('\n');
  const langLinks = all
    .map((o) =>
      o.lang === c.lang
        ? `<strong>${esc(o.label)}</strong>`
        : `<a href="${pagePath(o)}" hreflang="${o.lang}" lang="${o.lang}">${esc(o.label)}</a>`,
    )
    .join('');
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'RenRen Genogram',
    alternateName: '人人家系圖',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web browser',
    url: SITE + '/',
    inLanguage: c.lang,
    description: c.description,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    license: 'https://www.gnu.org/licenses/agpl-3.0.html',
    author: { '@type': 'Person', name: '梁人人 (Liang RenRen)' },
    screenshot: SITE + '/shots/app-stepfamily.png',
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a.replace(/\{email\}/g, EMAIL).replace(/\{app\}/g, 'RenRen Genogram') } })),
  };
  const heroTitle = c.heroTitle ?? c.h1;
  // 標題可用 \n 指定斷行(中日韓文不靠空白斷字,不指定會斷在字中間)
  const nav = (c.nav ?? [])
    .map((n) => `<a class="item" href="#${esc(n.id)}">${esc(n.label)}</a>`)
    .join('');
  // 按下去直接開一張新圖並開始教學(App 讀 ?start=1)
  const ctas = `<div class="ctas"><a class="cta" href="${esc(startHref(c))}">${esc(c.cta)}<span class="arrow" aria-hidden="true">›</span></a></div>`;
  const tiles = c.tiles
    ? `<section class="tiles-band" id="features"><h2>${esc(c.tiles.h2)}</h2><div class="tiles">${c.tiles.items
        .map(
          (t) =>
            `<div class="tile${t.dark ? ' dark' : ''}"><div class="big">${esc(t.big)}</div><h3>${esc(t.h3)}</h3><p>${rich(t.p)}</p></div>`,
        )
        .join('')}</div></section>`
    : '';
  return `<!doctype html>
<html lang="${c.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.title)}</title>
<meta name="description" content="${esc(c.description)}">
<meta name="keywords" content="${esc(c.keywords.join(', '))}">
<link rel="canonical" href="${pageUrl(c)}">
${alternates}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(c.title)}">
<meta property="og:description" content="${esc(c.description)}">
<meta property="og:url" content="${pageUrl(c)}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(faq)}</script>
<script>${redirectScript(c, all)}</script>
<style>${CSS}</style>
</head>
<body>
<nav class="nav" aria-label="RenRen Genogram"><div class="inner">
<a class="brand" href="${pagePath(c)}">${esc(c.brand ?? '人人家系圖')}</a>
${nav}
<a class="pill" href="${esc(startHref(c))}">${esc(c.navCta ?? c.cta)}</a>
</div></nav>
<main>
<section class="hero">
<h1 class="eyebrow">${esc(c.h1)}</h1>
<p class="hero-title">${esc(heroTitle).replace(/\n/g, '<br>')}</p>
${c.heroSub ? `<p class="hero-sub">${esc(c.heroSub)}</p>` : ''}
${ctas}
<p class="cta-note">${rich(c.ctaNote)}</p>
<a class="shot" href="${esc(startHref(c))}"><img src="/shots/app-stepfamily.png" alt="${esc(c.shotAlt ?? c.h1)}" width="2000" height="1218"><span class="shot-cta">${esc(c.shotCta ?? c.cta)} ›</span></a>
</section>
<p class="intro">${rich(c.lead)}</p>
${tiles}
<section class="band"><div class="pair">
<div id="more"><h2>${esc(c.moreH2 ?? 'Learn more')}</h2>
<div class="more-list">${c.sections.map(item).join('\n')}</div></div>
<div id="faq"><h2>${esc(c.faq.h2)}</h2>
<div class="more-list">${c.faq.items.map((i) => item({ h2: i.q, p: [i.a] })).join('\n')}</div></div>
</div></section>
<section class="band alt"><div class="invite">
<h2>${esc(c.invite.h2)}</h2>
${c.invite.p.map((p) => `<p>${rich(p)}</p>`).join('\n')}
</div></section>
</main>
<footer><div class="inner">
<nav class="langs" aria-label="${esc(c.langNav)}">${langLinks}</nav>
${rich(c.footer)} · <a href="${REPO}">GitHub</a> · AGPL-3.0
</div></footer>
</body>
</html>
`;
}

export function renderSitemap(all) {
  const urls = [{ loc: SITE + '/', alt: false }, ...all.map((c) => ({ loc: pageUrl(c), alt: true }))];
  const altLinks = all
    .map((o) => `<xhtml:link rel="alternate" hreflang="${o.lang}" href="${pageUrl(o)}"/>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map((u) => `<url><loc>${u.loc}</loc>${u.alt ? altLinks : ''}</url>`).join('\n')}
</urlset>
`;
}

export function loadContents(dir) {
  const byLang = new Map();
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    byLang.set(c.lang, c);
  }
  return LANG_ORDER.filter((l) => byLang.has(l)).map((l) => byLang.get(l));
}

export function buildAll(root) {
  const all = loadContents(join(root, 'guide/content'));
  for (const c of all) {
    const out = join(root, 'public', pagePath(c), 'index.html');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderPage(c, all));
  }
  writeFileSync(join(root, 'public/sitemap.xml'), renderSitemap(all));
  return all.length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const n = buildAll(root);
  console.log(`✓ 說明頁:${n} 種語言 + sitemap.xml`);
}
