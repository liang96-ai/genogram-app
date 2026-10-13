// 多段婚姻自動標序號(1.6.1)。
// 同一個人有兩段以上伴侶關係時,每條線標 1、2、3。順序 = 畫布上伴侶由左到右(家系圖慣例:
// 時間由左往右排);想調順序就把伴侶拖到另一邊。純函式,不改資料。
import type { Line, Person } from '../types/genogram';
import { MARRIAGE_SUBTYPES } from './relationKinds';

export type MarriageOrderBadge = { personId: string; n: number };

export function marriageOrderBadges(persons: Person[], lines: Line[]): Map<string, MarriageOrderBadge> {
  const byId = new Map(persons.map((p) => [p.id, p]));
  const partnerLines = lines.filter(
    (l) => MARRIAGE_SUBTYPES.has(l.subType) && byId.has(l.fromPersonId) && byId.has(l.toPersonId),
  );
  const perPerson = new Map<string, Line[]>();
  for (const l of partnerLines) {
    for (const pid of [l.fromPersonId, l.toPersonId]) {
      const list = perPerson.get(pid) ?? [];
      list.push(l);
      perPerson.set(pid, list);
    }
  }
  const out = new Map<string, MarriageOrderBadge & { count: number }>();
  for (const [pid, list] of perPerson) {
    if (list.length < 2) continue;
    const partnerX = (l: Line) => byId.get(l.fromPersonId === pid ? l.toPersonId : l.fromPersonId)!.position.x;
    const sorted = [...list].sort((x, y) => partnerX(x) - partnerX(y) || x.id.localeCompare(y.id));
    sorted.forEach((l, i) => {
      const prev = out.get(l.id);
      // 兩人都有多段婚姻時,標「婚姻比較多的那位」的序號
      if (!prev || list.length > prev.count) out.set(l.id, { personId: pid, n: i + 1, count: list.length });
    });
  }
  return new Map([...out].map(([id, { personId, n }]) => [id, { personId, n }]));
}
