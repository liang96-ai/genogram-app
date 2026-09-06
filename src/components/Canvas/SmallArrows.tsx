import type { Person } from '../../types/genogram';
import { useGenogramStore } from '../../store/genogramStore';
import type { ArrowDir } from '../../services/arrowDrop';
import { useT } from '../../i18n';

type Props = {
  person: Person;
  hasParents: boolean;
  leftFull: boolean;
  rightFull: boolean;
  /** ↓ 箭頭長按 1 秒不動 → 多胞胎 */
  onDownLongPress?: (personId: string) => void;
  /** 任一箭頭長按 0.25 秒後拖出去 → 拖曳模式,放到人物 / 婚姻線上建立關係(Canvas 處理落點) */
  onArrowDrag?: (personId: string, dir: ArrowDir, e: React.PointerEvent) => void;
};

const OFFSET = 48;
const ARROW_SIZE = 14;
const LONG_PRESS_MS = 250;
const TWINS_MS = 1000;
const MOVE_TOLERANCE = 10;

const trianglePoints = (dir: ArrowDir): string => {
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
const dirOffset = (dir: ArrowDir): [number, number] => {
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

export default function SmallArrows({ person, hasParents, leftFull, rightFull, onDownLongPress, onArrowDrag }: Props) {
  const t = useT();
  const expandParents = useGenogramStore((s) => s.expandParents);
  const expandSpouseOrSibling = useGenogramStore((s) => s.expandSpouseOrSibling);
  const expandChild = useGenogramStore((s) => s.expandChild);
  const dirs: ArrowDir[] = ['up', 'down', 'left', 'right'];

  const shortAction = (dir: ArrowDir) => {
    if (dir === 'up') {
      if (hasParents) return; // 有父母時短按不做事(避免誤觸),要接別人當父母請長按拖
      expandParents(person.id);
    } else if (dir === 'left') expandSpouseOrSibling(person.id, 'left');
    else if (dir === 'right') expandSpouseOrSibling(person.id, 'right');
    else expandChild(person.id);
  };

  /**
   * 四個方向同一套按壓規則:
   *   放開前沒超過 0.25 秒 → 短按;超過 0.25 秒後移動超過 10px → 拖曳(交給 Canvas 落點);
   *   ↑ 維持既有行為:0.25 秒一到就進拖曳(不必先移動);↓ 長按 1 秒不動 → 多胞胎。
   */
  const onPointerDown = (dir: ArrowDir) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    const downEvt = e;
    let armed = false; // 已超過 0.25 秒
    let done = false; // 已進入拖曳 / 多胞胎,之後不再做短按
    let moved = false;
    const cleanup = () => {
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointermove', onMove);
      window.clearTimeout(armTimer);
      window.clearTimeout(twinsTimer);
    };
    const startDrag = () => {
      done = true;
      cleanup();
      onArrowDrag?.(person.id, dir, downEvt);
    };
    const armTimer = window.setTimeout(() => {
      armed = true;
      if (dir === 'up' && !moved) startDrag();
    }, LONG_PRESS_MS);
    const twinsTimer = window.setTimeout(() => {
      if (dir === 'down' && !moved && !done) {
        done = true;
        cleanup();
        onDownLongPress?.(person.id);
      }
    }, TWINS_MS);
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId || done) return;
      if (Math.abs(ev.clientX - startX) > MOVE_TOLERANCE || Math.abs(ev.clientY - startY) > MOVE_TOLERANCE) {
        moved = true;
        if (armed) startDrag();
        else cleanup(); // 0.25 秒內就拖走 = 不是按箭頭,放掉
      }
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      cleanup();
      if (!done && !moved) shortAction(dir);
    };
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointermove', onMove);
  };

  return (
    <g transform={`translate(${person.position.x}, ${person.position.y})`}>
      {dirs.map((dir) => {
        if (dir === 'left' && leftFull) return null;
        if (dir === 'right' && rightFull) return null;
        const [dx, dy] = dirOffset(dir);
        const dim = dir === 'up' && hasParents;
        return (
          <g
            key={dir}
            data-arrow={dir}
            transform={`translate(${dx}, ${dy})`}
            onPointerDown={onPointerDown(dir)}
            style={{ cursor: dim ? 'crosshair' : 'pointer' }}
          >
            <title>
              {dir === 'up'
                ? t(hasParents ? 'arrow.upTitleHasParents' : 'arrow.upTitle')
                : dir === 'down'
                  ? t('arrow.downTitle')
                  : t('arrow.sideTitle')}
            </title>
            <circle r={ARROW_SIZE + 4} fill="#ffffff" fillOpacity={0.01} />
            <polygon points={trianglePoints(dir)} fill="#007aff" opacity={dim ? 0.5 : 0.85} />
          </g>
        );
      })}
    </g>
  );
}
