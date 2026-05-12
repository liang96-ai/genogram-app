import type { Scale } from './types';

// CRAFFT 2.1+N — 青少年物質使用篩檢(Boston Children's Hospital, John Knight)
// 6 題 Yes/No;2+ 陽性
// CRAFFT = Car, Relax, Alone, Forget, Family/Friends, Trouble
export const crafftScale: Scale = {
  id: 'crafft',
  name: 'CRAFFT 青少年物質使用篩檢',
  category: 'substance',
  description: '12-21 歲青少年酒/藥使用篩檢;6 題 Yes/No,2+ 陽性',
  source:
    'John Knight, Boston Children\'s Hospital(免費臨床/教育用途,需聲明來源)',
  licenseStatus: 'free-clinical',
  officialUrl: 'https://crafft.org',
  needsTarget: true,
  questions: [
    {
      id: 'C',
      type: 'boolean',
      text: 'Car — 過去一年,你曾搭乘他人(包含自己)在喝酒/用藥後駕駛的車?',
    },
    {
      id: 'R',
      type: 'boolean',
      text: 'Relax — 你曾為了放鬆、感覺較好、或融入團體而喝酒/用藥?',
    },
    {
      id: 'A',
      type: 'boolean',
      text: 'Alone — 你曾在獨自一人時喝酒/用藥?',
    },
    {
      id: 'F1',
      type: 'boolean',
      text: 'Forget — 你曾忘記酒醉/藥效時做的事?',
    },
    {
      id: 'F2',
      type: 'boolean',
      text: 'Family/Friends — 家人或朋友曾告訴你應該減少喝酒/用藥?',
    },
    {
      id: 'T',
      type: 'boolean',
      text: 'Trouble — 你曾因為喝酒/用藥而惹上麻煩?',
    },
  ],
  scoring: (answers) => {
    const total = Object.values(answers).filter((v) => v === true).length;
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total < 2) {
      level = '陰性';
      levelColor = 'green';
    } else if (total < 4) {
      level = '陽性(建議簡短介入)';
      levelColor = 'yellow';
    } else {
      level = '高度陽性(轉介專業評估)';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
