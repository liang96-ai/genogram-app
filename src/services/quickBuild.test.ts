import { describe, expect, it } from 'vitest';
import type { Line, Person } from '../types/genogram';
import {
  buildPlan,
  createSimGraphOps,
  isLearnableDisease,
  parseQuickLine,
  parseQuickText,
  pickAnchorId,
  RELATION_DICT,
  walkPath,
  type GraphLine,
} from './quickBuild';

// ==================== 測試用圖 ====================

const person = (
  id: string,
  shape: Person['shape'],
  x = 0,
  y = 0,
  extra: Partial<Person> = {},
): Person => ({ id, shape, position: { x, y }, ...extra });

const bio = (from: string, to: string): GraphLine => ({
  id: `l_${from}_${to}`,
  fromPersonId: from,
  toPersonId: to,
  subType: 'biological',
});

const marriage = (
  from: string,
  to: string,
  subType: GraphLine['subType'] = 'marriage',
): GraphLine => ({ id: `m_${from}_${to}`, fromPersonId: from, toPersonId: to, subType });

/** 只有案主一人的空個案 */
const emptyCase = () => ({
  persons: [person('me', 'square', 0, 0, { isProband: true })],
  lines: [] as GraphLine[],
});

const planOf = (text: string, g = emptyCase(), knownDiseases: string[] = []) =>
  buildPlan({
    parsedLines: parseQuickText(text, knownDiseases),
    persons: g.persons,
    lines: g.lines,
    anchorId: pickAnchorId(g.persons),
  });

// ==================== 1. 解析器 ====================

describe('parseQuickLine — 稱謂', () => {
  it('中文父母 / 台語 / 英文都命中同一個 canonical', () => {
    expect(parseQuickLine('爸爸', 0).relation?.canonical).toBe('爸爸');
    expect(parseQuickLine('阿爸', 0).relation?.canonical).toBe('爸爸');
    expect(parseQuickLine('father', 0).relation?.canonical).toBe('father');
    expect(parseQuickLine('阿母', 0).relation?.canonical).toBe('媽媽');
  });

  it('台語祖父母走父系路徑', () => {
    expect(parseQuickLine('阿公', 0).relation?.path).toEqual(['father', 'father']);
    expect(parseQuickLine('阿嬤', 0).relation?.path).toEqual(['father', 'mother']);
    expect(parseQuickLine('外婆', 0).relation?.path).toEqual(['mother', 'mother']);
  });

  it('手足 / 子女帶形狀', () => {
    expect(parseQuickLine('哥哥', 0).relation).toMatchObject({
      path: ['sibling'],
      shape: 'square',
    });
    expect(parseQuickLine('妹妹', 0).relation?.shape).toBe('circle');
    expect(parseQuickLine('女兒', 0).relation).toMatchObject({
      path: ['child'],
      shape: 'circle',
    });
  });

  it('前夫 / 前妻自帶離婚語意', () => {
    const p = parseQuickLine('前妻', 0);
    expect(p.relation?.divorced).toBe(true);
    expect(p.divorced).toBe(true);
  });

  it('不支援的旁系稱謂會被標記,且不當成一般稱謂', () => {
    const p = parseQuickLine('舅舅 50', 0);
    expect(p.unsupportedWord).toBe('舅舅');
    expect(p.relation).toBeNull();
  });

  it('一行只認第一個稱謂', () => {
    const p = parseQuickLine('爸爸 媽媽', 0);
    expect(p.relation?.canonical).toBe('爸爸');
    expect(p.tokens[1].kind).not.toBe('relation');
  });
});

describe('parseQuickLine — 屬性', () => {
  it('年齡:58歲 / 裸數字 / 超過 120 不算年齡', () => {
    expect(parseQuickLine('爸爸 58歲', 0).age).toBe(58);
    expect(parseQuickLine('媽媽 55', 0).age).toBe(55);
    expect(parseQuickLine('爸爸 999', 0).age).toBeUndefined();
    expect(parseQuickLine('爸爸 999', 0).notes).toContain('999');
  });

  it('電話:手機 / 市話(含連字號),且不會被誤判成年齡', () => {
    expect(parseQuickLine('爸爸 0912345678', 0).phones).toEqual(['0912345678']);
    expect(parseQuickLine('爸爸 02-12345678', 0).phones).toEqual(['0212345678']);
    expect(parseQuickLine('爸爸 0912345678', 0).age).toBeUndefined();
  });

  it('疾病:內建字典 + 使用者本機字典', () => {
    expect(parseQuickLine('爸爸 高血壓', 0).diseases).toEqual(['高血壓']);
    expect(parseQuickLine('爸爸 僵直性脊椎炎', 0).diseases).toEqual([]);
    expect(
      parseQuickLine('爸爸 僵直性脊椎炎', 0, ['僵直性脊椎炎']).diseases,
    ).toEqual(['僵直性脊椎炎']);
  });

  it('學歷:學校名稱、程度、年級都認得,不再被當成姓名或備註', () => {
    const g = parseQuickLine('哥哥 國一', 0);
    expect(g.education).toBe('國一');
    expect(g.educationStatus).toBe('attending');
    expect(g.name).toBeUndefined();
    const u = parseQuickLine('姊姊 台灣大學 畢業', 0);
    expect(u.education).toBe('台灣大學');
    expect(u.educationStatus).toBe('graduated');
    expect(u.notes).toEqual([]);
    expect(parseQuickLine('爸爸 高中畢業', 0).education).toBe('高中');
    expect(parseQuickLine('媽媽 大學肄業', 0).educationStatus).toBe('dropped');
    expect(parseQuickLine('弟弟 光明國小', 0).education).toBe('光明國小');
    expect(parseQuickLine('妹妹 就讀建國中學', 0).educationStatus).toBe('attending');
    // 單獨的「畢業」前面沒有學歷 → 還是備註
    expect(parseQuickLine('爸爸 畢業', 0).notes).toEqual(['畢業']);
  });

  it('學歷的日常寫法:學生、簡寫的畢/肄、讀高一、國小三年級、大班、學校簡稱', () => {
    const edu = (line: string) => {
      const p = parseQuickLine(line, 0);
      return [p.education, p.educationStatus, p.name];
    };
    expect(edu('妹妹 高中生')).toEqual(['高中', 'attending', undefined]);
    expect(edu('姊姊 研究生')).toEqual(['研究所', 'attending', undefined]);
    expect(edu('爸爸 國中畢')).toEqual(['國中', 'graduated', undefined]);
    expect(edu('媽媽 高中肄')).toEqual(['高中', 'dropped', undefined]);
    expect(edu('弟弟 國中中輟')).toEqual(['國中', 'dropped', undefined]);
    expect(edu('哥哥 讀高一')).toEqual(['高一', 'attending', undefined]);
    expect(edu('姊姊 念大二')).toEqual(['大二', 'attending', undefined]);
    expect(edu('妹妹 國小三年級')).toEqual(['國小三年級', 'attending', undefined]);
    expect(edu('妹妹 國小 三年級')).toEqual(['國小三年級', 'attending', undefined]);
    expect(edu('弟弟 5歲 大班')).toEqual(['大班', 'attending', undefined]);
    expect(edu('媽媽 護專')).toEqual(['護專', undefined, undefined]);
    expect(edu('爸爸 國中補校')).toEqual(['國中補校', undefined, undefined]);
    expect(edu('哥哥 台大 畢業')).toEqual(['台大', 'graduated', undefined]);
    expect(edu('哥哥 高中休學中')).toEqual(['高中', 'dropped', undefined]);
    // 整個詞就是程度,不能拆成「未」+「就學」
    expect(edu('妹妹 未就學')).toEqual(['未就學', undefined, undefined]);
  });

  it('像名字但不是名字的詞不再被猜成姓名;真的名字照舊', () => {
    const p = (line: string) => parseQuickLine(line, 0);
    expect(p('弟弟 休學中').notes).toEqual(['休學中']);
    expect(p('弟弟 中輟生').notes).toEqual(['中輟生']);
    expect(p('爸爸 七年級生').notes).toEqual(['七年級生']);
    expect(p('爸爸 七年級生').education).toBeUndefined();
    expect(p('妹妹 學生').notes).toEqual(['學生']);
    // 「念」「讀」開頭的名字不會被當成動詞拆掉
    expect(p('妹妹 念恩').name).toBe('念恩');
    // 「建中」也是常見的名字,不當學校
    expect(p('哥哥 建中').name).toBe('建中');
    expect(p('媽媽 陳美玲 高職').name).toBe('陳美玲');
  });

  it('往生的各種說法都認得(身故、離世以前會被畫成在世)', () => {
    for (const w of ['歿', '過世', '已故', '去世', '往生', '死亡', '身故', '離世', '走了']) {
      expect(parseQuickLine(`爸爸 ${w}`, 0).deceased, w).toBe(true);
    }
  });

  it('歿 + 裸數字 = 享年,不是年齡(工作單 1.5-9)', () => {
    const p = parseQuickLine('爺爺 歿 78', 0);
    expect(p.deceased).toBe(true);
    expect(p.lifeSpan).toBe(78);
    expect(p.age).toBeUndefined();
    expect(p.tokens.some((t) => t.kind === 'lifeSpan')).toBe(true);
  });

  it('離婚 token', () => {
    expect(parseQuickLine('爸爸 離婚', 0).divorced).toBe(true);
  });

  it('姓名:2-4 個中文字且緊跟稱謂', () => {
    expect(parseQuickLine('爸爸 王大明 58歲', 0).name).toBe('王大明');
    // 不跟在稱謂後面 → 備註,不是姓名
    expect(parseQuickLine('爸爸 58歲 王大明', 0).name).toBeUndefined();
    // 疾病字典優先於姓名猜測
    expect(parseQuickLine('爸爸 高血壓', 0).name).toBeUndefined();
  });

  it('無法判定 → 備註,且可切換三態', () => {
    const p = parseQuickLine('爸爸 XYZ !!!', 0);
    expect(p.notes).toEqual(['XYZ', '!!!']);
    expect(p.tokens[1].switchable).toBe(true);
  });

  it('override 可把備註改成疾病', () => {
    const p = parseQuickLine('爸爸 老花', 0, [], { '0:1': 'disease' });
    expect(p.diseases).toEqual(['老花']);
    expect(p.notes).toEqual([]);
  });

  it('override 不會動到稱謂 / 電話這類不可切換的 token', () => {
    const p = parseQuickLine('爸爸 0912345678', 0, [], {
      '0:0': 'name',
      '0:1': 'note',
    });
    expect(p.relation?.canonical).toBe('爸爸');
    expect(p.phones).toEqual(['0912345678']);
  });
});

describe('parseQuickText', () => {
  it('空行略過,但行號對應原始行', () => {
    const r = parseQuickText('爸爸\n\n媽媽');
    expect(r).toHaveLength(2);
    expect(r[0].lineNo).toBe(0);
    expect(r[1].lineNo).toBe(2);
  });
});

// ==================== 2. 走路器(模擬圖)====================

describe('walkPath — 找既有優先,沒有才建', () => {
  it('空個案:爸爸 → 一次建雙親(與 ↑ 箭頭行為一致)', () => {
    const g = emptyCase();
    const ops = createSimGraphOps(g.persons, g.lines);
    const r = walkPath(ops, 'me', RELATION_DICT['爸爸']);
    expect(r.targetId).toBeTruthy();
    expect(r.createdIds).toHaveLength(2); // 爸 + 媽
    expect(ops.persons().find((p) => p.id === r.targetId)?.shape).toBe('square');
  });

  it('已有爸媽:再打「爸爸」→ 找到既有,不重建', () => {
    const g = {
      persons: [
        person('me', 'square', 0, 0, { isProband: true }),
        person('f', 'square', -60, -120),
        person('m', 'circle', 60, -120),
      ],
      lines: [marriage('f', 'm'), bio('f', 'me'), bio('m', 'me')],
    };
    const ops = createSimGraphOps(g.persons, g.lines);
    const r = walkPath(ops, 'me', RELATION_DICT['爸爸']);
    expect(r.targetId).toBe('f');
    expect(r.createdIds).toEqual([]);
  });

  it('單親:只有爸爸沒有媽媽 → 略過並警告(不硬繞,工作單 1.5-8)', () => {
    const g = {
      persons: [
        person('me', 'square', 0, 0, { isProband: true }),
        person('f', 'square', -60, -120),
      ],
      lines: [bio('f', 'me')],
    };
    const ops = createSimGraphOps(g.persons, g.lines);
    const r = walkPath(ops, 'me', RELATION_DICT['媽媽']);
    expect(r.targetId).toBeNull();
    expect(r.skipReason).toBe('parent-incomplete');
  });

  it('爺爺 = [父,父]:自動補中間人(爸爸),且第二層建立祖父母', () => {
    const g = emptyCase();
    const ops = createSimGraphOps(g.persons, g.lines);
    const r = walkPath(ops, 'me', RELATION_DICT['爺爺']);
    expect(r.targetId).toBeTruthy();
    // 爸 + 媽 + 爺 + 奶 = 4 人
    expect(r.createdIds).toHaveLength(4);
  });

  it('手足掛在父母婚姻線下,不是跟案主連婚姻線(工作單 1.5-1)', () => {
    const g = emptyCase();
    const ops = createSimGraphOps(g.persons, g.lines);
    const r = walkPath(ops, 'me', RELATION_DICT['哥哥']);
    const target = r.targetId!;
    // 目標與案主之間不能有婚姻線
    const betweenMe = ops
      .lines()
      .filter(
        (l) =>
          (l.fromPersonId === 'me' && l.toPersonId === target) ||
          (l.fromPersonId === target && l.toPersonId === 'me'),
      );
    expect(betweenMe).toEqual([]);
    // 目標的父母 = 案主的父母
    const parentsOf = (id: string) =>
      ops
        .lines()
        .filter((l) => l.toPersonId === id && l.subType === 'biological')
        .map((l) => l.fromPersonId)
        .sort();
    expect(parentsOf(target)).toEqual(parentsOf('me'));
  });

  it('姊姊建立後形狀修正為圓形(expandChildFromMarriage 一律建方形)', () => {
    const g = emptyCase();
    const ops = createSimGraphOps(g.persons, g.lines);
    const r = walkPath(ops, 'me', RELATION_DICT['姊姊']);
    expect(ops.persons().find((p) => p.id === r.targetId)?.shape).toBe('circle');
  });

  it('前妻:建配偶並把婚姻線改成離婚', () => {
    const g = emptyCase();
    const ops = createSimGraphOps(g.persons, g.lines);
    const r = walkPath(ops, 'me', RELATION_DICT['前妻']);
    const line = ops.lines().find((l) => l.id === r.marriageLineId);
    expect(line?.subType).toBe('divorce');
  });

  it('同側 3 段婚姻上限 → 略過並警告(工作單 1.5-13)', () => {
    const g = {
      persons: [
        person('me', 'square', 0, 0, { isProband: true }),
        person('s1', 'circle', 120, 0),
        person('s2', 'circle', 180, 0),
        person('s3', 'circle', 240, 0),
        person('s4', 'circle', -120, 0),
        person('s5', 'circle', -180, 0),
        person('s6', 'circle', -240, 0),
      ],
      lines: [
        marriage('me', 's1'),
        marriage('me', 's2'),
        marriage('me', 's3'),
        marriage('s4', 'me'),
        marriage('s5', 'me'),
        marriage('s6', 'me'),
      ],
    };
    const ops = createSimGraphOps(g.persons, g.lines);
    // 太太(circle)六位都符合形狀 → 會先找到既有,所以改用「前妻」逼它建新的
    const r = walkPath(ops, 'me', RELATION_DICT['前妻']);
    expect(r.targetId).toBeNull();
    expect(r.skipReason).toBe('spouse-limit');
  });

  it('兒子:沒有配偶時自動先建一位,再掛子女', () => {
    const g = emptyCase();
    const ops = createSimGraphOps(g.persons, g.lines);
    const r = walkPath(ops, 'me', RELATION_DICT['兒子']);
    expect(r.createdIds).toHaveLength(2); // 配偶 + 兒子
    expect(r.targetId).toBe(r.createdIds[1]);
  });
});

// ==================== 3. Plan(預覽三態)====================

describe('buildPlan', () => {
  it('驗收案例:6 行全部有明確狀態,且哥哥不會變成配偶', () => {
    const plan = planOf(
      [
        '爸爸 58歲 高血壓 0912345678',
        '媽媽 55 糖尿病',
        '爺爺 歿',
        '哥哥 32',
        '前妻 離婚',
        '兒子 5',
      ].join('\n'),
    );
    expect(plan.plans.map((p) => p.status)).toEqual([
      'create',
      'update', // 媽媽在第 1 行就被 expandParents 一起建出來了 → 這行是更新既有
      'create',
      'create',
      'create',
      'create',
    ]);
    expect(plan.buildable).toBe(true);
  });

  it('第 1 行建爸媽 → 第 2 行「媽媽」是補資料,不重建人', () => {
    const plan = planOf('爸爸 58歲\n媽媽 55');
    expect(plan.plans[1].status).toBe('update');
    expect(plan.plans[1].targetIsNewInBatch).toBe(true); // 前一行剛建立的
    expect(plan.plans[1].alsoCreates).toEqual([]);
  });

  it('真的更新原個案既有人物時 targetIsNewInBatch = false', () => {
    const g = {
      persons: [
        person('me', 'square', 0, 0, { isProband: true }),
        person('f', 'square', -60, -120),
        person('m', 'circle', 60, -120),
      ],
      lines: [marriage('f', 'm'), bio('f', 'me'), bio('m', 'me')],
    };
    const plan = planOf('爸爸 58', g);
    expect(plan.plans[0].status).toBe('update');
    expect(plan.plans[0].targetIsNewInBatch).toBe(false);
  });

  it('爺爺:預告「將一併建立」的中間人', () => {
    const plan = planOf('爺爺 歿');
    expect(plan.plans[0].status).toBe('create');
    expect(plan.plans[0].alsoCreates).toHaveLength(3); // 爸 + 媽 + 奶
  });

  it('亂輸入 → 略過,不影響其他行', () => {
    const plan = planOf('XYZ 999 !!!\n爸爸 58');
    expect(plan.plans[0].status).toBe('skip');
    expect(plan.plans[0].skipReason).toBe('no-relation');
    expect(plan.plans[1].status).toBe('create');
    expect(plan.buildable).toBe(true);
  });

  it('整段社工筆記貼進來 → 擋下,不會默默建出一堆人', () => {
    // 使用者回報的形態(資料為合成):整段沒有空白的社工筆記,只有剛好被空白包住的
    // 「爺爺」會命中字典 → 舊版會建出爸媽爺奶 4 人並把整段塞進爺爺備註
    const PROSE_NOTE =
      'case的爸爸45歲電話是09-1234-5678  跟個案關係不好 媽媽40 某某大學 圖書館管理員 寵溺個案 爺爺 100年往生 重男輕女 奶奶中風在家裡面長照照顧 阿蒂 印尼籍 最近跟17歲的哥哥關係很好';
    const plan = planOf(PROSE_NOTE);
    expect(plan.plans).toHaveLength(1);
    expect(plan.plans[0].status).toBe('skip');
    expect(plan.plans[0].skipReason).toBe('prose-like');
    expect(plan.buildable).toBe(false); // 建立鈕會是灰的
  });

  it('防呆不會誤傷正常輸入(單一較長備註 / 多個短備註照樣放行)', () => {
    expect(planOf('爸爸 58歲 目前住在療養院').plans[0].status).toBe('create');
    expect(planOf('爸爸 58歲 木工 台北 退休').plans[0].status).toBe('create');
    expect(planOf('爸爸 58歲 高血壓 0912345678').plans[0].status).toBe('create');
  });

  it('不支援稱謂 → 標「暫不支援」', () => {
    const plan = planOf('舅舅 50');
    expect(plan.plans[0].skipReason).toBe('unsupported');
  });

  it('沒有錨點(多人且無案主)→ 全部略過', () => {
    const g = {
      persons: [person('a', 'square'), person('b', 'circle')],
      lines: [] as GraphLine[],
    };
    const plan = planOf('爸爸 58', g);
    expect(plan.anchorId).toBeNull();
    expect(plan.plans[0].skipReason).toBe('no-anchor');
    expect(plan.buildable).toBe(false);
  });

  it('屬性衝突:既有 57 歲 vs 新打 58 → 列出 57→58', () => {
    const g = {
      persons: [
        person('me', 'square', 0, 0, { isProband: true }),
        person('f', 'square', -60, -120, { textInfo: { age: 57 } }),
        person('m', 'circle', 60, -120),
      ],
      lines: [marriage('f', 'm'), bio('f', 'me'), bio('m', 'me')],
    };
    const plan = planOf('爸爸 58', g);
    expect(plan.plans[0].status).toBe('update');
    expect(plan.plans[0].conflicts).toEqual([
      { field: 'age', oldValue: '57', newValue: '58' },
    ]);
  });

  it('既有欄位為空 → 不算衝突,直接套用', () => {
    const g = {
      persons: [
        person('me', 'square', 0, 0, { isProband: true }),
        person('f', 'square', -60, -120),
        person('m', 'circle', 60, -120),
      ],
      lines: [marriage('f', 'm'), bio('f', 'me'), bio('m', 'me')],
    };
    const plan = planOf('爸爸 58', g);
    expect(plan.plans[0].conflicts).toEqual([]);
  });

  it('疾病累加:既有的不重複列', () => {
    const g = {
      persons: [
        person('me', 'square', 0, 0, { isProband: true }),
        person('f', 'square', -60, -120, {
          medicalConditions: [{ id: 'c1', name: '高血壓' }],
        }),
        person('m', 'circle', 60, -120),
      ],
      lines: [marriage('f', 'm'), bio('f', 'me'), bio('m', 'me')],
    };
    const plan = planOf('爸爸 高血壓 糖尿病', g);
    expect(plan.plans[0].newDiseases).toEqual(['糖尿病']);
  });

  it('離婚 token 會反映到模擬圖 → 後面的「兒子」掛在同一條關係線下', () => {
    const plan = planOf('前妻 離婚\n兒子 5');
    // 兒子不該再建一位新配偶(alsoCreates 為空)
    expect(plan.plans[1].status).toBe('create');
    expect(plan.plans[1].alsoCreates).toEqual([]);
  });
});

// ==================== 4. 雜項 ====================

describe('pickAnchorId', () => {
  it('優先案主', () => {
    expect(
      pickAnchorId([
        person('a', 'square'),
        person('b', 'circle', 0, 0, { isProband: true }),
      ]),
    ).toBe('b');
  });
  it('沒案主但只有一人 → 用他', () => {
    expect(pickAnchorId([person('only', 'square')])).toBe('only');
  });
  it('沒案主且多人 → null(交給 UI 要求選擇)', () => {
    expect(pickAnchorId([person('a', 'square'), person('b', 'circle')])).toBeNull();
  });
});

describe('isLearnableDisease — 學習迴圈防呆(工作單 1.5-11)', () => {
  it('短且不含數字才可進全域字典', () => {
    expect(isLearnableDisease('僵直性脊椎炎')).toBe(true);
    expect(isLearnableDisease('住台北市信義區忠孝東路一段二號')).toBe(false); // 14 字 > 12
    expect(isLearnableDisease('民國55年確診')).toBe(false);
    expect(isLearnableDisease('  ')).toBe(false);
  });
});

// 型別守門:確保 Person / Line 型別沒有被改壞(編譯期即失敗)
const _typeGuard: Line['category'] = 'member';
void _typeGuard;
