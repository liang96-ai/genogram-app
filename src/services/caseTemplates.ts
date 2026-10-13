// 範本(1.6.1):新增個案時選一種常見家庭型態,直接從一張畫好的圖開始。
// 做法和使用者按箭頭一模一樣(加父母 / 加配偶 / 加子女),位置由既有的擺放規則決定,
// 不另外寫一套座標。人物只填稱謂和年齡,沒有任何真實姓名。
// 套用後清空復原紀錄:第一下復原不會把範本拆掉一半。
import type { Line, Person } from '../types/genogram';
import { useGenogramStore } from '../store/genogramStore';
import { MARRIAGE_SUBTYPES } from './relationKinds';

export const TEMPLATE_IDS = ['nuclear', 'single-parent', 'grandparent', 'stepfamily', 'rotating'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

type Lang = 'zh' | 'en';
const TITLES: Record<string, { zh: string; en: string }> = {
  client: { zh: '案主', en: 'Client' },
  father: { zh: '爸爸', en: 'Father' },
  mother: { zh: '媽媽', en: 'Mother' },
  sister: { zh: '妹妹', en: 'Sister' },
  grandfather: { zh: '爺爺', en: 'Grandfather' },
  grandmother: { zh: '奶奶', en: 'Grandmother' },
  stepfather: { zh: '繼父', en: 'Stepfather' },
  brother: { zh: '哥哥', en: 'Brother' },
  sisterInLaw: { zh: '大嫂', en: 'Sister-in-law' },
  husband: { zh: '先生', en: 'Husband' },
  worksAway: { zh: '外地工作', en: 'Works in another city' },
};
let lang: Lang = 'zh';
const tt = (k: keyof typeof TITLES) => TITLES[k][lang];

const S = () => useGenogramStore.getState();
const cur = () => {
  const c = S().currentCase;
  if (!c) throw new Error('no-case');
  return c;
};

/** 執行一個動作,回傳它新建的人 */
function run(fn: () => void): Person[] {
  const before = new Set(cur().persons.map((p) => p.id));
  fn();
  return cur().persons.filter((p) => !before.has(p.id));
}

function label(id: string, title: string, age?: number, extra: Partial<Person> = {}): void {
  const p = cur().persons.find((x) => x.id === id);
  if (!p) return;
  S().updatePerson(id, {
    basicInfo: { ...p.basicInfo, name: title },
    ...(age !== undefined ? { textInfo: { ...p.textInfo, age } } : {}),
    ...extra,
  });
}

function partnerLine(a: string, b: string): Line {
  const l = cur().lines.find(
    (x) =>
      MARRIAGE_SUBTYPES.has(x.subType) &&
      ((x.fromPersonId === a && x.toPersonId === b) || (x.fromPersonId === b && x.toPersonId === a)),
  );
  if (!l) throw new Error('no-marriage');
  return l;
}

function addParents(childId: string, father: [string, number], mother: [string, number]) {
  const made = run(() => S().expandParents(childId));
  const dad = made.find((p) => p.shape === 'square') ?? made[0];
  const mom = made.find((p) => p.id !== dad.id) ?? made[1];
  label(dad.id, father[0], father[1]);
  label(mom.id, mother[0], mother[1]);
  return { dad: dad.id, mom: mom.id, marriage: partnerLine(dad.id, mom.id).id };
}

function addChild(marriageId: string, title: string, age: number, shape: 'square' | 'circle'): string {
  const [c] = run(() => S().expandChildFromMarriage(marriageId));
  label(c.id, title, age, { shape });
  return c.id;
}

/** 配偶加在「離另一位伴侶遠的那一側」,不跟既有婚姻疊在一起 */
function addSpouse(personId: string, title: string, age: number, awayFrom?: string): { id: string; marriage: string } {
  const me = cur().persons.find((p) => p.id === personId)!;
  const other = awayFrom ? cur().persons.find((p) => p.id === awayFrom) : undefined;
  const dir = other && other.position.x > me.position.x ? 'left' : 'right';
  const [s] = run(() => S().expandSpouseOrSibling(personId, dir));
  label(s.id, title, age);
  return { id: s.id, marriage: partnerLine(personId, s.id).id };
}

function household(memberIds: string[], rotating = false): void {
  S().addHousehold(memberIds);
  const hh = (cur().households ?? []).at(-1);
  if (hh && rotating) S().updateHousehold(hh.id, { rotating: true });
}

const BUILDERS: Record<TemplateId, (probandId: string) => void> = {
  // 核心家庭:爸爸、媽媽、案主、妹妹,同住
  nuclear(me) {
    label(me, tt('client'), 14, { shape: 'square' });
    const p = addParents(me, [tt('father'), 45], [tt('mother'), 43]);
    const sis = addChild(p.marriage, tt('sister'), 10, 'circle');
    household([p.dad, p.mom, me, sis]);
  },
  // 單親家庭:父母離婚,案主和媽媽同住
  'single-parent'(me) {
    label(me, tt('client'), 12, { shape: 'circle' });
    const p = addParents(me, [tt('father'), 40], [tt('mother'), 38]);
    S().updateLine(p.marriage, { subType: 'divorce' });
    household([p.mom, me]);
  },
  // 隔代教養:父母離婚、爸爸在外地工作,案主和爺爺奶奶同住
  grandparent(me) {
    label(me, tt('client'), 9, { shape: 'square' });
    const p = addParents(me, [tt('father'), 35], [tt('mother'), 33]);
    S().updateLine(p.marriage, { subType: 'divorce' });
    S().updatePerson(p.dad, { notes: tt('worksAway') });
    const g = addParents(p.dad, [tt('grandfather'), 66], [tt('grandmother'), 63]);
    household([g.dad, g.mom, me]);
  },
  // 重組家庭:父母離婚,媽媽再婚,與繼父生了妹妹(媽媽的兩段婚姻會自動標 1、2)
  stepfamily(me) {
    label(me, tt('client'), 13, { shape: 'square' });
    const p = addParents(me, [tt('father'), 42], [tt('mother'), 39]);
    S().updateLine(p.marriage, { subType: 'divorce' });
    const step = addSpouse(p.mom, tt('stepfather'), 45, p.dad);
    const sis = addChild(step.marriage, tt('sister'), 4, 'circle');
    household([p.mom, step.id, me, sis]);
  },
  // 長輩輪住:爸爸過世,媽媽輪流住在哥哥家和案主家(兩個輪住圈)
  rotating(me) {
    label(me, tt('client'), 48, { shape: 'circle' });
    const p = addParents(me, [tt('father'), 80], [tt('mother'), 78]);
    S().updatePerson(p.dad, { lifeStatus: 'deceased' });
    const bro = addChild(p.marriage, tt('brother'), 52, 'square');
    const sil = addSpouse(bro, tt('sisterInLaw'), 50, me);
    const hus = addSpouse(me, tt('husband'), 50, bro);
    household([p.mom, bro, sil.id], true);
    household([p.mom, me, hus.id], true);
  },
};

/** 在目前開著的個案套用範本(個案應該只有案主一個人)。成功回傳 true。 */
export function applyTemplate(id: TemplateId, language: Lang = 'zh'): boolean {
  lang = language;
  const c = S().currentCase;
  const proband = c?.persons.find((p) => p.isProband) ?? c?.persons[0];
  if (!c || !proband) return false;
  const before = c;
  try {
    BUILDERS[id](proband.id);
  } catch {
    useGenogramStore.setState({ currentCase: before });
    return false;
  }
  useGenogramStore.setState({
    history: { past: [], future: [] },
    selectedPersonIds: [],
    selectedLineIds: [],
    selectedHouseholdId: null,
  });
  return true;
}
