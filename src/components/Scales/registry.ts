import type { Scale, ScaleCategory } from './types';
import { SCALE_CATEGORY_META } from './types';
import { apgarScale } from './apgarScale';
import { faces4Scale } from './faces4Scale';
import { barthelScale } from './barthelScale';
import { lawtonIadlScale } from './lawtonIadlScale';
import { tipvdaScale } from './tipvdaScale';
import { pcl5Scale } from './pcl5Scale';
import { aceScale } from './aceScale';
import { phq9Scale } from './phq9Scale';
import { gad7Scale } from './gad7Scale';
import { bsrs5Scale } from './bsrs5Scale';
import { auditScale } from './auditScale';
import { cageScale } from './cageScale';
import { crafftScale } from './crafftScale';
import { ad8Scale } from './ad8Scale';
import { gds15Scale } from './gds15Scale';
import { zaritScale } from './zaritScale';
import { adoptionAssessmentScale } from './adoptionAssessment';
import { cmsRiskScale } from './cmsRiskScale';

// 已從 registry 拿掉但保留檔案的(未來有更多大數據/官方授權後可加回):
//   crisisChecklist  — 自製,非官方
//   mmseScale        — PAR Inc 商業授權,題目不能放
//   capaScale        — 各縣市政府版本不同
//   devScreeningScale — 變體多(0-3/3-6),需取國健署標準

// 內建量表清單 — 公開可用的有題目;商業/缺公定版的 disabled 顯示連結
export const BUILT_IN_SCALES: Scale[] = [
  // 家庭
  apgarScale,
  faces4Scale, // disabled: 商業授權
  // 心理
  phq9Scale,
  gad7Scale,
  bsrs5Scale,
  // 物質使用
  auditScale,
  cageScale,
  crafftScale,
  // 暴力 / 創傷
  aceScale,
  tipvdaScale,
  pcl5Scale,
  // 兒少
  adoptionAssessmentScale, // disabled: 各機構版本不同
  cmsRiskScale, // disabled: 衛福部保護服務司管制
  // 老人 / 長照
  ad8Scale,
  gds15Scale,
  zaritScale, // disabled: MAPI 商業授權
  // 身障 / 失能
  barthelScale,
  lawtonIadlScale,
];

export function getScale(id: string): Scale | undefined {
  return BUILT_IN_SCALES.find((s) => s.id === id);
}

/** 把所有量表按 category 分組,並依 SCALE_CATEGORY_META.order 排序 */
export function getScalesByCategory(): Array<{
  category: ScaleCategory;
  label: string;
  icon: string;
  scales: Scale[];
}> {
  const grouped = new Map<ScaleCategory, Scale[]>();
  for (const s of BUILT_IN_SCALES) {
    const list = grouped.get(s.category) ?? [];
    list.push(s);
    grouped.set(s.category, list);
  }
  return Array.from(grouped.entries())
    .map(([category, scales]) => ({
      category,
      label: SCALE_CATEGORY_META[category].label,
      icon: SCALE_CATEGORY_META[category].icon,
      scales,
    }))
    .sort(
      (a, b) =>
        SCALE_CATEGORY_META[a.category].order -
        SCALE_CATEGORY_META[b.category].order,
    );
}
