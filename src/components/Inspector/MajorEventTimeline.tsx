import { useEffect, useRef, useState } from 'react';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import type { MajorEvent } from '../../types/genogram';

// 重大事件時間軸(2026-08-27 決議 Q12-C)。
//
// 文字欄位(標題/描述)只在失焦時寫入 store:updateMajorEvent 每呼叫必推一格
// 歷史,若跟著 onChange 打,每個鍵都吃一格復原 —— 這是批次三剛替人物欄位
// 修掉的老毛病,新元件不准重新引進。日期/類型/人物勾選是離散選擇,直接寫。

/** type 的固定選項;儲存穩定 key,顯示走 i18n(evType.*)。 */
const EVENT_TYPES = [
  'marriage',
  'divorce',
  'birth',
  'death',
  'school',
  'job',
  'move',
  'illness',
  'trauma',
  'other',
] as const;

/** 時間軸圓點顏色:喜事綠、變故紅、遷轉橘、其餘藍。 */
const DOT_COLOR: Record<string, string> = {
  marriage: '#34c759',
  birth: '#34c759',
  death: '#ff3b30',
  illness: '#ff3b30',
  trauma: '#ff3b30',
  divorce: '#ff9500',
  move: '#ff9500',
  school: '#007aff',
  job: '#007aff',
  other: '#86868b',
};

export default function MajorEventTimeline() {
  const t = useT();
  const currentCase = useGenogramStore((s) => s.currentCase);
  const updateMajorEvent = useGenogramStore((s) => s.updateMajorEvent);
  const removeMajorEvent = useGenogramStore((s) => s.removeMajorEvent);

  if (!currentCase) return null;
  const events = currentCase.majorEvents ?? [];

  if (events.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#86868b', padding: 4 }}>
        {t('tab4.eventsEmpty')}
      </div>
    );
  }

  // 時間軸由舊到新;同日維持建立順序
  const sorted = events
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return (
    <div>
      {sorted.map((ev, i) => (
        <EventCard
          key={ev.id}
          event={ev}
          persons={currentCase.persons}
          isLast={i === sorted.length - 1}
          onPatch={(patch) => {
            // 卸載結算可能在切換個案之後才跑:事件已不在當前個案就放棄,
            // 否則 updateMajorEvent 的 no-op map 仍會 touch + 推歷史到錯的個案
            const cc = useGenogramStore.getState().currentCase;
            if (cc?.majorEvents?.some((e) => e.id === ev.id)) {
              updateMajorEvent(ev.id, patch);
            }
          }}
          onDelete={() => removeMajorEvent(ev.id)}
        />
      ))}
    </div>
  );
}

function EventCard({
  event,
  persons,
  isLast,
  onPatch,
  onDelete,
}: {
  event: MajorEvent;
  persons: { id: string; basicInfo?: { name?: string } }[];
  isLast: boolean;
  onPatch: (patch: Partial<MajorEvent>) => void;
  onDelete: () => void;
}) {
  const t = useT();
  // 文字欄位的本機草稿:onChange 進草稿,onBlur 才 commit(見檔頭)
  const [title, setTitle] = useState(event.title);
  const [desc, setDesc] = useState(event.description ?? '');
  const [peopleOpen, setPeopleOpen] = useState(false);
  // undo/redo 或匯入把 store 改回去時,草稿要跟上(render 期間調整,不走 effect)
  const [seen, setSeen] = useState({ title: event.title, desc: event.description ?? '' });
  if (seen.title !== event.title || seen.desc !== (event.description ?? '')) {
    setSeen({ title: event.title, desc: event.description ?? '' });
    if (seen.title !== event.title) setTitle(event.title);
    if (seen.desc !== (event.description ?? '')) setDesc(event.description ?? '');
  }

  // 破口:打完字直接切分頁/關 Inspector → 元件卸載,onBlur 永遠不發,草稿丟失。
  // 卸載時結算一次;ref 保最新值,effect 只在 mount/unmount 跑一次。
  const draftRef = useRef({ title, desc, event, onPatch });
  useEffect(() => {
    draftRef.current = { title, desc, event, onPatch };
  });
  useEffect(
    () => () => {
      const d = draftRef.current;
      const patch: Partial<MajorEvent> = {};
      if (d.title !== d.event.title) patch.title = d.title;
      if (d.desc !== (d.event.description ?? ''))
        patch.description = d.desc || undefined;
      if (Object.keys(patch).length > 0) d.onPatch(patch);
    },
    [],
  );

  const related = event.relatedPersonIds ?? [];
  const dot = DOT_COLOR[event.type ?? ''] ?? '#86868b';
  const typeLabel = (v: string) =>
    (EVENT_TYPES as readonly string[]).includes(v) ? t(`evType.${v}`) : v;
  const nameOf = (p: { basicInfo?: { name?: string } }) =>
    p.basicInfo?.name?.trim() || t('unit.unnamed');
  const togglePerson = (pid: string) =>
    onPatch({
      relatedPersonIds: related.includes(pid)
        ? related.filter((x) => x !== pid)
        : [...related, pid],
    });

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {/* 左軌:圓點 + 縱線 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 10,
          paddingTop: 14,
        }}
      >
        <div
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: dot,
            flexShrink: 0,
          }}
        />
        {!isLast && (
          <div style={{ width: 2, flex: 1, background: '#e5e4e7', marginTop: 3 }} />
        )}
      </div>

      {/* 卡片 */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          marginBottom: 10,
          padding: 10,
          border: '1px solid #e5e4e7',
          borderRadius: 6,
          background: '#fafafa',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6,
            flexWrap: 'wrap',
          }}
        >
          <input
            type="date"
            value={event.date}
            onChange={(e) => {
              if (e.target.value) onPatch({ date: e.target.value });
            }}
            style={{
              fontSize: 12,
              padding: '3px 6px',
              border: '1px solid #d2d2d7',
              borderRadius: 4,
              fontFamily: 'inherit',
            }}
          />
          <select
            value={
              (EVENT_TYPES as readonly string[]).includes(event.type ?? '')
                ? event.type
                : event.type
                  ? '__raw__'
                  : ''
            }
            onChange={(e) => {
              if (e.target.value === '__raw__') return;
              // 選回「類型…」= 清空類型(審查觀察:設了不能清會卡死使用者)
              onPatch({ type: e.target.value || undefined });
            }}
            style={{
              fontSize: 12,
              padding: '3px 4px',
              border: '1px solid #d2d2d7',
              borderRadius: 4,
              fontFamily: 'inherit',
              background: '#fff',
              maxWidth: 110,
            }}
          >
            <option value="">{t('tab4.eventTypeNone')}</option>
            {event.type && !(EVENT_TYPES as readonly string[]).includes(event.type) && (
              <option value="__raw__">{typeLabel(event.type)}</option>
            )}
            {EVENT_TYPES.map((k) => (
              <option key={k} value={k}>
                {t(`evType.${k}`)}
              </option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          <button
            onClick={onDelete}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ff3b30',
              cursor: 'pointer',
              fontSize: 14,
              padding: 4,
            }}
            title={t('tab4.deleteEvent')}
          >
            ×
          </button>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title !== event.title) onPatch({ title });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          placeholder={t('tab4.eventTitlePlaceholder')}
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: 13,
            fontWeight: 500,
            border: '1px solid #d2d2d7',
            borderRadius: 4,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            background: '#fff',
            marginBottom: 6,
          }}
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => {
            if (desc !== (event.description ?? ''))
              onPatch({ description: desc || undefined });
          }}
          placeholder={t('tab4.eventDescPlaceholder')}
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: 12.5,
            border: '1px solid #d2d2d7',
            borderRadius: 4,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            background: '#fff',
            minHeight: 40,
            resize: 'vertical',
          }}
        />

        {/* 牽涉人物:收合時只列已勾的;展開變成全員切換 chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            marginTop: 6,
          }}
        >
          <button
            onClick={() => setPeopleOpen((v) => !v)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#007aff',
              cursor: 'pointer',
              fontSize: 11.5,
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            {peopleOpen ? '▾' : '▸'} {t('tab4.eventRelated')}
            {related.length > 0 ? ` (${related.length})` : ''}
          </button>
          {(peopleOpen
            ? persons
            : persons.filter((p) => related.includes(p.id))
          ).map((p) => {
            const on = related.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => (peopleOpen ? togglePerson(p.id) : setPeopleOpen(true))}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 9,
                  border: `1px solid ${on ? '#007aff' : '#d2d2d7'}`,
                  background: on ? '#eaf3ff' : '#fff',
                  color: on ? '#007aff' : '#6e6e73',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {nameOf(p)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
