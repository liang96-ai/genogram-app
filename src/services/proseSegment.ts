import { RELATION_DICT, BUILTIN_DISEASES } from './quickBuild';

/**
 * 段落切分器(2026-09-01 原型)—— 把「一整段訪視敘述」切成「一行一個人」,
 * 好讓既有的快速建立解析器吃得下。
 *
 * 為什麼需要它:快速建立本來就會解析「爸爸 42 慢性病」這種逐行輸入,
 * 它讀不懂的其實不是內容,而是「沒有斷行的一整段」。所以缺的不是 AI,
 * 是這一層純規則的前處理。
 *
 * 設計原則(跟整個 App 一致):
 *   - **零外連**:純字串處理,不呼叫任何服務,離線可用。
 *   - **不動既有解析器**:這裡只產生文字,產生完就交給 parseQuickText。
 *   - **寧可少切不要亂猜**:切不出來的原封不動留在備註,由使用者自己歸位;
 *     猜錯比不猜更糟 —— 錯的地方會是「誰是誰的媽媽」。
 */

/** 稱謂依長度由長到短排,避免「爸」先匹配到「爸爸」裡面 */
const RELATION_KEYS = Object.keys(RELATION_DICT).sort((a, b) => b.length - a.length);

/** 疾病詞:沿用快速建立的內建清單,同樣長詞優先 */
const DISEASE_KEYS = [...BUILTIN_DISEASES].sort((a, b) => b.length - a.length);

/** 往生的說法 */
const DEATH_WORDS = ['往生', '過世', '去世', '歿', '死亡', '身故', '離世'];

/** 職業線索:出現這些字尾就把整個詞當職業 */
const JOB_SUFFIX = ['管理員', '工程師', '老師', '司機', '護理師', '醫師', '警察', '工人', '農夫', '店員', '業務', '技師', '設計師', '會計', '主任', '經理'];

export type Segment = {
  /** 稱謂原文(例:爸爸) */
  relation: string;
  /** 產生給快速建立吃的那一行 */
  line: string;
  /** 這一段裡沒被歸類、原封不動留著的字 */
  leftover: string;
  /** 抽出來的欄位,給預覽顯示用 */
  picked: {
    age?: string;
    phone?: string;
    disease?: string[];
    job?: string;
    deceased?: boolean;
    deathYear?: string;
  };
};

export type SegmentResult = {
  segments: Segment[];
  /** 完全沒有稱謂、無法歸給任何人的片段(例:「阿蒂 印尼籍」) */
  unassigned: string[];
  /** 產生的完整文字,可直接丟進 parseQuickText */
  text: string;
};

/** 民國年 → 西元年;107 → 2018 */
const rocToAd = (roc: number): number => roc + 1911;

/**
 * 把一段話切成「一行一個人」。
 *
 * 切法:掃描全文找出所有稱謂出現的位置,每個稱謂開一段,
 * 一直延伸到下一個稱謂為止。段內再抽年齡、電話、疾病、職業、往生。
 */
export function segmentProse(input: string): SegmentResult {
  const raw = input.replace(/\s+/g, ' ').trim();
  if (!raw) return { segments: [], unassigned: [], text: '' };

  // ── 1. 找出所有稱謂出現的位置(長詞優先,已佔用的位置不重複匹配)
  type Hit = { idx: number; word: string };
  const taken: boolean[] = new Array(raw.length).fill(false);
  const hits: Hit[] = [];
  for (const key of RELATION_KEYS) {
    let from = 0;
    for (;;) {
      const idx = raw.indexOf(key, from);
      if (idx === -1) break;
      const overlap = taken.slice(idx, idx + key.length).some(Boolean);
      if (!overlap) {
        for (let i = idx; i < idx + key.length; i++) taken[i] = true;
        hits.push({ idx, word: key });
      }
      from = idx + 1;
    }
  }
  hits.sort((a, b) => a.idx - b.idx);

  if (hits.length === 0) {
    return { segments: [], unassigned: [raw], text: '' };
  }

  // ── 2. 每個稱謂開一段,延伸到下一個稱謂
  //    段首的文字(第一個稱謂之前)歸給「無法歸類」
  const unassigned: string[] = [];
  const head = raw.slice(0, hits[0].idx).trim();
  if (head) unassigned.push(head);

  const segments: Segment[] = [];
  /** 上一段結尾的「N歲的」要交給這一段的人 */
  let pendingAge: string | undefined;
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].idx;
    const end = i + 1 < hits.length ? hits[i + 1].idx : raw.length;
    let body = raw.slice(start + hits[i].word.length, end);
    const picked: Segment['picked'] = {};

    // 「最近跟19歲的哥哥」—— 年齡寫在下一個稱謂前面,那是下一個人的年齡。
    // 必須在抽自己的年齡「之前」先把它切掉,否則會被誤認成自己的
    // (實測過:奶奶被安上了哥哥的 19 歲)。
    let ageForNext: string | undefined;
    const trailing = body.match(/(\d{1,3})\s*歲的?\s*$/);
    if (trailing) {
      ageForNext = trailing[1];
      body = body.slice(0, trailing.index).trim();
    }

    // ── 3a. 電話:09xxxxxxxx / 09-xxxx-xxxx / 0x-xxxxxxx
    const phone = body.match(/0\d[\d\-\s]{6,13}\d/);
    if (phone) {
      picked.phone = phone[0].replace(/\s/g, '');
      body = body.replace(phone[0], ' ');
    }

    // ── 3b. 往生 + 民國年 / 西元年
    const deathWord = DEATH_WORDS.find((w) => body.includes(w));
    if (deathWord) {
      picked.deceased = true;
      const roc = body.match(
        /民國\s*(\d{2,3})|(\d{2,3})\s*年(?=[^\d]*(?:往生|過世|去世|歿|死亡|身故|離世))/,
      );
      if (roc) {
        const n = Number(roc[1] ?? roc[2]);
        // 小於 130 視為民國年,換算成西元;其餘視為西元年
        picked.deathYear = String(n < 130 ? rocToAd(n) : n);
        // ⚠️ 年份**不從原文移除**:快速建立的解析器沒有「死亡年份」這個概念
        //    (它只認「歿 + 裸數字 = 享年」),硬塞進去會被解讀成享年。
        //    所以年份原封不動留在備註,使用者看得到、也可以自己填進 Tab1 的死亡日期。
      }
      body = body.replace(deathWord, ' ');
    }

    // ── 3c. 年齡:「42歲」優先;沒有「歲」時取獨立的 1-3 位數
    if (pendingAge) {
      picked.age = pendingAge;
      pendingAge = undefined;
    }
    const ageWithUnit = picked.age ? null : body.match(/(\d{1,3})\s*歲/);
    if (ageWithUnit) {
      picked.age = ageWithUnit[1];
      body = body.replace(ageWithUnit[0], ' ');
    } else if (!picked.age) {
      const bare = body.match(/(?:^|[^\d])(\d{1,3})(?![\d年])/);
      if (bare) {
        picked.age = bare[1];
        body = body.replace(bare[1], ' ');
      }
    }

    // ── 3d. 疾病(內建清單)
    const diseases: string[] = [];
    for (const d of DISEASE_KEYS) {
      if (body.includes(d)) {
        diseases.push(d);
        body = body.replace(d, ' ');
      }
    }
    if (diseases.length) picked.disease = diseases;

    // ── 3e. 職業(字尾線索)
    for (const suf of JOB_SUFFIX) {
      const m = body.match(new RegExp(`[\\u4e00-\\u9fff]{0,4}${suf}`));
      if (m) {
        picked.job = m[0];
        body = body.replace(m[0], ' ');
        break;
      }
    }

    const parts = [hits[i].word];
    if (picked.age) parts.push(picked.age);
    if (picked.deceased) parts.push('歿');
    if (picked.phone) parts.push(picked.phone);
    if (picked.disease) parts.push(...picked.disease);
    if (picked.job) parts.push(picked.job);

    segments.push({
      relation: hits[i].word,
      line: parts.join(' '),
      leftover: body.replace(/\s+/g, ' ').trim(),
      picked,
    });
    pendingAge = ageForNext;
  }

  return {
    segments,
    unassigned,
    text: segments.map((s) => s.line).join('\n'),
  };
}
