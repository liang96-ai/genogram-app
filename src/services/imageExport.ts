import type { Genogram } from '../types/genogram';
import { useGenogramStore } from '../store/genogramStore';

export type ImageFormat = 'png' | 'jpg';
export type ImageRange = 'auto' | 'view';

export interface ImageExportOptions {
  format: ImageFormat;
  scale: 1 | 2 | 3;
  range: ImageRange;
  hideDotGrid: boolean;
  /** 隱藏關係細節:全部線變實線/不畫 mid-symbol/不顯示線備注 */
  simplifyLines: boolean;
}

const PADDING = 80;
const SHAPE_HALF = 28;
const UNIT_HALF_W = 90;
const UNIT_HALF_H = 20;

function safeFilename(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60) || 'untitled';
}

/**
 * 算出畫布所有元素的 bounding box(SVG 座標)
 */
function computeBBox(g: Genogram): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of g.persons) {
    const half = p.shape === 'institution' ? UNIT_HALF_W : SHAPE_HALF;
    const halfH = p.shape === 'institution' ? UNIT_HALF_H : SHAPE_HALF;
    minX = Math.min(minX, p.position.x - half);
    minY = Math.min(minY, p.position.y - halfH);
    maxX = Math.max(maxX, p.position.x + half);
    maxY = Math.max(maxY, p.position.y + halfH);
  }
  for (const u of g.networkUnits ?? []) {
    if (!u.isActive) continue;
    minX = Math.min(minX, u.position.x - UNIT_HALF_W);
    minY = Math.min(minY, u.position.y - UNIT_HALF_H);
    maxX = Math.max(maxX, u.position.x + UNIT_HALF_W);
    maxY = Math.max(maxY, u.position.y + UNIT_HALF_H);
  }
  for (const eco of g.ecosystems ?? []) {
    for (const pt of eco.points) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
  }
  if (!isFinite(minX)) {
    // 沒任何內容 → 預設 600x400
    return { minX: 0, minY: 0, maxX: 600, maxY: 400 };
  }
  return {
    minX: minX - PADDING,
    minY: minY - PADDING,
    maxX: maxX + PADDING,
    maxY: maxY + PADDING,
  };
}

/**
 * Wait two animation frames for React to re-render
 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

/**
 * 主匯出函式 — 對當前畫面產生圖片 Blob
 */
export async function exportCanvasImage(
  genogram: Genogram,
  opts: ImageExportOptions,
): Promise<Blob> {
  const store = useGenogramStore.getState();

  // 1. 暫存目前選取/編輯狀態,清空以取得乾淨 SVG
  const prev = {
    person: [...store.selectedPersonIds],
    line: [...store.selectedLineIds],
    unit: [...store.selectedUnitIds],
    eco: store.selectedEcosystemId,
    editing: store.editingEcosystemId,
  };
  store.clearSelection();

  try {
    // 等 React 重 render
    await nextFrame();

    // 2. 抓 SVG
    const svg = document.getElementById(
      'canvas-svg',
    ) as SVGSVGElement | null;
    if (!svg) throw new Error('找不到畫布 SVG');

    // 3. 複製 SVG (避免動到畫面)
    const cloned = svg.cloneNode(true) as SVGSVGElement;

    // 4. 計算 viewBox
    let vbX: number, vbY: number, vbW: number, vbH: number;
    if (opts.range === 'auto') {
      const bb = computeBBox(genogram);
      vbX = bb.minX;
      vbY = bb.minY;
      vbW = bb.maxX - bb.minX;
      vbH = bb.maxY - bb.minY;
    } else {
      // current view: 從 svg 實際渲染區域回推
      const rect = svg.getBoundingClientRect();
      const viewPan = store.viewPan;
      const viewZoom = store.viewZoom;
      vbX = -viewPan.x / viewZoom;
      vbY = -viewPan.y / viewZoom;
      vbW = rect.width / viewZoom;
      vbH = rect.height / viewZoom;
    }
    cloned.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    cloned.setAttribute('width', String(vbW));
    cloned.setAttribute('height', String(vbH));
    // 不要讓 100% 樣式影響
    cloned.setAttribute('style', 'background: #ffffff;');

    // 5. 移掉網點背景
    if (opts.hideDotGrid) {
      cloned.querySelectorAll('rect').forEach((r) => {
        const fill = r.getAttribute('fill') ?? '';
        if (fill.startsWith('url(#dotGrid')) {
          r.remove();
        }
      });
    }

    // 5a-priv. 隱藏關係細節時:整條 private line / private unit / private ecosystem 從 SVG 移除
    if (opts.simplifyLines) {
      const privateLineIds = new Set(
        genogram.lines.filter((l) => l.private).map((l) => l.id),
      );
      const privateUnitIds = new Set(
        (genogram.networkUnits ?? [])
          .filter((u) => u.private)
          .map((u) => u.id),
      );
      const privateEcoIds = new Set(
        (genogram.ecosystems ?? [])
          .filter((e) => e.private)
          .map((e) => e.id),
      );
      cloned.querySelectorAll('[data-line-id]').forEach((el) => {
        const id = el.getAttribute('data-line-id');
        if (id && privateLineIds.has(id)) el.remove();
      });
      cloned.querySelectorAll('[data-unit-id]').forEach((el) => {
        const id = el.getAttribute('data-unit-id');
        if (id && privateUnitIds.has(id)) el.remove();
      });
      cloned.querySelectorAll('[data-eco-id]').forEach((el) => {
        const id = el.getAttribute('data-eco-id');
        if (id && privateEcoIds.has(id)) el.remove();
      });
    }

    // 5b. 簡化線條:把所有 line 的 stroke-dasharray 拿掉,移除 mid-symbol 與線備注
    if (opts.simplifyLines) {
      cloned.querySelectorAll('line').forEach((l) => {
        l.removeAttribute('stroke-dasharray');
      });
      // 簡單啟發:婚姻線中央的 mid-symbol(slash/X/house)用粗線/小 polygon 渲染
      // 直接把 polygon (五角形屋頂) 跟接近 0,0 的小 line 移除困難,改用 transform 判斷
      // 安全做法:移除所有有 transform="translate(midX, midY)" 的小 g 內的 line/polygon
      // 但這太脆。簡化版:這次先 skip mid-symbol 移除,只去 dasharray + note。
      // 線備注:font-size 11 的 text(只在線/婚姻線中段)— 直接清掉所有 fontSize 11 / fill #6e6e73 的 text
      cloned.querySelectorAll('text').forEach((t) => {
        const fs = t.getAttribute('font-size');
        const fill = t.getAttribute('fill');
        if (fs === '11' && fill === '#6e6e73') {
          // 進一步檢查:不是人物身上的(那種會在 g[transform=translate(personX,personY) scale]內)
          // 簡單條件:如果 parent g 的 transform 包含 scale → 是人物資訊文字,保留
          const parent = t.parentElement;
          const parentTransform = parent?.getAttribute('transform') ?? '';
          if (!parentTransform.includes('scale')) {
            t.remove();
          }
        }
      });
    }

    // 6. 序列化 SVG
    const xml = new XMLSerializer().serializeToString(cloned);
    // 加上 xmlns 才能被 Image 載入
    const xmlWithNS = xml.includes('xmlns="http://www.w3.org/2000/svg"')
      ? xml
      : xml.replace(
          '<svg',
          '<svg xmlns="http://www.w3.org/2000/svg"',
        );
    const svgBlob = new Blob([xmlWithNS], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    // 7. 載入成 HTMLImageElement
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = (e) => reject(e);
      i.src = svgUrl;
    });

    // 8. 畫到 Canvas
    const outW = Math.round(vbW * opts.scale);
    const outH = Math.round(vbH * opts.scale);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(img, 0, 0, outW, outH);

    URL.revokeObjectURL(svgUrl);

    // 9. Canvas → Blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob 失敗'))),
        opts.format === 'png' ? 'image/png' : 'image/jpeg',
        opts.format === 'jpg' ? 0.92 : undefined,
      );
    });
    return blob;
  } finally {
    // 還原選取狀態
    if (prev.person.length > 0) store.selectPersons(prev.person);
    else if (prev.line.length > 0) store.selectLines(prev.line);
    else if (prev.unit.length > 0) store.selectUnits(prev.unit);
    else if (prev.eco) store.selectEcosystem(prev.eco);
    if (prev.editing) store.setEditingEcosystem(prev.editing);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function suggestImageFilename(
  caseName: string,
  format: ImageFormat,
): string {
  return `${safeFilename(caseName)}.${format}`;
}
