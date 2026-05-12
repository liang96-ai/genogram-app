import type { Scale } from './types';

// 簡式發展量表 — 0-6 歲早療篩檢(簡化版)
// 6 大領域 boolean,各領域是否達到預期里程碑;勾起 = 達標
export const devScreeningScale: Scale = {
  id: 'dev-screening',
  name: '兒童發展簡式量表',
  category: 'child',
  description: '0-6 歲早療篩檢',
  source: '台灣國健署「兒童發展連續性評估」/ 各早療中心版本',
  licenseStatus: 'free-clinical',
  disabled: true,
  disabledMessage:
    '兒童發展量表依年齡分多版本(0-3 個月/4-6 個月/.../5-6 歲),題目超過百項。請至國健署「兒童健康手冊」或各縣市社會局早療通報轉介中心取得標準版。',
  officialUrl:
    'https://www.hpa.gov.tw/Pages/List.aspx?nodeid=126',
  needsTarget: true,
  questions: [
    { id: 'gross', type: 'boolean', text: '粗動作:符合年齡(走/跑/跳)' },
    { id: 'fine', type: 'boolean', text: '精細動作:符合年齡(抓/握/畫)' },
    {
      id: 'language',
      type: 'boolean',
      text: '語言:符合年齡(發音/詞彙/句子)',
    },
    { id: 'cognition', type: 'boolean', text: '認知:符合年齡(理解/記憶)' },
    { id: 'social', type: 'boolean', text: '社會情緒:符合年齡(互動/情緒)' },
    {
      id: 'selfcare',
      type: 'boolean',
      text: '生活自理:符合年齡(進食/如廁/穿衣)',
    },
  ],
  scoring: (answers) => {
    const passed = Object.values(answers).filter((v) => v === true).length;
    const failed = 6 - passed;
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (failed === 0) {
      level = '全領域達標';
      levelColor = 'green';
    } else if (failed === 1) {
      level = '單一領域疑慮(觀察)';
      levelColor = 'yellow';
    } else {
      level = '多領域疑慮(轉介早療評估)';
      levelColor = 'red';
    }
    return { totalScore: passed, level, levelColor };
  },
};
