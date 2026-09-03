// 量表分級規則改版後,舊紀錄的「等級文字」依當時的答案重算(分數不變)。
// 為什麼:level / levelColor 是施測當下算好存進 ScaleResult 的;分級改了而舊紀錄不重算,
// 同一位長者去年 70 分「輕度依賴」、今年 70 分「中度依賴」會在同一張卡片上互相矛盾。
// 目前只有巴氏量表(2026-09-03 改為衛福部 / Shah 五級)。開檔(openCase)時套用。
import type { Genogram, ScaleResult } from '../types/genogram';
import { barthelScale } from '../components/Scales/barthelScale';

type Relevel = (answers: ScaleResult['answers']) => { totalScore: number; level: string; levelColor?: ScaleResult['levelColor'] };
const RELEVEL: Record<string, Relevel> = {
  barthel: (a) => barthelScale.scoring(a),
};

export function relevelScaleResults(g: Genogram): { case: Genogram; changed: number } {
  const list = g.scaleResults;
  if (!Array.isArray(list) || list.length === 0) return { case: g, changed: 0 };
  let changed = 0;
  const next = list.map((r) => {
    const fn = r && typeof r === 'object' ? RELEVEL[r.scaleId] : undefined;
    if (!fn || !r.answers || typeof r.answers !== 'object') return r;
    const { totalScore, level, levelColor } = fn(r.answers);
    // 答案算出來的分數跟紀錄不一致(手改壞的檔)→ 不碰,免得出現「70 分 · 完全依賴」這種矛盾
    if (totalScore !== r.totalScore) return r;
    if (level === r.level && levelColor === r.levelColor) return r;
    changed++;
    return { ...r, level, levelColor };
  });
  return changed > 0 ? { case: { ...g, scaleResults: next }, changed } : { case: g, changed: 0 };
}
