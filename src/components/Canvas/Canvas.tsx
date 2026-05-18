import { useEffect, useRef, useState } from 'react';
import {
  COLLISION_TOLERANCE,
  GRID_SIZE,
  SHAPE_HALF,
  clampZoom,
  pointInPolygon,
  snapToGrid,
  useGenogramStore,
} from '../../store/genogramStore';
import type {
  ConnectorTarget,
  Line as LineType,
  NetworkUnit,
  Person,
} from '../../types/genogram';
import PersonShape from './PersonShape';
import Line from './Line';
import SmallArrows from './SmallArrows';
import MarriageGroup, { type ChildBundle } from './MarriageGroup';
import NetworkUnitShape from './NetworkUnitShape';
import EcosystemPolygon from './EcosystemPolygon';
import TwinDialog from './TwinDialog';
import { useT } from '../../i18n';

type DragState =
  | {
      mode: 'person';
      personIds: string[];
      startX: number;
      startY: number;
      origPositions: { id: string; x: number; y: number }[];
      origUnitPositions: { id: string; x: number; y: number }[];
      pointerId: number;
      moved: boolean;
    }
  | {
      mode: 'marquee';
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
      pointerId: number;
    }
  | {
      mode: 'pan';
      startClientX: number;
      startClientY: number;
      startPanX: number;
      startPanY: number;
      pointerId: number;
    };

type LineDragEntry = { lineId: string; end: 'from' | 'to' };

type HandleDragState = {
  drags: LineDragEntry[];
  currentX: number;
  currentY: number;
  pointerId: number;
};

const MARRIAGE_SUBTYPES = new Set([
  'marriage',
  'engagement',
  'partnership',
  'cohabitation-commit',
  'secret-affair',
  'separation',
  'divorce',
  'divorce-remarriage',
]);
const BIO_SUBTYPES = new Set([
  'biological',
  'adopted',
  'placed-out',
  'fostered',
]);
const DRAG_THRESHOLD = 5;

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(
    0,
    Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2),
  );
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// 線段相交判斷(共線/端點接觸不算 — 用 strict CCW)
function segmentsIntersect(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number },
): boolean {
  const ccw = (
    A: { x: number; y: number },
    B: { x: number; y: number },
    C: { x: number; y: number },
  ) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  return (
    ccw(a1, b1, b2) !== ccw(a2, b1, b2) &&
    ccw(a1, a2, b1) !== ccw(a1, a2, b2)
  );
}

// 多邊形是否為「簡單多邊形」(無自相交);相鄰邊與閉合邊不檢查
function isSimplePolygon(pts: { x: number; y: number }[]): boolean {
  const n = pts.length;
  if (n < 4) return true;
  for (let i = 0; i < n; i++) {
    const a1 = pts[i];
    const a2 = pts[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      // 跳過閉合邊接到第一邊
      if (i === 0 && j === n - 1) continue;
      const b1 = pts[j];
      const b2 = pts[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}

// 人是否壓到線(排除自己是端點的線)
function personHitsLine(
  person: Person,
  line: LineType,
  persons: Person[],
): boolean {
  if (line.fromPersonId === person.id || line.toPersonId === person.id)
    return false;
  const from = persons.find((p) => p.id === line.fromPersonId);
  const to = persons.find((p) => p.id === line.toPersonId);
  if (!from || !to) return false;
  const halfSize = person.shape === 'institution' ? 90 : SHAPE_HALF;
  return (
    distToSegment(
      person.position.x,
      person.position.y,
      from.position.x,
      from.position.y,
      to.position.x,
      to.position.y,
    ) <
    halfSize * 0.7
  );
}

export default function Canvas() {
  const t = useT();
  const currentCase = useGenogramStore((s) => s.currentCase);
  const selectedPersonIds = useGenogramStore((s) => s.selectedPersonIds);
  const selectedLineIds = useGenogramStore((s) => s.selectedLineIds);
  const selectPerson = useGenogramStore((s) => s.selectPerson);
  const togglePersonSelection = useGenogramStore(
    (s) => s.togglePersonSelection,
  );
  const selectPersons = useGenogramStore((s) => s.selectPersons);
  const selectLine = useGenogramStore((s) => s.selectLine);
  const selectLines = useGenogramStore((s) => s.selectLines);
  const updateLineEndpoint = useGenogramStore((s) => s.updateLineEndpoint);
  // 拖萬用接點:改用 addSecondaryParentsFromMarriage / addSecondaryParentFromPerson
  // 把新加的父母設成次要(虛線+縮人);使用者雙擊虛線循環會自動 mutex 升為主要
  const addSecondaryParentsFromMarriage = useGenogramStore(
    (s) => s.addSecondaryParentsFromMarriage,
  );
  const addSecondaryParentFromPerson = useGenogramStore(
    (s) => s.addSecondaryParentFromPerson,
  );
  const cycleLineSubType = useGenogramStore((s) => s.cycleLineSubType);
  const clearSelection = useGenogramStore((s) => s.clearSelection);
  const movePerson = useGenogramStore((s) => s.movePerson);
  const cycleShape = useGenogramStore((s) => s.cycleShape);
  const removePersons = useGenogramStore((s) => s.removePersons);
  const removeLine = useGenogramStore((s) => s.removeLine);
  const removeNetworkUnit = useGenogramStore((s) => s.removeNetworkUnit);
  const expandChildFromMarriage = useGenogramStore(
    (s) => s.expandChildFromMarriage,
  );
  const expandTwinsFromMarriage = useGenogramStore(
    (s) => s.expandTwinsFromMarriage,
  );
  const expandTwinsFromPerson = useGenogramStore(
    (s) => s.expandTwinsFromPerson,
  );
  const [twinDialogTarget, setTwinDialogTarget] = useState<
    | { type: 'marriage'; id: string }
    | { type: 'person'; id: string }
    | null
  >(null);
  const moveNetworkUnit = useGenogramStore((s) => s.moveNetworkUnit);
  const selectedUnitIds = useGenogramStore((s) => s.selectedUnitIds);
  const selectUnit = useGenogramStore((s) => s.selectUnit);
  const selectUnits = useGenogramStore((s) => s.selectUnits);
  const selectPersonsAndUnits = useGenogramStore(
    (s) => s.selectPersonsAndUnits,
  );
  const drawMode = useGenogramStore((s) => s.drawMode);
  const setDrawMode = useGenogramStore((s) => s.setDrawMode);
  const addEcosystem = useGenogramStore((s) => s.addEcosystem);
  const moveEcosystem = useGenogramStore((s) => s.moveEcosystem);
  const editingEcosystemId = useGenogramStore((s) => s.editingEcosystemId);
  const setEditingEcosystem = useGenogramStore((s) => s.setEditingEcosystem);
  const setEcosystemPointsTransient = useGenogramStore(
    (s) => s.setEcosystemPointsTransient,
  );
  const commitEcosystemEdit = useGenogramStore((s) => s.commitEcosystemEdit);
  const addConnector = useGenogramStore((s) => s.addConnector);
  const setConnectorSubType = useGenogramStore((s) => s.setConnectorSubType);
  const findUnitConnectorByPerson = useGenogramStore(
    (s) => s.findUnitConnectorByPerson,
  );
  const removeConnector = useGenogramStore((s) => s.removeConnector);
  const updateConnectorTarget = useGenogramStore(
    (s) => s.updateConnectorTarget,
  );
  // 連線拖曳預覽:connectorId=null 表示新建中
  const [connectorDrag, setConnectorDrag] = useState<{
    unitId: string;
    connectorId: string | null;
    x: number;
    y: number;
  } | null>(null);
  // 選中的 connector(短按時設定 → 顯示 ×;最多一個)
  const selectedConnector = useGenogramStore((s) => s.selectedConnector);
  const setSelectedConnector = useGenogramStore(
    (s) => s.setSelectedConnector,
  );

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [marquee, setMarquee] = useState<
    { x: number; y: number; w: number; h: number } | null
  >(null);
  const [handleDrag, setHandleDrag] = useState<HandleDragState | null>(null);

  // 畫筆繪製中的 path(即時預覽用)
  const [drawPath, setDrawPath] = useState<{ x: number; y: number }[]>([]);
  const drawPointerIdRef = useRef<number | null>(null);

  // Tab2 關係線 pending mode(點按鈕 → 等使用者點下一人完成)
  const pendingRelation = useGenogramStore((s) => s.pendingRelation);
  const setPendingRelation = useGenogramStore((s) => s.setPendingRelation);
  const createRelationLine = useGenogramStore((s) => s.createRelationLine);
  const inspectorTarget = useGenogramStore((s) => s.inspectorTarget);

  // 切換個案時自動把畫面置中到內容中心(保留目前 zoom)
  const centerViewOnContent = useGenogramStore((s) => s.centerViewOnContent);
  const caseId = currentCase?.id;
  useEffect(() => {
    if (!caseId) return;
    // 等 DOM 一輪確保 svgRef 父容器已渲染
    const id = window.setTimeout(() => {
      const parent = svgRef.current?.parentElement;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        centerViewOnContent(r.width, r.height);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [caseId, centerViewOnContent]);

  // 畫筆模式:Esc 取消
  useEffect(() => {
    if (!drawMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        drawPointerIdRef.current = null;
        setDrawPath([]);
        setDrawMode(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawMode, setDrawMode]);

  // 生態圈編輯模式:Esc 退出
  useEffect(() => {
    if (!editingEcosystemId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingEcosystem(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingEcosystemId, setEditingEcosystem]);

  // Tab2 關係線 pending mode:Esc 取消
  useEffect(() => {
    if (!pendingRelation) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingRelation(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingRelation, setPendingRelation]);

  // 吸附到人物所在 row/column(跟婚姻線同一軌道)
  const snapMidline = (p: { x: number; y: number }) => ({
    x: Math.round(p.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(p.y / GRID_SIZE) * GRID_SIZE,
  });

  // ==================== Pan / Zoom ====================
  const viewPan = useGenogramStore((s) => s.viewPan);
  const viewZoom = useGenogramStore((s) => s.viewZoom);
  const setViewPan = useGenogramStore((s) => s.setViewPan);
  const [spaceHeld, setSpaceHeld] = useState(false);

  // 追蹤 Space 鍵（按住 Space 可用左鍵拖移畫布）
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      )
        return;
      e.preventDefault();
      setSpaceHeld(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // 滾輪縮放（以游標為中心）
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const state = useGenogramStore.getState();
      const pan = state.viewPan;
      const zoom = state.viewZoom;
      const svgX = (screenX - pan.x) / zoom;
      const svgY = (screenY - pan.y) / zoom;
      // trackpad 可能送很小的 deltaY,用 exp 讓手感一致
      const factor = Math.exp(-e.deltaY * 0.002);
      const newZoom = clampZoom(zoom * factor);
      if (newZoom === zoom) return;
      const newPanX = screenX - svgX * newZoom;
      const newPanY = screenY - svgY * newZoom;
      state.setView({ x: newPanX, y: newPanY }, newZoom);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });

    // ===== 觸控 pinch 縮放(雙指)=====
    let pinchPrevDistance = 0;
    let pinchPrevCenter = { x: 0, y: 0 };
    const dist = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const center = (a: Touch, b: Touch) => ({
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2,
    });
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchPrevDistance = dist(e.touches[0], e.touches[1]);
        pinchPrevCenter = center(e.touches[0], e.touches[1]);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchPrevDistance === 0) return;
      e.preventDefault();
      const newDist = dist(e.touches[0], e.touches[1]);
      const newCenter = center(e.touches[0], e.touches[1]);
      const rect = svg.getBoundingClientRect();
      const screenX = newCenter.x - rect.left;
      const screenY = newCenter.y - rect.top;
      const state = useGenogramStore.getState();
      const pan = state.viewPan;
      const zoom = state.viewZoom;
      const svgX = (screenX - pan.x) / zoom;
      const svgY = (screenY - pan.y) / zoom;
      // pinch 縮放比例
      const factor = newDist / pinchPrevDistance;
      const newZoom = clampZoom(zoom * factor);
      // 中心點平移(讓 pinch 中心位置不變)
      const dx = newCenter.x - pinchPrevCenter.x;
      const dy = newCenter.y - pinchPrevCenter.y;
      const newPanX = screenX - svgX * newZoom + dx * 0.3;
      const newPanY = screenY - svgY * newZoom + dy * 0.3;
      state.setView({ x: newPanX, y: newPanY }, newZoom);
      pinchPrevDistance = newDist;
      pinchPrevCenter = newCenter;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchPrevDistance = 0;
      }
    };
    svg.addEventListener('touchstart', onTouchStart, { passive: false });
    svg.addEventListener('touchmove', onTouchMove, { passive: false });
    svg.addEventListener('touchend', onTouchEnd);

    return () => {
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('touchstart', onTouchStart);
      svg.removeEventListener('touchmove', onTouchMove);
      svg.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  if (!currentCase) return null;

  // ==================== 聚合計算 ====================
  const marriageLines = currentCase.lines.filter((l) =>
    MARRIAGE_SUBTYPES.has(l.subType),
  );
  // 出養線不進 T 字聚合(獨立渲染)
  const bioLines = currentCase.lines.filter(
    (l) => BIO_SUBTYPES.has(l.subType) && l.subType !== 'placed-out',
  );

  const aggregatedBioIds = new Set<string>();
  const marriageGroups: {
    marriage: LineType;
    a: Person;
    b: Person;
    childBundles: ChildBundle[];
  }[] = [];

  for (const m of marriageLines) {
    const a = currentCase.persons.find((p) => p.id === m.fromPersonId);
    const b = currentCase.persons.find((p) => p.id === m.toPersonId);
    if (!a || !b) continue;

    const commonChildren: ChildBundle[] = [];
    for (const person of currentCase.persons) {
      const bioFromA = bioLines.find(
        (l) => l.fromPersonId === a.id && l.toPersonId === person.id,
      );
      const bioFromB = bioLines.find(
        (l) => l.fromPersonId === b.id && l.toPersonId === person.id,
      );
      if (bioFromA && bioFromB) {
        commonChildren.push({ child: person, bioFromA, bioFromB });
        aggregatedBioIds.add(bioFromA.id);
        aggregatedBioIds.add(bioFromB.id);
      }
    }
    marriageGroups.push({ marriage: m, a, b, childBundles: commonChildren });
  }

  const aggregatedMarriageIds = new Set(marriageLines.map((l) => l.id));
  // placed-out 獨立處理:從 child-edge 10px 外 → 生父母(或其婚姻中點)
  const placedOutLines = currentCase.lines.filter(
    (l) => l.subType === 'placed-out',
  );
  const placedOutIds = new Set(placedOutLines.map((l) => l.id));
  const looseLines = currentCase.lines.filter(
    (l) =>
      !aggregatedBioIds.has(l.id) &&
      !aggregatedMarriageIds.has(l.id) &&
      !placedOutIds.has(l.id),
  );

  // 把配對成「夫妻同時出養同一個孩子」的兩條 placed-out 合併成一條(指向婚姻中點)
  type PlacedOutRender = {
    lineIds: string[]; // 代表的 line id(選第一個給 hit area)
    child: Person;
    targetX: number;
    targetY: number;
  };
  const placedOutRenders: PlacedOutRender[] = [];
  const seenCouple = new Set<string>();
  for (const bio of placedOutLines) {
    const child = currentCase.persons.find((p) => p.id === bio.toPersonId);
    const parent = currentCase.persons.find((p) => p.id === bio.fromPersonId);
    if (!child || !parent) continue;
    // 找此父/母的婚姻
    const marriage = marriageLines.find(
      (m) =>
        m.fromPersonId === parent.id || m.toPersonId === parent.id,
    );
    if (marriage) {
      const otherParentId =
        marriage.fromPersonId === parent.id
          ? marriage.toPersonId
          : marriage.fromPersonId;
      const partnerBio = placedOutLines.find(
        (b) =>
          b.fromPersonId === otherParentId && b.toPersonId === child.id,
      );
      if (partnerBio) {
        // 夫妻雙方都有出養給這個孩子 → 合併成一條到婚姻中點
        const key = `${child.id}_${marriage.id}`;
        if (seenCouple.has(key)) continue;
        seenCouple.add(key);
        const p2 = currentCase.persons.find((p) => p.id === otherParentId);
        if (!p2) continue;
        placedOutRenders.push({
          lineIds: [bio.id, partnerBio.id],
          child,
          targetX: (parent.position.x + p2.position.x) / 2,
          targetY: (parent.position.y + p2.position.y) / 2,
        });
        continue;
      }
    }
    // 單親/未婚 → 連到該父母的位置
    placedOutRenders.push({
      lineIds: [bio.id],
      child,
      targetX: parent.position.x,
      targetY: parent.position.y,
    });
  }

  // ==================== 碰撞偵測(用於紅色警示邊框) ====================
  const collidingPersonIds = new Set<string>();
  {
    const ps = currentCase.persons;
    // 人 vs 人
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i];
        const b = ps[j];
        if (
          Math.abs(a.position.x - b.position.x) < COLLISION_TOLERANCE &&
          Math.abs(a.position.y - b.position.y) < COLLISION_TOLERANCE
        ) {
          collidingPersonIds.add(a.id);
          collidingPersonIds.add(b.id);
        }
      }
    }
    // 人 vs 線(不允許壓到自己非端點的線)
    for (const p of ps) {
      if (collidingPersonIds.has(p.id)) continue;
      for (const l of currentCase.lines) {
        if (personHitsLine(p, l, ps)) {
          collidingPersonIds.add(p.id);
          break;
        }
      }
    }
  }
  const collidingUnitIds = new Set<string>();
  {
    const us = currentCase.networkUnits ?? [];
    // 單位 ↔ 單位
    for (let i = 0; i < us.length; i++) {
      for (let j = i + 1; j < us.length; j++) {
        const a = us[i];
        const b = us[j];
        if (
          Math.abs(a.position.x - b.position.x) < 80 &&
          Math.abs(a.position.y - b.position.y) < 40
        ) {
          collidingUnitIds.add(a.id);
          collidingUnitIds.add(b.id);
        }
      }
    }
    // 人 ↔ 單位(AABB 重疊:人 56x56,單位 180x40)
    const ps = currentCase.persons;
    for (const u of us) {
      if (!u.isActive) continue;
      const ux1 = u.position.x - 90;
      const ux2 = u.position.x + 90;
      const uy1 = u.position.y - 20;
      const uy2 = u.position.y + 20;
      for (const p of ps) {
        const ph =
          p.shape === 'institution' ? 90 : SHAPE_HALF;
        const phh =
          p.shape === 'institution' ? 20 : SHAPE_HALF;
        const px1 = p.position.x - ph;
        const px2 = p.position.x + ph;
        const py1 = p.position.y - phh;
        const py2 = p.position.y + phh;
        if (px1 < ux2 && px2 > ux1 && py1 < uy2 && py2 > uy1) {
          collidingPersonIds.add(p.id);
          collidingUnitIds.add(u.id);
        }
      }
    }
  }

  // ==================== Helpers ====================
  // 先把 screen 座標轉到 SVG root(未變形);再反推 <g transform> 的 pan/zoom
  const toSvgPoint = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const root = pt.matrixTransform(ctm.inverse());
    return {
      x: (root.x - viewPan.x) / viewZoom,
      y: (root.y - viewPan.y) / viewZoom,
    };
  };

  const hasParents = (personId: string) =>
    currentCase.lines.some(
      (l) =>
        l.toPersonId === personId &&
        (l.subType === 'biological' ||
          l.subType === 'adopted' ||
          l.subType === 'placed-out'),
    );

  const countSpousesOnSide = (personId: string, dir: 'left' | 'right') => {
    const person = currentCase.persons.find((p) => p.id === personId);
    if (!person) return 0;
    return currentCase.lines.filter((l) => {
      if (!MARRIAGE_SUBTYPES.has(l.subType)) return false;
      if (l.fromPersonId !== personId && l.toPersonId !== personId)
        return false;
      const otherId =
        l.fromPersonId === personId ? l.toPersonId : l.fromPersonId;
      const other = currentCase.persons.find((p) => p.id === otherId);
      if (!other) return false;
      const dx = other.position.x - person.position.x;
      return dir === 'right' ? dx > 0 : dx < 0;
    }).length;
  };

  // 有 outgoing placed-out/fostered/sperm-donor 線 → 出養/寄養父母 / 捐精者,應縮小顯示
  const hasOutgoingPlacedOutOrFostered = (personId: string) =>
    currentCase.lines.some(
      (l) =>
        l.fromPersonId === personId &&
        (l.subType === 'placed-out' ||
          l.subType === 'fostered' ||
          l.subType === 'sperm-donor'),
    );

  // Connector 釋放點命中:依序測 person → unit body → ecosystem polygon
  const hitConnectorTarget = (
    x: number,
    y: number,
    sourceUnitId: string,
  ): ConnectorTarget | null => {
    const person = findPersonAt(x, y);
    if (person) return { type: 'person', id: person.id };
    const units = currentCase.networkUnits ?? [];
    const unit = units.find((u) => {
      if (u.id === sourceUnitId) return false;
      return (
        Math.abs(u.position.x - x) <= 90 &&
        Math.abs(u.position.y - y) <= 20
      );
    });
    if (unit) return { type: 'unit', id: unit.id };
    const ecos = currentCase.ecosystems ?? [];
    const eco = ecos.find((e) => pointInPolygon(x, y, e.points));
    if (eco) return { type: 'ecosystem', id: eco.id };
    return null;
  };

  const findPersonAt = (x: number, y: number): Person | null => {
    for (const p of currentCase.persons) {
      const dx = Math.abs(p.position.x - x);
      const dy = Math.abs(p.position.y - y);
      const limit = p.shape === 'institution' ? 90 : SHAPE_HALF;
      if (dx <= limit && dy <= SHAPE_HALF) return p;
    }
    return null;
  };

  const findMarriageAt = (
    x: number,
    y: number,
    threshold = 15,
  ): LineType | null => {
    for (const m of marriageLines) {
      const a = currentCase.persons.find((p) => p.id === m.fromPersonId);
      const b = currentCase.persons.find((p) => p.id === m.toPersonId);
      if (!a || !b) continue;
      const d = distToSegment(
        x,
        y,
        a.position.x,
        a.position.y,
        b.position.x,
        b.position.y,
      );
      if (d <= threshold) return m;
    }
    return null;
  };

  // 決定拖動端:bio 線固定 from,其他依距離
  const decideEnd = (
    line: LineType,
    from: Person,
    to: Person,
    clickX: number,
    clickY: number,
  ): 'from' | 'to' => {
    if (BIO_SUBTYPES.has(line.subType)) return 'from';
    const dFrom = Math.hypot(clickX - from.position.x, clickY - from.position.y);
    const dTo = Math.hypot(clickX - to.position.x, clickY - to.position.y);
    return dFrom < dTo ? 'from' : 'to';
  };

  // ==================== Line 直接拖 (document-level) ====================
  const onLinePointerDown = (e: React.PointerEvent, lineId: string) => {
    if (drawMode) return;
    // 點線 = 切換到「編輯既有線」模式,把 pending(待創建新線)取消掉
    // 否則上方藍色 banner 還會在,使用者以為按鈕沒效果
    if (pendingRelation) setPendingRelation(null);
    e.stopPropagation();
    const startLocal = toSvgPoint(e.clientX, e.clientY);

    // 判斷這次要拖哪些 lines
    // 如果 line 已被選中且 selectedLineIds.length > 1 → 多條一起拖
    // 否則 → 只拖這條
    const isInMultiSelect =
      selectedLineIds.includes(lineId) && selectedLineIds.length > 1;
    const lineIdsToDrag = isInMultiSelect ? selectedLineIds : [lineId];

    const drags: LineDragEntry[] = [];
    for (const lid of lineIdsToDrag) {
      const ln = currentCase.lines.find((l) => l.id === lid);
      if (!ln) continue;
      const f = currentCase.persons.find((p) => p.id === ln.fromPersonId);
      const t = currentCase.persons.find((p) => p.id === ln.toPersonId);
      if (!f || !t) continue;
      drags.push({
        lineId: lid,
        end: decideEnd(ln, f, t, startLocal.x, startLocal.y),
      });
    }
    if (drags.length === 0) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const pointerId = e.pointerId;
    let dragging = false;

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;
      if (!dragging && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
        dragging = true;
      }
      if (dragging) {
        const local = toSvgPoint(ev.clientX, ev.clientY);
        setHandleDrag({
          drags,
          currentX: local.x,
          currentY: local.y,
          pointerId,
        });
      }
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (dragging) {
        const local = toSvgPoint(ev.clientX, ev.clientY);
        const personTarget = findPersonAt(local.x, local.y);
        if (personTarget) {
          // 智慧分派:bio 的 from 端丟在另一人身上
          //  - 該人已婚 → 視為丟在其婚姻線 → 加 A→M1, A→M2 為 placed-out(次要父母,虛線縮人)
          //  - 該人未婚 → 加 A→Z 為 placed-out(單一次要父母,虛線縮人)
          //  - 原本的 X+Y 親生父母線「不動」(修原本會斷掉變捐精的 bug)
          for (const d of drags) {
            const ln = currentCase.lines.find((l) => l.id === d.lineId);
            if (!ln) continue;
            // Guard A:丟回自己原本那端 → 取消(no-op)
            const currentEnd =
              d.end === 'from' ? ln.fromPersonId : ln.toPersonId;
            if (personTarget.id === currentEnd) continue;
            if (BIO_SUBTYPES.has(ln.subType) && d.end === 'from') {
              const childId = ln.toPersonId;
              // Guard B:不能讓自己變自己的父母
              if (personTarget.id === childId) continue;
              const targetMarriage = marriageLines.find(
                (mm) =>
                  mm.fromPersonId === personTarget.id ||
                  mm.toPersonId === personTarget.id,
              );
              // Guard C:目標婚姻已包含原父母(丟回自家婚姻) → 取消
              const isOwnMarriage =
                !!targetMarriage &&
                (targetMarriage.fromPersonId === ln.fromPersonId ||
                  targetMarriage.toPersonId === ln.fromPersonId);
              if (isOwnMarriage) continue;
              if (
                targetMarriage &&
                targetMarriage.id !== ln.id
              ) {
                addSecondaryParentsFromMarriage(childId, targetMarriage.id);
                continue;
              }
              // 未婚的人 → 單一次要父母
              addSecondaryParentFromPerson(childId, personTarget.id);
              continue;
            }
            updateLineEndpoint(d.lineId, d.end, personTarget.id);
          }
        } else {
          const marriageTarget = findMarriageAt(local.x, local.y);
          if (marriageTarget) {
            for (const d of drags) {
              const ln = currentCase.lines.find((l) => l.id === d.lineId);
              if (
                ln &&
                BIO_SUBTYPES.has(ln.subType) &&
                d.end === 'from' &&
                ln.id !== marriageTarget.id
              ) {
                addSecondaryParentsFromMarriage(ln.toPersonId, marriageTarget.id);
              }
            }
          }
        }
      } else {
        // 短按 = 選取
        if (ev.shiftKey) {
          useGenogramStore.getState().toggleLineSelection(lineId);
        } else {
          selectLine(lineId);
        }
      }
      setHandleDrag(null);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  // ==================== Person Drag ====================
  const onPersonPointerDown = (e: React.PointerEvent, personId: string) => {
    if (drawMode) return;
    // 關係線 pending mode:點到第二個人 → 建立關係線
    if (pendingRelation) {
      e.stopPropagation();
      const sourceId =
        inspectorTarget?.type === 'person' ? inspectorTarget.id : null;
      if (sourceId && sourceId !== personId) {
        createRelationLine(sourceId, personId, pendingRelation);
      } else {
        setPendingRelation(null);
      }
      return;
    }
    e.stopPropagation();
    const local = toSvgPoint(e.clientX, e.clientY);

    let ids: string[];
    if (e.shiftKey) {
      togglePersonSelection(personId);
      ids = selectedPersonIds.includes(personId)
        ? selectedPersonIds.filter((x) => x !== personId)
        : [...selectedPersonIds, personId];
    } else if (selectedPersonIds.includes(personId)) {
      ids = selectedPersonIds;
    } else {
      selectPerson(personId);
      ids = [personId];
    }

    const origPositions = ids
      .map((id) => currentCase.persons.find((p) => p.id === id))
      .filter((p): p is Person => !!p)
      .map((p) => ({ id: p.id, x: p.position.x, y: p.position.y }));

    // 若拖動的是選取群組內的人 → 同時帶著選取的單位一起移
    const isInGroup = selectedPersonIds.includes(personId);
    const unitsToDrag = isInGroup ? selectedUnitIds : [];
    const origUnitPositions = unitsToDrag
      .map((id) => (currentCase.networkUnits ?? []).find((u) => u.id === id))
      .filter((u): u is NetworkUnit => !!u)
      .map((u) => ({ id: u.id, x: u.position.x, y: u.position.y }));

    dragRef.current = {
      mode: 'person',
      personIds: origPositions.map((o) => o.id),
      startX: local.x,
      startY: local.y,
      origPositions,
      origUnitPositions,
      pointerId: e.pointerId,
      moved: false,
    };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  // ==================== Background (marquee / pan / 畫筆) ====================
  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    // 點背景 → 退出生態圈編輯
    if (editingEcosystemId) setEditingEcosystem(null);
    // 點背景 → 取消關係線 pending
    if (pendingRelation) setPendingRelation(null);
    // 畫筆模式優先
    if (drawMode && e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      const local = toSvgPoint(e.clientX, e.clientY);
      const start = snapMidline(local);
      drawPointerIdRef.current = e.pointerId;
      setDrawPath([start]);
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      return;
    }
    // 中鍵 or (左鍵 + Space) = 拖移畫布
    const isPan =
      e.button === 1 || (e.button === 0 && spaceHeld);
    const isMarquee = e.button === 0 && !spaceHeld;
    if (!isPan && !isMarquee) return;
    e.preventDefault();
    e.stopPropagation();

    if (isPan) {
      dragRef.current = {
        mode: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: viewPan.x,
        startPanY: viewPan.y,
        pointerId: e.pointerId,
      };
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      return;
    }

    const local = toSvgPoint(e.clientX, e.clientY);
    dragRef.current = {
      mode: 'marquee',
      startX: local.x,
      startY: local.y,
      currentX: local.x,
      currentY: local.y,
      pointerId: e.pointerId,
    };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // 畫筆模式:延伸路徑
    if (drawMode && drawPointerIdRef.current === e.pointerId) {
      const local = toSvgPoint(e.clientX, e.clientY);
      const cur = snapMidline(local);
      setDrawPath((path) => {
        const last = path[path.length - 1];
        if (!last) return [cur];
        if (cur.x === last.x && cur.y === last.y) return path;
        // 回頭:若 cur 已在路徑上(中間點)→ 截短到該點(撤銷)
        // 注意:回到「起點」(idx=0) 不該撤銷,那是使用者要封閉多邊形的意圖
        const idx = path.findIndex((p) => p.x === cur.x && p.y === cur.y);
        if (idx > 0 && idx < path.length - 1) {
          return path.slice(0, idx + 1);
        }
        // 同軸:若跟前一段同方向 → 替換最後一點
        if (cur.x === last.x || cur.y === last.y) {
          const prev = path[path.length - 2];
          if (
            prev &&
            ((prev.x === last.x && last.x === cur.x) ||
              (prev.y === last.y && last.y === cur.y))
          ) {
            return [...path.slice(0, -1), cur];
          }
          return [...path, cur];
        }
        // 對角:插一個 L 型轉角(跟著主要移動方向)
        const corner =
          Math.abs(cur.x - last.x) > Math.abs(cur.y - last.y)
            ? { x: cur.x, y: last.y }
            : { x: last.x, y: cur.y };
        return [...path, corner, cur];
      });
      return;
    }

    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;

    if (d.mode === 'pan') {
      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
      setViewPan(d.startPanX + dx, d.startPanY + dy);
      return;
    }

    const local = toSvgPoint(e.clientX, e.clientY);

    if (d.mode === 'person') {
      const dx = local.x - d.startX;
      const dy = local.y - d.startY;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) d.moved = true;
      if (d.moved) {
        d.origPositions.forEach((op) => {
          movePerson(op.id, op.x + dx, op.y + dy);
        });
        d.origUnitPositions.forEach((op) => {
          moveNetworkUnit(op.id, op.x + dx, op.y + dy);
        });
      }
    } else if (d.mode === 'marquee') {
      d.currentX = local.x;
      d.currentY = local.y;
      setMarquee({
        x: Math.min(d.startX, d.currentX),
        y: Math.min(d.startY, d.currentY),
        w: Math.abs(d.currentX - d.startX),
        h: Math.abs(d.currentY - d.startY),
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    // 畫筆模式:檢查是否封閉
    if (drawMode && drawPointerIdRef.current === e.pointerId) {
      drawPointerIdRef.current = null;
      setDrawPath((path) => {
        if (path.length >= 3) {
          const first = path[0];
          const last = path[path.length - 1];
          const dist = Math.hypot(last.x - first.x, last.y - first.y);
          // 接近起點(<= 3 格 ≈ 180px)→ 封閉,寬鬆容忍
          if (dist <= GRID_SIZE * 3) {
            // 若最後一點跟起點不同軸 → 補一個 L 直角轉角,避免斜邊
            const finalPath =
              last.x !== first.x && last.y !== first.y
                ? [...path, { x: last.x, y: first.y }]
                : path;
            addEcosystem(finalPath);
            setDrawMode(false);
          }
        }
        return [];
      });
      return;
    }

    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;

    if (d.mode === 'person') {
      if (d.moved) {
        // Step 1: snap 人跟單位到 grid
        d.origPositions.forEach((op) => {
          const p = currentCase.persons.find((x) => x.id === op.id);
          if (p) {
            movePerson(
              op.id,
              snapToGrid(p.position.x),
              snapToGrid(p.position.y),
            );
          }
        });
        d.origUnitPositions.forEach((op) => {
          const u = (currentCase.networkUnits ?? []).find(
            (x) => x.id === op.id,
          );
          if (u) {
            moveNetworkUnit(
              op.id,
              snapToGrid(u.position.x),
              snapToGrid(u.position.y),
            );
          }
        });
        // Step 2: 若任何被拖的人重疊別人或壓到線 → 整組回原位
        const movedIds = d.origPositions.map((o) => o.id);
        const movedUnitIds = d.origUnitPositions.map((o) => o.id);
        const latest = useGenogramStore.getState().currentCase;
        if (latest) {
          const anyCollision = movedIds.some((id) => {
            const p = latest.persons.find((x) => x.id === id);
            if (!p) return false;
            const hitPerson = latest.persons.some(
              (q) =>
                q.id !== p.id &&
                !movedIds.includes(q.id) &&
                Math.abs(q.position.x - p.position.x) < COLLISION_TOLERANCE &&
                Math.abs(q.position.y - p.position.y) < COLLISION_TOLERANCE,
            );
            if (hitPerson) return true;
            return latest.lines.some((l) =>
              personHitsLine(p, l, latest.persons),
            );
          });
          // 單位 vs 非同組單位重疊也算
          const unitOverlap = movedUnitIds.some((id) => {
            const u = latest.networkUnits?.find((x) => x.id === id);
            if (!u) return false;
            return (latest.networkUnits ?? []).some(
              (o) =>
                !movedUnitIds.includes(o.id) &&
                Math.abs(o.position.x - u.position.x) < 80 &&
                Math.abs(o.position.y - u.position.y) < 40,
            );
          });
          if (anyCollision || unitOverlap) {
            d.origPositions.forEach((op) => {
              movePerson(op.id, op.x, op.y);
            });
            d.origUnitPositions.forEach((op) => {
              moveNetworkUnit(op.id, op.x, op.y);
            });
          }
        }
      }
    } else if (d.mode === 'marquee') {
      const rect = {
        x1: Math.min(d.startX, d.currentX),
        y1: Math.min(d.startY, d.currentY),
        x2: Math.max(d.startX, d.currentX),
        y2: Math.max(d.startY, d.currentY),
      };
      const isRect =
        rect.x2 - rect.x1 > DRAG_THRESHOLD ||
        rect.y2 - rect.y1 > DRAG_THRESHOLD;
      if (isRect) {
        const personIds = currentCase.persons
          .filter(
            (p) =>
              p.position.x >= rect.x1 &&
              p.position.x <= rect.x2 &&
              p.position.y >= rect.y1 &&
              p.position.y <= rect.y2,
          )
          .map((p) => p.id);

        // 線條:兩端都在 rect 內才算被框到
        const lineIds = currentCase.lines
          .filter((l) => {
            const f = currentCase.persons.find((p) => p.id === l.fromPersonId);
            const t = currentCase.persons.find((p) => p.id === l.toPersonId);
            if (!f || !t) return false;
            const fIn =
              f.position.x >= rect.x1 &&
              f.position.x <= rect.x2 &&
              f.position.y >= rect.y1 &&
              f.position.y <= rect.y2;
            const tIn =
              t.position.x >= rect.x1 &&
              t.position.x <= rect.x2 &&
              t.position.y >= rect.y1 &&
              t.position.y <= rect.y2;
            return fIn && tIn;
          })
          .map((l) => l.id);

        // 網絡單位:單位盒(180x40) 跟 rect 有重疊就算被框到
        const unitIds = (currentCase.networkUnits ?? [])
          .filter((u) => {
            if (!u.isActive) return false;
            const ux1 = u.position.x - 90;
            const ux2 = u.position.x + 90;
            const uy1 = u.position.y - 20;
            const uy2 = u.position.y + 20;
            return (
              rect.x1 < ux2 &&
              rect.x2 > ux1 &&
              rect.y1 < uy2 &&
              rect.y2 > uy1
            );
          })
          .map((u) => u.id);

        // 允許人+單位同時被選中(可以一起拖);線只在獨自被框時選取
        if (personIds.length > 0 && unitIds.length > 0) {
          selectPersonsAndUnits(personIds, unitIds);
        } else if (personIds.length > 0) {
          selectPersons(personIds);
          setSelectedConnector(null);
        } else if (unitIds.length > 0) {
          selectUnits(unitIds);
          setSelectedConnector(null);
        } else if (lineIds.length > 0) {
          selectLines(lineIds);
          setSelectedConnector(null);
        } else {
          clearSelection();
          setSelectedConnector(null);
        }
      } else {
        clearSelection();
        setSelectedConnector(null);
      }
      setMarquee(null);
    }
    dragRef.current = null;
  };

  // 游標樣式:畫筆模式 → crosshair / 按住 Space → grab / 拖 pan 中 → grabbing
  const panning = dragRef.current?.mode === 'pan';
  const cursor = drawMode
    ? 'crosshair'
    : panning
      ? 'grabbing'
      : spaceHeld
        ? 'grab'
        : 'default';

  return (
    <>
    <svg
      ref={svgRef}
      id="canvas-svg"
      width="100%"
      height="100%"
      style={{
        display: 'block',
        touchAction: 'none',
        width: '100%',
        height: '100%',
        cursor,
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerDown={() => {
        // 點畫布 → 把 input/textarea 的 focus 移除,
        // 這樣全域 Delete 鍵才能刪掉畫布的選取項(不會被當成輸入框輸入)
        const active = document.activeElement as HTMLElement | null;
        if (
          active &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.isContentEditable)
        ) {
          active.blur();
        }
      }}
    >
      <defs>
        <pattern
          id="dotGrid"
          width={GRID_SIZE}
          height={GRID_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={GRID_SIZE / 2} cy={GRID_SIZE / 2} r={1.2} fill="#e5e5e7" />
        </pattern>
      </defs>

      {/* 白色底 + 背景 pointerdown — 不進入 <g transform>,一直覆蓋視窗 */}
      <rect
        width="100%"
        height="100%"
        fill="#ffffff"
        onPointerDown={onBackgroundPointerDown}
      />

      {/* 可變形層:格線 + 所有內容都套用 pan/zoom */}
      <g
        transform={`translate(${viewPan.x} ${viewPan.y}) scale(${viewZoom})`}
      >
        <rect
          x={-10000}
          y={-10000}
          width={20000}
          height={20000}
          fill="url(#dotGrid)"
          onPointerDown={onBackgroundPointerDown}
          style={{ pointerEvents: 'visiblePainted' }}
        />

      {/* 同住成員圈(虛線框圍住成員) */}
      {(currentCase.households ?? []).map((hh) => {
        const members = currentCase.persons.filter((p) =>
          hh.memberIds.includes(p.id),
        );
        if (members.length === 0) return null;
        const PADDING = 28;
        const xs = members.map((m) => m.position.x);
        const ys = members.map((m) => m.position.y);
        const minX = Math.min(...xs) - PADDING;
        const minY = Math.min(...ys) - PADDING;
        const maxX = Math.max(...xs) + PADDING;
        const maxY = Math.max(...ys) + PADDING;
        return (
          <g key={hh.id} style={{ pointerEvents: 'none' }}>
            <rect
              x={minX}
              y={minY}
              width={maxX - minX}
              height={maxY - minY}
              rx={20}
              fill="rgba(255,149,0,0.04)"
              stroke="#ff9500"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              opacity={0.7}
            />
            {hh.label && (
              <text
                x={minX + 12}
                y={minY - 6}
                fontSize={11}
                fill="#ff9500"
                fontWeight={500}
                style={{ userSelect: 'none' }}
              >
                🏠 {hh.label}
              </text>
            )}
          </g>
        );
      })}

      {/* 生態圈(多個自訂多邊形) */}
      {(currentCase.ecosystems ?? []).map((eco) => (
        <EcosystemPolygon
          key={eco.id}
          ecosystem={eco}
          onStartDrag={(ev, ecoId) => {
            if (drawMode) return;
            const startClientX = ev.clientX;
            const startClientY = ev.clientY;
            const pointerId = ev.pointerId;
            let lastDX = 0;
            let lastDY = 0;
            const onMoveEco = (me: PointerEvent) => {
              if (me.pointerId !== pointerId) return;
              const dx =
                snapToGrid((me.clientX - startClientX) / viewZoom);
              const dy =
                snapToGrid((me.clientY - startClientY) / viewZoom);
              if (dx !== lastDX || dy !== lastDY) {
                moveEcosystem(ecoId, dx - lastDX, dy - lastDY);
                lastDX = dx;
                lastDY = dy;
              }
            };
            const onUpEco = (me: PointerEvent) => {
              if (me.pointerId !== pointerId) return;
              document.removeEventListener('pointermove', onMoveEco);
              document.removeEventListener('pointerup', onUpEco);
              document.removeEventListener('pointercancel', onUpEco);
            };
            document.addEventListener('pointermove', onMoveEco);
            document.addEventListener('pointerup', onUpEco);
            document.addEventListener('pointercancel', onUpEco);
          }}
          onVertexDown={(ev, ecoId, vIdx) => {
            const orig = eco.points;
            const pointerId = ev.pointerId;
            // 上一個合法位置(被自相交擋住時形狀停在這裡)
            let lastValidPoints = orig;
            // 內部變形函式:給定新的 vertex 座標,推導其他兩個鄰點維持直角
            const reshape = (newX: number, newY: number) => {
              const n = orig.length;
              const prevIdx = (vIdx - 1 + n) % n;
              const nextIdx = (vIdx + 1) % n;
              const oldV = orig[vIdx];
              const prev = orig[prevIdx];
              const next = orig[nextIdx];
              const newPoints = orig.map((p) => ({ ...p }));
              newPoints[vIdx] = { x: newX, y: newY };
              if (prev.y === oldV.y)
                newPoints[prevIdx] = { x: prev.x, y: newY };
              else if (prev.x === oldV.x)
                newPoints[prevIdx] = { x: newX, y: prev.y };
              if (next.y === oldV.y)
                newPoints[nextIdx] = { x: next.x, y: newY };
              else if (next.x === oldV.x)
                newPoints[nextIdx] = { x: newX, y: next.y };
              return newPoints;
            };
            // 拖曳中:不 snap,即時跟手;若會自相交則不更新(形狀「黏」在上一個合法位置)
            const onMove = (me: PointerEvent) => {
              if (me.pointerId !== pointerId) return;
              const local = toSvgPoint(me.clientX, me.clientY);
              const candidate = reshape(local.x, local.y);
              if (isSimplePolygon(candidate)) {
                lastValidPoints = candidate;
                setEcosystemPointsTransient(ecoId, candidate);
              }
            };
            // 放手:snap 到 grid + commit;若 snap 後不合法 → 退回最後合法位置
            const onUp = (me: PointerEvent) => {
              if (me.pointerId !== pointerId) return;
              document.removeEventListener('pointermove', onMove);
              document.removeEventListener('pointerup', onUp);
              document.removeEventListener('pointercancel', onUp);
              const local = toSvgPoint(me.clientX, me.clientY);
              const snapped = reshape(
                snapToGrid(local.x),
                snapToGrid(local.y),
              );
              const final = isSimplePolygon(snapped)
                ? snapped
                : lastValidPoints;
              setEcosystemPointsTransient(ecoId, final);
              commitEcosystemEdit(ecoId, orig);
            };
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointercancel', onUp);
          }}
          onEdgeDown={(ev, ecoId, edgeIdx) => {
            const orig = eco.points;
            const pointerId = ev.pointerId;
            const a = orig[edgeIdx];
            const b = orig[(edgeIdx + 1) % orig.length];
            const horizontal = a.y === b.y;
            const startClientX = ev.clientX;
            const startClientY = ev.clientY;
            let lastValidPoints = orig;
            const reshape = (delta: number) => {
              const i = edgeIdx;
              const j = (edgeIdx + 1) % orig.length;
              const newPoints = orig.map((p) => ({ ...p }));
              if (horizontal) {
                newPoints[i] = { x: a.x, y: a.y + delta };
                newPoints[j] = { x: b.x, y: b.y + delta };
              } else {
                newPoints[i] = { x: a.x + delta, y: a.y };
                newPoints[j] = { x: b.x + delta, y: b.y };
              }
              return newPoints;
            };
            const onMove = (me: PointerEvent) => {
              if (me.pointerId !== pointerId) return;
              const dx = (me.clientX - startClientX) / viewZoom;
              const dy = (me.clientY - startClientY) / viewZoom;
              const candidate = reshape(horizontal ? dy : dx);
              if (isSimplePolygon(candidate)) {
                lastValidPoints = candidate;
                setEcosystemPointsTransient(ecoId, candidate);
              }
            };
            const onUp = (me: PointerEvent) => {
              if (me.pointerId !== pointerId) return;
              document.removeEventListener('pointermove', onMove);
              document.removeEventListener('pointerup', onUp);
              document.removeEventListener('pointercancel', onUp);
              const dx = (me.clientX - startClientX) / viewZoom;
              const dy = (me.clientY - startClientY) / viewZoom;
              const snapped = horizontal ? snapToGrid(dy) : snapToGrid(dx);
              const candidate = reshape(snapped);
              const final = isSimplePolygon(candidate)
                ? candidate
                : lastValidPoints;
              setEcosystemPointsTransient(ecoId, final);
              commitEcosystemEdit(ecoId, orig);
            };
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointercancel', onUp);
          }}
        />
      ))}

      {/* 畫筆即時預覽 */}
      {drawMode && drawPath.length > 0 && (
        <>
          <polyline
            points={drawPath.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#007aff"
            strokeWidth={2}
            strokeDasharray="4 3"
            style={{ pointerEvents: 'none' }}
          />
          {/* 起點標記 */}
          <circle
            cx={drawPath[0].x}
            cy={drawPath[0].y}
            r={6}
            fill="none"
            stroke="#007aff"
            strokeWidth={1.5}
            style={{ pointerEvents: 'none' }}
          />
        </>
      )}

      {/* 網絡單位(服務中的) */}
      {(currentCase.networkUnits ?? [])
        .filter((u) => u.isActive)
        .map((unit) => (
          <NetworkUnitShape
            key={unit.id}
            unit={unit}
            persons={currentCase.persons}
            units={currentCase.networkUnits ?? []}
            ecosystems={currentCase.ecosystems ?? []}
            selected={selectedUnitIds.includes(unit.id)}
            colliding={collidingUnitIds.has(unit.id)}
            draggingConnector={connectorDrag ?? undefined}
            selectedConnectorId={
              selectedConnector?.unitId === unit.id
                ? selectedConnector.connectorId
                : null
            }
            onConnectorDelete={(connectorId) => {
              removeConnector(unit.id, connectorId);
              setSelectedConnector(null);
            }}
            onDelete={() => removeNetworkUnit(unit.id)}
            onTriangleDown={(e, unitId) => {
              if (drawMode) return;
              const local0 = toSvgPoint(e.clientX, e.clientY);
              const pointerId = e.pointerId;
              let dragging = false;
              const startClientX = e.clientX;
              const startClientY = e.clientY;
              setConnectorDrag({
                unitId,
                connectorId: null,
                x: local0.x,
                y: local0.y,
              });
              const onMove = (ev: PointerEvent) => {
                if (ev.pointerId !== pointerId) return;
                const dxp = ev.clientX - startClientX;
                const dyp = ev.clientY - startClientY;
                if (
                  !dragging &&
                  Math.abs(dxp) + Math.abs(dyp) > DRAG_THRESHOLD
                ) {
                  dragging = true;
                }
                if (dragging) {
                  const local = toSvgPoint(ev.clientX, ev.clientY);
                  setConnectorDrag({
                    unitId,
                    connectorId: null,
                    x: local.x,
                    y: local.y,
                  });
                }
              };
              const onUp = (ev: PointerEvent) => {
                if (ev.pointerId !== pointerId) return;
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onUp);
                setConnectorDrag(null);
                if (!dragging) return; // 沒拖 → 取消(線消失,等同沒按)
                const local = toSvgPoint(ev.clientX, ev.clientY);
                const tgt = hitConnectorTarget(local.x, local.y, unitId);
                if (tgt) addConnector(unitId, tgt);
              };
              document.addEventListener('pointermove', onMove);
              document.addEventListener('pointerup', onUp);
              document.addEventListener('pointercancel', onUp);
            }}
            onConnectorDown={(e, unitId, connectorId) => {
              if (drawMode) return;
              const local0 = toSvgPoint(e.clientX, e.clientY);
              const pointerId = e.pointerId;
              let dragging = false;
              const startClientX = e.clientX;
              const startClientY = e.clientY;
              setConnectorDrag({
                unitId,
                connectorId,
                x: local0.x,
                y: local0.y,
              });
              const onMove = (ev: PointerEvent) => {
                if (ev.pointerId !== pointerId) return;
                const dxp = ev.clientX - startClientX;
                const dyp = ev.clientY - startClientY;
                if (
                  !dragging &&
                  Math.abs(dxp) + Math.abs(dyp) > DRAG_THRESHOLD
                ) {
                  dragging = true;
                }
                if (dragging) {
                  const local = toSvgPoint(ev.clientX, ev.clientY);
                  setConnectorDrag({
                    unitId,
                    connectorId,
                    x: local.x,
                    y: local.y,
                  });
                }
              };
              const onUp = (ev: PointerEvent) => {
                if (ev.pointerId !== pointerId) return;
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onUp);
                setConnectorDrag(null);
                if (!dragging) {
                  // 短按 = 選中此 connector(顯示 × 刪除按鈕)
                  setSelectedConnector({ unitId, connectorId });
                  clearSelection();
                  return;
                }
                const local = toSvgPoint(ev.clientX, ev.clientY);
                const tgt = hitConnectorTarget(local.x, local.y, unitId);
                if (tgt) {
                  updateConnectorTarget(unitId, connectorId, tgt);
                } else {
                  // 拖到空白 → 刪除
                  removeConnector(unitId, connectorId);
                }
                setSelectedConnector(null);
              };
              document.addEventListener('pointermove', onMove);
              document.addEventListener('pointerup', onUp);
              document.addEventListener('pointercancel', onUp);
            }}
            onPointerDown={(e) => {
              if (drawMode) return;
              // 關係線 pending mode:點到單位 → 建立 person→unit connector(套 subType)
              // 若該單位已有連到此 person 的 connector → 直接改它的 subType
              if (pendingRelation) {
                e.stopPropagation();
                const sourceId =
                  inspectorTarget?.type === 'person'
                    ? inspectorTarget.id
                    : null;
                if (sourceId) {
                  const existing = findUnitConnectorByPerson(
                    unit.id,
                    sourceId,
                  );
                  if (existing) {
                    setConnectorSubType(
                      unit.id,
                      existing.id,
                      pendingRelation,
                    );
                  } else {
                    addConnector(
                      unit.id,
                      { type: 'person', id: sourceId },
                      pendingRelation,
                    );
                  }
                  setPendingRelation(null);
                } else {
                  setPendingRelation(null);
                }
                return;
              }
              e.stopPropagation();
              // 若此單位已在匡選群組中 → 整組拖(含同時選的人);否則獨拖此單位
              const inGroup = selectedUnitIds.includes(unit.id);
              if (!inGroup) selectUnit(unit.id);
              const unitDragIds = inGroup ? selectedUnitIds : [unit.id];
              const personDragIds = inGroup ? selectedPersonIds : [];
              const origUnitPositions = unitDragIds
                .map((id) =>
                  (currentCase.networkUnits ?? []).find((u) => u.id === id),
                )
                .filter((u): u is NetworkUnit => !!u)
                .map((u) => ({
                  id: u.id,
                  x: u.position.x,
                  y: u.position.y,
                }));
              const origPersonPositions = personDragIds
                .map((id) => currentCase.persons.find((p) => p.id === id))
                .filter((p): p is Person => !!p)
                .map((p) => ({
                  id: p.id,
                  x: p.position.x,
                  y: p.position.y,
                }));
              const startClientX = e.clientX;
              const startClientY = e.clientY;
              const pointerId = e.pointerId;
              const onMove = (ev: PointerEvent) => {
                if (ev.pointerId !== pointerId) return;
                const dx = (ev.clientX - startClientX) / viewZoom;
                const dy = (ev.clientY - startClientY) / viewZoom;
                origUnitPositions.forEach((op) => {
                  moveNetworkUnit(op.id, op.x + dx, op.y + dy);
                });
                origPersonPositions.forEach((op) => {
                  movePerson(op.id, op.x + dx, op.y + dy);
                });
              };
              const onUp = (ev: PointerEvent) => {
                if (ev.pointerId !== pointerId) return;
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onUp);
                // Step 1: snap 到 grid
                const latest = useGenogramStore.getState().currentCase;
                if (!latest) return;
                origUnitPositions.forEach((op) => {
                  const u = (latest.networkUnits ?? []).find(
                    (x) => x.id === op.id,
                  );
                  if (u) {
                    moveNetworkUnit(
                      op.id,
                      snapToGrid(u.position.x),
                      snapToGrid(u.position.y),
                    );
                  }
                });
                origPersonPositions.forEach((op) => {
                  const p = latest.persons.find((x) => x.id === op.id);
                  if (p) {
                    movePerson(
                      op.id,
                      snapToGrid(p.position.x),
                      snapToGrid(p.position.y),
                    );
                  }
                });
                // Step 2: 碰撞 → 整組回原位(用 raw origPos,與 person drag 一致)
                const latest2 = useGenogramStore.getState().currentCase;
                if (!latest2) return;
                const movedUnitIds = origUnitPositions.map((o) => o.id);
                const movedPersonIds = origPersonPositions.map((o) => o.id);
                const unitOverlap = movedUnitIds.some((id) => {
                  const u = latest2.networkUnits?.find((x) => x.id === id);
                  if (!u) return false;
                  return (latest2.networkUnits ?? []).some(
                    (o) =>
                      !movedUnitIds.includes(o.id) &&
                      Math.abs(o.position.x - u.position.x) < 80 &&
                      Math.abs(o.position.y - u.position.y) < 40,
                  );
                });
                const personOverlap = movedPersonIds.some((id) => {
                  const p = latest2.persons.find((x) => x.id === id);
                  if (!p) return false;
                  const hitPerson = latest2.persons.some(
                    (q) =>
                      q.id !== p.id &&
                      !movedPersonIds.includes(q.id) &&
                      Math.abs(q.position.x - p.position.x) <
                        COLLISION_TOLERANCE &&
                      Math.abs(q.position.y - p.position.y) <
                        COLLISION_TOLERANCE,
                  );
                  if (hitPerson) return true;
                  return latest2.lines.some((l) =>
                    personHitsLine(p, l, latest2.persons),
                  );
                });
                if (unitOverlap || personOverlap) {
                  origUnitPositions.forEach((op) => {
                    moveNetworkUnit(op.id, op.x, op.y);
                  });
                  origPersonPositions.forEach((op) => {
                    movePerson(op.id, op.x, op.y);
                  });
                }
              };
              document.addEventListener('pointermove', onMove);
              document.addEventListener('pointerup', onUp);
              document.addEventListener('pointercancel', onUp);
            }}
          />
        ))}

      {looseLines.map((line) => {
        const from = currentCase.persons.find((p) => p.id === line.fromPersonId);
        const to = currentCase.persons.find((p) => p.id === line.toPersonId);
        if (!from || !to) return null;
        // 同對人物之間是否有 member 線 → 關係線弧形繞過
        let arcDetour: 'up' | 'right' | null = null;
        if (line.category === 'relation') {
          const memberBetween = currentCase.lines.find(
            (m) =>
              m.id !== line.id &&
              m.category === 'member' &&
              ((m.fromPersonId === line.fromPersonId &&
                m.toPersonId === line.toPersonId) ||
                (m.fromPersonId === line.toPersonId &&
                  m.toPersonId === line.fromPersonId)),
          );
          if (memberBetween) {
            const dx = Math.abs(to.position.x - from.position.x);
            const dy = Math.abs(to.position.y - from.position.y);
            arcDetour = dx >= dy ? 'up' : 'right';
          }
        }
        const dragEntry = handleDrag?.drags.find((d) => d.lineId === line.id);
        const override = dragEntry && handleDrag
          ? {
              end: dragEntry.end,
              x: handleDrag.currentX,
              y: handleDrag.currentY,
            }
          : undefined;
        return (
          <Line
            key={line.id}
            line={line}
            from={from}
            to={to}
            selected={selectedLineIds.includes(line.id)}
            dragging={!!dragEntry}
            handleOverride={override}
            onLinePointerDown={(e) => onLinePointerDown(e, line.id)}
            onLineDoubleClick={(e) => {
              // 點兩下原本是 cycleLineSubType,現在改成由 Line 內部開啟編輯備注
              // 父層只負責 stopPropagation
              e.stopPropagation();
            }}
            onDelete={() => removeLine(line.id)}
            arcDetour={arcDetour}
          />
        );
      })}

      {/* 出養線:獨立渲染 — 從孩子「頂邊」左/右偏移處,直接到生父母(或婚姻中點) */}
      {placedOutRenders.map((po, idx) => {
        const child = po.child;
        const childX = child.position.x;
        // 判斷生父母在孩子左側還是右側
        const parentOnLeft = po.targetX < childX;
        // 頂邊 y(機構是 -半高 * 0.7,菱形 ~0.85H,其他是 -SHAPE_HALF)
        const topY =
          child.shape === 'institution'
            ? child.position.y - SHAPE_HALF * 0.7
            : child.position.y - SHAPE_HALF;
        // 水平偏移:頂邊上靠父母那側(半寬 70% 處)
        const halfW = child.shape === 'institution' ? 90 : SHAPE_HALF;
        const hOffset = halfW * 0.6;
        const startX = parentOnLeft ? childX - hOffset : childX + hOffset;
        const startY = topY;
        const firstLineId = po.lineIds[0];
        const selected = po.lineIds.some((id) => selectedLineIds.includes(id));
        const dragging = !!handleDrag?.drags.find((d) =>
          po.lineIds.includes(d.lineId),
        );
        const stroke = dragging
          ? '#ff9500'
          : selected
            ? '#007aff'
            : '#6e6e73';
        const sw = dragging || selected ? 2.5 : 1.5;
        return (
          <g key={`po-${idx}`}>
            <line
              x1={startX}
              y1={startY}
              x2={po.targetX}
              y2={po.targetY}
              stroke={stroke}
              strokeWidth={sw}
              strokeDasharray="6 4"
            />
            {/* hit area */}
            <line
              x1={startX}
              y1={startY}
              x2={po.targetX}
              y2={po.targetY}
              stroke="transparent"
              strokeWidth={18}
              onPointerDown={(e) => onLinePointerDown(e, firstLineId)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                cycleLineSubType(firstLineId);
              }}
              style={{ cursor: 'grab' }}
            />
          </g>
        );
      })}

      {marriageGroups.map((g) => (
        <MarriageGroup
          key={g.marriage.id}
          marriageLine={g.marriage}
          a={g.a}
          b={g.b}
          childBundles={g.childBundles}
          selectedLineIds={selectedLineIds}
          handleDrag={handleDrag}
          onLinePointerDown={onLinePointerDown}
          onLineDoubleClick={(e, lineId) => {
            e.stopPropagation();
            cycleLineSubType(lineId);
          }}
          onMarriageDownArrow={() => expandChildFromMarriage(g.marriage.id)}
          onMarriageDownArrowLongPress={() =>
            setTwinDialogTarget({ type: 'marriage', id: g.marriage.id })
          }
          onDeleteLine={(lineId) => removeLine(lineId)}
        />
      ))}

      {currentCase.persons.map((person) => {
        const autoShrink = hasOutgoingPlacedOutOrFostered(person.id);
        return (
          <PersonShape
            key={person.id}
            person={person}
            selected={selectedPersonIds.includes(person.id)}
            colliding={collidingPersonIds.has(person.id)}
            displayScaleOverride={autoShrink ? 0.7 : undefined}
            onPointerDown={(e) => onPersonPointerDown(e, person.id)}
            onDoubleClick={() => cycleShape(person.id)}
            onDelete={() => removePersons([person.id])}
          />
        );
      })}

      {selectedPersonIds.length === 1 &&
        (() => {
          const p = currentCase.persons.find(
            (x) => x.id === selectedPersonIds[0],
          );
          if (!p) return null;
          return (
            <SmallArrows
              person={p}
              hasParents={hasParents(p.id)}
              leftFull={countSpousesOnSide(p.id, 'left') >= 3}
              rightFull={countSpousesOnSide(p.id, 'right') >= 3}
              onDownLongPress={(personId) =>
                setTwinDialogTarget({ type: 'person', id: personId })
              }
            />
          );
        })()}

      {marquee && (
        <rect
          x={marquee.x}
          y={marquee.y}
          width={marquee.w}
          height={marquee.h}
          fill="rgba(0,122,255,0.12)"
          stroke="#007aff"
          strokeWidth={1}
          strokeDasharray="4 2"
          style={{ pointerEvents: 'none' }}
        />
      )}
      </g>
    </svg>
    {twinDialogTarget && (
      <TwinDialog
        onConfirm={(count, type) => {
          if (twinDialogTarget.type === 'marriage') {
            expandTwinsFromMarriage(twinDialogTarget.id, count, type);
          } else {
            expandTwinsFromPerson(twinDialogTarget.id, count, type);
          }
          setTwinDialogTarget(null);
        }}
        onCancel={() => setTwinDialogTarget(null)}
      />
    )}
    {/* 關係線 pending 提示 banner — 頂部居中 */}
    {pendingRelation && (() => {
      // RelationSubType (kebab) → labelKey camelCase
      const labelKey = `lineProps.subType.${pendingRelation.replace(
        /-([a-z])/g,
        (_, c) => c.toUpperCase(),
      )}`;
      return (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: '#007aff',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 13,
            boxShadow: '0 4px 14px rgba(0,122,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>{t('relation.pendingBanner', { name: t(labelKey) })}</span>
          <button
            onClick={() => setPendingRelation(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            ×
          </button>
        </div>
      );
    })()}
    </>
  );
}
