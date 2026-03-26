import { createElement, type Component } from "./component";
import { C } from "../theme/colors";
import type { Store } from "../state/store";
import type { AppState } from "../types";

export class ProgressBar implements Component {
  readonly el: HTMLElement;
  private store: Store<AppState>;
  private unsubs: (() => void)[] = [];
  private mainRow: HTMLElement;
  private subRow: HTMLElement;
  private mainFills: HTMLElement[] = [];
  private subFills: HTMLElement[] = [];
  private segCount = 0;

  constructor(store: Store<AppState>) {
    this.store = store;

    this.el = createElement("div");
    Object.assign(this.el.style, {
      padding: "12px 18px 8px",
      borderBottom: `1px solid ${C.dim}`,
    });

    this.mainRow = createElement("div");
    Object.assign(this.mainRow.style, { display: "flex", gap: "2px" });

    this.subRow = createElement("div");
    Object.assign(this.subRow.style, {
      display: "flex",
      gap: "2px",
      marginTop: "2px",
    });

    this.el.appendChild(this.mainRow);
    this.el.appendChild(this.subRow);

    this.unsubs.push(
      store.subscribe(() => this.update()),
    );

    this.rebuild(store.get().flashFileCount);
    this.update();
  }

  private rebuild(count: number): void {
    this.mainRow.innerHTML = "";
    this.subRow.innerHTML = "";
    this.mainFills = [];
    this.subFills = [];
    this.segCount = count;

    if (count === 0) {
      const ph = createElement("div");
      Object.assign(ph.style, {
        flex: "1",
        height: "6px",
        background: C.dim,
      });
      this.mainRow.appendChild(ph);

      const subPh = createElement("div");
      Object.assign(subPh.style, {
        flex: "1",
        height: "2px",
        background: C.dim,
      });
      this.subRow.appendChild(subPh);
      return;
    }

    for (let i = 0; i < count; i++) {
      const seg = createElement("div");
      Object.assign(seg.style, {
        flex: "1",
        height: "6px",
        background: C.dim,
        position: "relative",
        overflow: "hidden",
      });
      const fill = createElement("div");
      Object.assign(fill.style, {
        position: "absolute",
        left: "0",
        top: "0",
        bottom: "0",
        width: "0%",
        background: C.yellow,
        transition: "width 0.15s",
      });
      seg.appendChild(fill);
      this.mainRow.appendChild(seg);
      this.mainFills.push(fill);

      const subSeg = createElement("div");
      Object.assign(subSeg.style, {
        flex: "1",
        height: "2px",
        background: C.dim,
        position: "relative",
        overflow: "hidden",
      });
      const subFill = createElement("div");
      Object.assign(subFill.style, {
        position: "absolute",
        left: "0",
        top: "0",
        bottom: "0",
        width: "0%",
        background: C.yellow,
        opacity: "0.5",
        transition: "width 0.15s",
      });
      subSeg.appendChild(subFill);
      this.subRow.appendChild(subSeg);
      this.subFills.push(subFill);
    }
  }

  private update(): void {
    const { flashProgress, flashFileCount, flashPhase } = this.store.get();

    if (flashFileCount !== this.segCount) {
      this.rebuild(flashFileCount);
    }

    if (this.segCount === 0) return;

    const accent = flashPhase === "done" ? C.pink : C.yellow;
    const perFile = 100 / this.segCount;

    for (let i = 0; i < this.segCount; i++) {
      const segStart = i * perFile;
      const segEnd = (i + 1) * perFile;
      let pct: number;

      if (flashProgress >= segEnd) {
        pct = 100;
      } else if (flashProgress > segStart) {
        pct = ((flashProgress - segStart) / perFile) * 100;
      } else {
        pct = 0;
      }

      this.mainFills[i].style.width = `${pct}%`;
      this.mainFills[i].style.background = accent;
      this.subFills[i].style.width = `${pct}%`;
      this.subFills[i].style.background = accent;
    }
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
