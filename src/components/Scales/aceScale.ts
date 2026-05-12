import type { Scale } from './types';

// ACE — Adverse Childhood Experiences(童年逆境經驗)
// Felitti & Anda 1998 / CDC 推廣,public domain
// 10 題 Yes/No,評估「你 18 歲之前」的家庭經驗;4+ 為高風險
export const aceScale: Scale = {
  id: 'ace',
  name: 'ACE 童年逆境經驗量表',
  category: 'violence',
  description:
    '10 題 Yes/No,評估「18 歲之前」的家庭經驗;4+ 高風險(成年慢性疾病/心理問題機率增)',
  source: 'Felitti & Anda 1998 / CDC(public domain)',
  licenseStatus: 'public',
  officialUrl:
    'https://www.cdc.gov/violenceprevention/aces/index.html',
  needsTarget: true,
  questions: [
    {
      id: 'q1',
      type: 'boolean',
      text: '你 18 歲之前,父母或家中大人曾經:常常或非常常常 — 咒罵你、侮辱你、貶低你、羞辱你?或讓你害怕被身體傷害?',
    },
    {
      id: 'q2',
      type: 'boolean',
      text: '父母或家中大人曾經:常常或非常常常 — 推、抓、打、丟東西打你?或重重打到留下傷痕?',
    },
    {
      id: 'q3',
      type: 'boolean',
      text: '比你大 5 歲以上的成人或他人,曾經 — 撫摸或要你撫摸他們的身體性部位?或試圖/實際與你發生口/肛/陰道性行為?',
    },
    {
      id: 'q4',
      type: 'boolean',
      text: '你常常或非常常常感覺 — 家人不愛你、不認為你重要、不關心彼此?',
    },
    {
      id: 'q5',
      type: 'boolean',
      text: '你常常或非常常常感覺 — 沒有足夠食物吃、必須穿髒衣服、無人保護你?或父母太醉/太嗨而無法照顧你或帶你看醫生?',
    },
    {
      id: 'q6',
      type: 'boolean',
      text: '父母離婚或分居?',
    },
    {
      id: 'q7',
      type: 'boolean',
      text: '母親(或繼母)曾經被推、抓、打、踢、咬、被武器威脅?',
    },
    {
      id: 'q8',
      type: 'boolean',
      text: '你和酗酒、用毒品的人共同生活?',
    },
    {
      id: 'q9',
      type: 'boolean',
      text: '家中有人有憂鬱症、精神疾病、或曾自殺?',
    },
    {
      id: 'q10',
      type: 'boolean',
      text: '家中有人入獄?',
    },
  ],
  scoring: (answers) => {
    const total = Object.values(answers).filter((v) => v === true).length;
    let level: string;
    let levelColor: 'green' | 'yellow' | 'red';
    if (total === 0) {
      level = '無';
      levelColor = 'green';
    } else if (total <= 3) {
      level = '輕至中度童年逆境';
      levelColor = 'yellow';
    } else if (total <= 6) {
      level = '高度童年逆境(注意成年身心健康風險)';
      levelColor = 'red';
    } else {
      level = '極高度童年逆境(強烈建議專業介入)';
      levelColor = 'red';
    }
    return { totalScore: total, level, levelColor };
  },
};
