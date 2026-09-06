// 同住圈的形狀(1.5.0 與生態圈統一操作):
// 沒有自訂頂點時,圈是「成員外框 + 內距」的四角形,成員移動就跟著動;
// 使用者在編輯模式拖過把手後,把當下的四角固定成 points,之後行為與生態圈相同。
import type { Household, Person } from '../types/genogram';

export const HOUSEHOLD_PADDING = 28;

export function householdAutoPoints(
  members: Pick<Person, 'position'>[],
  padding = HOUSEHOLD_PADDING,
): { x: number; y: number }[] {
  if (members.length === 0) return [];
  const xs = members.map((m) => m.position.x);
  const ys = members.map((m) => m.position.y);
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const maxX = Math.max(...xs) + padding;
  const maxY = Math.max(...ys) + padding;
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

/** 畫布實際要畫的頂點:自訂優先,否則自動 */
export function householdPoints(hh: Household, persons: Person[]): { x: number; y: number }[] {
  if (hh.points && hh.points.length >= 3) return hh.points;
  const members = persons.filter((p) => hh.memberIds.includes(p.id));
  return householdAutoPoints(members);
}
