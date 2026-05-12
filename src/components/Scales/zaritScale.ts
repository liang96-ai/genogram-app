import type { Scale } from './types';

// Zarit Burden Interview — 照顧者負荷量表
// Zarit, Reever & Bach-Peterson 1980,有版權(MAPI Research Trust 持有)
// App 不內建題目,點開只給連結
export const zaritScale: Scale = {
  id: 'zarit',
  name: 'Zarit 照顧者負荷量表',
  category: 'external',
  description:
    '評估失能/失智長輩主要照顧者的身心負荷;22 題完整版 / 12 題短版 / 4 題快版',
  source: 'Zarit, Reever & Bach-Peterson 1980',
  licenseStatus: 'commercial',
  disabled: true,
  disabledMessage:
    'Zarit Burden Interview 由 MAPI Research Trust 持有版權,需取得授權才能正式使用。請至 ePROVIDE 平台申請(臨床/研究/商業有不同收費),或使用台灣本土研發的替代量表(如「家庭照顧者支持需求評估表」,衛福部長照 2.0 公開版本)。',
  officialUrl: 'https://eprovide.mapi-trust.org',
  needsTarget: true,
  questions: [],
  scoring: () => ({ totalScore: 0, level: 'N/A' }),
};
