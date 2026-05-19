import type { Person } from '../../types/genogram';
import { useGenogramStore } from '../../store/genogramStore';

type Props = {
  person: Person;
  hasParents: boolean;
  leftFull: boolean;
  rightFull: boolean;
  onDownLongPress?: (personId: string) => void;
  /** ↑ 箭頭長按 500ms 觸發 → 進入「拖出未明家人線」模式
   *  由 Canvas 處理後續 pointermove / pointerup 邏輯 */
  onUpLongPress?: (personId: string, e: React.PointerEvent) => void;
};

const OFFSET = 48;
const ARROW_SIZE = 14;

type Direction = 'up' | 'down' | 'left' | 'right';

const trianglePoints = (dir: Direction): string => {
  const s = ARROW_SIZE;
  switch (dir) {
    case 'up':
      return `0,${-s} ${s * 0.8},0 ${-s * 0.8},0`;
    case 'down':
      return `0,${s} ${s * 0.8},0 ${-s * 0.8},0`;
    case 'left':
      return `${-s},0 0,${s * 0.8} 0,${-s * 0.8}`;
    case 'right':
      return `${s},0 0,${s * 0.8} 0,${-s * 0.8}`;
  }
};

const dirOffset = (dir: Direction): [number, number] => {
  switch (dir) {
    case 'up':
      return [0, -OFFSET];
    case 'down':
      return [0, OFFSET];
    case 'left':
      return [-OFFSET, 0];
    case 'right':
      return [OFFSET, 0];
  }
};

export default function SmallArrows({
  person,
  hasParents,
  leftFull,
  rightFull,
  onDownLongPress,
  onUpLongPress,
}: Props) {
  const expandParents = useGenogramStore((s) => s.expandParents);
  const expandSpouseOrSibling = useGenogramStore(
    (s) => s.expandSpouseOrSibling,
  );
  const expandChild = useGenogramStore((s) => s.expandChild);

  const dirs: Direction[] = ['up', 'down', 'left', 'right'];

  return (
    <g transform={`translate(${person.position.x}, ${person.position.y})`}>
      {dirs.map((dir) => {
        // ↑ 永遠顯示(短按加父母 / 有父母時短按無作用 / 長按 500ms 拖未明家人線)
        // 其他方向維持原本「滿了就藏」邏輯
        if (dir === 'left' && leftFull) return null;
        if (dir === 'right' && rightFull) return null;
        const [dx, dy] = dirOffset(dir);

        const handleShort = () => {
          if (dir === 'up') {
            // 有父母時短按不做事(避免誤觸),只能長按拖未明家人
            if (hasParents) return;
            expandParents(person.id);
          } else if (dir === 'left')
            expandSpouseOrSibling(person.id, 'left');
          else if (dir === 'right')
            expandSpouseOrSibling(person.id, 'right');
          else if (dir === 'down') expandChild(person.id);
        };

        // ↑ 箭頭支援長按 500ms → 拖出未明家人線
        if (dir === 'up') {
          return (
            <g
              key={dir}
              transform={`translate(${dx}, ${dy})`}
              onPointerDown={(e) => {
                e.stopPropagation();
                const pointerId = e.pointerId;
                const startX = e.clientX;
                const startY = e.clientY;
                const downEvt = e;
                let triggered = false;
                let cancelled = false;
                const cleanup = () => {
                  document.removeEventListener('pointerup', onUp);
                  document.removeEventListener('pointermove', onMove);
                };
                const timer = window.setTimeout(() => {
                  if (cancelled) return;
                  triggered = true;
                  cleanup();
                  onUpLongPress?.(person.id, downEvt);
                }, 500);
                const onMove = (ev: PointerEvent) => {
                  if (ev.pointerId !== pointerId) return;
                  if (
                    Math.abs(ev.clientX - startX) > 10 ||
                    Math.abs(ev.clientY - startY) > 10
                  ) {
                    cancelled = true;
                    window.clearTimeout(timer);
                    cleanup();
                  }
                };
                const onUp = (ev: PointerEvent) => {
                  if (ev.pointerId !== pointerId) return;
                  window.clearTimeout(timer);
                  cleanup();
                  if (!triggered && !cancelled) handleShort();
                };
                document.addEventListener('pointerup', onUp);
                document.addEventListener('pointermove', onMove);
              }}
              style={{ cursor: hasParents ? 'crosshair' : 'pointer' }}
            >
              <title>
                {hasParents
                  ? '長按 0.5 秒拖到另一人物 → 建立親子線(實線、預設親生)'
                  : '短按:加父母 / 長按 0.5 秒拖:建立親子線(實線、預設親生)'}
              </title>
              <circle r={ARROW_SIZE + 4} fill="#ffffff" fillOpacity={0.01} />
              <polygon
                points={trianglePoints(dir)}
                fill="#007aff"
                opacity={hasParents ? 0.5 : 0.85}
              />
            </g>
          );
        }

        // ↓ 箭頭支援長按 1 秒 → 多胞胎
        if (dir === 'down') {
          return (
            <g
              key={dir}
              transform={`translate(${dx}, ${dy})`}
              onPointerDown={(e) => {
                e.stopPropagation();
                const pointerId = e.pointerId;
                const startX = e.clientX;
                const startY = e.clientY;
                let triggered = false;
                let cancelled = false;
                const cleanup = () => {
                  document.removeEventListener('pointerup', onUp);
                  document.removeEventListener('pointermove', onMove);
                };
                const timer = window.setTimeout(() => {
                  if (cancelled) return;
                  triggered = true;
                  cleanup();
                  onDownLongPress?.(person.id);
                }, 1000);
                const onMove = (ev: PointerEvent) => {
                  if (ev.pointerId !== pointerId) return;
                  if (
                    Math.abs(ev.clientX - startX) > 10 ||
                    Math.abs(ev.clientY - startY) > 10
                  ) {
                    cancelled = true;
                    window.clearTimeout(timer);
                    cleanup();
                  }
                };
                const onUp = (ev: PointerEvent) => {
                  if (ev.pointerId !== pointerId) return;
                  window.clearTimeout(timer);
                  cleanup();
                  if (!triggered && !cancelled) handleShort();
                };
                document.addEventListener('pointerup', onUp);
                document.addEventListener('pointermove', onMove);
              }}
              style={{ cursor: 'pointer' }}
            >
              <title>短按:加配偶+1 子女 / 長按 1 秒:多胞胎</title>
              <circle r={ARROW_SIZE + 4} fill="#ffffff" fillOpacity={0.01} />
              <polygon
                points={trianglePoints(dir)}
                fill="#007aff"
                opacity={0.85}
              />
            </g>
          );
        }

        return (
          <g
            key={dir}
            transform={`translate(${dx}, ${dy})`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleShort();
            }}
            style={{ cursor: 'pointer' }}
          >
            <circle r={ARROW_SIZE + 4} fill="#ffffff" fillOpacity={0.01} />
            <polygon
              points={trianglePoints(dir)}
              fill="#007aff"
              opacity={0.85}
            />
          </g>
        );
      })}
    </g>
  );
}
