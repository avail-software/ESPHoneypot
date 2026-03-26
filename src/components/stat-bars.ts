import { createElement, type Component } from "./component";
import { C } from "../theme/colors";
import type { Store } from "../state/store";
import type { AppState } from "../types";

const FONT = "'Press Start 2P', monospace";

interface BarDef {
  label: string;
  color: string;
}

const BARS: BarDef[] = [
  { label: "PWR", color: C.yellow },
  { label: "SIG", color: C.pink },
  { label: "MEM", color: C.yellow },
];

export class StatBars implements Component {
  readonly el: HTMLElement;
  private store: Store<AppState>;
  private unsubs: (() => void)[] = [];
  private fills: HTMLElement[] = [];

  constructor(store: Store<AppState>) {
    this.store = store;

    this.el = createElement("div");
    Object.assign(this.el.style, {
      position: "absolute",
      right: "16px",
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: "10",
      display: "flex",
      gap: "5px",
      pointerEvents: "none",
    });

    for (const bar of BARS) {
      const col = createElement("div");
      Object.assign(col.style, {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "3px",
      });

      const track = createElement("div");
      Object.assign(track.style, {
        width: "8px",
        height: "60px",
        background: C.dim,
        position: "relative",
      });

      const fill = createElement("div");
      Object.assign(fill.style, {
        position: "absolute",
        bottom: "0",
        left: "0",
        right: "0",
        height: "0%",
        background: bar.color,
        transition: "height 0.3s",
      });
      track.appendChild(fill);
      this.fills.push(fill);

      const label = createElement("span");
      label.textContent = bar.label;
      Object.assign(label.style, {
        fontFamily: FONT,
        fontSize: "7px",
        color: C.textFaint,
        letterSpacing: "0.15em",
      });

      col.appendChild(track);
      col.appendChild(label);
      this.el.appendChild(col);
    }

    this.unsubs.push(
      store.select(
        (s) => s.connectionState,
        () => this.updateBars(),
      ),
    );
    this.unsubs.push(
      store.select(
        (s) => s.flashProgress,
        () => this.updateBars(),
      ),
    );

    this.updateBars();
  }

  private updateBars(): void {
    const { connectionState, flashProgress } = this.store.get();

    const connVal =
      connectionState === "connected"
        ? 1
        : connectionState === "connecting"
          ? 0.5
          : 0;

    this.fills[0].style.height = `${connVal * 100}%`;
    this.fills[1].style.height = `${connVal * 100}%`;
    this.fills[2].style.height = `${flashProgress}%`;
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  unmount(): void {
    this.el.remove();
  }

  destroy(): void {
    this.unsubs.forEach((u) => u());
    this.unmount();
  }
}
