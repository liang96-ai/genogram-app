// 生態圈 = ZonePolygon 的藍色版(1.5.0 起與同住圈共用手勢)
import type { Ecosystem } from '../../types/genogram';
import { useGenogramStore } from '../../store/genogramStore';
import ZonePolygon from './ZonePolygon';

type Props = {
  ecosystem: Ecosystem;
  onStartDrag: (e: React.PointerEvent, ecoId: string) => void;
  onVertexDown: (e: React.PointerEvent, ecoId: string, vertexIdx: number) => void;
  onEdgeDown: (e: React.PointerEvent, ecoId: string, edgeIdx: number) => void;
};

export default function EcosystemPolygon({ ecosystem, onStartDrag, onVertexDown, onEdgeDown }: Props) {
  const removeEcosystem = useGenogramStore((s) => s.removeEcosystem);
  const updateEcosystem = useGenogramStore((s) => s.updateEcosystem);
  const selectEcosystem = useGenogramStore((s) => s.selectEcosystem);
  const setEditingEcosystem = useGenogramStore((s) => s.setEditingEcosystem);
  const selected = useGenogramStore((s) => s.selectedEcosystemId === ecosystem.id);
  const isEditing = useGenogramStore((s) => s.editingEcosystemId === ecosystem.id);
  return (
    <ZonePolygon
      id={ecosystem.id}
      points={ecosystem.points}
      label={ecosystem.label}
      color="#007aff"
      fill="rgba(0,122,255,0.04)"
      dash="8 6"
      selected={selected}
      isEditing={isEditing}
      canDrag
      dataAttr="data-eco-id"
      onSelect={() => selectEcosystem(ecosystem.id)}
      onStartEdit={() => setEditingEcosystem(ecosystem.id)}
      onStartDrag={(e) => onStartDrag(e, ecosystem.id)}
      onVertexDown={(e, i) => onVertexDown(e, ecosystem.id, i)}
      onEdgeDown={(e, i) => onEdgeDown(e, ecosystem.id, i)}
      onRemove={() => removeEcosystem(ecosystem.id)}
      onRename={(label) => updateEcosystem(ecosystem.id, { label })}
    />
  );
}
