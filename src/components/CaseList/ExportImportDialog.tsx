import { useEffect, useRef, useState } from 'react';
import type { Genogram } from '../../types/genogram';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import {
  applyImport,
  buildBackupExport,
  buildMultiExport,
  buildSingleExport,
  detectConflicts,
  downloadJSON,
  parseImport,
  type ConflictAction,
  type ExportBundle,
  type ImportResult,
} from '../../services/exportImport';
import {
  downloadBlob,
  exportCanvasImage,
  suggestImageFilename,
  type ImageFormat,
  type ImageRange,
} from '../../services/imageExport';

/* ==================== Export Dialog ==================== */

export type ExportTab = 'image' | 'data';

const todayString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};
const safeFn = (s: string): string =>
  s.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60) || 'untitled';

export function ExportDialog({
  defaultTab,
  defaultCaseId,
  defaultSelectAll,
  defaultIncludeSettings,
  onClose,
}: {
  defaultTab?: ExportTab;
  defaultCaseId?: string;
  defaultSelectAll?: boolean;
  defaultIncludeSettings?: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const caseList = useGenogramStore((s) => s.caseList);
  const loadCaseList = useGenogramStore((s) => s.loadCaseList);
  const currentCase = useGenogramStore((s) => s.currentCase);
  // 預設 tab:有 currentCase 時 = image,否則 = data
  const [tab, setTab] = useState<ExportTab>(
    defaultTab ?? (currentCase ? 'image' : 'data'),
  );
  // 預設勾選:全選 → 全部;defaultCaseId → 該筆;否則目前編輯中
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (defaultSelectAll) return new Set(caseList.map((c) => c.id));
    if (defaultCaseId) return new Set([defaultCaseId]);
    if (currentCase) return new Set([currentCase.id]);
    return new Set();
  });
  const [includeSettings, setIncludeSettings] = useState(
    defaultIncludeSettings ?? false,
  );

  // 圖片匯出設定
  const [imgFormat, setImgFormat] = useState<ImageFormat>('png');
  const [imgScale, setImgScale] = useState<1 | 2 | 3>(2);
  const [imgRange, setImgRange] = useState<ImageRange>('auto');
  const [imgHideDotGrid, setImgHideDotGrid] = useState(true);
  const [imgSimplifyLines, setImgSimplifyLines] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  useEffect(() => {
    if (caseList.length === 0) loadCaseList();
  }, [caseList.length, loadCaseList]);

  // 若 caseList 載入後 selectedIds 是空且需要 defaultSelectAll/defaultCaseId → 同步
  useEffect(() => {
    if (selectedIds.size > 0) return;
    if (defaultSelectAll && caseList.length > 0) {
      setSelectedIds(new Set(caseList.map((c) => c.id)));
    } else if (defaultCaseId && caseList.some((c) => c.id === defaultCaseId)) {
      setSelectedIds(new Set([defaultCaseId]));
    }
  }, [caseList, defaultSelectAll, defaultCaseId, selectedIds.size]);

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAll = () =>
    setSelectedIds(new Set(caseList.map((c) => c.id)));
  const selectNone = () => setSelectedIds(new Set());

  // 即時預覽 data 檔名
  const dataFilename = (() => {
    const count = selectedIds.size;
    if (count === 0) return '—';
    if (includeSettings) return `genogram-backup-${todayString()}.json`;
    if (count === 1) {
      const c = caseList.find((x) => selectedIds.has(x.id));
      return c ? `${safeFn(c.caseName)}.genogram.json` : 'genogram.json';
    }
    return `genogram-${count}-cases-${todayString()}.json`;
  })();

  const handleExport = async () => {
    if (tab === 'data') {
      const cases = caseList.filter((c) => selectedIds.has(c.id));
      if (cases.length === 0) return;
      if (includeSettings) {
        // backup 模式(可能是子集 + 設定)
        const bundle = await buildBackupExport();
        bundle.cases = cases;
        downloadJSON(bundle, dataFilename);
      } else if (cases.length === 1) {
        downloadJSON(buildSingleExport(cases[0]));
      } else {
        downloadJSON(buildMultiExport(cases));
      }
    } else {
      // image
      if (!currentCase) return;
      setImgBusy(true);
      setImgError(null);
      try {
        const blob = await exportCanvasImage(currentCase, {
          format: imgFormat,
          scale: imgScale,
          range: imgRange,
          hideDotGrid: imgHideDotGrid,
          simplifyLines: imgSimplifyLines,
        });
        downloadBlob(blob, suggestImageFilename(currentCase.caseName, imgFormat));
      } catch (e) {
        setImgError(e instanceof Error ? e.message : String(e));
        setImgBusy(false);
        return;
      }
      setImgBusy(false);
    }
    onClose();
  };

  const canExport =
    (tab === 'data' && selectedIds.size > 0) ||
    (tab === 'image' && !!currentCase && !imgBusy);

  return (
    <DialogShell onClose={onClose} title={t('export.title')}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        <TabButton active={tab === 'image'} onClick={() => setTab('image')}>
          {t('export.image')}
        </TabButton>
        <TabButton active={tab === 'data'} onClick={() => setTab('data')}>
          {t('export.json')}
        </TabButton>
      </div>

      {tab === 'data' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              {t('export.selectCases')} ({selectedIds.size}/{caseList.length})
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={selectAll} style={miniLinkBtn}>
                {t('export.selectAll')}
              </button>
              <span style={{ color: '#d2d2d7' }}>·</span>
              <button onClick={selectNone} style={miniLinkBtn}>
                {t('export.deselectAll')}
              </button>
            </div>
          </div>
          <div
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              border: '1px solid #e5e4e7',
              borderRadius: 6,
            }}
          >
            {caseList.length === 0 ? (
              <div
                style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: '#86868b',
                  fontSize: 12,
                }}
              >
                {t('caseList.empty')}
              </div>
            ) : (
              caseList.map((c) => (
                <label
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderBottom: '1px solid #f5f5f7',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                  />
                  <span style={{ flex: 1 }}>{c.caseName}</span>
                  <span style={{ fontSize: 11, color: '#86868b' }}>
                    {t('caseList.persons', { n: c.persons.length })}
                  </span>
                </label>
              ))
            )}
          </div>

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f5' }}>
            <Check
              checked={includeSettings}
              onChange={() => setIncludeSettings((v) => !v)}
              label={t('export.includeSettings')}
            />
          </div>

          <div
            style={{
              marginTop: 12,
              padding: 8,
              background: '#f5f5f7',
              borderRadius: 6,
              fontSize: 12,
              color: '#6e6e73',
            }}
          >
            {t('export.willDownload')}{' '}
            <code style={{ color: '#1d1d1f' }}>{dataFilename}</code>
          </div>
        </div>
      )}

      {tab === 'image' && (
        <div>
          {!currentCase ? (
            <div
              style={{
                padding: 14,
                background: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: 6,
                fontSize: 13,
                color: '#8c4a00',
              }}
            >
              {t('export.imgWarn')}
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: 12,
                  color: '#86868b',
                  marginBottom: 10,
                }}
              >
                {t('export.exportingCase')}<b>{currentCase.caseName}</b>{t('export.editing')}
              </div>

              <ImgRow label={t('export.format')}>
                <Radio
                  checked={imgFormat === 'png'}
                  onChange={() => setImgFormat('png')}
                  label={t('export.png')}
                />
                <Radio
                  checked={imgFormat === 'jpg'}
                  onChange={() => setImgFormat('jpg')}
                  label={t('export.jpg')}
                />
              </ImgRow>

              <ImgRow label={t('export.resolution')}>
                <Radio
                  checked={imgScale === 1}
                  onChange={() => setImgScale(1)}
                  label={t('export.standard')}
                />
                <Radio
                  checked={imgScale === 2}
                  onChange={() => setImgScale(2)}
                  label={t('export.hd')}
                />
                <Radio
                  checked={imgScale === 3}
                  onChange={() => setImgScale(3)}
                  label={t('export.print')}
                />
              </ImgRow>

              <ImgRow label={t('export.range')}>
                <Radio
                  checked={imgRange === 'auto'}
                  onChange={() => setImgRange('auto')}
                  label={t('export.cropAuto')}
                />
                <Radio
                  checked={imgRange === 'view'}
                  onChange={() => setImgRange('view')}
                  label={t('export.viewport')}
                />
              </ImgRow>

              <ImgRow label={t('export.options')}>
                <Check
                  checked={imgHideDotGrid}
                  onChange={() => setImgHideDotGrid((v) => !v)}
                  label={t('export.noGrid')}
                />
                <Check
                  checked={imgSimplifyLines}
                  onChange={() => setImgSimplifyLines((v) => !v)}
                  label={t('export.hidePrivate')}
                />
              </ImgRow>

              <div
                style={{
                  fontSize: 11,
                  color: '#86868b',
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                {t('export.privacyApplied')}
              </div>

              {imgError && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    background: '#fff1f0',
                    border: '1px solid #ffccc7',
                    borderRadius: 6,
                    color: '#cf1322',
                    fontSize: 12,
                  }}
                >
                  ⚠️ {imgError}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <FooterButtons
          onCancel={onClose}
          onConfirm={handleExport}
          confirmLabel={imgBusy ? t('export.processing') : t('export.download')}
          confirmDisabled={!canExport}
        />
      </div>
    </DialogShell>
  );
}

/* ==================== Import Dialog ==================== */

type ImportStep =
  | { kind: 'pick' }
  | { kind: 'preview'; bundle: ExportBundle; conflicts: Genogram[] }
  | { kind: 'done'; result: ImportResult };

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const loadCaseList = useGenogramStore((s) => s.loadCaseList);
  const [step, setStep] = useState<ImportStep>({ kind: 'pick' });
  const [error, setError] = useState<string | null>(null);
  const [conflictDecisions, setConflictDecisions] = useState<
    Map<string, ConflictAction>
  >(new Map());
  const [bulkAction, setBulkAction] = useState<ConflictAction>('duplicate');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const bundle = parseImport(text);
      const conflicts = await detectConflicts(bundle);
      const conflictCases = conflicts.map((c) => c.incoming);
      // 預設衝突動作 = duplicate
      const decisions = new Map<string, ConflictAction>();
      for (const c of conflictCases) decisions.set(c.id, 'duplicate');
      setConflictDecisions(decisions);
      setStep({ kind: 'preview', bundle, conflicts: conflictCases });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const applyAll = async () => {
    if (step.kind !== 'preview') return;
    const result = await applyImport(step.bundle, conflictDecisions);
    await loadCaseList();
    setStep({ kind: 'done', result });
  };

  const setBulk = (action: ConflictAction) => {
    if (step.kind !== 'preview') return;
    setBulkAction(action);
    const next = new Map<string, ConflictAction>();
    for (const c of step.conflicts) next.set(c.id, action);
    setConflictDecisions(next);
  };

  return (
    <DialogShell onClose={onClose} title={t('import.title')}>
      {step.kind === 'pick' && (
        <div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 12 }}>
            {t('import.selectFile')}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            style={primaryBtnStyle}
          >
            {t('import.selectFileBtn')}
          </button>
          {error && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                background: '#fff1f0',
                border: '1px solid #ffccc7',
                borderRadius: 6,
                color: '#cf1322',
                fontSize: 12,
              }}
            >
              ⚠️ {error}
            </div>
          )}
          <div style={{ marginTop: 18 }}>
            <FooterButtons onCancel={onClose} confirmLabel={null} />
          </div>
        </div>
      )}

      {step.kind === 'preview' && (
        <div>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            {t('import.containsCases')} <b>{step.bundle.cases.length}</b> {t('import.cases')}
            {step.conflicts.length > 0 && (
              <>,{t('import.conflict')} <b style={{ color: '#ff9500' }}>
                {step.conflicts.length}
              </b> {t('import.conflictWith')}</>
            )}
            。
          </div>

          {step.conflicts.length === 0 ? (
            <div
              style={{
                padding: 12,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 6,
                fontSize: 13,
                color: '#166534',
              }}
            >
              {t('import.noConflict')}
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 8,
                  padding: '6px 8px',
                  background: '#f5f5f7',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                <span style={{ color: '#86868b' }}>{t('import.setAllAs')}</span>
                <BulkButton
                  active={bulkAction === 'duplicate'}
                  onClick={() => setBulk('duplicate')}
                >
                  {t('import.newCopy')}
                </BulkButton>
                <BulkButton
                  active={bulkAction === 'overwrite'}
                  onClick={() => setBulk('overwrite')}
                >
                  {t('import.overwrite')}
                </BulkButton>
                <BulkButton
                  active={bulkAction === 'skip'}
                  onClick={() => setBulk('skip')}
                >
                  {t('import.skip')}
                </BulkButton>
              </div>
              <div
                style={{
                  maxHeight: 200,
                  overflowY: 'auto',
                  border: '1px solid #e5e4e7',
                  borderRadius: 6,
                }}
              >
                {step.conflicts.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid #f5f5f7',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      {c.caseName}
                    </div>
                    <div
                      style={{ display: 'flex', gap: 6, marginTop: 4 }}
                    >
                      {(['duplicate', 'overwrite', 'skip'] as const).map(
                        (action) => (
                          <label
                            key={action}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              cursor: 'pointer',
                              fontSize: 11,
                              color: '#6e6e73',
                            }}
                          >
                            <input
                              type="radio"
                              checked={
                                conflictDecisions.get(c.id) === action
                              }
                              onChange={() => {
                                setConflictDecisions((m) => {
                                  const next = new Map(m);
                                  next.set(c.id, action);
                                  return next;
                                });
                              }}
                            />
                            {action === 'duplicate'
                              ? t('import.newCopy')
                              : action === 'overwrite'
                                ? t('import.overwriteShort')
                                : t('import.skip')}
                          </label>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 18 }}>
            <FooterButtons
              onCancel={onClose}
              onConfirm={applyAll}
              confirmLabel={t('import.apply')}
            />
          </div>
        </div>
      )}

      {step.kind === 'done' && (
        <div>
          <div
            style={{
              padding: 14,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 6,
              fontSize: 13,
              color: '#166534',
              lineHeight: 1.7,
            }}
          >
            {t('import.done')}
            <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
              <li>{t('import.added', { n: step.result.added })}</li>
              <li>{t('import.overwritten', { n: step.result.overwritten })}</li>
              <li>{t('import.skipped', { n: step.result.skipped })}</li>
            </ul>
          </div>
          <div style={{ marginTop: 18 }}>
            <FooterButtons onCancel={onClose} confirmLabel={null} cancelLabel={t('import.complete')} />
          </div>
        </div>
      )}
    </DialogShell>
  );
}

/* ==================== Shared UI ==================== */

function DialogShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  // Esc 關閉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          padding: 24,
          borderRadius: 12,
          minWidth: 380,
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
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 12px',
        fontSize: 13,
        background: active ? '#007aff' : '#ffffff',
        color: active ? '#ffffff' : '#1d1d1f',
        border: '1px solid ' + (active ? '#007aff' : '#d2d2d7'),
        borderRadius: 6,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function ImgRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 0',
        fontSize: 13,
      }}
    >
      <div
        style={{
          width: 64,
          color: '#86868b',
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}

function Radio({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        cursor: 'pointer',
        fontSize: 12,
        color: '#1d1d1f',
      }}
    >
      <input type="radio" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        cursor: 'pointer',
        fontSize: 12,
        color: '#1d1d1f',
      }}
    >
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function BulkButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 8px',
        fontSize: 11,
        background: active ? '#007aff' : '#ffffff',
        color: active ? '#ffffff' : '#1d1d1f',
        border: '1px solid ' + (active ? '#007aff' : '#d2d2d7'),
        borderRadius: 4,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function FooterButtons({
  onCancel,
  onConfirm,
  confirmLabel,
  confirmDisabled,
  cancelLabel,
}: {
  onCancel: () => void;
  onConfirm?: () => void;
  confirmLabel: string | null;
  confirmDisabled?: boolean;
  cancelLabel?: string;
}) {
  const t = useT();
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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
        {cancelLabel ?? t('common.cancel')}
      </button>
      {confirmLabel && onConfirm && (
        <button
          onClick={onConfirm}
          disabled={confirmDisabled}
          style={{
            padding: '8px 18px',
            fontSize: 14,
            background: '#007aff',
            border: 'none',
            borderRadius: 6,
            cursor: confirmDisabled ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            color: '#ffffff',
            opacity: confirmDisabled ? 0.4 : 1,
          }}
        >
          {confirmLabel}
        </button>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#86868b',
  marginBottom: 4,
};

const miniLinkBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  fontSize: 11,
  color: '#007aff',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  fontSize: 14,
  background: '#007aff',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
