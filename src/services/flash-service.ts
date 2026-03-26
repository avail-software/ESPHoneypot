import {
  ESPLoader,
  type FlashOptions,
  type IEspLoaderTerminal,
  type LoaderOptions,
  Transport,
} from "esptool-js";
import type { BoardConfig, ConfigField } from "../boards";
import { configureDevice, type SerialPortLike } from "../serial-config";
import { formatLog } from "../log-format";
import type { AppState } from "../types";
import type { Store } from "../state/store";

export class FlashService {
  private transport: Transport | null = null;
  private loader: ESPLoader | null = null;
  private port: SerialPortLike | null = null;
  private store: Store<AppState>;

  constructor(store: Store<AppState>) {
    this.store = store;
  }

  get isConnected(): boolean {
    return this.store.get().connectionState === "connected";
  }

  private log(msg: string): void {
    const entry = formatLog(msg);
    const { logs } = this.store.get();
    this.store.set({ logs: [...logs, entry] });
  }

  private terminal: IEspLoaderTerminal = {
    clean: () => {
      this.store.set({ logs: [] });
    },
    writeLine: (data: string) => this.log(data),
    write: (data: string) => this.log(data),
  };

  async connect(baudrate: number): Promise<void> {
    if (!("serial" in navigator)) {
      throw new Error("Web Serial API not supported. Use Chrome or Edge.");
    }

    if (this.transport) {
      await this.transport.disconnect();
      this.transport = null;
      this.loader = null;
      this.port = null;
    }

    this.store.set({ connectionState: "connecting" });
    this.log("Requesting serial port…");

    try {
      const port = await (
        navigator as Navigator & {
          serial: { requestPort(): Promise<Transport["device"]> };
        }
      ).serial.requestPort();

      this.port = port as unknown as SerialPortLike;
      this.transport = new Transport(port, true);

      const options: LoaderOptions = {
        transport: this.transport,
        baudrate,
        terminal: this.terminal,
        debugLogging: false,
      };

      this.loader = new ESPLoader(options);

      try {
        const chip = await this.loader.main();
        this.store.set({
          connectionState: "connected",
          detectedChip: chip,
        });
        this.log(`Connected — ${chip}`);
        return;
      } catch (err) {
        await this.transport.disconnect();
        this.transport = null;
        this.loader = null;
        this.port = null;
        throw err;
      }
    } catch (err) {
      this.store.set({
        connectionState: "error",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async flashAndConfigure(
    board: BoardConfig,
    configValues: string[],
    options: { baudrate: number; eraseAll: boolean },
  ): Promise<void> {
    if (!this.loader || !this.port) {
      await this.connect(options.baudrate);
    }

    if (!this.loader || !this.port) {
      throw new Error("Failed to connect.");
    }

    const { detectedChip } = this.store.get();
    if (detectedChip && !detectedChip.includes(board.chip)) {
      this.log(
        `⚠ Detected ${detectedChip}, but selected board expects ${board.chip}.`,
      );
    }

    this.store.set({
      screen: "flash",
      flashPhase: "flashing",
      flashProgress: 0,
      flashFileIndex: 0,
      flashFileCount: board.images.length,
    });

    this.log(`Flashing for ${board.name}…`);

    try {
      const binaries = await Promise.all(
        board.images.map(async (img) => {
          const res = await fetch(img.path);
          if (!res.ok) throw new Error(`Failed to fetch ${img.path}`);
          return {
            data: new Uint8Array(await res.arrayBuffer()),
            address: img.address,
          };
        }),
      );

      for (const [i, bin] of binaries.entries()) {
        this.log(
          `  ${i + 1}/${binaries.length}  ` +
            `0x${bin.address.toString(16).padStart(5, "0")}  ` +
            `${(bin.data.length / 1024).toFixed(1)} KB`,
        );
      }

      const flashOptions: FlashOptions = {
        fileArray: binaries,
        flashMode: board.flashMode,
        flashFreq: board.flashFreq,
        flashSize: board.flashSize,
        eraseAll: options.eraseAll,
        compress: true,
        reportProgress: (fileIndex: number, written: number, total: number) => {
          const filePct = total > 0 ? (written / total) * 100 : 0;
          const overallPct =
            ((fileIndex + filePct / 100) / binaries.length) * 100;
          this.store.set({
            flashProgress: Math.round(overallPct),
            flashFileIndex: fileIndex,
          });
          const pct = total > 0 ? ((written / total) * 100).toFixed(1) : "0.0";
          this.log(`File ${fileIndex + 1}/${binaries.length}: ${pct}%`);
        },
      };

      await this.loader.writeFlash(flashOptions);
      this.log("Flash complete.");

      const fields = board.configFields ?? [];
      const shouldConfigure = fields.length > 0 && configValues.length > 0;

      if (!shouldConfigure) {
        await this.loader.after("hard_reset");
        this.log("Device reset.");
        this.store.set({ flashPhase: "done", flashProgress: 100 });
        return;
      }

      this.store.set({ flashPhase: "configuring" });
      this.log("Preparing for configuration…");

      this.log("Resetting board into firmware…");
      await this.loader.after("hard_reset");

      const port = this.port;
      try {
        await this.transport!.disconnect();
      } catch {
        /* transport may already be torn down after hard_reset */
      }
      this.transport = null;
      this.loader = null;
      this.port = null;
      this.store.set({ connectionState: "disconnected" });

      try {
        await port!.close();
      } catch {
        /* port may already be closed by transport */
      }

      this.log("Waiting for board to boot…");
      await new Promise((r) => setTimeout(r, 5000));

      this.log("Reopening serial port…");
      await configureDevice({
        port: port!,
        values: configValues,
        log: (msg: string) => this.log(msg),
      });

      this.log("Done — device is configured and running.");
      this.store.set({ flashPhase: "done", flashProgress: 100 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.store.set({ flashPhase: "error", errorMessage: msg });
      this.log(`Error: ${msg}`);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.disconnect();
      } catch {
        /* port may already be closed */
      }
    }
    this.transport = null;
    this.loader = null;
    this.port = null;
    this.store.set({
      connectionState: "disconnected",
      detectedChip: null,
    });
  }

  collectConfigValues(fields: ConfigField[]): string[] {
    const values: string[] = [];
    const fieldValues = new Map<string, string>();

    for (const f of fields) {
      const el = document.querySelector<HTMLInputElement>(`#cfg_${f.id}`);
      const val = el
        ? f.type === "checkbox"
          ? el.checked ? "y" : "n"
          : el.value || f.defaultValue
        : f.defaultValue;
      fieldValues.set(f.id, val);
    }

    for (const f of fields) {
      if (f.visibleWhen) {
        const controlVal = fieldValues.get(f.visibleWhen.field) ?? "";
        if (controlVal !== f.visibleWhen.value) continue;
      }
      values.push(fieldValues.get(f.id) ?? f.defaultValue);
    }

    return values;
  }
}
