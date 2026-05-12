import type { Scale } from './types';

// TIPVDA — 台灣親密關係暴力危險評估表
// 衛福部保護服務司公開推廣,警政、社政、醫療共用
// 共 10 題勾選;3+ 中度風險,8+ 高度風險(立即介入)
export const tipvdaScale: Scale = {
  id: 'tipvda',
  name: 'TIPVDA 台灣親密關係暴力危險評估',
  category: 'violence',
  description:
    '衛福部官方版,10 項勾選;3+ 中度危險 / 8+ 高度危險(需立即介入)',
  source: '衛福部保護服務司「親密關係暴力危險評估表」',
  licenseStatus: 'free-clinical',
  officialUrl: 'https://dep.mohw.gov.tw/dops/cp-1303-7717-105.html',
  needsTarget: true,
  questions: [
    {
      id: 'q1',
      type: 'boolean',
      text: '相對人曾使用武器(刀、槍、棍棒等)或威脅使用武器',
    },
    {
      id: 'q2',
      type: 'boolean',
      text: '相對人曾揚言要殺死你或自殺',
    },
    {
      id: 'q3',
      type: 'boolean',
      text: '近一年來暴力次數或嚴重程度增加',
    },
    {
      id: 'q4',
      type: 'boolean',
      text: '相對人曾掐你脖子、悶住你呼吸、或使你窒息',
    },
    {
      id: 'q5',
      type: 'boolean',
      text: '相對人有酗酒、施用毒品或藥物濫用情形',
    },
    {
      id: 'q6',
      type: 'boolean',
      text: '相對人對你或孩子有嚴重的嫉妒、跟蹤、控制行為',
    },
    {
      id: 'q7',
      type: 'boolean',
      text: '你曾因受暴而就醫(身體或精神)',
    },
    {
      id: 'q8',
      type: 'boolean',
      text: '你曾因害怕暴力而離家、躲藏或求助',
    },
    {
      id: 'q9',
      type: 'boolean',
      text: '相對人對未成年子女施暴或揚言傷害子女',
    },
    {
      id: 'q10',
      type: 'boolean',
      text: '你目前懷有相對人的孩子,或最近(一年內)分娩',
    },
  ],
  scoring: (answers) => {
    const total = Object.values(answers).filter((v) => v === true).length;
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total >= 8) {
      level = '高度危險(需立即啟動安全計畫)';
      levelColor = 'red';
    } else if (total >= 3) {
      level = '中度危險(建議積極介入)';
      levelColor = 'yellow';
    } else {
      level = '低度風險';
      levelColor = 'green';
    }
    return { totalScore: total, level, levelColor };
  },
};
