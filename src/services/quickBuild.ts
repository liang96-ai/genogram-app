// ========================================
// 快速建立(文字輸入自動畫家系圖)— 純函式核心
// ========================================
// 設計原則(工作單 §1):
//   1. 本檔 **不 import store**(吃資料進、吐資料出)→ 單元測試不需要 fake-indexeddb
//   2. 解析器只產生「意圖」,不寫任何座標/幾何 —— 位置全部由既有 store actions 繼承
//   3. 稱謂 = 路徑代數:字典是純資料(爺爺 = [父,父]),走路器 walkPath() 通用,
//      未來加旁系(叔伯姑姨)只要加字典資料,不加程式分支
//   4. plan(預覽)與 execute(執行)共用同一個 walkPath,只換 GraphOps 實作
//      → 預覽說的話不會跟實際結果不一樣
// 零外連:全部字典寫死在本檔,無 fetch / 無 LLM。
// ========================================

import type {
  BasicShape,
  LineSubType,
  MedicalCondition,
  Person,
} from '../types/genogram';

// ==================== 常數(刻意複製,不 import store)====================
// ⚠️ 下面兩個集合是 store 內同名邏輯的鏡射。改 store 時要一起改這裡。
//    刻意不 import genogramStore:那會把 dexie / IndexedDB 拉進純函式測試。

/** 親子線 subType — 對齊 store expandParents(2085-2091)與 expandChildFromMarriage(2299-2309)
 *  ⚠️ 只有這 3 種,不含 'fostered'(與 store 一致,不要「順手補齊」)*/
const PARENT_LINK_SUBTYPES: ReadonlySet<string> = new Set([
  'biological',
  'adopted',
  'placed-out',
]);

/** 婚姻類 subType — 對齊 store MARRIAGE_SUBTYPE_SET(genogramStore.ts:351)*/
const MARRIAGE_SUBTYPES: ReadonlySet<string> = new Set([
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
  'cohabitation-commit',
  'partnership',
  'secret-affair',
  'divorce-remarriage',
]);

/** 同側上限計數白名單 — 對齊 store expandSpouseOrSibling(2143-2152)
 *  ⚠️ 只有 6 種,與 MARRIAGE_SUBTYPES 不同,這是既有行為,不要對齊它 */
const SAME_SIDE_SUBTYPES: ReadonlySet<string> = new Set([
  'marriage',
  'engagement',
  'partnership',
  'cohabitation-commit',
  'divorce',
  'separation',
]);

/** 同側婚姻段數上限 — 對齊 store expandSpouseOrSibling:2164 */
const SAME_SIDE_LIMIT = 3;

/** 對齊 store flipShape(genogramStore.ts:345)*/
const flipShape = (s: BasicShape): BasicShape =>
  s === 'square' ? 'circle' : s === 'circle' ? 'square' : s;

// ==================== 稱謂字典(路徑代數)====================

/** 原子步驟 — 走路器認得的最小單位;新稱謂由這些組合而成,不寫特例分支 */
export type AtomicStep = 'father' | 'mother' | 'spouse' | 'sibling' | 'child';

export type RelationEntry = {
  /** 正規化名稱(顯示用) */
  canonical: string;
  /** 從錨點走到被描述者的路徑 */
  path: AtomicStep[];
  /** 目標形狀;undefined = 由最後一步自行決定(father→square / mother→circle / spouse→flip) */
  shape?: BasicShape;
  /** 前夫 / 前妻:建立後把該段婚姻線改成 'divorce' */
  divorced?: boolean;
};

const rel = (
  canonical: string,
  path: AtomicStep[],
  shape?: BasicShape,
  divorced?: boolean,
): RelationEntry => ({ canonical, path, shape, divorced });

/** v1 稱謂字典 — key = 使用者可能打的詞(全部小寫比對) */
export const RELATION_DICT: Readonly<Record<string, RelationEntry>> = {
  // ---- 父母 ----
  爸爸: rel('爸爸', ['father']),
  爸: rel('爸爸', ['father']),
  父親: rel('爸爸', ['father']),
  父: rel('爸爸', ['father']),
  阿爸: rel('爸爸', ['father']),
  老爸: rel('爸爸', ['father']),
  媽媽: rel('媽媽', ['mother']),
  媽: rel('媽媽', ['mother']),
  母親: rel('媽媽', ['mother']),
  母: rel('媽媽', ['mother']),
  阿母: rel('媽媽', ['mother']),
  老媽: rel('媽媽', ['mother']),
  // ---- 祖父母(父系)----
  爺爺: rel('爺爺', ['father', 'father']),
  祖父: rel('爺爺', ['father', 'father']),
  阿公: rel('爺爺', ['father', 'father']),
  奶奶: rel('奶奶', ['father', 'mother']),
  祖母: rel('奶奶', ['father', 'mother']),
  阿嬤: rel('奶奶', ['father', 'mother']),
  阿媽: rel('奶奶', ['father', 'mother']),
  // ---- 祖父母(母系)----
  外公: rel('外公', ['mother', 'father']),
  外祖父: rel('外公', ['mother', 'father']),
  外婆: rel('外婆', ['mother', 'mother']),
  外祖母: rel('外婆', ['mother', 'mother']),
  // ---- 手足 ----
  哥哥: rel('哥哥', ['sibling'], 'square'),
  哥: rel('哥哥', ['sibling'], 'square'),
  大哥: rel('哥哥', ['sibling'], 'square'),
  兄: rel('哥哥', ['sibling'], 'square'),
  弟弟: rel('弟弟', ['sibling'], 'square'),
  弟: rel('弟弟', ['sibling'], 'square'),
  姊姊: rel('姊姊', ['sibling'], 'circle'),
  姐姐: rel('姊姊', ['sibling'], 'circle'),
  姊: rel('姊姊', ['sibling'], 'circle'),
  姐: rel('姊姊', ['sibling'], 'circle'),
  妹妹: rel('妹妹', ['sibling'], 'circle'),
  妹: rel('妹妹', ['sibling'], 'circle'),
  // ---- 配偶 ----
  配偶: rel('配偶', ['spouse']),
  先生: rel('先生', ['spouse'], 'square'),
  丈夫: rel('先生', ['spouse'], 'square'),
  老公: rel('先生', ['spouse'], 'square'),
  太太: rel('太太', ['spouse'], 'circle'),
  妻子: rel('太太', ['spouse'], 'circle'),
  老婆: rel('太太', ['spouse'], 'circle'),
  前夫: rel('前夫', ['spouse'], 'square', true),
  前妻: rel('前妻', ['spouse'], 'circle', true),
  // ---- 子女 ----
  兒子: rel('兒子', ['child'], 'square'),
  女兒: rel('女兒', ['child'], 'circle'),
  // ---- English ----
  father: rel('father', ['father']),
  dad: rel('father', ['father']),
  mother: rel('mother', ['mother']),
  mom: rel('mother', ['mother']),
  grandfather: rel('grandfather', ['father', 'father']),
  grandpa: rel('grandfather', ['father', 'father']),
  grandmother: rel('grandmother', ['father', 'mother']),
  grandma: rel('grandmother', ['father', 'mother']),
  brother: rel('brother', ['sibling'], 'square'),
  sister: rel('sister', ['sibling'], 'circle'),
  husband: rel('husband', ['spouse'], 'square'),
  wife: rel('wife', ['spouse'], 'circle'),
  'ex-husband': rel('ex-husband', ['spouse'], 'square', true),
  'ex-wife': rel('ex-wife', ['spouse'], 'circle', true),
  son: rel('son', ['child'], 'square'),
  daughter: rel('daughter', ['child'], 'circle'),
};

/** v1 明確不支援的稱謂 —— 解析得出但不建立,預覽標「暫不支援」(旁系需要親屬鏈推導,v1.1) */
export const UNSUPPORTED_RELATIONS: ReadonlySet<string> = new Set([
  '叔叔', '叔', '伯伯', '伯父', '姑姑', '姑媽', '阿姨', '姨媽', '舅舅', '舅父',
  '嬸嬸', '伯母', '姑丈', '姨丈', '舅媽',
  '堂哥', '堂弟', '堂姊', '堂姐', '堂妹', '表哥', '表弟', '表姊', '表姐', '表妹',
  '孫子', '孫女', '外孫', '外孫女', '姪子', '侄子', '姪女', '侄女', '外甥', '外甥女',
  '公公', '婆婆', '岳父', '岳母', '媳婦', '女婿',
  'uncle', 'aunt', 'cousin', 'nephew', 'niece', 'grandson', 'granddaughter',
]);

/** 內建常見疾病字典;實際使用時會併入使用者的 diseaseHistory(本機學習,零雲端) */
export const BUILTIN_DISEASES: readonly string[] = [
  '高血壓', '糖尿病', '心臟病', '中風', '癌症', '失智', '失智症', '憂鬱症',
  '焦慮症', '氣喘', '腎臟病', '洗腎', '肝炎', '肝硬化', '高血脂', '痛風',
  '帕金森氏症', '思覺失調症', '躁鬱症', '癲癇', '肺結核', '骨質疏鬆', '慢性病',
  'hypertension', 'diabetes', 'cancer', 'stroke', 'dementia', 'depression',
  'anxiety', 'asthma', 'epilepsy',
];

const DECEASED_WORDS: ReadonlySet<string> = new Set([
  '歿', '過世', '已故', '走了', '去世', '往生', '死亡',
  'deceased', 'died', 'dead',
]);

const DIVORCED_WORDS: ReadonlySet<string> = new Set([
  '離婚', '已離婚', 'divorced', 'divorce',
]);

// ==================== 1. 解析(每行 = 一個人)====================

export type TokenKind =
  | 'relation'
  | 'age'
  | 'lifeSpan'
  | 'phone'
  | 'deceased'
  | 'divorced'
  | 'disease'
  | 'name'
  | 'note'
  | 'unsupported';

export type ParsedToken = {
  /** 原文 */
  raw: string;
  kind: TokenKind;
  /** 正規化後的值(age → 數字字串;phone → 去掉連字號) */
  value?: string;
  /** 使用者是否可在預覽點擊切換三態(備註 ↔ 姓名 ↔ 疾病) */
  switchable: boolean;
  /** 這個分類是使用者手動改的(不是自動判定)
   *  —— 學習迴圈只吃這種,避免把內建字典詞重複寫回全域清單(工作單 1.5-11) */
  overridden: boolean;
};

export type ParsedLine = {
  lineNo: number;
  raw: string;
  tokens: ParsedToken[];
  relation: RelationEntry | null;
  /** 命中不支援稱謂時的原詞 */
  unsupportedWord?: string;
  name?: string;
  age?: number;
  lifeSpan?: number;
  phones: string[];
  diseases: string[];
  notes: string[];
  deceased: boolean;
  divorced: boolean;
};

/** 使用者在預覽上改過的 token 分類:key = `${lineNo}:${tokenIndex}` */
export type TokenOverrides = Record<string, 'note' | 'name' | 'disease'>;

/** 三態切換順序:備註 → 姓名 → 疾病 → 備註 */
export const CHIP_CYCLE: readonly ('note' | 'name' | 'disease')[] = [
  'note',
  'name',
  'disease',
];

const CJK = /^[一-鿿·‧・]{2,4}$/;

/** 電話:09xxxxxxxx 或 0x-xxxxxxx(允許連字號)*/
function asPhone(raw: string): string | null {
  const digits = raw.replace(/[-\s()]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  if (/^09\d{8}$/.test(digits)) return digits;
  if (/^0\d{1,2}\d{6,8}$/.test(digits) && digits.length >= 9) return digits;
  return null;
}

/** 年齡:`58歲` / `58 years` / 裸數字 ≤120 */
function asAge(raw: string): number | null {
  const m = /^(\d{1,3})\s*(?:歲|y|yo|yrs?)?$/i.exec(raw);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 0 && n <= 120 ? n : null;
}

/**
 * 解析單行文字。
 * @param knownDiseases 使用者本機累積的疾病字典(store.diseaseHistory),由呼叫端注入 — 本檔不碰 store
 */
export function parseQuickLine(
  raw: string,
  lineNo: number,
  knownDiseases: readonly string[] = [],
  overrides: TokenOverrides = {},
): ParsedLine {
  const diseaseSet = new Set(
    [...BUILTIN_DISEASES, ...knownDiseases].map((d) => d.toLowerCase()),
  );
  const words = raw.trim().split(/[\s,、,]+/).filter(Boolean);

  const out: ParsedLine = {
    lineNo,
    raw,
    tokens: [],
    relation: null,
    phones: [],
    diseases: [],
    notes: [],
    deceased: false,
    divorced: false,
  };

  // 第一輪:逐 token 判定 kind(不套 override)。用 for 迴圈是為了能回看前一個 token(姓名猜測)
  const kinds: { kind: TokenKind; value?: string }[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const low = w.toLowerCase();
    // 1. 稱謂(每行只認第一個;後面重複出現的當備註)
    if (!out.relation && !out.unsupportedWord && RELATION_DICT[low]) {
      out.relation = RELATION_DICT[low];
      kinds.push({ kind: 'relation' });
      continue;
    }
    if (!out.relation && !out.unsupportedWord && UNSUPPORTED_RELATIONS.has(low)) {
      out.unsupportedWord = w;
      kinds.push({ kind: 'unsupported' });
      continue;
    }
    // 2. 狀態詞
    if (DECEASED_WORDS.has(low)) {
      kinds.push({ kind: 'deceased' });
      continue;
    }
    if (DIVORCED_WORDS.has(low)) {
      kinds.push({ kind: 'divorced' });
      continue;
    }
    // 3. 電話(先於年齡 — 0912345678 也是一串數字)
    const phone = asPhone(w);
    if (phone) {
      kinds.push({ kind: 'phone', value: phone });
      continue;
    }
    // 4. 年齡
    const age = asAge(w);
    if (age !== null) {
      kinds.push({ kind: 'age', value: String(age) });
      continue;
    }
    // 5. 疾病字典(內建 + 使用者本機累積)
    if (diseaseSet.has(low)) {
      kinds.push({ kind: 'disease' });
      continue;
    }
    // 6. 姓名猜測:2-4 個中文字,且緊跟在稱謂 token 之後
    if (CJK.test(w) && i > 0 && kinds[i - 1]?.kind === 'relation') {
      kinds.push({ kind: 'name' });
      continue;
    }
    // 7. 其他 → 備註(預覽可點擊三態切換)
    kinds.push({ kind: 'note' });
  }

  // 第二輪:套 override(只有可切換的 chip 才吃 override)
  out.tokens = words.map((w, i) => {
    const base = kinds[i];
    const switchable =
      base.kind === 'note' || base.kind === 'name' || base.kind === 'disease';
    const ov = overrides[`${lineNo}:${i}`];
    const kind = switchable && ov ? ov : base.kind;
    return {
      raw: w,
      kind,
      value: base.value,
      switchable,
      overridden: switchable && !!ov && ov !== base.kind,
    };
  });

  // 第三輪:收斂成欄位
  for (const tk of out.tokens) {
    switch (tk.kind) {
      case 'deceased':
        out.deceased = true;
        break;
      case 'divorced':
        out.divorced = true;
        break;
      case 'phone':
        if (tk.value && !out.phones.includes(tk.value)) out.phones.push(tk.value);
        break;
      case 'age':
        if (out.age === undefined && tk.value) out.age = Number(tk.value);
        break;
      case 'disease':
        if (!out.diseases.includes(tk.raw)) out.diseases.push(tk.raw);
        break;
      case 'name':
        if (out.name === undefined) out.name = tk.raw;
        break;
      case 'note':
        out.notes.push(tk.raw);
        break;
      default:
        break;
    }
  }

  // 工作單 1.5-9:「歿 + 裸數字」= 享年,不是年齡
  if (out.deceased && out.age !== undefined) {
    out.lifeSpan = out.age;
    out.age = undefined;
    for (const tk of out.tokens) if (tk.kind === 'age') tk.kind = 'lifeSpan';
  }

  // 前夫 / 前妻本身就帶離婚語意
  if (out.relation?.divorced) out.divorced = true;

  return out;
}

/** 解析整段文字(空行略過,行號從 1 開始且對應原始行) */
export function parseQuickText(
  text: string,
  knownDiseases: readonly string[] = [],
  overrides: TokenOverrides = {},
): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map((raw, i) => ({ raw, lineNo: i }))
    .filter((x) => x.raw.trim().length > 0)
    .map((x) => parseQuickLine(x.raw, x.lineNo, knownDiseases, overrides));
}

// ==================== 2. 走路器(plan / execute 共用)====================

/** 走路器眼中的人 —— position 只用於「同側上限」預檢,不參與真實佈局 */
export type GraphPerson = {
  id: string;
  shape: BasicShape;
  position: { x: number; y: number };
  isProband?: boolean;
};

export type GraphLine = {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  subType: LineSubType;
};

/**
 * 圖操作介面 —— 兩種實作:
 *   - 模擬版(planGraphOps):預覽用,純記憶體,鏡射 store 的 no-op 規則
 *   - 真實版(executor):呼叫既有 store actions,用 person-set diff 取新 id
 * 回傳 null = 該操作被既有 action 視為 no-op(例:已有親子線 / 同側滿 3 段)
 */
export interface GraphOps {
  persons(): GraphPerson[];
  lines(): GraphLine[];
  createParents(childId: string): { fatherId: string; motherId: string } | null;
  createSpouse(
    personId: string,
    side: 'left' | 'right',
  ): { spouseId: string; lineId: string } | null;
  createChildOfMarriage(marriageLineId: string): string | null;
  setShape(personId: string, shape: BasicShape): void;
  setLineSubType(lineId: string, subType: LineSubType): void;
}

export type SkipReason =
  | 'no-anchor'
  | 'parent-incomplete'
  | 'spouse-limit'
  | 'no-parent-marriage'
  | 'op-failed'
  | 'unsupported'
  | 'no-relation'
  | 'prose-like';

/**
 * 「整段社工筆記」防呆門檻 —— 該行無法辨識的備註總字數超過這個值就擋下不建立。
 *
 * 為什麼需要:中文筆記沒有空白,像
 *   `case的爸爸42歲電話是09-8722-2252 跟個案關係不好 媽媽38 ... 爺爺 107年往生 ...`
 * 整段貼進來時,只有剛好被空白包住的「爺爺」會命中字典 → 系統會默默建出爸媽爺奶 4 個人,
 * 再把整段筆記塞進爺爺的備註欄。那是錯誤資料,比「做不出來」更糟。
 *
 * 15 字的取捨:真實整段筆記的備註字數遠超過它;而「爸爸 58歲 目前住在療養院不便探視」
 * 這種單一長備註只有 12 字,仍然放行。
 */
export const PROSE_NOTE_CHARS = 15;

/** 這一行看起來是整段自由文句,而不是「一行一人」的結構化輸入 */
export function looksLikeProse(parsed: ParsedLine): boolean {
  return parsed.notes.join('').length >= PROSE_NOTE_CHARS;
}

export type WalkResult = {
  targetId: string | null;
  /** 走這條路徑時新建的人(含中間人),依建立順序 */
  createdIds: string[];
  /** 與目標相關的婚姻線(離婚 token / 前夫前妻 用) */
  marriageLineId?: string;
  skipReason?: SkipReason;
};

const parentsOf = (ops: GraphOps, childId: string): GraphPerson[] => {
  const ps = ops.persons();
  return ops
    .lines()
    .filter(
      (l) => l.toPersonId === childId && PARENT_LINK_SUBTYPES.has(l.subType),
    )
    .map((l) => ps.find((p) => p.id === l.fromPersonId))
    .filter((p): p is GraphPerson => !!p);
};

const marriagesOf = (ops: GraphOps, personId: string): GraphLine[] =>
  ops
    .lines()
    .filter(
      (l) =>
        MARRIAGE_SUBTYPES.has(l.subType) &&
        (l.fromPersonId === personId || l.toPersonId === personId),
    );

const otherEnd = (l: GraphLine, id: string) =>
  l.fromPersonId === id ? l.toPersonId : l.fromPersonId;

/** 同側婚姻段數 —— 鏡射 store expandSpouseOrSibling:2143-2164 的計數規則 */
function sameSideCount(
  ops: GraphOps,
  personId: string,
  side: 'left' | 'right',
): number {
  const ps = ops.persons();
  const me = ps.find((p) => p.id === personId);
  if (!me) return 0;
  return ops.lines().filter((l) => {
    if (!SAME_SIDE_SUBTYPES.has(l.subType)) return false;
    if (l.fromPersonId !== personId && l.toPersonId !== personId) return false;
    const other = ps.find((p) => p.id === otherEnd(l, personId));
    if (!other) return false;
    const dx = other.position.x - me.position.x;
    return side === 'right' ? dx > 0 : dx < 0;
  }).length;
}

type StepOutcome = {
  id: string | null;
  marriageLineId?: string;
  skipReason?: SkipReason;
};

function stepParent(
  ops: GraphOps,
  currentId: string,
  want: 'father' | 'mother',
  created: string[],
): StepOutcome {
  const wantShape: BasicShape = want === 'father' ? 'square' : 'circle';
  const existing = parentsOf(ops, currentId);
  const hit = existing.find((p) => p.shape === wantShape);
  if (hit) return { id: hit.id };
  // 工作單 1.5-8:expandParents 在「已有任一條親子線」時整個 no-op(單親也擋)
  // 1.5-4:形狀判不出(菱形/機構)也視為找不到 → 一律不硬繞,交給使用者手動補
  if (existing.length > 0) return { id: null, skipReason: 'parent-incomplete' };
  const r = ops.createParents(currentId);
  if (!r) return { id: null, skipReason: 'parent-incomplete' };
  created.push(r.fatherId, r.motherId);
  return { id: want === 'father' ? r.fatherId : r.motherId };
}

function stepSpouse(
  ops: GraphOps,
  currentId: string,
  created: string[],
  opts: { shape?: BasicShape; divorced?: boolean; anyUnion?: boolean },
): StepOutcome {
  const ps = ops.persons();
  const marriages = marriagesOf(ops, currentId);

  // 找既有:形狀符合(有指定才比)+ 離婚狀態符合
  const match = (l: GraphLine) => {
    const other = ps.find((p) => p.id === otherEnd(l, currentId));
    if (!other) return false;
    if (opts.shape && other.shape !== opts.shape) return false;
    if (!opts.anyUnion && (l.subType === 'divorce') !== !!opts.divorced)
      return false;
    return true;
  };
  // anyUnion(子女用):優先非離婚的關係
  const pool = opts.anyUnion
    ? [
        ...marriages.filter((l) => l.subType !== 'divorce'),
        ...marriages.filter((l) => l.subType === 'divorce'),
      ]
    : marriages;
  const found = pool.find(match);
  if (found)
    return { id: otherEnd(found, currentId), marriageLineId: found.id };

  // 沒有 → 建立;先做同側上限預檢(工作單 1.5-13)
  const side: 'left' | 'right' =
    sameSideCount(ops, currentId, 'right') < SAME_SIDE_LIMIT ? 'right' : 'left';
  if (sameSideCount(ops, currentId, side) >= SAME_SIDE_LIMIT)
    return { id: null, skipReason: 'spouse-limit' };

  const r = ops.createSpouse(currentId, side);
  if (!r) return { id: null, skipReason: 'spouse-limit' };
  created.push(r.spouseId);
  const me = ps.find((p) => p.id === currentId);
  if (opts.shape && me && flipShape(me.shape) !== opts.shape)
    ops.setShape(r.spouseId, opts.shape);
  return { id: r.spouseId, marriageLineId: r.lineId };
}

function stepSibling(
  ops: GraphOps,
  currentId: string,
  created: string[],
): StepOutcome {
  // 工作單 1.5-1:expandSpouseOrSibling 沒有手足模式 —— 手足 = 父母婚姻線下的子女
  const f = stepParent(ops, currentId, 'father', created);
  if (!f.id) return f;
  const m = stepParent(ops, currentId, 'mother', created);
  if (!m.id) return m;
  const marriage = ops
    .lines()
    .find(
      (l) =>
        MARRIAGE_SUBTYPES.has(l.subType) &&
        ((l.fromPersonId === f.id && l.toPersonId === m.id) ||
          (l.fromPersonId === m.id && l.toPersonId === f.id)),
    );
  if (!marriage) return { id: null, skipReason: 'no-parent-marriage' };
  const childId = ops.createChildOfMarriage(marriage.id);
  if (!childId) return { id: null, skipReason: 'op-failed' };
  created.push(childId);
  return { id: childId };
}

function stepChild(
  ops: GraphOps,
  currentId: string,
  created: string[],
): StepOutcome {
  // 子女掛在「錨點的婚姻線」下;沒有配偶時自動先建一位(預覽會預告)
  const sp = stepSpouse(ops, currentId, created, { anyUnion: true });
  if (!sp.id || !sp.marriageLineId) return { id: null, skipReason: sp.skipReason ?? 'op-failed' };
  const childId = ops.createChildOfMarriage(sp.marriageLineId);
  if (!childId) return { id: null, skipReason: 'op-failed' };
  created.push(childId);
  return { id: childId };
}

/**
 * 通用走路器 —— 沿稱謂路徑逐步走,每步「先找圖上已存在的人,沒有才建」。
 * 加旁系稱謂 = 在 RELATION_DICT 加一筆資料,**不要**在這裡加分支。
 */
export function walkPath(
  ops: GraphOps,
  anchorId: string,
  entry: RelationEntry,
): WalkResult {
  const created: string[] = [];
  let cur = anchorId;
  let marriageLineId: string | undefined;

  for (let i = 0; i < entry.path.length; i++) {
    const step = entry.path[i];
    const isLast = i === entry.path.length - 1;
    let r: StepOutcome;
    switch (step) {
      case 'father':
      case 'mother':
        r = stepParent(ops, cur, step, created);
        break;
      case 'spouse':
        r = stepSpouse(ops, cur, created, {
          shape: isLast ? entry.shape : undefined,
          divorced: isLast ? entry.divorced : false,
        });
        break;
      case 'sibling':
        r = stepSibling(ops, cur, created);
        break;
      case 'child':
        r = stepChild(ops, cur, created);
        break;
    }
    if (!r.id)
      return { targetId: null, createdIds: created, skipReason: r.skipReason };
    if (r.marriageLineId) marriageLineId = r.marriageLineId;
    cur = r.id;
  }

  // 形狀修正:expandChildFromMarriage 一律建 'square'(工作單 1.5-10)
  const lastStep = entry.path[entry.path.length - 1];
  if (
    entry.shape &&
    (lastStep === 'sibling' || lastStep === 'child') &&
    created.includes(cur)
  ) {
    ops.setShape(cur, entry.shape);
  }

  // 前夫 / 前妻:把該段婚姻線改離婚
  if (entry.divorced && marriageLineId) {
    ops.setLineSubType(marriageLineId, 'divorce');
  }

  return { targetId: cur, createdIds: created, marriageLineId };
}

/**
 * 套用「離婚」意圖(單獨的 `離婚` token;前夫/前妻已在 walkPath 內處理)。
 * plan 與 execute 都要呼叫 —— 否則模擬圖與真實圖會分岔(下一行的子女會掛錯關係線)。
 * @returns 被改成離婚的線 id;找不到婚姻線則 undefined
 */
export function applyDivorceIntent(
  ops: GraphOps,
  targetId: string,
  preferLineId?: string,
): string | undefined {
  const line =
    (preferLineId
      ? ops.lines().find((l) => l.id === preferLineId)
      : undefined) ?? marriagesOf(ops, targetId)[0];
  if (!line) return undefined;
  if (line.subType !== 'divorce') ops.setLineSubType(line.id, 'divorce');
  return line.id;
}

// ==================== 3. 模擬版 GraphOps(預覽用,純記憶體)====================

/** 模擬用的假位置步距 —— 只影響「同側上限」預檢,不參與真實佈局 */
const SIM_STEP = 120;

export function createSimGraphOps(
  persons: readonly GraphPerson[],
  lines: readonly GraphLine[],
): GraphOps & { isSimId: (id: string) => boolean } {
  let ps = persons.map((p) => ({ ...p, position: { ...p.position } }));
  let ls = lines.map((l) => ({ ...l }));
  let seq = 0;
  const simId = (prefix: string) => `sim_${prefix}_${++seq}`;

  return {
    isSimId: (id) => id.startsWith('sim_'),
    persons: () => ps,
    lines: () => ls,
    createParents(childId) {
      const child = ps.find((p) => p.id === childId);
      if (!child) return null;
      // 鏡射 store expandParents:2085-2092 —— 已有任一條親子線就整個 no-op
      if (
        ls.some(
          (l) =>
            l.toPersonId === childId && PARENT_LINK_SUBTYPES.has(l.subType),
        )
      )
        return null;
      const fatherId = simId('f');
      const motherId = simId('m');
      const y = child.position.y - SIM_STEP;
      ps = [
        ...ps,
        { id: fatherId, shape: 'square', position: { x: child.position.x - 60, y } },
        { id: motherId, shape: 'circle', position: { x: child.position.x + 60, y } },
      ];
      ls = [
        ...ls,
        { id: simId('l'), fromPersonId: fatherId, toPersonId: motherId, subType: 'marriage' },
        { id: simId('l'), fromPersonId: fatherId, toPersonId: childId, subType: 'biological' },
        { id: simId('l'), fromPersonId: motherId, toPersonId: childId, subType: 'biological' },
      ];
      return { fatherId, motherId };
    },
    createSpouse(personId, side) {
      const me = ps.find((p) => p.id === personId);
      if (!me) return null;
      const spouseId = simId('s');
      const lineId = simId('l');
      ps = [
        ...ps,
        {
          id: spouseId,
          shape: flipShape(me.shape),
          position: {
            x: me.position.x + (side === 'right' ? SIM_STEP : -SIM_STEP),
            y: me.position.y,
          },
        },
      ];
      ls = [
        ...ls,
        {
          id: lineId,
          fromPersonId: side === 'right' ? personId : spouseId,
          toPersonId: side === 'right' ? spouseId : personId,
          subType: 'marriage',
        },
      ];
      return { spouseId, lineId };
    },
    createChildOfMarriage(marriageLineId) {
      const m = ls.find((l) => l.id === marriageLineId);
      if (!m) return null;
      const a = ps.find((p) => p.id === m.fromPersonId);
      const b = ps.find((p) => p.id === m.toPersonId);
      if (!a || !b) return null;
      const childId = simId('c');
      ps = [
        ...ps,
        {
          id: childId,
          shape: 'square',
          position: {
            x: (a.position.x + b.position.x) / 2,
            y: Math.max(a.position.y, b.position.y) + SIM_STEP,
          },
        },
      ];
      ls = [
        ...ls,
        { id: simId('l'), fromPersonId: a.id, toPersonId: childId, subType: 'biological' },
        { id: simId('l'), fromPersonId: b.id, toPersonId: childId, subType: 'biological' },
      ];
      return childId;
    },
    setShape(personId, shape) {
      ps = ps.map((p) => (p.id === personId ? { ...p, shape } : p));
    },
    setLineSubType(lineId, subType) {
      ls = ls.map((l) => (l.id === lineId ? { ...l, subType } : l));
    },
  };
}

// ==================== 4. Plan(預覽)====================

export type ConflictField = 'name' | 'age' | 'lifeSpan';

export type FieldConflict = {
  field: ConflictField;
  oldValue: string;
  newValue: string;
};

export type LineStatus = 'create' | 'update' | 'skip';

export type LinePlan = {
  parsed: ParsedLine;
  status: LineStatus;
  /** skip 原因(status = 'skip' 時必有) */
  skipReason?: SkipReason;
  /** 目標人物 id(預覽階段可能是模擬 id) */
  targetId: string | null;
  /** true = 目標不在原個案裡(是這批文字前面幾行剛建出來的)
   *  → UI 說「補資料(前面幾行剛建立)」而不是「更新既有」,避免誤導 */
  targetIsNewInBatch: boolean;
  /** 一併建立的中間人(不含目標本人) */
  alsoCreates: string[];
  /** 只有 update 才有:既有值 ≠ 新值且兩者皆非空 */
  conflicts: FieldConflict[];
  /** 會新增的疾病(已扣掉既有) */
  newDiseases: string[];
  /** 會新增的電話(已扣掉既有) */
  newPhones: string[];
  marriageLineId?: string;
};

export type QuickBuildPlan = {
  anchorId: string | null;
  plans: LinePlan[];
  /** 至少有一行可以執行 */
  buildable: boolean;
};

/** 挑錨點(工作單 1.5-3):案主 → 全案僅 1 人 → 都沒有就回 null,由 UI 要求選擇 */
export function pickAnchorId(persons: readonly Person[]): string | null {
  const proband = persons.find((p) => p.isProband);
  if (proband) return proband.id;
  if (persons.length === 1) return persons[0].id;
  return null;
}

const toGraphPerson = (p: Person): GraphPerson => ({
  id: p.id,
  shape: p.shape,
  position: p.position,
  isProband: p.isProband,
});

/**
 * 產生預覽計畫。與執行共用 walkPath,只是換成模擬版 GraphOps
 * → 預覽的「新建 / 更新既有 / 略過」不會跟實際結果不一致(工作單 1.5-7)。
 */
export function buildPlan(input: {
  parsedLines: readonly ParsedLine[];
  persons: readonly Person[];
  lines: readonly GraphLine[];
  anchorId: string | null;
}): QuickBuildPlan {
  const { parsedLines, persons, lines, anchorId } = input;
  const ops = createSimGraphOps(persons.map(toGraphPerson), lines);
  const byId = new Map(persons.map((p) => [p.id, p]));
  const plans: LinePlan[] = [];

  for (const parsed of parsedLines) {
    const base: Omit<LinePlan, 'status'> = {
      parsed,
      targetId: null,
      targetIsNewInBatch: false,
      alsoCreates: [],
      conflicts: [],
      newDiseases: [],
      newPhones: [],
    };
    if (parsed.unsupportedWord) {
      plans.push({ ...base, status: 'skip', skipReason: 'unsupported' });
      continue;
    }
    if (!parsed.relation) {
      plans.push({ ...base, status: 'skip', skipReason: 'no-relation' });
      continue;
    }
    // 有命中稱謂,但整行看起來是自由文句 → 擋下(不然會建出一堆人 + 整段塞進備註)
    if (looksLikeProse(parsed)) {
      plans.push({ ...base, status: 'skip', skipReason: 'prose-like' });
      continue;
    }
    if (!anchorId) {
      plans.push({ ...base, status: 'skip', skipReason: 'no-anchor' });
      continue;
    }

    const r = walkPath(ops, anchorId, parsed.relation);
    if (!r.targetId) {
      plans.push({ ...base, status: 'skip', skipReason: r.skipReason });
      continue;
    }

    // 「新建」= 這一行真的建出了目標本人;若目標是前面幾行建的(或原本就在),都算「更新」
    const createsTarget = r.createdIds.includes(r.targetId);
    const existing = ops.isSimId(r.targetId) ? undefined : byId.get(r.targetId);
    const alsoCreates = r.createdIds.filter((id) => id !== r.targetId);
    // 單獨的「離婚」token 也要在模擬圖套用,否則下一行的子女會掛到錯的關係線
    const marriageLineId = parsed.divorced
      ? applyDivorceIntent(ops, r.targetId, r.marriageLineId)
      : r.marriageLineId;

    // 衝突:既有值 ≠ 新值,且兩者皆非空(工作單 §3)
    const conflicts: FieldConflict[] = [];
    if (existing) {
      const push = (
        field: ConflictField,
        oldV: string | number | undefined,
        newV: string | number | undefined,
      ) => {
        if (oldV === undefined || oldV === '' || newV === undefined) return;
        if (String(oldV) === String(newV)) return;
        conflicts.push({
          field,
          oldValue: String(oldV),
          newValue: String(newV),
        });
      };
      push('name', existing.basicInfo?.name, parsed.name);
      push('age', existing.textInfo?.age, parsed.age);
      push('lifeSpan', existing.textInfo?.lifeSpan, parsed.lifeSpan);
    }

    const existingDiseases = (existing?.medicalConditions ?? []).map(
      (c: MedicalCondition) => c.name,
    );
    const existingPhones = (existing?.basicInfo?.phones ?? []).map(
      (p) => p.value,
    );

    plans.push({
      ...base,
      status: createsTarget ? 'create' : 'update',
      targetId: r.targetId,
      targetIsNewInBatch: !existing,
      alsoCreates,
      conflicts,
      newDiseases: parsed.diseases.filter((d) => !existingDiseases.includes(d)),
      newPhones: parsed.phones.filter((p) => !existingPhones.includes(p)),
      marriageLineId,
    });
  }

  return {
    anchorId,
    plans,
    buildable: plans.some((p) => p.status !== 'skip'),
  };
}

/** 使用者在預覽上的取捨:key = `${lineNo}:${field}` / `${lineNo}:disease:${name}` → 是否套用 */
export type ApplyDecisions = Record<string, boolean>;

export const conflictKey = (lineNo: number, field: ConflictField) =>
  `${lineNo}:${field}`;
export const diseaseKey = (lineNo: number, name: string) =>
  `${lineNo}:disease:${name}`;

/** 學習迴圈防呆(工作單 1.5-11):只有夠短、不含數字的詞才進全域疾病字典 */
export function isLearnableDisease(word: string): boolean {
  const t = word.trim();
  return t.length > 0 && t.length <= 12 && !/\d/.test(t);
}
