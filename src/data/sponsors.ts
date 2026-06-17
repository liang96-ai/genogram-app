// 🗃 DEAD CODE — 贊助者資料(#102 草稿,僅被未啟用的 SponsorWall 引用)2026-06-17
//
// 陣列目前為空、無 PII。保留供 #102 感謝牆未來啟用;不做的話可連同 SponsorWall 一併刪除。
//
// ==================== 贊助者資料(中央管理)====================
//
// 日後加新贊助者只改這一個檔。流程:
//   1. 贊助者來信 → 你回確認(對方需提供:名稱、是否同意公開、logoUrl 可選)
//   2. 把對方加到下方對應陣列
//   3. commit + push,首頁感謝牆自動更新
//
// 注意:對方一定要明確同意「公開展示在首頁」才能加入,否則只能匿名收下贊助。
//
// =============================================================

export type IndividualSponsor = {
  /** 顯示名稱(可化名,以對方同意為準)*/
  name: string;
  /** 加入日期(YYYY-MM)*/
  since?: string;
};

export type OrganizationSponsor = {
  /** 單位名稱(全稱) */
  name: string;
  /** Logo URL — 同意提供才放。建議用 SVG 或 200x80 PNG */
  logoUrl?: string;
  /** 對方官網連結(同意才放) */
  websiteUrl?: string;
  /** 加入日期(YYYY-MM)*/
  since?: string;
};

// 個人贊助者(顯示在首頁左側,小字)
// 留空字陣列 = 顯示「成為第一位贊助者」CTA
export const INDIVIDUAL_SPONSORS: IndividualSponsor[] = [
  // 範例:{ name: '王小明', since: '2026-06' },
];

// 機構贊助者(顯示在首頁右側,Logo + 名稱)
// 留空字陣列 = 顯示「成為第一個贊助單位」CTA
export const ORGANIZATION_SPONSORS: OrganizationSponsor[] = [
  // 範例:
  // {
  //   name: 'XX 基金會',
  //   logoUrl: 'https://example.org/logo.png',
  //   websiteUrl: 'https://example.org',
  //   since: '2026-06',
  // },
];
