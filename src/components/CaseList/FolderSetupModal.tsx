import { selectRootFolder } from '../../services/fileSystem';

/**
 * 「選資料夾」設定畫面
 * — 使用者點「新增個案」時,若還沒設過資料夾就跳出來提醒
 * — 可選擇「選資料夾」(寫到本機資料夾)或「暫時不要」(只存瀏覽器)
 */
export default function FolderSetupModal({
  onClose,
  onSelected,
}: {
  onClose: () => void;
  onSelected: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 250,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: 'calc(100vw - 40px)',
          background: '#ffffff',
          borderRadius: 14,
          padding: 24,
          boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 4 }}>📁</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#1d1d1f',
            marginBottom: 12,
          }}
        >
          選一個資料夾,讓資料安全地存在你電腦
        </div>
        <p
          style={{
            fontSize: 13,
            color: '#3a3a3c',
            lineHeight: 1.7,
            margin: '0 0 12px',
          }}
        >
          <strong style={{ color: '#007aff' }}>強烈建議現在設定。</strong>
          設好後,你的所有個案會自動寫一份到資料夾備份。
          就算瀏覽器資料被清掉,只要這個資料夾還在,個案就救得回來。
        </p>
        <ul
          style={{
            fontSize: 12,
            color: '#3a3a3c',
            lineHeight: 1.8,
            margin: '0 0 16px',
            paddingLeft: 18,
          }}
        >
          <li>每個個案會在資料夾裡有獨立子資料夾(<code>case_xxx/</code>)</li>
          <li>個案資料存 <code>case.json</code> · 附件存 <code>attachments/</code></li>
          <li>換電腦時:複製資料夾 → 新電腦選同樣資料夾 → 個案全回來</li>
          <li>之後想換資料夾:首頁 → 📁 切換資料夾 或 主選單 → 📁 設定資料夾</li>
        </ul>
        <div
          style={{
            fontSize: 11,
            color: '#86868b',
            lineHeight: 1.6,
            background: '#f5f5f7',
            padding: '8px 10px',
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          ⚠️ 此功能需要桌面 Chrome / Edge。
          手機 / Safari 不支援,只能用瀏覽器內建儲存(可手動匯出 .json 備份)。
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              background: '#ffffff',
              border: '1px solid #d2d2d7',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#86868b',
              fontFamily: 'inherit',
            }}
          >
            暫時不要
          </button>
          <button
            onClick={async () => {
              const h = await selectRootFolder();
              if (h) onSelected();
            }}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              background: '#007aff',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}
          >
            選資料夾
          </button>
        </div>
      </div>
    </div>
  );
}
