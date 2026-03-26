import { createElement, type Component } from "./component";
import { C } from "../theme/colors";
import type { Store } from "../state/store";
import type { AppState, FlashPhase, LogEntry } from "../types";

const FONT = "'Press Start 2P', monospace";

const CAT_COLORS: Record<string, string> = {
  CONN: C.yellow,
  ERASE: C.yellow,
  WRITE: C.yellow,
  VERIFY: C.pink,
  CONFIG: C.pink,
  SYS: "#555",
  WARN: C.pink,
  ERR: C.pink,
};

export class Terminal implements Component {
  readonly el: HTMLElement;
  private unsubs: (() => void)[] = [];
  private body: HTMLElement;
  private cursor: HTMLElement;
  private chipLabel: HTMLElement;
  private dot3: HTMLElement;
  private lineEls: HTMLElement[] = [];
  private lastLogCount = 0;
  private done = false;

  constructor(store: Store<AppState>) {
    this.el = createElement("div");
    Object.assign(this.el.style, {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      overflow: "hidden",
      border: "1px solid #111",
      fontFamily: FONT,
    });

    const style = document.createElement("style");
    style.textContent =
      "@keyframes terminal-blink{0%,100%{opacity:1}50%{opacity:0}}";
    this.el.appendChild(style);

    // ── title bar ──
    const titleBar = createElement("div");
    Object.assign(titleBar.style, {
      background: "#0a0a0a",
      padding: "6px 12px",
      borderBottom: "1px solid #111",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      flexShrink: "0",
    });

    const dots = createElement("div");
    Object.assign(dots.style, {
      display: "flex",
      gap: "3px",
      marginRight: "8px",
    });

    const makeDot = (bg: string): HTMLElement => {
      const d = createElement("div");
      Object.assign(d.style, {
        width: "5px",
        height: "5px",
        borderRadius: "50%",
        background: bg,
      });
      return d;
    };
    dots.appendChild(makeDot("#1a1a1a"));
    dots.appendChild(makeDot("#1a1a1a"));
    this.dot3 = makeDot("#1a1a1a");
    dots.appendChild(this.dot3);

    this.chipLabel = createElement("span");
    Object.assign(this.chipLabel.style, {
      fontSize: "4px",
      color: "#222",
      letterSpacing: "0.25em",
      textTransform: "uppercase",
    });
    this.chipLabel.textContent = "TERMINAL — ESP32";

    titleBar.appendChild(dots);
    titleBar.appendChild(this.chipLabel);

    // ── body ──
    this.body = createElement("div");
    Object.assign(this.body.style, {
      background: "#050505",
      flex: "1",
      overflowY: "auto",
      padding: "8px 12px",
    });

    this.cursor = createElement("div");
    Object.assign(this.cursor.style, {
      width: "5px",
      height: "9px",
      background: C.yellow,
      animation: "terminal-blink 1s step-end infinite",
      marginTop: "2px",
    });
    this.body.appendChild(this.cursor);

    this.el.appendChild(titleBar);
    this.el.appendChild(this.body);

    // ── subscriptions ──
    this.unsubs.push(
      store.select(
        (s) => s.logs,
        (logs) => this.onLogs(logs),
      ),
    );
    this.unsubs.push(
      store.select(
        (s) => s.flashPhase,
        (phase) => this.onPhase(phase),
      ),
    );
    this.unsubs.push(
      store.select(
        (s) => s.detectedChip,
        (chip) => {
          this.chipLabel.textContent = `TERMINAL — ${chip || "ESP32"}`;
        },
      ),
    );

    // seed current state
    const state = store.get();
    if (state.detectedChip) {
      this.chipLabel.textContent = `TERMINAL — ${state.detectedChip}`;
    }
    this.onPhase(state.flashPhase);
    if (state.logs.length > 0) {
      this.onLogs(state.logs);
    }
  }

  private createLine(index: number, entry: LogEntry): HTMLElement {
    const line = createElement("div");
    Object.assign(line.style, {
      fontSize: "7px",
      lineHeight: "2.1",
      letterSpacing: "0.04em",
      whiteSpace: "nowrap",
    });

    const num = createElement("span");
    num.textContent = String(index + 1).padStart(2, "0") + "  ";
    Object.assign(num.style, { color: "#131313", userSelect: "none" });

    const tag = createElement("span");
    const cat = entry.category.toUpperCase();
    tag.textContent = `[${cat}]  `;
    Object.assign(tag.style, { color: CAT_COLORS[cat] || "#555" });

    const text = createElement("span");
    text.textContent = entry.text;

    line.appendChild(num);
    line.appendChild(tag);
    line.appendChild(text);
    return line;
  }

  private updateLineColors(): void {
    const total = this.lineEls.length;
    const accent = this.done ? C.pink : C.yellow;
    const start = Math.max(0, total - 5);
    for (let i = start; i < total; i++) {
      const textSpan = this.lineEls[i].children[2] as HTMLElement;
      if (i === total - 1) {
        textSpan.style.color = accent;
      } else if (i >= total - 4) {
        textSpan.style.color = "#2a2a2a";
      } else {
        textSpan.style.color = "#1a1a1a";
      }
    }
  }

  private onLogs(logs: readonly LogEntry[]): void {
    if (logs.length < this.lastLogCount) {
      this.clear();
    }
    if (logs.length <= this.lastLogCount) return;

    for (let i = this.lastLogCount; i < logs.length; i++) {
      const line = this.createLine(i, logs[i]);
      this.body.insertBefore(line, this.cursor);
      this.lineEls.push(line);
    }

    this.lastLogCount = logs.length;
    this.updateLineColors();
    this.body.scrollTop = this.body.scrollHeight;
  }

  private onPhase(phase: FlashPhase): void {
    this.done = phase === "done";
    this.dot3.style.background = this.done ? C.pink : "#1a1a1a";
    this.cursor.style.display = this.done ? "none" : "block";
    this.updateLineColors();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  unmount(): void {
    this.el.remove();
  }

  clear(): void {
    for (const el of this.lineEls) el.remove();
    this.lineEls = [];
    this.lastLogCount = 0;
  }

  destroy(): void {
    this.unsubs.forEach((u) => u());
    this.unmount();
  }
}
