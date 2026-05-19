// ========================================
// GenogramProject Type System v1.0
// ========================================
// 來源: 參考資料/簡單圖形討論.md + 整體概念圖.md Part 3
// 設計哲學: 關注點分離 (Separation of Concerns)
// ========================================

// ==================== 1. Person ====================

export type Person = {
  id: string;
  position: { x: number; y: number };

  // 6 個視覺維度
  shape: BasicShape;
  genderVariant?: GenderVariant;
  lifeStatus?: LifeStatus;
  fillPatterns?: FillPattern[];
  customMarks?: CustomMark[];
  textInfo?: TextInfo;

  basicInfo?: BasicInfo;

  // 完整日期(年月日)
  birthDate?: PartialDate;
  deathDate?: PartialDate;
  /** 出生 / 死亡年份是否以在地年份顯示
   *  - true:UI 下拉與畫布顯示用民國年(西元 - 1911)
   *  - false / undefined:用西元年
   *  內部資料永遠存西元 — 此 flag 只影響顯示層 */
  useLocalYear?: boolean;

  // 醫療 / 用藥
  medicalConditions?: MedicalCondition[];
  medications?: Medication[];

  isProband?: boolean;
  scale?: number;
  notes?: string;

  /** 多胞胎群組 id(同 id = 同一胎)*/
  twinGroupId?: string;
  /** 卵性 — 分卵(fraternal)/ 同卵(identical) */
  twinType?: 'fraternal' | 'identical';
};

export type PartialDate = {
  year?: number;
  month?: number;
  day?: number;
};

export type MedicalCondition = {
  id: string;
  name: string;
  diagnosedYear?: string;
  status?: string; // 病況(穩定/急性發作/慢性/緩解/復發/已痊癒)
  medicalVisit?: string; // 就醫狀態
  compliance?: string; // 配合程度
  note?: string;
};

export type Medication = {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string; // 每日次數(QD/BID/TID/QID/Q8H...)
  timing?: string; // 時機(AC/PC/HS/PRN...)
  prescriber?: string;
  note?: string;
};

export type BasicShape =
  | 'square'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'institution'
  | 'pet';

export type GenderVariant =
  | 'cisgender'
  | 'mtf'
  | 'ftm'
  | 'gay'
  | 'lesbian'
  | 'bisexual';

export type LifeStatus =
  | 'alive'
  | 'deceased'
  | 'pregnancy'
  | 'miscarriage'
  | 'stillbirth'
  | 'abortion';

export type FillPattern =
  // 基本半填
  | 'left-half-filled'
  | 'right-half-filled'
  | 'bottom-half-filled'
  | 'top-half-filled'
  | 'fully-filled'
  // 斜線(疑似)
  | 'left-diagonal-stripes'
  | 'bottom-diagonal-stripes'
  // 橫線(復原)
  | 'left-horizontal-stripes'
  | 'bottom-horizontal-stripes'
  // 合併
  | 'combined-filled'
  | 'combined-recovery'
  | 'cross-recovery'
  // 遺傳(框內)
  | 'carrier-dot'
  | 'affected-cross'
  | 'suspected-vertical'
  | 'possibly-question'
  // 舊名(向後相容)
  | 'diagonal-stripes';

export type CustomMark = {
  id: string;
  symbol: string;
  label: string;
  position?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'center';
  color?: string;
};

export type TextInfo = {
  birthYear?: string;
  age?: number;
  deathYear?: string;
  lifeSpan?: number;
  location?: string;
  income?: string;
  occupation?: string;
};

export type BasicInfo = {
  name?: string;
  ageDetail?: string;
  occupations?: string[];
  phones?: ContactInfo[];
  emails?: ContactInfo[];
  hasDisability?: boolean;
  disabilityDetail?: string;
  freeNote?: string;
  // 個人屬性(都可保密)
  education?: string;
  /** 教育狀態(僅在 education 有值時意義),預設 'graduated' */
  educationStatus?: 'graduated' | 'attending' | 'dropped';
  ethnicity?: string;
  religion?: string;
  disabilities?: Disability[];
  caseRole?: string; // 案件角色:單選
  familyRoles?: string[]; // 法律/家庭角色:多選
  /** 子女來源(輔助生殖) */
  conceptionType?:
    | 'natural'
    | 'sperm-donor'
    | 'egg-donor'
    | 'ivf'
    | 'surrogate';
};

export type Disability = {
  id: string;
  type: string; // 例:肢體 / 智能 / 精神 / 視覺
  level?: string; // 例:輕度 / 中度 / 重度 / 極重度
  note?: string;
};

export type ContactInfo = {
  label: string;
  value: string;
};

// ==================== 2. Line ====================

export type Line = {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  category: LineCategory;
  subType: LineSubType;
  visual: LineVisual;
  note?: string;
  /** 是否保密(圖片匯出隱藏關係細節時整條移除)*/
  private?: boolean;
  scale?: number;
};

export type LineCategory = 'member' | 'relation';

export type MemberSubType =
  // 婚姻系列
  | 'marriage'
  | 'engagement'
  | 'divorce'
  | 'separation' // 事實分居
  | 'legal-separation'
  | 'engagement-separation'
  | 'widowed'
  | 'cohabitation'
  | 'legal-cohabitation'
  | 'engagement-cohabitation'
  | 'love-affair'
  // 舊名(保留向後相容,會在載入時 migrate 到新名)
  | 'cohabitation-commit'
  | 'partnership'
  | 'secret-affair'
  | 'divorce-remarriage'
  // 親子系列
  | 'biological'
  | 'adopted'
  | 'fostered'
  | 'placed-out'
  | 'sperm-donor'
  // 手足
  | 'twins'
  | 'identical-twins'
  // 妊娠
  | 'miscarriage'
  | 'stillbirth'
  | 'abortion'
  // 未明家人關係(占位用 — 知道是家人但不清楚具體型態,之後可升級)
  | 'unknown-family';

export type RelationSubType =
  | 'connected'
  | 'close'
  | 'fused'
  | 'spiritual'
  | 'distant'
  | 'focus-on'
  | 'hostile'
  | 'close-hostile'
  | 'negative-focus'
  | 'physical-abuse'
  | 'emotional-abuse'
  | 'sexual-abuse'
  | 'caregiver'
  | 'cutoff'
  | 'cutoff-repaired';

export type LineSubType = MemberSubType | RelationSubType;

export type LineVisual = {
  lineStyle:
    | 'solid'
    | 'dashed'
    | 'dotted'
    | 'dash-dot'
    | 'wavy'
    | 'zigzag'
    | 'double'
    | 'triple'
    | 'quadruple';
  symbols?: LineSymbol[];
  arrow?: 'none' | 'forward' | 'backward' | 'bidirectional';
  color?: string;
  thickness?: number;
};

export type LineSymbol = {
  type:
    | 'slash-single'
    | 'slash-double'
    | 'cross'
    | 'knot'
    | 'date-label';
  position: 'start' | 'middle' | 'end';
  text?: string;
};

// ==================== 2.5 Network Unit (資源單位) ====================

export type ConnectorTarget =
  | { type: 'person'; id: string }
  | { type: 'unit'; id: string }
  | { type: 'ecosystem'; id: string };

export type NetworkConnector = {
  id: string;
  target: ConnectorTarget;
  /** 連線的關係類型(套用 15 種關係線之一)
   *  - 預設 'focus-on' (#67,單位專注於對方)
   *  - 使用者可在 Tab2 改成任何關係 subType */
  subType?: RelationSubType;
  /** 線條備注(雙擊線可編輯) */
  note?: string;
};

export type NetworkUnit = {
  id: string;
  position: { x: number; y: number };
  name: string;
  note?: string;
  isActive: boolean; // true=服務中 / false=曾經資源
  connectors?: NetworkConnector[]; // 使用者按 ▲ 手動拉出的連線
  /** 是否保密 */
  private?: boolean;
  /** @deprecated 已遷移到 connectors,僅供向下相容讀取 */
  linkedPersonIds?: string[];
};

// ==================== 3. Household ====================

export type Household = {
  id: string;
  memberIds: string[];
  visual: {
    style: 'dashed-circle';
    color?: string;
    thickness?: number;
  };
  label?: string;
  note?: string;
};

// ==================== 4. Custom Field ====================

export type CustomField = {
  id: string;
  name: string;
  type:
    | 'text'
    | 'longtext'
    | 'number'
    | 'date'
    | 'select'
    | 'multiselect'
    | 'boolean'
    | 'file';
  value: unknown;
  options?: string[];
  required?: boolean;
};

// ==================== 5. Genogram (top-level) ====================

export type Genogram = {
  schemaVersion: '1.0';
  id: string;
  caseName: string;
  createdAt: string;
  lastModifiedAt: string;

  persons: Person[];
  lines: Line[];
  households?: Household[];
  networkUnits?: NetworkUnit[];
  ecosystems?: Ecosystem[];

  canvas: {
    gridSize: number;
    snapToGrid: boolean;
    backgroundColor?: string;
  };

  customFields?: Record<string, unknown>;
  versionHistory?: VersionSnapshot[];

  /** 量表施測結果(歷次紀錄,跨各種量表) */
  scaleResults?: ScaleResult[];

  /** 訪談筆記(時序) */
  interviewNotes?: InterviewNote[];
  /** 文件附件(實際檔案在 File System Access API 的個案資料夾,或外部連結) */
  attachments?: AttachmentRef[];
  /** 重大事件時間軸 */
  majorEvents?: MajorEvent[];
  /** 資源使用紀錄(時序事件,跟 NetworkUnit 不一定 1-to-1) */
  resourceUsages?: ResourceUsage[];
};

export type ResourceUsage = {
  id: string;
  /** ISO date(YYYY-MM-DD) */
  startDate: string;
  endDate?: string;
  service: string; // 服務內容 / 機構名稱
  status?: 'ongoing' | 'completed' | 'paused' | 'terminated';
  note?: string;
  /** 可選綁定 NetworkUnit */
  unitId?: string;
};

export type MajorEvent = {
  id: string;
  /** ISO date(YYYY-MM-DD) */
  date: string;
  title: string;
  /** 類型:結婚 / 離婚 / 出生 / 死亡 / 入學 / 就業 / 搬家 / 重大疾病 / 創傷事件 / 其他 */
  type?: string;
  description?: string;
  /** 此事件牽涉到的人物 ID 列表(可選) */
  relatedPersonIds?: string[];
};

export type InterviewNote = {
  id: string;
  /** ISO datetime(完整時間) */
  date: string;
  content: string;
  author?: string;
};

export type AttachmentRef = {
  id: string;
  filename: string;
  /** B 模式:檔案在個案資料夾內 */
  inFolder?: boolean;
  /** C 模式:外部連結(URL 或 file://) */
  url?: string;
  size?: number;
  mime?: string;
  addedAt: string;
};

/** 量表結果 — 每次施測一筆,帶 scaleId 區分量表種類 */
export type ScaleResult = {
  id: string;
  scaleId: string;
  /** ISO date(YYYY-MM-DD) */
  date: string;
  answers: Record<string, number | string | boolean>;
  totalScore: number;
  level: string;
  levelColor?: 'green' | 'yellow' | 'red';
  targetPersonId?: string;
  notes?: string;
};

export type Ecosystem = {
  id: string;
  points: { x: number; y: number }[];
  label?: string;
  /** 是否保密 */
  private?: boolean;
};

export type VersionSnapshot = {
  versionId: string;
  snapshotAt: string;
  label?: string;
  changes: string[];
  fullData: Genogram;
};
