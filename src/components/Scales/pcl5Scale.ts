import type { Scale } from './types';

// PCL-5 — Posttraumatic Stress Disorder Checklist for DSM-5
// VA National Center for PTSD,public domain
// 過去 1 個月,20 題 0-4 likert,總分 0-80;33+ 篩檢達 PTSD 標準
export const pcl5Scale: Scale = {
  id: 'pcl5',
  name: 'PCL-5 創傷後壓力症檢核表',
  category: 'violence',
  description: '過去 1 個月,20 題 0-4 分;總分 ≥33 達 PTSD 篩檢標準',
  source: 'VA National Center for PTSD(public domain)',
  licenseStatus: 'public',
  officialUrl:
    'https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp',
  needsTarget: true,
  questions: Array.from({ length: 20 }, (_, i) => ({
    id: `q${i + 1}`,
    type: 'likert' as const,
    text: [
      '反覆、不舒服且不想要的關於該事件的記憶',
      '反覆出現該事件的不愉快夢境',
      '感覺好像該事件再次發生(像 flashback,有人再次經驗它)',
      '面對提醒事件的事物時,感到強烈不愉快',
      '面對提醒事件的事物時,有強烈的身體反應(例如心跳、呼吸困難、流汗)',
      '迴避關於該事件的記憶、想法、感受',
      '迴避能讓你想起該事件的外部提醒(例如人、地、對話、活動、物品、情境)',
      '無法記住該事件的重要部分',
      '對自己、他人、或世界有強烈的負面信念(例如「我很糟」「沒有人可信任」)',
      '責怪自己或他人造成該事件或其後果',
      '強烈的負面情緒(恐懼、憤怒、罪惡感、羞恥)',
      '對活動失去興趣',
      '對親近的人感到疏離',
      '無法經驗正面情緒(例如無法感到快樂或對親密的人有愛意)',
      '易怒或攻擊行為(打人、推人、口頭攻擊)',
      '冒險或自我傷害行為',
      '過度警覺(隨時提防)',
      '驚嚇反應太強烈',
      '注意力難以集中',
      '入睡困難或睡眠中斷',
    ][i],
    min: 0,
    max: 4,
    labels: ['完全沒有', '輕微', '中等', '相當程度', '極度'],
  })),
  scoring: (answers) => {
    const total = Object.values(answers).reduce<number>(
      (s, v) => s + (typeof v === 'number' ? v : 0),
      0,
    );
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total < 20) {
      level = '症狀輕微';
      levelColor = 'green';
    } else if (total < 33) {
      level = '中度症狀';
      levelColor = 'yellow';
    } else {
      level = '達 PTSD 篩檢標準(建議轉介)';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
