import type { Scale } from './types';

// FACES IV — Family Adaptability and Cohesion Evaluation Scales (Olson)
// David Olson / Life Innovations 持有版權
// 比 Family APGAR 更深的家庭功能評估(凝聚力 + 適應力 + 溝通)
export const faces4Scale: Scale = {
  id: 'faces4',
  name: 'FACES IV 家庭功能評估',
  category: 'external',
  description: '進階家庭凝聚力與適應力評估(62 題完整版)',
  source: 'David Olson / Life Innovations 1986/2011',
  licenseStatus: 'commercial',
  disabled: true,
  disabledMessage:
    'FACES IV 由 Life Innovations 持有版權,需購買評分手冊與授權才能正式使用。臨床/研究請至官網申請。簡單家庭功能評估可改用本 App 內建的 Family APGAR(免費公開)。',
  officialUrl: 'https://www.facesiv.com',
  needsTarget: false,
  questions: [],
  scoring: () => ({ totalScore: 0, level: 'N/A' }),
};
