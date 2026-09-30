// ========================================
// 快速建立 —— 執行層(唯一會碰 store 的檔案)
// ========================================
// 與 quickBuild.ts 的分工:
//   quickBuild.ts  = 純函式(解析 / 走路器 / 預覽計畫),不 import store → 好測試、可移植 iOS
//   本檔           = 把走路器接到既有 store actions;不寫任何座標/幾何
//
// 兩件硬要求(工作單 1.5-2 / 1.5-6):
//   1. 整批只留 **一個** undo 快照 —— store 有 MAX_HISTORY 上限,批次 6-8 個 action 會把
//      「建立前」狀態擠掉。做法:外層記快照,批次跑完後直接覆寫 history,
//      **不改動任何既有 action 的行為**。
//   2. expand 系列全部回傳 void → 用 person-set / line-set diff 取新 id,
//      不用「抓最新一條線」heuristic。
// ========================================

import { breakEditWindow, MAX_HISTORY, useGenogramStore } from '../store/genogramStore';
import type { BasicInfo, Person, TextInfo } from '../types/genogram';
import {
  applyDivorceIntent,
  conflictKey,
  diseaseKey,
  isLearnableDisease,
  walkPath,
  type ApplyDecisions,
  type GraphOps,
  type GraphPerson,
  type LinePlan, type ConflictField } from './quickBuild';

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const toGraphPerson = (p: Person): GraphPerson => ({
  id: p.id,
  shape: p.shape,
  position: p.position,
  isProband: p.isProband,
});

/** 把走路器接到真實 store —— 每個 create* 都用 diff 取新 id,回傳 null 代表既有 action 判定 no-op */
function createStoreGraphOps(): GraphOps {
  const st = () => useGenogramStore.getState();
  const cur = () => st().currentCase;

  return {
    persons: () => (cur()?.persons ?? []).map(toGraphPerson),
    lines: () =>
      (cur()?.lines ?? []).map((l) => ({
        id: l.id,
        fromPersonId: l.fromPersonId,
        toPersonId: l.toPersonId,
        subType: l.subType,
      })),

    createParents(childId) {
      const before = new Set((cur()?.persons ?? []).map((p) => p.id));
      st().expandParents(childId);
      const created = (cur()?.persons ?? []).filter((p) => !before.has(p.id));
      const father = created.find((p) => p.shape === 'square');
      const mother = created.find((p) => p.shape === 'circle');
      if (!father || !mother) return null; // action no-op(已有親子線)
      return { fatherId: father.id, motherId: mother.id };
    },

    createSpouse(personId, side) {
      const beforeP = new Set((cur()?.persons ?? []).map((p) => p.id));
      const beforeL = new Set((cur()?.lines ?? []).map((l) => l.id));
      st().expandSpouseOrSibling(personId, side);
      const np = (cur()?.persons ?? []).find((p) => !beforeP.has(p.id));
      const nl = (cur()?.lines ?? []).find((l) => !beforeL.has(l.id));
      if (!np || !nl) return null; // action no-op(同側已滿 3 段)
      return { spouseId: np.id, lineId: nl.id };
    },

    createChildOfMarriage(marriageLineId) {
      const before = new Set((cur()?.persons ?? []).map((p) => p.id));
      st().expandChildFromMarriage(marriageLineId);
      const np = (cur()?.persons ?? []).find((p) => !before.has(p.id));
      return np?.id ?? null;
    },

    setShape(personId, shape) {
      st().updatePerson(personId, { shape });
    },

    setLineSubType(lineId, subType) {
      st().updateLine(lineId, { subType });
    },
  };
}

/** 該欄位要不要套用:沒衝突 → 一律套;有衝突 → 看使用者勾選(預設勾=取新值) */
function allowField(
  plan: LinePlan,
  field: ConflictField,
  decisions: ApplyDecisions,
): boolean {
  const hasConflict = plan.conflicts.some((c) => c.field === field);
  if (!hasConflict) return true;
  return decisions[conflictKey(plan.parsed.lineNo, field)] !== false;
}

/**
 * 套用屬性 —— 工作單 1.5-5:updatePerson 只有 basicInfo 是淺合併,
 * textInfo / medicalConditions 是**整包覆蓋** → 一律 read-modify-write,
 * 否則會無聲清掉使用者既有的職業 / 病史。
 */
function applyAttributes(
  personId: string,
  plan: LinePlan,
  decisions: ApplyDecisions,
): void {
  const st = useGenogramStore.getState();
  const person = st.currentCase?.persons.find((p) => p.id === personId);
  if (!person) return;
  const { parsed } = plan;
  const patch: Partial<Person> = {};

  // ---- basicInfo(updatePerson 會淺合併,但 phones 是陣列要自己接)----
  const basicInfo: BasicInfo = {};
  if (parsed.name && allowField(plan, 'name', decisions)) {
    basicInfo.name = parsed.name;
  }
  if (parsed.education && allowField(plan, 'education', decisions)) {
    basicInfo.education = parsed.education;
    if (parsed.educationStatus) basicInfo.educationStatus = parsed.educationStatus;
  }
  const existingPhones = person.basicInfo?.phones ?? [];
  const addPhones = parsed.phones.filter(
    (v) => !existingPhones.some((e) => e.value === v),
  );
  if (addPhones.length) {
    basicInfo.phones = [
      ...existingPhones,
      ...addPhones.map((value) => ({ label: '個人', value })),
    ];
  }
  if (Object.keys(basicInfo).length) patch.basicInfo = basicInfo;

  // ---- textInfo(整包覆蓋 → 先讀既有再展開)----
  const textInfo: TextInfo = { ...person.textInfo };
  let textChanged = false;
  if (parsed.age !== undefined && allowField(plan, 'age', decisions)) {
    textInfo.age = parsed.age;
    textChanged = true;
  }
  if (
    parsed.lifeSpan !== undefined &&
    allowField(plan, 'lifeSpan', decisions)
  ) {
    textInfo.lifeSpan = parsed.lifeSpan;
    textChanged = true;
  }
  if (textChanged) patch.textInfo = textInfo;

  // ---- medicalConditions(整包覆蓋 → 累加既有)----
  const existingConds = person.medicalConditions ?? [];
  const addDiseases = plan.newDiseases.filter(
    (d) =>
      decisions[diseaseKey(parsed.lineNo, d)] !== false &&
      !existingConds.some((c) => c.name === d),
  );
  if (addDiseases.length) {
    patch.medicalConditions = [
      ...existingConds,
      ...addDiseases.map((name) => ({ id: uid('cond'), name })),
    ];
  }

  // ---- 生命狀態 ----
  if (parsed.deceased && person.lifeStatus !== 'deceased') {
    patch.lifeStatus = 'deceased';
  }

  // ---- 備註 ----
  if (parsed.notes.length) {
    const note = parsed.notes.join(' ');
    patch.notes = person.notes ? `${person.notes} ${note}` : note;
  }

  if (Object.keys(patch).length) st.updatePerson(personId, patch);
}

export type QuickBuildOutcome = {
  ok: boolean;
  /** 實際建立的人數 */
  createdCount: number;
  /** 實際更新的既有人數 */
  updatedCount: number;
  /** 略過的行號 */
  skippedLineNos: number[];
  error?: string;
};

/**
 * 執行整批快速建立。
 * - 全程同步(工作單 1.5-12):不穿插 await,讓 React 自動合併渲染
 * - 失敗 → 還原到執行前的完整快照
 * - 成功 → history 只留一筆「建立前」,undo 一步回到原狀
 */
export function executeQuickBuild(
  plans: readonly LinePlan[],
  anchorId: string,
  decisions: ApplyDecisions,
): QuickBuildOutcome {
  const store = useGenogramStore;
  const before = store.getState().currentCase;
  const historyBefore = store.getState().history;
  if (!before) {
    return {
      ok: false,
      createdCount: 0,
      updatedCount: 0,
      skippedLineNos: [],
      error: 'no-case',
    };
  }

  const ops = createStoreGraphOps();
  const skipped: number[] = [];
  let createdCount = 0;
  let updatedCount = 0;

  try {
    for (const plan of plans) {
      if (plan.status === 'skip' || !plan.parsed.relation) {
        skipped.push(plan.parsed.lineNo);
        continue;
      }
      const r = walkPath(ops, anchorId, plan.parsed.relation);
      if (!r.targetId) {
        // 真實執行時才被既有 action 擋下(理論上 plan 已預告)
        skipped.push(plan.parsed.lineNo);
        continue;
      }
      if (plan.parsed.divorced) {
        applyDivorceIntent(ops, r.targetId, r.marriageLineId);
      }

      // plan 說「新建」而執行也真的建了 → createdCount;否則算更新既有
      if (r.createdIds.includes(r.targetId)) createdCount++;
      else updatedCount++;
      createdCount += r.createdIds.filter((id) => id !== r.targetId).length;

      applyAttributes(r.targetId, plan, decisions);
    }

    // 學習迴圈(工作單 1.5-11):只有使用者在預覽「明確」把 chip 改成疾病的詞才進全域字典
    // —— 內建字典自動命中的詞不寫(已經認得了),避免全域清單被灌爆
    const addToHistory = useGenogramStore.getState().addDiseaseToHistory;
    for (const plan of plans) {
      if (plan.status === 'skip') continue;
      for (const tk of plan.parsed.tokens) {
        if (tk.kind !== 'disease' || !tk.overridden) continue;
        if (decisions[diseaseKey(plan.parsed.lineNo, tk.raw)] === false) continue;
        if (isLearnableDisease(tk.raw)) addToHistory(tk.raw);
      }
    }
  } catch (err) {
    console.error('快速建立失敗,已還原:', err);
    store.setState({ currentCase: before, history: historyBefore });
    return {
      ok: false,
      createdCount: 0,
      updatedCount: 0,
      skippedLineNos: [],
      error: String(err),
    };
  }

  // 整批收斂成單一 undo 快照(工作單 1.5-2)—— 不改既有 action,只在外層覆寫 history
  store.setState({
    history: {
      past: [...historyBefore.past, before].slice(-MAX_HISTORY),
      future: [],
    },
  });
  // 批次中 update 系動作可能留下打字合併窗:不關窗的話,使用者在 900ms 內
  // 對同一人接著打字會走 coalesce 不推格,undo 一步就整批+打字全退
  breakEditWindow();

  return {
    ok: true,
    createdCount,
    updatedCount,
    skippedLineNos: skipped,
  };
}
