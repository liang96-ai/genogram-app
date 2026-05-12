import { useEffect, useRef, useState } from 'react';
import Canvas from './components/Canvas/Canvas';
import ViewToolbar from './components/Canvas/ViewToolbar';
import Inspector from './components/Inspector/Inspector';
import ConfirmDialog from './components/ConfirmDialog';
import HoverTooltip from './components/HoverTooltip';
import SymbolGallery from './components/Gallery/SymbolGallery';
import CaseList from './components/CaseList/CaseList';
import {
  ExportDialog,
  ImportDialog,
} from './components/CaseList/ExportImportDialog';
import Tutorial, {
  hasTutorialBeenSeen,
} from './components/Tutorial/Tutorial';
import ScaleDialog from './components/Scales/ScaleDialog';
import InstallBanner from './components/InstallBanner';
import { useT } from './i18n';
import {
  getScale,
  getScalesByCategory,
} from './components/Scales/registry';
import { db } from './services/database';
import { useGenogramStore } from './store/genogramStore';

export default function App() {
  const appMode = useGenogramStore((s) => s.appMode);
  const loadCaseList = useGenogramStore((s) => s.loadCaseList);
  const goToList = useGenogramStore((s) => s.goToList);
  const renameCase = useGenogramStore((s) => s.renameCase);
  const showTutorial = useGenogramStore((s) => s.showTutorial);
  const setShowTutorial = useGenogramStore((s) => s.setShowTutorial);
  const showTutorialAdvanced = useGenogramStore((s) => s.showTutorialAdvanced);
  const setShowTutorialAdvanced = useGenogramStore(
    (s) => s.setShowTutorialAdvanced,
  );
  const currentCase = useGenogramStore((s) => s.currentCase);
  const selectedPersonIds = useGenogramStore((s) => s.selectedPersonIds);
  const selectedLineIds = useGenogramStore((s) => s.selectedLineIds);
  const selectedUnitIds = useGenogramStore((s) => s.selectedUnitIds);
  const selectedEcosystemId = useGenogramStore((s) => s.selectedEcosystemId);
  const removePersons = useGenogramStore((s) => s.removePersons);
  const removeLine = useGenogramStore((s) => s.removeLine);
  const removeNetworkUnit = useGenogramStore((s) => s.removeNetworkUnit);
  const removeEcosystem = useGenogramStore((s) => s.removeEcosystem);
  const showConfirm = useGenogramStore((s) => s.showConfirm);
  const undo = useGenogramStore((s) => s.undo);
  const redo = useGenogramStore((s) => s.redo);
  const loadInstitutionHistory = useGenogramStore(
    (s) => s.loadInstitutionHistory,
  );
  const loadMedicalHistory = useGenogramStore((s) => s.loadMedicalHistory);
  const loadAttributeHistory = useGenogramStore(
    (s) => s.loadAttributeHistory,
  );

  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // 初始化:只載歷史 + 個案清單,使用者自選要編哪個或新增
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          loadInstitutionHistory(),
          loadMedicalHistory(),
          loadAttributeHistory(),
          loadCaseList(),
        ]);
      } catch (err) {
        console.error('Initial load failed:', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    loadInstitutionHistory,
    loadMedicalHistory,
    loadAttributeHistory,
    loadCaseList,
  ]);

  // 第一次「進編輯模式」→ 自動跳教學(在清單頁不跳,等使用者真的開始編輯才教)
  useEffect(() => {
    if (!loaded) return;
    if (appMode !== 'edit') return;
    if (!hasTutorialBeenSeen()) setShowTutorial(true);
  }, [loaded, appMode, setShowTutorial]);

  // 自動儲存
  useEffect(() => {
    if (!loaded || !currentCase) return;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      db.cases.put(currentCase).catch((err) =>
        console.error('Auto save failed:', err),
      );
    }, 800);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [currentCase, loaded]);

  // 全域鍵盤:Delete / Backspace / Cmd+Z / Cmd+Shift+Z
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Delete — 單獨按:跳確認;Cmd/Ctrl + Delete:直接刪除
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const skipConfirm = e.metaKey || e.ctrlKey;
        if (selectedPersonIds.length > 0) {
          e.preventDefault();
          if (skipConfirm) {
            removePersons(selectedPersonIds);
          } else {
            const msg =
              selectedPersonIds.length === 1
                ? '確定要刪除這個人物嗎?相關線條也會一併刪除。'
                : `確定要刪除 ${selectedPersonIds.length} 個人物嗎?相關線條也會一併刪除。`;
            const ok = await showConfirm(msg);
            if (ok) removePersons(selectedPersonIds);
          }
        } else if (selectedLineIds.length > 0) {
          e.preventDefault();
          if (skipConfirm) {
            selectedLineIds.forEach((id) => removeLine(id));
          } else {
            const msg =
              selectedLineIds.length === 1
                ? '確定要刪除這條線條嗎?'
                : `確定要刪除 ${selectedLineIds.length} 條線條嗎?`;
            const ok = await showConfirm(msg);
            if (ok) selectedLineIds.forEach((id) => removeLine(id));
          }
        } else if (selectedUnitIds.length > 0) {
          e.preventDefault();
          if (skipConfirm) {
            selectedUnitIds.forEach((id) => removeNetworkUnit(id));
          } else {
            const msg =
              selectedUnitIds.length === 1
                ? '確定要刪除這個網絡單位嗎?'
                : `確定要刪除 ${selectedUnitIds.length} 個網絡單位嗎?`;
            const ok = await showConfirm(msg);
            if (ok) selectedUnitIds.forEach((id) => removeNetworkUnit(id));
          }
        } else if (selectedEcosystemId) {
          e.preventDefault();
          const eco = currentCase?.ecosystems?.find(
            (x) => x.id === selectedEcosystemId,
          );
          const name = eco?.label?.trim() || '生態圈';
          if (skipConfirm) {
            removeEcosystem(selectedEcosystemId);
          } else {
            const ok = await showConfirm(`確定要刪除「${name}」嗎?`);
            if (ok) removeEcosystem(selectedEcosystemId);
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    selectedPersonIds,
    selectedLineIds,
    selectedUnitIds,
    selectedEcosystemId,
    currentCase,
    showConfirm,
    removePersons,
    removeLine,
    removeNetworkUnit,
    removeEcosystem,
    undo,
    redo,
  ]);

  if (!loaded) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100vw',
          height: '100vh',
          color: '#86868b',
          fontSize: 14,
        }}
      >
        載入中…
      </div>
    );
  }

  // 個案清單模式
  if (appMode === 'list') {
    return (
      <>
        <CaseList />
        <ConfirmDialog />
        {showTutorial && (
          <Tutorial onClose={() => setShowTutorial(false)} level="basic" />
        )}
        {showTutorialAdvanced && (
          <Tutorial
            onClose={() => setShowTutorialAdvanced(false)}
            level="advanced"
          />
        )}
        <InstallBanner />
      </>
    );
  }

  // 編輯模式
  return (
    <>
      <div
        style={{
          display: 'flex',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <Canvas />
          <Toolbar onBack={() => goToList()} onRename={renameCase} />
          <ViewToolbar />
        </div>
        <Inspector />
      </div>
      <ConfirmDialog />
      <HoverTooltip />
      {showTutorial && (
        <Tutorial onClose={() => setShowTutorial(false)} level="basic" />
      )}
      {showTutorialAdvanced && (
        <Tutorial
          onClose={() => setShowTutorialAdvanced(false)}
          level="advanced"
        />
      )}
    </>
  );
}

function Toolbar({
  onBack,
  onRename,
}: {
  onBack: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // (translation hook used inside body)
  onRename: (id: string, name: string) => Promise<void>;
}) {
  const currentCase = useGenogramStore((s) => s.currentCase);
  const undo = useGenogramStore((s) => s.undo);
  const redo = useGenogramStore((s) => s.redo);
  const canUndo = useGenogramStore((s) => s.history.past.length > 0);
  const canRedo = useGenogramStore((s) => s.history.future.length > 0);
  const setShowTutorial = useGenogramStore((s) => s.setShowTutorial);
  const setShowTutorialAdvanced = useGenogramStore(
    (s) => s.setShowTutorialAdvanced,
  );
  const language = useGenogramStore((s) => s.language);
  const setLanguage = useGenogramStore((s) => s.setLanguage);
  const t = useT();
  const [open, setOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [activeScaleId, setActiveScaleId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-toolbar-menu]')) return;
      setOpen(false);
    };
    // 用 capture phase 確保比 Canvas 的 stopPropagation 早收到事件
    const id = window.setTimeout(
      () => document.addEventListener('pointerdown', onDown, true),
      0,
    );
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [open]);

  const lastModified = formatDate(currentCase?.lastModifiedAt);
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const mod = isMac ? '⌘' : 'Ctrl';

  return (
    <div
      data-toolbar-menu
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px 4px 6px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(10px)',
          borderRadius: 8,
          border: '1px solid #e5e4e7',
          fontSize: 13,
          color: '#1d1d1f',
          userSelect: 'none',
        }}
      >
        <button
          onClick={onBack}
          title="返回個案清單"
          style={{ ...hamburgerBtnStyle, marginRight: 2 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <polyline
              points="9,2 3,7 9,12"
              fill="none"
              stroke="#1d1d1f"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          title="選單"
          style={hamburgerBtnStyle}
        >
          <svg width="18" height="14" viewBox="0 0 18 14">
            <line x1="0" y1="1" x2="18" y2="1" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="7" x2="18" y2="7" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="13" x2="18" y2="13" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {renaming ? (
          <input
            type="text"
            value={draftName}
            autoFocus
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') {
                if (currentCase && draftName.trim()) {
                  onRename(currentCase.id, draftName.trim());
                }
                setRenaming(false);
              }
              if (e.key === 'Escape') setRenaming(false);
            }}
            onBlur={() => {
              if (currentCase && draftName.trim()) {
                onRename(currentCase.id, draftName.trim());
              }
              setRenaming(false);
            }}
            style={{
              minWidth: 100,
              padding: '2px 6px',
              fontSize: 13,
              border: '1px solid #007aff',
              borderRadius: 4,
              fontFamily: 'inherit',
            }}
          />
        ) : (
          <span
            onDoubleClick={() => {
              if (!currentCase) return;
              setDraftName(currentCase.caseName);
              setRenaming(true);
            }}
            title="雙擊改名"
            style={{ cursor: 'text' }}
          >
            {currentCase?.caseName ?? '家系圖'} · {currentCase?.persons.length ?? 0} 人
          </span>
        )}
      </div>

      {open && (
        <div
          style={{
            marginTop: 4,
            minWidth: 220,
            padding: 4,
            background: '#ffffff',
            border: '1px solid #e5e4e7',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            fontFamily: 'inherit',
          }}
        >
          <MenuItem
            icon="↺"
            label="回上一步"
            shortcut={`${mod}Z`}
            disabled={!canUndo}
            onClick={() => {
              undo();
              setOpen(false);
            }}
          />
          <MenuItem
            icon="↻"
            label="重做"
            shortcut={`${mod}⇧Z`}
            disabled={!canRedo}
            onClick={() => {
              redo();
              setOpen(false);
            }}
          />
          <MenuDivider />
          <MenuItem
            icon="📖"
            label={t('menu.symbolGallery')}
            onClick={() => {
              setGalleryOpen(true);
              setOpen(false);
            }}
          />
          <MenuDivider />
          <MenuItem icon="💾" label="快照(記一個版本點)" disabled subtitle="即將推出" />
          <MenuItem
            icon="↑"
            label={t('menu.export')}
            onClick={() => {
              setExportOpen(true);
              setOpen(false);
            }}
          />
          <MenuItem
            icon="↓"
            label={t('menu.import')}
            onClick={() => {
              setImportOpen(true);
              setOpen(false);
            }}
          />
          <MenuDivider />
          <MenuLabel>{t('menu.assessmentTools')}</MenuLabel>
          {getScalesByCategory().map((group) => (
            <ScaleCategoryItem
              key={group.category}
              icon={group.icon}
              label={group.label}
              scales={group.scales.map((s) => ({ id: s.id, name: s.name }))}
              onSelectScale={(id) => {
                setActiveScaleId(id);
                setOpen(false);
              }}
            />
          ))}
          <MenuDivider />
          <MenuItem
            icon="📖"
            label={t('menu.tutorialBasic')}
            onClick={() => {
              setShowTutorial(true);
              setOpen(false);
            }}
          />
          <MenuItem
            icon="📘"
            label={t('menu.tutorialAdvanced')}
            onClick={() => {
              setShowTutorialAdvanced(true);
              setOpen(false);
            }}
          />
          <MenuItem
            icon="🌐"
            label={`${t('menu.language')}: ${language === 'zh' ? '中文' : 'English'}`}
            onClick={() => {
              setLanguage(language === 'zh' ? 'en' : 'zh');
            }}
          />
          <MenuDivider />
          <div
            style={{
              padding: '8px 10px',
              fontSize: 10,
              color: '#86868b',
              lineHeight: 1.5,
              maxWidth: 240,
              whiteSpace: 'normal',
            }}
          >
            {t('menu.copyrightNotice')}
          </div>
          <MenuDivider />
          <MenuInfo>最後修改:{lastModified}</MenuInfo>
        </div>
      )}
      {galleryOpen && <SymbolGallery onClose={() => setGalleryOpen(false)} />}
      {exportOpen && (
        <ExportDialog
          defaultTab="image"
          defaultCaseId={currentCase?.id}
          onClose={() => setExportOpen(false)}
        />
      )}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
      {activeScaleId && (() => {
        const scale = getScale(activeScaleId);
        if (!scale) return null;
        return (
          <ScaleDialog
            scale={scale}
            onClose={() => setActiveScaleId(null)}
          />
        );
      })()}
    </div>
  );
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function MenuItem({
  icon,
  label,
  shortcut,
  subtitle,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  shortcut?: string;
  subtitle?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '8px 10px',
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? '#c7c7cc' : '#1d1d1f',
        fontSize: 13,
        fontFamily: 'inherit',
        textAlign: 'left',
        gap: 8,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = '#f0f0f5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && (
        <span style={{ color: '#86868b', fontSize: 11 }}>{shortcut}</span>
      )}
      {subtitle && (
        <span
          style={{
            color: '#c7c7cc',
            fontSize: 10,
            fontStyle: 'italic',
          }}
        >
          {subtitle}
        </span>
      )}
    </button>
  );
}

function MenuDivider() {
  return (
    <div
      style={{
        height: 1,
        background: '#e5e4e7',
        margin: '4px 4px',
      }}
    />
  );
}

function MenuInfo({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '6px 10px',
        fontSize: 11,
        color: '#86868b',
      }}
    >
      {children}
    </div>
  );
}

function ScaleCategoryItem({
  icon,
  label,
  scales,
  onSelectScale,
}: {
  icon: string;
  label: string;
  scales: { id: string; name: string }[];
  onSelectScale: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const open = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setHover(true);
  };
  const closeWithDelay = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setHover(false), 120);
  };

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={open}
      onMouseLeave={closeWithDelay}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 10px',
          background: hover ? '#f5f5f7' : 'transparent',
          fontSize: 13,
          color: '#1d1d1f',
          cursor: 'default',
          fontFamily: 'inherit',
          textAlign: 'left',
          userSelect: 'none',
        }}
      >
        <span style={{ width: 16, textAlign: 'center' }}>{icon}</span>
        <span style={{ flex: 1 }}>{label}</span>
        <span style={{ color: '#86868b', fontSize: 11 }}>▸</span>
      </div>
      {hover && (
        <div
          onMouseEnter={open}
          onMouseLeave={closeWithDelay}
          style={{
            position: 'absolute',
            top: 0,
            left: '100%',
            marginLeft: 4,
            background: '#fff',
            border: '1px solid #d2d2d7',
            borderRadius: 8,
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            padding: 4,
            minWidth: 200,
            zIndex: 10,
          }}
        >
          {scales.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectScale(s.id)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 10px',
                background: 'transparent',
                border: 'none',
                fontSize: 12,
                color: '#1d1d1f',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                borderRadius: 4,
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = '#f5f5f7')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  'transparent')
              }
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '4px 10px 2px',
        fontSize: 10,
        color: '#86868b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {children}
    </div>
  );
}

const hamburgerBtnStyle: React.CSSProperties = {
  width: 28,
  height: 24,
  padding: 0,
  background: 'transparent',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'inherit',
};

