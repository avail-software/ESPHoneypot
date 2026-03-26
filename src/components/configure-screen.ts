import { createElement, type Component } from "./component";
import { C } from "../theme/colors";
import { iconTarget, iconArrow } from "../icons/pixel-icons";
import { findBoard } from "../boards";
import { TopBar } from "./top-bar";
import { ConfigPanel } from "./config-panel";
import { FooterBar } from "./footer-bar";
import type { Store } from "../state/store";
import type { AppState } from "../types";
import type { FlashService } from "../services/flash-service";

const FONT = "'Press Start 2P', monospace";

export class ConfigureScreen implements Component {
  readonly el: HTMLElement;

  private store: Store<AppState>;
  private flashService: FlashService;
  private topBar: TopBar;
  private configPanel: ConfigPanel;
  private footer: FooterBar;

  constructor(store: Store<AppState>, flashService: FlashService) {
    this.store = store;
    this.flashService = flashService;

    this.el = createElement("div");
    Object.assign(this.el.style, {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: C.bg,
    });

    const board = findBoard(store.get().selectedBoardId);
    const totalSteps = (board?.configFields?.length ?? 0) > 0 ? 3 : 2;

    this.topBar = new TopBar(store);
    this.topBar.setStep(2, totalSteps);
    this.el.appendChild(this.topBar.el);

    this.el.appendChild(this.buildTitleSection());

    this.configPanel = new ConfigPanel(store);
    this.el.appendChild(this.configPanel.el);

    this.footer = new FooterBar();
    this.footer.setButtons(
      [
        {
          label: "BACK",
          style: "outline",
          onClick: () => this.store.set({ screen: "select" }),
        },
      ],
      [
        {
          label: "FLASH",
          style: "primary",
          icon: iconArrow(12, C.dark as string),
          onClick: () => this.onFlash(),
        },
      ],
    );
    this.el.appendChild(this.footer.el);
  }

  private buildTitleSection(): HTMLElement {
    const section = createElement("div");
    Object.assign(section.style, {
      padding: "14px 18px 10px",
      borderBottom: `1px solid ${C.dim}`,
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexShrink: "0",
    });

    const iconWrap = createElement("span");
    iconWrap.style.lineHeight = "0";
    iconWrap.innerHTML = iconTarget(20, C.pink);

    const textCol = createElement("div");

    const title = createElement("div");
    Object.assign(title.style, {
      fontFamily: FONT,
      fontSize: "16px",
      color: C.text,
      letterSpacing: "0.06em",
    });
    title.textContent = "CONFIGURE HONEYPOT";

    const subtitle = createElement("div");
    Object.assign(subtitle.style, {
      fontFamily: FONT,
      fontSize: "9px",
      color: C.textMid,
      letterSpacing: "0.25em",
      marginTop: "4px",
    });
    subtitle.textContent = "SET DEVICE PARAMETERS BEFORE FLASHING";

    textCol.appendChild(title);
    textCol.appendChild(subtitle);
    section.appendChild(iconWrap);
    section.appendChild(textCol);
    return section;
  }

  private onFlash(): void {
    const { selectedBoardId } = this.store.get();
    const board = findBoard(selectedBoardId);
    if (!board) return;

    const values = this.flashService.collectConfigValues(board.configFields ?? []);
    const baudrate = this.configPanel.getBaudrate();
    const eraseAll = this.configPanel.getEraseAll();

    this.flashService.flashAndConfigure(board, values, { baudrate, eraseAll }).catch(() => {
      /* error state handled by store */
    });
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  unmount(): void {
    this.el.remove();
  }

  destroy(): void {
    this.topBar.destroy();
    this.configPanel.destroy();
    this.footer.destroy();
    this.unmount();
  }
}
