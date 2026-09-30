// ========================================
// 線型分類 ——「哪些線算什麼關係」的唯一出處(2026-09-30)
// ========================================
// 以前散在十幾處各寫一份,內容已經對不上:
//   「這個人有沒有父母」畫布算 4 種線、新增父母算 3 種;
//   「婚姻類」快速建立的預覽算 6 種、實際新增算 15 種 —— 預覽說的跟畫出來的會不一樣。
// 現在全部從這裡引用;eslint.config.js 禁止在別的檔案自己列。
// 本檔不 import store(純資料),快速建立的純函式測試也能直接用。
// 幾個集合的成員不同是刻意的,每個都寫明用途;要改成員,先想清楚是哪一種判斷。
import type { LineSubType } from '../types/genogram';

/** 婚姻類:含已改名的舊線型(匯入舊檔時要認得,開檔遷移會轉成現行名稱) */
export const MARRIAGE_SUBTYPES: ReadonlySet<LineSubType> = new Set<LineSubType>([
  'marriage',
  'engagement',
  'cohabitation',
  'legal-cohabitation',
  'engagement-cohabitation',
  'separation',
  'legal-separation',
  'engagement-separation',
  'divorce',
  'widowed',
  'love-affair',
  // 舊名(向後相容)
  'cohabitation-commit',
  'partnership',
  'secret-affair',
  'divorce-remarriage',
]);

/** 外遇類:找「這個人的伴侶關係」掛子女時排在最後,有其他伴侶關係就先用那一條 */
export const AFFAIR_SUBTYPES: ReadonlySet<LineSubType> = new Set<LineSubType>([
  'love-affair',
  'secret-affair',
]);

/** 點婚姻線快速切換狀態時,在「結婚 → 離婚 → 訂婚」之間輪換的線。
 *  這是 1.0 留下的規則:只含當時的婚姻類線型,後來新增的同居、喪偶等不參與輪換。 */
export const CYCLING_MARRIAGE_SUBTYPES: ReadonlySet<LineSubType> = new Set<LineSubType>([
  'marriage',
  'divorce',
  'engagement',
  'cohabitation-commit',
  'partnership',
  'separation',
  'secret-affair',
  'divorce-remarriage',
]);

/** 所有親子類的線:「這是不是親子線」、刪除時的配對線、避免重複加父母 */
export const PARENT_CHILD_SUBTYPES: ReadonlySet<LineSubType> = new Set<LineSubType>([
  'biological',
  'adopted',
  'placed-out',
  'fostered',
  'sperm-donor',
]);

/** 一般親子線(不含捐精):畫在夫妻下方、算「這對夫妻的子女」、畫布判斷「有沒有父母」、
 *  實線/虛線切換。捐精者另外畫,不算。 */
export const STANDARD_PARENT_CHILD_SUBTYPES: ReadonlySet<LineSubType> = new Set<LineSubType>([
  'biological',
  'adopted',
  'placed-out',
  'fostered',
]);

/** 快捷「加父母」與快速建立判斷「已經有爸媽了」:只看原生與法定父母。
 *  寄養、捐精不算 —— 寄養中的孩子仍然可以補上原生父母。 */
export const ORIGIN_PARENT_SUBTYPES: ReadonlySet<LineSubType> = new Set<LineSubType>([
  'biological',
  'adopted',
  'placed-out',
]);

/** 由某人連出去的「次要」親子線:出養、寄養、捐精 */
export const SECONDARY_PARENT_SUBTYPES: ReadonlySet<LineSubType> = new Set<LineSubType>([
  'placed-out',
  'fostered',
  'sperm-donor',
]);
