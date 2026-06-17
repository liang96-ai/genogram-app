// 🗃 DEAD CODE — 感謝牆 SponsorWall(#102 草稿,尚未接到首頁)2026-06-17
//
// 目前無任何 import → tree-shaken,不會進 bundle。保留供:
//   1. #102「感謝牆整合 CaseList」未來啟用
//   2. 版面 / 資料結構參考
// 若確定不做感謝牆,可於下次清理時刪除。

import {
  INDIVIDUAL_SPONSORS,
  ORGANIZATION_SPONSORS,
  type OrganizationSponsor,
} from '../../data/sponsors';

// =============================================================
// 感謝牆 — 首頁左右 sidebar
//   左:個人贊助者(小字名稱列表)
//   右:機構贊助者(Logo + 名稱)
//
// 設計原則:
//   - 對使用者不干擾(side panel,中間欄是主功能)
//   - 空狀態顯示「成為第一位」CTA,變成生長型
//   - 點 CTA 開 GitHub SPONSORSHIP.md 連結
//   - 桌面 ≥ 1024px 才顯示;手機/平板隱藏
// =============================================================

const SPONSORSHIP_URL =
  'https://github.com/liang96-ai/genogram-app/blob/main/SPONSORSHIP.md';

const COMMERCIAL_URL =
  'https://github.com/liang96-ai/genogram-app/blob/main/COMMERCIAL_LICENSE.md';

// ============ 個人贊助者(左欄)============
export function IndividualWall() {
  const sponsors = INDIVIDUAL_SPONSORS;
  return (
    <aside style={leftWallStyle}>
      <div style={wallTitleStyle}>
        <span style={{ fontSize: 18 }}>👤</span>
        <div>
          <div style={{ fontWeight: 600 }}>個人贊助者</div>
          <div style={{ fontSize: 10, color: '#86868b', fontWeight: 400 }}>
            Individual sponsors
          </div>
        </div>
      </div>

      {sponsors.length === 0 ? (
        <EmptyState
          text="期待您的支持"
          textEn="Be the first"
          url={SPONSORSHIP_URL}
        />
      ) : (
        <ul style={individualListStyle}>
          {sponsors.map((s, i) => (
            <li key={i} style={individualItemStyle}>
              {s.name}
            </li>
          ))}
        </ul>
      )}

      <a
        href={SPONSORSHIP_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={ctaLinkStyle}
      >
        ❤️ 成為贊助者 →
      </a>
    </aside>
  );
}

// ============ 機構贊助者(右欄)============
export function OrganizationWall() {
  const sponsors = ORGANIZATION_SPONSORS;
  return (
    <aside style={rightWallStyle}>
      <div style={wallTitleStyle}>
        <span style={{ fontSize: 18 }}>🏛</span>
        <div>
          <div style={{ fontWeight: 600 }}>機構贊助者</div>
          <div style={{ fontSize: 10, color: '#86868b', fontWeight: 400 }}>
            Organization sponsors
          </div>
        </div>
      </div>

      {sponsors.length === 0 ? (
        <EmptyState
          text="歡迎機構合作"
          textEn="Open for orgs"
          url={COMMERCIAL_URL}
        />
      ) : (
        <ul style={orgListStyle}>
          {sponsors.map((s, i) => (
            <OrgCard key={i} sponsor={s} />
          ))}
        </ul>
      )}

      <a
        href={COMMERCIAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={ctaLinkStyle}
      >
        🤝 機構合作邀請 →
      </a>
    </aside>
  );
}

function OrgCard({ sponsor }: { sponsor: OrganizationSponsor }) {
  const inner = (
    <>
      {sponsor.logoUrl && (
        <img
          src={sponsor.logoUrl}
          alt={sponsor.name}
          style={{
            maxWidth: '100%',
            maxHeight: 50,
            display: 'block',
            marginBottom: 4,
          }}
        />
      )}
      <div
        style={{
          fontSize: 11,
          color: '#1d1d1f',
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        {sponsor.name}
      </div>
    </>
  );
  return (
    <li style={orgCardStyle}>
      {sponsor.websiteUrl ? (
        <a
          href={sponsor.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          {inner}
        </a>
      ) : (
        inner
      )}
    </li>
  );
}

function EmptyState({
  text,
  textEn,
  url,
}: {
  text: string;
  textEn: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={emptyStateStyle}
    >
      <div style={{ fontSize: 13, color: '#86868b', marginBottom: 2 }}>{text}</div>
      <div style={{ fontSize: 10, color: '#aeaeb2' }}>{textEn}</div>
    </a>
  );
}

// 應該 < 1024px 隱藏 sidebar(用 prop 控,不是 media query)
// 給 CaseList 控制顯示
// =============================================================
// Styles
// =============================================================

const sidebarBase: React.CSSProperties = {
  padding: '16px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  fontFamily: 'inherit',
};

const leftWallStyle: React.CSSProperties = {
  ...sidebarBase,
  width: 160,
  borderRight: '1px solid #e5e4e7',
  background: '#fafafa',
};

const rightWallStyle: React.CSSProperties = {
  ...sidebarBase,
  width: 200,
  borderLeft: '1px solid #e5e4e7',
  background: '#fafafa',
};

const wallTitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#1d1d1f',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 4,
  paddingBottom: 8,
  borderBottom: '1px solid #e5e4e7',
};

const individualListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  flex: 1,
  overflowY: 'auto',
};

const individualItemStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#1d1d1f',
  padding: '2px 4px',
  lineHeight: 1.4,
};

const orgListStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  flex: 1,
  overflowY: 'auto',
};

const orgCardStyle: React.CSSProperties = {
  padding: 8,
  background: '#ffffff',
  border: '1px solid #e5e4e7',
  borderRadius: 6,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const emptyStateStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 12,
  background: '#ffffff',
  border: '1px dashed #d2d2d7',
  borderRadius: 6,
  textDecoration: 'none',
  cursor: 'pointer',
};

const ctaLinkStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#007aff',
  textDecoration: 'none',
  padding: '6px 0',
  borderTop: '1px solid #e5e4e7',
  textAlign: 'center',
  fontWeight: 500,
};
