import type { Scale } from './types';

// 巴氏量表 (Barthel Index of Activities of Daily Living)
// Mahoney & Barthel 1965;public domain
// 台灣長照給付 / 外籍看護申請依據
// 10 項;總分 0-100,分數越高越獨立
export const barthelScale: Scale = {
  id: 'barthel',
  name: '巴氏量表 (Barthel Index)',
  category: 'disability',
  description:
    '日常生活活動評估,10 項共 100 分;台灣長照、外籍看護申請通用',
  source: 'Mahoney & Barthel 1965(public domain),衛福部長照標準',
  licenseStatus: 'public',
  officialUrl: 'https://1966.gov.tw',
  needsTarget: true,
  questions: [
    {
      id: 'feeding',
      type: 'choice',
      text: '一、進食',
      choices: [
        { value: '10', label: '完全自理(可使用任何輔具,自行夾食、自取水)', score: 10 },
        {
          value: '5',
          label: '需協助(夾菜、淋醬油、切肉、夾肉到碗)',
          score: 5,
        },
        { value: '0', label: '完全依賴他人餵食', score: 0 },
      ],
    },
    {
      id: 'transfer',
      type: 'choice',
      text: '二、移位(包含由床上平躺到坐起,並可由床移位到輪椅)',
      choices: [
        { value: '15', label: '可獨立完成,包括輪椅煞車及移開腳踏板', score: 15 },
        { value: '10', label: '需些微協助(口語指導)或照顧者監督', score: 10 },
        { value: '5', label: '可自行從床上坐起,但移位需他人協助', score: 5 },
        { value: '0', label: '需他人完全協助', score: 0 },
      ],
    },
    {
      id: 'grooming',
      type: 'choice',
      text: '三、個人衛生(刷牙、洗臉、洗手、梳頭、刮鬍子)',
      choices: [
        { value: '5', label: '可自行刷牙、洗臉、洗手、梳頭、刮鬍子', score: 5 },
        { value: '0', label: '需他人協助', score: 0 },
      ],
    },
    {
      id: 'toilet',
      type: 'choice',
      text: '四、上廁所(包括穿脫衣物、擦拭、沖水)',
      choices: [
        { value: '10', label: '可自理,包括穿脫衣物、清潔、沖水', score: 10 },
        {
          value: '5',
          label: '需協助保持平衡、整理衣物或使用衛生紙',
          score: 5,
        },
        { value: '0', label: '無法自行上廁所', score: 0 },
      ],
    },
    {
      id: 'bathing',
      type: 'choice',
      text: '五、洗澡',
      choices: [
        { value: '5', label: '可自行完成(進出浴缸、淋浴)', score: 5 },
        { value: '0', label: '需協助', score: 0 },
      ],
    },
    {
      id: 'mobility',
      type: 'choice',
      text: '六、平地走動',
      choices: [
        {
          value: '15',
          label: '可獨立行走 50 公尺以上,可使用輔具但不包括輪椅',
          score: 15,
        },
        { value: '10', label: '需稍微扶持或口頭協助行走 50 公尺', score: 10 },
        {
          value: '5',
          label: '無法行走但可獨立操作輪椅(包含轉彎、進門及接近桌子、床沿)',
          score: 5,
        },
        { value: '0', label: '無法行走、亦無法操作輪椅', score: 0 },
      ],
    },
    {
      id: 'stairs',
      type: 'choice',
      text: '七、上下樓梯',
      choices: [
        { value: '10', label: '可自行上下樓梯(可抓扶手或拐杖)', score: 10 },
        { value: '5', label: '需稍微扶持或口頭指導', score: 5 },
        { value: '0', label: '無法上下樓梯', score: 0 },
      ],
    },
    {
      id: 'dressing',
      type: 'choice',
      text: '八、穿脫衣物(包含鞋、襪、輔具)',
      choices: [
        { value: '10', label: '可自行穿脫衣物、鞋襪及輔具', score: 10 },
        { value: '5', label: '需協助,但約一半過程可自行完成', score: 5 },
        { value: '0', label: '需完全協助', score: 0 },
      ],
    },
    {
      id: 'bowel',
      type: 'choice',
      text: '九、大便控制',
      choices: [
        { value: '10', label: '不會失禁,需要時會自行使用塞劑', score: 10 },
        { value: '5', label: '偶爾失禁(每週不超過一次),或需協助使用塞劑', score: 5 },
        { value: '0', label: '失禁或需灌腸', score: 0 },
      ],
    },
    {
      id: 'bladder',
      type: 'choice',
      text: '十、小便控制',
      choices: [
        {
          value: '10',
          label: '日夜皆不會失禁,或可以自行使用並清理尿管器具',
          score: 10,
        },
        {
          value: '5',
          label: '偶爾失禁(每週不超過一次),或尿急(無法等待便盆)、或需協助使用尿管',
          score: 5,
        },
        { value: '0', label: '失禁或需導尿', score: 0 },
      ],
    },
  ],
  scoring: (answers) => {
    let total = 0;
    for (const v of Object.values(answers)) {
      const n = parseInt(String(v), 10);
      if (!isNaN(n)) total += n;
    }
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total >= 91) {
      level = '完全獨立 (91-100)';
      levelColor = 'green';
    } else if (total >= 61) {
      level = '輕度依賴 (61-90)';
      levelColor = 'green';
    } else if (total >= 41) {
      level = '中度依賴 (41-60)';
      levelColor = 'yellow';
    } else if (total >= 21) {
      level = '嚴重依賴 (21-40)';
      levelColor = 'red';
    } else {
      level = '完全依賴 (0-20)';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
