// 「帶著做一次」的五個步驟(1.6.0)——純資料與判斷,不碰畫面,好測試。
// 每一步 = 畫面上一個真的東西 + 使用者真的做一個動作;做到了就自動下一步。
// 判斷一律「相對這一步開始時」:在已經有資料的個案上重看,也要真的做一次才算。
import type { Genogram } from '../../types/genogram';
import { MARRIAGE_SUBTYPES, ORIGIN_PARENT_SUBTYPES, PARENT_CHILD_SUBTYPES } from '../../services/relationKinds';

export type TourEvent = 'quickBuildApplied' | 'imageExported';
/** 畫面上要框起來的東西 */
export type TourTarget = 'proband' | 'person-basics' | 'editor-menu';

export type TourBaseline = {
  parentLinks: number;
  familyLinks: number;
  /** 這一步開始時每個人的年齡、出生日期、存歿 */
  details: Record<string, string>;
};

export type TourStep = {
  id: 'parents' | 'family' | 'details' | 'quickBuild' | 'export';
  target: TourTarget;
  /** 框裡再畫一圈強調的小東西(案主上方的箭頭) */
  focusArrow?: 'up' | 'side';
  textKey: string;
  done: (c: Genogram, base: TourBaseline, events: ReadonlySet<TourEvent>) => boolean;
};

export function probandIdOf(c: Genogram): string | null {
  return (c.persons.find((p) => p.isProband) ?? c.persons[0])?.id ?? null;
}

/** 案主是不是已經有(原生或法定)爸媽:在舊個案上重看時,第 1 步直接跳過 */
export function probandHasParents(c: Genogram): boolean {
  const id = probandIdOf(c);
  return !!id && c.lines.some((l) => l.toPersonId === id && ORIGIN_PARENT_SUBTYPES.has(l.subType));
}

/** 每個人的年齡、出生日期、存歿 */
export function detailsSignature(c: Genogram): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of c.persons) {
    const b = p.birthDate;
    out[p.id] = `${p.textInfo?.age ?? ''}:${b?.year ?? ''}-${b?.month ?? ''}-${b?.day ?? ''}:${p.lifeStatus ?? ''}`;
  }
  return out;
}

/** 這一步開始時就在的人,有沒有誰的年齡、出生日期或存歿被改了(新增或刪除人物不算) */
export function detailsChanged(c: Genogram, base: Record<string, string>): boolean {
  const now = detailsSignature(c);
  return Object.keys(base).some((id) => id in now && now[id] !== base[id]);
}

export function tourBaseline(c: Genogram): TourBaseline {
  return {
    parentLinks: c.lines.filter((l) => PARENT_CHILD_SUBTYPES.has(l.subType)).length,
    familyLinks: c.lines.filter((l) => PARENT_CHILD_SUBTYPES.has(l.subType) || MARRIAGE_SUBTYPES.has(l.subType)).length,
    details: detailsSignature(c),
  };
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'parents',
    target: 'proband',
    focusArrow: 'up',
    textKey: 'tour.step1',
    done: (c, base) => tourBaseline(c).parentLinks > base.parentLinks,
  },
  {
    id: 'family',
    target: 'proband',
    focusArrow: 'side',
    textKey: 'tour.step2',
    done: (c, base) => tourBaseline(c).familyLinks > base.familyLinks,
  },
  {
    id: 'details',
    target: 'person-basics',
    textKey: 'tour.step3',
    done: (c, base) => detailsChanged(c, base.details),
  },
  {
    id: 'quickBuild',
    target: 'editor-menu',
    textKey: 'tour.step4',
    done: (_c, _base, events) => events.has('quickBuildApplied'),
  },
  {
    id: 'export',
    target: 'editor-menu',
    textKey: 'tour.step5',
    done: (_c, _base, events) => events.has('imageExported'),
  },
];
