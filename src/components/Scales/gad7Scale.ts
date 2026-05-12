import type { Scale } from './types';

// GAD-7 — Generalized Anxiety Disorder 7-item
// 中文版翻譯由 Pfizer 公告免費臨床/教育使用
export const gad7Scale: Scale = {
  id: 'gad7',
  name: 'GAD-7 廣泛性焦慮量表',
  category: 'mental',
  description: '過去 2 週,7 題 0-3 分;5+ 輕度 / 10+ 中度 / 15+ 重度',
  source:
    'Pfizer / Spitzer, Kroenke, Williams & Löwe 2006 中文授權版(免費臨床使用)',
  licenseStatus: 'free-clinical',
  officialUrl: 'https://www.phqscreeners.com',
  needsTarget: true,
  questions: [
    '感覺緊張、焦慮、心煩意亂',
    '無法停止或控制擔心',
    '對不同事情過度擔心',
    '難以放鬆',
    '坐立不安,難以靜下來',
    '容易心煩或暴躁',
    '感到害怕,好像會有什麼可怕的事情發生',
  ].map((text, i) => ({
    id: `q${i + 1}`,
    type: 'likert' as const,
    text,
    min: 0,
    max: 3,
    labels: ['完全沒有', '幾天', '一半以上日子', '幾乎每天'],
  })),
  scoring: (answers) => {
    const total = Object.values(answers).reduce<number>(
      (s, v) => s + (typeof v === 'number' ? v : 0),
      0,
    );
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total < 5) {
      level = '無/極輕微';
      levelColor = 'green';
    } else if (total < 10) {
      level = '輕度焦慮';
      levelColor = 'yellow';
    } else if (total < 15) {
      level = '中度焦慮';
      levelColor = 'yellow';
    } else {
      level = '重度焦慮';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
