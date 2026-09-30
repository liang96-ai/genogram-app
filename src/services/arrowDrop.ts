// 人物四個箭頭「長按拖到別的物件」的落點判斷(1.5.0,純函式,與畫布無關):
//   ← / → 拖到人物:結婚;↑ 拖到人物:對方成為父或母;↑ 拖到婚姻線:那對夫妻成為父母;
//   ↓ 拖到人物:對方成為子女。放在空白處或不合理的目標:什麼都不做。
// 防呆:不能和自己、不能重複建同一條線、不能讓自己變成自己的祖先。
import type { Genogram, Line } from '../types/genogram';
import { MARRIAGE_SUBTYPES, PARENT_CHILD_SUBTYPES } from './relationKinds';

export type ArrowDir = 'up' | 'down' | 'left' | 'right';
export type DropTarget = { type: 'person'; id: string } | { type: 'marriage'; id: string } | null;
export type ArrowDropAction =
  | { kind: 'marry'; a: string; b: string }
  | { kind: 'parents'; childId: string; parentIds: string[]; primary: boolean }
  | { kind: 'none'; reason: 'no-target' | 'self' | 'exists' | 'cycle' | 'kin' | 'unsupported' | 'limit' };

const BIO_LIKE = PARENT_CHILD_SUBTYPES;
const MARRIAGE_LIKE = MARRIAGE_SUBTYPES;
/** 與快捷箭頭加配偶同一條上限:一個人最多 3 段婚姻 */
export const MARRIAGE_LIMIT = 3;
function marriageCount(c: Genogram, id: string): number {
  return c.lines.filter((l) => MARRIAGE_LIKE.has(l.subType) && (l.fromPersonId === id || l.toPersonId === id)).length;
}
const isBio = (l: Line) => BIO_LIKE.has(l.subType);

export function parentsOf(c: Genogram, personId: string): string[] {
  return c.lines.filter((l) => isBio(l) && l.toPersonId === personId).map((l) => l.fromPersonId);
}

/** a 是不是 b 的祖先(沿親子線往上走,含多代) */
export function isAncestor(c: Genogram, a: string, b: string): boolean {
  const seen = new Set<string>();
  const stack = [...parentsOf(c, b)];
  while (stack.length) {
    const p = stack.pop()!;
    if (p === a) return true;
    if (seen.has(p)) continue;
    seen.add(p);
    stack.push(...parentsOf(c, p));
  }
  return false;
}

function memberLineBetween(c: Genogram, a: string, b: string): boolean {
  return c.lines.some(
    (l) =>
      l.category === 'member' &&
      ((l.fromPersonId === a && l.toPersonId === b) || (l.fromPersonId === b && l.toPersonId === a)),
  );
}

function parentsAction(c: Genogram, childId: string, candidates: string[]): ArrowDropAction {
  if (candidates.includes(childId)) return { kind: 'none', reason: 'self' };
  for (const p of candidates) {
    if (isAncestor(c, childId, p)) return { kind: 'none', reason: 'cycle' }; // 子女是候選父母的祖先 → 繞圈
  }
  const existing = new Set(parentsOf(c, childId));
  const parentIds = candidates.filter((p) => !existing.has(p));
  if (parentIds.length === 0) return { kind: 'none', reason: 'exists' };
  // 還沒有父母 → 實線親生;已有父母 → 次要父母(虛線,與「拖線改父母」同規)
  return { kind: 'parents', childId, parentIds, primary: existing.size === 0 };
}

export function resolveArrowDrop(c: Genogram, dir: ArrowDir, sourceId: string, target: DropTarget): ArrowDropAction {
  if (!target) return { kind: 'none', reason: 'no-target' };
  if (target.type === 'person') {
    const t = target.id;
    if (t === sourceId) return { kind: 'none', reason: 'self' };
    if (!c.persons.some((p) => p.id === t)) return { kind: 'none', reason: 'no-target' };
    if (dir === 'left' || dir === 'right') {
      if (memberLineBetween(c, sourceId, t)) return { kind: 'none', reason: 'exists' };
      if (isAncestor(c, sourceId, t) || isAncestor(c, t, sourceId)) return { kind: 'none', reason: 'kin' };
      if (marriageCount(c, sourceId) >= MARRIAGE_LIMIT || marriageCount(c, t) >= MARRIAGE_LIMIT) {
        return { kind: 'none', reason: 'limit' };
      }
      return { kind: 'marry', a: dir === 'right' ? sourceId : t, b: dir === 'right' ? t : sourceId };
    }
    if (dir === 'up') return parentsAction(c, sourceId, [t]);
    return parentsAction(c, t, [sourceId]); // down:對方成為我的子女
  }
  // 婚姻線
  const m = c.lines.find((l) => l.id === target.id);
  if (!m) return { kind: 'none', reason: 'no-target' };
  if (dir !== 'up') return { kind: 'none', reason: 'unsupported' };
  if (m.fromPersonId === sourceId || m.toPersonId === sourceId) return { kind: 'none', reason: 'self' };
  return parentsAction(c, sourceId, [m.fromPersonId, m.toPersonId]);
}
