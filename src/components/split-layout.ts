import { createElement, type Component } from "./component";
import { C } from "../theme/colors";

export class SplitLayout implements Component {
  readonly el: HTMLElement;
  readonly leftPanel: HTMLElement;
  readonly rightPanel: HTMLElement;

  constructor() {
    this.el = createElement("div");
    Object.assign(this.el.style, {
      display: "flex",
      height: "100vh",
      width: "100%",
      overflow: "hidden",
    });

    this.leftPanel = createElement("div");
    Object.assign(this.leftPanel.style, {
      position: "relative",
      width: "48%",
      background: "#000",
      flexShrink: "0",
    });

    this.rightPanel = createElement("div");
    Object.assign(this.rightPanel.style, {
      flex: "1",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      borderLeft: `3px solid ${C.dark}`,
      background: C.bg,
    });

    this.el.appendChild(this.leftPanel);
    this.el.appendChild(this.rightPanel);
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
