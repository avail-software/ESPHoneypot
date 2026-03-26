import { type Component, createElement } from "./component";
import { C } from "../theme/colors";
import { iconShield, blockCorner } from "../icons/pixel-icons";

const FONT = "'Press Start 2P', monospace";

export function checkDesktopRequired(): boolean {
  return window.innerWidth < 768 || !("serial" in navigator);
}

export class DesktopGate implements Component {
  readonly el: HTMLElement;

  constructor() {
    const el = createElement("div");
    this.el = el;

    Object.assign(el.style, {
      position: "fixed",
      inset: "0",
      background: C.dark,
      zIndex: "200",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT,
      overflow: "hidden",
    });

    el.innerHTML = `
      <div style="position:absolute;top:0;left:0">${blockCorner(48, C.yellow)}</div>
      <div style="position:absolute;bottom:0;right:0">${blockCorner(48, C.yellow, true)}</div>

      <div style="text-align:center">
        <div style="display:flex;justify-content:center;margin-bottom:20px">${iconShield(52, C.yellow, C.pink)}</div>
        <div style="font-size:16px;color:${C.yellow};letter-spacing:0.12em;margin-bottom:16px">DESKTOP REQUIRED</div>
        <div style="font-size:9px;color:${C.textMid};max-width:400px;line-height:2;padding:0 16px">This tool requires Chrome or Edge on a desktop computer with Web Serial API support.</div>
      </div>
    `;
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  unmount(): void {
    this.el.remove();
  }

  destroy(): void {
    this.el.remove();
  }
}
