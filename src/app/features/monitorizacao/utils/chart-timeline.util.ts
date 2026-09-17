
export const CHART_LOGICAL_WIDTH = 1000;
export const CHART_PAD_L = 44;
export const CHART_PAD_R = 16;

export interface TimelineWindow {
  viewStart: number;
  span: number;
}

export function computeTimelineWindow(
  anesthesiaStart: Date | null,
  anesthesiaEnd: Date | null,
  firstRecordTimestamp: string | null | undefined,
): TimelineWindow {
  const candidates: number[] = [];
  if (anesthesiaStart) candidates.push(anesthesiaStart.getTime());
  if (firstRecordTimestamp) candidates.push(new Date(firstRecordTimestamp).getTime());
  const viewStart = candidates.length ? Math.min(...candidates) : Date.now() - 30 * 60 * 1000;
  const viewEnd = anesthesiaEnd ? anesthesiaEnd.getTime() : Date.now();
  const span = Math.max(viewEnd - viewStart, 10 * 60 * 1000);
  return { viewStart, span };
}

export function timeToLogicalX(ts: number, win: TimelineWindow): number {
  const pct = (ts - win.viewStart) / win.span;
  return CHART_PAD_L + pct * (CHART_LOGICAL_WIDTH - CHART_PAD_L - CHART_PAD_R);
}

export function logicalXToPercent(x: number): number {
  return (x / CHART_LOGICAL_WIDTH) * 100;
}

export function timeToPercent(ts: number, win: TimelineWindow): number {
  return logicalXToPercent(timeToLogicalX(ts, win));
}

export const MIN_COLUMN_PX = 64;


export function canvasWidthCss(recordCount: number, zoom: number): string {
  return `max(${zoom * 100}%, ${recordCount * MIN_COLUMN_PX}px)`;
}

export const ROW_LABEL_GUTTER_PX = 64;


export function minGapPercentFor(count: number): number {
  return count > 1 ? Math.min(100 / count, 8) : 0;
}


export function deoverlapPercents(percents: number[], minGapPercent: number): number[] {
  const order = percents.map((pct, index) => ({ pct, index })).sort((a, b) => a.pct - b.pct);
  const result = new Array<number>(percents.length);
  let prev = -Infinity;
  for (const { pct, index } of order) {
    const adjusted = Math.max(pct, prev + minGapPercent);
    result[index] = adjusted;
    prev = adjusted;
  }
  return result;
}
