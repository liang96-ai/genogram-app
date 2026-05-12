import type { Scale } from './types';

// MMSE — 簡易心智狀態檢查
// 11 大項,簡化成 11 題(每題填該項實得分數),總分 0-30
// 標準題:時間 5 / 地點 5 / 立即記憶 3 / 注意力 5 / 短期記憶 3 / 命名 2 / 複誦 1 / 三步驟 3 / 閱讀 1 / 書寫 1 / 圖形 1
export const mmseScale: Scale = {
  id: 'mmse',
  name: 'MMSE 簡易心智狀態檢查',
  category: 'disability',
  description: '失智篩檢量表(Folstein 1975)',
  source: 'Folstein, Folstein & McHugh 1975 / PAR Inc.',
  licenseStatus: 'commercial',
  disabled: true,
  disabledMessage:
    'MMSE 由 Psychological Assessment Resources (PAR Inc.) 持有版權,需購買授權才能臨床使用。請至 PAR 官網申請,或改用替代工具(如 SPMSQ / MoCA-Tw 開放版)。',
  officialUrl: 'https://www.parinc.com',
  needsTarget: true,
  questions: [
    {
      id: 'time',
      type: 'likert',
      text: '時間定向(年/季/月/日/星期)',
      min: 0,
      max: 5,
    },
    {
      id: 'place',
      type: 'likert',
      text: '地點定向(縣市/醫院/科別/樓層/國家)',
      min: 0,
      max: 5,
    },
    {
      id: 'register',
      type: 'likert',
      text: '立即記憶(複誦 3 個物品)',
      min: 0,
      max: 3,
    },
    {
      id: 'attention',
      type: 'likert',
      text: '注意力(100 連續減 7,或倒拼 WORLD)',
      min: 0,
      max: 5,
    },
    {
      id: 'recall',
      type: 'likert',
      text: '短期記憶(回想 3 個物品)',
      min: 0,
      max: 3,
    },
    { id: 'naming', type: 'likert', text: '命名(手錶/筆)', min: 0, max: 2 },
    {
      id: 'repeat',
      type: 'likert',
      text: '複誦(白紙真的本來無一物)',
      min: 0,
      max: 1,
    },
    {
      id: 'command',
      type: 'likert',
      text: '三步驟指令(用右手拿紙、對折、放地上)',
      min: 0,
      max: 3,
    },
    { id: 'read', type: 'likert', text: '閱讀(請閉上眼)', min: 0, max: 1 },
    { id: 'write', type: 'likert', text: '書寫(寫一個句子)', min: 0, max: 1 },
    {
      id: 'copy',
      type: 'likert',
      text: '圖形描繪(雙交叉五邊形)',
      min: 0,
      max: 1,
    },
  ],
  scoring: (answers) => {
    const total = Object.values(answers).reduce<number>(
      (s, v) => s + (typeof v === 'number' ? v : 0),
      0,
    );
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total >= 24) {
      level = '正常';
      levelColor = 'green';
    } else if (total >= 18) {
      level = '輕度認知障礙';
      levelColor = 'yellow';
    } else if (total >= 10) {
      level = '中度失智';
      levelColor = 'red';
    } else {
      level = '重度失智';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
