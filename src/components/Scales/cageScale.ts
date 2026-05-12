import type { Scale } from './types';

// CAGE — 4 題酒精快篩(Ewing 1984, public domain)
// CAGE = Cut down / Annoyed / Guilty / Eye-opener
// 2+ 為陽性,建議進一步評估(如 AUDIT)
export const cageScale: Scale = {
  id: 'cage',
  name: 'CAGE 酒精快篩(4 題)',
  category: 'substance',
  description: '4 題快篩;2+ 為陽性,建議續做 AUDIT 或專業評估',
  source: 'Ewing 1984(public domain)',
  licenseStatus: 'public',
  needsTarget: true,
  questions: [
    {
      id: 'C',
      type: 'boolean',
      text: 'Cut down — 你曾覺得應該減少飲酒嗎?',
    },
    {
      id: 'A',
      type: 'boolean',
      text: 'Annoyed — 別人批評你的飲酒讓你不舒服嗎?',
    },
    {
      id: 'G',
      type: 'boolean',
      text: 'Guilty — 你曾因飲酒感到罪惡嗎?',
    },
    {
      id: 'E',
      type: 'boolean',
      text: 'Eye-opener — 你曾在早上一起床就需要喝酒提神嗎?',
    },
  ],
  scoring: (answers) => {
    const total = Object.values(answers).filter((v) => v === true).length;
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total < 2) {
      level = '陰性(無明顯飲酒問題)';
      levelColor = 'green';
    } else if (total < 4) {
      level = '陽性(建議進一步評估)';
      levelColor = 'yellow';
    } else {
      level = '高度陽性(強烈建議轉介)';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
