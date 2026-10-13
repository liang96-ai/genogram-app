// 同住圈 = ZonePolygon(1.5.0 起與生態圈共用手勢)。1.6.1 改成藍色,和畫筆畫的生態圈同色,靠 🏠 區分。
// 輪住(1.6.1):點線 + 標籤「輪住」,選取後可開關。
// 沒有自訂頂點時圈自動包住成員(不能整圈拖,拖了會脫離成員);拖過把手後固定形狀,之後與生態圈相同。
// 固定形狀的圈改畫點虛線(提醒它不再跟著成員走),選取後 × 旁有 ↺ 可回到自動(1.5.1)。
import type { Household, Person } from '../../types/genogram';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import { householdPoints } from '../../services/householdShape';
import ZonePolygon from './ZonePolygon';

type Props = {
  household: Household;
  persons: Person[];
  onStartDrag: (e: React.PointerEvent, hhId: string) => void;
  onVertexDown: (e: React.PointerEvent, hh: Household, points: { x: number; y: number }[], vertexIdx: number) => void;
  onEdgeDown: (e: React.PointerEvent, hh: Household, points: { x: number; y: number }[], edgeIdx: number) => void;
};

export const HOUSEHOLD_COLOR = '#007aff';

export default function HouseholdPolygon({ household, persons, onStartDrag, onVertexDown, onEdgeDown }: Props) {
  const t = useT();
  const removeHousehold = useGenogramStore((s) => s.removeHousehold);
  const updateHousehold = useGenogramStore((s) => s.updateHousehold);
  const resetHouseholdShape = useGenogramStore((s) => s.resetHouseholdShape);
  const selectHousehold = useGenogramStore((s) => s.selectHousehold);
  const setEditingHousehold = useGenogramStore((s) => s.setEditingHousehold);
  const selected = useGenogramStore((s) => s.selectedHouseholdId === household.id);
  const isEditing = useGenogramStore((s) => s.editingHouseholdId === household.id);
  const points = householdPoints(household, persons);
  const detached = !!household.points && household.points.length >= 3;
  const rotating = !!household.rotating;
  return (
    <ZonePolygon
      id={household.id}
      points={points}
      label={household.label}
      labelPrefix="🏠"
      labelSuffix={rotating ? t('household.rotating') : undefined}
      color={HOUSEHOLD_COLOR}
      fill="rgba(0,122,255,0.04)"
      dash={rotating ? '0.5 5' : detached ? '10 4 2 4' : '6 4'}
      lineCap={rotating ? 'round' : undefined}
      toggle={{
        text: t('household.rotating'),
        title: t('household.rotatingTip'),
        active: rotating,
        onToggle: () => updateHousehold(household.id, { rotating: rotating ? undefined : true }),
      }}
      selected={selected}
      isEditing={isEditing}
      canDrag={detached}
      dataAttr="data-hh-id"
      removeTitle={t('household.deleteTooltip')}
      resetTitle={t('household.resetShape')}
      onReset={detached ? () => resetHouseholdShape(household.id) : undefined}
      onSelect={() => selectHousehold(household.id)}
      onStartEdit={() => setEditingHousehold(household.id)}
      onStartDrag={(e) => onStartDrag(e, household.id)}
      onVertexDown={(e, i) => onVertexDown(e, household, points, i)}
      onEdgeDown={(e, i) => onEdgeDown(e, household, points, i)}
      onRemove={() => removeHousehold(household.id)}
      onRename={(label) => updateHousehold(household.id, { label: label || undefined })}
    />
  );
}
