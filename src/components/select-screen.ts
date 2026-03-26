import { createElement, type Component } from "./component";
import { C } from "../theme/colors";
import { iconTarget, iconArrow } from "../icons/pixel-icons";
import { findBoard } from "../boards";
import { TopBar } from "./top-bar";
import { BoardList } from "./board-list";
import { FooterBar } from "./footer-bar";
import type { Store } from "../state/store";
import type { AppState, ConnectionState } from "../types";
import type { FlashService } from "../services/flash-service";

const FONT = "'Press Start 2P', monospace";

export class SelectScreen implements Component {
  readonly el: HTMLElement;

  private store: Store<AppState>;
  private flashService: FlashService;
  private topBar: TopBar;
  private boardList: BoardList;
  private footer: FooterBar;
  private unsubs: (() => void)[] = [];
  private scanBtn: HTMLButtonElement | null = null;
  private scanStatusText: HTMLElement | null = null;
  private accentBar: HTMLElement | null = null;

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

    this.topBar = new TopBar(store);
    this.topBar.setStep(1, 3);
    this.el.appendChild(this.topBar.el);

    this.el.appendChild(this.buildTitleSection());
    this.el.appendChild(this.buildScanBar());

    this.boardList = new BoardList(store);
    this.el.appendChild(this.boardList.el);

    this.footer = new FooterBar();
    this.footer.setButtons([], [
      {
        label: "CONFIRM",
        style: "primary",
        icon: iconArrow(12, C.dark as string),
        onClick: () => this.onConfirm(),
      },
    ]);
    this.el.appendChild(this.footer.el);

    this.unsubs.push(
      store.select(
        (s) => s.connectionState,
        (next) => this.updateScanBar(next, store.get().detectedChip),
      ),
    );

    this.unsubs.push(
      store.select(
        (s) => s.detectedChip,
        (next) => this.updateScanBar(store.get().connectionState, next),
      ),
    );
  }

  private buildTitleSection(): HTMLElement {
    const section = createElement("div");
    Object.assign(section.style, {
      padding: "14px 18px 10px",
      borderBottom: `1px solid ${C.dim}`,
      display: "flex",
      alignItems: "center",
      gap: "10px",
    });

    const iconWrap = createElement("span");
    iconWrap.style.lineHeight = "0";
    iconWrap.innerHTML = iconTarget(20, C.pink);

    const textCol = createElement("div");

    const title = createElement("div");
    Object.assign(title.style, {
      fontFamily: FONT,
      fontSize: "10px",
      color: C.text,
      letterSpacing: "0.06em",
    });
    title.textContent = "SELECT DEVICE";

    const subtitle = createElement("div");
    Object.assign(subtitle.style, {
      fontFamily: FONT,
      fontSize: "5px",
      color: C.textMid,
      letterSpacing: "0.25em",
      marginTop: "4px",
    });
    subtitle.textContent = "IDENTIFY YOUR TARGET BOARD";

    textCol.appendChild(title);
    textCol.appendChild(subtitle);
    section.appendChild(iconWrap);
    section.appendChild(textCol);
    return section;
  }

  private buildScanBar(): HTMLElement {
    const bar = createElement("div");
    Object.assign(bar.style, {
      padding: "10px 18px",
      borderBottom: `1px solid ${C.dim}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
    });

    const leftGroup = createElement("div");
    Object.assign(leftGroup.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    });

    this.accentBar = createElement("div");
    Object.assign(this.accentBar.style, {
      width: "3px",
      height: "14px",
      background: C.dim,
      flexShrink: "0",
    });

    this.scanStatusText = createElement("span");
    Object.assign(this.scanStatusText.style, {
      fontFamily: FONT,
      fontSize: "5px",
      color: C.textMid,
      letterSpacing: "0.15em",
    });
    this.scanStatusText.textContent = "NO PORT SELECTED";

    leftGroup.appendChild(this.accentBar);
    leftGroup.appendChild(this.scanStatusText);

    this.scanBtn = createElement("button");
    Object.assign(this.scanBtn.style, {
      fontFamily: FONT,
      fontSize: "6px",
      background: C.yellow,
      color: C.dark,
      border: "none",
      padding: "6px 12px",
      cursor: "pointer",
      letterSpacing: "0.1em",
      flexShrink: "0",
    });
    this.scanBtn.textContent = "SCAN PORT";
    this.scanBtn.addEventListener("click", () => this.onScan());

    bar.appendChild(leftGroup);
    bar.appendChild(this.scanBtn);
    return bar;
  }

  private updateScanBar(connState: ConnectionState, chip: string | null): void {
    if (!this.scanBtn || !this.scanStatusText || !this.accentBar) return;

    switch (connState) {
      case "disconnected":
        this.accentBar.style.background = C.dim;
        this.scanStatusText.textContent = "NO PORT SELECTED";
        this.scanBtn.textContent = "SCAN PORT";
        this.scanBtn.disabled = false;
        this.scanBtn.style.animation = "";
        this.scanBtn.style.opacity = "1";
        break;
      case "connecting":
        this.accentBar.style.background = C.yellow;
        this.accentBar.style.animation = "pulse 1s ease-in-out infinite";
        this.scanStatusText.textContent = "SCANNING…";
        this.scanBtn.textContent = "SCANNING…";
        this.scanBtn.disabled = true;
        this.scanBtn.style.animation = "pulse 1s ease-in-out infinite";
        break;
      case "connected":
        this.accentBar.style.background = C.pink;
        this.accentBar.style.animation = "";
        this.scanStatusText.textContent = chip ? `DETECTED: ${chip}` : "CONNECTED";
        this.scanBtn.textContent = "CONNECTED";
        this.scanBtn.disabled = true;
        this.scanBtn.style.animation = "";
        this.scanBtn.style.opacity = "0.6";
        break;
      case "error":
        this.accentBar.style.background = C.pink;
        this.accentBar.style.animation = "";
        this.scanStatusText.textContent = "CONNECTION FAILED";
        this.scanBtn.textContent = "RETRY";
        this.scanBtn.disabled = false;
        this.scanBtn.style.animation = "";
        this.scanBtn.style.opacity = "1";
        break;
    }
  }

  private onScan(): void {
    const { selectedBoardId } = this.store.get();
    const board = findBoard(selectedBoardId);
    const baudrate = board?.defaultBaudrate ?? 921600;
    this.flashService.connect(baudrate).catch(() => {
      /* error state handled by store subscription */
    });
  }

  private onConfirm(): void {
    const { selectedBoardId } = this.store.get();
    const board = findBoard(selectedBoardId);
    if (!board) return;

    const hasConfig = (board.configFields?.length ?? 0) > 0;
    this.store.set({ screen: hasConfig ? "configure" : "flash" });
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  unmount(): void {
    this.el.remove();
  }

  destroy(): void {
    for (const unsub of this.unsubs) unsub();
    this.topBar.destroy();
    this.boardList.destroy();
    this.footer.destroy();
    this.unmount();
  }
}
