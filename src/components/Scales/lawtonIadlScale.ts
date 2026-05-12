import type { Scale } from './types';

// Lawton IADL — Instrumental Activities of Daily Living
// Lawton & Brody 1969;有版權但臨床/研究廣泛使用,中文版多家版本
// 8 項;台灣常用 0-8 分版(每項可獨立 = 1 分)
// 註:女性原版 8 項全測,男性原版省略「準備餐食/做家事/洗衣服」
//     此處採台灣長照常用版,8 項皆計
export const lawtonIadlScale: Scale = {
  id: 'lawton-iadl',
  name: 'Lawton IADL 工具性日常活動量表',
  category: 'disability',
  description: '8 項進階生活功能;0-8 分,分數越高越獨立',
  source: 'Lawton & Brody 1969,中文版台灣長照通用',
  licenseStatus: 'free-clinical',
  needsTarget: true,
  questions: [
    {
      id: 'phone',
      type: 'boolean',
      text: '能獨立使用電話(查號、撥號、接電話)',
    },
    {
      id: 'shopping',
      type: 'boolean',
      text: '能獨立購物(包含選購、結帳、攜回)',
    },
    {
      id: 'food',
      type: 'boolean',
      text: '能獨立準備餐食(規劃、烹煮、擺盤)',
    },
    {
      id: 'housekeeping',
      type: 'boolean',
      text: '能獨立做家事(掃地、擦桌、洗碗、整理床鋪)',
    },
    {
      id: 'laundry',
      type: 'boolean',
      text: '能獨立洗衣服(包含晾曬、收摺)',
    },
    {
      id: 'transport',
      type: 'boolean',
      text: '能獨立使用交通工具(自行開車或搭乘大眾運輸)',
    },
    {
      id: 'medication',
      type: 'boolean',
      text: '能獨立管理用藥(正確劑量、時間)',
    },
    {
      id: 'finance',
      type: 'boolean',
      text: '能獨立處理財務(付帳單、記帳、上銀行)',
    },
  ],
  scoring: (answers) => {
    const total = Object.values(answers).filter((v) => v === true).length;
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total >= 7) {
      level = '功能良好 (7-8)';
      levelColor = 'green';
    } else if (total >= 4) {
      level = '部分依賴 (4-6)';
      levelColor = 'yellow';
    } else {
      level = '高度依賴 (0-3)';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
