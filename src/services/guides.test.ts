import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { EMAIL, LANG_ORDER, SITE, START, loadContents, pageUrl, pickGuideLang, renderPage, renderSitemap, startHref } from '../../scripts/build-guides.mjs';

// 多語言說明頁(1.6.2):內容完整、互相連結、不連外部、都有寫信邀請
const all = loadContents(join(__dirname, '../../guide/content'));

describe('說明頁內容', () => {
  it('八種語言都在,而且順序固定', () => {
    expect(all.map((c) => c.lang)).toEqual(LANG_ORDER);
  });

  it('每種語言的段落數、常見問題數都和繁體中文一樣,沒有漏翻', () => {
    const base = all[0];
    for (const c of all) {
      expect(c.sections.length, c.lang).toBe(base.sections.length);
      expect(c.faq.items.length, c.lang).toBe(base.faq.items.length);
      expect(c.keywords.length, c.lang).toBeGreaterThanOrEqual(5);
      for (const s of c.sections) expect(s.h2.trim().length, c.lang).toBeGreaterThan(0);
    }
  });

  it('每種語言都有頂端導覽列、大標題、短句、六張卡片、截圖上的按鈕字(1.6.2 首頁改版)', () => {
    for (const c of all) {
      expect(c.heroTitle, c.lang).toBeTruthy();
      expect(c.heroSub, c.lang).toBeTruthy();
      expect(c.navCta, c.lang).toBeTruthy();
      expect(c.shotCta, c.lang).toBeTruthy();
      expect(c.nav?.map((n) => n.id), c.lang).toEqual(['features', 'more', 'faq']);
      expect(c.tiles?.items, c.lang).toHaveLength(6);
      expect(c.tiles?.items.at(-1)?.big, `${c.lang} 介面語言那張卡`).toBe('中 · EN');
    }
  });

  it('每一頁都邀請寫信要語言版本,並提到 RenRen Genogram', () => {
    for (const c of all) {
      expect(c.invite.p.join(' '), c.lang).toContain('{email}');
      expect(JSON.stringify(c), c.lang).toContain('RenRen Genogram');
    }
  });
});

describe('產生的網頁', () => {
  const pages = all.map((c) => ({ c, html: renderPage(c, all) }));

  it('每頁都標出全部語言版本(hreflang)與正式網址', () => {
    for (const { c, html } of pages) {
      for (const o of all) expect(html, `${c.lang} → ${o.lang}`).toContain(`hreflang="${o.lang}" href="${pageUrl(o)}"`);
      expect(html).toContain(`<link rel="canonical" href="${pageUrl(c)}">`);
      expect(html).toContain(`<html lang="${c.htmlLang}">`);
      expect(html).toContain(`mailto:${EMAIL}`);
    }
  });

  it('不載入任何外部資源:沒有外部 script、stylesheet、圖片', () => {
    for (const { c, html } of pages) {
      expect(html, c.lang).not.toMatch(/<script[^>]+src=/);
      expect(html, c.lang).not.toMatch(/<link[^>]+rel="stylesheet"/);
      const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
      for (const src of imgs) expect(src.startsWith('/'), `${c.lang} ${src}`).toBe(true);
    }
  });

  it('「開始畫」按鈕、截圖、導覽列都直接開新圖;中文頁進中文介面,其他語言進英文介面', () => {
    expect(START).toBe('/?start=1');
    for (const { c, html } of pages) {
      const href = c.lang.startsWith('zh') ? '/?start=1' : '/?start=1&amp;lang=en';
      expect(startHref(c).replace('&', '&amp;'), c.lang).toBe(href);
      expect(html, c.lang).toContain(`<a class="cta" href="${href}">`);
      expect(html, c.lang).toContain(`<a class="shot" href="${href}">`);
      expect(html, c.lang).toContain(`<a class="pill" href="${href}">`);
    }
  });

  it('每頁都有自動跳轉語言的內嵌程式(不載入外部檔案),爬蟲不跳', () => {
    for (const { html } of pages) {
      expect(html).toContain('genogram_guide_lang');
      expect(html).toMatch(/bot\|crawl/);
    }
  });

  it('網站地圖列出首頁與每種語言', () => {
    const xml = renderSitemap(all);
    expect(xml).toContain(`<loc>${SITE}/</loc>`);
    for (const c of all) expect(xml).toContain(`<loc>${pageUrl(c)}</loc>`);
  });
});

describe('照瀏覽器語言選說明頁(1.6.2)', () => {
  it.each([
    ['zh-TW', 'zh-Hant'], ['zh-HK', 'zh-Hant'], ['zh', 'zh-Hant'], ['zh-CN', 'zh-Hans'], ['zh-Hans-CN', 'zh-Hans'],
    ['ja-JP', 'ja'], ['ko-KR', 'ko'], ['fr-CA', 'fr'], ['es-MX', 'es'], ['de-AT', 'de'], ['en-GB', 'en'],
    ['pt-BR', 'en'], ['vi', 'en'], ['', 'en'],
  ])('%s → %s', (input, want) => {
    expect(pickGuideLang(input)).toBe(want);
  });
});
