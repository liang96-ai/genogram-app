// ========================================
// 機構 / 網絡單位的「長條盒」—— 尺寸與文字排版的單一來源
// ========================================
// 為什麼要有這個檔:
//   在此之前 180×40 這組數字被抄在 4 個檔案裡(NetworkUnitShape 渲染、PersonShape 的
//   institution 形狀、Line 的接邊裁切、Canvas 的碰撞與框選),改一個地方就會出現
//   「框看得到但點不到」的鬼影。跟 forkGeometry.ts 一樣,幾何只能有一份真相。
//
// 2026-07-21 放大:180×40 → 220×56,並支援兩行,解決機構全名被截斷的問題。
// 高度是「往下長」的(上緣固定),所以單位頂邊的 ▲ 與所有既有連線起點都不會位移。
// ========================================

/** 盒寬(固定,不隨字數變 —— 大小一致畫面才整齊,也讓碰撞/框選維持常數) */
export const UNIT_W = 220;
/** 盒高(固定,可容納兩行) */
export const UNIT_H = 56;
export const UNIT_HALF_W = UNIT_W / 2;
export const UNIT_HALF_H = UNIT_H / 2;

/** 左右內縮,文字可用的寬度 */
const PADDING = 10;
const USABLE = UNIT_W - PADDING * 2;

/**
 * 文字寬度 —— 以「全形字」為單位。
 * ⚠️ 中文是全形(算 1)、英數是半形(算 0.5)。
 * 舊版一律用「字數 × 字級」估寬 = 把英文也當全形,所以英文機構名明明放得下卻被截斷。
 */
export function textWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += isHalfWidth(ch) ? 0.5 : 1;
  return w;
}

function isHalfWidth(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  // ASCII、半形標點、半形片假名
  return c < 0x1100 || (c >= 0xff61 && c <= 0xffdc);
}

/** 在不超過 maxUnits 寬的前提下,回傳可以放進去的字元數 */
function charsThatFit(s: string, maxUnits: number): number {
  let w = 0;
  let n = 0;
  for (const ch of s) {
    const cw = isHalfWidth(ch) ? 0.5 : 1;
    if (w + cw > maxUnits) break;
    w += cw;
    n += ch.length; // 保護 surrogate pair
  }
  return n;
}

/** 字級階梯:先試一行(字大),放不下才換兩行(字變小) */
const ONE_LINE_SIZES = [17, 15, 14];
const TWO_LINE_SIZES = [13, 11, 10];

export type UnitLabel = {
  lines: string[];
  fontSize: number;
  /** 連兩行最小字級都放不下 → 末行已截斷 */
  truncated: boolean;
};

/**
 * 把單位名稱排進固定大小的盒子裡。
 *
 * 斷行規則(使用者可控):
 *   優先在**空白**處斷 —— 想自己決定斷點就在名稱中間打一個空白。
 *   沒有空白就照寬度硬切(中文本來就沒有空白,只能這樣)。
 *   ⚠️ 刻意不支援使用者按 Enter 斷行:那會把換行符號存進 unit.name,
 *      一路汙染匯出的 JSON(iOS 版共用同一份格式)、tooltip 與連線接邊。
 */
export function layoutUnitLabel(name: string, fallback = ''): UnitLabel {
  // ⚠️ 先 trim 再決定要不要用 fallback ——
  // 名稱是「全都是空白」時 `name || fallback` 會選到 name,trim 完變空字串,
  // 結果畫出一個完全空白的框(2026-07-21 測試抓到)。
  const raw = name.trim() || fallback.trim();
  if (!raw) return { lines: [''], fontSize: ONE_LINE_SIZES[0], truncated: false };

  // 一行放得下就用最大能放下的字級
  for (const fontSize of ONE_LINE_SIZES) {
    if (textWidth(raw) <= USABLE / fontSize) {
      return { lines: [raw], fontSize, truncated: false };
    }
  }

  // 換兩行
  for (const fontSize of TWO_LINE_SIZES) {
    const lines = splitBalanced(raw, USABLE / fontSize);
    if (lines) return { lines, fontSize, truncated: false };
  }

  // 兩行也放不下 → 用最小字級塞滿兩行,末行加省略號
  const fontSize = TWO_LINE_SIZES[TWO_LINE_SIZES.length - 1];
  const perLine = USABLE / fontSize;
  const first = raw.slice(0, charsThatFit(raw, perLine));
  const rest = raw.slice(first.length);
  const second = rest.slice(0, charsThatFit(rest, perLine - 1)).trimEnd();
  return {
    lines: [first.trimEnd(), second + '…'],
    fontSize,
    truncated: true,
  };
}

/**
 * 台灣機構名稱的構詞邊界字典 —— 斷行的語意依據。
 *
 * 為什麼需要:純幾何的「從正中間切」會把機構本名攔腰斬斷,例如
 * 「財團法人天主教善牧社會福利基金會」切成「⋯天主教善 / 牧社會福利⋯」——
 * 「善牧」是機構的名字,被切開之後讀的人要愣一下。
 * 中文沒有空白,唯一能依靠的就是這類高頻構詞成分。
 *
 * BREAK_AFTER  = 切點放在這個詞「後面」(法人型態前綴、政府機關)
 * BREAK_BEFORE = 切點放在這個詞「前面」(單位型態後綴、附設關係詞)
 * 長詞排前面 —— 「社會福利基金會」要比「基金會」先被嘗試,斷出來的邊界才漂亮。
 */
const BREAK_AFTER: readonly string[] = [
  '財團法人', '社團法人', '股份有限公司', '有限公司',
  '市政府', '縣政府', '委員會',
];
const BREAK_BEFORE: readonly string[] = [
  '附設', '附屬',
  '社會福利基金會', '福利基金會', '基金會',
  '服務中心', '發展中心', '重建中心', '關懷中心', '中心',
  '協會', '促進會', '工作站', '事務所',
  '醫院', '分院', '診所', '之家', '家園',
  '大學', '學校', '分校', '分局', '分署',
];

/** 全形空白(U+3000)也當空白 —— 使用者複製貼上常混進來 */
const isBreakSpace = (ch: string) => ch === ' ' || ch === '\u3000';

/**
 * 把一段文字拆成兩行;塞不下就回 null(讓呼叫端降字級再試)。
 *
 * 斷點三個層級,高層級直接壓過低層級;同層級取最接近中間的:
 *   2. 使用者自己打的**空白**(半形或全形)—— 人的意圖永遠最大
 *   1. 構詞邊界字典(財團法人|⋯、⋯|附設⋯、⋯|基金會)
 *   0. 都沒有 → 依寬度取最接近正中間的位置(最後手段)
 */
function splitBalanced(s: string, perLine: number): string[] | null {
  if (textWidth(s) <= perLine) return [s];
  const total = textWidth(s);
  if (total > perLine * 2) return null; // 兩行也裝不下

  // 蒐集字典邊界(以「字元索引」記:在該索引「前面」下刀)
  const dictCuts = new Set<number>();
  for (const w of BREAK_AFTER) {
    let at = -1;
    while ((at = s.indexOf(w, at + 1)) !== -1) dictCuts.add(at + w.length);
  }
  for (const w of BREAK_BEFORE) {
    let at = -1;
    while ((at = s.indexOf(w, at + 1)) !== -1) if (at > 0) dictCuts.add(at);
  }

  const target = total / 2;
  const chars = [...s];
  let best: { idx: number; diff: number; tier: number } | null = null;
  let leftW = 0;
  let charIdx = 0; // [...s] 與 s.indexOf 的索引在有 surrogate pair 時會偏移,這裡逐字追蹤

  for (let i = 0; i < chars.length - 1; i++) {
    leftW += isHalfWidth(chars[i]) ? 0.5 : 1;
    charIdx += chars[i].length;
    const rightW = total - leftW;
    if (leftW > perLine || rightW > perLine) continue;
    // 兩行各自至少要有 2 個全形字的份量,不然是「掉字」不是「斷行」
    if (leftW < 2 || rightW < 2) continue;

    const tier = isBreakSpace(chars[i]) || isBreakSpace(chars[i + 1])
      ? 2
      : dictCuts.has(charIdx)
        ? 1
        : 0;
    const diff = Math.abs(leftW - target);
    const better =
      !best || tier > best.tier || (tier === best.tier && diff < best.diff);
    if (better) best = { idx: i + 1, diff, tier };
  }

  if (!best) return null;
  const trimChars = (x: string) => x.replace(/^\s+|\s+$/g, ''); // \s 已含全形空白 U+3000
  const left = trimChars(chars.slice(0, best.idx).join(''));
  const right = trimChars(chars.slice(best.idx).join(''));
  return right ? [left, right] : [left];
}
