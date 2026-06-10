import { useEffect, useRef, useState } from 'react';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import Tab1Basic from './Tab1Basic';
import Tab2Network from './Tab2Network';
import Tab3Medical from './Tab3Medical';
import Tab4Custom from './Tab4Custom';

type TabKey = 'basic' | 'network' | 'medical' | 'custom';

// label 改成 i18n key,渲染時呼叫 t()
const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'basic', labelKey: 'tab.basic' },
  { key: 'network', labelKey: 'tab.network' },
  { key: 'medical', labelKey: 'tab.medical' },
  { key: 'custom', labelKey: 'tab.custom' },
];

const LONG_PRESS_MS = 200;

export default function Inspector() {
  const trans = useT();
  const currentCase = useGenogramStore((s) => s.currentCase);
  const inspectorTarget = useGenogramStore((s) => s.inspectorTarget);
  const inspectorSide = useGenogramStore((s) => s.inspectorSide);
  const inspectorCollapsed = useGenogramStore((s) => s.inspectorCollapsed);
  const toggleInspectorSide = useGenogramStore((s) => s.toggleInspectorSide);
  const toggleInspectorCollapsed = useGenogramStore(
    (s) => s.toggleInspectorCollapsed,
  );
  const setInspectorTarget = useGenogramStore((s) => s.setInspectorTarget);

  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  // 記住「人物模式」上次停在哪個 tab(只可能是 Tab1 或 Tab3)
  // 切人物時會 restore 到這個 — 在 Tab2/Tab4 看資料不會卡住
  const [personTab, setPersonTab] = useState<'basic' | 'medical'>('basic');
  const [pressing, setPressing] = useState(false);
  const [dragReadyUI, setDragReadyUI] = useState(false);
  const dragReadyRef = useRef(false);
  const pressTimer = useRef<number | null>(null);

  const line =
    inspectorTarget?.type === 'line'
      ? currentCase?.lines.find((l) => l.id === inspectorTarget.id)
      : null;
  const targetPerson =
    inspectorTarget?.type === 'person'
      ? currentCase?.persons.find((p) => p.id === inspectorTarget.id)
      : null;
  // person 永遠有 fallback (即使有 line,Tab 仍需 person 作為上下文)
  // 修:選中線條時用線條 from 端的人物當 fallback,
  // 避免 Tab2「關係線全選保密」過濾到 persons[0] (跟選中線無關的人)導致 disabled
  const lineFallbackPerson = line
    ? currentCase?.persons.find((p) => p.id === line.fromPersonId)
    : null;
  const person =
    targetPerson ?? lineFallbackPerson ?? currentCase?.persons[0];

  const selectedConnector = useGenogramStore((s) => s.selectedConnector);

  // v1.1: 選中任何線(member 或 relation)都自動切到 Tab2
  //   - relation:可在 Tab2 改關係線類型
  //   - member:可在 Tab2「常用線條 → 婚姻線」section 改類型
  useEffect(() => {
    if (line) setActiveTab('network');
  }, [line?.id, line?.category]);  // eslint-disable-line react-hooks/exhaustive-deps

  // 選中 connector 時自動切到 Tab2(關係按鈕在這)
  useEffect(() => {
    if (selectedConnector) setActiveTab('network');
  }, [selectedConnector]);

  // 選中機構時自動切到網絡關係 Tab(機構主要資料在 Tab2)
  useEffect(() => {
    if (targetPerson?.shape === 'institution') setActiveTab('network');
  }, [targetPerson?.id, targetPerson?.shape]);

  // 選中普通人物時 → 切到記住的 personTab(Tab1 或 Tab3)
  // 不會卡在 Tab2(網絡/事件)或 Tab4(附件),那兩個是個案級別
  useEffect(() => {
    if (targetPerson && targetPerson.shape !== 'institution' && !line) {
      setActiveTab(personTab);
    }
  }, [targetPerson?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (inspectorCollapsed) {
    const chevron = inspectorSide === 'right' ? '‹' : '›';
    return (
      <button
        onClick={toggleInspectorCollapsed}
        title="展開面板"
        style={{
          position: 'absolute',
          top: '50%',
          [inspectorSide]: 0,
          transform: 'translateY(-50%)',
          width: 24,
          height: 64,
          background: '#ffffff',
          border: '1px solid #e5e4e7',
          borderRadius:
            inspectorSide === 'right' ? '4px 0 0 4px' : '0 4px 4px 0',
          cursor: 'pointer',
          fontSize: 16,
          color: '#007aff',
          zIndex: 20,
          fontFamily: 'inherit',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {chevron}
      </button>
    );
  }

  const resetPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    dragReadyRef.current = false;
    setDragReadyUI(false);
    setPressing(false);
  };

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture 偶發失敗(元素已卸載等)可忽略
    }
    setPressing(true);
    pressTimer.current = window.setTimeout(() => {
      dragReadyRef.current = true;
      setDragReadyUI(true);
    }, LONG_PRESS_MS);
  };

  const onHeaderPointerUp = (e: React.PointerEvent) => {
    if (dragReadyRef.current) {
      const vw = window.innerWidth;
      const targetSide = e.clientX < vw / 2 ? 'left' : 'right';
      if (targetSide !== inspectorSide) toggleInspectorSide();
    }
    resetPress();
  };

  const collapseArrowSide = inspectorSide === 'right' ? 'left' : 'right';
  const collapseArrowSymbol = inspectorSide === 'right' ? '›' : '‹';

  const headerBg = dragReadyUI
    ? '#007aff'
    : pressing
      ? '#c7e0ff'
      : '#ececee';
  const headerDotColor = dragReadyUI ? '#ffffff' : '#8e8e93';

  return (
    <aside
      style={{
        width: 420,
        height: '100%',
        background: '#fafafa',
        borderLeft:
          inspectorSide === 'right' ? '1px solid #e5e4e7' : undefined,
        borderRight:
          inspectorSide === 'left' ? '1px solid #e5e4e7' : undefined,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        order: inspectorSide === 'left' ? -1 : 1,
        boxShadow:
          inspectorSide === 'right'
            ? '-2px 0 8px rgba(0,0,0,0.04)'
            : '2px 0 8px rgba(0,0,0,0.04)',
        opacity: dragReadyUI ? 0.8 : 1,
        transition: 'opacity 0.15s',
        position: 'relative',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={resetPress}
        title="長按拖曳切換左/右側"
        style={{
          height: 22,
          background: headerBg,
          borderBottom: '1px solid #e5e4e7',
          cursor: dragReadyUI ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          userSelect: 'none',
          touchAction: 'none',
          transition: 'background 0.1s',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 2,
              background: headerDotColor,
              borderRadius: 1,
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #e5e4e7',
          background: '#ffffff',
        }}
      >
        {TABS.map((tab) => {
          const disabled = false;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                setActiveTab(tab.key);
                // 手動切到 Tab1 或 Tab3(且當前是普通人物)→ 記住為「人物 mode 預設 tab」
                if (
                  (tab.key === 'basic' || tab.key === 'medical') &&
                  targetPerson &&
                  targetPerson.shape !== 'institution'
                ) {
                  setPersonTab(tab.key);
                }
                // 點非 network 的 Tab 時清掉 line target (切回人物視圖)
                // network 不清,因為 network Tab 頂部會顯示線條屬性
                if (
                  inspectorTarget?.type === 'line' &&
                  tab.key !== 'network'
                ) {
                  setInspectorTarget(null);
                }
              }}
              title={disabled ? '尚未開放' : trans(tab.labelKey)}
              style={{
                flex: 1,
                padding: '10px 4px',
                fontSize: 12,
                background: active ? '#fafafa' : '#ffffff',
                border: 'none',
                borderBottom: active ? '2px solid #007aff' : 'none',
                color: disabled
                  ? '#c7c7cc'
                  : active
                    ? '#007aff'
                    : '#86868b',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                fontWeight: active ? 600 : 400,
              }}
            >
              {trans(tab.labelKey)}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {person && activeTab === 'basic' && <Tab1Basic person={person} />}
        {person && activeTab === 'network' && (
          <Tab2Network
            person={person}
            // v1.1: 傳所有 line(member + relation),Tab2 內部用 category 分流:
            //   - relation line + 關係線按鈕 → 改類型/翻轉
            //   - member line + 婚姻線按鈕 → 改類型
            //   - member line + 關係線按鈕 → 擋住(在 Tab2 內 onPickRelation 已過濾 memberLineSelected)
            //   - relation line + 婚姻線按鈕 → 擋住(在 Tab2 內 onPickMember 已過濾)
            lineTarget={line ?? null}
          />
        )}
        {person && activeTab === 'medical' && <Tab3Medical person={person} />}
        {activeTab === 'custom' && <Tab4Custom />}
        {!person && <EmptyCasePlaceholder />}
      </div>

      <button
        onClick={toggleInspectorCollapsed}
        title="收合面板"
        style={{
          position: 'absolute',
          top: '50%',
          [collapseArrowSide]: -12,
          transform: 'translateY(-50%)',
          width: 24,
          height: 48,
          background: '#ffffff',
          border: '1px solid #e5e4e7',
          borderRadius:
            collapseArrowSide === 'left' ? '4px 0 0 4px' : '0 4px 4px 0',
          cursor: 'pointer',
          fontSize: 14,
          color: '#007aff',
          fontFamily: 'inherit',
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          zIndex: 5,
        }}
      >
        {collapseArrowSymbol}
      </button>
    </aside>
  );
}

function EmptyCasePlaceholder() {
  const addPersonAtCenter = useGenogramStore((s) => s.addPersonAtCenter);
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ color: '#86868b', fontSize: 13, marginBottom: 16 }}>
        尚未有人物
      </div>
      <button
        onClick={() => addPersonAtCenter(480, 360)}
        style={{
          padding: '8px 16px',
          fontSize: 13,
          background: '#007aff',
          color: '#ffffff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        新增第一個人物
      </button>
    </div>
  );
}
