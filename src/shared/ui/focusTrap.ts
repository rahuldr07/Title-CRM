export function nextFocus(count: number, current: number, back: boolean): number {
  if (count <= 0) return -1
  if (current < 0 || current >= count) return back ? count - 1 : 0
  return back ? (current - 1 + count) % count : (current + 1) % count
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

export const focusablesIn = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0)
