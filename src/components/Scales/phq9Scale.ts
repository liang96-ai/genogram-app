import type { Scale } from './types';

// PHQ-9 — 病人健康問卷憂鬱量表
// 中文版翻譯由 Pfizer 公告免費臨床/教育使用
// 過去 2 週,9 題 0-3 likert,總分 0-27
export const phq9Scale: Scale = {
  id: 'phq9',
  name: 'PHQ-9 病人健康問卷-9',
  category: 'mental',
  description:
    '過去 2 週,9 題 0-3 分;5+ 輕度 / 10+ 中度 / 15+ 中重度 / 20+ 重度',
  source: 'Pfizer / Spitzer, Kroenke & Williams 2001 中文授權版(免費臨床使用)',
  licenseStatus: 'free-clinical',
  officialUrl: 'https://www.phqscreeners.com',
  needsTarget: true,
  questions: [
    '做事失去興趣或樂趣',
    '感覺沮喪、憂鬱或絕望',
    '入睡困難、淺眠或睡得太多',
    '感覺疲倦或無精打采',
    '食慾不振或吃得過多',
    '覺得自己很糟,或覺得自己很失敗,或讓自己/家人失望',
    '對事物專注有困難,例如閱讀報紙或看電視',
    '行動或說話速度緩慢到他人察覺,或相反 — 動來動去、坐立不安',
    '覺得活著沒意思,或想要傷害自己',
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
      level = '輕度憂鬱';
      levelColor = 'yellow';
    } else if (total < 15) {
      level = '中度憂鬱';
      levelColor = 'yellow';
    } else if (total < 20) {
      level = '中重度憂鬱';
      levelColor = 'red';
    } else {
      level = '重度憂鬱';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
