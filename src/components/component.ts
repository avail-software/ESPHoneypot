export interface Component {
  readonly el: HTMLElement;
  mount(parent: HTMLElement): void;
  unmount(): void;
  destroy(): void;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html !== undefined) el.innerHTML = html;
  return el;
}

export function qs<T extends HTMLElement>(
  parent: HTMLElement,
  selector: string,
): T {
  const el = parent.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}
