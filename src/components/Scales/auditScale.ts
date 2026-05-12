import type { Scale } from './types';

// AUDIT — Alcohol Use Disorders Identification Test (WHO 1989)
// 10 題;前 8 題 0-4 分,第 9-10 題 0/2/4 分
// 0-7 低風險 / 8-15 中度 / 16-19 重度 / 20+ 酒精依賴可能
export const auditScale: Scale = {
  id: 'audit',
  name: 'AUDIT 酒精使用障礙篩檢',
  category: 'substance',
  description: 'WHO 10 題酒精問題評估;8+ 中度 / 16+ 重度 / 20+ 依賴可能',
  source: 'WHO 1989(public domain)',
  licenseStatus: 'public',
  officialUrl:
    'https://www.who.int/publications/i/item/audit-the-alcohol-use-disorders-identification-test-guidelines-for-use-in-primary-health-care',
  needsTarget: true,
  questions: [
    {
      id: 'q1',
      type: 'likert',
      text: '你多常喝含酒精飲料?',
      min: 0,
      max: 4,
      labels: ['從不', '每月一次或以下', '每月 2-4 次', '每週 2-3 次', '每週 4 次以上'],
    },
    {
      id: 'q2',
      type: 'likert',
      text: '你喝酒的日子,通常一天喝幾杯?(1 杯=啤酒罐裝 / 紅酒 150ml / 烈酒 30ml)',
      min: 0,
      max: 4,
      labels: ['1-2 杯', '3-4 杯', '5-6 杯', '7-9 杯', '10 杯以上'],
    },
    {
      id: 'q3',
      type: 'likert',
      text: '你多常一次喝 6 杯以上?',
      min: 0,
      max: 4,
      labels: ['從不', '不到每月一次', '每月一次', '每週一次', '每天或幾乎每天'],
    },
    {
      id: 'q4',
      type: 'likert',
      text: '過去一年,你有多常發現一旦開始喝就停不下來?',
      min: 0,
      max: 4,
      labels: ['從不', '不到每月一次', '每月一次', '每週一次', '每天或幾乎每天'],
    },
    {
      id: 'q5',
      type: 'likert',
      text: '過去一年,你有多常因為喝酒而沒做到該做的事?',
      min: 0,
      max: 4,
      labels: ['從不', '不到每月一次', '每月一次', '每週一次', '每天或幾乎每天'],
    },
    {
      id: 'q6',
      type: 'likert',
      text: '過去一年,你有多常需要在早上喝酒提神(因為前晚喝太多)?',
      min: 0,
      max: 4,
      labels: ['從不', '不到每月一次', '每月一次', '每週一次', '每天或幾乎每天'],
    },
    {
      id: 'q7',
      type: 'likert',
      text: '過去一年,你有多常在喝酒後感到罪惡或後悔?',
      min: 0,
      max: 4,
      labels: ['從不', '不到每月一次', '每月一次', '每週一次', '每天或幾乎每天'],
    },
    {
      id: 'q8',
      type: 'likert',
      text: '過去一年,你有多常因為喝酒而忘記前一晚發生的事?',
      min: 0,
      max: 4,
      labels: ['從不', '不到每月一次', '每月一次', '每週一次', '每天或幾乎每天'],
    },
    {
      id: 'q9',
      type: 'choice',
      text: '你或他人曾因你喝酒而受傷嗎?',
      choices: [
        { value: '0', label: '沒有', score: 0 },
        { value: '2', label: '有,但不是過去一年', score: 2 },
        { value: '4', label: '是的,過去一年內', score: 4 },
      ],
    },
    {
      id: 'q10',
      type: 'choice',
      text: '親友、醫師或專業人員曾關心你的飲酒,或建議你少喝嗎?',
      choices: [
        { value: '0', label: '沒有', score: 0 },
        { value: '2', label: '有,但不是過去一年', score: 2 },
        { value: '4', label: '是的,過去一年內', score: 4 },
      ],
    },
  ],
  scoring: (answers) => {
    let total = 0;
    for (const [k, v] of Object.entries(answers)) {
      if (k === 'q9' || k === 'q10') {
        total += parseInt(String(v), 10) || 0;
      } else if (typeof v === 'number') {
        total += v;
      }
    }
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total < 8) {
      level = '低風險';
      levelColor = 'green';
    } else if (total < 16) {
      level = '中度風險(建議簡短介入)';
      levelColor = 'yellow';
    } else if (total < 20) {
      level = '重度風險(建議專業評估)';
      levelColor = 'red';
    } else {
      level = '可能酒精依賴(轉介戒治)';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
