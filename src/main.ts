import "./style.css";
import {
  ESPLoader,
  type FlashOptions,
  type IEspLoaderTerminal,
  type LoaderOptions,
  Transport,
} from "esptool-js";
import { type BoardConfig, type ConfigField, BOARDS, defaultBoard } from "./boards";
import { configureDevice, type SerialPortLike } from "./serial-config";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Could not find #app");

const boardOptions = BOARDS.map(
  (b) => `<option value="${b.id}">${b.name}</option>`,
).join("");

app.innerHTML = `
  <main class="container">
    <h1>HoneyBoot</h1>
    <p class="lead">Flash &amp; configure your honeypot from the browser.</p>

    <section class="panel" id="boardPanel">
      <div class="row">
        <label for="board">Board</label>
        <select id="board">${boardOptions}</select>
      </div>
      <p id="boardInfo" class="board-info"></p>
    </section>

    <section class="panel" id="configPanel">
      <h2>Honeypot Settings</h2>
      <p class="hint">Sent to the device automatically after flashing.</p>
      <div id="configFields"></div>
    </section>

    <section class="panel" id="flashPanel">
      <div class="row">
        <label for="baudrate">Flash Baudrate</label>
        <input id="baudrate" type="number" min="9600" step="1" />
      </div>

      <div class="row checkbox">
        <input id="eraseAll" type="checkbox" checked />
        <label for="eraseAll">Erase all flash first (required for config)</label>
      </div>

      <div class="actions">
        <button id="connectBtn" type="button">Connect</button>
        <button id="flashBtn" type="button" disabled>Flash &amp; Configure</button>
      </div>
    </section>

    <section class="panel">
      <h2>Log</h2>
      <pre id="log"></pre>
    </section>
  </main>
`;

// ── DOM refs ──────────────────────────────────────────────────────────

const $ = <T extends HTMLElement>(sel: string) => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el;
};

const boardSelect = $<HTMLSelectElement>("#board");
const boardInfo = $<HTMLParagraphElement>("#boardInfo");
const configFieldsContainer = $<HTMLDivElement>("#configFields");
const baudrateInput = $<HTMLInputElement>("#baudrate");
const eraseAllInput = $<HTMLInputElement>("#eraseAll");
const connectButton = $<HTMLButtonElement>("#connectBtn");
const flashButton = $<HTMLButtonElement>("#flashBtn");
const logOutput = $<HTMLPreElement>("#log");

// ── State ─────────────────────────────────────────────────────────────

let transport: Transport | null = null;
let loader: ESPLoader | null = null;
let serialPort: SerialPortLike | null = null;
let connected = false;
let activeBoard: BoardConfig = defaultBoard();

// ── Board + config form ───────────────────────────────────────────────

const renderConfigFields = (fields: ConfigField[]) => {
  configFieldsContainer.innerHTML = fields
    .map((f) => {
      if (f.type === "checkbox") {
        return `
          <div class="row checkbox">
            <input id="cfg_${f.id}" type="checkbox" ${f.defaultValue === "y" ? "checked" : ""} />
            <label for="cfg_${f.id}">${f.label}</label>
          </div>`;
      }
      return `
        <div class="row">
          <label for="cfg_${f.id}">${f.label}${f.required ? " *" : ""}</label>
          <input id="cfg_${f.id}"
                 type="${f.type === "url" ? "url" : f.type}"
                 value="${f.defaultValue}"
                 placeholder="${f.placeholder ?? ""}" />
        </div>`;
    })
    .join("");
};

/** Read the form values in field-definition order, ready for the serial wizard. */
const collectConfigValues = (fields: ConfigField[]): string[] =>
  fields.map((f) => {
    const el = document.querySelector<HTMLInputElement>(`#cfg_${f.id}`);
    if (!el) return f.defaultValue;
    if (f.type === "checkbox") return el.checked ? "y" : "n";
    return el.value || f.defaultValue;
  });

const hasConfigInput = (fields: ConfigField[]): boolean =>
  fields.some((f) => {
    const el = document.querySelector<HTMLInputElement>(`#cfg_${f.id}`);
    if (!el) return false;
    if (f.type === "checkbox") return true;
    return el.value.length > 0;
  });

const showBoardInfo = (board: BoardConfig) => {
  boardInfo.textContent = `${board.chip} · ${board.description}`;
  baudrateInput.value = String(board.defaultBaudrate);
  renderConfigFields(board.configFields ?? []);
};

showBoardInfo(activeBoard);

boardSelect.addEventListener("change", () => {
  const match = BOARDS.find((b) => b.id === boardSelect.value);
  if (match) {
    activeBoard = match;
    showBoardInfo(match);
  }
});

// ── Logging ───────────────────────────────────────────────────────────

const appendLog = (msg: string): void => {
  logOutput.textContent += `${msg}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
};

const terminal: IEspLoaderTerminal = {
  clean() {
    logOutput.textContent = "";
  },
  writeLine(data) {
    appendLog(data);
  },
  write(data) {
    appendLog(data);
  },
};

// ── UI helpers ────────────────────────────────────────────────────────

const setBusy = (busy: boolean) => {
  connectButton.disabled = busy;
  flashButton.disabled = busy || !connected;
  boardSelect.disabled = busy || connected;
};

const toErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const fetchBinary = async (path: string): Promise<Uint8Array> => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return new Uint8Array(await res.arrayBuffer());
};

// ── Connect ───────────────────────────────────────────────────────────

const connect = async () => {
  if (!("serial" in navigator)) {
    throw new Error("Web Serial API not supported. Use Chrome or Edge.");
  }

  if (transport) {
    await transport.disconnect();
    transport = null;
    loader = null;
    serialPort = null;
    connected = false;
  }

  setBusy(true);
  appendLog("Requesting serial port…");

  try {
    const port = await (
      navigator as Navigator & {
        serial: { requestPort(): Promise<Transport["device"]> };
      }
    ).serial.requestPort();

    serialPort = port as unknown as SerialPortLike;
    transport = new Transport(port, true);

    const options: LoaderOptions = {
      transport,
      baudrate: Number(baudrateInput.value) || activeBoard.defaultBaudrate,
      terminal,
      debugLogging: false,
    };

    loader = new ESPLoader(options);

    try {
      const chip = await loader.main();
      connected = true;
      appendLog(`Connected — ${chip}`);

      if (!chip.includes(activeBoard.chip)) {
        appendLog(
          `⚠ Detected ${chip}, but selected board expects ${activeBoard.chip}. ` +
            `Check your board selection.`,
        );
      }
    } catch (err) {
      await transport.disconnect();
      transport = null;
      loader = null;
      serialPort = null;
      throw err;
    }
  } finally {
    setBusy(false);
  }
};

// ── Flash + Configure ─────────────────────────────────────────────────

const flash = async () => {
  if (!loader || !serialPort) {
    appendLog("Not connected.");
    return;
  }

  const fields = activeBoard.configFields ?? [];
  const shouldConfigure = fields.length > 0 && hasConfigInput(fields);

  if (shouldConfigure && !eraseAllInput.checked) {
    eraseAllInput.checked = true;
    appendLog('Enabled "Erase all flash" — required for first-boot configuration.');
  }

  setBusy(true);
  appendLog(`Flashing for ${activeBoard.name}…`);

  try {
    // ── Flash ──

    const binaries = await Promise.all(
      activeBoard.images.map(async (img) => ({
        data: await fetchBinary(img.path),
        address: img.address,
      })),
    );

    for (const [i, bin] of binaries.entries()) {
      appendLog(
        `  ${i + 1}/${binaries.length}  ` +
          `0x${bin.address.toString(16).padStart(5, "0")}  ` +
          `${(bin.data.length / 1024).toFixed(1)} KB`,
      );
    }

    const flashOptions: FlashOptions = {
      fileArray: binaries,
      flashMode: activeBoard.flashMode,
      flashFreq: activeBoard.flashFreq,
      flashSize: activeBoard.flashSize,
      eraseAll: eraseAllInput.checked,
      compress: true,
      reportProgress: (fileIndex, written, total) => {
        const pct = total > 0 ? ((written / total) * 100).toFixed(1) : "0.0";
        appendLog(`File ${fileIndex + 1}/${binaries.length}: ${pct}%`);
      },
    };

    await loader.writeFlash(flashOptions);
    appendLog("Flash complete.");

    if (!shouldConfigure) {
      await loader.after("hard_reset");
      appendLog("Device reset.");
      appendLog("No configuration values provided — skipping serial setup.");
      return;
    }

    // ── Configure ──
    // Disconnect the flasher transport (closes the port) then reopen it
    // at the firmware's baud rate. Reopening the port toggles DTR which
    // triggers the board's auto-reset circuit — no manual RST needed.

    appendLog("Preparing for configuration…");
    const port = serialPort;
    await transport!.disconnect();
    transport = null;
    loader = null;
    serialPort = null;
    connected = false;

    appendLog("Reopening serial port (this resets the board)…");
    const values = collectConfigValues(fields);

    await configureDevice({ port, values, log: appendLog });

    appendLog("Done — device is configured and running.");
  } finally {
    setBusy(false);
  }
};

// ── Event listeners ───────────────────────────────────────────────────

connectButton.addEventListener("click", () => {
  connect().catch((e: unknown) => appendLog(`Connect failed: ${toErrorMessage(e)}`));
});

flashButton.addEventListener("click", () => {
  flash().catch((e: unknown) => appendLog(`Flash failed: ${toErrorMessage(e)}`));
});
