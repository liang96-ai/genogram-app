import { describe, expect, it } from 'vitest';
import { segmentProse } from './proseSegment';
import { parseQuickText } from './quickBuild';

describe('段落切分:一段合成的訪視敘述', () => {
  const SAMPLE =
    'case的爸爸45歲電話是09-1234-5678 跟個案關係不好 媽媽40 某某大學 圖書館管理員 寵溺個案 ' +
    '爺爺 100年往生 重男輕女 奶奶中風在家裡面長照照顧 阿蒂 印尼籍 最近跟17歲的哥哥關係很好';

  it('切出五個人,順序與稱謂正確', () => {
    const r = segmentProse(SAMPLE);
    expect(r.segments.map((s) => s.relation)).toEqual([
      '爸爸', '媽媽', '爺爺', '奶奶', '哥哥',
    ]);
  });

  it('欄位抽對:年齡 / 電話 / 往生 / 疾病 / 職業', () => {
    const r = segmentProse(SAMPLE);
    const by = (rel: string) => r.segments.find((s) => s.relation === rel)!;
    expect(by('爸爸').picked.age).toBe('45');
    expect(by('爸爸').picked.phone).toBe('09-1234-5678');
    expect(by('媽媽').picked.age).toBe('40');
    expect(by('媽媽').picked.job).toBe('圖書館管理員');
    expect(by('爺爺').picked.deceased).toBe(true);
    expect(by('爺爺').picked.deathYear).toBe('2011'); // 民國 100 → 西元 2011
    expect(by('奶奶').picked.disease).toContain('中風');
  });

  it('「17歲的哥哥」的年齡要歸給哥哥,不能被奶奶偷走', () => {
    const r = segmentProse(SAMPLE);
    expect(r.segments.find((s) => s.relation === '奶奶')!.picked.age).toBeUndefined();
    expect(r.segments.find((s) => s.relation === '哥哥')!.picked.age).toBe('17');
  });

  it('往生年份不可被吃掉 —— 解析器沒有這個欄位,必須留在備註', () => {
    const r = segmentProse(SAMPLE);
    expect(r.segments.find((s) => s.relation === '爺爺')!.leftover).toContain('100年');
  });

  it('切出來的行,既有解析器五行全部認得出稱謂', () => {
    const r = segmentProse(SAMPLE);
    const parsed = parseQuickText(r.text);
    expect(parsed).toHaveLength(5);
    expect(parsed.every((l) => l.relation !== null)).toBe(true);
    expect(parsed.map((l) => l.relation!.canonical)).toEqual([
      '爸爸', '媽媽', '爺爺', '奶奶', '哥哥',
    ]);
  });

  it('沒有稱謂的片段留在「無法歸類」,不亂猜', () => {
    const r = segmentProse(SAMPLE);
    expect(r.unassigned.join('')).toContain('case的');
    // 「阿蒂 印尼籍」是外籍看護,字典裡沒有這個稱謂 —— 留在備註而不是硬塞給某個人
    expect(r.segments.some((s) => s.leftover.includes('阿蒂'))).toBe(true);
  });
});

describe('切分器的邊界', () => {
  it('空字串不炸', () => {
    expect(segmentProse('').segments).toHaveLength(0);
    expect(segmentProse('   ').segments).toHaveLength(0);
  });

  it('完全沒有稱謂 → 全部歸為無法歸類,不硬切', () => {
    const r = segmentProse('今天天氣很好,個案心情不錯');
    expect(r.segments).toHaveLength(0);
    expect(r.unassigned).toHaveLength(1);
  });

  it('長稱謂優先:「阿嬤」不會被拆成別的詞', () => {
    const r = segmentProse('阿嬤 80 高血壓');
    expect(r.segments.map((s) => s.relation)).toEqual(['阿嬤']);
    expect(r.segments[0].picked.age).toBe('80');
  });

  it('同一個稱謂出現兩次會切成兩段(由使用者自己決定要不要合併)', () => {
    const r = segmentProse('哥哥 20 哥哥很照顧案主');
    expect(r.segments.filter((s) => s.relation === '哥哥').length).toBeGreaterThanOrEqual(2);
  });

  it('已知限制:不支援的稱謂(叔叔)目前不會被切出來', () => {
    // 誠實記錄現況 —— 字典只有 46 個直系稱謂,旁系是 v1.1 的範圍
    const r = segmentProse('叔叔 50 開計程車');
    expect(r.segments).toHaveLength(0);
  });
});

describe('段落切分:往生的說法跟快速建立共用一份', () => {
  it('「已故」「身故」「離世」都認得', () => {
    for (const w of ['已故', '身故', '離世']) {
      const r = segmentProse(`爺爺${w} 奶奶 80`);
      expect(r.segments.find((s) => s.relation === '爺爺')!.picked.deceased, w).toBe(true);
    }
  });

  it('「走了很久」不是過世:整段口語不收「走了」', () => {
    const r = segmentProse('哥哥 17 走了很久才到學校');
    expect(r.segments.find((s) => s.relation === '哥哥')!.picked.deceased).toBeUndefined();
  });
});
