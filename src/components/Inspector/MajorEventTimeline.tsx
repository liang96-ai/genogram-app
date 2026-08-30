import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import type { MajorEvent } from '../../types/genogram';
import { isRenderableEvent } from '../../services/majorEvents';

// 重大事件時間軸(2026-08-27 決議 Q12-C;2026-08-30 依獨立審查補強)。
//
// 三個設計約束,改這個檔前先讀:
//  1. 文字欄位(標題/描述)不逐鍵寫 store —— 失焦 / 停手 0.8 秒 / 卸載 / 分頁隱藏
//     四個時機才 commit。逐鍵寫會把 20 格復原一次吃光(批次三修過的老毛病)。
//     但「只靠失焦」會在 F5 或關分頁時把草稿蒸發掉,所以另外三個時機是保險。
//  2. 日期欄是 <input type="date">,每按一個數字鍵就發一次 change —— store 的
//     updateMajorEvent 已接打字合併窗('event' kind),這裡不必再防。
//  3. 卡片要能擋住「畫布拖曳造成的全表重繪」:EventCard 用 memo,人物清單用
//     簽章 memo(只有 id/姓名 變才重算),所以拖人物不會重畫 50 張卡。

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

/** 停手多久就把草稿寫進 store(關分頁 / F5 最多丟這麼久的字)*/
const DRAFT_IDLE_MS = 800;

type PersonLite = { id: string; name: string };

export default function MajorEventTimeline() {
  const t = useT();
  // 只訂閱需要的兩塊:majorEvents / persons 的陣列身分只在它們真的變時才換,
  // 訂閱整個 currentCase 會讓「拖曳人物」也重繪整條時間軸
  const events = useGenogramStore((s) => s.currentCase?.majorEvents);
  const persons = useGenogramStore((s) => s.currentCase?.persons);
  const updateMajorEvent = useGenogramStore((s) => s.updateMajorEvent);
  const removeMajorEvent = useGenogramStore((s) => s.removeMajorEvent);

  // 人物清單:只取 id 與姓名。拖曳只改 position,簽章不變 → 卡片不重繪
  const personSig = (persons ?? [])
    .map((p) => `${p.id}:${p.basicInfo?.name ?? ''}`)
    .join('|');
  const people: PersonLite[] = useMemo(
    () =>
      (persons ?? []).map((p) => ({
        id: p.id,
        name: p.basicInfo?.name?.trim() ?? '',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [personSig],
  );

  const patchEvent = useCallback(
    (id: string, patch: Partial<MajorEvent>) => {
      // 卸載 / 延遲結算可能在切換個案之後才跑:事件已不在當前個案就放棄,
      // 否則 updateMajorEvent 的 no-op map 仍會 touch + 推歷史到錯的個案
      const cc = useGenogramStore.getState().currentCase;
      if (cc?.majorEvents?.some((e) => e.id === id)) updateMajorEvent(id, patch);
    },
    [updateMajorEvent],
  );

  const sorted = useMemo(() => {
    const safe = (events ?? []).filter(isRenderableEvent);
    // 時間軸由舊到新;同日維持建立順序(sort 穩定)
    return safe
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [events]);

  if (sorted.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#86868b', padding: 4 }}>
        {t('tab4.eventsEmpty')}
      </div>
    );
  }

  return (
    <div>
      {sorted.map((ev, i) => (
        <EventCard
          key={ev.id}
          event={ev}
          people={people}
          isLast={i === sorted.length - 1}
          onPatch={patchEvent}
          onDelete={removeMajorEvent}
        />
      ))}
    </div>
  );
}

const EventCard = memo(function EventCard({
  event,
  people,
  isLast,
  onPatch,
  onDelete,
}: {
  event: MajorEvent;
  people: PersonLite[];
  isLast: boolean;
  onPatch: (id: string, patch: Partial<MajorEvent>) => void;
  onDelete: (id: string) => void;
}) {
  const t = useT();
  const [title, setTitle] = useState(event.title);
  const [desc, setDesc] = useState(event.description ?? '');
  const [peopleOpen, setPeopleOpen] = useState(false);
  // undo/redo 或匯入把 store 改回去時,草稿要跟上(render 期間調整,不走 effect)
  const [seen, setSeen] = useState({
    title: event.title,
    desc: event.description ?? '',
  });
  if (seen.title !== event.title || seen.desc !== (event.description ?? '')) {
    setSeen({ title: event.title, desc: event.description ?? '' });
    if (seen.title !== event.title) setTitle(event.title);
    if (seen.desc !== (event.description ?? '')) setDesc(event.description ?? '');
  }

  // 草稿結算:四個時機共用同一段邏輯,值從 ref 取(才拿得到最新的)
  const draftRef = useRef({ title, desc, event, onPatch });
  useEffect(() => {
    draftRef.current = { title, desc, event, onPatch };
  }, [title, desc, event, onPatch]);

  const commitDraft = useCallback(() => {
    const d = draftRef.current;
    const patch: Partial<MajorEvent> = {};
    if (d.title !== d.event.title) patch.title = d.title;
    if (d.desc !== (d.event.description ?? ''))
      patch.description = d.desc || undefined;
    if (Object.keys(patch).length > 0) d.onPatch(d.event.id, patch);
  }, []);

  // ① 停手 0.8 秒就結算 —— F5 / 關分頁最多丟 0.8 秒的字
  //    (store 的合併窗是 0.9 秒,所以連續打字仍然只吃一格復原)
  useEffect(() => {
    const dirty =
      title !== event.title || desc !== (event.description ?? '');
    if (!dirty) return;
    const id = window.setTimeout(commitDraft, DRAFT_IDLE_MS);
    return () => window.clearTimeout(id);
  }, [title, desc, event.title, event.description, commitDraft]);

  // ② 分頁被隱藏(切換分頁 / 關閉 / 手機切到背景)—— 比 pagehide 早發,
  //    結算後 App 的 pagehide 存檔才抓得到這筆
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') commitDraft();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [commitDraft]);

  // ③ 元件卸載(切分頁 / 收 Inspector / 換個案)
  useEffect(() => () => commitDraft(), [commitDraft]);

  const related = event.relatedPersonIds ?? [];
  const dot = DOT_COLOR[event.type ?? ''] ?? '#86868b';
  const typeLabel = (v: string) =>
    (EVENT_TYPES as readonly string[]).includes(v) ? t(`evType.${v}`) : v;
  const togglePerson = (pid: string) =>
    onPatch(event.id, {
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
              if (e.target.value) onPatch(event.id, { date: e.target.value });
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
              onPatch(event.id, { type: e.target.value || undefined });
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
            onClick={() => onDelete(event.id)}
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
          onBlur={commitDraft}
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
          onBlur={commitDraft}
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
            ? people
            : people.filter((p) => related.includes(p.id))
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
                {p.name || t('unit.unnamed')}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
