import { Suspense, lazy, useEffect, useRef, useState } from 'react';
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
  getConfiguredRootHandle,
  wipeAppFilesInFolder,
} from '../../services/fileSystem';
import { db } from '../../services/database';
import { syncAfterFolderPick } from '../../services/folderSync';
import { daysSinceBackupIfShouldRemind } from '../../services/backupReminder';
import FeedbackDialog from './FeedbackDialog';
import PrivacyWelcomeDialog, {
  hasAcknowledgedPrivacy,
  markAcknowledged,
} from './PrivacyWelcomeDialog';
import WelcomeCard from '../Onboarding/WelcomeCard';
import { hasSeenGuidedTour } from '../Onboarding/tourSeen';
import FolderSetupModal from './FolderSetupModal';
import AboutDialog from '../About/AboutDialog';
import { SupportDialog } from '../About/SupportDialog';
import Icon, { BrandMark } from '../ui/Icon';
import EyeComfortButton from '../EyeComfort/EyeComfortButton';


// 符號圖例 lazy 拆包(#127)— 開圖例時才載入(symbolData 本身被 Tab1/Tab2 引用,仍在主包)
const SymbolGallery = lazy(() => import('../Gallery/SymbolGallery'));
const KinshipDialog = lazy(() => import('../Kinship/KinshipDialog'));

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [exportTarget, setExportTarget] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [kinshipOpen, setKinshipOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  // 個案已刪除、但資料夾備份檔因權限休眠刪不掉 → 提示手動清(#125)
  const [folderDeleteWarn, setFolderDeleteWarn] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  // 第一次開啟才彈隱私說明(localStorage flag 控制只彈一次)
  // 第一次打開只出現歡迎卡(1.6.0);完整隱私說明從徽章或歡迎卡的連結打開
  const [welcomeOpen, setWelcomeOpen] = useState(() => !hasAcknowledgedPrivacy());
  const [privacyWelcomeOpen, setPrivacyWelcomeOpen] = useState(
    () => false,
  );
  // 點「新增個案」時若還沒設資料夾,先彈資料夾提醒;
  // 提醒關閉(選了或暫時不要)後再開 NewCaseDialog
  const [folderPromptForNew, setFolderPromptForNew] = useState(false);
  // 備份提醒(2026-08-27 決議):單份資料使用者的安全網;未按掉前每次回首頁都會出現,按掉後這個 session 不再出現
  const [backupRemindDays, setBackupRemindDays] = useState<
    number | 'never' | null
  >(null);
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
    if (!sessionStorage.getItem('backupRemindDismissed')) {
      daysSinceBackupIfShouldRemind()
        .then((d) => setBackupRemindDays(d))
        .catch(() => {});
    }
  }, [loadCaseList]);

  const [supportOpen, setSupportOpen] = useState(false);
  // 新建個案之後,第一次用的人自動開始「帶著做一次」
  const startTourIfNew = () => {
    if (!hasSeenGuidedTour()) useGenogramStore.getState().setTourActive(true);
  };
  const startFirstCase = async () => {
    markAcknowledged();
    setWelcomeOpen(false);
    await createCase(t('caseList.untitledCase'));
    startTourIfNew();
  };
  // 選資料夾:選單與提醒列共用(選完照固定流程同步,services/folderSync)
  const pickFolder = async (): Promise<boolean> => {
    const h = await selectRootFolder();
    if (!h) return false;
    setFolderName(h.name);
    const restored = await syncAfterFolderPick();
    await loadCaseList();
    if (restored > 0) alert(t('caseList.folderRescued', { n: restored }));
    return true;
  };
  // 安裝成 App:兩段式,先問要不要裝(可以按稍後),同意了才動作
  const installApp = async () => {
    const ok = await showConfirm(t('install.confirm'), {
      yes: t('install.yes'),
      no: t('install.later'),
      tone: 'normal',
    });
    if (!ok) return;
    if (canInstall) {
      const r = await triggerInstall();
      if (r !== 'unavailable') return;
    }
    await showConfirm(isIOS ? t('install.stepsIOS') : t('install.stepsDesktop'), {
      yes: t('install.gotIt'),
      no: t('common.close'),
      tone: 'normal',
    });
  };

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
          paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 20px)',
          paddingRight: 'calc(env(safe-area-inset-right, 0px) + 20px)',
        }}
      >
        {/* ── C 蘋果首頁:頂列(☰ 漢堡 + 👁 護眼 + 🧋 支持 一組靠左,隱私徽章靠右)+ Hero ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 20,
          }}
        >
          <div data-home-menu ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              title={t('caseList.menuTitle')}
              aria-label={t('caseList.menuTitle')}
              style={{
                width: 40,
                height: 36,
                padding: 0,
                background: '#ffffff',
                border: '0.5px solid #d2d2d7',
                borderRadius: 9,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'inherit',
                fontSize: 20,
                lineHeight: 1,
                color: '#1d1d1f',
              }}
            >
              {/* 三橫線漢堡 — 與編輯器選單鈕(App.tsx)同一組,保持一致 */}
              <svg width="18" height="14" viewBox="0 0 18 14">
                <line x1="0" y1="1" x2="18" y2="1" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" />
                <line x1="0" y1="7" x2="18" y2="7" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" />
                <line x1="0" y1="13" x2="18" y2="13" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 44,
                  left: 0,
                  minWidth: 240,
                  padding: 4,
                  background: '#ffffff',
                  border: '1px solid #e5e4e7',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  zIndex: 100,
                }}
              >
                <HomeMenuItem
                  icon={<Icon name="book" />}
                  label={t('menu.manual')}
                  onClick={() => {
                    setShowTutorial(true);
                    setMenuOpen(false);
                  }}
                />
                <HomeMenuItem
                  icon={<Icon name="shapes" />}
                  label={t('menu.symbolGallery')}
                  onClick={() => {
                    setGalleryOpen(true);
                    setMenuOpen(false);
                  }}
                />
                <HomeMenuItem
                  icon={<Icon name="family" />}
                  label={t('kinship.menuLabel')}
                  onClick={() => {
                    setKinshipOpen(true);
                    setMenuOpen(false);
                  }}
                />
                <MenuSeparator />
                {fsaSupported && (
                  <HomeMenuItem
                    icon={<Icon name="folder" />}
                    label={folderName ? t('menu.folderCurrent', { name: folderName }) : t('menu.folderSetup')}
                    onClick={() => {
                      setMenuOpen(false);
                      void pickFolder();
                    }}
                  />
                )}
                <HomeMenuItem
                  icon={<Icon name="share" />}
                  label={t('menu.shareTool')}
                  onClick={() => {
                    setShowShare(true);
                    setMenuOpen(false);
                  }}
                />
                {!isStandalone && (
                  <HomeMenuItem
                    icon={<Icon name="install" />}
                    label={t('caseList.install')}
                    onClick={() => {
                      setMenuOpen(false);
                      void installApp();
                    }}
                  />
                )}
                <MenuSeparator />
                <HomeMenuItem
                  icon={<Icon name="mail" />}
                  label={t('menu.feedback')}
                  onClick={() => {
                    setFeedbackOpen(true);
                    setMenuOpen(false);
                  }}
                />
                <HomeMenuItem
                  icon={<Icon name="heart" />}
                  label={t('menu.support')}
                  onClick={() => {
                    setSupportOpen(true);
                    setMenuOpen(false);
                  }}
                />
                <HomeMenuItem
                  icon={<Icon name="info" />}
                  label={t('about.title')}
                  onClick={() => {
                    setAboutOpen(true);
                    setMenuOpen(false);
                  }}
                />
                <MenuSeparator />
                {/* 全部重置 — 危險動作,紅字、收在最底 */}
                <button
                  onClick={async () => {
                    const ok = await showConfirm(
                      t('caseList.fullResetConfirm', { n: caseList.length }),
                    );
                    if (!ok) return;
                    // 備份資料夾裡還有個案檔:不問就留著,等於沒刪乾淨(重選同一個資料夾會全部救回來)。
                    // 權限休眠時記憶體裡沒有 handle,要從設定讀回來,否則這一問會被跳過
                    const folderHandle = await getConfiguredRootHandle();
                    if (folderHandle) {
                      const folder = folderHandle.name;
                      const wipeFolder = await showConfirm(
                        t('caseList.fullResetFolderAsk', { folder }),
                        {
                          yes: t('caseList.fullResetFolderYes'),
                          no: t('caseList.fullResetFolderNo'),
                          tone: 'danger',
                        },
                      );
                      if (wipeFolder && !(await wipeAppFilesInFolder(folderHandle))) {
                        alert(t('caseList.fullResetFolderFailed', { folder }));
                      }
                    }
                    try {
                      await db.cases.clear();
                      await db.settings.clear();
                      localStorage.clear();
                      sessionStorage.clear();
                      if ('caches' in window) {
                        const keys = await caches.keys();
                        await Promise.all(keys.map((k) => caches.delete(k)));
                      }
                      if ('serviceWorker' in navigator) {
                        const regs =
                          await navigator.serviceWorker.getRegistrations();
                        await Promise.all(regs.map((r) => r.unregister()));
                      }
                    } catch (err) {
                      console.error('Full reset failed:', err);
                    }
                    location.reload();
                  }}
                  title={t('caseList.fullResetTitle')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    color: '#ff3b30',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    gap: 8,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#fff1f0')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center' }}>
                    <Icon name="trash" />
                  </span>
                  <span style={{ flex: 1 }}>{t('caseList.fullReset')}</span>
                </button>
              </div>
            )}
          </div>
          {/* 隱私徽章 — 推到頂列最右(order:2 + marginLeft:auto);只有藥丸本體可點 */}
          <div
            style={{
              order: 2,
              marginLeft: 'auto',
            }}
          >
            <span
              onClick={() => setPrivacyWelcomeOpen(true)}
              title={t('privacy.welcomeTitle')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPrivacyWelcomeOpen(true);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                color: '#1a7a3f',
                background: '#e8f5ec',
                border: '1px solid #c5e8d2',
                padding: '5px 12px',
                borderRadius: 999,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon name="lock" size={14} />
              {t('caseList.subtitle')}
            </span>
          </div>
          {/* 頂列只留:選單、護眼、語言、隱私徽章(1.6.0)。
              資料夾、分享、安裝、回報、支持收進選單,每個都有文字 —— 以前六顆只有 emoji 的按鈕,第一次來的人猜不出來。 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, order: 1 }}>
            <EyeComfortButton size="lg" />
            <button
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              title={t('menu.language')}
              aria-label={t('menu.language')}
              style={{
                height: 36,
                padding: '0 12px',
                background: '#ffffff',
                border: '0.5px solid #d2d2d7',
                borderRadius: 9,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'inherit',
                fontSize: 13,
                color: '#1d1d1f',
              }}
            >
              <Icon name="globe" size={17} />
              {language === 'zh' ? 'English' : '中文'}
            </button>
          </div>
        </div>
        {/* Hero — 置中:🌳 與標題同排 + 建立新個案 + 匯入/備份 */}
        <div style={{ textAlign: 'center', padding: '8px 0 34px' }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: '-0.5px',
              color: '#1d1d1f',
              margin: '0 0 4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <BrandMark size={40} />
            {t('caseList.title')}
          </h1>
          <div style={{ marginTop: 26 }}>
            <button
              onClick={() => {
                if (fsaSupported && !folderName && !folderPromptSeen()) {
                  markFolderPromptSeen();
                  setFolderPromptForNew(true);
                } else {
                  setShowNew(true);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
                padding: '14px 34px',
                fontSize: 15.5,
                fontWeight: 500,
                background: '#007aff',
                color: '#ffffff',
                border: 'none',
                borderRadius: 999,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 1px 6px rgba(0,122,255,0.32)',
              }}
            >
              <span style={{ fontSize: 18 }}>＋</span>
              <span>{t('caseList.addCase')}</span>
            </button>
          </div>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              gap: 22,
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => setShowImport(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'transparent',
                border: 'none',
                color: '#007aff',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Icon name="import" size={16} />
              {t('caseList.import')}
            </button>
            {caseList.length > 0 && (
              <button
                onClick={() => setExportTarget('__backup__')}
                title={t('caseList.backupTitle')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'transparent',
                  border: 'none',
                  color: '#007aff',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Icon name="backup" size={16} />
                {t('caseList.backup')}
              </button>
            )}
          </div>
        </div>

        {/* 資料夾警告區塊 — 只在「FSA 支援 + 還沒選資料夾」時顯示
            選了資料夾後就完全隱藏(資料夾名稱在主選單裡看) */}
        {fsaSupported && !folderName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 16,
              fontSize: 13,
              color: '#6e6e73',
            }}
          >
            <Icon name="folder" size={15} />
            <span>{t('caseList.folderHint')}</span>
            <button
              onClick={() => void pickFolder()}
              title={t('caseList.folderSwitchTitle')}
              style={{
                padding: 0,
                fontSize: 13,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#007aff',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              {t('caseList.folderHintAction')}
            </button>
          </div>
        )}
        {/* 刪除個案但資料夾備份檔未能一併移除(權限休眠)的提示(#125) */}
        {folderDeleteWarn && (
          <div
            role="alert"
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
            <Icon name="warning" size={16} style={{ color: '#b25000' }} />
            <span style={{ flex: 1, color: '#8a6d3b' }}>
              {t('caseList.folderDeleteFailed')}
            </span>
            <button
              onClick={() => setFolderDeleteWarn(false)}
              aria-label={t('common.close')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8a6d3b',
                cursor: 'pointer',
                fontSize: 14,
                padding: '2px 6px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 備份提醒橫幅 —— 只對「沒資料夾備份 + 久未全備份 + 有編輯」的使用者出現 */}
        {backupRemindDays !== null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: '#fdf3e4',
              border: '1px solid #ecd3a7',
              borderRadius: 10,
              marginBottom: 14,
              fontSize: 13,
              color: '#7a5200',
              flexWrap: 'wrap',
            }}
          >
            <Icon name="clock" size={16} />
            <span style={{ flex: 1, minWidth: 200 }}>
              {backupRemindDays === 'never'
                ? t('backupRemind.textNever')
                : t('backupRemind.text', { days: backupRemindDays ?? 0 })}
            </span>
            <button
              onClick={() => {
                sessionStorage.setItem('backupRemindDismissed', '1');
                setBackupRemindDays(null);
                setExportTarget('__backup__');
              }}
              style={{
                padding: '5px 14px',
                fontSize: 12.5,
                background: '#007aff',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              {t('backupRemind.doIt')}
            </button>
            <button
              onClick={() => {
                sessionStorage.setItem('backupRemindDismissed', '1');
                setBackupRemindDays(null);
              }}
              style={{
                padding: '5px 12px',
                fontSize: 12.5,
                background: 'transparent',
                border: '1px solid #d9b97a',
                borderRadius: 6,
                cursor: 'pointer',
                color: '#7a5200',
                fontFamily: 'inherit',
              }}
            >
              {t('backupRemind.later')}
            </button>
          </div>
        )}
        {/* 搜尋(2026-08-27 決議)— caseload 50-150 案是台灣社工常態,肉眼掃卡片牆不現實 */}
        {caseList.length > 0 && (
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('caseList.searchPlaceholder')}
            style={{
              width: '100%',
              padding: '9px 14px',
              fontSize: 14,
              border: '1px solid #d2d2d7',
              borderRadius: 9,
              fontFamily: 'inherit',
              color: '#1d1d1f',
              boxSizing: 'border-box',
              marginBottom: 14,
              background: '#ffffff',
            }}
          />
        )}
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
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: '#b0b0b8' }}>
              <Icon name="family" size={40} strokeWidth={1.5} />
            </div>
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
            const q = searchQuery.trim().toLowerCase();
            const visible = q
              ? caseList.filter((c) => c.caseName.toLowerCase().includes(q))
              : caseList;
            const sorted = [...visible].sort((a, b) => {
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
            if (q && sorted.length === 0) {
              return (
                <div
                  style={{
                    padding: '30px 0',
                    textAlign: 'center',
                    color: '#86868b',
                    fontSize: 13,
                  }}
                >
                  {t('caseList.searchNoResult', { q: searchQuery.trim() })}
                </div>
              );
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
                              if (!ok) return;
                              // false = 資料夾備份檔刪不掉(權限休眠)→ 提示手動清(#125)
                              const folderOk = await deleteCase(c.id);
                              if (!folderOk) setFolderDeleteWarn(true);
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
            // 第一次新建個案 → 在這個個案上帶著做一次(只自動開一次)
            startTourIfNew();
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
      {supportOpen && <SupportDialog onClose={() => setSupportOpen(false)} />}
      {kinshipOpen && (
        <Suspense fallback={null}>
          <KinshipDialog onClose={() => setKinshipOpen(false)} />
        </Suspense>
      )}
      {galleryOpen && (
        <Suspense fallback={null}>
          <SymbolGallery onClose={() => setGalleryOpen(false)} />
        </Suspense>
      )}
      {aboutOpen && (
        <AboutDialog onClose={() => setAboutOpen(false)} />
      )}
      {feedbackOpen && (
        <FeedbackDialog onClose={() => setFeedbackOpen(false)} />
      )}
      {welcomeOpen && (
        <WelcomeCard
          folderSupported={fsaSupported}
          onStart={() => void startFirstCase()}
          onPickFolderFirst={async () => {
            markAcknowledged();
            setWelcomeOpen(false);
            markFolderPromptSeen();
            // 按了取消 → 回到歡迎卡,讓使用者重新選
            if (!(await pickFolder())) {
              setWelcomeOpen(true);
              return;
            }
            // 資料夾裡已經有個案(換電腦)→ 留在清單;是空的 → 直接開始第一個個案
            if (useGenogramStore.getState().caseList.length === 0) await startFirstCase();
          }}
          onLater={() => {
            markAcknowledged();
            setWelcomeOpen(false);
          }}
          onShowPrivacyDetails={() => setPrivacyWelcomeOpen(true)}
        />
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
            // 使用者選了資料夾 → 先救回資料夾裡的個案、再同步寫出 → 再開新個案 dialog
            setFolderPromptForNew(false);
            setFolderName(getRootFolderName());
            const restored = await syncAfterFolderPick();
            await loadCaseList();
            if (restored > 0) {
              alert(t('caseList.folderRescued', { n: restored }));
            }
            setShowNew(true);
          }}
        />
      )}

      {/* 版本號 — 固定右下角,來源 = package.json(vite define 注入),不擋任何操作 */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
          fontSize: 11,
          color: '#86868b',
          letterSpacing: 0.2,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 1,
        }}
      >
        v{__APP_VERSION__}
      </div>
    </div>
  );
}

/* ==================== 首頁主選單項目 ==================== */
// 新增個案時「選資料夾」的彈窗只問一次(1.6.0),之後靠首頁那一行提醒
const FOLDER_PROMPT_KEY = 'genogram_folder_prompt_seen';
function folderPromptSeen(): boolean {
  try {
    return localStorage.getItem(FOLDER_PROMPT_KEY) === '1';
  } catch {
    return false;
  }
}
function markFolderPromptSeen(): void {
  try {
    localStorage.setItem(FOLDER_PROMPT_KEY, '1');
  } catch {
    /* 寫不進去:下次新增個案會再問一次 */
  }
}

function MenuSeparator() {
  return <div style={{ height: 1, background: '#e5e4e7', margin: '4px 4px' }} />;
}

function HomeMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
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
      <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center', color: '#3a3a3c' }}>{icon}</span>
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
