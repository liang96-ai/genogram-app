import type { Scale } from './types';

export const apgarScale: Scale = {
  id: 'apgar',
  name: 'Family APGAR 家庭功能評估',
  category: 'family',
  description:
    '5 題快速家庭功能評估;每題 0-2 分。7-10 高 / 4-6 中 / 0-3 低',
  source: 'Smilkstein 1978(廣泛公開,中文版台灣家醫科常用)',
  licenseStatus: 'free-clinical',
  needsTarget: false,
  questions: [
    {
      id: 'A',
      type: 'likert',
      text: 'A 適應(Adaptation)— 遇到問題時,我滿意能從家人得到幫助',
      min: 0,
      max: 2,
      labels: ['幾乎不曾', '有時', '幾乎總是'],
    },
    {
      id: 'P',
      type: 'likert',
      text: 'P 夥伴關係(Partnership)— 我滿意家人討論事情、共同解決問題的方式',
      min: 0,
      max: 2,
      labels: ['幾乎不曾', '有時', '幾乎總是'],
    },
    {
      id: 'G',
      type: 'likert',
      text: 'G 成長(Growth)— 我滿意家人接納並支持我的新活動或方向',
      min: 0,
      max: 2,
      labels: ['幾乎不曾', '有時', '幾乎總是'],
    },
    {
      id: 'A2',
      type: 'likert',
      text: 'A 情感(Affection)— 我滿意家人表達情感、回應我情緒的方式',
      min: 0,
      max: 2,
      labels: ['幾乎不曾', '有時', '幾乎總是'],
    },
    {
      id: 'R',
      type: 'likert',
      text: 'R 解決(Resolve)— 我滿意家人共度時間的方式',
      min: 0,
      max: 2,
      labels: ['幾乎不曾', '有時', '幾乎總是'],
    },
  ],
  scoring: (answers) => {
    const total = Object.values(answers).reduce<number>(
      (sum, v) => sum + (typeof v === 'number' ? v : 0),
      0,
    );
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total >= 7) {
      level = '高功能';
      levelColor = 'green';
    } else if (total >= 4) {
      level = '中度功能';
      levelColor = 'yellow';
    } else {
      level = '低功能';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
