import "./style.css";
import {
  ESPLoader,
  type FlashOptions,
  type IEspLoaderTerminal,
  type LoaderOptions,
  Transport,
} from "esptool-js";
import { type BoardConfig, BOARDS, defaultBoard } from "./boards";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Could not find #app");

const boardOptions = BOARDS.map(
  (b) => `<option value="${b.id}">${b.name}</option>`,
).join("");

app.innerHTML = `
  <main class="container">
    <h1>HoneyBoot</h1>
    <p class="lead">Flash firmware to your board over Web Serial.</p>

    <section class="panel">
      <div class="row">
        <label for="board">Board</label>
        <select id="board">${boardOptions}</select>
      </div>

      <p id="boardInfo" class="board-info"></p>

      <div class="row">
        <label for="baudrate">Baudrate</label>
        <input id="baudrate" type="number" min="9600" step="1" />
      </div>

      <div class="row checkbox">
        <input id="eraseAll" type="checkbox" />
        <label for="eraseAll">Erase all flash first</label>
      </div>

      <div class="actions">
        <button id="connectBtn" type="button">Connect</button>
        <button id="flashBtn" type="button" disabled>Flash firmware</button>
      </div>
    </section>

    <section class="panel">
      <h2>Log</h2>
      <pre id="log"></pre>
    </section>
  </main>
`;

const $ = <T extends HTMLElement>(sel: string) => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el;
};

const boardSelect = $<HTMLSelectElement>("#board");
const boardInfo = $<HTMLParagraphElement>("#boardInfo");
const baudrateInput = $<HTMLInputElement>("#baudrate");
const eraseAllInput = $<HTMLInputElement>("#eraseAll");
const connectButton = $<HTMLButtonElement>("#connectBtn");
const flashButton = $<HTMLButtonElement>("#flashBtn");
const logOutput = $<HTMLPreElement>("#log");

let transport: Transport | null = null;
let loader: ESPLoader | null = null;
let connected = false;
let activeBoard: BoardConfig = defaultBoard();

const showBoardInfo = (board: BoardConfig) => {
  boardInfo.textContent = `${board.chip} · ${board.description}`;
  baudrateInput.value = String(board.defaultBaudrate);
};

showBoardInfo(activeBoard);

boardSelect.addEventListener("change", () => {
  const match = BOARDS.find((b) => b.id === boardSelect.value);
  if (match) {
    activeBoard = match;
    showBoardInfo(match);
  }
});

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

const setBusy = (busy: boolean) => {
  connectButton.disabled = busy;
  flashButton.disabled = busy || !connected;
  boardSelect.disabled = busy || connected;
};

const fetchBinary = async (path: string): Promise<Uint8Array> => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return new Uint8Array(await res.arrayBuffer());
};

const toErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const connect = async () => {
  if (!("serial" in navigator)) {
    throw new Error("Web Serial API not supported. Use Chrome or Edge.");
  }

  if (transport) {
    await transport.disconnect();
    transport = null;
    loader = null;
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
          `WARNING: detected ${chip}, but selected board expects ${activeBoard.chip}. ` +
            `Flash addresses may be wrong — double-check your board selection.`,
        );
      }
    } catch (err) {
      await transport.disconnect();
      transport = null;
      loader = null;
      throw err;
    }
  } finally {
    setBusy(false);
  }
};

const flash = async () => {
  if (!loader) {
    appendLog("Not connected.");
    return;
  }

  setBusy(true);
  appendLog(`Flashing for ${activeBoard.name}…`);

  try {
    const binaries = await Promise.all(
      activeBoard.images.map(async (img) => ({
        data: await fetchBinary(img.path),
        address: img.address,
      })),
    );

    for (const bin of binaries) {
      appendLog(
        `  ${binaries.indexOf(bin) + 1}/${binaries.length}  ` +
          `0x${bin.address.toString(16).padStart(5, "0")}  ${(bin.data.length / 1024).toFixed(1)} KB`,
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
    await loader.after("hard_reset");
    appendLog("Device reset — done.");
  } finally {
    setBusy(false);
  }
};

connectButton.addEventListener("click", () => {
  connect().catch((e: unknown) => appendLog(`Connect failed: ${toErrorMessage(e)}`));
});

flashButton.addEventListener("click", () => {
  flash().catch((e: unknown) => appendLog(`Flash failed: ${toErrorMessage(e)}`));
});
