
export function getScrollRatio(el: HTMLElement): number {
  const maxScroll = el.scrollWidth - el.clientWidth;
  return maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
}

export function applyScrollRatio(el: HTMLElement, ratio: number): void {
  const maxScroll = el.scrollWidth - el.clientWidth;
  if (maxScroll <= 0) return;
  const target = ratio * maxScroll;
  if (Math.abs(el.scrollLeft - target) < 1) return;
  el.scrollLeft = target;
}

export function scrollToEnd(el: HTMLElement): void {
  requestAnimationFrame(() => {
    el.scrollLeft = el.scrollWidth;
  });
}
