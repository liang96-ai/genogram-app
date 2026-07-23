import { describe, expect, it } from 'vitest';
import {
  buildDiagram,
  describePath,
  KINSHIP,
  lookup,
  MAX_DEPTH,
  pathKey,
  STEPS,
  type Step,
} from './kinship';

const L = (p: Step[]) => lookup(p)?.term;

describe('lookup — 使用者確認過的核心對照', () => {
  it('父母的手足:伯伯 / 叔叔 / 姑姑 / 舅舅 / 阿姨', () => {
    expect(L(['F', 'EB'])).toBe('伯伯');
    expect(L(['F', 'YB'])).toBe('叔叔');
    expect(L(['F', 'ES'])).toBe('姑姑');
    expect(L(['F', 'YS'])).toBe('姑姑');
    expect(L(['M', 'EB'])).toBe('舅舅');
    expect(L(['M', 'YB'])).toBe('舅舅');
    expect(L(['M', 'ES'])).toBe('阿姨');
    expect(L(['M', 'YS'])).toBe('阿姨');
  });

  it('祖輩', () => {
    expect(L(['F', 'F'])).toBe('爺爺');
    expect(L(['F', 'M'])).toBe('奶奶');
    expect(L(['M', 'F'])).toBe('外公');
    expect(L(['M', 'M'])).toBe('外婆');
  });

  it('姪 vs 外甥:兄弟的小孩是姪,姊妹的小孩是外甥', () => {
    expect(L(['EB', 'S'])).toBe('姪子');
    expect(L(['YB', 'S'])).toBe('姪子');
    expect(L(['ES', 'S'])).toBe('外甥');
    expect(L(['YS', 'S'])).toBe('外甥');
    expect(L(['ES', 'D'])).toBe('外甥女');
  });

  it('姻親:小叔 / 大伯 / 大舅子 / 小姨子', () => {
    expect(L(['H', 'YB'])).toBe('小叔');
    expect(L(['H', 'EB'])).toBe('大伯');
    expect(L(['W', 'EB'])).toBe('大舅子');
    expect(L(['W', 'YS'])).toBe('小姨子');
  });
});

// 以下這組是 2026-07-20 獨立查核抓到的破洞 —— 表裡有伯伯叔叔姑姑舅舅阿姨,
// 卻沒有他們的配偶。社工實務天天遇到,補上後鎖進測試防止再掉。
describe('父母手足的配偶(補漏後的回歸測試)', () => {
  it('伯母 vs 嬸嬸 —— 差在伯伯還是叔叔', () => {
    expect(L(['F', 'EB', 'W'])).toBe('伯母');
    expect(L(['F', 'YB', 'W'])).toBe('嬸嬸');
  });
  it('姑丈 / 舅媽 / 姨丈 一律不分長幼', () => {
    expect(L(['F', 'ES', 'H'])).toBe('姑丈');
    expect(L(['F', 'YS', 'H'])).toBe('姑丈');
    expect(L(['M', 'EB', 'W'])).toBe('舅媽');
    expect(L(['M', 'YB', 'W'])).toBe('舅媽');
    expect(L(['M', 'ES', 'H'])).toBe('姨丈');
    expect(L(['M', 'YS', 'H'])).toBe('姨丈');
  });
  it('每個第二層的父母手足,配偶都查得到(不能只補一半)', () => {
    const uncles: Step[][] = [
      ['F', 'EB'],
      ['F', 'YB'],
      ['F', 'ES'],
      ['F', 'YS'],
      ['M', 'EB'],
      ['M', 'YB'],
      ['M', 'ES'],
      ['M', 'YS'],
    ];
    for (const u of uncles) {
      const spouse: Step = ['ES', 'YS'].includes(u[1]) ? 'H' : 'W';
      expect(lookup([...u, spouse]), [...u, spouse].join('·')).toBeTruthy();
    }
  });
});

describe('重組家庭 / 親家(社工實務高頻)', () => {
  it('爸爸的太太不直接斷定成繼母 —— 用 ambiguous 表達兩種可能', () => {
    const r = lookup(['F', 'W'])!;
    expect(r.term).toBe('媽媽 / 繼母');
    expect(r.ambiguous).toBeTruthy();
    expect(lookup(['M', 'H'])!.term).toBe('爸爸 / 繼父');
  });
  it('配偶的小孩同樣不斷定親生', () => {
    for (const p of [
      ['H', 'S'],
      ['H', 'D'],
      ['W', 'S'],
      ['W', 'D'],
    ] as Step[][]) {
      expect(lookup(p)!.ambiguous, p.join('·')).toBeTruthy();
    }
  });
  it('親家公 / 親家母', () => {
    expect(L(['S', 'W', 'F'])).toBe('親家公');
    expect(L(['S', 'W', 'M'])).toBe('親家母');
    expect(L(['D', 'H', 'F'])).toBe('親家公');
    expect(L(['D', 'H', 'M'])).toBe('親家母');
  });
});

describe('查核抓到的錯誤答案(回歸測試)', () => {
  it('先生的姊姊的先生不是「妯娌的先生」—— 妯娌是兄弟的太太彼此互稱', () => {
    const r = lookup(['H', 'ES', 'H'])!;
    expect(r.term).not.toContain('妯娌');
    expect(r.term).toContain('姊夫');
  });
  it('嫂嫂的姊姊不是「妯娌的姊姊」', () => {
    expect(lookup(['EB', 'W', 'ES'])!.term).not.toContain('妯娌');
  });
  it('真正的妯娌關係(先生的兄弟的太太)當面叫大嫂 / 弟妹', () => {
    expect(L(['H', 'EB', 'W'])).toBe('大嫂');
    expect(L(['H', 'YB', 'W'])).toBe('弟妹');
    expect(lookup(['H', 'EB', 'W'])!.alt).toContain('妯娌');
  });
  it('配偶的爺爺不叫「太公」(台灣的太公是曾祖父)', () => {
    for (const p of [
      ['H', 'F', 'F'],
      ['W', 'F', 'F'],
    ] as Step[][]) {
      expect(lookup(p)!.term, p.join('·')).not.toContain('太公');
    }
  });
  it('「小姑」是先生的妹妹,不能同時當姑姑的別稱', () => {
    expect(L(['H', 'YS'])).toBe('小姑');
    expect(lookup(['F', 'YS'])!.alt ?? []).not.toContain('小姑');
    expect(lookup(['F', 'ES'])!.alt ?? []).not.toContain('小姑');
  });
});

// 2026-07-21 使用者回報:點「媽媽→弟弟→哥哥」得到 (哥哥) 查不到,而且位置看起來就是媽媽的哥哥。
// 根因 = 完全沒處理「手足的手足」。收合後排行資訊會遺失,所以要把長幼兩種都查一次。
describe('手足的手足(複合鏈收合)', () => {
  it('媽媽那邊不分長幼 → 答案唯一,不該打擾使用者', () => {
    const r = lookup(['M', 'YB', 'EB'])!;
    expect(r.term).toBe('舅舅');
    expect(r.ambiguous).toBeFalsy();
    expect(lookup(['M', 'EB', 'YB'])!.term).toBe('舅舅');
    expect(lookup(['F', 'EB', 'YS'])!.term).toBe('姑姑');
  });

  it('爸爸那邊分長幼 → 誠實並列,並說明排行未知', () => {
    const r = lookup(['F', 'YB', 'EB'])!;
    expect(r.term).toBe('伯伯 / 叔叔');
    expect(r.ambiguous).toContain('排行');
  });

  it('自己的手足的手足 → 要提醒可能就是本人', () => {
    const r = lookup(['EB', 'YB'])!;
    expect(r.term).toBe('哥哥 / 弟弟');
    expect(r.ambiguous).toContain('你自己');
  });

  it('姻親也適用', () => {
    expect(lookup(['W', 'ES', 'ES'])!.term).toBe('大姨子 / 小姨子');
  });

  it('遞迴:收合後還能繼續往下走', () => {
    expect(lookup(['M', 'YB', 'EB', 'S'])!.term).toBe('表哥 / 表弟');
  });

  it('不該亂收合 —— 中間隔著配偶就不是手足的手足', () => {
    expect(lookup(['ES', 'H', 'ES'])).toBeNull();
  });
});

describe('對稱性 —— 同性質的路徑不能只收一半', () => {
  it('姪孫 / 外甥孫:兄弟四條、姊妹四條都要在', () => {
    for (const sib of ['EB', 'YB'] as Step[])
      for (const g of ['S', 'D'] as Step[])
        expect(lookup([sib, 'S', g])!.term, [sib, 'S', g].join('·')).toContain('姪孫');
    for (const sib of ['ES', 'YS'] as Step[])
      for (const g of ['S', 'D'] as Step[])
        expect(lookup([sib, 'S', g])!.term, [sib, 'S', g].join('·')).toContain('外甥孫');
  });

  it('祖輩手足:四條祖父母線都要收滿', () => {
    for (const gp of [
      ['F', 'F'],
      ['F', 'M'],
      ['M', 'F'],
      ['M', 'M'],
    ] as Step[][])
      for (const sib of ['EB', 'YB', 'ES', 'YS'] as Step[])
        expect(lookup([...gp, sib]), [...gp, sib].join('·')).toBeTruthy();
  });

  it('曾祖輩:八條都要在', () => {
    for (const gp of [
      ['F', 'F'],
      ['F', 'M'],
      ['M', 'F'],
      ['M', 'M'],
    ] as Step[][])
      for (const p of ['F', 'M'] as Step[])
        expect(lookup([...gp, p]), [...gp, p].join('·')).toBeTruthy();
  });
});

describe('堂 vs 表 —— 本功能最想教對的一件事', () => {
  it('只有「爸爸的兄弟的小孩」是堂', () => {
    expect(L(['F', 'EB', 'S'])).toBe('堂哥 / 堂弟');
    expect(L(['F', 'YB', 'S'])).toBe('堂哥 / 堂弟');
    expect(L(['F', 'EB', 'D'])).toBe('堂姊 / 堂妹');
    expect(L(['F', 'YB', 'D'])).toBe('堂姊 / 堂妹');
  });

  it('姑姑在父系,但她的小孩是「表」—— 這是「父系=堂」的反例', () => {
    expect(L(['F', 'ES', 'S'])).toBe('表哥 / 表弟');
    expect(L(['F', 'YS', 'S'])).toBe('表哥 / 表弟');
    expect(L(['F', 'ES', 'D'])).toBe('表姊 / 表妹');
  });

  it('母系一律是「表」', () => {
    for (const mid of ['EB', 'YB', 'ES', 'YS'] as Step[]) {
      expect(L(['M', mid, 'S'])).toBe('表哥 / 表弟');
      expect(L(['M', mid, 'D'])).toBe('表姊 / 表妹');
    }
  });

  it('全表掃描:任何「堂」開頭的答案,路徑必定是 爸爸 + 兄弟 + 子女', () => {
    for (const [key, term] of Object.entries(KINSHIP)) {
      if (!term.term.startsWith('堂')) continue;
      const steps = key.split('·');
      expect(steps).toHaveLength(3);
      expect(steps[0]).toBe('F');
      expect(['EB', 'YB']).toContain(steps[1]);
      expect(['S', 'D']).toContain(steps[2]);
    }
  });

  it('答案分歧的條目一定有 ambiguous 註記,不能假裝很確定', () => {
    for (const [key, term] of Object.entries(KINSHIP)) {
      if (term.term.includes(' / '))
        expect(term.ambiguous, `${key} 有兩個答案卻沒說明為什麼`).toBeTruthy();
    }
  });
});

describe('查不到就誠實說查不到', () => {
  it('沒有通用稱謂的鏈回傳 null,不硬掰', () => {
    expect(lookup(['ES', 'H', 'ES'])).toBeNull(); // 姊夫的姊姊
    expect(lookup(['D', 'H', 'EB'])).toBeNull(); // 女婿的哥哥
    expect(lookup(['H', 'M', 'EB'])).toBeNull(); // 婆婆的哥哥
  });
  it('空路徑 = 我', () => {
    expect(lookup([])).toBeNull();
    expect(describePath([])).toBe('我');
  });
});

describe('describePath', () => {
  it('組出通順的白話句', () => {
    expect(describePath(['F', 'EB'])).toBe('我的爸爸的哥哥');
    expect(describePath(['M', 'ES', 'D'])).toBe('我的媽媽的姊姊的女兒');
  });
});

describe('資料表健檢', () => {
  it('所有 key 都由合法步驟組成,且深度不超過上限', () => {
    const valid = new Set(STEPS.map((s) => s.key));
    for (const key of Object.keys(KINSHIP)) {
      const steps = key.split('·');
      expect(steps.length).toBeLessThanOrEqual(MAX_DEPTH);
      for (const s of steps) expect(valid, `${key} 含非法步驟 ${s}`).toContain(s);
    }
  });

  it('十個原子步驟自己都查得到', () => {
    for (const s of STEPS) expect(lookup([s.key]), s.key).toBeTruthy();
  });

  it('pathKey 與 KINSHIP 的 key 格式一致', () => {
    expect(pathKey(['F', 'EB'])).toBe('F·EB');
    expect(KINSHIP[pathKey(['F', 'EB'])]).toBeTruthy();
  });
});

// ==================== 迷你家系圖佈局 ====================

describe('buildDiagram', () => {
  it('空路徑只有「我」', () => {
    const d = buildDiagram([]);
    expect(d.nodes).toHaveLength(1);
    expect(d.nodes[0].label).toBe('我');
    expect(d.nodes[0].role).toBe('self');
  });

  it('爸爸 → 一併畫出媽媽(配偶),但只有爸爸被標成路徑', () => {
    const d = buildDiagram(['F']);
    expect(d.nodes).toHaveLength(3); // 我 + 爸 + 媽
    const target = d.nodes.find((n) => n.id === d.targetId)!;
    expect(target.label).toBe('爸爸');
    expect(target.gender).toBe('male');
    expect(target.gen).toBe(-1);
    // 自動補上的媽媽沒有名字,role 是 implied
    expect(d.nodes.filter((n) => n.role === 'implied')).toHaveLength(1);
  });

  it('爸爸的哥哥 → 伯伯跟爸爸同一輩、共用父母,而且在爸爸左邊(長者在左)', () => {
    const d = buildDiagram(['F', 'EB']);
    const target = d.nodes.find((n) => n.id === d.targetId)!;
    const dad = d.nodes.find((n) => n.label === '爸爸')!;
    expect(target.gen).toBe(dad.gen);
    expect(target.col).toBeLessThan(dad.col);
    // 兩人共用同一組父母
    const parentsOf = (id: string) =>
      d.edges
        .filter((e) => e.kind === 'child' && e.child === id)
        .flatMap((e) => (e.kind === 'child' ? e.parents : []))
        .sort();
    expect(parentsOf(target.id)).toEqual(parentsOf(dad.id));
    expect(parentsOf(target.id)).toHaveLength(2);
  });

  it('弟弟在右邊', () => {
    const d = buildDiagram(['F', 'YB']);
    const target = d.nodes.find((n) => n.id === d.targetId)!;
    const dad = d.nodes.find((n) => n.label === '爸爸')!;
    expect(target.col).toBeGreaterThan(dad.col);
  });

  it('爺爺 = 爸爸的爸爸,走第二層時不會重建爸爸', () => {
    const d = buildDiagram(['F', 'F']);
    expect(d.nodes.filter((n) => n.label === '爸爸')).toHaveLength(1);
    const target = d.nodes.find((n) => n.id === d.targetId)!;
    expect(target.gen).toBe(-2);
  });

  it('選「先生」時,我會自動變成女性', () => {
    const d = buildDiagram(['H']);
    const me = d.nodes.find((n) => n.role === 'self')!;
    expect(me.gender).toBe('female');
  });

  it('堂哥:三層鏈長出 7 個人,終點在我這一輩', () => {
    const d = buildDiagram(['F', 'EB', 'S']);
    const me = d.nodes.find((n) => n.role === 'self')!;
    const target = d.nodes.find((n) => n.id === d.targetId)!;
    expect(target.gen).toBe(me.gen);
    // 我 + 爸 + 媽 + 爺 + 奶 + 伯伯 + 堂哥 = 7
    expect(d.nodes).toHaveLength(7);
  });

  it('沒有兩個人被放在同一格', () => {
    const paths: Step[][] = [
      ['F', 'EB', 'S'],
      ['M', 'ES', 'D'],
      ['F', 'F', 'EB'],
      ['W', 'EB'],
      ['S', 'S'],
      ['EB', 'W'],
      ['H', 'YB'],
      ['F', 'M'],
      ['ES', 'H'],
      ['M', 'M', 'YS'],
    ];
    for (const p of paths) {
      const d = buildDiagram(p);
      const cells = d.nodes.map((n) => `${n.gen}:${Math.round(n.col * 10)}`);
      expect(new Set(cells).size, `${p.join('·')} 有人重疊`).toBe(cells.length);
    }
  });

  it('每條線的兩端都指得到真的節點(參照完整性)', () => {
    const d = buildDiagram(['F', 'EB', 'S']);
    const ids = new Set(d.nodes.map((n) => n.id));
    for (const e of d.edges) {
      if (e.kind === 'marriage') {
        expect(ids).toContain(e.a);
        expect(ids).toContain(e.b);
      } else {
        expect(ids).toContain(e.child);
        for (const p of e.parents) expect(ids).toContain(p);
      }
    }
  });

  it('查不到專屬稱謂的節點,名牌加括號標示是相對稱呼(避免被誤讀成我的姊姊)', () => {
    const d = buildDiagram(['ES', 'H', 'ES']); // 我 → 姊姊 → 姊夫 → 姊夫的姊姊
    const target = d.nodes.find((n) => n.id === d.targetId)!;
    expect(lookup(target.path)).toBeNull();
    expect(target.label).toBe('(姊姊)');
    // 路徑上查得到的人維持不加括號
    expect(d.nodes.find((n) => n.label === '姊姊')).toBeTruthy();
    expect(d.nodes.find((n) => n.label === '姊夫')).toBeTruthy();
  });

  it('純函式:同一條路徑永遠得到同一張圖', () => {
    const a = buildDiagram(['M', 'EB', 'D']);
    const b = buildDiagram(['M', 'EB', 'D']);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('表裡每一條路徑都畫得出圖,不會爆', () => {
    for (const key of Object.keys(KINSHIP)) {
      const path = key.split('·') as Step[];
      const d = buildDiagram(path);
      expect(d.nodes.length, key).toBeGreaterThan(0);
      expect(d.targetId, key).toBeTruthy();
      expect(d.nodes.find((n) => n.id === d.targetId), key).toBeTruthy();
    }
  });
});
