import { useEffect, useRef, useState } from 'react';
import type { Genogram } from '../../types/genogram';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import { ExportDialog, ImportDialog } from './ExportImportDialog';
import ShareDialog from './ShareDialog';
import { usePwaInstall } from '../../services/pwaInstall';
import {
  selectRootFolder,
  getRootFolderName,
  isFileSystemAccessSupported,
  writeCaseJson,
} from '../../services/fileSystem';
import { db } from '../../services/database';
import SymbolGallery from '../Gallery/SymbolGallery';
import FeedbackDialog from './FeedbackDialog';
import PrivacyWelcomeDialog, {
  hasAcknowledgedPrivacy,
} from './PrivacyWelcomeDialog';
import FolderSetupModal from './FolderSetupModal';
import { hasTutorialBeenSeen } from '../Tutorial/Tutorial';
import AboutButton from '../About/AboutButton';

export default function CaseList() {
  const t = useT();
  const caseList = useGenogramStore((s) => s.caseList);
  const loadCaseList = useGenogramStore((s) => s.loadCaseList);
  const openCase = useGenogramStore((s) => s.openCase);
  const createCase = useGenogramStore((s) => s.createCase);
  const renameCase = useGenogramStore((s) => s.renameCase);
  const deleteCase = useGenogramStore((s) => s.deleteCase);
  const showConfirm = useGenogramStore((s) => s.showConfirm);
  const setShowTutorial = useGenogramStore((s) => s.setShowTutorial);
  const language = useGenogramStore((s) => s.language);
  const setLanguage = useGenogramStore((s) => s.setLanguage);

  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exportTarget, setExportTarget] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  // 第一次開啟才彈隱私說明(localStorage flag 控制只彈一次)
  const [privacyWelcomeOpen, setPrivacyWelcomeOpen] = useState(
    () => !hasAcknowledgedPrivacy(),
  );
  // 點「新增個案」時若還沒設資料夾,先彈資料夾提醒;
  // 提醒關閉(選了或暫時不要)後再開 NewCaseDialog
  const [folderPromptForNew, setFolderPromptForNew] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 點外面關 menu
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-home-menu]')) return;
      setMenuOpen(false);
    };
    const id = window.setTimeout(
      () => document.addEventListener('pointerdown', onDown, true),
      0,
    );
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [menuOpen]);
  const { canInstall, isIOS, isStandalone, triggerInstall } = usePwaInstall();
  const fsaSupported = isFileSystemAccessSupported();

  useEffect(() => {
    loadCaseList();
    // 讀現有 root folder 名稱(載入後可能 App.tsx 已經 loadRootDirHandle)
    setFolderName(getRootFolderName());
    // 教學觸發改到「首次按 + 新增個案 並進入編輯模式」時(見下方 NewCaseDialog onCreate)
  }, [loadCaseList]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#f5f5f7',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '40px 20px 80px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 28,
          }}
        >
          <div
            data-home-menu
            ref={menuRef}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              position: 'relative',
            }}
          >
            <button
              onClick={() => setMenuOpen((v) => !v)}
              title={t('caseList.menuTitle')}
              style={{
                marginTop: 6,
                width: 36,
                height: 36,
                padding: 0,
                background: '#ffffff',
                border: '1px solid #d2d2d7',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'inherit',
              }}
            >
              <svg width="18" height="14" viewBox="0 0 18 14">
                <line x1="0" y1="1" x2="18" y2="1" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" />
                <line x1="0" y1="7" x2="18" y2="7" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" />
                <line x1="0" y1="13" x2="18" y2="13" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: '#1d1d1f',
                  margin: 0,
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <span>{t('caseList.title')}</span>
                <AboutButton size="lg" />
              </h1>
              {/* 隱私標語 — 從淡灰 subtitle 升級為 badge 風格,讓所有人一進首頁就看到 */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: '#1a7a3f',
                  background: '#e8f5ec',
                  border: '1px solid #c5e8d2',
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                onClick={() => setPrivacyWelcomeOpen(true)}
                title={t('privacy.welcomeTitle')}
              >
                <span>🔒</span>
                <span>{t('caseList.subtitle')}</span>
              </div>
            </div>

            {/* 主選單 dropdown */}
            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 50,
                  left: 0,
                  minWidth: 240,
                  padding: 4,
                  background: '#ffffff',
                  border: '1px solid #e5e4e7',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  zIndex: 100,
                }}
              >
                <HomeMenuItem
                  icon="🌐"
                  label={`${t('menu.language')}: ${language === 'zh' ? '中文' : 'English'}`}
                  onClick={() => {
                    setLanguage(language === 'zh' ? 'en' : 'zh');
                  }}
                />
                {/* 「案主樣式」已從首頁主選單移到 Tab1(案主旁邊 ☐ 傳統)— 那邊是 per-person UI 的自然位置 */}
                <HomeMenuItem
                  icon="📖"
                  label={t('menu.symbolGallery')}
                  onClick={() => {
                    setGalleryOpen(true);
                    setMenuOpen(false);
                  }}
                />
                <HomeMenuItem
                  icon="📕"
                  label={t('menu.tutorialBasic')}
                  onClick={() => {
                    setShowTutorial(true);
                    setMenuOpen(false);
                  }}
                />
                {fsaSupported && (
                  <HomeMenuItem
                    icon="📁"
                    label={
                      folderName
                        ? `${t('caseList.folderLabel')}: ${folderName} · ${t('caseList.folderSwitch')}`
                        : t('menu.folderSetup')
                    }
                    onClick={async () => {
                      setMenuOpen(false);
                      const h = await selectRootFolder();
                      if (h) {
                        setFolderName(h.name);
                        try {
                          const allCases = await db.cases.toArray();
                          for (const g of allCases) await writeCaseJson(g);
                        } catch (err) {
                          console.error('sync to folder failed:', err);
                        }
                      }
                    }}
                  />
                )}
                <div
                  style={{ height: 1, background: '#e5e4e7', margin: '4px 4px' }}
                />
                <HomeMenuItem
                  icon="✉️"
                  label={t('menu.feedback')}
                  onClick={() => {
                    setFeedbackOpen(true);
                    setMenuOpen(false);
                  }}
                />
                <div
                  style={{ height: 1, background: '#e5e4e7', margin: '4px 4px' }}
                />
                <div
                  style={{
                    padding: '8px 10px',
                    fontSize: 10,
                    color: '#86868b',
                    lineHeight: 1.6,
                    maxWidth: 220,
                    whiteSpace: 'normal',
                  }}
                >
                  {t('menu.copyrightNotice')}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* 安裝按鈕:依平台/狀態自動切換 */}
            {!isStandalone && (canInstall || isIOS) && (
              <button
                onClick={async () => {
                  if (canInstall) {
                    await triggerInstall();
                  } else if (isIOS) {
                    alert(
                      '📱 iPhone/iPad 安裝步驟:\n\n1. 按 Safari 下方分享 ↑\n2. 選「加入主畫面」\n3. 之後從主畫面點 icon 開啟,離線可用',
                    );
                  }
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  background: '#007aff',
                  border: '1px solid #007aff',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#ffffff',
                  fontFamily: 'inherit',
                  fontWeight: 500,
                }}
                title={t('caseList.installTitle')}
              >
                📲 {t('caseList.install')}
              </button>
            )}
            <button
              onClick={() => setShowShare(true)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                background: 'transparent',
                border: '1px solid #d2d2d7',
                borderRadius: 6,
                cursor: 'pointer',
                color: '#1d1d1f',
                fontFamily: 'inherit',
              }}
              title={t('caseList.shareTitle')}
            >
              📤 {t('caseList.share')}
            </button>
          </div>
        </div>

        {/* 資料夾警告區塊 — 只在「FSA 支援 + 還沒選資料夾」時顯示
            選了資料夾後就完全隱藏(資料夾名稱在主選單裡看) */}
        {fsaSupported && !folderName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: '#fff5e6',
              border: '1px solid #ffd9a3',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 16 }}>📁</span>
            <span style={{ flex: 1, color: '#8a6d3b' }}>
              {t('caseList.folderNotSet')}
            </span>
            <button
              onClick={async () => {
                const h = await selectRootFolder();
                if (h) {
                  setFolderName(h.name);
                  try {
                    const allCases = await db.cases.toArray();
                    for (const g of allCases) await writeCaseJson(g);
                    await loadCaseList();
                  } catch (err) {
                    console.error('sync to new folder failed:', err);
                  }
                }
              }}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                background: '#ffffff',
                border: '1px solid #d2d2d7',
                borderRadius: 4,
                cursor: 'pointer',
                color: '#007aff',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
              title={t('caseList.folderSwitchTitle')}
            >
              {t('caseList.folderSelect')}
            </button>
          </div>
        )}

        {/* New Case + Import Buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          <button
            onClick={() => {
              // 還沒設資料夾 + FSA 支援 → 先彈資料夾提醒,關閉後再開新個案 dialog
              // 已設 / 不支援 → 直接開新個案 dialog
              if (fsaSupported && !folderName) {
                setFolderPromptForNew(true);
              } else {
                setShowNew(true);
              }
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '16px 20px',
              fontSize: 15,
              fontWeight: 500,
              background: '#007aff',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 1px 4px rgba(0,122,255,0.3)',
            }}
          >
            <span style={{ fontSize: 18 }}>＋</span>
            <span>{t('caseList.addCase')}</span>
          </button>
          <button
            onClick={() => setShowImport(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '16px 20px',
              fontSize: 14,
              fontWeight: 500,
              background: '#ffffff',
              color: '#007aff',
              border: '1px solid #c7d9ff',
              borderRadius: 10,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span>📥</span>
            <span>{t('caseList.import')}</span>
          </button>
          {caseList.length > 0 && (
            <button
              onClick={() => setExportTarget('__backup__')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '16px 20px',
                fontSize: 14,
                fontWeight: 500,
                background: '#ffffff',
                color: '#007aff',
                border: '1px solid #c7d9ff',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              title={t('caseList.backupTitle')}
            >
              <span>📦</span>
              <span>{t('caseList.backup')}</span>
            </button>
          )}
        </div>

        {/* Case List — 依最近使用分三階(1週內 / 1月內 / 更早) */}
        {caseList.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#86868b',
              background: '#ffffff',
              border: '1px dashed #d2d2d7',
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, marginBottom: 4 }}>
              {t('caseList.empty')}
            </div>
            <div style={{ fontSize: 12 }}>
              {t('caseList.emptyHint')}
            </div>
          </div>
        ) : (
          (() => {
            // 分組:依 lastModifiedAt 切三階
            const now = Date.now();
            const ONE_DAY = 24 * 60 * 60 * 1000;
            const W = 7 * ONE_DAY; // 1 週
            const M = 30 * ONE_DAY; // 1 個月
            const groups: {
              key: 'week' | 'month' | 'older';
              labelKey: string;
              items: typeof caseList;
            }[] = [
              { key: 'week', labelKey: 'caseList.groupWeek', items: [] },
              { key: 'month', labelKey: 'caseList.groupMonth', items: [] },
              { key: 'older', labelKey: 'caseList.groupOlder', items: [] },
            ];
            // 各組內按時間倒序排
            const sorted = [...caseList].sort((a, b) => {
              const ta = new Date(a.lastModifiedAt).getTime();
              const tb = new Date(b.lastModifiedAt).getTime();
              return tb - ta;
            });
            for (const c of sorted) {
              const t = new Date(c.lastModifiedAt).getTime();
              const age = now - t;
              if (age <= W) groups[0].items.push(c);
              else if (age <= M) groups[1].items.push(c);
              else groups[2].items.push(c);
            }
            return (
              <>
                {groups.map((g) =>
                  g.items.length === 0 ? null : (
                    <div key={g.key} style={{ marginBottom: 24 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: '#86868b',
                          marginBottom: 10,
                          paddingLeft: 4,
                          fontWeight: 500,
                        }}
                      >
                        {t(g.labelKey)} ({g.items.length})
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fill, minmax(220px, 1fr))',
                          gap: 12,
                        }}
                      >
                        {g.items.map((c) => (
                          <CaseCard
                            key={c.id}
                            genogram={c}
                            onOpen={() => openCase(c.id)}
                            onRename={async (newName) => {
                              await renameCase(c.id, newName);
                            }}
                            onDelete={async () => {
                              const ok = await showConfirm(
                                t('caseList.deleteConfirm', {
                                  name: c.caseName,
                                }),
                              );
                              if (ok) await deleteCase(c.id);
                            }}
                            onExport={() => setExportTarget(c.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </>
            );
          })()
        )}
      </div>

      {showNew && (
        <NewCaseDialog
          onCreate={async (name) => {
            setShowNew(false);
            await createCase(name);
            // 首次新建個案 + 進入畫布 → 跳基礎教學(只跳一次)
            if (!hasTutorialBeenSeen()) {
              window.setTimeout(() => setShowTutorial(true), 400);
            }
          }}
          onCancel={() => setShowNew(false)}
        />
      )}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
      {exportTarget && (
        <ExportDialog
          defaultTab="data"
          defaultCaseId={
            exportTarget !== '__backup__' ? exportTarget : undefined
          }
          defaultSelectAll={exportTarget === '__backup__'}
          defaultIncludeSettings={exportTarget === '__backup__'}
          onClose={() => setExportTarget(null)}
        />
      )}
      {showShare && <ShareDialog onClose={() => setShowShare(false)} />}
      {galleryOpen && <SymbolGallery onClose={() => setGalleryOpen(false)} />}
      {feedbackOpen && (
        <FeedbackDialog onClose={() => setFeedbackOpen(false)} />
      )}
      {privacyWelcomeOpen && (
        <PrivacyWelcomeDialog
          onClose={() => {
            setPrivacyWelcomeOpen(false);
            // 教學觸發改到「首次按 + 新增個案 並進入編輯模式」時
          }}
        />
      )}
      {folderPromptForNew && (
        <FolderSetupModal
          onClose={() => {
            // 使用者按「暫時不要」/ 點外面 → 不擋,繼續開新個案 dialog
            setFolderPromptForNew(false);
            setShowNew(true);
          }}
          onSelected={async () => {
            // 使用者選了資料夾 → 同步既有個案到資料夾 → 再開新個案 dialog
            setFolderPromptForNew(false);
            setFolderName(getRootFolderName());
            try {
              const allCases = await db.cases.toArray();
              for (const g of allCases) await writeCaseJson(g);
              await loadCaseList();
            } catch (err) {
              console.error('sync to new folder failed:', err);
            }
            setShowNew(true);
          }}
        />
      )}
    </div>
  );
}

/* ==================== 首頁主選單項目 ==================== */
function HomeMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '8px 10px',
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        color: '#1d1d1f',
        fontSize: 13,
        fontFamily: 'inherit',
        textAlign: 'left',
        gap: 8,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f5')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
}

/* ==================== CaseCard ==================== */

function CaseCard({
  genogram,
  onOpen,
  onRename,
  onDelete,
  onExport,
}: {
  genogram: Genogram;
  onOpen: () => void;
  onRename: (newName: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onExport: () => void;
}) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(genogram.caseName);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close menu
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [menuOpen]);

  const personCount = genogram.persons.length;
  const dt = new Date(genogram.lastModifiedAt);
  const dateStr = `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

  const handleRenameSave = async () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== genogram.caseName) {
      await onRename(trimmed);
    } else {
      setDraft(genogram.caseName);
    }
    setRenaming(false);
  };

  return (
    <div
      style={{
        position: 'relative',
        background: '#ffffff',
        border: '1px solid #e5e4e7',
        borderRadius: 10,
        padding: 14,
        cursor: renaming ? 'default' : 'pointer',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onClick={(e) => {
        if (renaming || menuOpen) return;
        if ((e.target as HTMLElement).closest('[data-card-menu]')) return;
        onOpen();
      }}
      onMouseEnter={(e) => {
        if (!renaming) {
          e.currentTarget.style.boxShadow =
            '0 2px 8px rgba(0,0,0,0.08)';
          e.currentTarget.style.borderColor = '#007aff';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#e5e4e7';
      }}
    >
      {/* 名稱 */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: '#1d1d1f',
          marginBottom: 6,
          paddingRight: 24,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {renaming ? (
          <input
            type="text"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') handleRenameSave();
              if (e.key === 'Escape') {
                setDraft(genogram.caseName);
                setRenaming(false);
              }
            }}
            onBlur={handleRenameSave}
            style={{
              width: '100%',
              padding: '2px 6px',
              fontSize: 14,
              border: '1px solid #007aff',
              borderRadius: 4,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          genogram.caseName || t('caseList.unnamed')
        )}
      </div>

      {/* meta */}
      <div style={{ fontSize: 12, color: '#86868b', marginBottom: 2 }}>
        {t('caseList.persons', { n: personCount })}
      </div>
      <div style={{ fontSize: 11, color: '#a1a1a6' }}>{dateStr}</div>

      {/* ⋯ menu */}
      <div
        data-card-menu
        ref={menuRef}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          style={{
            width: 24,
            height: 24,
            padding: 0,
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            color: '#86868b',
            fontSize: 16,
            lineHeight: 1,
          }}
          title={t('common.more')}
        >
          ⋯
        </button>
        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 28,
              right: 0,
              minWidth: 110,
              background: '#ffffff',
              border: '1px solid #e5e4e7',
              borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              zIndex: 10,
              overflow: 'hidden',
            }}
          >
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                setRenaming(true);
                setDraft(genogram.caseName);
              }}
            >
              {t('caseList.rename')}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuOpen(false);
                onExport();
              }}
            >
              {t('caseList.export')}
            </MenuItem>
            <MenuItem
              danger
              onClick={async () => {
                setMenuOpen(false);
                await onDelete();
              }}
            >
              {t('caseList.delete')}
            </MenuItem>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: '8px 12px',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        color: danger ? '#ff3b30' : '#1d1d1f',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = '#f5f5f7')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = 'transparent')
      }
    >
      {children}
    </button>
  );
}

/* ==================== NewCaseDialog ==================== */

function NewCaseDialog({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [name, setName] = useState('');
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          padding: 24,
          borderRadius: 12,
          minWidth: 320,
          maxWidth: 'calc(100vw - 40px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 14,
            color: '#1d1d1f',
          }}
        >
          {t('caseList.addCase')}
        </div>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            color: '#86868b',
            marginBottom: 4,
          }}
        >
          {t('caseList.caseName')}
        </label>
        <input
          type="text"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Enter' && name.trim()) onCreate(name);
            if (e.key === 'Escape') onCancel();
          }}
          placeholder={t('caseList.caseNamePlaceholder')}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            border: '1px solid #d2d2d7',
            borderRadius: 6,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            marginBottom: 18,
          }}
        />
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px',
              fontSize: 14,
              background: '#ffffff',
              border: '1px solid #d2d2d7',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: '#1d1d1f',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onCreate(name)}
            disabled={!name.trim()}
            style={{
              padding: '8px 18px',
              fontSize: 14,
              background: '#007aff',
              border: 'none',
              borderRadius: 6,
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              color: '#ffffff',
              opacity: name.trim() ? 1 : 0.4,
            }}
          >
            {t('caseList.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
