import { createElement, type Component } from "./component";
import { C } from "../theme/colors";

const FONT = "'Press Start 2P', monospace";

export interface FooterButton {
  label: string;
  style: "primary" | "outline" | "ghost";
  onClick: () => void;
  icon?: string;
}

const BTN_BASE: Partial<CSSStyleDeclaration> = {
  fontFamily: FONT,
  fontSize: "11px",
  letterSpacing: "0.15em",
  padding: "10px 18px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  border: "none",
  outline: "none",
};

const STYLE_MAP: Record<FooterButton["style"], Partial<CSSStyleDeclaration>> = {
  primary: {
    background: C.yellow,
    color: C.dark,
  },
  outline: {
    background: "transparent",
    color: C.textFaint,
    border: `1px solid ${C.dim}`,
  },
  ghost: {
    background: "transparent",
    color: C.textFaint,
    border: "none",
  },
};

function createButton(cfg: FooterButton): HTMLButtonElement {
  const btn = createElement("button");
  Object.assign(btn.style, BTN_BASE, STYLE_MAP[cfg.style]);
  if (cfg.icon) {
    const iconSpan = createElement("span");
    iconSpan.style.lineHeight = "0";
    iconSpan.innerHTML = cfg.icon;
    btn.appendChild(iconSpan);
  }
  const text = createElement("span");
  text.textContent = cfg.label;
  btn.appendChild(text);
  btn.addEventListener("click", cfg.onClick);
  return btn;
}

export class FooterBar implements Component {
  readonly el: HTMLElement;

  private leftSlot: HTMLElement;
  private rightSlot: HTMLElement;
  private warningEl: HTMLElement;

  constructor() {
    this.el = createElement("div");
    Object.assign(this.el.style, {
      padding: "10px 18px",
      display: "flex",
      flexDirection: "column",
      borderTop: `1px solid ${C.dim}`,
      flexShrink: "0",
    });

    this.warningEl = createElement("div");
    Object.assign(this.warningEl.style, {
      display: "none",
      alignItems: "center",
      gap: "6px",
      fontFamily: FONT,
      fontSize: "9px",
      color: C.pink,
      paddingBottom: "8px",
    });

    const row = createElement("div");
    Object.assign(row.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    });

    this.leftSlot = createElement("div");
    Object.assign(this.leftSlot.style, {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    });

    this.rightSlot = createElement("div");
    Object.assign(this.rightSlot.style, {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    });

    row.appendChild(this.leftSlot);
    row.appendChild(this.rightSlot);
    this.el.appendChild(this.warningEl);
    this.el.appendChild(row);
  }

  setButtons(left: FooterButton[], right: FooterButton[]): void {
    this.leftSlot.innerHTML = "";
    this.rightSlot.innerHTML = "";
    for (const cfg of left) this.leftSlot.appendChild(createButton(cfg));
    for (const cfg of right) this.rightSlot.appendChild(createButton(cfg));
  }

  setWarning(text: string, icon?: string): void {
    this.warningEl.style.display = "flex";
    this.warningEl.innerHTML = "";
    if (icon) {
      const iconSpan = createElement("span");
      iconSpan.style.lineHeight = "0";
      iconSpan.innerHTML = icon;
      this.warningEl.appendChild(iconSpan);
    }
    const txt = createElement("span");
    txt.textContent = text;
    this.warningEl.appendChild(txt);
  }

  clearWarning(): void {
    this.warningEl.style.display = "none";
    this.warningEl.innerHTML = "";
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  unmount(): void {
    this.el.remove();
  }

  destroy(): void {
    this.unmount();
  }
}
