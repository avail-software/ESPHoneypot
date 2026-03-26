import type { AppState } from "../types";
import type { Store } from "../state/store";
import { type Component, createElement } from "./component";
import { C } from "../theme/colors";
import { iconShield, iconArrow, blockCorner } from "../icons/pixel-icons";

const FONT = "'Press Start 2P', monospace";

export class BootScreen implements Component {
  readonly el: HTMLElement;
  private store: Store<AppState>;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private boundSkip: () => void;

  constructor(store: Store<AppState>) {
    this.store = store;
    this.boundSkip = () => this.skip();

    const el = createElement("div");
    this.el = el;

    Object.assign(el.style, {
      position: "fixed",
      inset: "0",
      background: C.dark,
      zIndex: "100",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT,
      cursor: "pointer",
      overflow: "hidden",
    });

    const blocks = Array.from({ length: 16 }, (_, i) =>
      `<div style="width:10px;height:10px;background:${i < 10 ? C.yellow : C.mid}"></div>`,
    ).join("");

    el.innerHTML = `
      <div style="position:absolute;top:0;left:0">${blockCorner(80, C.yellow)}</div>
      <div style="position:absolute;top:0;right:0;transform:rotate(90deg)">${blockCorner(48, C.pink)}</div>
      <div style="position:absolute;bottom:0;left:0;transform:rotate(270deg)">${blockCorner(48, C.pink)}</div>
      <div style="position:absolute;bottom:0;right:0">${blockCorner(80, C.yellow, true)}</div>

      <div data-phase="1" style="display:none;text-align:center">
        <div style="display:flex;justify-content:center;margin-bottom:16px">${iconShield(52)}</div>
        <div style="font-size:22px;color:${C.yellow};letter-spacing:0.12em;margin-bottom:8px">HNY//FLASH</div>
        <div style="font-size:10px;color:#333;letter-spacing:0.4em">FTP HONEYPOT DEPLOY</div>
      </div>

      <div data-phase="2" style="display:none;text-align:center;margin-top:24px">
        <div style="font-size:9px;color:#333;margin-bottom:12px">SYSTEM INIT...</div>
        <div style="display:flex;gap:3px;justify-content:center">${blocks}</div>
      </div>

      <div data-phase="3" style="display:none;margin-top:24px">
        <div style="display:flex;align-items:center;gap:8px;justify-content:center">
          <div style="animation:blink 1s step-end infinite">${iconArrow(16, C.yellow)}</div>
          <div style="font-size:11px;color:${C.yellow};letter-spacing:0.3em;animation:blink 1s step-end infinite">LOADING</div>
        </div>
      </div>
    `;
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
    document.addEventListener("keydown", this.boundSkip);
    this.el.addEventListener("click", this.boundSkip);
    this.startSequence();
  }

  unmount(): void {
    this.cleanup();
    this.el.remove();
  }

  destroy(): void {
    this.cleanup();
    this.el.remove();
  }

  private cleanup(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    document.removeEventListener("keydown", this.boundSkip);
    this.el.removeEventListener("click", this.boundSkip);
  }

  private skip(): void {
    this.cleanup();
    this.store.set({ screen: "select" });
  }

  private reveal(phase: string): void {
    const el = this.el.querySelector<HTMLElement>(`[data-phase="${phase}"]`);
    if (el) {
      el.style.display = "block";
      el.style.animation = "fadein 0.4s ease both";
    }
  }

  private startSequence(): void {
    this.timers.push(setTimeout(() => this.reveal("1"), 500));
    this.timers.push(setTimeout(() => this.reveal("2"), 1600));
    this.timers.push(setTimeout(() => this.reveal("3"), 2600));
    this.timers.push(setTimeout(() => this.skip(), 3800));
  }
}
