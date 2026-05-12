import type { Scale } from './types';

// 危機指標檢核 — 簡易版
// 勾起每項各 1 分,總分 0-9
// 0 低風險 / 1-3 中度關注 / 4+ 高風險
export const crisisChecklist: Scale = {
  id: 'crisis',
  name: '危機指標檢核',
  category: 'crisis',
  description: '家庭/個案危機警訊快速檢核(實務參考)',
  source: '本 App 自製,非標準量表;結構參考社政實務常見警訊',
  licenseStatus: 'informal',
  needsTarget: false,
  questions: [
    { id: 'suicide', type: 'boolean', text: '自殺/自傷意念或行為' },
    { id: 'dv', type: 'boolean', text: '家庭暴力(肢體/精神/性)' },
    { id: 'cm', type: 'boolean', text: '兒少虐待 / 不當對待' },
    { id: 'eldermal', type: 'boolean', text: '老人/身心障礙者疏忽或虐待' },
    { id: 'substance', type: 'boolean', text: '物質濫用(酒精/毒品)' },
    { id: 'mental', type: 'boolean', text: '嚴重精神疾病未治療' },
    { id: 'finance', type: 'boolean', text: '經濟極度困難 / 無收入' },
    { id: 'housing', type: 'boolean', text: '居住不穩定 / 街友風險' },
    { id: 'isolation', type: 'boolean', text: '社會孤立 / 缺乏支持' },
  ],
  scoring: (answers) => {
    const flagged = Object.values(answers).filter((v) => v === true).length;
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (flagged === 0) {
      level = '低風險';
      levelColor = 'green';
    } else if (flagged <= 3) {
      level = '中度關注';
      levelColor = 'yellow';
    } else {
      level = '高風險';
      levelColor = 'red';
    }
    return { totalScore: flagged, level, levelColor };
  },
};
