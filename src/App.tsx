import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import Canvas from './components/Canvas/Canvas';
import ViewToolbar from './components/Canvas/ViewToolbar';
import Inspector from './components/Inspector/Inspector';
import ConfirmDialog from './components/ConfirmDialog';
import HoverTooltip from './components/HoverTooltip';
import CaseList from './components/CaseList/CaseList';
import {
  ExportDialog,
  ImportDialog,
} from './components/CaseList/ExportImportDialog';
// hasTutorialBeenSeen 暫不使用(教學手冊改為選單觸發)— 需要時從 './components/Tutorial/tutorialSeen' 匯入
import ScaleDialog from './components/Scales/ScaleDialog';
import InstallBanner from './components/InstallBanner';
import FolderSetupModal from './components/CaseList/FolderSetupModal';
import AboutDialog from './components/About/AboutDialog';
import EyeComfortButton from './components/EyeComfort/EyeComfortButton';
import {
  SupportAutoPrompt,
  SupportButton,
} from './components/About/SupportDialog';
import { useT } from './i18n';
import {
  getScale,
  getScalesByCategory,
} from './components/Scales/registry';
import { db, getDeletedCaseIds } from './services/database';
import { isValidGenogram } from './services/exportImport';
import type { Genogram } from './types/genogram';
import {
  loadRootDirHandle,
  writeCaseJson,
  loadAllCasesFromFolder,
} from './services/fileSystem';
import { setupPwaInstallListener } from './services/pwaInstall';
import {
  applyUpdate,
  getNeedRefresh,
  onNeedRefreshChange,
} from './services/pwaUpdate';
import { ensurePersistentStorage } from './services/storagePersist';
import { useGenogramStore } from './store/genogramStore';

// 大塊且非常用的畫面 lazy 拆包(#127):教學手冊 / 符號圖例 開啟時才載入
const Tutorial = lazy(() => import('./components/Tutorial/Tutorial'));
const SymbolGallery = lazy(() => import('./components/Gallery/SymbolGallery'));

// 啟動時就註冊 beforeinstallprompt 監聽(全域,只執行一次)
setupPwaInstallListener();

export default function App() {
  const appMode = useGenogramStore((s) => s.appMode);
  const loadCaseList = useGenogramStore((s) => s.loadCaseList);
  const goToList = useGenogramStore((s) => s.goToList);
  const renameCase = useGenogramStore((s) => s.renameCase);
  const showTutorial = useGenogramStore((s) => s.showTutorial);
  const setShowTutorial = useGenogramStore((s) => s.setShowTutorial);
  const currentCase = useGenogramStore((s) => s.currentCase);
  const selectedPersonIds = useGenogramStore((s) => s.selectedPersonIds);
  const selectedLineIds = useGenogramStore((s) => s.selectedLineIds);
  const selectedUnitIds = useGenogramStore((s) => s.selectedUnitIds);
  const selectedEcosystemId = useGenogramStore((s) => s.selectedEcosystemId);
  const selectedConnector = useGenogramStore((s) => s.selectedConnector);
  const removePersons = useGenogramStore((s) => s.removePersons);
  const removeLine = useGenogramStore((s) => s.removeLine);
  const removeNetworkUnit = useGenogramStore((s) => s.removeNetworkUnit);
  const removeConnector = useGenogramStore((s) => s.removeConnector);
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
  const loadLanguage = useGenogramStore((s) => s.loadLanguage);
  const loadProbandStyle = useGenogramStore((s) => s.loadProbandStyle);

  const t = useT();
  const [loaded, setLoaded] = useState(false);
  const [showFolderSetup, setShowFolderSetup] = useState(false);
  // 儲存異常警示(#120):db = IndexedDB 失敗(紅)/ folder = 資料夾備份失效(黃)
  const [saveIssue, setSaveIssue] = useState<null | 'db' | 'folder'>(null);
  // 同個案開兩個視窗警告(#124)
  const [multiTabWarn, setMultiTabWarn] = useState(false);
  // 有新版就緒(A 系列 #131)— prompt 模式,使用者按「立即更新」才套用
  const [updateReady, setUpdateReady] = useState(getNeedRefresh());
  const saveTimer = useRef<number | null>(null);
  // 排隊等待寫入的個案快照 — flushPendingSave() 立即寫出(#117)
  const pendingSave = useRef<Genogram | null>(null);
  // 使用者是否設定過備份資料夾(settings 有紀錄;權限休眠時 rootDirHandle 是 null)
  const folderConfiguredRef = useRef(false);

  // 立即寫出排隊中的儲存 — timer 到期 / 關閉分頁 / 切換個案 共用(#117)
  const flushPendingSave = useCallback((): Promise<void> => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const g = pendingSave.current;
    if (!g) return Promise.resolve();
    pendingSave.current = null;
    // 主儲存(IndexedDB):回傳此 promise,讓「立即更新」能等寫完再重載(防掉資料)
    const dbWrite = db.cases.put(g).then(
      () => setSaveIssue((prev) => (prev === 'db' ? null : prev)),
      (err) => {
        console.error('Auto save (IndexedDB) failed:', err);
        setSaveIssue('db'); // 主儲存失敗 → 紅色警示(#120)
      },
    );
    // 同時寫一份到資料夾:沒設定過 → 靜默;設定過但失敗 → 黃色警示(#120)
    writeCaseJson(g).then(
      (ok) => {
        if (!ok && folderConfiguredRef.current) {
          setSaveIssue((prev) => (prev === 'db' ? prev : 'folder'));
        } else if (ok) {
          setSaveIssue((prev) => (prev === 'folder' ? null : prev));
        }
      },
      (err) => console.error('Auto save (folder) failed:', err),
    );
    return dbWrite;
  }, []);

  // 初始化:
  //   1. 載歷史 + 個案清單(IndexedDB)
  //   2. 嘗試還原使用者選過的資料夾權限
  //   3. 從資料夾掃出 IndexedDB 沒有的個案 → 補進來(資料救援)
  //   4. 若 FSA 支援且還沒設過資料夾 → 跳設定 prompt
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          loadInstitutionHistory(),
          loadMedicalHistory(),
          loadAttributeHistory(),
          loadCaseList(),
          loadLanguage(),
          loadProbandStyle(),
        ]);

        // 請求持久化儲存(#133)— 降低 IndexedDB 被瀏覽器驅逐的機率;失敗不影響
        void ensurePersistentStorage();

        // 是否設定過備份資料夾(權限休眠時 loadRootDirHandle 回 null,但 settings 紀錄還在)
        try {
          folderConfiguredRef.current = !!(await db.settings.get(
            'rootDirHandle',
          ));
        } catch {
          folderConfiguredRef.current = false;
        }

        // 嘗試還原資料夾權限(若使用者已選過且權限還在)
        const dirHandle = await loadRootDirHandle();

        if (dirHandle) {
          // 掃資料夾 → 找 IndexedDB 沒有的個案補進去(救回瀏覽器清掉的資料)
          try {
            const [tombstones, cases] = await Promise.all([
              getDeletedCaseIds(),
              loadAllCasesFromFolder(),
            ]);
            const skip = new Set(tombstones);
            let restored = 0;
            for (const g of cases) {
              // 壞檔(#119)與已刪除個案的殘留備份(#125)都不救
              if (!isValidGenogram(g)) {
                console.warn(
                  'skip invalid case.json in folder:',
                  (g as { id?: unknown })?.id,
                );
                continue;
              }
              if (skip.has(g.id)) continue;
              const exists = await db.cases.get(g.id);
              if (!exists) {
                await db.cases.put(g);
                restored++;
              }
            }
            if (restored > 0) {
              // 重新載個案清單(有新還原進來的)
              await loadCaseList();
            }
          } catch (err) {
            console.error('scan folder failed:', err);
          }
        }
        // 改成「點新增個案時才彈 FolderSetupModal」(在 CaseList 處理),
        // 不在 app 載入時就彈 — 避免跟首頁隱私彈窗連續疊兩個 modal
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
    loadLanguage,
    loadProbandStyle,
  ]);

  // 教學手冊改成「使用者主動從選單觸發」— 不再首次進編輯自動彈
  // (避免跟首頁隱私歡迎彈窗連續兩次強制 modal,UX 太重)
  // 想加回自動彈,把下面 useEffect 取消註解即可
  // useEffect(() => {
  //   if (!loaded) return;
  //   if (appMode !== 'edit') return;
  //   if (!hasTutorialBeenSeen()) setShowTutorial(true);
  // }, [loaded, appMode, setShowTutorial]);

  // 自動儲存(write-through):
  //   1. 寫 IndexedDB(快,必有)
  //   2. 寫 case.json 到使用者資料夾(若有設過,best effort,失敗不影響)
  //   編輯後 0.8 秒寫入;關閉分頁 / 切換個案 由 flushPendingSave 立即補寫(#117)
  useEffect(() => {
    if (!loaded) return;
    if (pendingSave.current) {
      if (!currentCase) {
        // currentCase → null 只發生在「刪除目前個案」(goToList 不清空 currentCase)
        // → 丟棄排隊中的儲存,不可把剛刪除的個案寫回 DB
        pendingSave.current = null;
        if (saveTimer.current !== null) {
          window.clearTimeout(saveTimer.current);
          saveTimer.current = null;
        }
      } else if (pendingSave.current.id !== currentCase.id) {
        // 換個案:先把上一個個案還沒寫出的編輯立即存掉
        flushPendingSave();
      }
    }
    if (!currentCase) return;
    pendingSave.current = currentCase;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      flushPendingSave();
    }, 800);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [currentCase, loaded, flushPendingSave]);

  // 有新版就緒 → 顯示更新橫幅(A 系列 #131)
  useEffect(() => {
    return onNeedRefreshChange(() => setUpdateReady(true));
  }, []);

  // 關閉分頁 / 切到背景 → 立即把排隊中的儲存寫出(#117)
  useEffect(() => {
    const onPageHide = () => flushPendingSave();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushPendingSave();
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flushPendingSave]);

  // 同個案開兩視窗偵測(#124)— BroadcastChannel 只通同一瀏覽器的分頁/PWA 視窗
  const bcRef = useRef<BroadcastChannel | null>(null);
  const caseIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel('genogram-case-open');
    ch.onmessage = (ev: MessageEvent) => {
      const m = ev.data as { t?: string; id?: string } | null;
      if (!m?.id || m.id !== caseIdRef.current) return;
      if (m.t === 'open') {
        setMultiTabWarn(true);
        ch.postMessage({ t: 'busy', id: m.id }); // 回報對方:這裡也開著同個案
      } else if (m.t === 'busy') {
        setMultiTabWarn(true);
      }
    };
    bcRef.current = ch;
    return () => {
      ch.close();
      bcRef.current = null;
    };
  }, []);
  const currentCaseId = currentCase?.id ?? null;
  useEffect(() => {
    caseIdRef.current = currentCaseId;
    setMultiTabWarn(false);
    if (currentCaseId) {
      bcRef.current?.postMessage({ t: 'open', id: currentCaseId });
    }
  }, [currentCaseId]);

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
        } else if (selectedConnector) {
          // v1.1 修:Delete 鍵也可刪 connector(單位 ↔ 人物/生態圈 的連線)
          // — 過去只有 X 按鈕可刪,跟其他選取類型不一致
          e.preventDefault();
          if (skipConfirm) {
            removeConnector(
              selectedConnector.unitId,
              selectedConnector.connectorId,
            );
          } else {
            const ok = await showConfirm('確定要刪除這條連接線嗎?');
            if (ok) {
              removeConnector(
                selectedConnector.unitId,
                selectedConnector.connectorId,
              );
            }
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
    selectedConnector,
    currentCase,
    showConfirm,
    removePersons,
    removeLine,
    removeNetworkUnit,
    removeConnector,
    removeEcosystem,
    undo,
    redo,
  ]);

  // 系統警示橫幅(#120 / #124 / #131)— 清單與編輯模式都掛最上層
  const banners =
    saveIssue || multiTabWarn || updateReady ? (
      <div
        style={{
          position: 'fixed',
          // C 系列:避開 iOS 瀏海/狀態列(viewport-fit=cover 下需手動讓開)
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 'min(720px, calc(100vw - 32px))',
        }}
      >
        {saveIssue && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              background: saveIssue === 'db' ? '#fff1f0' : '#fff5e6',
              border:
                saveIssue === 'db' ? '1px solid #ffccc7' : '1px solid #ffd9a3',
              color: saveIssue === 'db' ? '#cf1322' : '#8a6d3b',
            }}
          >
            <span>{saveIssue === 'db' ? '🛑' : '⚠️'}</span>
            <span style={{ flex: 1 }}>
              {saveIssue === 'db'
                ? t('alert.saveDbFailed')
                : t('alert.saveFolderFailed')}
            </span>
            <button onClick={() => setSaveIssue(null)} style={alertBtnStyle}>
              {t('alert.dismiss')}
            </button>
          </div>
        )}
        {multiTabWarn && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              background: '#fff5e6',
              border: '1px solid #ffd9a3',
              color: '#8a6d3b',
            }}
          >
            <span>⚠️</span>
            <span style={{ flex: 1 }}>{t('alert.multiTab')}</span>
            <button
              onClick={() => setMultiTabWarn(false)}
              style={alertBtnStyle}
            >
              {t('alert.dismiss')}
            </button>
          </div>
        )}
        {updateReady && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              background: '#e6f1fb',
              border: '1px solid #b5d4f4',
              color: '#0c447c',
            }}
          >
            <span>✨</span>
            <span style={{ flex: 1 }}>{t('alert.updateReady')}</span>
            <button
              onClick={async () => {
                // 先把進行中的編輯寫進 IndexedDB,再讓 SW 重載 → 不會掉最後幾秒
                await flushPendingSave();
                applyUpdate();
              }}
              style={{
                ...alertBtnStyle,
                background: '#007aff',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
              }}
            >
              {t('alert.updateNow')}
            </button>
            <button onClick={() => setUpdateReady(false)} style={alertBtnStyle}>
              {t('alert.later')}
            </button>
          </div>
        )}
      </div>
    ) : null;

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
        {banners}
        <ConfirmDialog />
        {showFolderSetup && (
          <FolderSetupModal
            onClose={() => setShowFolderSetup(false)}
            onSelected={async () => {
              setShowFolderSetup(false);
              // 選好資料夾後,把目前 IndexedDB 的個案全部寫一份進去(初始備份)
              try {
                const allCases = await db.cases.toArray();
                for (const g of allCases) await writeCaseJson(g);
                await loadCaseList();
              } catch (err) {
                console.error('initial sync to folder failed:', err);
              }
            }}
          />
        )}
        {showTutorial && (
          <Suspense fallback={null}>
            <Tutorial onClose={() => setShowTutorial(false)} />
          </Suspense>
        )}
        <InstallBanner />
        {/* 抖內自動提示掛 App 層:清單/編輯模式的匯出都接得到(#129) */}
        <SupportAutoPrompt />
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
      {banners}
      <ConfirmDialog />
      <HoverTooltip />
      {showFolderSetup && (
        <FolderSetupModal
          onClose={() => setShowFolderSetup(false)}
          onSelected={async () => {
            setShowFolderSetup(false);
            try {
              const allCases = await db.cases.toArray();
              for (const g of allCases) await writeCaseJson(g);
              await loadCaseList();
            } catch (err) {
              console.error('initial sync to folder failed:', err);
            }
          }}
        />
      )}
      {showTutorial && (
        <Suspense fallback={null}>
          <Tutorial onClose={() => setShowTutorial(false)} />
        </Suspense>
      )}
      <SupportAutoPrompt />
    </>
  );
}

function Toolbar({
  onBack,
  onRename,
}: {
  onBack: () => void;
  onRename: (id: string, name: string) => Promise<void>;
}) {
  const currentCase = useGenogramStore((s) => s.currentCase);
  const undo = useGenogramStore((s) => s.undo);
  const redo = useGenogramStore((s) => s.redo);
  const canUndo = useGenogramStore((s) => s.history.past.length > 0);
  const canRedo = useGenogramStore((s) => s.history.future.length > 0);
  const setShowTutorial = useGenogramStore((s) => s.setShowTutorial);
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
  const [aboutOpen, setAboutOpen] = useState(false);

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
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        left: 'calc(env(safe-area-inset-left, 0px) + 12px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          maxWidth: 'calc(100vw - 24px)',
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
        {/* 護眼 + 支持:緊鄰漢堡,與首頁頂列一致 */}
        <EyeComfortButton />
        <SupportButton />
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
            style={{
              cursor: 'text',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
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
            label={
              language === 'zh' ? (
                <>
                  輸
                  <span style={{ color: '#d70015', fontWeight: 700 }}>出</span>
                  檔案
                </>
              ) : (
                <>
                  <span style={{ color: '#d70015', fontWeight: 700 }}>Out</span>
                  put File
                </>
              )
            }
            onClick={() => {
              setExportOpen(true);
              setOpen(false);
            }}
          />
          {/* v1.1 拿掉「輸入檔案」— 個案內漢堡不再提供匯入入口
              理由:個案內按匯入語意混亂(匯入別份檔案不會插進此個案,只會新增到 case list)
              首頁 CaseList 已有完整匯入入口 */}
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
          {/* v1.1 拿掉「設定資料夾」— 改成只在首頁漢堡顯示
              理由:個案內漢堡聚焦在「當前個案操作」,設定資料夾是全 app 級設定
              首頁 CaseList 已有此入口 */}
          <MenuItem
            icon="📕"
            label={t('menu.tutorialBasic')}
            onClick={() => {
              setShowTutorial(true);
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
          {/* 關於:原本是工具列上的 ℹ️ 鈕,改收進選單(眼睛鈕取代其位置) */}
          <MenuItem
            icon="ℹ️"
            label={t('about.title')}
            onClick={() => {
              setAboutOpen(true);
              setOpen(false);
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
      {galleryOpen && (
        <Suspense fallback={null}>
          <SymbolGallery onClose={() => setGalleryOpen(false)} />
        </Suspense>
      )}
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
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
  label: React.ReactNode;
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
  // v1.1: icon prop 保留(call site 還在傳),但內部不再渲染 — 評估工具區改純文字
  label,
  scales,
  onSelectScale,
}: {
  icon?: string;
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
        {/* v1.1 拿掉量表分類 icon — 評估工具區塊改純文字 */}
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

const alertBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 12,
  background: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: 'inherit',
  flexShrink: 0,
};

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

// FolderSetupModal 已移到 src/components/CaseList/FolderSetupModal.tsx

