import type { Scale } from './types';

// 兒少保護結構式風險評估
// 衛福部保護服務司管制,各縣市政府社工專用,需通報系統申請
export const cmsRiskScale: Scale = {
  id: 'cms-risk',
  name: '兒少保護結構式風險評估',
  category: 'external',
  description:
    '兒少保護案件結構式評估,衛福部保護服務司主管;社工專用表單,需通報系統內使用',
  source: '衛福部保護服務司',
  licenseStatus: 'free-clinical',
  disabled: true,
  disabledMessage:
    '此評估表為衛福部保護服務司主管之兒少保護案件結構式評估,各縣市政府使用版本可能略有差異。社工專用,需透過保護服務通報及處理系統(eCare)申請使用。本 App 不提供題目,請聯絡縣市社會局或衛福部保護服務司。',
  officialUrl: 'https://dep.mohw.gov.tw/dops/lp-1303-105.html',
  needsTarget: true,
  questions: [],
  scoring: () => ({ totalScore: 0, level: 'N/A' }),
};
