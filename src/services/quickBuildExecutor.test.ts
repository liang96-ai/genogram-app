// 執行層整合測試 —— 跑「真實」的 store actions(expandParents / expandSpouseOrSibling /
// expandChildFromMarriage / updatePerson),不是 mock。
// 這裡是純函式測試蓋不到、也最容易出事的一段:person-set diff 取新 id、單一 undo 快照、
// textInfo / medicalConditions 的 read-modify-write。
//
// 註:store 只在「持久化」時碰 IndexedDB(且都有 .catch),action 本身是純記憶體 —— 所以
// node 環境可以直接跑,不需要 fake-indexeddb。
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createEmptyCase,
  MAX_HISTORY,
  useGenogramStore,
} from '../store/genogramStore';
import type { Genogram, Person } from '../types/genogram';
import { isValidGenogram } from './exportImport';
import {
  buildPlan,
  parseQuickText,
  pickAnchorId,
  type ApplyDecisions,
} from './quickBuild';
import { executeQuickBuild } from './quickBuildExecutor';

const ACCEPTANCE = [
  '爸爸 58歲 高血壓 0912345678',
  '媽媽 55 糖尿病',
  '爺爺 歿',
  '哥哥 32',
  '前妻 離婚',
  '兒子 5',
].join('\n');

function seed(): Genogram {
  const c = createEmptyCase('測試個案');
  useGenogramStore.setState({
    currentCase: c,
    history: { past: [], future: [] },
  });
  return c;
}

function run(text: string, decisions: ApplyDecisions = {}) {
  const c = useGenogramStore.getState().currentCase!;
  const anchorId = pickAnchorId(c.persons)!;
  const plan = buildPlan({
    parsedLines: parseQuickText(text, useGenogramStore.getState().diseaseHistory),
    persons: c.persons,
    lines: c.lines,
    anchorId,
  });
  const outcome = executeQuickBuild(plan.plans, anchorId, decisions);
  return { plan, outcome, after: useGenogramStore.getState().currentCase! };
}

const BIO = new Set(['biological', 'adopted', 'placed-out']);
const parentsOf = (g: Genogram, id: string) =>
  g.lines
    .filter((l) => l.toPersonId === id && BIO.has(l.subType))
    .map((l) => l.fromPersonId)
    .sort();
const byName = (g: Genogram, name: string): Person | undefined =>
  g.persons.find((p) => p.basicInfo?.name === name);

describe('executeQuickBuild — 驗收案例(真實 store)', () => {
  beforeEach(seed);

  it('六行全部畫出來,人數與線數正確', () => {
    const { after, outcome } = run(ACCEPTANCE);
    expect(outcome.ok).toBe(true);
    expect(outcome.skippedLineNos).toEqual([]);
    // 案主 + 爸 + 媽 + 爺 + 奶 + 哥 + 前妻 + 兒 = 8
    expect(after.persons).toHaveLength(8);
  });

  it('哥哥掛在爸媽婚姻線下,與案主同父母 —— 不是跟案主連婚姻線', () => {
    const { after } = run(ACCEPTANCE);
    const me = after.persons.find((p) => p.isProband)!;
    const sibling = after.persons.find(
      (p) => p.id !== me.id && parentsOf(after, p.id).join() === parentsOf(after, me.id).join(),
    );
    expect(sibling).toBeTruthy();
    expect(parentsOf(after, sibling!.id)).toHaveLength(2);
    // 案主與手足之間不得有任何線
    const between = after.lines.filter(
      (l) =>
        (l.fromPersonId === me.id && l.toPersonId === sibling!.id) ||
        (l.fromPersonId === sibling!.id && l.toPersonId === me.id),
    );
    expect(between).toEqual([]);
  });

  it('爺爺有 X(歿)且掛在爸爸上方', () => {
    const { after } = run(ACCEPTANCE);
    const me = after.persons.find((p) => p.isProband)!;
    const dadId = parentsOf(after, me.id).find(
      (id) => after.persons.find((p) => p.id === id)?.shape === 'square',
    )!;
    const grandpaId = parentsOf(after, dadId).find(
      (id) => after.persons.find((p) => p.id === id)?.shape === 'square',
    )!;
    expect(after.persons.find((p) => p.id === grandpaId)?.lifeStatus).toBe(
      'deceased',
    );
  });

  it('欄位入對地方:年齡 / 電話 / 疾病', () => {
    const { after } = run(ACCEPTANCE);
    const me = after.persons.find((p) => p.isProband)!;
    const dad = after.persons.find(
      (p) => parentsOf(after, me.id).includes(p.id) && p.shape === 'square',
    )!;
    const mom = after.persons.find(
      (p) => parentsOf(after, me.id).includes(p.id) && p.shape === 'circle',
    )!;
    expect(dad.textInfo?.age).toBe(58);
    expect(dad.basicInfo?.phones?.map((x) => x.value)).toEqual(['0912345678']);
    expect(dad.medicalConditions?.map((c) => c.name)).toEqual(['高血壓']);
    expect(mom.textInfo?.age).toBe(55);
    expect(mom.medicalConditions?.map((c) => c.name)).toEqual(['糖尿病']);
  });

  it('學歷寫進教育程度與就學狀態(以前「國一」會變成名字)', () => {
    const { after } = run('哥哥 國一\n姊姊 台灣大學 畢業');
    const byEdu = (e: string) => after.persons.find((p) => p.basicInfo?.education === e);
    expect(byEdu('國一')?.basicInfo?.educationStatus).toBe('attending');
    expect(byEdu('國一')?.basicInfo?.name).toBeUndefined();
    expect(byEdu('台灣大學')?.basicInfo?.educationStatus).toBe('graduated');
  });

  it('前妻:婚姻線是離婚,且兒子掛在同一條線下(不再多建一位空白配偶)', () => {
    const { after } = run(ACCEPTANCE);
    const me = after.persons.find((p) => p.isProband)!;
    const divorceLines = after.lines.filter((l) => l.subType === 'divorce');
    expect(divorceLines).toHaveLength(1);
    const exId =
      divorceLines[0].fromPersonId === me.id
        ? divorceLines[0].toPersonId
        : divorceLines[0].fromPersonId;
    // 兒子 = 同時是 me 與 ex 的子女
    const son = after.persons.find(
      (p) => parentsOf(after, p.id).join() === [me.id, exId].sort().join(),
    );
    expect(son).toBeTruthy();
    expect(son!.textInfo?.age).toBe(5);
  });

  it('整批只留一個 undo 快照 —— undo 一步回到執行前', () => {
    const before = useGenogramStore.getState().currentCase!;
    run(ACCEPTANCE);
    const history = useGenogramStore.getState().history;
    expect(history.past).toHaveLength(1);
    expect(history.past.length).toBeLessThanOrEqual(MAX_HISTORY);
    useGenogramStore.getState().undo();
    const restored = useGenogramStore.getState().currentCase!;
    expect(restored.persons).toHaveLength(before.persons.length);
    expect(restored.lines).toHaveLength(before.lines.length);
    expect(restored.persons[0].id).toBe(before.persons[0].id);
  });

  it('產物通過匯出驗證,且所有線的兩端都指得到人(參照完整性)', () => {
    const { after } = run(ACCEPTANCE);
    expect(isValidGenogram(after)).toBe(true);
    const ids = new Set(after.persons.map((p) => p.id));
    const dangling = after.lines.filter(
      (l) => !ids.has(l.fromPersonId) || !ids.has(l.toPersonId),
    );
    expect(dangling).toEqual([]);
  });

  it('亂輸入的行被略過,其他行照常建立', () => {
    const { outcome, after } = run('XYZ 999 !!!\n爸爸 58');
    expect(outcome.ok).toBe(true);
    expect(outcome.skippedLineNos).toEqual([0]);
    expect(after.persons).toHaveLength(3); // 案主 + 爸 + 媽
  });
});

describe('executeQuickBuild — 更新既有(read-modify-write)', () => {
  beforeEach(seed);

  it('不會清掉既有的職業 / 病史(工作單 1.5-5)', () => {
    run('爸爸 58歲 高血壓');
    const st = useGenogramStore.getState();
    const me = st.currentCase!.persons.find((p) => p.isProband)!;
    const dadId = parentsOf(st.currentCase!, me.id).find(
      (id) => st.currentCase!.persons.find((p) => p.id === id)?.shape === 'square',
    )!;
    // 使用者手動補了職業與另一個病
    st.updatePerson(dadId, {
      textInfo: { ...st.currentCase!.persons.find((p) => p.id === dadId)!.textInfo, occupation: '木工' },
      medicalConditions: [
        ...(st.currentCase!.persons.find((p) => p.id === dadId)!.medicalConditions ?? []),
        { id: 'manual', name: '痛風' },
      ],
    });

    // 再跑一次快速建立(換年齡 + 加新病)
    run('爸爸 59歲 糖尿病');
    const dad = useGenogramStore
      .getState()
      .currentCase!.persons.find((p) => p.id === dadId)!;
    expect(dad.textInfo?.occupation).toBe('木工'); // 沒被整包覆蓋掉
    expect(dad.textInfo?.age).toBe(59); // 衝突預設取新值
    expect(dad.medicalConditions?.map((c) => c.name).sort()).toEqual(
      ['痛風', '糖尿病', '高血壓'].sort(),
    );
  });

  it('取消勾選衝突欄位 → 保留舊值', () => {
    run('爸爸 57歲');
    const st = useGenogramStore.getState();
    const me = st.currentCase!.persons.find((p) => p.isProband)!;
    const dadId = parentsOf(st.currentCase!, me.id).find(
      (id) => st.currentCase!.persons.find((p) => p.id === id)?.shape === 'square',
    )!;
    // 第 0 行的 age 衝突取消勾選
    run('爸爸 58歲', { '0:age': false });
    const dad = useGenogramStore
      .getState()
      .currentCase!.persons.find((p) => p.id === dadId)!;
    expect(dad.textInfo?.age).toBe(57);
  });

  it('姓名寫進 basicInfo.name', () => {
    const { after } = run('爸爸 王大明 58歲');
    expect(byName(after, '王大明')?.textInfo?.age).toBe(58);
  });
});

describe('executeQuickBuild — 邊界', () => {
  beforeEach(seed);

  it('單親情境:預覽說略過,執行也真的沒建(plan / execute 同源)', () => {
    // 先建爸媽,再手動刪掉媽媽 → 造出單親
    run('爸爸 58');
    const st = useGenogramStore.getState();
    const me = st.currentCase!.persons.find((p) => p.isProband)!;
    const momId = parentsOf(st.currentCase!, me.id).find(
      (id) => st.currentCase!.persons.find((p) => p.id === id)?.shape === 'circle',
    )!;
    st.removePersons([momId]);

    const { plan, outcome, after } = run('媽媽 55');
    expect(plan.plans[0].status).toBe('skip');
    expect(plan.plans[0].skipReason).toBe('parent-incomplete');
    expect(outcome.skippedLineNos).toEqual([0]);
    expect(after.persons.some((p) => p.textInfo?.age === 55)).toBe(false);
  });

  it('重複貼上同一段:父母不會重建,但子女會重複(工作單 1.5-14 已預告)', () => {
    run('爸爸 58\n兒子 5');
    const n1 = useGenogramStore.getState().currentCase!.persons.length;
    run('爸爸 58\n兒子 5');
    const n2 = useGenogramStore.getState().currentCase!.persons.length;
    expect(n2 - n1).toBe(1); // 只多一個兒子,爸媽沒重建
  });
});
