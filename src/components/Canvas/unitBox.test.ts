import { describe, expect, it } from 'vitest';
import { layoutUnitLabel, textWidth, UNIT_H, UNIT_W } from './unitBox';

describe('textWidth —— 中文全形算 1、英數半形算 0.5', () => {
  it('中文', () => {
    expect(textWidth('社會局')).toBe(3);
  });
  it('英文是一半', () => {
    expect(textWidth('abcdef')).toBe(3);
  });
  it('中英混排', () => {
    expect(textWidth('社會局ab')).toBe(4);
  });
});

describe('layoutUnitLabel —— 固定盒 220×56,字級自動調', () => {
  it('盒子大小是常數,不隨字數改變', () => {
    expect(UNIT_W).toBe(220);
    expect(UNIT_H).toBe(56);
  });

  it('短名 → 一行,字最大', () => {
    const r = layoutUnitLabel('社會局');
    expect(r.lines).toEqual(['社會局']);
    expect(r.fontSize).toBe(17);
    expect(r.truncated).toBe(false);
  });

  it('中等長度 → 仍是一行,字級降一階', () => {
    const r = layoutUnitLabel('臺北市立聯合醫院松德院區');
    expect(r.lines).toHaveLength(1);
    expect(r.fontSize).toBeLessThan(17);
    expect(r.truncated).toBe(false);
  });

  it('長名 → 兩行,完整顯示不截斷', () => {
    const r = layoutUnitLabel('財團法人天主教善牧社會福利基金會');
    expect(r.lines).toHaveLength(2);
    expect(r.lines.join('')).toBe('財團法人天主教善牧社會福利基金會');
    expect(r.truncated).toBe(false);
  });

  it('28 字的機構全名仍完整顯示(舊版會被切一半)', () => {
    const name = '財團法人伊甸社會福利基金會附設臺北市私立習藝職業重建中心';
    const r = layoutUnitLabel(name);
    expect(r.lines.join('')).toBe(name);
    expect(r.truncated).toBe(false);
  });

  it('真的太長才截斷,而且加省略號', () => {
    const r = layoutUnitLabel('財團法人'.repeat(20));
    expect(r.truncated).toBe(true);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[1].endsWith('…')).toBe(true);
  });

  it('英文容量約是中文的兩倍(半形)', () => {
    const zh = '財團法人天主教善牧社會福利基金會附設'; // 18 全形
    const en = 'a'.repeat(36); // 36 半形 = 18 全形
    expect(textWidth(zh)).toBe(textWidth(en));
    // 同樣的寬度 → 同樣的字級,英文不該被提早截斷
    expect(layoutUnitLabel(en).truncated).toBe(false);
    expect(layoutUnitLabel(zh).truncated).toBe(false);
  });

  it('使用者打空白 = 指定斷點', () => {
    const r = layoutUnitLabel('財團法人天主教善牧 社會福利基金會');
    expect(r.lines[0]).toBe('財團法人天主教善牧');
    expect(r.lines[1]).toBe('社會福利基金會');
  });

  // 2026-07-21 概念重做:斷行從「幾何置中」改成「語意邊界優先」。
  // 幾何切法會把機構本名攔腰斬斷(⋯天主教善 / 牧社會福利⋯),讀的人要愣一下。
  it('語意斷行:機構本名不被攔腰斬斷', () => {
    expect(layoutUnitLabel('財團法人天主教善牧社會福利基金會').lines).toEqual([
      '財團法人天主教善牧',
      '社會福利基金會',
    ]);
  });

  it('語意斷行:「附設」帶著後半段走,不留在第一行尾巴', () => {
    expect(
      layoutUnitLabel(
        '財團法人伊甸社會福利基金會附設臺北市私立習藝職業重建中心',
      ).lines,
    ).toEqual(['財團法人伊甸社會福利基金會', '附設臺北市私立習藝職業重建中心']);
  });

  it('全形空白也算使用者指定的斷點', () => {
    expect(layoutUnitLabel('財團法人天主教善牧　社會福利基金會').lines).toEqual([
      '財團法人天主教善牧',
      '社會福利基金會',
    ]);
  });

  it('字典找不到邊界 → 退回置中硬切,兩行長度不能懸殊', () => {
    const r = layoutUnitLabel('伊甸社會福利愛心會館第二服務處隊站'); // 無字典命中的怪名
    expect(r.lines).toHaveLength(2);
    const [a, b] = r.lines.map(textWidth);
    expect(Math.abs(a - b)).toBeLessThanOrEqual(3);
  });

  it('沒有空白就照寬度硬切(中文沒有空白)', () => {
    const r = layoutUnitLabel('財團法人天主教善牧社會福利基金會');
    expect(r.lines[0].length).toBeGreaterThan(0);
    expect(r.lines[1].length).toBeGreaterThan(0);
  });

  it('空名稱用 fallback,不會炸', () => {
    expect(layoutUnitLabel('', '未命名').lines).toEqual(['未命名']);
    expect(layoutUnitLabel('').lines).toEqual(['']);
  });

  // 2026-07-21 測試抓到:名稱「全都是空白」時會畫出完全空白的框
  it('只打空白的名稱也要退回 fallback,不能畫出空框', () => {
    expect(layoutUnitLabel('   ', '未命名').lines).toEqual(['未命名']);
    expect(layoutUnitLabel('\t \n', '未命名').lines).toEqual(['未命名']);
  });

  it('前後空白會被去掉,不影響斷行', () => {
    const a = layoutUnitLabel('  財團法人天主教善牧社會福利基金會  ');
    const b = layoutUnitLabel('財團法人天主教善牧社會福利基金會');
    expect(a.lines).toEqual(b.lines);
  });

  it('連續多個空白 → 斷在空白群,兩行都不會殘留空白', () => {
    const r = layoutUnitLabel('財團法人天主教善牧   社會福利基金會');
    expect(r.lines).toEqual(['財團法人天主教善牧', '社會福利基金會']);
    for (const l of r.lines) expect(l).toBe(l.trim());
  });

  it('空白位置太偏 → 不硬斷在那裡(會讓另一行爆掉)', () => {
    const r = layoutUnitLabel('A 財團法人天主教善牧社會福利基金會');
    // 不該切成 ['A', '財團法人…'] 那種一邊超寬的結果
    const [a, b] = r.lines.map(textWidth);
    expect(Math.min(a, b)).toBeGreaterThan(2);
  });

  it('永遠不超過兩行', () => {
    for (const n of ['社會局', '家扶', '財團法人'.repeat(30), 'x'.repeat(200)]) {
      expect(layoutUnitLabel(n).lines.length).toBeLessThanOrEqual(2);
    }
  });
});
