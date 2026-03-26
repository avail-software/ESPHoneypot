import type { Store } from "../state/store";
import type { AppState, Screen } from "../types";
import type { FlashService } from "../services/flash-service";

import { BootScreen } from "./boot-screen";
import { DesktopGate, checkDesktopRequired } from "./desktop-gate";
import { SplitLayout } from "./split-layout";
import { Viewport3D } from "./viewport-3d";
import { SelectScreen } from "./select-screen";
import { ConfigureScreen } from "./configure-screen";
import { FlashScreen } from "./flash-screen";
import { effects } from "./effects";
import type { Component } from "./component";

export class App {
  private root: HTMLElement;
  private store: Store<AppState>;
  private flashService: FlashService;
  private unsub: (() => void) | null = null;

  private gate: DesktopGate | null = null;
  private bootScreen: BootScreen | null = null;
  private splitLayout: SplitLayout | null = null;
  private viewport: Viewport3D | null = null;
  private currentScreen: Component | null = null;
  private currentScreenId: Screen | null = null;

  constructor(root: HTMLElement, store: Store<AppState>, flashService: FlashService) {
    this.root = root;
    this.store = store;
    this.flashService = flashService;
  }

  start(): void {
    if (checkDesktopRequired()) {
      this.gate = new DesktopGate();
      this.gate.mount(this.root);
      return;
    }

    this.unsub = this.store.select(
      (s) => s.screen,
      (next) => this.onScreenChange(next),
    );

    this.onScreenChange(this.store.get().screen);
  }

  private onScreenChange(screen: Screen): void {
    if (screen === "boot") {
      this.showBoot();
    } else {
      this.ensureSplitLayout();
      this.swapContentScreen(screen);
    }
  }

  private showBoot(): void {
    this.teardownSplitLayout();

    if (!this.bootScreen) {
      this.bootScreen = new BootScreen(this.store);
      this.bootScreen.mount(this.root);
    }
  }

  private ensureSplitLayout(): void {
    if (this.bootScreen) {
      this.bootScreen.destroy();
      this.bootScreen = null;
    }

    if (!this.splitLayout) {
      this.splitLayout = new SplitLayout();
      this.splitLayout.mount(this.root);

      this.viewport = new Viewport3D(this.store);
      this.viewport.mount(this.splitLayout.leftPanel);

      effects.mount();
    }
  }

  private swapContentScreen(screen: Screen): void {
    if (this.currentScreenId === screen) return;

    if (this.currentScreen) {
      this.currentScreen.destroy();
      this.currentScreen = null;
    }

    this.currentScreenId = screen;

    switch (screen) {
      case "select":
        this.currentScreen = new SelectScreen(this.store, this.flashService);
        break;
      case "configure":
        this.currentScreen = new ConfigureScreen(this.store, this.flashService);
        break;
      case "flash":
        this.currentScreen = new FlashScreen(this.store, this.flashService);
        break;
      default:
        return;
    }

    if (this.currentScreen && this.splitLayout) {
      this.currentScreen.mount(this.splitLayout.rightPanel);
    }
  }

  private teardownSplitLayout(): void {
    if (this.currentScreen) {
      this.currentScreen.destroy();
      this.currentScreen = null;
      this.currentScreenId = null;
    }
    if (this.viewport) {
      this.viewport.destroy();
      this.viewport = null;
    }
    if (this.splitLayout) {
      this.splitLayout.destroy();
      this.splitLayout = null;
    }
    effects.destroy();
  }

  destroy(): void {
    this.unsub?.();
    this.teardownSplitLayout();
    if (this.bootScreen) {
      this.bootScreen.destroy();
      this.bootScreen = null;
    }
    if (this.gate) {
      this.gate.destroy();
      this.gate = null;
    }
  }
}
