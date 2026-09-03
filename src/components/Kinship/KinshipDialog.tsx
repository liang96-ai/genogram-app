import { useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import { useT } from '../../i18n';
import {
  buildDiagram,
  describePath,
  lookup,
  MAX_DEPTH,
  STEPS,
  TANG_BIAO_RULE,
  type DiagramNode,
  type Step,
} from '../../services/kinship';

/**
 * 「族譜」—— 中文稱謂查詢。
 *
 * 心智模型是「畫圖」不是「算式」:每按一個稱謂,右邊的迷你家系圖就長出一個人,
 * 每個人身上掛著他**相對於我**的稱謂(我 → 爸爸 → 爺爺),所以圖本身就在教人。
 *
 * 邊界(刻意的):
 *  - 純查詢,完全不碰畫布 / 個案資料 / store —— 關掉視窗什麼都不會留下
 *  - 稱謂是查表不是推導;查不到就誠實說沒有專門稱謂,不硬掰
 */
export default function KinshipDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [path, setPath] = useState<Step[]>([]);

  const diagram = useMemo(() => buildDiagram(path), [path]);
  const term = useMemo(() => lookup(path), [path]);
  const atLimit = path.length >= MAX_DEPTH;

  const push = (s: Step) => {
    if (atLimit) return;
    setPath((p) => [...p, s]);
  };

  return (
    <Modal
      onClose={onClose}
      bare
      cardStyle={{
        width: 680,
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 40px)',
        background: '#ffffff',
        borderRadius: 14,
        boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'inherit',
      }}
      overlayStyle={{ background: 'rgba(0,0,0,0.5)' }}
    >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 6px',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f' }}>
            👨‍👩‍👧 {t('kinship.title')}
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            style={{
              width: 28,
              height: 28,
              border: 'none',
              background: '#f5f5f7',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 15,
              color: '#1d1d1f',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '0 20px', overflowY: 'auto', flex: 1 }}>
          <div style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.6 }}>
            {t('kinship.desc')}
          </div>

          {/* ── 目前這句話 ── */}
          <div
            style={{
              marginTop: 12,
              padding: '9px 12px',
              background: '#f5f5f7',
              borderRadius: 8,
              fontSize: 14,
              color: '#1d1d1f',
              minHeight: 20,
            }}
          >
            {describePath(path)}
          </div>

          {/* ── 主體:左邊按鈕、右邊圖 ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 0.8fr) minmax(0, 1.2fr)',
              gap: 14,
              marginTop: 12,
              alignItems: 'start',
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: '#86868b', marginBottom: 6 }}>
                {atLimit ? t('kinship.limit') : t('kinship.nextStep')}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 6,
                }}
              >
                {STEPS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => push(s.key)}
                    disabled={atLimit}
                    style={{
                      padding: '9px 0',
                      fontSize: 14,
                      background: '#ffffff',
                      border: '1px solid #d2d2d7',
                      borderRadius: 8,
                      cursor: atLimit ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      color: '#1d1d1f',
                      opacity: atLimit ? 0.4 : 1,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* 倒回 / 歸零 */}
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button
                  onClick={() => setPath((p) => p.slice(0, -1))}
                  disabled={path.length === 0}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    fontSize: 13,
                    background: '#ffffff',
                    border: '1px solid #d2d2d7',
                    borderRadius: 8,
                    cursor: path.length ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                    color: '#1d1d1f',
                    opacity: path.length ? 1 : 0.4,
                  }}
                >
                  ↩ {t('kinship.back')}
                </button>
                <button
                  onClick={() => setPath([])}
                  disabled={path.length === 0}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    fontSize: 13,
                    background: '#ffffff',
                    border: '1px solid #d2d2d7',
                    borderRadius: 8,
                    cursor: path.length ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                    color: '#1d1d1f',
                    opacity: path.length ? 1 : 0.4,
                  }}
                >
                  ⟲ {t('kinship.reset')}
                </button>
              </div>
            </div>

            {/* 迷你家系圖 */}
            <div
              style={{
                background: '#fafafa',
                border: '1px solid #e5e4e7',
                borderRadius: 10,
                padding: 8,
                minHeight: 190,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MiniGenogram
                nodes={diagram.nodes}
                edges={diagram.edges}
                targetId={diagram.targetId}
              />
            </div>
          </div>

          {/* ── 答案 ── */}
          <div
            style={{
              marginTop: 14,
              marginBottom: 4,
              padding: '14px 16px',
              border: '1px solid #e5e4e7',
              borderRadius: 10,
              textAlign: 'center',
            }}
          >
            {path.length === 0 ? (
              <div style={{ fontSize: 13, color: '#86868b', padding: '8px 0' }}>
                {t('kinship.start')}
              </div>
            ) : term ? (
              <>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 600,
                    color: '#1d1d1f',
                    letterSpacing: 1,
                  }}
                >
                  {term.term}
                </div>
                {term.alt?.length ? (
                  <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 3 }}>
                    {t('kinship.alsoCalled')}:{term.alt.join(' · ')}
                  </div>
                ) : null}
                {term.ambiguous ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: '#a45700',
                      background: '#fff3e0',
                      borderRadius: 6,
                      padding: '7px 10px',
                      marginTop: 10,
                      lineHeight: 1.7,
                    }}
                  >
                    ⚠️ {term.ambiguous}
                  </div>
                ) : null}
                {term.note ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: '#6e6e73',
                      marginTop: 10,
                      lineHeight: 1.8,
                      textAlign: 'left',
                    }}
                  >
                    {term.note}
                  </div>
                ) : null}
              </>
            ) : (
              <div style={{ padding: '4px 0' }}>
                <div style={{ fontSize: 17, fontWeight: 500, color: '#6e6e73' }}>
                  {t('kinship.noTerm')}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#86868b',
                    marginTop: 6,
                    lineHeight: 1.7,
                  }}
                >
                  {t('kinship.noTermHint')}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: 11,
              color: '#86868b',
              lineHeight: 1.8,
              padding: '4px 0 14px',
            }}
          >
            {/* 答案裡已經講過堂表規則時就不重複(例:查堂哥)*/}
            {term?.note === TANG_BIAO_RULE ? null : (
              <>
                💡 {TANG_BIAO_RULE}
                <br />
              </>
            )}
            {t('kinship.disclaimer')}
          </div>
        </div>
    </Modal>
  );
}

// ==================== 迷你家系圖 ====================

// ⚠️ 這三個常數直接決定名牌看不看得清楚。
// SVG 是「整張圖等比縮到容器寬」,所以圖越寬 → 縮得越小 → 11px 的字可能只剩 8px。
// 把格距壓小 = 圖變窄 = 縮放接近 1 = 字維持該有的大小。
const CELL_W = 62;
const ROW_H = 66;
const HALF = 15;
const LABEL_SIZE = 13;

function MiniGenogram({
  nodes,
  edges,
  targetId,
}: {
  nodes: DiagramNode[];
  edges: ReturnType<typeof buildDiagram>['edges'];
  targetId: string;
}) {
  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const n of nodes) m.set(n.id, { x: n.col * CELL_W, y: n.gen * ROW_H });
    return m;
  }, [nodes]);

  const xs = nodes.map((n) => pos.get(n.id)!.x);
  const ys = nodes.map((n) => pos.get(n.id)!.y);
  const padX = 34;
  const padTop = 24;
  const padBottom = 28;
  const minX = Math.min(...xs) - padX;
  const maxX = Math.max(...xs) + padX;
  const minY = Math.min(...ys) - padTop;
  const maxY = Math.max(...ys) + padBottom;
  const w = maxX - minX;
  const h = maxY - minY;

  const P = (id: string) => pos.get(id)!;

  return (
    <svg
      viewBox={`${minX} ${minY} ${w} ${h}`}
      style={{ width: '100%', height: 'auto', maxHeight: 260 }}
      role="img"
      aria-label="關係圖"
    >
      <g stroke="#1d1d1f" strokeWidth={1.4} fill="none">
        {edges.map((e, i) => {
          if (e.kind === 'marriage') {
            const a = P(e.a);
            const b = P(e.b);
            const left = a.x < b.x ? a : b;
            const right = a.x < b.x ? b : a;
            return (
              <line
                key={i}
                x1={left.x + HALF}
                y1={left.y}
                x2={right.x - HALF}
                y2={right.y}
              />
            );
          }
          const child = P(e.child);
          const ps = e.parents.map(P);
          const midX =
            ps.length > 1 ? (ps[0].x + ps[1].x) / 2 : ps[0].x;
          const parentY = ps[0].y;
          const trunkY = parentY + ROW_H / 2;
          return (
            <path
              key={i}
              d={`M ${midX} ${parentY + (ps.length > 1 ? 0 : HALF)} V ${trunkY} H ${child.x} V ${child.y - HALF}`}
            />
          );
        })}
      </g>

      {nodes.map((n) => {
        const p = P(n.id);
        const isTarget = n.id === targetId;
        const isSelf = n.role === 'self';
        const dim = n.role === 'implied';
        const stroke = isTarget ? '#007aff' : '#1d1d1f';
        const sw = isTarget ? 2.4 : 1.4;
        return (
          <g key={n.id} opacity={dim ? 0.5 : 1}>
            {n.gender === 'male' ? (
              <rect
                x={p.x - HALF}
                y={p.y - HALF}
                width={HALF * 2}
                height={HALF * 2}
                fill={isSelf ? '#1d1d1f' : '#ffffff'}
                stroke={stroke}
                strokeWidth={sw}
              />
            ) : (
              <circle
                cx={p.x}
                cy={p.y}
                r={HALF}
                fill={isSelf ? '#1d1d1f' : '#ffffff'}
                stroke={stroke}
                strokeWidth={sw}
              />
            )}
            <text
              x={p.x}
              y={p.y + HALF + 15}
              textAnchor="middle"
              fontSize={LABEL_SIZE}
              fontWeight={isTarget ? 600 : 400}
              fill={isTarget ? '#007aff' : '#6e6e73'}
              /* 白色描邊:親子線會從人物正下方穿過名牌,不描邊的話字會被線劃掉 */
              stroke="#fafafa"
              strokeWidth={3}
              paintOrder="stroke"
              style={{ fontFamily: 'inherit' }}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
