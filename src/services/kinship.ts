// ========================================
// 「族譜」中文稱謂查詢 —— 純函式核心
// ========================================
// 從「我」出發,一步一步走出一條親屬關係鏈,回答這條鏈在中文裡叫什麼,
// 同時吐出一張迷你家系圖的節點與連線(給 UI 畫,不碰畫布、不碰 store)。
//
// 設計原則:
//   1. 本檔不 import store、不 import React —— 純資料進、純資料出,好測試
//   2. 稱謂是**查表**,不是推導。中文稱謂充滿例外(姑姑在父系但她的小孩叫「表」),
//      任何想用「父系/母系」或「有沒有經過女性」推導堂表的做法都會教錯人。
//   3. 查不到就誠實說查不到,不硬掰
//
// ⚠️ 堂 vs 表(社工最常搞錯,也是多數設計會弄錯的地方):
//    在**平輩**這一層:堂 = 爸爸的「兄弟」的小孩;其餘(姑姑的、舅舅的、阿姨的)都是表。
//    判準看的是**中間的連結者**,不是最後那個人:
//      爸爸 → 兄/弟(中間全是男性)→ 小孩  = 堂   (父·兄·女 = 堂姊,最後一步是女性也還是堂)
//      中間只要出現任何女性(媽媽、姑姑、阿姨)= 表
//    「父系=堂」是錯的 —— 姑姑在父系,她的小孩是表。
//    「跟你同姓」只是傳統上的伴隨現象,不是判準(招贅、改姓都會破例)。
//    另外「堂」字不限平輩(還有堂伯、堂叔、堂姑、堂姪、堂孫),指的是同宗父系旁支。
// ========================================

/** 原子步驟 —— 使用者一次能走的一步。兄/弟、姊/妹要分開,因為伯伯 vs 叔叔就差在這 */
export type Step = 'F' | 'M' | 'EB' | 'YB' | 'ES' | 'YS' | 'H' | 'W' | 'S' | 'D';

export type StepSpec = {
  key: Step;
  /** 按鈕上的字(用完整口語詞,不用單字,對一般人比較好懂)*/
  label: string;
  gender: 'male' | 'female';
  /** 相對於目前這個人的世代位移 */
  genDelta: -1 | 0 | 1;
};

export const STEPS: readonly StepSpec[] = [
  { key: 'F', label: '爸爸', gender: 'male', genDelta: -1 },
  { key: 'M', label: '媽媽', gender: 'female', genDelta: -1 },
  { key: 'EB', label: '哥哥', gender: 'male', genDelta: 0 },
  { key: 'YB', label: '弟弟', gender: 'male', genDelta: 0 },
  { key: 'ES', label: '姊姊', gender: 'female', genDelta: 0 },
  { key: 'YS', label: '妹妹', gender: 'female', genDelta: 0 },
  { key: 'H', label: '先生', gender: 'male', genDelta: 0 },
  { key: 'W', label: '太太', gender: 'female', genDelta: 0 },
  { key: 'S', label: '兒子', gender: 'male', genDelta: 1 },
  { key: 'D', label: '女兒', gender: 'female', genDelta: 1 },
];

const STEP_BY_KEY = new Map(STEPS.map((s) => [s.key, s]));

export const stepLabel = (k: Step) => STEP_BY_KEY.get(k)?.label ?? k;
export const stepGender = (k: Step) => STEP_BY_KEY.get(k)?.gender ?? 'male';

/** 一條鏈最多走幾步(超過就沒有通用稱謂了,而且圖會爆)*/
export const MAX_DEPTH = 4;

export type Term = {
  /** 主要稱謂;答案不唯一時用 " / " 並列 */
  term: string;
  /** 別稱 / 各地叫法 */
  alt?: string[];
  /** 為什麼答案不唯一 —— 有值時 UI 要顯眼提示 */
  ambiguous?: string;
  /** 教學說明 */
  note?: string;
};

const t = (
  term: string,
  alt?: string[],
  ambiguous?: string,
  note?: string,
): Term => ({ term, alt, ambiguous, note });

/** 堂表規則的共用說明 —— 這句話是本功能最想教會使用者的東西
 *  刻意限定在「平輩」:「堂」字在別的輩分也會出現(堂伯、堂姑、堂姪),那是同宗父系旁支的意思。
 *  也刻意不用「同姓」當判準 —— 傳統上多半同姓,但招贅、改姓都會破例,真正的判準是血緣路徑。 */
export const TANG_BIAO_RULE =
  '只有「爸爸的兄弟」的小孩是堂;姑姑、舅舅、阿姨的小孩都是表。看中間那個人是誰,不是看最後那個人。';

const AGE_ORDER = '比你年長用前者,年幼用後者';

/**
 * 路徑 → 稱謂對照表。key = 步驟以 '·' 串接。
 * 這是純資料;要支援新的稱謂就在這裡加一行,不需要改任何程式邏輯。
 */
export const KINSHIP: Readonly<Record<string, Term>> = {
  // ============ 第一層 ============
  F: t('爸爸', ['父親', '阿爸']),
  M: t('媽媽', ['母親', '阿母']),
  EB: t('哥哥', ['兄長']),
  YB: t('弟弟'),
  ES: t('姊姊'),
  YS: t('妹妹'),
  H: t('先生', ['丈夫', '老公']),
  W: t('太太', ['妻子', '老婆']),
  S: t('兒子'),
  D: t('女兒'),

  // ============ 第二層:祖輩 ============
  'F·F': t('爺爺', ['祖父', '阿公']),
  'F·M': t('奶奶', ['祖母', '阿嬤']),
  'M·F': t('外公', ['外祖父', '阿公']),
  'M·M': t('外婆', ['外祖母', '阿嬤']),

  // ============ 第二層:父母的手足 ============
  'F·EB': t('伯伯', ['伯父'], undefined, '爸爸的哥哥。比爸爸年幼的叫叔叔。'),
  'F·YB': t('叔叔', ['叔父'], undefined, '爸爸的弟弟。比爸爸年長的叫伯伯。'),
  // ⚠️ alt 刻意不放「小姑」—— 台灣的「小姑」是先生的妹妹(見 H·YS),放在這裡會互相打架
  'F·ES': t('姑姑', ['姑媽', '阿姑'], undefined, '爸爸的姊妹一律叫姑姑,不分長幼。'),
  'F·YS': t('姑姑', ['小姑姑', '阿姑'], undefined, '爸爸的姊妹一律叫姑姑,不分長幼。'),
  'M·EB': t('舅舅', ['大舅'], undefined, '媽媽的兄弟一律叫舅舅,不分長幼。'),
  'M·YB': t('舅舅', ['小舅'], undefined, '媽媽的兄弟一律叫舅舅,不分長幼。'),
  'M·ES': t('阿姨', ['大阿姨'], undefined, '媽媽的姊妹一律叫阿姨,不分長幼。'),
  'M·YS': t('阿姨', ['小阿姨'], undefined, '媽媽的姊妹一律叫阿姨,不分長幼。'),

  // ============ 第二層:重組家庭(社工實務高頻)============
  // 走「爸爸 → 太太」不一定是繼母 —— 也可能就是你媽媽。這裡用 ambiguous 誠實表達兩種可能,
  // 而不是直接斷定成繼母(那會在訪談紀錄裡造成誤判)。
  // ⚠️ 別稱刻意不列「後母 / 後爸」—— 帶貶意,社工紀錄與會談都不該用
  'F·W': t(
    '媽媽 / 繼母',
    undefined,
    '爸爸的太太可能就是你生母,也可能是繼母',
    '重組家庭常見。實務上當面多半跟著叫「阿姨」或直呼名字,「繼母」是書面用語。',
  ),
  'M·H': t(
    '爸爸 / 繼父',
    undefined,
    '媽媽的先生可能就是你生父,也可能是繼父',
    '重組家庭常見。實務上當面多半跟著叫「叔叔」或直呼名字,「繼父」是書面用語。',
  ),

  // ============ 第二層:手足的配偶 / 子女 ============
  'EB·W': t('嫂嫂', ['大嫂']),
  'YB·W': t('弟妹', ['弟媳']),
  'ES·H': t('姊夫'),
  'YS·H': t('妹夫'),
  'EB·S': t('姪子', ['侄子'], undefined, '兄弟的兒子叫姪子;姊妹的兒子叫外甥。'),
  'EB·D': t('姪女', ['侄女']),
  'YB·S': t('姪子', ['侄子'], undefined, '兄弟的兒子叫姪子;姊妹的兒子叫外甥。'),
  'YB·D': t('姪女', ['侄女']),
  'ES·S': t('外甥', undefined, undefined, '姊妹的兒子叫外甥;兄弟的兒子叫姪子。'),
  'ES·D': t('外甥女'),
  'YS·S': t('外甥', undefined, undefined, '姊妹的兒子叫外甥;兄弟的兒子叫姪子。'),
  'YS·D': t('外甥女'),

  // ============ 第二層:晚輩 ============
  'S·S': t('孫子'),
  'S·D': t('孫女'),
  'D·S': t('外孫', undefined, undefined, '女兒生的叫外孫;兒子生的叫孫子。'),
  'D·D': t('外孫女'),
  'S·W': t('媳婦'),
  'D·H': t('女婿'),

  // ============ 第二層:姻親(配偶那一邊)============
  'H·F': t('公公'),
  'H·M': t('婆婆'),
  'W·F': t('岳父', ['丈人']),
  'W·M': t('岳母', ['丈母娘']),
  // 「大伯子 / 大姑子 / 小姑子」的「子」尾是中國大陸講法,台灣不用,刻意不列
  'H·EB': t('大伯', undefined, undefined, '先生的哥哥。先生的弟弟叫小叔。'),
  'H·YB': t('小叔', undefined, undefined, '先生的弟弟。先生的哥哥叫大伯。'),
  'H·ES': t('大姑', undefined, undefined, '先生的姊姊。先生的妹妹叫小姑。'),
  'H·YS': t('小姑', undefined, undefined, '先生的妹妹。先生的姊姊叫大姑。'),
  'W·EB': t('大舅子', ['內兄']),
  'W·YB': t('小舅子', ['內弟']),
  'W·ES': t('大姨子'),
  'W·YS': t('小姨子'),
  // 配偶的小孩不一定是你的小孩 —— 訪談時要先確認是否親生,這裡不替使用者斷定
  'H·S': t('兒子 / 繼子', undefined, '先生的兒子若非你親生,稱繼子', '重組家庭訪談請先確認是否親生。'),
  'H·D': t('女兒 / 繼女', undefined, '先生的女兒若非你親生,稱繼女', '重組家庭訪談請先確認是否親生。'),
  'W·S': t('兒子 / 繼子', undefined, '太太的兒子若非你親生,稱繼子', '重組家庭訪談請先確認是否親生。'),
  'W·D': t('女兒 / 繼女', undefined, '太太的女兒若非你親生,稱繼女', '重組家庭訪談請先確認是否親生。'),

  // ============ 第二層:回頭路 ============
  'H·W': t('你自己', undefined, undefined, '先生的太太就是你本人。'),
  'W·H': t('你自己', undefined, undefined, '太太的先生就是你本人。'),
  // 大字只放最可能的答案,其他可能性交給下面的說明 —— 標題塞兩個答案讀起來很卡
  'F·S': t('你自己', undefined, '也可能是你的哥哥或弟弟 —— 爸爸的兒子不只你一個'),
  'F·D': t('你自己', undefined, '也可能是你的姊姊或妹妹 —— 爸爸的女兒不只你一個'),
  'M·S': t('你自己', undefined, '也可能是你的哥哥或弟弟 —— 媽媽的兒子不只你一個'),
  'M·D': t('你自己', undefined, '也可能是你的姊姊或妹妹 —— 媽媽的女兒不只你一個'),

  // ============ 第三層:父母手足的配偶(社工實務高頻,別漏)============
  'F·EB·W': t('伯母', ['阿姆'], undefined, '伯伯的太太。叔叔的太太叫嬸嬸。'),
  'F·YB·W': t('嬸嬸', ['嬸母', '阿嬸'], undefined, '叔叔的太太。伯伯的太太叫伯母。'),
  // ⚠️ 台灣用「姑丈 / 姨丈」;「姑父 / 姨父 / 姑爹」是中國大陸講法,刻意不放進別稱
  'F·ES·H': t('姑丈', undefined, undefined, '姑姑的先生一律叫姑丈,不分姑姑長幼。'),
  'F·YS·H': t('姑丈', undefined, undefined, '姑姑的先生一律叫姑丈,不分姑姑長幼。'),
  'M·EB·W': t('舅媽', ['阿妗'], undefined, '舅舅的太太一律叫舅媽,不分舅舅長幼。'),
  'M·YB·W': t('舅媽', ['阿妗'], undefined, '舅舅的太太一律叫舅媽,不分舅舅長幼。'),
  'M·ES·H': t('姨丈', undefined, undefined, '阿姨的先生一律叫姨丈,不分阿姨長幼。'),
  'M·YS·H': t('姨丈', undefined, undefined, '阿姨的先生一律叫姨丈,不分阿姨長幼。'),

  // ============ 第三層:堂(爸爸的兄弟的小孩,同姓)============
  'F·EB·S': t('堂哥 / 堂弟', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'F·EB·D': t('堂姊 / 堂妹', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'F·YB·S': t('堂哥 / 堂弟', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'F·YB·D': t('堂姊 / 堂妹', undefined, AGE_ORDER, TANG_BIAO_RULE),

  // ============ 第三層:表(姑姑的、舅舅的、阿姨的小孩)============
  'F·ES·S': t('表哥 / 表弟', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'F·ES·D': t('表姊 / 表妹', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'F·YS·S': t('表哥 / 表弟', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'F·YS·D': t('表姊 / 表妹', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'M·EB·S': t('表哥 / 表弟', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'M·EB·D': t('表姊 / 表妹', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'M·YB·S': t('表哥 / 表弟', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'M·YB·D': t('表姊 / 表妹', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'M·ES·S': t('表哥 / 表弟', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'M·ES·D': t('表姊 / 表妹', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'M·YS·S': t('表哥 / 表弟', undefined, AGE_ORDER, TANG_BIAO_RULE),
  'M·YS·D': t('表姊 / 表妹', undefined, AGE_ORDER, TANG_BIAO_RULE),

  // ============ 第三層:曾祖輩 ============
  'F·F·F': t('曾祖父', ['阿祖']),
  'F·F·M': t('曾祖母', ['阿祖']),
  'M·F·F': t('外曾祖父', ['阿祖']),
  'M·F·M': t('外曾祖母', ['阿祖']),
  'F·M·F': t('外曾祖父', ['阿祖'], '各地叫法不一,也有直接叫曾祖父的'),
  'F·M·M': t('外曾祖母', ['阿祖'], '各地叫法不一,也有直接叫曾祖母的'),
  'M·M·F': t('外曾祖父', ['阿祖'], '各地叫法不一'),
  'M·M·M': t('外曾祖母', ['阿祖'], '各地叫法不一'),

  // ============ 第三層:祖輩的手足 ============
  // 命名邏輯 = 「該長輩相對於祖父母的關係」再加公/婆。母系那一線各地差異大,一律標 ambiguous。
  'F·F·EB': t('伯公', ['伯祖父'], '也有地方叫「大爺爺」'),
  'F·F·YB': t('叔公', ['叔祖父'], '也有地方叫「小爺爺」'),
  'F·F·ES': t('姑婆', ['姑祖母']),
  'F·F·YS': t('姑婆', ['姑祖母']),
  'F·M·EB': t('舅公', ['舅祖父'], '奶奶的兄弟,各地叫法不一'),
  'F·M·YB': t('舅公', ['舅祖父'], '奶奶的兄弟,各地叫法不一'),
  'F·M·ES': t('姨婆', ['姨祖母'], '奶奶的姊妹,各地叫法不一'),
  'F·M·YS': t('姨婆', ['姨祖母'], '奶奶的姊妹,各地叫法不一'),
  'M·F·EB': t('伯公', ['外伯公'], '外公的兄弟,也有人跟著外公那邊叫舅公'),
  'M·F·YB': t('叔公', ['外叔公'], '外公的兄弟,也有人跟著外公那邊叫舅公'),
  'M·F·ES': t('姑婆', ['外姑婆'], '外公的姊妹,各地叫法不一'),
  'M·F·YS': t('姑婆', ['外姑婆'], '外公的姊妹,各地叫法不一'),
  'M·M·EB': t('舅公', ['舅祖父']),
  'M·M·YB': t('舅公', ['舅祖父']),
  'M·M·ES': t('姨婆', ['姨祖母']),
  'M·M·YS': t('姨婆', ['姨祖母']),

  // ============ 第三層:配偶那一邊 ============
  // ⚠️ 這裡刻意不用「太公 / 太婆」—— 台灣的「太公」多指曾祖父(阿祖),
  //    拿來當配偶的祖父會直接教錯人。實務上就是跟著配偶叫。
  'H·F·F': t('爺爺(跟著先生叫)', ['阿公'], '對你沒有專屬稱謂,實務上跟著配偶的叫法'),
  'H·F·M': t('奶奶(跟著先生叫)', ['阿嬤'], '對你沒有專屬稱謂,實務上跟著配偶的叫法'),
  'W·F·F': t('爺爺(跟著太太叫)', ['阿公'], '對你沒有專屬稱謂,實務上跟著配偶的叫法'),
  'W·F·M': t('奶奶(跟著太太叫)', ['阿嬤'], '對你沒有專屬稱謂,實務上跟著配偶的叫法'),
  'W·ES·H': t('連襟', ['襟兄'], undefined, '兩個男人的太太是姊妹,彼此互稱連襟。'),
  'W·YS·H': t('連襟', ['襟弟'], undefined, '兩個男人的太太是姊妹,彼此互稱連襟。'),
  // ⚠️ 舊值「妯娌的先生」是錯的:妯娌是「兄弟的太太」彼此互稱,跟這條路徑無關
  'H·ES·H': t(
    '姊夫(跟著先生叫)',
    ['大姑丈'],
    '對你沒有專屬稱謂,實務上跟著配偶的叫法',
    '先生的姊姊叫大姑,她的先生背稱大姑丈。',
  ),
  'H·YS·H': t(
    '妹夫(跟著先生叫)',
    ['小姑丈'],
    '對你沒有專屬稱謂,實務上跟著配偶的叫法',
    '先生的妹妹叫小姑,她的先生背稱小姑丈。',
  ),
  // 妯娌 = 兄弟的太太彼此互稱,是背稱;當面還是叫大嫂 / 弟妹
  'H·EB·W': t('大嫂', ['妯娌'], undefined, '你們的關係叫「妯娌」,那是背稱;當面叫大嫂。'),
  'H·YB·W': t('弟妹', ['妯娌'], undefined, '你們的關係叫「妯娌」,那是背稱;當面叫弟妹。'),

  // ============ 第三層:親家(子女的配偶的父母)============
  'S·W·F': t('親家公', ['親家'], undefined, '子女配偶的父親,兩家父母之間互稱親家。'),
  'S·W·M': t('親家母', ['親姆'], undefined, '子女配偶的母親,兩家父母之間互稱親家。'),
  'D·H·F': t('親家公', ['親家'], undefined, '子女配偶的父親,兩家父母之間互稱親家。'),
  'D·H·M': t('親家母', ['親姆'], undefined, '子女配偶的母親,兩家父母之間互稱親家。'),

  // ============ 第三層:晚輩 ============
  'S·S·S': t('曾孫'),
  'S·S·D': t('曾孫女'),
  'D·S·S': t('外曾孫', undefined, '各地叫法不一'),
  'D·S·D': t('外曾孫女', undefined, '各地叫法不一'),
  // 兄弟那四條 = 姪孫;姊妹那四條 = 外甥孫。要對稱,不然使用者會以為系統壞了。
  'EB·S·S': t('姪孫', ['侄孫']),
  'EB·S·D': t('姪孫女', ['侄孫女']),
  'YB·S·S': t('姪孫', ['侄孫']),
  'YB·S·D': t('姪孫女', ['侄孫女']),
  'ES·S·S': t('外甥孫', undefined, '各地叫法不一'),
  'ES·S·D': t('外甥孫女', undefined, '各地叫法不一'),
  'YS·S·S': t('外甥孫', undefined, '各地叫法不一'),
  'YS·S·D': t('外甥孫女', undefined, '各地叫法不一'),

  // ============ 第三層:繞回自己人 ============
  'EB·W·H': t('你的哥哥', undefined, undefined, '繞回去了 —— 嫂嫂的先生就是你哥哥。'),
  'EB·W·ES': t('嫂嫂的姊姊', undefined, '沒有廣泛通用的專稱'),
};

/** 把一條路徑轉成查表用的 key */
export const pathKey = (path: readonly Step[]) => path.join('·');

const SIBLING_STEPS: ReadonlySet<Step> = new Set(['EB', 'YB', 'ES', 'YS']);
const MALE_SIBLINGS: readonly Step[] = ['EB', 'YB'];
const FEMALE_SIBLINGS: readonly Step[] = ['ES', 'YS'];

/**
 * 「手足的手足」收合 —— 這是查表法一定會遇到的坑。
 *
 * 例:`媽媽·弟弟·哥哥`。媽媽的弟弟的哥哥,還是媽媽的兄弟(同一對父母生的)。
 * 但**他比媽媽大還是小,關係鏈裡沒有交代** —— 排行資訊在收合的瞬間就遺失了。
 *
 * 所以不是硬給一個答案,也不是回 null,而是把「兄」與「弟」兩種排行都查一次:
 *   媽媽那邊 → M·EB 與 M·YB 都是「舅舅」→ 答案唯一,不用囉唆
 *   爸爸那邊 → F·EB 是「伯伯」、F·YB 是「叔叔」→ 兩種都列出來,並說明為什麼
 *
 * @returns 收合後的候選路徑(長幼各一條);沒有可收合的地方回 null
 */
function collapseSiblingPair(path: readonly Step[]): Step[][] | null {
  const i = path.findIndex(
    (s, idx) => idx > 0 && SIBLING_STEPS.has(s) && SIBLING_STEPS.has(path[idx - 1]),
  );
  if (i === -1) return null;
  const variants =
    stepGender(path[i]) === 'male' ? MALE_SIBLINGS : FEMALE_SIBLINGS;
  // 把第 i-1、i 兩步換成單一個手足步驟(排行未知 → 兩種都生一條)
  return variants.map((v) => [...path.slice(0, i - 1), v, ...path.slice(i + 1)]);
}

const SIBLING_AGE_UNKNOWN =
  '手足的手足還是同一組兄弟姊妹,但「排行」在關係鏈裡沒有交代 —— 要看他實際比誰年長';

/**
 * 查稱謂。先精確比對;查不到才嘗試收合「手足的手足」。
 * 真的查不到就回 null —— UI 會誠實說「沒有專門稱謂」,不硬掰。
 */
export function lookup(path: readonly Step[]): Term | null {
  if (path.length === 0) return null;
  const exact = KINSHIP[pathKey(path)];
  if (exact) return exact;

  const variants = collapseSiblingPair(path);
  if (!variants) return null;

  const hits = variants
    .map((v) => lookup(v))
    .filter((r): r is Term => r !== null);
  if (hits.length === 0) return null;

  const terms = [...new Set(hits.map((h) => h.term))];
  // 兩種排行答案一樣(例:舅舅)→ 直接沿用,不需要打擾使用者
  if (terms.length === 1) return hits[0];

  // 答案不同(例:伯伯 vs 叔叔)→ 兩個都列,並說明排行未知
  const isMyOwnSiblings = variants[0].length === 1;
  return {
    term: terms.join(' / '),
    ambiguous:
      SIBLING_AGE_UNKNOWN + (isMyOwnSiblings ? ';也可能就是你自己' : ''),
    note: hits[0].note,
  };
}

/** 把路徑轉成白話句子:「我的爸爸的哥哥」 */
export function describePath(path: readonly Step[]): string {
  if (path.length === 0) return '我';
  return '我的' + path.map(stepLabel).join('的');
}

// ==================== 迷你家系圖佈局 ====================
// 因為一條鏈是**線性**的(最多 4 步),佈局比一般家系圖單純很多:
// 不需要碰撞求解器,只要記住每一格(世代 × 欄位)有沒有人就好。

export type DiagramNode = {
  id: string;
  gender: 'male' | 'female';
  /** 世代:0 = 我,-1 = 父母那一輩,+1 = 子女那一輩 */
  gen: number;
  /** 水平格位(可為小數) */
  col: number;
  /** 這個人從「我」走過來的完整路徑 */
  path: Step[];
  /** 名牌 = 這個人**相對於我**的稱謂(我 → 爸爸 → 爺爺),不是相對於上一個人
   *  這樣圖本身就在教人,而且不會出現兩個「爸爸」 */
  label: string;
  /** self = 我;target = 這條鏈的終點(答案);path = 途中經過的人;implied = 為了畫圖自動補上的人 */
  role: 'self' | 'target' | 'path' | 'implied';
};

export type DiagramEdge =
  | { kind: 'marriage'; a: string; b: string }
  | { kind: 'child'; parents: string[]; child: string };

export type Diagram = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  targetId: string;
};

/** 一對配偶之間的水平距離(格) */
const COUPLE_SPAN = 2;

type BuildState = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  occupied: Set<string>;
  seq: number;
};

const cellKey = (gen: number, col: number) => `${gen}:${Math.round(col * 10)}`;

/**
 * 名牌 = 相對於「我」的稱謂。
 * 查不到專屬稱謂時退回「相對於上一個人」的講法,並**加上括號**標示它不是相對於我的稱呼
 * —— 不加括號的話,「我的太太的姊姊的姊姊」會在圖上顯示成「姊姊」,被誤讀成我的姊姊。
 */
function labelFor(path: Step[]): string {
  if (path.length === 0) return '我';
  const hit = lookup(path);
  if (hit) return hit.term;
  return `(${stepLabel(path[path.length - 1])})`;
}

function place(
  st: BuildState,
  gender: 'male' | 'female',
  gen: number,
  desiredCol: number,
  dir: 1 | -1,
  path: Step[],
  role: DiagramNode['role'],
): DiagramNode {
  let col = desiredCol;
  let guard = 12;
  while (st.occupied.has(cellKey(gen, col)) && guard-- > 0) col += dir * COUPLE_SPAN;
  st.occupied.add(cellKey(gen, col));
  const node: DiagramNode = {
    id: `n${++st.seq}`,
    gender,
    gen,
    col,
    path,
    label: labelFor(path),
    role,
  };
  st.nodes.push(node);
  return node;
}

const parentsEdgeOf = (st: BuildState, childId: string) =>
  st.edges.find((e) => e.kind === 'child' && e.child === childId) as
    | Extract<DiagramEdge, { kind: 'child' }>
    | undefined;

const spouseOf = (st: BuildState, id: string): DiagramNode | undefined => {
  const m = st.edges.find(
    (e) => e.kind === 'marriage' && (e.a === id || e.b === id),
  ) as Extract<DiagramEdge, { kind: 'marriage' }> | undefined;
  if (!m) return undefined;
  const otherId = m.a === id ? m.b : m.a;
  return st.nodes.find((n) => n.id === otherId);
};

/** 確保某人有父母(走手足時需要);回傳 [父, 母] */
function ensureParents(st: BuildState, child: DiagramNode): DiagramNode[] {
  const existing = parentsEdgeOf(st, child.id);
  if (existing) {
    return existing.parents
      .map((pid) => st.nodes.find((n) => n.id === pid))
      .filter((n): n is DiagramNode => !!n);
  }
  const gen = child.gen - 1;
  // 父母兩人的路徑都推導得出來,所以名牌一開始就是對的(爸爸 / 媽媽、爺爺 / 奶奶)
  const father = place(st, 'male', gen, child.col - 1, -1, [...child.path, 'F'], 'implied');
  const mother = place(st, 'female', gen, child.col + 1, 1, [...child.path, 'M'], 'implied');
  st.edges.push({ kind: 'marriage', a: father.id, b: mother.id });
  st.edges.push({ kind: 'child', parents: [father.id, mother.id], child: child.id });
  return [father, mother];
}

/**
 * 依照一條關係鏈長出迷你家系圖。
 * 純函式:同一條 path 永遠得到同一張圖。
 */
export function buildDiagram(path: readonly Step[]): Diagram {
  const st: BuildState = { nodes: [], edges: [], occupied: new Set(), seq: 0 };
  const me = place(st, 'male', 0, 0, 1, [], 'self');
  let cur = me;

  for (const step of path) {
    const spec = STEP_BY_KEY.get(step);
    if (!spec) continue;
    const nextPath: Step[] = [...cur.path, step];

    if (step === 'F' || step === 'M') {
      const parents = ensureParents(st, cur);
      const hit = parents.find((p) => p.gender === spec.gender);
      if (hit) {
        // 這個人是被「走到」的,不是為了畫圖補的
        if (hit.role === 'implied') hit.role = 'path';
        cur = hit;
      }
      continue;
    }

    if (step === 'H' || step === 'W') {
      // 我的性別由配偶反推(選「先生」代表我是女性)
      if (cur.id === me.id && me.role === 'self') {
        me.gender = spec.gender === 'male' ? 'female' : 'male';
      }
      const existing = spouseOf(st, cur.id);
      if (existing && existing.gender === spec.gender) {
        cur = existing;
        continue;
      }
      const node = place(
        st,
        spec.gender,
        cur.gen,
        cur.col + COUPLE_SPAN,
        1,
        nextPath,
        'path',
      );
      st.edges.push({ kind: 'marriage', a: cur.id, b: node.id });
      cur = node;
      continue;
    }

    if (step === 'EB' || step === 'YB' || step === 'ES' || step === 'YS') {
      const parents = ensureParents(st, cur);
      // 長者在左、幼者在右(家系圖慣例)
      const elder = step === 'EB' || step === 'ES';
      // 緊鄰目前這個人擺放,撞到再由 place() 往同方向推。
      // (舊版用整個世代的 min/max,會把手足甩到很遠,圖被撐寬 → 整張圖被縮小 → 名牌變得看不清)
      const desired = cur.col + (elder ? -COUPLE_SPAN : COUPLE_SPAN);
      const node = place(
        st,
        spec.gender,
        cur.gen,
        desired,
        elder ? -1 : 1,
        nextPath,
        'path',
      );
      st.edges.push({
        kind: 'child',
        parents: parents.map((p) => p.id),
        child: node.id,
      });
      cur = node;
      continue;
    }

    // 子 / 女
    const sp = spouseOf(st, cur.id);
    const baseCol = sp ? (cur.col + sp.col) / 2 : cur.col;
    const node = place(st, spec.gender, cur.gen + 1, baseCol, 1, nextPath, 'path');
    st.edges.push({
      kind: 'child',
      parents: sp ? [cur.id, sp.id] : [cur.id],
      child: node.id,
    });
    cur = node;
  }

  cur.role = cur.id === me.id ? 'self' : 'target';
  return { nodes: st.nodes, edges: st.edges, targetId: cur.id };
}
