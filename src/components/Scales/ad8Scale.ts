import type { Scale } from './types';

// AD-8 — Ascertain Dementia 8-item Informant Questionnaire
// Washington University 持有版權,允許免費臨床/教學使用
// 由家屬填寫,觀察「過去幾年的變化」,2+ 建議轉介
export const ad8Scale: Scale = {
  id: 'ad8',
  name: 'AD-8 極早期失智篩檢',
  category: 'elderly',
  description:
    '由家屬填寫,觀察「過去幾年內」變化;2 項以上「是」建議進一步評估',
  source: 'Washington University, Galvin et al. 2005 中文版',
  licenseStatus: 'free-clinical',
  officialUrl: 'https://knightadrc.wustl.edu/professionals-clinicians/ad8-dementia-screening',
  needsTarget: true,
  questions: [
    {
      id: 'q1',
      type: 'boolean',
      text: '判斷力出現問題(例:落入圈套或騙局、財務上不好的決定、買了對受禮者不合宜的禮物)',
    },
    {
      id: 'q2',
      type: 'boolean',
      text: '對活動和嗜好的興趣降低',
    },
    {
      id: 'q3',
      type: 'boolean',
      text: '一再重複相同問題、故事或陳述',
    },
    {
      id: 'q4',
      type: 'boolean',
      text: '在學習如何使用工具、設備、和小器具上有困難(例:錄影機、電腦、微波爐、遙控器)',
    },
    { id: 'q5', type: 'boolean', text: '忘記正確的月份和年份' },
    {
      id: 'q6',
      type: 'boolean',
      text: '處理複雜的財務有困難(例:平衡收支、繳所得稅、繳費)',
    },
    { id: 'q7', type: 'boolean', text: '記住約會的時間有困難' },
    {
      id: 'q8',
      type: 'boolean',
      text: '有持續的思考和記憶方面的問題',
    },
  ],
  scoring: (answers) => {
    const total = Object.values(answers).filter((v) => v === true).length;
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total < 2) {
      level = '無明顯認知改變';
      levelColor = 'green';
    } else if (total < 4) {
      level = '建議追蹤評估';
      levelColor = 'yellow';
    } else {
      level = '高度疑似認知障礙(建議轉介)';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
