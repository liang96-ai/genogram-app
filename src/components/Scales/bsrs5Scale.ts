import type { Scale } from './types';

// BSRS-5 — Brief Symptom Rating Scale 簡式症狀量表(心情溫度計)
// 衛福部公開推廣,李明濱教授版
// 5 題核心 + 1 題自殺意念輔助;0-4 likert
export const bsrs5Scale: Scale = {
  id: 'bsrs5',
  name: 'BSRS-5 心情溫度計',
  category: 'mental',
  description:
    '衛福部全國心情溫度計,5 題核心 + 1 題自殺意念;6+ 輕度 / 10+ 中度 / 15+ 重度;自殺 ≥2 立即關注',
  source: '李明濱教授 / 衛福部國民健康署「心情溫度計」(免費公開)',
  licenseStatus: 'free-clinical',
  officialUrl: 'https://www.tsos.org.tw/web/page/bsrs',
  needsTarget: true,
  questions: [
    '睡眠困難,例如難以入睡、易醒或早醒',
    '感覺緊張不安',
    '覺得容易苦惱或動怒',
    '感覺憂鬱、心情低落',
    '覺得比不上別人',
    '有自殺的想法',
  ].map((text, i) => ({
    id: `q${i + 1}`,
    type: 'likert' as const,
    text,
    min: 0,
    max: 4,
    labels: ['完全沒有', '輕微', '中等程度', '厲害', '非常厲害'],
  })),
  scoring: (answers) => {
    const core = ['q1', 'q2', 'q3', 'q4', 'q5'];
    const total = core.reduce<number>(
      (s, k) =>
        s + (typeof answers[k] === 'number' ? (answers[k] as number) : 0),
      0,
    );
    const suicide =
      typeof answers.q6 === 'number' ? (answers.q6 as number) : 0;
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (suicide >= 2) {
      level = `自殺意念明顯(立即關注;5題總分 ${total})`;
      levelColor = 'red';
    } else if (total >= 15) {
      level = '重度情緒困擾';
      levelColor = 'red';
    } else if (total >= 10) {
      level = '中度情緒困擾';
      levelColor = 'yellow';
    } else if (total >= 6) {
      level = '輕度情緒困擾';
      levelColor = 'yellow';
    } else {
      level = '正常範圍';
      levelColor = 'green';
    }
    return { totalScore: total, level, levelColor };
  },
};
