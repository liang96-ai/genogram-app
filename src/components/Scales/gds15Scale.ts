import type { Scale } from './types';

// GDS-15 — Geriatric Depression Scale (Short Form)
// Sheikh & Yesavage 1986;public domain
// 反向題(答「否」計 1 分):q1, q5, q7, q11, q13(共 5 題)
// 其他 10 題正向(答「是」計 1 分)
export const gds15Scale: Scale = {
  id: 'gds15',
  name: 'GDS-15 老年憂鬱量表(短版)',
  category: 'elderly',
  description:
    '15 題 Yes/No;5+ 可能憂鬱 / 10+ 嚴重;部分題反向計分',
  source: 'Sheikh & Yesavage 1986(public domain),中文版廣為使用',
  licenseStatus: 'public',
  officialUrl: 'https://www.tsgh.ndmctsgh.edu.tw',
  needsTarget: true,
  questions: [
    { id: 'q1', type: 'boolean', text: '您對您的生活基本上滿意嗎?(*)' },
    { id: 'q2', type: 'boolean', text: '您是否減少了很多活動和嗜好?' },
    { id: 'q3', type: 'boolean', text: '您是否感覺生活很空虛?' },
    { id: 'q4', type: 'boolean', text: '您是否常常感到無聊?' },
    { id: 'q5', type: 'boolean', text: '您大部分時間精神好嗎?(*)' },
    {
      id: 'q6',
      type: 'boolean',
      text: '您是否害怕將會有不幸的事情發生?',
    },
    {
      id: 'q7',
      type: 'boolean',
      text: '您是否大部分時間感到快樂?(*)',
    },
    { id: 'q8', type: 'boolean', text: '您是否常常感到無助?' },
    {
      id: 'q9',
      type: 'boolean',
      text: '您是否寧願留在家裡,而不喜歡外出嘗試新鮮事物?',
    },
    {
      id: 'q10',
      type: 'boolean',
      text: '您是否覺得記憶力比大多數的人差?',
    },
    {
      id: 'q11',
      type: 'boolean',
      text: '您現在覺得活著是一件美妙的事嗎?(*)',
    },
    { id: 'q12', type: 'boolean', text: '您是否覺得自己現在生活的樣子毫無價值?' },
    { id: 'q13', type: 'boolean', text: '您是否感到精力充沛?(*)' },
    { id: 'q14', type: 'boolean', text: '您是否覺得自己的處境毫無希望?' },
    {
      id: 'q15',
      type: 'boolean',
      text: '您是否覺得現在大多數人比您強?',
    },
  ],
  scoring: (answers) => {
    // 反向題:q1, q5, q7, q11, q13(答 No 才算 1 分)
    const reverseKeys = new Set(['q1', 'q5', 'q7', 'q11', 'q13']);
    let total = 0;
    for (const [k, v] of Object.entries(answers)) {
      if (reverseKeys.has(k)) {
        if (v === false) total++;
      } else {
        if (v === true) total++;
      }
    }
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total < 5) {
      level = '正常';
      levelColor = 'green';
    } else if (total < 10) {
      level = '可能憂鬱(建議進一步評估)';
      levelColor = 'yellow';
    } else {
      level = '嚴重憂鬱';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
