import { useEffect, useRef, useState } from 'react';
import type { Genogram } from '../../types/genogram';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import { ExportDialog, ImportDialog } from './ExportImportDialog';

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

  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exportTarget, setExportTarget] = useState<string | null>(null);

  useEffect(() => {
    loadCaseList();
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
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: '#1d1d1f',
                margin: 0,
                marginBottom: 4,
              }}
            >
              {t('caseList.title')}
            </h1>
            <div style={{ fontSize: 13, color: '#86868b' }}>
              {t('caseList.subtitle')}
            </div>
          </div>
          <button
            onClick={() => setShowTutorial(true)}
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
            title={t('caseList.tutorialTitle')}
          >
            {t('caseList.tutorial')}
          </button>
        </div>

        {/* New Case + Import Buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          <button
            onClick={() => setShowNew(true)}
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

        {/* Case List */}
        <div
          style={{
            fontSize: 13,
            color: '#86868b',
            marginBottom: 12,
            paddingLeft: 4,
          }}
        >
          {t('caseList.allCases')} ({caseList.length})
        </div>

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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {caseList.map((c) => (
              <CaseCard
                key={c.id}
                genogram={c}
                onOpen={() => openCase(c.id)}
                onRename={async (newName) => {
                  await renameCase(c.id, newName);
                }}
                onDelete={async () => {
                  const ok = await showConfirm(
                    t('caseList.deleteConfirm', { name: c.caseName }),
                  );
                  if (ok) await deleteCase(c.id);
                }}
                onExport={() => setExportTarget(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <NewCaseDialog
          onCreate={async (name) => {
            setShowNew(false);
            await createCase(name);
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
    </div>
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
