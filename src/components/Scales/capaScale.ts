import type { Scale } from './types';

// CAPA — 兒少保護危險評估(衛福部社工結構式評估,簡化版)
// 15 個常見風險指標,勾起項目越多風險越高
export const capaScale: Scale = {
  id: 'capa',
  name: 'CAPA 兒少保護危險評估',
  category: 'child',
  description: '兒少保護結構式風險評估',
  source: '衛福部保護服務司 / 各縣市社會局自訂版本',
  licenseStatus: 'free-clinical',
  disabled: true,
  disabledMessage:
    '台灣 CAPA 各縣市政府略有不同(高雄、台北、新北版各異),且需配合最新版本表單號。請依貴機構/縣市政府提供之 PDF 為準,或聯絡衛福部保護服務司取得正式表單。',
  officialUrl:
    'https://dep.mohw.gov.tw/dops/lp-1303-105.html',
  needsTarget: true,
  questions: [
    { id: 'phys', type: 'boolean', text: '兒少身上明顯傷痕(瘀青/燒燙/骨折)' },
    {
      id: 'reportedHurt',
      type: 'boolean',
      text: '兒少自述曾被施暴/性侵/不當對待',
    },
    {
      id: 'caregiverViolence',
      type: 'boolean',
      text: '主要照顧者有暴力/物質濫用/精神病史',
    },
    {
      id: 'caregiverAlcohol',
      type: 'boolean',
      text: '主要照顧者酗酒或藥物濫用中',
    },
    { id: 'dv', type: 'boolean', text: '家內目睹親密關係暴力' },
    { id: 'neglect', type: 'boolean', text: '營養/衛生/醫療嚴重忽視' },
    { id: 'noSchool', type: 'boolean', text: '長期未就學或頻繁缺課' },
    { id: 'isolation', type: 'boolean', text: '社會孤立(無支持/親屬遙遠)' },
    { id: 'finance', type: 'boolean', text: '經濟極度困難/無穩定收入' },
    { id: 'housing', type: 'boolean', text: '居住不穩(街友/危險住宅)' },
    {
      id: 'caregiverYoung',
      type: 'boolean',
      text: '主要照顧者過於年輕(< 18 歲)',
    },
    { id: 'noCaregiver', type: 'boolean', text: '無有能力主要照顧者' },
    {
      id: 'previousAbuse',
      type: 'boolean',
      text: '曾有兒保案件紀錄(該家庭)',
    },
    {
      id: 'specialNeeds',
      type: 'boolean',
      text: '兒少有特殊需求(障礙/早療),照顧負擔重',
    },
    {
      id: 'caregiverDeny',
      type: 'boolean',
      text: '主要照顧者否認問題或拒絕配合',
    },
  ],
  scoring: (answers) => {
    const total = Object.values(answers).filter((v) => v === true).length;
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total === 0) {
      level = '低風險';
      levelColor = 'green';
    } else if (total <= 3) {
      level = '中度關注(建議追蹤)';
      levelColor = 'yellow';
    } else if (total <= 7) {
      level = '高風險(需積極介入)';
      levelColor = 'red';
    } else {
      level = '極高風險(立即保護)';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
