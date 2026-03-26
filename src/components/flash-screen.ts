import { createElement, type Component } from "./component";
import { C } from "../theme/colors";
import type { Store } from "../state/store";
import type { AppState, FlashPhase } from "../types";
import type { FlashService } from "../services/flash-service";
import { findBoard } from "../boards";
import { iconFlash, iconCheck, iconWarn, iconShield } from "../icons/pixel-icons";
import { Terminal } from "./terminal";
import { ProgressBar } from "./progress-bar";
import { StatBars } from "./stat-bars";

const FONT = "'Press Start 2P', monospace";

export class FlashScreen implements Component {
  readonly el: HTMLElement;
  private store: Store<AppState>;
  private flashService: FlashService;
  private unsubs: (() => void)[] = [];
  private terminal: Terminal;
  private progressBar: ProgressBar;
  private statBars: StatBars;

  private topBar: HTMLElement;
  private topIcon: HTMLElement;
  private topLabel: HTMLElement;
  private boardLabel: HTMLElement;
  private pctValue: HTMLElement;
  private pctSign: HTMLElement;

  private flashFooterLeft: HTMLElement;
  private flashFooterRight: HTMLElement;
  private doneFooterLeft: HTMLElement;
  private doneFooterRight: HTMLElement;
  private progressBlocks: HTMLElement[] = [];

  constructor(store: Store<AppState>, flashService: FlashService) {
    this.store = store;
    this.flashService = flashService;

    this.el = createElement("div");
    Object.assign(this.el.style, {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      position: "relative",
      overflow: "hidden",
      fontFamily: FONT,
    });

    // ── top bar ──
    this.topBar = createElement("div");
    Object.assign(this.topBar.style, {
      background: C.yellow,
      padding: "10px 18px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      transition: "background 0.4s",
      flexShrink: "0",
    });

    const topLeft = createElement("div");
    Object.assign(topLeft.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    });

    this.topIcon = createElement("span");
    this.topIcon.innerHTML = iconFlash(16, C.dark);

    this.topLabel = createElement("span");
    Object.assign(this.topLabel.style, {
      fontSize: "6px",
      color: C.dark,
      letterSpacing: "0.25em",
    });
    this.topLabel.textContent = "FLASHING...";

    topLeft.appendChild(this.topIcon);
    topLeft.appendChild(this.topLabel);

    this.boardLabel = createElement("span");
    Object.assign(this.boardLabel.style, {
      fontSize: "5px",
      color: "rgba(0,0,0,0.4)",
      letterSpacing: "0.15em",
    });

    const board = findBoard(store.get().selectedBoardId);
    this.boardLabel.textContent = board
      ? board.name.toUpperCase()
      : "UNKNOWN";

    const pctWrap = createElement("span");
    Object.assign(pctWrap.style, {
      display: "flex",
      alignItems: "baseline",
    });

    this.pctValue = createElement("span");
    Object.assign(this.pctValue.style, {
      fontSize: "10px",
      color: C.dark,
    });
    this.pctValue.textContent = "0";

    this.pctSign = createElement("span");
    Object.assign(this.pctSign.style, {
      fontSize: "6px",
      color: C.dark,
    });
    this.pctSign.textContent = "%";

    pctWrap.appendChild(this.pctValue);
    pctWrap.appendChild(this.pctSign);

    this.topBar.appendChild(topLeft);
    this.topBar.appendChild(this.boardLabel);
    this.topBar.appendChild(pctWrap);

    // ── progress bar ──
    this.progressBar = new ProgressBar(store);

    // ── terminal ──
    this.terminal = new Terminal(store);
    Object.assign(this.terminal.el.style, { margin: "12px 18px 0" });

    // ── footer ──
    const footer = createElement("div");
    Object.assign(footer.style, {
      padding: "10px 18px",
      borderTop: `1px solid ${C.dim}`,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexShrink: "0",
    });

    // footer: flash state
    this.flashFooterLeft = createElement("div");
    Object.assign(this.flashFooterLeft.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
    });
    const warnIcon = createElement("span");
    warnIcon.innerHTML = iconWarn(12, C.textFaint);
    const warnText = createElement("span");
    Object.assign(warnText.style, {
      fontSize: "4px",
      color: C.textFaint,
      letterSpacing: "0.1em",
    });
    warnText.textContent = "DO NOT POWER OFF DEVICE";
    this.flashFooterLeft.appendChild(warnIcon);
    this.flashFooterLeft.appendChild(warnText);

    this.flashFooterRight = createElement("div");
    Object.assign(this.flashFooterRight.style, {
      display: "flex",
      gap: "3px",
      alignItems: "center",
    });
    for (let i = 0; i < 4; i++) {
      const block = createElement("div");
      Object.assign(block.style, {
        width: "8px",
        height: "8px",
        background: C.dim,
      });
      this.progressBlocks.push(block);
      this.flashFooterRight.appendChild(block);
    }

    // footer: done state
    this.doneFooterLeft = createElement("div");
    Object.assign(this.doneFooterLeft.style, {
      display: "none",
      alignItems: "center",
      gap: "8px",
    });
    const shieldIcon = createElement("span");
    shieldIcon.innerHTML = iconShield(24);
    const doneTexts = createElement("div");
    Object.assign(doneTexts.style, {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    });
    const doneTitle = createElement("span");
    Object.assign(doneTitle.style, {
      fontSize: "6px",
      color: C.pink,
      letterSpacing: "0.1em",
    });
    doneTitle.textContent = "HONEYPOT ACTIVE";
    const doneSub = createElement("span");
    Object.assign(doneSub.style, {
      fontSize: "4px",
      color: C.textFaint,
      letterSpacing: "0.05em",
    });
    doneSub.textContent = "FTP TRAFFIC IS BEING LOGGED";
    doneTexts.appendChild(doneTitle);
    doneTexts.appendChild(doneSub);
    this.doneFooterLeft.appendChild(shieldIcon);
    this.doneFooterLeft.appendChild(doneTexts);

    this.doneFooterRight = createElement("div");
    Object.assign(this.doneFooterRight.style, { display: "none" });
    const resetBtn = createElement("button");
    resetBtn.textContent = "RESET";
    Object.assign(resetBtn.style, {
      fontFamily: FONT,
      fontSize: "5px",
      color: C.textFaint,
      background: "transparent",
      border: `1px solid ${C.dim}`,
      padding: "7px 12px",
      cursor: "pointer",
      letterSpacing: "0.1em",
    });
    resetBtn.addEventListener("click", () => this.handleReset());
    this.doneFooterRight.appendChild(resetBtn);

    footer.appendChild(this.flashFooterLeft);
    footer.appendChild(this.flashFooterRight);
    footer.appendChild(this.doneFooterLeft);
    footer.appendChild(this.doneFooterRight);

    // ── stat bars ──
    this.statBars = new StatBars(store);

    // ── assemble ──
    this.el.appendChild(this.topBar);
    this.progressBar.mount(this.el);
    this.el.appendChild(this.terminal.el);
    this.el.appendChild(footer);
    this.statBars.mount(this.el);

    // ── subscriptions ──
    this.unsubs.push(
      store.select(
        (s) => s.flashPhase,
        (phase) => this.onPhase(phase),
      ),
    );
    this.unsubs.push(
      store.select(
        (s) => s.flashProgress,
        (progress) => this.onProgress(progress),
      ),
    );
    this.unsubs.push(
      store.select(
        (s) => s.selectedBoardId,
        (id) => {
          const b = findBoard(id);
          this.boardLabel.textContent = b ? b.name.toUpperCase() : "UNKNOWN";
        },
      ),
    );

    // seed
    const state = store.get();
    this.onPhase(state.flashPhase);
    this.onProgress(state.flashProgress);
  }

  private onPhase(phase: FlashPhase): void {
    const done = phase === "done";

    this.topBar.style.background = done ? C.pink : C.yellow;
    this.topIcon.innerHTML = done
      ? iconCheck(16, C.dark)
      : iconFlash(16, C.dark);
    this.topLabel.textContent = done ? "COMPLETE" : "FLASHING...";

    this.flashFooterLeft.style.display = done ? "none" : "flex";
    this.flashFooterRight.style.display = done ? "none" : "flex";
    this.doneFooterLeft.style.display = done ? "flex" : "none";
    this.doneFooterRight.style.display = done ? "block" : "none";
  }

  private onProgress(progress: number): void {
    this.pctValue.textContent = String(Math.round(progress));

    const filled = Math.min(4, Math.floor(progress / 25));
    for (let i = 0; i < 4; i++) {
      this.progressBlocks[i].style.background =
        i < filled ? C.yellow : C.dim;
    }
  }

  private handleReset(): void {
    this.store.set({
      screen: "select",
      flashPhase: "idle",
      flashProgress: 0,
      logs: [],
      connectionState: "disconnected",
      errorMessage: null,
      flashFileIndex: 0,
      flashFileCount: 0,
    });
    this.flashService.disconnect();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  unmount(): void {
    this.el.remove();
  }

  destroy(): void {
    this.unsubs.forEach((u) => u());
    this.terminal.destroy();
    this.progressBar.destroy();
    this.statBars.destroy();
    this.unmount();
  }
}
