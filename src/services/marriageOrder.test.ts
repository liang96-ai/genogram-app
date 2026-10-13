import { describe, expect, it } from 'vitest';
import type { Line, Person } from '../types/genogram';
import { marriageOrderBadges } from './marriageOrder';

const person = (id: string, x: number): Person =>
  ({ id, name: id, position: { x, y: 0 } }) as unknown as Person;
const partner = (id: string, from: string, to: string, subType: Line['subType'] = 'marriage'): Line =>
  ({ id, fromPersonId: from, toPersonId: to, category: 'member', subType, visual: {} }) as unknown as Line;

describe('marriageOrderBadges:多段婚姻序號', () => {
  it('只有一段婚姻 → 不標', () => {
    const r = marriageOrderBadges([person('a', 0), person('b', 100)], [partner('m1', 'a', 'b')]);
    expect(r.size).toBe(0);
  });

  it('三段伴侶關係 → 依伴侶由左到右標 1、2、3(離婚、同居也算)', () => {
    const persons = [person('dad', 0), person('ex1', -200), person('ex2', 200), person('now', 400)];
    const lines = [
      partner('m-now', 'dad', 'now', 'marriage'),
      partner('m-ex1', 'ex1', 'dad', 'divorce'),
      partner('m-ex2', 'dad', 'ex2', 'cohabitation'),
    ];
    const r = marriageOrderBadges(persons, lines);
    expect(r.get('m-ex1')).toEqual({ personId: 'dad', n: 1 });
    expect(r.get('m-ex2')).toEqual({ personId: 'dad', n: 2 });
    expect(r.get('m-now')).toEqual({ personId: 'dad', n: 3 });
  });

  it('親子線、關係線不算伴侶關係', () => {
    const persons = [person('a', 0), person('b', 100), person('c', 200)];
    const lines = [partner('m1', 'a', 'b'), partner('bio', 'a', 'c', 'biological'), partner('rel', 'a', 'c', 'close')];
    expect(marriageOrderBadges(persons, lines).size).toBe(0);
  });

  it('兩人都有多段婚姻 → 標婚姻比較多的那位', () => {
    const persons = [person('a', 0), person('b', 100), person('x', -100), person('y', 200), person('z', 300)];
    const lines = [partner('ab', 'a', 'b'), partner('ax', 'a', 'x'), partner('by', 'b', 'y'), partner('bz', 'b', 'z')];
    const r = marriageOrderBadges(persons, lines);
    expect(r.get('ab')?.personId).toBe('b'); // b 有三段,a 只有兩段
    expect(r.get('ab')?.n).toBe(1);
  });
});
