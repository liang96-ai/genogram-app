import { Component, type ReactNode } from 'react';
import { db } from '../services/database';
import { buildBackupExport, downloadJSON } from '../services/exportImport';

/**
 * 最外層錯誤防護網(#118)
 * — 任何 render 錯誤不再白屏:顯示說明 + 「下載所有個案備份」逃生門
 * — 文案中英並列、刻意不走 i18n(若 i18n 本身是壞掉的源頭,這裡仍要能渲染)
 */

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('App crashed:', error);
  }

  private downloadAll = async () => {
    try {
      // 跟正常匯出同格式(可直接從匯入功能還原)
      const bundle = await buildBackupExport();
      downloadJSON(bundle);
    } catch (err) {
      console.error('emergency export failed:', err);
      // 最後手段:繞過 settings 直接撈個案
      try {
        const cases = await db.cases.toArray();
        downloadJSON({
          schemaVersion: '1.0',
          exportType: 'backup',
          exportedAt: new Date().toISOString(),
          cases,
        });
      } catch (err2) {
        console.error('raw emergency export failed:', err2);
        alert(
          '匯出失敗 — 請截圖此畫面並來信 genogram.feedback@gmail.com\nExport failed — please screenshot this and email us.',
        );
      }
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100vw',
          height: '100vh',
          background: '#f5f5f7',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif",
          padding: 20,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '32px 32px 28px',
            maxWidth: 460,
            width: '100%',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: '#1d1d1f',
              marginBottom: 8,
            }}
          >
            程式發生錯誤 / Something went wrong
          </div>
          <div
            style={{
              fontSize: 13,
              color: '#3a3a3c',
              lineHeight: 1.65,
              marginBottom: 18,
            }}
          >
            您的個案資料仍安全地存在這台裝置的瀏覽器裡。
            建議先下載一份備份,再重新載入頁面。
            <br />
            Your case data is still safe in this browser. Download a backup
            first, then reload.
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <button
              onClick={this.downloadAll}
              style={{
                padding: '10px 22px',
                fontSize: 14,
                fontWeight: 600,
                background: '#007aff',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ⬇ 下載所有個案備份 (JSON)
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                background: '#f5f5f7',
                color: '#1d1d1f',
                border: '1px solid #d2d2d7',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ↻ 重新載入 / Reload
            </button>
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#86868b',
              lineHeight: 1.5,
              wordBreak: 'break-all',
            }}
          >
            {String(this.state.error.message || this.state.error)}
          </div>
        </div>
      </div>
    );
  }
}
