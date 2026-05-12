import type { Person } from '../../types/genogram';
import { useGenogramStore } from '../../store/genogramStore';

type Props = {
  person: Person;
  hasParents: boolean;
  leftFull: boolean;
  rightFull: boolean;
  onDownLongPress?: (personId: string) => void;
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
        if (dir === 'up' && hasParents) return null;
        if (dir === 'left' && leftFull) return null;
        if (dir === 'right' && rightFull) return null;
        const [dx, dy] = dirOffset(dir);

        const handleShort = () => {
          if (dir === 'up') expandParents(person.id);
          else if (dir === 'left')
            expandSpouseOrSibling(person.id, 'left');
          else if (dir === 'right')
            expandSpouseOrSibling(person.id, 'right');
          else if (dir === 'down') expandChild(person.id);
        };

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
