import type { Scale } from './types';

// 兒少收出養家庭評估表
// 衛福部社家署主管,各認可機構(慈善/兒福/勵馨等)有自家標準表單
// 無單一全國公定題目,各機構/縣市略有差異
export const adoptionAssessmentScale: Scale = {
  id: 'adoption-assessment',
  name: '兒少收出養家庭評估表',
  category: 'external',
  description:
    '收養家庭適應性 / 出養家庭親職功能評估;結構式社工訪視表單',
  source: '衛福部社家署 / 各兒福認可機構',
  licenseStatus: 'free-clinical',
  disabled: true,
  disabledMessage:
    '台灣兒少收出養評估各認可機構有自家標準表單(無全國公定版)。請至貴機構或衛福部社家署取得最新版本表單。常見來源:財團法人兒童福利聯盟、勵馨基金會、慈善心緣、屏東伯大尼之家等。',
  officialUrl: 'https://www.sfaa.gov.tw',
  needsTarget: true,
  questions: [],
  scoring: () => ({ totalScore: 0, level: 'N/A' }),
};
