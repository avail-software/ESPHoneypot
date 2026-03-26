import { createElement, type Component } from "./component";
import { C } from "../theme/colors";
import { iconArrow } from "../icons/pixel-icons";
import { BOARDS } from "../boards";
import type { Store } from "../state/store";
import type { AppState } from "../types";

const FONT = "'Press Start 2P', monospace";

export class BoardList implements Component {
  readonly el: HTMLElement;

  private rows: Map<string, HTMLElement> = new Map();
  private arrowEls: Map<string, HTMLElement> = new Map();
  private caretEls: Map<string, HTMLElement> = new Map();
  private unsub: () => void;
  private store: Store<AppState>;

  constructor(store: Store<AppState>) {
    this.store = store;

    this.el = createElement("div");
    Object.assign(this.el.style, {
      flex: "1",
      overflowY: "auto",
      overflowX: "hidden",
    });

    for (const board of BOARDS) {
      const row = createElement("div");
      Object.assign(row.style, {
        display: "flex",
        alignItems: "center",
        padding: "12px 20px",
        cursor: "pointer",
        borderBottom: `1px solid ${C.dim}`,
        borderLeft: "3px solid transparent",
        transition: "background 0.15s, border-color 0.15s",
        gap: "8px",
      });

      const caret = createElement("span");
      Object.assign(caret.style, {
        fontFamily: FONT,
        fontSize: "12px",
        color: C.yellow,
        animation: "blink 2s step-end infinite",
        visibility: "hidden",
        flexShrink: "0",
        width: "14px",
      });
      caret.textContent = "▶";

      const info = createElement("div");
      Object.assign(info.style, {
        flex: "1",
        minWidth: "0",
        display: "flex",
        flexDirection: "column",
        gap: "5px",
      });

      const nameEl = createElement("span");
      Object.assign(nameEl.style, {
        fontFamily: FONT,
        fontSize: "12px",
        color: C.text,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      });
      nameEl.textContent = board.name;

      const chipEl = createElement("span");
      Object.assign(chipEl.style, {
        fontFamily: FONT,
        fontSize: "9px",
        color: C.textMid,
        letterSpacing: "0.1em",
      });
      chipEl.textContent = board.chip;

      const descEl = createElement("span");
      Object.assign(descEl.style, {
        fontFamily: FONT,
        fontSize: "9px",
        color: C.textFaint,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      });
      descEl.textContent = board.description;

      info.appendChild(nameEl);
      info.appendChild(chipEl);
      info.appendChild(descEl);

      const arrow = createElement("span");
      Object.assign(arrow.style, {
        flexShrink: "0",
        animation: "blink 2s step-end infinite",
        display: "none",
        lineHeight: "0",
      });
      arrow.innerHTML = iconArrow(12, C.yellow);

      row.appendChild(caret);
      row.appendChild(info);
      row.appendChild(arrow);

      row.addEventListener("click", () => {
        this.store.set({ selectedBoardId: board.id });
      });

      this.rows.set(board.id, row);
      this.arrowEls.set(board.id, arrow);
      this.caretEls.set(board.id, caret);
      this.el.appendChild(row);
    }

    this.highlight(store.get().selectedBoardId);

    this.unsub = store.select(
      (s) => s.selectedBoardId,
      (next) => this.highlight(next),
    );
  }

  private highlight(selectedId: string): void {
    for (const [id, row] of this.rows) {
      const selected = id === selectedId;
      row.style.borderLeftColor = selected ? C.yellow : "transparent";
      row.style.background = selected ? "rgba(245,184,0,0.07)" : "transparent";
      this.arrowEls.get(id)!.style.display = selected ? "block" : "none";
      this.caretEls.get(id)!.style.visibility = selected ? "visible" : "hidden";
    }
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
}
