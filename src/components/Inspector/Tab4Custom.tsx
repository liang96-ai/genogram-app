import { useEffect, useState } from 'react';
import { PlusGlyph } from '../PlusGlyph';
import { useGenogramStore } from '../../store/genogramStore';
import { useT } from '../../i18n';
import ScaleSummary from './ScaleSummary';
import {
  isFileSystemAccessSupported,
  selectRootFolder,
  writeAttachment,
  readAttachment,
  deleteAttachmentFile,
  uniqueFilename,
  getRootDirHandle,
  loadRootDirHandle,
} from '../../services/fileSystem';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  fontSize: 13,
  border: '1px solid #d2d2d7',
  borderRadius: 4,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  background: '#ffffff',
};

export default function Tab4Custom() {
  const t = useT();
  const currentCase = useGenogramStore((s) => s.currentCase);
  const addInterviewNote = useGenogramStore((s) => s.addInterviewNote);
  const updateInterviewNote = useGenogramStore(
    (s) => s.updateInterviewNote,
  );
  const removeInterviewNote = useGenogramStore(
    (s) => s.removeInterviewNote,
  );
  const addAttachment = useGenogramStore((s) => s.addAttachment);
  const removeAttachment = useGenogramStore((s) => s.removeAttachment);

  const [hasRootDir, setHasRootDir] = useState(!!getRootDirHandle());
  const fsSupported = isFileSystemAccessSupported();

  // App 載入時 fileSystem.ts 會 try load handle,這邊只需 reflect 狀態
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const h = await loadRootDirHandle();
      if (!cancelled) setHasRootDir(!!h);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!currentCase) {
    return (
      <div style={{ padding: 20, color: '#86868b', fontSize: 13 }}>
        {t('tab4.openCaseFirst')}
      </div>
    );
  }

  const notes = currentCase.interviewNotes ?? [];
  const attachments = currentCase.attachments ?? [];

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>
      {/* === 量表分數 === */}
      <SectionTitle title={t('tab4.scaleScores')} />
      <ScaleSummary />

      {/* === 訪談筆記 === */}
      <SectionTitle
        title={`${t('tab4.interviewNotes')} (${notes.length})`}
        action={
          <button
            onClick={() =>
              addInterviewNote({
                date: new Date().toISOString(),
                content: '',
              })
            }
            style={inlineAddBtn}
            title={t('common.addItem')}
          >
            <PlusGlyph size={13} stroke={1.8} />
          </button>
        }
      />
      {notes.length === 0 ? (
        <div style={{ fontSize: 12, color: '#86868b', padding: 4 }}>
          {t('tab4.notesEmpty')}
        </div>
      ) : (
        notes
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((n) => (
            <NoteCard
              key={n.id}
              date={n.date}
              content={n.content}
              onChangeDate={(date) => updateInterviewNote(n.id, { date })}
              onChangeContent={(content) =>
                updateInterviewNote(n.id, { content })
              }
              onDelete={() => removeInterviewNote(n.id)}
            />
          ))
      )}

      {/* === 文件附件 === */}
      <SectionTitle
        title={`${t('tab4.attachments')} (${attachments.length})`}
        action={
          <AttachmentAdder
            caseId={currentCase.id}
            fsSupported={fsSupported}
            hasRootDir={hasRootDir}
            onSetupFolder={async () => {
              const h = await selectRootFolder();
              if (h) setHasRootDir(true);
            }}
            onAddInFolder={(filename, size, mime) =>
              addAttachment({ filename, inFolder: true, size, mime })
            }
            onAddLink={(filename, url) =>
              addAttachment({ filename, url })
            }
          />
        }
      />
      {attachments.length === 0 ? (
        <div style={{ fontSize: 12, color: '#86868b', padding: 4 }}>
          {t('tab4.attachmentsEmpty')}
        </div>
      ) : (
        attachments.map((att) => (
          <AttachmentRow
            key={att.id}
            caseId={currentCase.id}
            filename={att.filename}
            url={att.url}
            inFolder={!!att.inFolder}
            size={att.size}
            mime={att.mime}
            onDelete={async () => {
              if (att.inFolder) {
                await deleteAttachmentFile(currentCase.id, att.filename);
              }
              removeAttachment(att.id);
            }}
          />
        ))
      )}

      {/* 資料夾狀態提示 */}
      {fsSupported && !hasRootDir && (
        <div
          style={{
            marginTop: 16,
            padding: 10,
            background: '#fff8e1',
            border: '1px solid #ffe0a3',
            borderRadius: 6,
            fontSize: 11,
            color: '#86868b',
            lineHeight: 1.5,
          }}
        >
          {t('tab4.fsHint', { id: currentCase.id })}
        </div>
      )}
      {!fsSupported && (
        <div
          style={{
            marginTop: 16,
            padding: 10,
            background: '#fff0f0',
            border: '1px solid #ffd0d0',
            borderRadius: 6,
            fontSize: 11,
            color: '#86868b',
            lineHeight: 1.5,
          }}
        >
          {t('tab4.fsUnsupported')}
        </div>
      )}
    </div>
  );
}

// ============ 子元件 ============

function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
        color: '#1d1d1f',
        marginTop: 12,
        marginBottom: 8,
        borderBottom: '1px solid #e5e4e7',
        paddingBottom: 4,
        height: 22,
      }}
    >
      <span>{title}</span>
      {action}
    </div>
  );
}

function NoteCard({
  date,
  content,
  onChangeDate,
  onChangeContent,
  onDelete,
}: {
  date: string;
  content: string;
  onChangeDate: (v: string) => void;
  onChangeContent: (v: string) => void;
  onDelete: () => void;
}) {
  const t = useT();
  // ISO datetime → datetime-local input 格式 YYYY-MM-DDTHH:mm
  const toLocal = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate(),
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return (
    <div
      style={{
        marginBottom: 8,
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
          gap: 8,
          marginBottom: 6,
        }}
      >
        <input
          type="datetime-local"
          value={toLocal(date)}
          onChange={(e) => {
            const v = e.target.value;
            if (v) onChangeDate(new Date(v).toISOString());
          }}
          style={{
            fontSize: 12,
            padding: '3px 6px',
            border: '1px solid #d2d2d7',
            borderRadius: 4,
          }}
        />
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
          title={t('tab4.deleteNote')}
        >
          ×
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => onChangeContent(e.target.value)}
        placeholder={t('tab4.notePlaceholder')}
        style={{
          ...inputStyle,
          minHeight: 70,
          resize: 'vertical',
          background: '#fff',
        }}
      />
    </div>
  );
}

function AttachmentAdder({
  caseId,
  fsSupported,
  hasRootDir,
  onSetupFolder,
  onAddInFolder,
  onAddLink,
}: {
  caseId: string;
  fsSupported: boolean;
  hasRootDir: boolean;
  onSetupFolder: () => Promise<void>;
  onAddInFolder: (filename: string, size: number, mime: string) => void;
  onAddLink: (filename: string, url: string) => void;
}) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');

  const handlePickFile = async () => {
    setMenuOpen(false);
    if (!fsSupported) return;
    if (!hasRootDir) {
      await onSetupFolder();
      // 取消選擇 → 中止
      if (!getRootDirHandle()) return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      for (const file of files) {
        const filename = await uniqueFilename(caseId, file.name);
        const ok = await writeAttachment(caseId, filename, file);
        if (ok) {
          onAddInFolder(filename, file.size, file.type);
        }
      }
    };
    input.click();
  };

  return (
    <>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        style={inlineAddBtn}
        title={t('common.add')}
      >
        <PlusGlyph size={13} stroke={1.8} />
      </button>
      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            background: '#fff',
            border: '1px solid #d2d2d7',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 10,
            padding: 4,
            minWidth: 160,
          }}
        >
          {fsSupported && (
            <MenuOption onClick={handlePickFile}>
              {t('tab4.uploadFile')}
            </MenuOption>
          )}
          <MenuOption
            onClick={() => {
              setMenuOpen(false);
              setLinkOpen(true);
            }}
          >
            {t('tab4.addLink')}
          </MenuOption>
        </div>
      )}
      {linkOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setLinkOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              padding: 16,
              borderRadius: 8,
              maxWidth: 400,
              width: '100%',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              {t('tab4.linkDialogTitle')}
            </div>
            <input
              type="text"
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              placeholder={t('tab4.linkNamePlaceholder')}
              style={{ ...inputStyle, marginBottom: 6 }}
            />
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder={t('tab4.linkUrlPlaceholder')}
              style={inputStyle}
            />
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 12,
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setLinkOpen(false)}
                style={ghostBtn}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  const n = linkName.trim() || linkUrl.trim();
                  const u = linkUrl.trim();
                  if (n && u) onAddLink(n, u);
                  setLinkName('');
                  setLinkUrl('');
                  setLinkOpen(false);
                }}
                style={primaryBtn}
              >
                {t('tab4.addLinkBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MenuOption({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '8px 10px',
        fontSize: 12,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        borderRadius: 4,
      }}
      onMouseEnter={(e) =>
        ((e.target as HTMLElement).style.background = '#f5f5f7')
      }
      onMouseLeave={(e) =>
        ((e.target as HTMLElement).style.background = 'transparent')
      }
    >
      {children}
    </button>
  );
}

function AttachmentRow({
  caseId,
  filename,
  url,
  inFolder,
  size,
  mime,
  onDelete,
}: {
  caseId: string;
  filename: string;
  url?: string;
  inFolder: boolean;
  size?: number;
  mime?: string;
  onDelete: () => void;
}) {
  const t = useT();
  const open = async () => {
    if (inFolder) {
      const file = await readAttachment(caseId, filename);
      if (file) {
        const u = URL.createObjectURL(file);
        window.open(u, '_blank');
        setTimeout(() => URL.revokeObjectURL(u), 60_000);
      }
    } else if (url) {
      // noopener:使用者自填的外部網址,不給對方 window.opener(防反向綁架)
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  const sizeKb = size ? Math.round(size / 1024) : null;
  const icon = inFolder ? '📎' : '🔗';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        marginBottom: 4,
        border: '1px solid #e5e4e7',
        borderRadius: 4,
        fontSize: 12,
      }}
    >
      <span>{icon}</span>
      <button
        onClick={open}
        style={{
          flex: 1,
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          color: '#007aff',
          cursor: 'pointer',
          padding: 0,
          fontSize: 12,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={url ?? filename}
      >
        {filename}
      </button>
      {sizeKb !== null && (
        <span style={{ color: '#86868b', fontSize: 11 }}>
          {sizeKb} KB
        </span>
      )}
      {mime && (
        <span style={{ color: '#86868b', fontSize: 11 }}>
          {mime.split('/')[1] || mime}
        </span>
      )}
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
        title={t('common.delete')}
      >
        ×
      </button>
    </div>
  );
}

const inlineAddBtn: React.CSSProperties = {
  width: 14,
  height: 14,
  background: '#007aff',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  padding: '6px 14px',
  background: '#007aff',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};
const ghostBtn: React.CSSProperties = {
  padding: '6px 14px',
  background: 'transparent',
  color: '#1d1d1f',
  border: '1px solid #d2d2d7',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
};
