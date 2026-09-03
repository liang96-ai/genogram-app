// 量表計分「對答案」測試。
// 每個量表的臨床切點都有外部正解(來源標在各 describe),這裡把切點的兩側釘住:
// 差一分就是「輕度 vs 中度」,這種錯不會當機、不會紅燈,只會安靜地錯。
// 標 [freeze] 的是本工具自訂、沒有官方切點的分級 —— 只鎖現況,防止重構時被無意改動。
import { describe, expect, it } from 'vitest';
import type { Scale, ScaleAnswer } from './types';
import { BUILT_IN_SCALES, getScale } from './registry';
import { apgarScale } from './apgarScale';
import { phq9Scale } from './phq9Scale';
import { gad7Scale } from './gad7Scale';
import { bsrs5Scale } from './bsrs5Scale';
import { auditScale } from './auditScale';
import { cageScale } from './cageScale';
import { crafftScale } from './crafftScale';
import { aceScale } from './aceScale';
import { tipvdaScale } from './tipvdaScale';
import { pcl5Scale } from './pcl5Scale';
import { ad8Scale } from './ad8Scale';
import { gds15Scale } from './gds15Scale';
import { barthelScale } from './barthelScale';
import { lawtonIadlScale } from './lawtonIadlScale';

type Answers = Record<string, ScaleAnswer>;

/** likert 題:由前往後填到剛好等於 total */
function likert(scale: Scale, total: number, only?: (id: string) => boolean): Answers {
  const a: Answers = {};
  let r = total;
  for (const q of scale.questions) {
    if (q.type !== 'likert' || (only && !only(q.id))) continue;
    const v = Math.min(r, q.max);
    a[q.id] = v;
    r -= v;
  }
  if (r !== 0) throw new Error(`${scale.id}: total ${total} unreachable`);
  return a;
}
/** boolean 題:前 n 題 true,其餘 false */
function trues(scale: Scale, n: number): Answers {
  const a: Answers = {};
  let k = 0;
  for (const q of scale.questions) {
    if (q.type !== 'boolean') continue;
    a[q.id] = k < n;
    k++;
  }
  if (n > k) throw new Error(`${scale.id}: only ${k} boolean questions`);
  return a;
}
/** choice 題:找一組選項剛好加到 total(選項分數在 value 字串裡) */
function choices(scale: Scale, total: number): Answers {
  const qs = scale.questions.filter((q) => q.type === 'choice') as Extract<
    Scale['questions'][number],
    { type: 'choice' }
  >[];
  const pick: string[] = [];
  const dfs = (i: number, r: number): boolean => {
    if (i === qs.length) return r === 0;
    for (const c of qs[i].choices) {
      const s = parseInt(c.value, 10) || 0;
      if (s <= r) {
        pick[i] = c.value;
        if (dfs(i + 1, r - s)) return true;
      }
    }
    return false;
  };
  if (!dfs(0, total)) throw new Error(`${scale.id}: total ${total} unreachable`);
  const a: Answers = {};
  qs.forEach((q, i) => (a[q.id] = pick[i]));
  return a;
}
const score = (scale: Scale, a: Answers) => scale.scoring(a);
/** 一個切點:低一分是 A、剛好是 B */
function boundary(scale: Scale, build: (n: number) => Answers, cut: number, below: RegExp, at: RegExp) {
  const lo = score(scale, build(cut - 1));
  const hi = score(scale, build(cut));
  expect(lo.totalScore).toBe(cut - 1);
  expect(hi.totalScore).toBe(cut);
  expect(lo.level).toMatch(below);
  expect(hi.level).toMatch(at);
}

describe('registry:已啟用的量表都算得出來', () => {
  it('每個未 disabled 的量表,全 0 / 全滿都不丟例外且回傳三欄', () => {
    for (const s of BUILT_IN_SCALES.filter((x) => !x.disabled)) {
      const zero: Answers = {};
      const full: Answers = {};
      for (const q of s.questions) {
        if (q.type === 'likert') { zero[q.id] = q.min; full[q.id] = q.max; }
        else if (q.type === 'boolean') { zero[q.id] = false; full[q.id] = true; }
        else { zero[q.id] = q.choices[0].value; full[q.id] = q.choices[q.choices.length - 1].value; }
      }
      for (const a of [zero, full]) {
        const r = s.scoring(a);
        expect(typeof r.totalScore).toBe('number');
        expect(r.level.length).toBeGreaterThan(0);
        expect(['green', 'yellow', 'red']).toContain(r.levelColor);
      }
    }
    expect(getScale('phq9')).toBe(phq9Scale);
  });
});

describe('PHQ-9(Kroenke, Spitzer & Williams 2001:5 / 10 / 15 / 20)', () => {
  const b = (n: number) => likert(phq9Scale, n);
  it('切點兩側', () => {
    boundary(phq9Scale, b, 5, /無|極輕微/, /輕度/);
    boundary(phq9Scale, b, 10, /輕度/, /中度/);
    boundary(phq9Scale, b, 15, /^中度/, /中重度/);
    boundary(phq9Scale, b, 20, /中重度/, /重度/);
    expect(score(phq9Scale, b(27)).levelColor).toBe('red');
    expect(score(phq9Scale, b(0)).levelColor).toBe('green');
  });
});

describe('GAD-7(Spitzer 2006:5 / 10 / 15)', () => {
  const b = (n: number) => likert(gad7Scale, n);
  it('切點兩側', () => {
    boundary(gad7Scale, b, 5, /無|極輕微/, /輕度/);
    boundary(gad7Scale, b, 10, /輕度/, /中度/);
    boundary(gad7Scale, b, 15, /中度/, /重度/);
    expect(score(gad7Scale, b(21)).totalScore).toBe(21);
  });
});

describe('BSRS-5(李明濱 2003 / 衛福部:0-5 一般、6-9 輕度、10-14 中度、15+ 重度;第 6 題 ≥2 立即關注)', () => {
  const core = (id: string) => id !== 'q6';
  const b = (n: number) => ({ ...likert(bsrs5Scale, n, core), q6: 0 });
  it('五題總分切點', () => {
    boundary(bsrs5Scale, b, 6, /正常/, /輕度/);
    boundary(bsrs5Scale, b, 10, /輕度/, /中度/);
    boundary(bsrs5Scale, b, 15, /中度/, /重度/);
  });
  it('第 6 題(自殺意念)≥2 → 不論總分都是紅色警示;=1 不觸發', () => {
    expect(score(bsrs5Scale, { ...b(0), q6: 2 }).levelColor).toBe('red');
    expect(score(bsrs5Scale, { ...b(0), q6: 2 }).level).toMatch(/自殺/);
    expect(score(bsrs5Scale, { ...b(0), q6: 1 }).level).toMatch(/正常/);
    // 第 6 題不計入五題總分
    expect(score(bsrs5Scale, { ...b(3), q6: 4 }).totalScore).toBe(3);
  });
});

describe('AUDIT(WHO:8-15 簡短介入、16-19 專業評估、20+ 依賴可能)', () => {
  const b = (n: number) => likert(auditScale, n);
  it('切點兩側(前 8 題足以覆蓋所有切點)', () => {
    boundary(auditScale, b, 8, /低風險/, /中度/);
    boundary(auditScale, b, 16, /中度/, /重度/);
    boundary(auditScale, b, 20, /重度/, /依賴/);
  });
  it('第 9、10 題是選項題,分數存在字串裡,要被算進總分', () => {
    const r = score(auditScale, { ...b(7), q9: '4', q10: '2' });
    expect(r.totalScore).toBe(13);
  });
});

describe('CAGE(Ewing 1984:≥2 陽性)', () => {
  it('1 題陰性、2 題陽性、4 題高度陽性', () => {
    boundary(cageScale, (n) => trues(cageScale, n), 2, /陰性/, /陽性/);
    expect(score(cageScale, trues(cageScale, 4)).level).toMatch(/高度陽性/);
  });
});

describe('CRAFFT(CRAFFT 2.1:≥2 陽性)', () => {
  it('切點', () => {
    boundary(crafftScale, (n) => trues(crafftScale, n), 2, /陰性/, /陽性/);
  });
});

describe('ACE(Felitti 1998:0 / 1-3 / 4-6 / 7+,≥4 為高風險)', () => {
  const b = (n: number) => trues(aceScale, n);
  it('切點兩側', () => {
    expect(score(aceScale, b(0)).level).toBe('無');
    boundary(aceScale, b, 1, /無/, /輕至中度/);
    boundary(aceScale, b, 4, /輕至中度/, /高度/);
    boundary(aceScale, b, 7, /^高度/, /極高度/);
    expect(score(aceScale, b(10)).totalScore).toBe(10);
  });
});

describe('TIPVDA 台灣親密關係暴力危險評估表(衛福部:≥8 高危險)', () => {
  const b = (n: number) => trues(tipvdaScale, n);
  it('8 分高危險;[freeze] 3-7 中度', () => {
    boundary(tipvdaScale, b, 8, /中度/, /高度危險/);
    boundary(tipvdaScale, b, 3, /低度/, /中度/);
    expect(score(tipvdaScale, b(8)).levelColor).toBe('red');
  });
});

describe('PCL-5(美國 VA 國家 PTSD 中心:≥33 達篩檢標準)', () => {
  const b = (n: number) => likert(pcl5Scale, n);
  it('33 分切點;[freeze] 20 分中度', () => {
    boundary(pcl5Scale, b, 33, /中度/, /PTSD/);
    boundary(pcl5Scale, b, 20, /輕微/, /中度/);
    expect(score(pcl5Scale, b(80)).totalScore).toBe(80);
  });
});

describe('AD8(Galvin 2005:≥2 疑似認知障礙)', () => {
  const b = (n: number) => trues(ad8Scale, n);
  it('2 分切點;[freeze] 4 分高度疑似', () => {
    boundary(ad8Scale, b, 2, /無明顯/, /追蹤|疑似/);
    boundary(ad8Scale, b, 4, /追蹤/, /高度疑似/);
  });
});

describe('GDS-15(Sheikh & Yesavage 1986:0-4 正常、5-9 可能憂鬱、10-15 嚴重;反向題 1/5/7/11/13)', () => {
  const reverse = new Set(['q1', 'q5', 'q7', 'q11', 'q13']);
  /** n 分:先擺出 0 分答案(反向題答 Yes、其餘答 No),再翻 n 題 */
  const b = (n: number): Answers => {
    const a: Answers = {};
    for (const q of gds15Scale.questions) a[q.id] = reverse.has(q.id);
    let k = 0;
    for (const q of gds15Scale.questions) {
      if (k >= n) break;
      a[q.id] = !a[q.id];
      k++;
    }
    return a;
  };
  it('反向題:答 No 才得分', () => {
    const zero = b(0);
    expect(score(gds15Scale, zero).totalScore).toBe(0);
    expect(score(gds15Scale, { ...zero, q1: false }).totalScore).toBe(1);
    expect(score(gds15Scale, { ...zero, q2: true }).totalScore).toBe(1);
  });
  it('切點兩側', () => {
    boundary(gds15Scale, b, 5, /正常/, /可能憂鬱/);
    boundary(gds15Scale, b, 10, /可能憂鬱/, /嚴重/);
    expect(score(gds15Scale, b(15)).totalScore).toBe(15);
  });
});

describe('巴氏量表 Barthel(衛福部 / Shah 1989:0-20 完全依賴、21-60 嚴重、61-90 中度、91-99 輕度、100 完全獨立)', () => {
  const b = (n: number) => choices(barthelScale, n);
  it('五個等級(分數只會是 5 的倍數,取每級兩端)', () => {
    expect(score(barthelScale, b(0)).level).toMatch(/完全依賴/);
    expect(score(barthelScale, b(20)).level).toMatch(/完全依賴/);
    expect(score(barthelScale, b(25)).level).toMatch(/嚴重依賴/);
    expect(score(barthelScale, b(60)).level).toMatch(/嚴重依賴/);
    expect(score(barthelScale, b(65)).level).toMatch(/中度依賴/);
    expect(score(barthelScale, b(90)).level).toMatch(/中度依賴/);
    expect(score(barthelScale, b(95)).level).toMatch(/輕度依賴/);
    expect(score(barthelScale, b(100)).level).toMatch(/完全獨立/);
    expect(score(barthelScale, b(100)).totalScore).toBe(100);
  });
});

describe('Lawton IADL [freeze](0-8,無官方分級:7-8 良好、4-6 部分依賴、0-3 高度依賴)', () => {
  const b = (n: number) => trues(lawtonIadlScale, n);
  it('現況分級', () => {
    boundary(lawtonIadlScale, b, 4, /高度依賴/, /部分依賴/);
    boundary(lawtonIadlScale, b, 7, /部分依賴/, /良好/);
  });
});

describe('家庭功能 APGAR(Smilkstein 1978:7-10 高功能、4-6 中度、0-3 低功能)', () => {
  const b = (n: number) => likert(apgarScale, n);
  it('切點兩側', () => {
    boundary(apgarScale, b, 4, /低功能/, /中度/);
    boundary(apgarScale, b, 7, /中度/, /高功能/);
    expect(score(apgarScale, b(10)).totalScore).toBe(10);
  });
});
