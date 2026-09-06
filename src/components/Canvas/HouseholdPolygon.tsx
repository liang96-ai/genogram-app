// 同住圈 = ZonePolygon 的橘色版(1.5.0 起與生態圈共用手勢)。
// 沒有自訂頂點時圈自動包住成員(不能整圈拖,拖了會脫離成員);拖過把手後固定形狀,之後與生態圈相同。
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

export default function HouseholdPolygon({ household, persons, onStartDrag, onVertexDown, onEdgeDown }: Props) {
  const t = useT();
  const removeHousehold = useGenogramStore((s) => s.removeHousehold);
  const updateHousehold = useGenogramStore((s) => s.updateHousehold);
  const selectHousehold = useGenogramStore((s) => s.selectHousehold);
  const setEditingHousehold = useGenogramStore((s) => s.setEditingHousehold);
  const selected = useGenogramStore((s) => s.selectedHouseholdId === household.id);
  const isEditing = useGenogramStore((s) => s.editingHouseholdId === household.id);
  const points = householdPoints(household, persons);
  const detached = !!household.points && household.points.length >= 3;
  return (
    <ZonePolygon
      id={household.id}
      points={points}
      label={household.label}
      labelPrefix="🏠"
      color="#ff9500"
      fill="rgba(255,149,0,0.04)"
      dash="6 4"
      selected={selected}
      isEditing={isEditing}
      canDrag={detached}
      dataAttr="data-hh-id"
      removeTitle={t('household.deleteTooltip')}
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
