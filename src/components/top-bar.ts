import { createElement, type Component } from "./component";
import { C } from "../theme/colors";
import { iconFlash } from "../icons/pixel-icons";
import type { Store } from "../state/store";
import type { AppState, ConnectionState } from "../types";

const FONT = "'Press Start 2P', monospace";

const STATUS_LABELS: Record<ConnectionState, string> = {
  disconnected: "READY",
  connecting: "SCANNING…",
  connected: "CONNECTED",
  error: "ERROR",
};

export class TopBar implements Component {
  readonly el: HTMLElement;

  private stepEl: HTMLElement;
  private statusText: HTMLElement;
  private unsub: () => void;

  constructor(store: Store<AppState>) {
    this.el = createElement("div");
    Object.assign(this.el.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 20px",
      background: C.dark,
      borderBottom: `3px solid ${C.yellow}`,
      flexShrink: "0",
    });

    const left = createElement("div");
    Object.assign(left.style, {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    });
    left.innerHTML = iconFlash(18, C.yellow);
    const brand = createElement("span");
    Object.assign(brand.style, {
      fontFamily: FONT,
      fontSize: "12px",
      color: C.yellow,
      letterSpacing: "0.3em",
    });
    brand.textContent = "HONEY//BOOT";
    left.appendChild(brand);

    this.stepEl = createElement("span");
    Object.assign(this.stepEl.style, {
      fontFamily: FONT,
      fontSize: "9px",
      color: C.textMid,
      letterSpacing: "0.3em",
    });
    this.stepEl.textContent = "STEP 01 / 03";

    const right = createElement("div");
    Object.assign(right.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
    });

    const dot = createElement("div");
    Object.assign(dot.style, {
      width: "8px",
      height: "8px",
      background: C.yellow,
      animation: "blink 2s step-end infinite",
    });

    this.statusText = createElement("span");
    Object.assign(this.statusText.style, {
      fontFamily: FONT,
      fontSize: "9px",
      color: C.textMid,
    });
    this.statusText.textContent = STATUS_LABELS.disconnected;

    right.appendChild(dot);
    right.appendChild(this.statusText);

    this.el.appendChild(left);
    this.el.appendChild(this.stepEl);
    this.el.appendChild(right);

    TopBar.injectKeyframes();

    this.unsub = store.select(
      (s) => s.connectionState,
      (next) => {
        this.statusText.textContent = STATUS_LABELS[next];
      },
    );
  }

  setStep(current: number, total: number): void {
    const c = String(current).padStart(2, "0");
    const t = String(total).padStart(2, "0");
    this.stepEl.textContent = `STEP ${c} / ${t}`;
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  unmount(): void {
    this.el.remove();
  }

  destroy(): void {
    this.unsub();
    this.unmount();
  }

  private static injected = false;
  private static injectKeyframes(): void {
    if (TopBar.injected) return;
    TopBar.injected = true;
    const style = document.createElement("style");
    style.textContent = `
      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    `;
    document.head.appendChild(style);
  }
}
