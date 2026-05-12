// 量表系統:類型定義
// 每個量表是純資料宣告(題目 + 計分函式),透過 registry 註冊。
// UI 由 ScaleDialog 動態渲染。

export type ScaleAnswer = number | string | boolean;

export type ScaleQuestion =
  | {
      id: string;
      type: 'likert';
      text: string;
      min: number;
      max: number;
      /** 標籤對應每個 score(可選),長度 = max-min+1 */
      labels?: string[];
    }
  | {
      id: string;
      type: 'boolean';
      text: string;
    }
  | {
      id: string;
      type: 'choice';
      text: string;
      choices: { value: string; label: string; score?: number }[];
    };

export type ScaleCategory =
  | 'family' // 家庭功能
  | 'crisis' // 危機篩檢
  | 'disability' // 身障 / 失能
  | 'violence' // 暴力 / 性暴力 / 創傷
  | 'child' // 兒少
  | 'mental' // 心理評估
  | 'substance' // 物質使用
  | 'elderly' // 老人 / 長照
  | 'external'; // 外部連結(商業授權 / 各機構自有版本 → 點進去看連結)

export const SCALE_CATEGORY_META: Record<
  ScaleCategory,
  { label: string; icon: string; order: number }
> = {
  family: { label: '家庭功能', icon: '👫', order: 1 },
  crisis: { label: '危機篩檢', icon: '🔥', order: 2 },
  mental: { label: '心理評估', icon: '🧠', order: 3 },
  substance: { label: '物質使用', icon: '🍶', order: 4 },
  violence: { label: '暴力 / 創傷', icon: '🚨', order: 5 },
  child: { label: '兒少', icon: '👶', order: 6 },
  elderly: { label: '老人 / 長照', icon: '👴', order: 7 },
  disability: { label: '身障 / 失能', icon: '🩼', order: 8 },
  external: { label: '外部連結(需另行取得)', icon: '🔗', order: 99 },
};

export type Scale = {
  id: string;
  name: string;
  category: ScaleCategory;
  description?: string;
  questions: ScaleQuestion[];
  /** 給答案算總分 + 等級 */
  scoring: (answers: Record<string, ScaleAnswer>) => {
    totalScore: number;
    level: string;
    /** 等級色:綠=好 / 黃=中 / 紅=警示 */
    levelColor?: 'green' | 'yellow' | 'red';
  };
  /** 是否要綁特定人物(預設 false,評估整個家庭) */
  needsTarget?: boolean;

  /** 量表來源(顯示在 Dialog 上方) */
  source?: string;
  /** 授權狀態 */
  licenseStatus?: 'public' | 'free-clinical' | 'commercial' | 'informal';
  /** 設 true → ScaleDialog 不顯示題目,改顯示「需另行授權」說明 */
  disabled?: boolean;
  /** disabled 時顯示的訊息 */
  disabledMessage?: string;
  /** 官方版本連結(disabled / informal 時可點去看) */
  officialUrl?: string;
};

export type ScaleResult = {
  id: string;
  scaleId: string;
  /** ISO date(YYYY-MM-DD) */
  date: string;
  answers: Record<string, ScaleAnswer>;
  totalScore: number;
  level: string;
  levelColor?: 'green' | 'yellow' | 'red';
  /** 評估對象(若 scale.needsTarget) */
  targetPersonId?: string;
  notes?: string;
};
