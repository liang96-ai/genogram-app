import type { LoadedSnapshot } from '../services/saveSemantics';
import { relevelScaleResults } from '../services/scaleResultMigration';
import { create } from 'zustand';
import type {
  BasicShape,
  ConnectorTarget,
  Ecosystem,
  Genogram,
  Line,
  LineSubType,
  MemberSubType,
  NetworkConnector,
  NetworkUnit,
  Person,
  RelationSubType,
} from '../types/genogram';
import { addDeletedCaseId, db } from '../services/database';
import { deleteCaseFolder, writeCaseJson } from '../services/fileSystem';

const MAX_INSTITUTION_HISTORY = 30;
const MAX_MEDICAL_HISTORY = 60;
const MAX_ATTRIBUTE_HISTORY = 30; // 教育/族群/宗教/障礙等個人屬性 dropdown 歷史

// ==================== Line Subtype Spec ====================
// 每個 subType 對應的視覺(線型 + 中間符號)
// 這是唯一來源,渲染層從這讀,不看 line.visual.lineStyle

export type LineStyleKey = 'solid' | 'dashed' | 'dotted' | 'dash-dot';
export type MidSymbolKey =
  | 'slash-single'
  | 'slash-back'
  | 'slash-double'
  | 'x'
  | 'house';

export interface SubtypeSpec {
  lineStyle: LineStyleKey;
  midSymbol?: MidSymbolKey;
}

export const SUBTYPE_SPEC: Partial<Record<LineSubType, SubtypeSpec>> = {
  // 婚姻系列 — v1.1 移除 legal-cohabitation/legal-separation/widowed 主項
  // (字母標記無國際標準,migration 會把舊資料轉到現行 subType)
  // 但保留 spec 作為「migration 萬一漏掉」的 fallback 渲染
  marriage: { lineStyle: 'solid' },
  engagement: { lineStyle: 'dashed' },
  divorce: { lineStyle: 'solid', midSymbol: 'slash-double' },
  separation: { lineStyle: 'solid', midSymbol: 'slash-single' },
  'engagement-separation': { lineStyle: 'dashed', midSymbol: 'slash-single' },
  cohabitation: { lineStyle: 'dashed', midSymbol: 'house' },
  'engagement-cohabitation': { lineStyle: 'dashed', midSymbol: 'house' },
  // 以下 3 個為 v1.1 移除的 subType — 保留 spec 防舊資料 migration 萬一漏掉
  'legal-separation': { lineStyle: 'solid', midSymbol: 'slash-single' },
  'legal-cohabitation': { lineStyle: 'dashed', midSymbol: 'house' },
  widowed: { lineStyle: 'solid' },
  // v1.1: 改 dotted(對齊 Gallery #51 秘密外遇 DOT 視覺,跟麥氏標準)
  'love-affair': { lineStyle: 'dotted' },
  // 親子 — 視覺只有 2 種:實線(法定父母) / 虛線(非法定)
  // 內部 subType 保留 5 種供舊資料相容,但 fostered 不再用點線(改虛線)
  biological: { lineStyle: 'solid' },
  adopted: { lineStyle: 'solid' },
  fostered: { lineStyle: 'dashed' },
  'placed-out': { lineStyle: 'dashed' },
  'sperm-donor': { lineStyle: 'dashed' },
  // 未明家人 — 細灰實線,中性 placeholder
  'unknown-family': { lineStyle: 'solid' },
};

export function getDasharray(key: LineStyleKey): string | undefined {
  switch (key) {
    case 'solid':
      return undefined;
    case 'dashed':
      return '6 4';
    case 'dotted':
      return '2 7';
    case 'dash-dot':
      return '6 3 2 3';
  }
}

export function getLineStyleKey(line: Line): LineStyleKey {
  const spec = SUBTYPE_SPEC[line.subType];
  if (spec) return spec.lineStyle;
  // Fallback:如果 spec 沒定義,看 line.visual.lineStyle
  const v = line.visual.lineStyle;
  if (v === 'solid' || v === 'dashed' || v === 'dotted' || v === 'dash-dot') {
    return v;
  }
  return 'solid';
}

// ==================== Migration: 舊 subType → 新 subType ====================
// v1.1 新加:legal-cohabitation/legal-separation/widowed 移除主項 → 自動轉現行
//   - legal-cohabitation → cohabitation (法律狀態改用生態圈表達)
//   - legal-separation → separation (法律狀態改用生態圈表達)
//   - widowed → marriage (喪偶改用 Tab1 ☑ 已往生 自動畫 X 於配偶圖示)
const SUBTYPE_MIGRATE: Partial<Record<LineSubType, LineSubType>> = {
  'cohabitation-commit': 'cohabitation',
  partnership: 'cohabitation',
  'secret-affair': 'love-affair',
  'divorce-remarriage': 'divorce',
  'legal-cohabitation': 'cohabitation',
  'legal-separation': 'separation',
  widowed: 'marriage',
};

function migrateGenogram(g: Genogram): Genogram {
  let changed = false;
  let newLines = g.lines.map((l) => {
    const mapped = SUBTYPE_MIGRATE[l.subType];
    if (mapped && mapped !== l.subType) {
      changed = true;
      return { ...l, subType: mapped };
    }
    return l;
  });

  // Q4=B: 清掉舊的 institution-Person 系統(使用者選擇重來)
  const institutionPersonIds = new Set(
    g.persons.filter((p) => p.shape === 'institution').map((p) => p.id),
  );
  let newPersons = g.persons;
  if (institutionPersonIds.size > 0) {
    newPersons = g.persons.filter((p) => p.shape !== 'institution');
    newLines = newLines.filter(
      (l) =>
        !institutionPersonIds.has(l.fromPersonId) &&
        !institutionPersonIds.has(l.toPersonId),
    );
    changed = true;
  }

  // 合併 emails → phones(統一「聯絡方式」欄位)
  newPersons = newPersons.map((p) => {
    const emails = p.basicInfo?.emails;
    if (!emails || emails.length === 0) return p;
    const mergedPhones = [...(p.basicInfo?.phones ?? []), ...emails];
    changed = true;
    return {
      ...p,
      basicInfo: {
        ...p.basicInfo,
        phones: mergedPhones,
        emails: undefined,
      },
    };
  });

  // 確保 networkUnits 欄位存在,並把舊的 linkedPersonIds 遷移到 connectors
  const rawUnits = g.networkUnits ?? [];
  const newUnits = rawUnits.map((u) => {
    const linked = u.linkedPersonIds ?? [];
    if (linked.length === 0 && !('linkedPersonIds' in u)) return u;
    changed = true;
    const existingConnectors = u.connectors ?? [];
    const migratedConnectors: NetworkConnector[] = linked.map((pid) => ({
      id: uid('conn'),
      target: { type: 'person', id: pid },
    }));
    const { linkedPersonIds: _drop, ...rest } = u as NetworkUnit & {
      linkedPersonIds?: string[];
    };
    void _drop;
    return {
      ...rest,
      connectors: [...existingConnectors, ...migratedConnectors],
    };
  });
  if (!g.networkUnits) changed = true;

  // 確保 ecosystems 欄位存在;順便移除舊的 showEcosystemRing
  const newEcos = g.ecosystems ?? [];
  if (!g.ecosystems || 'showEcosystemRing' in g) changed = true;
  const { showEcosystemRing: _discard, ...rest } = g as Genogram & {
    showEcosystemRing?: boolean;
  };
  void _discard;

  return changed
    ? {
        ...rest,
        persons: newPersons,
        lines: newLines,
        networkUnits: newUnits,
        ecosystems: newEcos,
      }
    : g;
}

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const GRID_SIZE = 60;
export const SHAPE_HALF = 28;
export const snapToGrid = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
// 20(2026-08-27 決議):配合下方「文字編輯合併窗」——
// 打字不再逐鍵吃格之後,20 格的實際覆蓋範圍已經很深;再大是純記憶體浪費(每格=整份個案快照)
export const MAX_HISTORY = 20;

export const COLLISION_TOLERANCE = GRID_SIZE * 0.6;

// 點是否在多邊形內(ray casting)
export function pointInPolygon(
  x: number,
  y: number,
  poly: { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function positionFree(
  persons: Person[],
  x: number,
  y: number,
  excludeIds: string[] = [],
): boolean {
  return !persons.some(
    (p) =>
      !excludeIds.includes(p.id) &&
      Math.abs(p.position.x - x) < COLLISION_TOLERANCE &&
      Math.abs(p.position.y - y) < COLLISION_TOLERANCE,
  );
}

function findFreeRight(
  persons: Person[],
  x: number,
  y: number,
  excludeIds: string[] = [],
): { x: number; y: number } {
  let cx = x;
  let guard = 20;
  while (!positionFree(persons, cx, y, excludeIds) && guard > 0) {
    cx += GRID_SIZE * 2;
    guard--;
  }
  return { x: cx, y };
}

// 蒐集一個人的「直接親屬」:本人 + 配偶 + 子女(2 層,不遞迴到孫)
function collectKin(
  personId: string,
  lines: Line[],
): string[] {
  // v1.1: 用共用常數,新增婚姻 subType 不會漏掉
  const BIO = new Set<LineSubType>([
    'biological',
    'adopted',
    'placed-out',
    'fostered',
  ]);
  const ids = new Set<string>([personId]);
  const spouseIds: string[] = [];
  for (const l of lines) {
    if (!MARRIAGE_SUBTYPE_SET.has(l.subType)) continue;
    if (l.fromPersonId === personId) {
      spouseIds.push(l.toPersonId);
      ids.add(l.toPersonId);
    } else if (l.toPersonId === personId) {
      spouseIds.push(l.fromPersonId);
      ids.add(l.fromPersonId);
    }
  }
  const parentSet = new Set<string>([personId, ...spouseIds]);
  for (const l of lines) {
    if (!BIO.has(l.subType)) continue;
    if (parentSet.has(l.fromPersonId)) ids.add(l.toPersonId);
  }
  return [...ids];
}

// 整批位置碰撞檢測
function hasBatchCollision(
  persons: Person[],
  positions: { x: number; y: number }[],
  excludeIds: string[],
): boolean {
  const set = new Set(excludeIds);
  for (const pos of positions) {
    for (const p of persons) {
      if (set.has(p.id)) continue;
      if (
        Math.abs(p.position.x - pos.x) < COLLISION_TOLERANCE &&
        Math.abs(p.position.y - pos.y) < COLLISION_TOLERANCE
      ) {
        return true;
      }
    }
  }
  return false;
}

// 整批位置避開:碰撞時依 offsetFn 累積偏移;offsetFn(i) 回傳第 i 次的增量
function resolveBatchPositions(
  persons: Person[],
  initial: { x: number; y: number }[],
  excludeIds: string[],
  offsetFn: (i: number) => { dx: number; dy: number },
  maxTries = 15,
): { x: number; y: number }[] {
  let pos = initial;
  for (let i = 1; i <= maxTries; i++) {
    if (!hasBatchCollision(persons, pos, excludeIds)) return pos;
    const { dx, dy } = offsetFn(i);
    pos = pos.map((p) => ({
      x: snapToGrid(p.x + dx),
      y: snapToGrid(p.y + dy),
    }));
  }
  return pos;
}

export const createEmptyCase = (name = '我的家系圖'): Genogram => {
  const now = new Date().toISOString();
  const probandId = uid('p');
  return {
    schemaVersion: '1.0',
    id: uid('case'),
    caseName: name,
    createdAt: now,
    lastModifiedAt: now,
    persons: [
      {
        id: probandId,
        position: { x: snapToGrid(480), y: snapToGrid(360) },
        shape: 'square',
        isProband: true,
        basicInfo: { name: '' },
      },
    ],
    lines: [],
    households: [],
    networkUnits: [],
    ecosystems: [],
    canvas: { gridSize: GRID_SIZE, snapToGrid: true },
  };
};

const flipShape = (s: BasicShape): BasicShape =>
  s === 'square' ? 'circle' : s === 'circle' ? 'square' : s;

// v1.1: 婚姻線 subType 共用名單(Canvas/store 多處都要判斷「這是婚姻嗎?」)
// — 包含新+舊 14 個,確保新加婚姻 subType 不會漏改 Canvas 渲染分組
// — 漏改的後果:子女找不到該綁哪條線,看起來「亂連」(實際是斷開)
export const MARRIAGE_SUBTYPE_SET: Set<LineSubType> = new Set<LineSubType>([
  // 現行
  'marriage',
  'engagement',
  'cohabitation',
  'legal-cohabitation',
  'engagement-cohabitation',
  'separation',
  'legal-separation',
  'engagement-separation',
  'divorce',
  'widowed',
  'love-affair',
  // 舊名(向後相容,migration 會自動轉現行)
  'cohabitation-commit',
  'partnership',
  'secret-affair',
  'divorce-remarriage',
]);

// v1.1: 把 member subType 集中管理(對齊 MemberSubType union),避免每次新增婚姻 subtype 都要漏改 mkLine
const MEMBER_SUBTYPE_SET: Set<LineSubType> = new Set<LineSubType>([
  // 婚姻
  'marriage',
  'engagement',
  'divorce',
  'separation',
  'legal-separation',
  'engagement-separation',
  'widowed',
  'cohabitation',
  'legal-cohabitation',
  'engagement-cohabitation',
  'love-affair',
  // 舊名(向後相容)
  'cohabitation-commit',
  'partnership',
  'secret-affair',
  'divorce-remarriage',
  // 親子
  'biological',
  'adopted',
  'fostered',
  'placed-out',
  'sperm-donor',
  // 手足
  'twins',
  'identical-twins',
  // 妊娠
  'miscarriage',
  'stillbirth',
  'abortion',
  // 未明
  'unknown-family',
]);

const mkLine = (
  from: string,
  to: string,
  subType: LineSubType,
  lineStyle: 'solid' | 'dashed' | 'dotted' = 'solid',
): Line => ({
  id: uid('l'),
  fromPersonId: from,
  toPersonId: to,
  category: MEMBER_SUBTYPE_SET.has(subType) ? 'member' : 'relation',
  subType,
  visual: { lineStyle },
});

const touch = (g: Genogram): Genogram => ({
  ...g,
  lastModifiedAt: new Date().toISOString(),
});

/** majorEvents 若不是陣列(手改壞的舊資料)就當空的 —— 讓所有 CRUD 對壞資料免疫。
 *  注意:這裡只是「不要炸」,不會去改寫使用者的資料。 */
const safeEvents = (
  ev: Genogram['majorEvents'],
): NonNullable<Genogram['majorEvents']> => (Array.isArray(ev) ? ev : []);

/** 刪人物時,把重大事件的「牽涉人物」裡指向已刪人物的 id 清掉(#126 同族)——
 *  不清會留下幽靈 id:卡片顯示「牽涉人物 (3)」卻只看得到 2 個名字。
 *  事件本身保留(事件是個案層級的紀錄,不隨某個人消失)。 */
const cleanEventPersonRefs = (
  events: Genogram['majorEvents'],
  removed: Set<string>,
): Genogram['majorEvents'] => {
  // 壞資料防護(2026-08-30 複核):DB 裡可能躺著 null 元素或整個不是陣列的
  // majorEvents(此版之前匯入的)。少了這兩道,刪除人物會 throw ——
  // 而且是在事件處理器裡拋、ErrorBoundary 接不到,症狀是「刪除永遠沒反應」的無聲死路。
  if (!Array.isArray(events)) return events;
  let changed = false;
  const next = events.map((e) => {
    if (!e || typeof e !== 'object') return e;
    // 必須是 Array.isArray:'x'.length === 1 為真,舊的 ?.length 守衛擋不住字串
    // → 下一行 .filter 直接 TypeError(第二輪複核實測到的漏網形狀)
    if (!Array.isArray(e.relatedPersonIds) || e.relatedPersonIds.length === 0)
      return e;
    const kept = e.relatedPersonIds.filter((pid) => !removed.has(pid));
    if (kept.length === e.relatedPersonIds.length) return e;
    changed = true;
    return { ...e, relatedPersonIds: kept };
  });
  return changed ? next : events;
};

type Dir = 'left' | 'right';

type ConfirmState = {
  message: string;
  onYes: () => void;
  onNo: () => void;
  /** 自訂按鈕文字 —— 不給就用預設的「是 / 否」。
   *  像「安裝為 App」這種非破壞性詢問,寫「安裝 / 稍後」比「是 / 否」友善得多。 */
  yesLabel?: string;
  noLabel?: string;
  /** 語氣。預設 'danger'(刪除類):確定鈕紅色、取消鈕搶焦點、附防誤按快捷提示。
   *  'normal'(良性詢問,如安裝 App):確定鈕藍色、無快捷提示 —— 紅色會嚇到使用者。 */
  tone?: 'danger' | 'normal';
} | null;

export type InspectorTarget =
  | { type: 'person'; id: string }
  | { type: 'line'; id: string }
  | null;

export type PrivacyField =
  | 'name'
  | 'age'
  | 'birthYear'
  | 'deathYear'
  | 'occupations'
  | 'phones'
  | 'location'
  | 'income'
  | 'freeNote'
  | 'medicalConditions'
  | 'medications'
  | 'education'
  | 'ethnicity'
  | 'religion'
  | 'disabilities'
  | 'caseRole'
  | 'familyRoles';

export type PrivacySection =
  | 'identity'
  | 'personal' // 合併原 contact + attribute
  | 'note'
  | 'medical';

const FIELD_TO_SECTION: Record<PrivacyField, PrivacySection> = {
  name: 'identity',
  age: 'identity',
  birthYear: 'identity',
  deathYear: 'identity',
  occupations: 'personal',
  phones: 'personal',
  location: 'personal',
  income: 'personal',
  freeNote: 'note',
  medicalConditions: 'medical',
  medications: 'medical',
  education: 'personal',
  ethnicity: 'personal',
  religion: 'personal',
  disabilities: 'personal',
  caseRole: 'personal',
  familyRoles: 'personal',
};

export const DEFAULT_PRIVATE_FIELDS: Record<PrivacyField, boolean> = {
  name: false,
  age: false,
  birthYear: false,
  deathYear: false,
  occupations: false,
  phones: false,
  location: false,
  income: false,
  freeNote: false,
  medicalConditions: false,
  medications: false,
  education: false,
  ethnicity: false,
  religion: false,
  disabilities: false,
  caseRole: false,
  familyRoles: false,
};

export function fieldsInSection(section: PrivacySection): PrivacyField[] {
  return (Object.keys(FIELD_TO_SECTION) as PrivacyField[]).filter(
    (f) => FIELD_TO_SECTION[f] === section,
  );
}

type HistoryState = {
  past: Genogram[];
  future: Genogram[];
};

export type AppMode = 'list' | 'edit';

type GenogramStore = {
  // 教學
  showTutorial: boolean;
  setShowTutorial: (v: boolean) => void;

  // App routing
  appMode: AppMode;
  caseList: Genogram[];
  loadCaseList: () => Promise<void>;
  openCase: (id: string) => Promise<void>;
  createCase: (name: string) => Promise<void>;
  renameCase: (id: string, name: string) => Promise<void>;
  /** 回傳 false = 資料夾備份檔未能一併刪除(權限休眠)— UI 應提示(#125) */
  deleteCase: (id: string) => Promise<boolean>;
  goToList: () => Promise<void>;

  currentCase: Genogram | null;
  /** 開檔當下的 (id, lastModifiedAt);新建個案為 null。App 用它判斷「開啟不算編輯」(services/saveSemantics.ts) */
  loadedSnapshot: LoadedSnapshot | null;
  selectedPersonIds: string[];
  selectedLineIds: string[];
  selectedUnitIds: string[];
  inspectorTarget: InspectorTarget;

  inspectorSide: 'left' | 'right';
  inspectorCollapsed: boolean;

  // Canvas view (pan/zoom) — 不進 history
  viewPan: { x: number; y: number };
  viewZoom: number;

  // 網絡單位輸入歷史(持久化到 IndexedDB settings table)
  institutionHistory: string[];
  // 疾病/用藥輸入歷史(跨個案)
  diseaseHistory: string[];
  medicationHistory: string[];
  // 個人屬性 dropdown 歷史(跨個案)
  educationHistory: string[];
  ethnicityHistory: string[];
  religionHistory: string[];
  disabilityTypeHistory: string[];

  /** UI 語言(極簡 i18n) */
  language: 'zh' | 'en';
  setLanguage: (lang: 'zh' | 'en') => void;
  /** App 啟動時叫 — 1. 若有存過語言偏好就還原 2. 沒存過 → 偵測 navigator.language(zh* 給中文,其他給英文)+ 寫入 */
  loadLanguage: () => Promise<void>;
  /** 案主視覺樣式:
   *  - 'border' (預設):雙紅匡(McGoldrick 標準)
   *  - 'traditional':整塊黑色填滿(傳統習慣) */
  probandStyle: 'border' | 'traditional';
  setProbandStyle: (s: 'border' | 'traditional') => void;
  loadProbandStyle: () => Promise<void>;

  privacyEnabled: boolean;
  privateFields: Record<PrivacyField, boolean>;
  /** 載入上次的遮蔽設定(2026-08-27 決議:遮蔽不再重開歸零 —— 團督前設好的隱私,隔天要還在)*/
  loadPrivacySettings: () => Promise<void>;
  setPrivacyEnabled: (v: boolean) => void;
  togglePrivateField: (f: PrivacyField) => void;
  setSectionFields: (section: PrivacySection, value: boolean) => void;

  // Inspector 展開/擴充勾選 — 跨人物/線條/Tab 持久(session 內)
  // v1.1: 重命名對齊 Tab1 新 4 群結構
  //   multiIdentity → extended (擴充選項:性別亞型 #7-11 + 標記 #42-47)
  //   medicalBasic  → medical  (醫務:#18-19 疑似 + #22-33 成癮系列)
  //   advanced      → genetic  (遺傳:#34-37 + #40-41)
  expandMedical: boolean;
  expandExtended: boolean;
  expandGenetic: boolean;
  expandIcd10cm: boolean;
  expandIcd11: boolean;
  expandDsm5: boolean;
  expandNhiMed: boolean;
  expandSelfPayMed: boolean;
  setExpand: (
    key:
      | 'medical'
      | 'extended'
      | 'genetic'
      | 'icd10cm'
      | 'icd11'
      | 'dsm5'
      | 'nhiMed'
      | 'selfPayMed',
    value: boolean,
  ) => void;

  history: HistoryState;

  confirmState: ConfirmState;
  showConfirm: (
    message: string,
    opts?: { yes?: string; no?: string; tone?: 'danger' | 'normal' },
  ) => Promise<boolean>;


  selectUnit: (id: string | null) => void;
  selectUnits: (ids: string[]) => void;
  selectPersonsAndUnits: (personIds: string[], unitIds: string[]) => void;
  selectPerson: (id: string | null) => void;
  togglePersonSelection: (id: string) => void;
  selectPersons: (ids: string[]) => void;
  selectLine: (id: string | null) => void;
  selectLines: (ids: string[]) => void;
  toggleLineSelection: (id: string) => void;
  clearSelection: () => void;
  /** 目前選取的東西能不能刪、是哪一種、幾個(Delete 鍵與確認框文案共用;services/deleteSelection) */
  describeDeletable: () => import('../services/deleteSelection').Deletable | null;
  /** 刪掉目前選取的東西(每一種都是一步復原);回 true = 有刪 */
  deleteSelected: () => boolean;
  setInspectorTarget: (target: InspectorTarget) => void;

  addPerson: (p: Person) => void;
  addPersonAtCenter: (centerX: number, centerY: number) => void;
  updatePerson: (id: string, patch: Partial<Person>, opts?: EditOpts) => void;
  movePerson: (id: string, x: number, y: number) => void;
  /** 拖曳結束時補記一格復原(#123)— 傳入「拖曳開始前」的快照 */
  commitMoveHistory: (before: Genogram) => void;
  removePersons: (ids: string[]) => void;
  /** 框選同時含人物與網絡單位時的合併刪除 —— 一次 pushHistory,undo 一步全回來。
   *  (分開呼叫 removePersons + removeNetworkUnit 會吃掉兩格復原,白耗 MAX_HISTORY 上限)*/
  removePersonsAndUnits: (personIds: string[], unitIds: string[]) => void;
  cycleShape: (id: string) => void;

  /** Tab2 關係線 pending mode:點按鈕後等使用者點下一個人物完成連線 */
  pendingRelation: RelationSubType | null;
  setPendingRelation: (sub: RelationSubType | null) => void;
  /** Tab2 婚姻線 pending mode(v1.1):選好婚姻 subType 後等使用者點 2 個人物完成 */
  pendingMember: MemberSubType | null;
  setPendingMember: (sub: MemberSubType | null) => void;
  /** Tab2「常用線條」section 顯示 toggle(v1.1)— 持久化到 localStorage */
  tab2ShowMarriage: boolean;
  tab2ShowRelation: boolean;
  setTab2ShowMarriage: (v: boolean) => void;
  setTab2ShowRelation: (v: boolean) => void;
  /** 建立關係線(person→person)
   *  注意:person→unit 的關係改走 connector subType 機制,
   *  見 addConnector / setConnectorSubType */
  createRelationLine: (
    fromPersonId: string,
    toPersonId: string,
    subType: RelationSubType,
  ) => void;
  /** v1.1: 建立婚姻線(member line)
   *  - 同一對人物已有任何 member line(婚姻/親子)→ 不重複建
   *  - 用於 Tab2 婚姻 pending mode */
  createMarriageLine: (
    fromPersonId: string,
    toPersonId: string,
    subType: MemberSubType,
  ) => void;
  /** 從人物 ▲ 長按拖到另一人物時建立的線
   *  — 預設 biological 親生線(實線、灰黑、跟其他 member line 同樣樣式)
   *  — 若兩人已有任何 member line(婚姻/親子等),不重複建
   *  — 之後使用者可雙擊切實/虛(=biological ⇄ placed-out) */
  createUnknownFamilyLine: (
    fromPersonId: string,
    toPersonId: string,
  ) => void;

  updateLine: (id: string, patch: Partial<Line>, opts?: EditOpts) => void;
  removeLine: (id: string) => void;
  /** 一次刪多條線 = 一格復原(配對的親子線一起刪,與 removeLine 同規) */
  removeLines: (ids: string[]) => void;
  updateLineEndpoint: (lineId: string, end: 'from' | 'to', newPersonId: string) => void;
  cycleLineSubType: (lineId: string) => void;
  /** 拖小孩 A 到婚姻線 M:新增 A→M1 / A→M2 為 placed-out(虛線、父母縮小);
   *  不動 A 既有的親生父母線。A 跳到 fork 下方(疊在既有 children 上,使用者自己挪) */
  addSecondaryParentsFromMarriage: (
    childId: string,
    marriageLineId: string,
  ) => void;
  /** 拖小孩 A 到單一個人 Z:新增 A→Z 為 placed-out(虛線、Z 縮小);
   *  不動 A 既有的親生父母線(修原本「會把線斷掉變捐精」的 bug) */
  addSecondaryParentFromPerson: (
    childId: string,
    parentPersonId: string,
  ) => void;
  /** 點虛線父母線 → 升為主要(實線),同時把該 child 其他主要線降為 placed-out;
   *  支援婚姻配對:會把同 child 對應配偶那條線一起升 */
  /** 全選保密:把全個案中所有「關係線」(category='relation')private 全設為 value(case-wide) */
  toggleAllRelationLinesPrivate: (value: boolean) => void;
  /** 目前選中的 connector(全 canvas 同時最多一個) */
  selectedConnector: { unitId: string; connectorId: string } | null;
  setSelectedConnector: (
    sel: { unitId: string; connectorId: string } | null,
  ) => void;

  expandParents: (childId: string) => void;
  expandSpouseOrSibling: (personId: string, direction: Dir) => void;
  expandChild: (personId: string) => void;
  expandChildFromMarriage: (marriageLineId: string) => void;
  expandTwinsFromMarriage: (
    marriageLineId: string,
    count: number,
    twinType: 'fraternal' | 'identical',
  ) => void;
  expandTwinsFromPerson: (
    personId: string,
    count: number,
    twinType: 'fraternal' | 'identical',
  ) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  toggleInspectorSide: () => void;
  toggleInspectorCollapsed: () => void;

  // View actions
  setViewPan: (x: number, y: number) => void;
  setView: (pan: { x: number; y: number }, zoom: number) => void;
  resetView: () => void;
  fitView: (viewportW: number, viewportH: number) => void;
  /** 把畫面置中到所有圖形的 bounding box 中心,保留目前縮放(不像 fitView 會自動縮放) */
  centerViewOnContent: (viewportW: number, viewportH: number) => void;

  // Institution history
  loadInstitutionHistory: () => Promise<void>;
  addInstitutionToHistory: (name: string) => void;
  removeFromInstitutionHistory: (name: string) => void;
  // Disease / Medication history
  loadMedicalHistory: () => Promise<void>;
  addDiseaseToHistory: (name: string) => void;
  removeFromDiseaseHistory: (name: string) => void;
  addMedicationToHistory: (name: string) => void;
  removeFromMedicationHistory: (name: string) => void;
  // 個人屬性 dropdown 歷史(教育/族群/宗教/障礙類別)
  loadAttributeHistory: () => Promise<void>;
  addAttributeToHistory: (
    key: 'education' | 'ethnicity' | 'religion' | 'disabilityType',
    value: string,
  ) => void;

  // NetworkUnit(新系統,取代舊 institution-Person)
  addNetworkUnit: (name: string, anchorPersonId?: string) => void;
  updateNetworkUnit: (id: string, patch: Partial<NetworkUnit>, opts?: EditOpts) => void;
  removeNetworkUnit: (id: string) => void;
  /** 一次刪多個單位 = 一格復原 */
  removeNetworkUnits: (ids: string[]) => void;
  toggleNetworkUnitActive: (id: string) => void;
  moveNetworkUnit: (id: string, x: number, y: number) => void;
  // Connector (▲ 拉出的線)
  addConnector: (
    unitId: string,
    target: ConnectorTarget,
    subType?: RelationSubType,
  ) => void;
  /** 改 connector 的關係 subType(套用 15 種關係線之一)
   *  傳 null 表示恢復預設(會顯示成 #67 focus-on) */
  setConnectorSubType: (
    unitId: string,
    connectorId: string,
    subType: RelationSubType | null,
  ) => void;
  /** 翻轉 connector 的箭頭方向(v1.1)— toggle reversed flag */
  toggleConnectorReversed: (unitId: string, connectorId: string) => void;
  /** 找 connector(若 unitId/connectorId 是某對人物-單位的 connector,直接拿到)*/
  findUnitConnectorByPerson: (
    unitId: string,
    personId: string,
  ) => NetworkConnector | null;
  removeConnector: (unitId: string, connectorId: string) => void;
  updateConnectorTarget: (
    unitId: string,
    connectorId: string,
    target: ConnectorTarget,
  ) => void;

  // 量表結果(scaleResults)
  addScaleResult: (
    result: Omit<import('../types/genogram').ScaleResult, 'id'>,
  ) => void;
  removeScaleResult: (id: string) => void;

  // 訪談筆記(InterviewNote)
  addInterviewNote: (
    note: Omit<import('../types/genogram').InterviewNote, 'id'>,
  ) => void;
  updateInterviewNote: (
    id: string,
    patch: Partial<import('../types/genogram').InterviewNote>,
    opts?: EditOpts,
  ) => void;
  removeInterviewNote: (id: string) => void;

  // 文件附件(AttachmentRef)
  addAttachment: (
    ref: Omit<import('../types/genogram').AttachmentRef, 'id' | 'addedAt'>,
  ) => void;
  removeAttachment: (id: string) => void;

  // 重大事件(MajorEvent)
  addMajorEvent: (
    ev: Omit<import('../types/genogram').MajorEvent, 'id'>,
  ) => void;
  updateMajorEvent: (
    id: string,
    patch: Partial<import('../types/genogram').MajorEvent>,
    /** merge:這一次寫入屬於「同一次輸入的續寫」,併回上一格(store 規則 2) */
    opts?: EditOpts,
  ) => void;
  removeMajorEvent: (id: string) => void;


  // 同住成員圈(Household)
  addHousehold: (memberIds: string[], label?: string) => void;
  updateHousehold: (
    id: string,
    patch: Partial<import('../types/genogram').Household>,
  ) => void;
  removeHousehold: (id: string) => void;

  // Ecosystem(生態圈)— 畫筆繪製的閉合多邊形
  drawMode: boolean;
  setDrawMode: (v: boolean) => void;
  selectedEcosystemId: string | null;
  /** 同住圈選取(2026-08-29:點圈邊線→紅×刪除)*/
  selectedHouseholdId: string | null;
  selectHousehold: (id: string | null) => void;
  selectEcosystem: (id: string | null) => void;
  editingEcosystemId: string | null;
  setEditingEcosystem: (id: string | null) => void;
  addEcosystem: (points: { x: number; y: number }[]) => void;
  removeEcosystem: (id: string) => void;
  updateEcosystem: (id: string, patch: Partial<Ecosystem>) => void;
  moveEcosystem: (id: string, dx: number, dy: number) => void;
  // 編輯時:transient 更新 points(不進 history),commit 時把編輯前 points 推 history
  setEcosystemPointsTransient: (
    id: string,
    points: { x: number; y: number }[],
  ) => void;
  commitEcosystemEdit: (
    id: string,
    originalPoints: { x: number; y: number }[],
  ) => void;
};

export const MIN_ZOOM = 0.4;
// 200%(2026-08-27 決議):會談時放大給案家看、年長使用者看小字備註。全向量,放大不糊。
export const MAX_ZOOM = 2;
export const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

// 推進 history:把當前 currentCase 放入 past,設定 newCase 為當前,清空 future
function pushHistory(
  currentCase: Genogram | null,
  history: HistoryState,
  newCase: Genogram,
) {
  // 任何推格都是「新的歷史事件」→ 關掉文字合併窗;
  // 文字動作推完自己的第一格後會用 openEditStep 把窗開回來
  breakEditWindow();
  const newPast = currentCase
    ? [...history.past, currentCase].slice(-MAX_HISTORY)
    : history.past;
  return {
    currentCase: newCase,
    history: { past: newPast, future: [] as Genogram[] },
  };
}

// ==================== 選取互斥的唯一定義(2026-09-03 統一)====================
// 一次只能選一種東西:人物們 / 線們 / 單位們 / 人物+單位 / 同住圈 / 生態圈(含編輯中)/ 連接線。
// 所有 select* 動作都用 selectOnly():只寫要選的那幾個欄位,其他一律清空,不靠人記得清。
// (欄位形狀維持不變,讀取端 Canvas / Inspector 30 幾處不用動。)
export const EMPTY_SELECTION = {
  selectedPersonIds: [] as string[],
  selectedLineIds: [] as string[],
  selectedUnitIds: [] as string[],
  selectedEcosystemId: null as string | null,
  selectedHouseholdId: null as string | null,
  editingEcosystemId: null as string | null,
  selectedConnector: null as { unitId: string; connectorId: string } | null,
};
export type SelectionFields = typeof EMPTY_SELECTION;
export function selectOnly(partial: Partial<SelectionFields>): SelectionFields {
  return { ...EMPTY_SELECTION, ...partial };
}

// ==================== 「一格復原是什麼」的唯一定義(2026-09-03 統一)====================
// 兩條規則,全 App 的文字/欄位編輯都只走這裡(updatePerson / updateLine / updateNetworkUnit /
// updateInterviewNote / updateMajorEvent):
//
// 規則 1・時間窗:同一個目標 900ms 內的連續直寫共用第一格。
//   給「逐鍵直寫 store」的控制項用(下拉、日期、數字、勾選、快速連按)。
//   停手超過 900ms、或動了別的東西(任何其他 pushHistory / undo / redo),窗就關。
//   中文輸入法組字期間 onChange 連續觸發,天然落在同一窗內。
//
// 規則 2・輸入 session:呼叫端帶 { merge: true } 代表「同一次輸入的續寫」,
//   併回這次輸入開的那一格,不看時間。給草稿型文字欄位用(hooks/useDraftField):
//   打一段有思考停頓的描述,每個停頓都超過 900ms,靠時間窗會每停頓一次吃一格。
//   續寫要通過所有權憑證(kind + id + 當時的 past 長度)才准併:undo 會把 past 彈掉一格
//   → 長度不符 → 憑證失效,不會把 undo 之後的新編輯偷偷併進已經被退掉的那格。
//
// 一次輸入 = 從開始改到失焦(或切換目標)為止。第一次寫入推一格,之後的續寫併回同一格。
export type EditOpts = { merge?: boolean };

const EDIT_COALESCE_MS = 900;
let editWindow: { kind: string; id: string; at: number } | null = null;
let mergeSlot: { kind: string; id: string; pastLen: number } | null = null;

/** 規則 1:這次更新在同一目標的時間窗內?(有副作用:重設窗的時間) */
function shouldCoalesce(kind: string, id: string): boolean {
  const now = Date.now();
  const hit =
    editWindow !== null &&
    editWindow.kind === kind &&
    editWindow.id === id &&
    now - editWindow.at < EDIT_COALESCE_MS;
  editWindow = { kind, id, at: now };
  return hit;
}

/** 規則 1 + 規則 2:這次更新要不要「併入上一格」(true = 不推新快照) */
function joinsPreviousStep(kind: string, id: string, pastLen: number, opts?: EditOpts): boolean {
  const inWindow = shouldCoalesce(kind, id);
  const merge =
    opts?.merge === true &&
    mergeSlot !== null &&
    mergeSlot.kind === kind &&
    mergeSlot.id === id &&
    mergeSlot.pastLen === pastLen;
  return merge || inWindow;
}

/** 推完自己的第一格之後呼叫:重開時間窗 + 登記這次輸入的所有權憑證 */
function openEditStep(kind: string, id: string, pastLen: number): void {
  editWindow = { kind, id, at: Date.now() };
  mergeSlot = { kind, id, pastLen };
}

/** 任何非文字編輯的歷史事件都要關窗 —— 之後的打字必須開新格。
 *  export 給不走 pushHistory 的兩個直推 history 者(commitMoveHistory 由本檔自用、
 *  quickBuildExecutor 批次收斂)與測試隔離用。 */
export function breakEditWindow(): void {
  editWindow = null;
  mergeSlot = null;
}

function savePrivateFields(fields: Record<PrivacyField, boolean>): void {
  db.settings
    .put({ key: 'privateFields', value: fields })
    .catch((err) => console.error('save privateFields failed:', err));
}

export const useGenogramStore = create<GenogramStore>((set, get) => ({
  showTutorial: false,
  setShowTutorial: (v) => set({ showTutorial: v }),

  appMode: 'list',
  caseList: [],
  loadCaseList: async () => {
    try {
      const all = await db.cases.toArray();
      // 依 lastModifiedAt 降序排
      all.sort((a, b) =>
        a.lastModifiedAt < b.lastModifiedAt ? 1 : -1,
      );
      set({ caseList: all });
    } catch (err) {
      console.error('loadCaseList failed:', err);
    }
  },
  openCase: async (id) => {
    try {
      const c = await db.cases.get(id);
      if (!c) return;
      // 開檔遷移 + 量表舊紀錄依新分級重算(services/scaleResultMigration.ts)
      const migrated = relevelScaleResults(migrateGenogram(c)).case;
      set({
        currentCase: migrated,
        loadedSnapshot: { id: migrated.id, lastModifiedAt: migrated.lastModifiedAt },
        appMode: 'edit',
        selectedPersonIds: [],
        selectedLineIds: [],
        selectedUnitIds: [],
        selectedEcosystemId: null,
        selectedHouseholdId: null,
        editingEcosystemId: null,
        inspectorTarget:
          migrated.persons.length > 0
            ? { type: 'person', id: migrated.persons[0].id }
            : null,
        history: { past: [], future: [] },
        // 切換個案時重置視角,避免從 A 拉很遠的位置切到 B 看不到內容
        viewPan: { x: 0, y: 0 },
        viewZoom: 1,
      });
    } catch (err) {
      console.error('openCase failed:', err);
    }
  },
  createCase: async (name) => {
    const trimmed = name.trim() || '我的家系圖';
    const fresh = createEmptyCase(trimmed);
    try {
      await db.cases.put(fresh);
      // 同步建立資料夾(best effort)
      writeCaseJson(fresh).catch((err) =>
        console.error('create writeCaseJson failed:', err),
      );
      set({
        currentCase: fresh,
        loadedSnapshot: null,
        appMode: 'edit',
        // 新個案直接選取案主(2026-08-27 決議):教學說「選中人物會出現 4 個箭頭」,
        // 空白畫布沒選取的話,新手要自己悟出「先點一下人」
        selectedPersonIds: [fresh.persons[0].id],
        selectedLineIds: [],
        selectedUnitIds: [],
        selectedEcosystemId: null,
        selectedHouseholdId: null,
        editingEcosystemId: null,
        inspectorTarget: { type: 'person', id: fresh.persons[0].id },
        history: { past: [], future: [] },
        viewPan: { x: 0, y: 0 },
        viewZoom: 1,
      });
    } catch (err) {
      console.error('createCase failed:', err);
    }
  },
  renameCase: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cur = get().currentCase;
    try {
      let updated;
      if (cur && cur.id === id) {
        updated = touch({ ...cur, caseName: trimmed });
        await db.cases.put(updated);
        set({ currentCase: updated });
      } else {
        const c = await db.cases.get(id);
        if (!c) return;
        updated = touch({ ...c, caseName: trimmed });
        await db.cases.put(updated);
      }
      // 同步寫到資料夾 case.json(best effort)
      writeCaseJson(updated).catch((err) =>
        console.error('rename writeCaseJson failed:', err),
      );
      // 重整清單(若在列表頁)
      if (get().appMode === 'list') {
        await get().loadCaseList();
      }
    } catch (err) {
      console.error('renameCase failed:', err);
    }
  },
  deleteCase: async (id) => {
    try {
      // 墓碑先立(#125):資料夾備份檔若刪不掉(權限休眠),啟動掃描也不准把它救回來
      await addDeletedCaseId(id);
      await db.cases.delete(id);
      // 同時刪除使用者資料夾裡對應的 case_<id>/(best effort)
      // 只有「設定過資料夾」時,刪不掉才算失敗(要提示使用者手動清)
      let folderOk = true;
      const folderConfigured = !!(await db.settings
        .get('rootDirHandle')
        .catch(() => null));
      if (folderConfigured) {
        folderOk = await deleteCaseFolder(id).catch((err) => {
          console.error('deleteCaseFolder failed:', err);
          return false;
        });
      }
      const cur = get().currentCase;
      if (cur && cur.id === id) {
        // 目前正在編這筆 → 切回列表
        set({
          currentCase: null,
          loadedSnapshot: null,
          appMode: 'list',
          selectedPersonIds: [],
          selectedLineIds: [],
          selectedUnitIds: [],
          selectedEcosystemId: null,
          selectedHouseholdId: null,
          editingEcosystemId: null,
          inspectorTarget: null,
          history: { past: [], future: [] },
        });
      }
      await get().loadCaseList();
      return folderOk;
    } catch (err) {
      console.error('deleteCase failed:', err);
      return false;
    }
  },
  goToList: async () => {
    set({ appMode: 'list' });
    await get().loadCaseList();
  },

  currentCase: null,
  loadedSnapshot: null,
  selectedPersonIds: [],
  selectedLineIds: [],
  selectedUnitIds: [],
  selectedEcosystemId: null,
  selectedHouseholdId: null,
  editingEcosystemId: null,
  pendingRelation: null,
  // v1.1 婚姻線 pending mode:點 Tab2 婚姻按鈕後等使用者點 2 個人物完成連線
  pendingMember: null,
  // v1.1 Tab2「常用線條」兩個 section toggle(從 localStorage 讀,沒設預設都打勾)
  tab2ShowMarriage: (() => {
    try {
      const v = localStorage.getItem('tab2.showMarriage');
      return v === null ? true : v === '1';
    } catch {
      return true;
    }
  })(),
  tab2ShowRelation: (() => {
    try {
      const v = localStorage.getItem('tab2.showRelation');
      return v === null ? true : v === '1';
    } catch {
      return true;
    }
  })(),
  inspectorTarget: null,
  inspectorSide: 'right',
  inspectorCollapsed: false,
  viewPan: { x: 0, y: 0 },
  viewZoom: 1,
  institutionHistory: [],
  diseaseHistory: [],
  medicationHistory: [],
  educationHistory: [],
  ethnicityHistory: [],
  religionHistory: [],
  disabilityTypeHistory: [],
  privacyEnabled: false,
  privateFields: DEFAULT_PRIVATE_FIELDS,
  loadPrivacySettings: async () => {
    try {
      const [en, fields] = await Promise.all([
        db.settings.get('privacyEnabled'),
        db.settings.get('privateFields'),
      ]);
      const patch: Partial<{
        privacyEnabled: boolean;
        privateFields: Record<PrivacyField, boolean>;
      }> = {};
      if (en && typeof en === 'object' && 'value' in en)
        patch.privacyEnabled = !!(en as { value: unknown }).value;
      if (fields && typeof fields === 'object' && 'value' in fields) {
        const v = (fields as { value: unknown }).value;
        if (v && typeof v === 'object')
          // 蓋在預設值上 —— 未來新增的欄位沒存過就用預設,不會 undefined
          patch.privateFields = {
            ...DEFAULT_PRIVATE_FIELDS,
            ...(v as Record<PrivacyField, boolean>),
          };
      }
      if (Object.keys(patch).length) set(patch);
    } catch (err) {
      console.error('load privacy settings failed:', err);
    }
  },
  setPrivacyEnabled: (v) => {
    set({ privacyEnabled: v });
    db.settings
      .put({ key: 'privacyEnabled', value: v })
      .catch((err) => console.error('save privacyEnabled failed:', err));
  },

  language: 'zh',
  setLanguage: (lang) => {
    set({ language: lang });
    db.settings
      .put({ key: 'language', value: lang })
      .catch(() => undefined);
  },
  probandStyle: 'traditional',
  setProbandStyle: (s) => {
    set({ probandStyle: s });
    db.settings.put({ key: 'probandStyle', value: s }).catch(() => undefined);
  },
  loadProbandStyle: async () => {
    try {
      const rec = await db.settings.get('probandStyle');
      if (rec && typeof rec === 'object' && 'value' in rec) {
        const saved = (rec as { value: unknown }).value;
        if (saved === 'border' || saved === 'traditional') {
          set({ probandStyle: saved });
        }
      }
    } catch (err) {
      console.error('loadProbandStyle failed:', err);
    }
  },

  loadLanguage: async () => {
    try {
      const rec = await db.settings.get('language');
      if (rec && typeof rec === 'object' && 'value' in rec) {
        const saved = (rec as { value: unknown }).value;
        if (saved === 'zh' || saved === 'en') {
          set({ language: saved });
          return;
        }
      }
      // 沒存過 → 偵測瀏覽器語言(zh* 給中文 / 其他給英文)
      const navLang =
        typeof navigator !== 'undefined'
          ? (navigator.language || '').toLowerCase()
          : '';
      const detected: 'zh' | 'en' = navLang.startsWith('zh') ? 'zh' : 'en';
      set({ language: detected });
      // 持久化(下次直接走 saved 那條,不用再偵測)
      db.settings
        .put({ key: 'language', value: detected })
        .catch(() => undefined);
    } catch (err) {
      console.error('loadLanguage failed:', err);
    }
  },

  expandMedical: false,
  expandExtended: false,
  expandGenetic: false,
  // 疾病/藥物 5 個擴充庫:預設全勾(使用者可手動取消)
  expandIcd10cm: true,
  expandIcd11: true,
  expandDsm5: true,
  expandNhiMed: true,
  expandSelfPayMed: true,
  setExpand: (key, value) => {
    const map = {
      medical: 'expandMedical',
      extended: 'expandExtended',
      genetic: 'expandGenetic',
      icd10cm: 'expandIcd10cm',
      icd11: 'expandIcd11',
      dsm5: 'expandDsm5',
      nhiMed: 'expandNhiMed',
      selfPayMed: 'expandSelfPayMed',
    } as const;
    set({ [map[key]]: value });
  },
  togglePrivateField: (f) => {
    set((s) => ({
      privateFields: { ...s.privateFields, [f]: !s.privateFields[f] },
    }));
    savePrivateFields(get().privateFields);
  },
  setSectionFields: (section, value) => {
    set((s) => {
      const next = { ...s.privateFields };
      fieldsInSection(section).forEach((f) => {
        next[f] = value;
      });
      return { privateFields: next };
    });
    savePrivateFields(get().privateFields);
  },
  history: { past: [], future: [] },


  selectPerson: (id) =>
    set((s) => ({
      ...selectOnly({ selectedPersonIds: id ? [id] : [] }),
      inspectorTarget: id ? { type: 'person', id } : s.inspectorTarget,
    })),

  selectUnit: (id) => set(() => selectOnly({ selectedUnitIds: id ? [id] : [] })),

  selectUnits: (ids) => set(() => selectOnly({ selectedUnitIds: ids })),

  selectPersonsAndUnits: (personIds, unitIds) =>
    set((s) => ({
      ...selectOnly({ selectedPersonIds: personIds, selectedUnitIds: unitIds }),
      inspectorTarget:
        personIds.length === 1
          ? { type: 'person', id: personIds[0] }
          : s.inspectorTarget,
    })),

  togglePersonSelection: (id) => {
    const cur = get().selectedPersonIds;
    const has = cur.includes(id);
    const next = has ? cur.filter((x) => x !== id) : [...cur, id];
    // shift-click 只調整人物選取,保留已匡選的單位(supports mixed marquee)
    set((s) => ({
      selectedPersonIds: next,
      selectedLineIds: [],
      selectedEcosystemId: null,
      selectedHouseholdId: null,
      editingEcosystemId: null,
      inspectorTarget:
        next.length === 1
          ? { type: 'person', id: next[0] }
          : s.inspectorTarget,
    }));
  },

  selectHousehold: (id) => set(() => selectOnly({ selectedHouseholdId: id })),

  // 切換選取對象時自動退出編輯(editingEcosystemId 由 selectOnly 清掉)
  selectEcosystem: (id) => set(() => selectOnly({ selectedEcosystemId: id })),

  // 進編輯也順便保持選中
  setEditingEcosystem: (id) =>
    set(() => selectOnly({ editingEcosystemId: id, selectedEcosystemId: id })),

  selectPersons: (ids) =>
    set((s) => ({
      ...selectOnly({ selectedPersonIds: ids }),
      inspectorTarget:
        ids.length === 1
          ? { type: 'person', id: ids[0] }
          : s.inspectorTarget,
    })),

  selectLine: (id) =>
    set((s) => ({
      ...selectOnly({ selectedLineIds: id ? [id] : [] }),
      inspectorTarget: id ? { type: 'line', id } : s.inspectorTarget,
    })),

  selectLines: (ids) =>
    set((s) => ({
      ...selectOnly({ selectedLineIds: ids }),
      inspectorTarget:
        ids.length === 1
          ? { type: 'line', id: ids[0] }
          : s.inspectorTarget,
    })),

  toggleLineSelection: (id) => {
    const cur = get().selectedLineIds;
    const has = cur.includes(id);
    const next = has ? cur.filter((x) => x !== id) : [...cur, id];
    set((s) => ({
      selectedLineIds: next,
      selectedPersonIds: [],
      selectedUnitIds: [],
      selectedEcosystemId: null,
      selectedHouseholdId: null,
      editingEcosystemId: null,
      inspectorTarget:
        next.length === 1
          ? { type: 'line', id: next[0] }
          : s.inspectorTarget,
    }));
  },

  describeDeletable: () => {
    const st = get();
    if (st.selectedHouseholdId) return { kind: 'household', n: 1 };
    if (st.selectedPersonIds.length > 0 && st.selectedUnitIds.length > 0)
      return { kind: 'personsUnits', n: st.selectedPersonIds.length, m: st.selectedUnitIds.length };
    if (st.selectedPersonIds.length > 0) return { kind: 'persons', n: st.selectedPersonIds.length };
    if (st.selectedLineIds.length > 0) return { kind: 'lines', n: st.selectedLineIds.length };
    if (st.selectedUnitIds.length > 0) return { kind: 'units', n: st.selectedUnitIds.length };
    if (st.selectedEcosystemId) {
      const eco = st.currentCase?.ecosystems?.find((x) => x.id === st.selectedEcosystemId);
      return { kind: 'ecosystem', n: 1, name: eco?.label?.trim() || '' };
    }
    if (st.selectedConnector) return { kind: 'connector', n: 1 };
    return null;
  },
  deleteSelected: () => {
    const st = get();
    const d = st.describeDeletable();
    if (!d) return false;
    switch (d.kind) {
      case 'household':
        st.removeHousehold(st.selectedHouseholdId!);
        break;
      case 'personsUnits':
        st.removePersonsAndUnits(st.selectedPersonIds, st.selectedUnitIds);
        break;
      case 'persons':
        st.removePersons(st.selectedPersonIds);
        break;
      case 'lines':
        st.removeLines(st.selectedLineIds);
        break;
      case 'units':
        st.removeNetworkUnits(st.selectedUnitIds);
        break;
      case 'ecosystem':
        st.removeEcosystem(st.selectedEcosystemId!);
        break;
      case 'connector':
        st.removeConnector(st.selectedConnector!.unitId, st.selectedConnector!.connectorId);
        break;
    }
    return true;
  },
  clearSelection: () =>
    set((s) => ({
      ...selectOnly({}),
      // 清掉線條的 inspectorTarget(讓 Tab2 關係按鈕不會繼續「改剛畫好的那條」)
      //  但保留 person target,Tab1/3 還能看著同一個人物編輯
      inspectorTarget:
        s.inspectorTarget?.type === 'line' ? null : s.inspectorTarget,
    })),

  setInspectorTarget: (target) => set({ inspectorTarget: target }),

  addPerson: (person) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const newCase = touch({ ...c, persons: [...c.persons, person] });
    set({ ...pushHistory(c, history, newCase) });
  },


  addPersonAtCenter: (centerX, centerY) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const free = findFreeRight(
      c.persons,
      snapToGrid(centerX),
      snapToGrid(centerY),
    );
    const newP: Person = {
      id: uid('p'),
      position: { x: free.x, y: free.y },
      shape: 'square',
      basicInfo: {},
    };
    const newCase = touch({ ...c, persons: [...c.persons, newP] });
    set({
      ...pushHistory(c, history, newCase),
      selectedPersonIds: [newP.id],
      selectedLineIds: [],
      selectedHouseholdId: null,
      inspectorTarget: { type: 'person', id: newP.id },
    });
  },

  updatePerson: (id, patch, opts) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const newCase = touch({
      ...c,
      persons: c.persons.map((p) =>
        p.id === id
          ? {
              ...p,
              ...patch,
              basicInfo: { ...p.basicInfo, ...patch.basicInfo },
            }
          : p,
      ),
    });
    if (joinsPreviousStep('person', id, history.past.length, opts)) {
      // 併入上一格:只更新現況,不推快照(上一格已存著這串編輯開始前的狀態)
      set({ currentCase: newCase, history: { ...history, future: [] } });
      return;
    }
    set({ ...pushHistory(c, history, newCase) });
    openEditStep('person', id, get().history.past.length);
  },

  // 拖移不記 history(避免每個 pointer move 都 push)
  movePerson: (id, x, y) => {
    const c = get().currentCase;
    if (!c) return;
    set({
      currentCase: touch({
        ...c,
        persons: c.persons.map((p) =>
          p.id === id ? { ...p, position: { x, y } } : p,
        ),
      }),
    });
  },

  // 拖曳手勢結束:把「拖曳前快照」推進 history(#123)
  // → 一個手勢 = 一格復原;Cmd+Z 不再連帶吃掉上一個結構編輯
  commitMoveHistory: (before) => {
    const { currentCase: c, history } = get();
    if (!c || !before || before === c) return;
    if (before.id !== c.id) return; // 換個案間隙的殘留快照 → 丟棄
    breakEditWindow(); // 拖曳/微調也是歷史事件:之後的打字要開新格
    set({
      history: {
        past: [...history.past, before].slice(-MAX_HISTORY),
        future: [],
      },
    });
  },

  removePersons: (ids) => {
    const { currentCase: c, history, inspectorTarget } = get();
    if (!c) return;
    const set2 = new Set(ids);
    // 連帶清掉所有指向被刪人物的參照(#126):單位 connector、舊版 linkedPersonIds、
    // 同住戶 memberIds(清到空的 household 一併移除)。
    // 量表結果(scaleResults)刻意保留 — 施測紀錄是臨床資料,不隨人物自動刪。
    const newUnits = (c.networkUnits ?? []).map((u) => {
      const conns = (u.connectors ?? []).filter(
        (cn) => !(cn.target.type === 'person' && set2.has(cn.target.id)),
      );
      const linked = u.linkedPersonIds?.filter((pid) => !set2.has(pid));
      if (
        conns.length === (u.connectors ?? []).length &&
        (linked?.length ?? 0) === (u.linkedPersonIds?.length ?? 0)
      ) {
        return u;
      }
      return { ...u, connectors: conns, linkedPersonIds: linked };
    });
    const newHouseholds = (c.households ?? [])
      .map((h) => ({
        ...h,
        memberIds: h.memberIds.filter((m) => !set2.has(m)),
      }))
      .filter((h) => h.memberIds.length > 0);
    const newCase = touch({
      ...c,
      persons: c.persons.filter((p) => !set2.has(p.id)),
      lines: c.lines.filter(
        (l) => !set2.has(l.fromPersonId) && !set2.has(l.toPersonId),
      ),
      networkUnits: c.networkUnits ? newUnits : c.networkUnits,
      majorEvents: cleanEventPersonRefs(c.majorEvents, set2),
      households: c.households ? newHouseholds : c.households,
    });
    // 如果刪掉的是目前 Inspector 顯示的人 → fallback 到剩餘第一個
    const nextInspector =
      inspectorTarget?.type === 'person' && set2.has(inspectorTarget.id)
        ? newCase.persons.length > 0
          ? ({ type: 'person', id: newCase.persons[0].id } as const)
          : null
        : inspectorTarget;
    set({
      ...pushHistory(c, history, newCase),
      selectedPersonIds: [],
      selectedHouseholdId: null, // 刪光成員會連帶解散空圈 —— 殘留選取一併清
      inspectorTarget: nextInspector,
    });
  },

  cycleShape: (id) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    // square↔circle 互切;triangle 有自己的 4 狀態妊娠循環;其他不動
    // triangle 循環: pregnancy(outline) → stillbirth(filled) → miscarriage(小填) → abortion(X) → 回 pregnancy
    const TRI_CYCLE: Array<'pregnancy' | 'stillbirth' | 'miscarriage' | 'abortion'> = [
      'pregnancy',
      'stillbirth',
      'miscarriage',
      'abortion',
    ];
    const newCase = touch({
      ...c,
      persons: c.persons.map((p) => {
        if (p.id !== id) return p;
        if (p.shape === 'square') return { ...p, shape: 'circle' };
        if (p.shape === 'circle') return { ...p, shape: 'square' };
        if (p.shape === 'triangle') {
          const cur = (p.lifeStatus ?? 'pregnancy') as
            | 'pregnancy'
            | 'stillbirth'
            | 'miscarriage'
            | 'abortion';
          const i = TRI_CYCLE.indexOf(cur);
          const next = TRI_CYCLE[(i + 1) % TRI_CYCLE.length];
          return { ...p, lifeStatus: next };
        }
        return p; // diamond / institution / pet 不循環
      }),
    });
    set({ ...pushHistory(c, history, newCase) });
  },

  setPendingRelation: (sub) => set({ pendingRelation: sub }),
  setPendingMember: (sub) => set({ pendingMember: sub }),
  setTab2ShowMarriage: (v) => {
    try {
      localStorage.setItem('tab2.showMarriage', v ? '1' : '0');
    } catch {
      // ignore
    }
    set({ tab2ShowMarriage: v });
  },
  setTab2ShowRelation: (v) => {
    try {
      localStorage.setItem('tab2.showRelation', v ? '1' : '0');
    } catch {
      // ignore
    }
    set({ tab2ShowRelation: v });
  },

  createRelationLine: (fromPersonId, toPersonId, subType) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    if (fromPersonId === toPersonId) return; // 不允許自己連自己
    // 同一對 person 同樣 subType 已存在 → 不重複建
    const dup = c.lines.find(
      (l) =>
        l.subType === subType &&
        ((l.fromPersonId === fromPersonId && l.toPersonId === toPersonId) ||
          (l.fromPersonId === toPersonId && l.toPersonId === fromPersonId)),
    );
    if (dup) {
      set({ pendingRelation: null });
      return;
    }
    const line = mkLine(fromPersonId, toPersonId, subType);
    const newCase = touch({ ...c, lines: [...c.lines, line] });
    set({
      ...pushHistory(c, history, newCase),
      pendingRelation: null,
      selectedLineIds: [line.id],
      selectedHouseholdId: null,
      inspectorTarget: { type: 'line', id: line.id },
    });
  },

  /** v1.1 建立婚姻線(Tab2 pending mode 用) */
  createMarriageLine: (fromPersonId, toPersonId, subType) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    if (fromPersonId === toPersonId) return;
    // 同一對人物已有 member line → 不重複建,選中既有那條
    const existing = c.lines.find(
      (l) =>
        l.category === 'member' &&
        ((l.fromPersonId === fromPersonId && l.toPersonId === toPersonId) ||
          (l.fromPersonId === toPersonId && l.toPersonId === fromPersonId)),
    );
    if (existing) {
      set({
        pendingMember: null,
        selectedLineIds: [existing.id],
        inspectorTarget: { type: 'line', id: existing.id },
      });
      return;
    }
    const line = mkLine(fromPersonId, toPersonId, subType);
    const newCase = touch({ ...c, lines: [...c.lines, line] });
    set({
      ...pushHistory(c, history, newCase),
      pendingMember: null,
      selectedLineIds: [line.id],
      selectedHouseholdId: null,
      inspectorTarget: { type: 'line', id: line.id },
    });
  },

  createUnknownFamilyLine: (fromPersonId, toPersonId) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    if (fromPersonId === toPersonId) return; // 不允許自己連自己
    // 若兩人之間已有任何 member line(婚姻/親子/手足/妊娠),不重複建
    const exists = c.lines.find(
      (l) =>
        l.category === 'member' &&
        ((l.fromPersonId === fromPersonId && l.toPersonId === toPersonId) ||
          (l.fromPersonId === toPersonId && l.toPersonId === fromPersonId)),
    );
    if (exists) {
      // 已經有 member line → 直接選中既有那條,讓使用者看到「已存在」
      set({
        selectedLineIds: [exists.id],
        inspectorTarget: { type: 'line', id: exists.id },
      });
      return;
    }
    // 直接建 biological 親生線(實線、灰黑,跟其他 member line 同樣樣式)
    // 使用者可後續雙擊切實/虛,或之後改型 UI 改成婚姻/收養等
    const line = mkLine(fromPersonId, toPersonId, 'biological');
    const newCase = touch({ ...c, lines: [...c.lines, line] });
    set({
      ...pushHistory(c, history, newCase),
      selectedLineIds: [line.id],
      selectedHouseholdId: null,
      inspectorTarget: { type: 'line', id: line.id },
    });
  },


  updateLine: (id, patch, opts) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const newCase = touch({
      ...c,
      lines: c.lines.map((l) =>
        l.id === id
          ? { ...l, ...patch, visual: { ...l.visual, ...patch.visual } }
          : l,
      ),
    });
    if (joinsPreviousStep('line', id, history.past.length, opts)) {
      set({ currentCase: newCase, history: { ...history, future: [] } });
      return;
    }
    set({ ...pushHistory(c, history, newCase) });
    openEditStep('line', id, get().history.past.length);
  },

  removeLine: (id) => get().removeLines([id]),
  removeLines: (ids) => {
    const { currentCase: c, history, inspectorTarget } = get();
    if (!c) return;
    const wanted = ids.filter((id) => c.lines.some((l) => l.id === id));
    if (wanted.length === 0) return;

    // 找配對線:同 child + 另一配偶 + 同 bio-like subType → 一起刪
    // (處理「拖小孩到婚姻線」會建立兩條配對線,刪一條另一條應該也消失)
    const BIO_LIKE = new Set<LineSubType>([
      'biological',
      'adopted',
      'placed-out',
      'fostered',
      'sperm-donor',
    ]);
    const idsToRemove = new Set<string>(wanted);
    for (const id of wanted) {
      const target = c.lines.find((l) => l.id === id)!;
      if (!BIO_LIKE.has(target.subType)) continue;
      const childId = target.toPersonId;
      const parentId = target.fromPersonId;
      // 找這個 parent 的配偶(透過 marriage-like)— v1.1 用共用常數
      const spouseLine = c.lines.find(
        (l) =>
          MARRIAGE_SUBTYPE_SET.has(l.subType) &&
          (l.fromPersonId === parentId || l.toPersonId === parentId),
      );
      if (!spouseLine) continue;
      const spouseId =
        spouseLine.fromPersonId === parentId ? spouseLine.toPersonId : spouseLine.fromPersonId;
      // 找配偶到同 child 的 bio-like 線(配對)
      const pair = c.lines.find(
        (l) => l.fromPersonId === spouseId && l.toPersonId === childId && BIO_LIKE.has(l.subType),
      );
      if (pair) idsToRemove.add(pair.id);
    }

    const newCase = touch({
      ...c,
      lines: c.lines.filter((l) => !idsToRemove.has(l.id)),
    });
    const nextInspector =
      inspectorTarget?.type === 'line' && idsToRemove.has(inspectorTarget.id)
        ? null
        : inspectorTarget;
    set({
      ...pushHistory(c, history, newCase),
      selectedLineIds: [],
      inspectorTarget: nextInspector,
    });
  },

  updateLineEndpoint: (lineId, end, newPersonId) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const line = c.lines.find((l) => l.id === lineId);
    if (!line) return;
    // 不允許連到自己或原本另一端相同
    const other = end === 'from' ? line.toPersonId : line.fromPersonId;
    if (newPersonId === other) return;
    // 查重:拖完後這條線的兩端,若與「另一條」既有線構成重複 → 整個動作 no-op(線留原位)
    //   - member 線:同一對之間已有任何 member 線就算重複(對齊 createMarriageLine)
    //   - relation 線:同一對且同 subType 才算重複(對齊 createRelationLine)
    const newFrom = end === 'from' ? newPersonId : line.fromPersonId;
    const newTo = end === 'from' ? line.toPersonId : newPersonId;
    const samePair = (a: string, b: string) =>
      (a === newFrom && b === newTo) || (a === newTo && b === newFrom);
    const dup = c.lines.find(
      (l) =>
        l.id !== lineId &&
        samePair(l.fromPersonId, l.toPersonId) &&
        (line.category === 'member'
          ? l.category === 'member'
          : l.subType === line.subType),
    );
    if (dup) return;
    const newCase = touch({
      ...c,
      lines: c.lines.map((l) => {
        if (l.id !== lineId) return l;
        return end === 'from'
          ? { ...l, fromPersonId: newPersonId }
          : { ...l, toPersonId: newPersonId };
      }),
    });
    set({ ...pushHistory(c, history, newCase) });
  },

  cycleLineSubType: (lineId) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const line = c.lines.find((l) => l.id === lineId);
    if (!line) return;

    // 婚姻系輪換池:結婚 → 離婚 → 訂婚 → ...
    const MARRIAGE_POOL: LineSubType[] = ['marriage', 'divorce', 'engagement'];
    const RELATION_POOL: LineSubType[] = [
      'connected',
      'close',
      'distant',
      'hostile',
      'cutoff',
    ];

    const marriageish = new Set<LineSubType>([
      'marriage',
      'divorce',
      'engagement',
      'cohabitation-commit',
      'partnership',
      'separation',
      'secret-affair',
      'divorce-remarriage',
    ]);
    // 親子線視為「主要(實線)/次要(虛線)」二元 — 細分 subType 不在 UI 暴露
    const bioish = new Set<LineSubType>([
      'biological',
      'adopted',
      'fostered',
      'placed-out',
    ]);

    // 親子線特殊處理:2-態 toggle(實 ⇄ 虛)
    if (bioish.has(line.subType)) {
      const currentStyle = SUBTYPE_SPEC[line.subType]?.lineStyle ?? 'solid';
      const isCurrentlySolid = currentStyle === 'solid';

      if (isCurrentlySolid) {
        // 實 → 虛(夫妻雙方的親子線一起變)
        // 例:AB 夫妻 + C 子女,雙擊 A→C 時 B→C 也一起虛,
        // 不然會出現「A 是養父、B 是親生」這種視覺不一致的狀態
        const childId = line.toPersonId;
        const clickedParentId = line.fromPersonId;
        // v1.1 共用常數
        const spouseLine = c.lines.find(
          (l) =>
            MARRIAGE_SUBTYPE_SET.has(l.subType) &&
            (l.fromPersonId === clickedParentId ||
              l.toPersonId === clickedParentId),
        );
        const spouseId = spouseLine
          ? spouseLine.fromPersonId === clickedParentId
            ? spouseLine.toPersonId
            : spouseLine.fromPersonId
          : null;
        const idsToFlip = new Set<string>([lineId]);
        if (spouseId) {
          const spouseBio = c.lines.find(
            (l) =>
              l.toPersonId === childId &&
              l.fromPersonId === spouseId &&
              bioish.has(l.subType),
          );
          if (spouseBio) idsToFlip.add(spouseBio.id);
        }
        const newCase = touch({
          ...c,
          lines: c.lines.map((l) =>
            idsToFlip.has(l.id)
              ? {
                  ...l,
                  subType: 'placed-out' as LineSubType,
                  visual: { ...l.visual, lineStyle: 'dashed' as const },
                }
              : l,
          ),
        });
        set({ ...pushHistory(c, history, newCase) });
        return;
      }

      // 虛 → 實 + mutex
      //  該線(以及 from 父母的配偶對應線)升為 biological(實線);
      //  其他連到同 child 的 bio 線降為 placed-out(虛線)
      const childId = line.toPersonId;
      const promotedParentId = line.fromPersonId;
      // v1.1 共用常數
      const spouseLine = c.lines.find(
        (l) =>
          MARRIAGE_SUBTYPE_SET.has(l.subType) &&
          (l.fromPersonId === promotedParentId ||
            l.toPersonId === promotedParentId),
      );
      const spouseId = spouseLine
        ? spouseLine.fromPersonId === promotedParentId
          ? spouseLine.toPersonId
          : spouseLine.fromPersonId
        : null;
      const primarySet = new Set<string>([promotedParentId]);
      if (spouseId) primarySet.add(spouseId);

      const newCaseMutex = touch({
        ...c,
        lines: c.lines.map((l) => {
          if (l.toPersonId !== childId || !bioish.has(l.subType)) return l;
          if (primarySet.has(l.fromPersonId)) {
            return {
              ...l,
              subType: 'biological' as LineSubType,
              visual: { ...l.visual, lineStyle: 'solid' as const },
            };
          }
          return {
            ...l,
            subType: 'placed-out' as LineSubType,
            visual: { ...l.visual, lineStyle: 'dashed' as const },
          };
        }),
      });
      set({ ...pushHistory(c, history, newCaseMutex) });
      return;
    }

    // 婚姻 / 關係線:照舊用 pool 循環
    let pool: LineSubType[] | null = null;
    if (marriageish.has(line.subType)) pool = MARRIAGE_POOL;
    else if (line.category === 'relation') pool = RELATION_POOL;
    if (!pool) return;

    const idx = pool.indexOf(line.subType);
    const nextSubType = pool[(idx + 1) % pool.length];
    const spec = SUBTYPE_SPEC[nextSubType];
    const nextStyle = spec?.lineStyle ?? 'solid';

    const newCase = touch({
      ...c,
      lines: c.lines.map((l) =>
        l.id === lineId
          ? {
              ...l,
              subType: nextSubType,
              visual: { ...l.visual, lineStyle: nextStyle },
            }
          : l,
      ),
    });
    set({ ...pushHistory(c, history, newCase) });
  },


  addSecondaryParentsFromMarriage: (childId, marriageLineId) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const m = c.lines.find((l) => l.id === marriageLineId);
    if (!m) return;
    const m1Id = m.fromPersonId;
    const m2Id = m.toPersonId;
    if (childId === m1Id || childId === m2Id) return; // 自己不能當自己父母

    // Guard:若 M 已是 A 的父母則不重複加(避免雙條同向)
    const BIO_LIKE = new Set<LineSubType>([
      'biological',
      'adopted',
      'placed-out',
      'fostered',
      'sperm-donor',
    ]);
    const existsM1 = c.lines.some(
      (l) =>
        l.fromPersonId === m1Id &&
        l.toPersonId === childId &&
        BIO_LIKE.has(l.subType),
    );
    const existsM2 = c.lines.some(
      (l) =>
        l.fromPersonId === m2Id &&
        l.toPersonId === childId &&
        BIO_LIKE.has(l.subType),
    );
    const newLines = [...c.lines];
    if (!existsM1) newLines.push(mkLine(m1Id, childId, 'placed-out', 'dashed'));
    if (!existsM2) newLines.push(mkLine(m2Id, childId, 'placed-out', 'dashed'));

    // 把 A 移到 M 的 fork 正下方(跟既有 children 重疊,使用者自己挪)
    const m1 = c.persons.find((p) => p.id === m1Id);
    const m2 = c.persons.find((p) => p.id === m2Id);
    let newPersons = c.persons;
    if (m1 && m2) {
      const forkX = snapToGrid((m1.position.x + m2.position.x) / 2);
      const forkY = snapToGrid(
        Math.max(m1.position.y, m2.position.y) + GRID_SIZE * 2,
      );
      newPersons = c.persons.map((p) =>
        p.id === childId ? { ...p, position: { x: forkX, y: forkY } } : p,
      );
    }

    const newCase = touch({ ...c, persons: newPersons, lines: newLines });
    set({ ...pushHistory(c, history, newCase) });
  },

  addSecondaryParentFromPerson: (childId, parentPersonId) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    if (childId === parentPersonId) return;
    const BIO_LIKE = new Set<LineSubType>([
      'biological',
      'adopted',
      'placed-out',
      'fostered',
      'sperm-donor',
    ]);
    // Guard:已經是父母則不重複加
    const exists = c.lines.some(
      (l) =>
        l.fromPersonId === parentPersonId &&
        l.toPersonId === childId &&
        BIO_LIKE.has(l.subType),
    );
    if (exists) return;
    const newLines = [...c.lines, mkLine(parentPersonId, childId, 'placed-out', 'dashed')];
    const newCase = touch({ ...c, lines: newLines });
    set({ ...pushHistory(c, history, newCase) });
  },

  selectedConnector: null,
  // 選 connector 也是一種選取:非 null 走 selectOnly(清掉其他);null 只清自己
  // (Canvas 在選人物 / 單位之後會補呼叫 setSelectedConnector(null),不能把剛選的東西一起清掉)
  setSelectedConnector: (sel) =>
    set(() => (sel ? selectOnly({ selectedConnector: sel }) : { selectedConnector: null })),

  toggleAllRelationLinesPrivate: (value) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const newLines = c.lines.map((l) => {
      if (l.category !== 'relation') return l;
      if (!!l.private === value) return l;
      return { ...l, private: value };
    });
    if (newLines === c.lines) return;
    const newCase = touch({ ...c, lines: newLines });
    set({ ...pushHistory(c, history, newCase) });
  },


  expandParents: (childId) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const child = c.persons.find((p) => p.id === childId);
    if (!child) return;
    const alreadyHasParents = c.lines.some(
      (l) =>
        l.toPersonId === childId &&
        (l.subType === 'biological' ||
          l.subType === 'adopted' ||
          l.subType === 'placed-out'),
    );
    if (alreadyHasParents) return;

    const fatherXIdeal = child.position.x - GRID_SIZE;
    const motherXIdeal = child.position.x + GRID_SIZE;
    const parentsY = child.position.y - GRID_SIZE * 2;

    // 避開規則:先往上推一行,2 次後改往右推
    const parentsOffset = (i: number) =>
      i <= 2
        ? { dx: 0, dy: -GRID_SIZE }
        : { dx: GRID_SIZE * 2, dy: 0 };

    const resolved = resolveBatchPositions(
      c.persons,
      [
        { x: snapToGrid(fatherXIdeal), y: snapToGrid(parentsY) },
        { x: snapToGrid(motherXIdeal), y: snapToGrid(parentsY) },
      ],
      [childId],
      parentsOffset,
    );

    const father: Person = {
      id: uid('p'),
      position: resolved[0],
      shape: 'square',
      basicInfo: {},
    };
    const mother: Person = {
      id: uid('p'),
      position: resolved[1],
      shape: 'circle',
      basicInfo: {},
    };
    const marriage = mkLine(father.id, mother.id, 'marriage');
    const bio1 = mkLine(father.id, childId, 'biological');
    const bio2 = mkLine(mother.id, childId, 'biological');
    const newCase = touch({
      ...c,
      persons: [...c.persons, father, mother],
      lines: [...c.lines, marriage, bio1, bio2],
    });
    set({ ...pushHistory(c, history, newCase) });
  },

  expandSpouseOrSibling: (personId, direction) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const person = c.persons.find((p) => p.id === personId);
    if (!person) return;

    const existingSameSide = c.lines.filter((l) => {
      if (
        l.subType !== 'marriage' &&
        l.subType !== 'engagement' &&
        l.subType !== 'partnership' &&
        l.subType !== 'cohabitation-commit' &&
        l.subType !== 'divorce' &&
        l.subType !== 'separation'
      )
        return false;
      if (l.fromPersonId !== personId && l.toPersonId !== personId)
        return false;
      const otherId =
        l.fromPersonId === personId ? l.toPersonId : l.fromPersonId;
      const other = c.persons.find((p) => p.id === otherId);
      if (!other) return false;
      const dx = other.position.x - person.position.x;
      return direction === 'right' ? dx > 0 : dx < 0;
    });

    // 上限 3 段婚姻
    if (existingSameSide.length >= 3) return;

    const baseRadius = GRID_SIZE * 2; // 最舊的距離
    const stepPerLayer = GRID_SIZE; // 每層多一格
    const n = existingSameSide.length + 1;

    // 既有配偶按加入順序(舊 → 新)
    const existingIds: string[] = existingSameSide.map((line) =>
      line.fromPersonId === personId ? line.toPersonId : line.fromPersonId,
    );

    const newSpouse: Person = {
      id: uid('p'),
      position: { x: 0, y: 0 },
      shape: flipShape(person.shape),
      basicInfo: {},
    };

    // 順序:最新在最前(i=0 → 最上);最舊在最後(i=n-1 → 最下)
    // 對應 fanAngle 的 sin:i=0 → 負 → Y 小(上);i=n-1 → 正 → Y 大(下)
    const reorderedIds = [newSpouse.id, ...existingIds.slice().reverse()];

    // 扇形 + 階層:新的距離遠、舊的距離近
    const xSign = direction === 'right' ? 1 : -1;
    const gap = n <= 1 ? 0 : Math.PI / (n + 1);
    const initialPositions = reorderedIds.map((_, i) => {
      const offset = (i - (n - 1) / 2) * gap;
      const radius = baseRadius + (n - 1 - i) * stepPerLayer;
      return {
        x: snapToGrid(person.position.x + xSign * radius * Math.cos(offset)),
        y: snapToGrid(person.position.y + radius * Math.sin(offset)),
      };
    });

    // 碰撞處理:若新配偶位置撞到別人(通常是手足) → 把對方(+配偶+子女)整組往外推
    const excludeSet = new Set([person.id, ...reorderedIds]);
    const pushDX = xSign * GRID_SIZE * 2;
    let pushedPersons = c.persons;
    let safety = 5;
    while (safety-- > 0) {
      const collidingPerson = pushedPersons.find((p) => {
        if (excludeSet.has(p.id)) return false;
        return initialPositions.some(
          (pos) =>
            Math.abs(p.position.x - pos.x) < COLLISION_TOLERANCE &&
            Math.abs(p.position.y - pos.y) < COLLISION_TOLERANCE,
        );
      });
      if (!collidingPerson) break;
      const kinIds = new Set(collectKin(collidingPerson.id, c.lines));
      pushedPersons = pushedPersons.map((p) =>
        kinIds.has(p.id)
          ? { ...p, position: { x: p.position.x + pushDX, y: p.position.y } }
          : p,
      );
    }

    // 放進既有/新配偶到 initialPositions 指定的位置
    const updatedPersons = pushedPersons.map((p) => {
      const idx = reorderedIds.indexOf(p.id);
      if (idx !== -1 && p.id !== newSpouse.id)
        return { ...p, position: initialPositions[idx] };
      return p;
    });
    newSpouse.position = initialPositions[0];

    const newLine = mkLine(
      direction === 'right' ? personId : newSpouse.id,
      direction === 'right' ? newSpouse.id : personId,
      'marriage',
    );

    const newCase = touch({
      ...c,
      persons: [...updatedPersons, newSpouse],
      lines: [...c.lines, newLine],
    });
    set({ ...pushHistory(c, history, newCase) });
  },

  expandChild: (personId) => {
    const c = get().currentCase;
    if (!c) return;
    const person = c.persons.find((p) => p.id === personId);
    if (!person) return;

    const marriageLine = c.lines.find(
      (l) =>
        (l.subType === 'marriage' ||
          l.subType === 'engagement' ||
          l.subType === 'partnership' ||
          l.subType === 'cohabitation-commit' ||
          l.subType === 'divorce' ||
          l.subType === 'separation') &&
        (l.fromPersonId === personId || l.toPersonId === personId),
    );

    if (marriageLine) {
      get().expandChildFromMarriage(marriageLine.id);
      return;
    }

    get().expandSpouseOrSibling(personId, 'right');
    const latest = get().currentCase;
    if (!latest) return;
    const newMarriage = [...latest.lines]
      .reverse()
      .find(
        (l) =>
          (l.subType === 'marriage' ||
            l.subType === 'engagement' ||
            l.subType === 'partnership' ||
            l.subType === 'cohabitation-commit') &&
          (l.fromPersonId === personId || l.toPersonId === personId),
      );
    if (newMarriage) {
      get().expandChildFromMarriage(newMarriage.id);
    }
  },

  expandChildFromMarriage: (marriageLineId) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const m = c.lines.find((l) => l.id === marriageLineId);
    if (!m) return;
    const a = c.persons.find((p) => p.id === m.fromPersonId);
    const b = c.persons.find((p) => p.id === m.toPersonId);
    if (!a || !b) return;

    const childrenIds = c.persons
      .filter((p) => {
        const byA = c.lines.some(
          (l) =>
            l.fromPersonId === a.id &&
            l.toPersonId === p.id &&
            (l.subType === 'biological' ||
              l.subType === 'adopted' ||
              l.subType === 'placed-out'),
        );
        const byB = c.lines.some(
          (l) =>
            l.fromPersonId === b.id &&
            l.toPersonId === p.id &&
            (l.subType === 'biological' ||
              l.subType === 'adopted' ||
              l.subType === 'placed-out'),
        );
        return byA && byB;
      })
      .map((p) => p.id);

    const midX = (a.position.x + b.position.x) / 2;
    const baseY = Math.max(a.position.y, b.position.y) + GRID_SIZE * 2;
    const step = GRID_SIZE * 2;

    const n = childrenIds.length + 1;

    const newChild: Person = {
      id: uid('p'),
      position: { x: 0, y: 0 },
      shape: 'square',
      basicInfo: {},
    };
    const allIds = [...childrenIds, newChild.id];

    // 同排對稱:以中點為軸,間距 2 格
    const initialChildPositions = allIds.map((_, i) => ({
      x: snapToGrid(midX + (i - (n - 1) / 2) * step),
      y: snapToGrid(baseY),
    }));

    // 避開規則:整批往下一行
    const childrenOffset = () => ({ dx: 0, dy: GRID_SIZE });
    const newPositions = resolveBatchPositions(
      c.persons,
      initialChildPositions,
      [a.id, b.id, ...childrenIds],
      childrenOffset,
    );

    // ==================== 配偶跟動 ====================
    // 每個被移動的現有子女,若有配偶,配偶同步平移相同 (dx, dy)
    // v1.1 共用常數
    const spouseMoves: { id: string; dx: number; dy: number }[] = [];
    for (let i = 0; i < childrenIds.length; i++) {
      const cid = childrenIds[i];
      const oldChild = c.persons.find((p) => p.id === cid);
      if (!oldChild) continue;
      const dx = newPositions[i].x - oldChild.position.x;
      const dy = newPositions[i].y - oldChild.position.y;
      if (dx === 0 && dy === 0) continue;
      const spouseIds = c.lines
        .filter(
          (l) =>
            MARRIAGE_SUBTYPE_SET.has(l.subType) &&
            (l.fromPersonId === cid || l.toPersonId === cid),
        )
        .map((l) => (l.fromPersonId === cid ? l.toPersonId : l.fromPersonId));
      for (const sid of spouseIds) {
        if (sid === a.id || sid === b.id) continue;
        if (allIds.includes(sid)) continue;
        if (spouseMoves.some((m) => m.id === sid)) continue;
        spouseMoves.push({ id: sid, dx, dy });
      }
    }

    // 新子女位置檢查:如果跟「移動後的配偶位置」撞,往外推
    let finalNewChildPos = { ...newPositions[n - 1] };
    const movedSpousePositions = spouseMoves
      .map((m) => {
        const sp = c.persons.find((p) => p.id === m.id);
        return sp ? { x: sp.position.x + m.dx, y: sp.position.y + m.dy } : null;
      })
      .filter((x): x is { x: number; y: number } => x !== null);
    const dir = finalNewChildPos.x >= midX ? 1 : -1;
    let safety = 6;
    while (
      safety-- > 0 &&
      movedSpousePositions.some(
        (sp) =>
          Math.abs(sp.x - finalNewChildPos.x) < COLLISION_TOLERANCE &&
          Math.abs(sp.y - finalNewChildPos.y) < COLLISION_TOLERANCE,
      )
    ) {
      finalNewChildPos = {
        x: finalNewChildPos.x + dir * GRID_SIZE * 2,
        y: finalNewChildPos.y,
      };
    }

    const updatedPersons = c.persons.map((p) => {
      const idx = allIds.indexOf(p.id);
      if (idx !== -1 && p.id !== newChild.id)
        return { ...p, position: newPositions[idx] };
      const sm = spouseMoves.find((m) => m.id === p.id);
      if (sm)
        return {
          ...p,
          position: { x: p.position.x + sm.dx, y: p.position.y + sm.dy },
        };
      return p;
    });
    newChild.position = finalNewChildPos;

    const bio1 = mkLine(a.id, newChild.id, 'biological');
    const bio2 = mkLine(b.id, newChild.id, 'biological');

    const newCase = touch({
      ...c,
      persons: [...updatedPersons, newChild],
      lines: [...c.lines, bio1, bio2],
    });
    set({ ...pushHistory(c, history, newCase) });
  },

  // 一次新增 N 胞胎(共享 twinGroupId,渲染時共用 fork)
  expandTwinsFromMarriage: (marriageLineId, count, twinType) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    if (count < 2 || count > 15) return;
    const m = c.lines.find((l) => l.id === marriageLineId);
    if (!m) return;
    const a = c.persons.find((p) => p.id === m.fromPersonId);
    const b = c.persons.find((p) => p.id === m.toPersonId);
    if (!a || !b) return;

    const childrenIds = c.persons
      .filter((p) => {
        const byA = c.lines.some(
          (l) =>
            l.fromPersonId === a.id &&
            l.toPersonId === p.id &&
            (l.subType === 'biological' ||
              l.subType === 'adopted' ||
              l.subType === 'placed-out'),
        );
        const byB = c.lines.some(
          (l) =>
            l.fromPersonId === b.id &&
            l.toPersonId === p.id &&
            (l.subType === 'biological' ||
              l.subType === 'adopted' ||
              l.subType === 'placed-out'),
        );
        return byA && byB;
      })
      .map((p) => p.id);

    const midX = (a.position.x + b.position.x) / 2;
    const baseY = Math.max(a.position.y, b.position.y) + GRID_SIZE * 2;
    const step = GRID_SIZE * 2;
    const total = childrenIds.length + count;
    const twinGroupId = `tw_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const newChildren: Person[] = [];
    for (let i = 0; i < count; i++) {
      newChildren.push({
        id: uid('p'),
        position: { x: 0, y: 0 },
        shape: 'square',
        basicInfo: {},
        twinGroupId,
        twinType,
      });
    }
    const allIds = [...childrenIds, ...newChildren.map((nc) => nc.id)];

    const initialChildPositions = allIds.map((_, i) => ({
      x: snapToGrid(midX + (i - (total - 1) / 2) * step),
      y: snapToGrid(baseY),
    }));

    const childrenOffset = () => ({ dx: 0, dy: GRID_SIZE });
    const newPositions = resolveBatchPositions(
      c.persons,
      initialChildPositions,
      [a.id, b.id, ...childrenIds],
      childrenOffset,
    );

    const updatedPersons = c.persons.map((p) => {
      const idx = allIds.indexOf(p.id);
      if (idx !== -1 && !newChildren.some((nc) => nc.id === p.id))
        return { ...p, position: newPositions[idx] };
      return p;
    });
    // 為每個 newChildren 設位置(後 count 個位置)
    newChildren.forEach((nc, i) => {
      nc.position = newPositions[childrenIds.length + i];
    });

    const newLines: Line[] = [];
    for (const nc of newChildren) {
      newLines.push(mkLine(a.id, nc.id, 'biological'));
      newLines.push(mkLine(b.id, nc.id, 'biological'));
    }

    const newCase = touch({
      ...c,
      persons: [...updatedPersons, ...newChildren],
      lines: [...c.lines, ...newLines],
    });
    set({ ...pushHistory(c, history, newCase) });
  },

  // 從人物觸發的多胞胎(若無配偶 → 自動建)
  expandTwinsFromPerson: (personId, count, twinType) => {
    const c = get().currentCase;
    if (!c) return;
    if (count < 2 || count > 15) return;
    const person = c.persons.find((p) => p.id === personId);
    if (!person) return;

    // 已有 marriage-like 線 → 用該 marriage 觸發
    const marriageLine = c.lines.find(
      (l) =>
        (l.subType === 'marriage' ||
          l.subType === 'engagement' ||
          l.subType === 'partnership' ||
          l.subType === 'cohabitation-commit' ||
          l.subType === 'divorce' ||
          l.subType === 'separation') &&
        (l.fromPersonId === personId || l.toPersonId === personId),
    );
    if (marriageLine) {
      get().expandTwinsFromMarriage(marriageLine.id, count, twinType);
      return;
    }
    // 沒配偶 → 先建配偶
    get().expandSpouseOrSibling(personId, 'right');
    const latest = get().currentCase;
    if (!latest) return;
    const newMarriage = [...latest.lines]
      .reverse()
      .find(
        (l) =>
          (l.subType === 'marriage' ||
            l.subType === 'engagement' ||
            l.subType === 'partnership' ||
            l.subType === 'cohabitation-commit') &&
          (l.fromPersonId === personId || l.toPersonId === personId),
      );
    if (newMarriage) {
      get().expandTwinsFromMarriage(newMarriage.id, count, twinType);
    }
  },

  undo: () => {
    breakEditWindow(); // undo 後的打字必須開新格,不能併回舊窗
    const { currentCase, history } = get();
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    const newFuture = currentCase
      ? [currentCase, ...history.future].slice(0, MAX_HISTORY)
      : history.future;
    set({
      currentCase: previous,
      history: { past: newPast, future: newFuture },
      // 清掉「所有」選取(#126)— 殘留的 unit/生態圈選取按 Delete 會吃掉復原額度
      selectedPersonIds: [],
      selectedLineIds: [],
      selectedUnitIds: [],
      selectedEcosystemId: null,
      selectedHouseholdId: null,
      editingEcosystemId: null,
      selectedConnector: null,
    });
  },

  redo: () => {
    breakEditWindow();
    const { currentCase, history } = get();
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    const newPast = currentCase
      ? [...history.past, currentCase].slice(-MAX_HISTORY)
      : history.past;
    set({
      currentCase: next,
      history: { past: newPast, future: newFuture },
      selectedPersonIds: [],
      selectedLineIds: [],
      selectedUnitIds: [],
      selectedEcosystemId: null,
      selectedHouseholdId: null,
      editingEcosystemId: null,
      selectedConnector: null,
    });
  },

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  toggleInspectorSide: () =>
    set((s) => ({
      inspectorSide: s.inspectorSide === 'right' ? 'left' : 'right',
    })),
  toggleInspectorCollapsed: () =>
    set((s) => ({ inspectorCollapsed: !s.inspectorCollapsed })),

  setViewPan: (x, y) => set({ viewPan: { x, y } }),
  setView: (pan, zoom) => set({ viewPan: pan, viewZoom: clampZoom(zoom) }),
  resetView: () => set({ viewPan: { x: 0, y: 0 }, viewZoom: 1 }),
  centerViewOnContent: (viewportW, viewportH) => {
    const cc = get().currentCase;
    if (!cc || cc.persons.length === 0) {
      set({ viewPan: { x: 0, y: 0 } });
      return;
    }
    // 算所有圖形(含網絡單位 / 生態圈頂點)的 bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of cc.persons) {
      const hw = (p.shape === 'institution' ? 90 : SHAPE_HALF) + 20;
      const hh = SHAPE_HALF + 20;
      minX = Math.min(minX, p.position.x - hw);
      minY = Math.min(minY, p.position.y - hh);
      maxX = Math.max(maxX, p.position.x + hw);
      maxY = Math.max(maxY, p.position.y + hh);
    }
    for (const u of cc.networkUnits ?? []) {
      minX = Math.min(minX, u.position.x - 90);
      minY = Math.min(minY, u.position.y - 20);
      maxX = Math.max(maxX, u.position.x + 90);
      maxY = Math.max(maxY, u.position.y + 20);
    }
    for (const e of cc.ecosystems ?? []) {
      for (const pt of e.points) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
    }
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const { viewZoom: zoom } = get();
    // pan = viewportCenter - centerSvg * zoom
    set({
      viewPan: {
        x: viewportW / 2 - centerX * zoom,
        y: viewportH / 2 - centerY * zoom,
      },
    });
  },

  fitView: (viewportW, viewportH) => {
    const cc = get().currentCase;
    if (!cc || cc.persons.length === 0) {
      set({ viewPan: { x: 0, y: 0 }, viewZoom: 1 });
      return;
    }
    const PAD = 60;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of cc.persons) {
      const hw = (p.shape === 'institution' ? 90 : SHAPE_HALF) + 20;
      const hh = SHAPE_HALF + 20;
      minX = Math.min(minX, p.position.x - hw);
      minY = Math.min(minY, p.position.y - hh);
      maxX = Math.max(maxX, p.position.x + hw);
      maxY = Math.max(maxY, p.position.y + hh);
    }
    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);
    const zoomX = (viewportW - PAD * 2) / contentW;
    const zoomY = (viewportH - PAD * 2) / contentH;
    const zoom = clampZoom(Math.min(zoomX, zoomY, 1));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    // pan: viewport center = pan + centerSvg * zoom  →  pan = viewportCenter - centerSvg * zoom
    set({
      viewPan: {
        x: viewportW / 2 - centerX * zoom,
        y: viewportH / 2 - centerY * zoom,
      },
      viewZoom: zoom,
    });
  },

  loadInstitutionHistory: async () => {
    try {
      const rec = await db.settings.get('institutionHistory');
      if (rec && Array.isArray(rec.value)) {
        const list = (rec.value as unknown[]).filter(
          (v): v is string => typeof v === 'string',
        );
        set({ institutionHistory: list });
      }
    } catch (err) {
      console.error('load institutionHistory failed:', err);
    }
  },
  addInstitutionToHistory: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = get().institutionHistory;
    // 去重 + 搬到最前
    const next = [trimmed, ...existing.filter((x) => x !== trimmed)].slice(
      0,
      MAX_INSTITUTION_HISTORY,
    );
    set({ institutionHistory: next });
    db.settings
      .put({ key: 'institutionHistory', value: next })
      .catch((err) => console.error('save institutionHistory failed:', err));
  },
  removeFromInstitutionHistory: (name) => {
    const next = get().institutionHistory.filter((x) => x !== name);
    set({ institutionHistory: next });
    db.settings
      .put({ key: 'institutionHistory', value: next })
      .catch((err) => console.error('save institutionHistory failed:', err));
  },

  // Disease / Medication history
  loadMedicalHistory: async () => {
    try {
      const [d, m] = await Promise.all([
        db.settings.get('diseaseHistory'),
        db.settings.get('medicationHistory'),
      ]);
      const parse = (rec: unknown): string[] => {
        if (
          rec &&
          typeof rec === 'object' &&
          'value' in rec &&
          Array.isArray((rec as { value: unknown }).value)
        ) {
          return ((rec as { value: unknown[] }).value).filter(
            (x): x is string => typeof x === 'string',
          );
        }
        return [];
      };
      set({
        diseaseHistory: parse(d),
        medicationHistory: parse(m),
      });
    } catch (err) {
      console.error('load medical history failed:', err);
    }
  },
  addDiseaseToHistory: (name) => {
    const t = name.trim();
    if (!t) return;
    const existing = get().diseaseHistory;
    const next = [t, ...existing.filter((x) => x !== t)].slice(
      0,
      MAX_MEDICAL_HISTORY,
    );
    set({ diseaseHistory: next });
    db.settings
      .put({ key: 'diseaseHistory', value: next })
      .catch((err) => console.error('save diseaseHistory failed:', err));
  },
  removeFromDiseaseHistory: (name) => {
    const next = get().diseaseHistory.filter((x) => x !== name);
    set({ diseaseHistory: next });
    db.settings
      .put({ key: 'diseaseHistory', value: next })
      .catch((err) => console.error('save diseaseHistory failed:', err));
  },
  addMedicationToHistory: (name) => {
    const t = name.trim();
    if (!t) return;
    const existing = get().medicationHistory;
    const next = [t, ...existing.filter((x) => x !== t)].slice(
      0,
      MAX_MEDICAL_HISTORY,
    );
    set({ medicationHistory: next });
    db.settings
      .put({ key: 'medicationHistory', value: next })
      .catch((err) => console.error('save medicationHistory failed:', err));
  },
  removeFromMedicationHistory: (name) => {
    const next = get().medicationHistory.filter((x) => x !== name);
    set({ medicationHistory: next });
    db.settings
      .put({ key: 'medicationHistory', value: next })
      .catch((err) => console.error('save medicationHistory failed:', err));
  },

  // ==================== 個人屬性 dropdown 歷史 ====================
  loadAttributeHistory: async () => {
    try {
      const [edu, eth, rel, dis] = await Promise.all([
        db.settings.get('educationHistory'),
        db.settings.get('ethnicityHistory'),
        db.settings.get('religionHistory'),
        db.settings.get('disabilityTypeHistory'),
      ]);
      const parse = (rec: unknown): string[] => {
        if (
          rec &&
          typeof rec === 'object' &&
          'value' in rec &&
          Array.isArray((rec as { value: unknown }).value)
        ) {
          return ((rec as { value: unknown[] }).value).filter(
            (x): x is string => typeof x === 'string',
          );
        }
        return [];
      };
      set({
        educationHistory: parse(edu),
        ethnicityHistory: parse(eth),
        religionHistory: parse(rel),
        disabilityTypeHistory: parse(dis),
      });
    } catch (err) {
      console.error('load attribute history failed:', err);
    }
  },
  addAttributeToHistory: (key, value) => {
    const t = value.trim();
    if (!t) return;
    const stateKeyMap = {
      education: 'educationHistory',
      ethnicity: 'ethnicityHistory',
      religion: 'religionHistory',
      disabilityType: 'disabilityTypeHistory',
    } as const;
    const stateKey = stateKeyMap[key];
    const existing = get()[stateKey] as string[];
    const next = [t, ...existing.filter((x) => x !== t)].slice(
      0,
      MAX_ATTRIBUTE_HISTORY,
    );
    set({ [stateKey]: next } as Pick<GenogramStore, typeof stateKey>);
    db.settings
      .put({ key: stateKey, value: next })
      .catch((err) => console.error(`save ${stateKey} failed:`, err));
  },

  // ==================== NetworkUnit actions ====================
  addNetworkUnit: (name, anchorPersonId) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const anchor = anchorPersonId
      ? c.persons.find((p) => p.id === anchorPersonId)
      : null;
    // 預設位置:anchor 右下;無 anchor → 畫布中央右
    const idealX = snapToGrid(anchor ? anchor.position.x + GRID_SIZE * 3 : 720);
    const idealY = snapToGrid(anchor ? anchor.position.y + GRID_SIZE * 2 : 420);
    // 簡易碰撞避開:跟現有單位位置比,撞就往下挪
    const existing = c.networkUnits ?? [];
    const x = idealX;
    let y = idealY;
    let safety = 10;
    while (
      safety-- > 0 &&
      existing.some(
        (u) =>
          Math.abs(u.position.x - x) < 80 && Math.abs(u.position.y - y) < 40,
      )
    ) {
      y += GRID_SIZE;
    }
    const newUnit: NetworkUnit = {
      id: uid('u'),
      position: { x, y },
      name: trimmed,
      isActive: true,
      connectors: anchorPersonId
        ? [
            {
              id: uid('conn'),
              target: { type: 'person', id: anchorPersonId },
            },
          ]
        : [],
    };
    const newCase = touch({ ...c, networkUnits: [...existing, newUnit] });
    set({ ...pushHistory(c, history, newCase) });
    get().addInstitutionToHistory(trimmed);
  },
  updateNetworkUnit: (id, patch, opts) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const units = c.networkUnits ?? [];
    const newUnits = units.map((u) => (u.id === id ? { ...u, ...patch } : u));
    const newCase = touch({ ...c, networkUnits: newUnits });
    if (joinsPreviousStep('unit', id, history.past.length, opts)) {
      set({ currentCase: newCase, history: { ...history, future: [] } });
      return;
    }
    set({ ...pushHistory(c, history, newCase) });
    openEditStep('unit', id, get().history.past.length);
  },
  removePersonsAndUnits: (personIds, unitIds) => {
    const { currentCase: c, history, inspectorTarget } = get();
    if (!c) return;
    const pset = new Set(personIds);
    const uset = new Set(unitIds);
    // 人物部分:沿用 removePersons 的連帶清理規則(connector / linkedPersonIds / household)
    const keptUnits = (c.networkUnits ?? [])
      .filter((u) => !uset.has(u.id))
      .map((u) => {
        const conns = (u.connectors ?? []).filter(
          (cn) => !(cn.target.type === 'person' && pset.has(cn.target.id)),
        );
        const linked = u.linkedPersonIds?.filter((pid) => !pset.has(pid));
        if (
          conns.length === (u.connectors ?? []).length &&
          (linked?.length ?? 0) === (u.linkedPersonIds?.length ?? 0)
        ) {
          return u;
        }
        return { ...u, connectors: conns, linkedPersonIds: linked };
      });
    const newHouseholds = (c.households ?? [])
      .map((h) => ({
        ...h,
        memberIds: h.memberIds.filter((m) => !pset.has(m)),
      }))
      .filter((h) => h.memberIds.length > 0);
    const newCase = touch({
      ...c,
      persons: c.persons.filter((p) => !pset.has(p.id)),
      lines: c.lines.filter(
        (l) => !pset.has(l.fromPersonId) && !pset.has(l.toPersonId),
      ),
      networkUnits: c.networkUnits ? keptUnits : c.networkUnits,
      majorEvents: cleanEventPersonRefs(c.majorEvents, pset),
      households: c.households ? newHouseholds : c.households,
    });
    // InspectorTarget 只有 person/line 兩型(單位的檢視走 selectedUnitIds),
    // 所以只需處理「被刪的人正是 Inspector 顯示中的人」
    const nextInspector =
      inspectorTarget?.type === 'person' && pset.has(inspectorTarget.id)
        ? newCase.persons.length > 0
          ? ({ type: 'person', id: newCase.persons[0].id } as const)
          : null
        : inspectorTarget;
    set({
      ...pushHistory(c, history, newCase),
      selectedPersonIds: [],
      selectedUnitIds: [],
      selectedHouseholdId: null, // 同上:空圈解散時清殘留選取
      inspectorTarget: nextInspector,
    });
  },
  removeNetworkUnit: (id) => get().removeNetworkUnits([id]),
  removeNetworkUnits: (ids) => {
    const { currentCase: c, history, selectedUnitIds } = get();
    if (!c) return;
    const units = c.networkUnits ?? [];
    // 不存在(如 undo 後殘留的選取)→ 不算,避免推一格空 history(#126)
    const gone = new Set(ids.filter((id) => units.some((u) => u.id === id)));
    if (gone.size === 0) return;
    const newCase = touch({ ...c, networkUnits: units.filter((u) => !gone.has(u.id)) });
    set({
      ...pushHistory(c, history, newCase),
      selectedUnitIds: selectedUnitIds.filter((x) => !gone.has(x)),
    });
  },
  toggleNetworkUnitActive: (id) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const units = c.networkUnits ?? [];
    const newUnits = units.map((u) =>
      u.id === id ? { ...u, isActive: !u.isActive } : u,
    );
    const newCase = touch({ ...c, networkUnits: newUnits });
    set({ ...pushHistory(c, history, newCase) });
  },
  addConnector: (unitId, target, subType) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const units = c.networkUnits ?? [];
    const newUnits = units.map((u) => {
      if (u.id !== unitId) return u;
      // 預設用 'focus-on' (#67,單位專注於對方)— 比舊版灰虛線更有意義
      const conn: NetworkConnector = {
        id: uid('conn'),
        target,
        subType: subType ?? 'focus-on',
      };
      return { ...u, connectors: [...(u.connectors ?? []), conn] };
    });
    const newCase = touch({ ...c, networkUnits: newUnits });
    set({ ...pushHistory(c, history, newCase) });
  },
  setConnectorSubType: (unitId, connectorId, subType) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const units = c.networkUnits ?? [];
    const newUnits = units.map((u) => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        connectors: (u.connectors ?? []).map((conn) =>
          conn.id === connectorId
            ? { ...conn, subType: subType ?? undefined }
            : conn,
        ),
      };
    });
    const newCase = touch({ ...c, networkUnits: newUnits });
    set({ ...pushHistory(c, history, newCase) });
  },
  /** 翻轉 connector 箭頭方向(v1.1)— 點 Tab2 同一個按鈕雙擊觸發 */
  toggleConnectorReversed: (unitId, connectorId) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const units = c.networkUnits ?? [];
    const newUnits = units.map((u) => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        connectors: (u.connectors ?? []).map((conn) =>
          conn.id === connectorId
            ? { ...conn, reversed: !conn.reversed }
            : conn,
        ),
      };
    });
    const newCase = touch({ ...c, networkUnits: newUnits });
    set({ ...pushHistory(c, history, newCase) });
  },
  findUnitConnectorByPerson: (unitId, personId) => {
    const c = get().currentCase;
    if (!c) return null;
    const u = (c.networkUnits ?? []).find((x) => x.id === unitId);
    if (!u) return null;
    return (
      (u.connectors ?? []).find(
        (conn) =>
          conn.target.type === 'person' && conn.target.id === personId,
      ) ?? null
    );
  },
  removeConnector: (unitId, connectorId) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const units = c.networkUnits ?? [];
    const newUnits = units.map((u) => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        connectors: (u.connectors ?? []).filter((conn) => conn.id !== connectorId),
      };
    });
    const newCase = touch({ ...c, networkUnits: newUnits });
    set({ ...pushHistory(c, history, newCase) });
  },
  updateConnectorTarget: (unitId, connectorId, target) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const units = c.networkUnits ?? [];
    const newUnits = units.map((u) => {
      if (u.id !== unitId) return u;
      return {
        ...u,
        connectors: (u.connectors ?? []).map((conn) =>
          conn.id === connectorId ? { ...conn, target } : conn,
        ),
      };
    });
    const newCase = touch({ ...c, networkUnits: newUnits });
    set({ ...pushHistory(c, history, newCase) });
  },
  moveNetworkUnit: (id, x, y) => {
    const c = get().currentCase;
    if (!c) return;
    const units = c.networkUnits ?? [];
    const newUnits = units.map((u) =>
      u.id === id ? { ...u, position: { x, y } } : u,
    );
    // 拖移不進 history,同 movePerson
    set({ currentCase: touch({ ...c, networkUnits: newUnits }) });
  },
  // 量表結果
  addScaleResult: (result) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const id = `sr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const next = touch({
      ...c,
      scaleResults: [...(c.scaleResults ?? []), { ...result, id }],
    });
    set(pushHistory(c, history, next));
  },
  removeScaleResult: (id) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const next = touch({
      ...c,
      scaleResults: (c.scaleResults ?? []).filter((r) => r.id !== id),
    });
    set(pushHistory(c, history, next));
  },

  // 訪談筆記
  addInterviewNote: (note) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const next = touch({
      ...c,
      interviewNotes: [...(c.interviewNotes ?? []), { ...note, id }],
    });
    set(pushHistory(c, history, next));
  },
  updateInterviewNote: (id, patch, opts) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const next = touch({
      ...c,
      interviewNotes: (c.interviewNotes ?? []).map((n) =>
        n.id === id ? { ...n, ...patch } : n,
      ),
    });
    if (joinsPreviousStep('note', id, history.past.length, opts)) {
      set({ currentCase: next, history: { ...history, future: [] } });
      return;
    }
    set(pushHistory(c, history, next));
    openEditStep('note', id, get().history.past.length);
  },
  removeInterviewNote: (id) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const next = touch({
      ...c,
      interviewNotes: (c.interviewNotes ?? []).filter((n) => n.id !== id),
    });
    set(pushHistory(c, history, next));
  },

  // 文件附件
  addAttachment: (ref) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const next = touch({
      ...c,
      attachments: [
        ...(c.attachments ?? []),
        { ...ref, id, addedAt: new Date().toISOString() },
      ],
    });
    set(pushHistory(c, history, next));
  },
  removeAttachment: (id) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const next = touch({
      ...c,
      attachments: (c.attachments ?? []).filter((a) => a.id !== id),
    });
    set(pushHistory(c, history, next));
  },

  // 重大事件
  addMajorEvent: (ev) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const id = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const next = touch({
      ...c,
      majorEvents: [...safeEvents(c.majorEvents), { ...ev, id }],
    });
    set(pushHistory(c, history, next));
  },
  updateMajorEvent: (id, patch, opts) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const next = touch({
      ...c,
      majorEvents: safeEvents(c.majorEvents).map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      ),
    });
    // 日期欄是 <input type="date">,每按一個數字鍵就發一次 change → 走規則 1;
    // 標題/描述是草稿欄位,續寫帶 merge → 走規則 2。
    if (joinsPreviousStep('event', id, history.past.length, opts)) {
      set({ currentCase: next, history: { ...history, future: [] } });
      return;
    }
    set(pushHistory(c, history, next));
    openEditStep('event', id, get().history.past.length);
  },
  removeMajorEvent: (id) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    // 不存在 → 不推空 history、不動 lastModifiedAt(#126 同款 guard)
    if (!safeEvents(c.majorEvents).some((e) => e?.id === id)) return;
    const next = touch({
      ...c,
      majorEvents: safeEvents(c.majorEvents).filter((e) => e?.id !== id),
    });
    set(pushHistory(c, history, next));
  },


  // 同住成員圈
  addHousehold: (memberIds, label) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    if (memberIds.length === 0) return;
    // 同一群人不重複圈(2026-08-31 實測 bug):兩個成員完全相同的圈會 100% 重疊,
    // 畫面上看起來只有一個,刪掉一個像是「刪除沒反應」。
    // 已經圈過就改成「選取那個既有的圈」—— 使用者立刻看到紅 ×,知道它本來就在。
    const want = new Set(memberIds);
    const dup = (c.households ?? []).find(
      (h) =>
        h.memberIds.length === want.size &&
        h.memberIds.every((m) => want.has(m)),
    );
    if (dup) {
      set({
        selectedHouseholdId: dup.id,
        selectedPersonIds: [],
        selectedLineIds: [],
        selectedUnitIds: [],
        selectedEcosystemId: null,
        editingEcosystemId: null,
      });
      return;
    }
    const id = `hh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const next = touch({
      ...c,
      households: [
        ...(c.households ?? []),
        {
          id,
          memberIds,
          label,
          visual: { style: 'dashed-circle' as const },
        },
      ],
    });
    set(pushHistory(c, history, next));
  },
  updateHousehold: (id, patch) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const next = touch({
      ...c,
      households: (c.households ?? []).map((h) =>
        h.id === id ? { ...h, ...patch } : h,
      ),
    });
    set(pushHistory(c, history, next));
  },
  removeHousehold: (id) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    // 不存在(如殘留選取指向已解散的圈)→ 只清選取,不推空 history(#126 同款)
    if (!(c.households ?? []).some((h) => h.id === id)) {
      set({ selectedHouseholdId: null });
      return;
    }
    const next = touch({
      ...c,
      households: (c.households ?? []).filter((h) => h.id !== id),
    });
    set({ ...pushHistory(c, history, next), selectedHouseholdId: null });
  },

  drawMode: false,
  setDrawMode: (v) => set({ drawMode: v }),
  addEcosystem: (points) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    if (points.length < 3) return;
    const existing = c.ecosystems ?? [];
    // 重畫覆蓋:若新 polygon bbox 中心落在某舊圈內 → 刪掉舊的
    const bbox = points.reduce(
      (acc, p) => ({
        minX: Math.min(acc.minX, p.x),
        minY: Math.min(acc.minY, p.y),
        maxX: Math.max(acc.maxX, p.x),
        maxY: Math.max(acc.maxY, p.y),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
    );
    const cx = (bbox.minX + bbox.maxX) / 2;
    const cy = (bbox.minY + bbox.maxY) / 2;
    const remaining = existing.filter((eco) => !pointInPolygon(cx, cy, eco.points));
    const newEco: Ecosystem = {
      id: uid('eco'),
      points,
    };
    const newCase = touch({ ...c, ecosystems: [...remaining, newEco] });
    set({ ...pushHistory(c, history, newCase) });
  },
  removeEcosystem: (id) => {
    const { currentCase: c, history, selectedEcosystemId, editingEcosystemId } =
      get();
    if (!c) return;
    const newCase = touch({
      ...c,
      ecosystems: (c.ecosystems ?? []).filter((e) => e.id !== id),
    });
    set({
      ...pushHistory(c, history, newCase),
      selectedEcosystemId:
        selectedEcosystemId === id ? null : selectedEcosystemId,
      editingEcosystemId:
        editingEcosystemId === id ? null : editingEcosystemId,
    });
  },
  updateEcosystem: (id, patch) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    const newCase = touch({
      ...c,
      ecosystems: (c.ecosystems ?? []).map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      ),
    });
    set({ ...pushHistory(c, history, newCase) });
  },
  moveEcosystem: (id, dx, dy) => {
    const c = get().currentCase;
    if (!c) return;
    set({
      currentCase: touch({
        ...c,
        ecosystems: (c.ecosystems ?? []).map((e) =>
          e.id === id
            ? {
                ...e,
                points: e.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
              }
            : e,
        ),
      }),
    });
  },

  setEcosystemPointsTransient: (id, points) => {
    const c = get().currentCase;
    if (!c) return;
    set({
      currentCase: touch({
        ...c,
        ecosystems: (c.ecosystems ?? []).map((e) =>
          e.id === id ? { ...e, points } : e,
        ),
      }),
    });
  },
  commitEcosystemEdit: (id, originalPoints) => {
    const { currentCase: c, history } = get();
    if (!c) return;
    // 重組「編輯前」case:把這個 ecosystem 的 points 換回 originalPoints
    const beforeCase = touch({
      ...c,
      ecosystems: (c.ecosystems ?? []).map((e) =>
        e.id === id ? { ...e, points: originalPoints } : e,
      ),
    });
    // 把 beforeCase 推進 past,current 維持(c 已含編輯後 points)
    set({ ...pushHistory(beforeCase, history, c) });
  },

  confirmState: null,
  showConfirm: (
    message: string,
    opts?: { yes?: string; no?: string; tone?: 'danger' | 'normal' },
  ) =>
    new Promise<boolean>((resolve) => {
      set({
        confirmState: {
          message,
          yesLabel: opts?.yes,
          noLabel: opts?.no,
          tone: opts?.tone,
          onYes: () => {
            resolve(true);
            set({ confirmState: null });
          },
          onNo: () => {
            resolve(false);
            set({ confirmState: null });
          },
        },
      });
    }),
}));

// 給參考個案往返測試用:開檔時的遷移必須保留未知欄位(docs/VERSIONING.md 規則 2)
export { migrateGenogram };
