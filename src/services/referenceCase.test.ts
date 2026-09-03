// 凍結參考個案的往返測試 —— docs/VERSIONING.md 規則 2「未知欄位原樣保留」從「已實測一次」變成「每次都測」。
// e2e/fixtures/reference-case.genogram.json 是 v1.0 格式、刻意夾了四個未知欄位(bundle 頂層、個案、人物、事件各一)。
// 這個檔案日後也給 iOS 版當兩端共用的合約測試;不要重新產生它,除非規則本身改了。
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSingleExport, isValidGenogram, parseImport, sanitizeCase } from './exportImport';
import { migrateGenogram, useGenogramStore } from '../store/genogramStore';

const FILE = 'e2e/fixtures/reference-case.genogram.json';
const load = () => parseImport(readFileSync(FILE, 'utf8'));
type Loose = Record<string, unknown>;

describe('凍結參考個案(schemaVersion 1.0 + 未知欄位)', () => {
  it('檔案本身:1.0、一個個案、四層未知欄位都在', () => {
    const b = load() as unknown as Loose;
    expect(b.schemaVersion).toBe('1.0');
    expect(b.extra_top_field).toBe('unknown-top-level');
    const c = (b.cases as Loose[])[0];
    expect(c.extra_case_field).toEqual({ note: '未知欄位:個案層', n: 1 });
    expect((c.persons as Loose[])[0].extra_person_field).toBe('unknown-person-level');
    expect((c.majorEvents as Loose[])[0].extra_event_field).toEqual(['unknown', 'event', 'level']);
  });

  it('匯入 → 驗證 → 清洗 → 開檔遷移 → 編輯三處 → 匯出:未知欄位一個不少、版本仍是 1.0', () => {
    const g0 = load().cases[0];
    expect(isValidGenogram(g0)).toBe(true);
    const { case: clean, dropped } = sanitizeCase(g0);
    expect(dropped).toBe(0);
    const opened = migrateGenogram(clean);
    useGenogramStore.setState({
      currentCase: opened,
      history: { past: [], future: [] },
      selectedPersonIds: [],
      selectedLineIds: [],
      selectedUnitIds: [],
      selectedEcosystemId: null,
      selectedHouseholdId: null,
    });
    const S = () => useGenogramStore.getState();
    const pid = opened.persons[0].id;
    const evId = opened.majorEvents![0].id;
    S().updatePerson(pid, { notes: '改過備註' });
    S().updateMajorEvent(evId, { title: '改過標題' });
    S().addPersonAtCenter(720, 540);

    const out = JSON.parse(JSON.stringify(buildSingleExport(S().currentCase!))) as Loose;
    expect(out.schemaVersion).toBe('1.0');
    const c = (out.cases as Loose[])[0];
    expect(c.extra_case_field).toEqual({ note: '未知欄位:個案層', n: 1 });
    const p = (c.persons as Loose[]).find((x) => x.id === pid)!;
    expect(p.extra_person_field).toBe('unknown-person-level');
    expect(p.notes).toBe('改過備註');
    const ev = (c.majorEvents as Loose[]).find((x) => x.id === evId)!;
    expect(ev.extra_event_field).toEqual(['unknown', 'event', 'level']);
    expect(ev.title).toBe('改過標題');
    expect((c.persons as Loose[]).length).toBe(3);
  });
});
