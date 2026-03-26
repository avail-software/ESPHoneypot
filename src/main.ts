import "./style.css";
import {
  ESPLoader,
  type FlashFreqValues,
  type FlashModeValues,
  type FlashOptions,
  type FlashSizeValues,
  type IEspLoaderTerminal,
  type LoaderOptions,
  Transport,
} from "esptool-js";

// ESP32 and ESP32-S2 use 0x1000; all newer variants (S3, C2, C3, C6, H2, …) use 0x0.
const bootloaderAddress = (chip: string): number =>
  /ESP32-S2\b/.test(chip) || (chip.includes("ESP32") && !/ESP32-[A-Z]/.test(chip))
    ? 0x1000
    : 0x0;

const buildFlashMap = (chip: string) => [
  { path: "/bootloader.bin", address: bootloaderAddress(chip) },
  { path: "/partitions.bin", address: 0x8000 },
  { path: "/firmware.bin", address: 0x10000 },
];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Could not find #app");
}

app.innerHTML = `
  <main class="container">
    <h1>ESP32 Web Flasher</h1>
    <p class="lead">Flash firmware over Web Serial directly from your browser.</p>

    <section class="panel">
      <div class="row">
        <label for="baudrate">Baudrate</label>
        <input id="baudrate" type="number" min="9600" step="1" value="115200" />
      </div>

      <div class="row checkbox">
        <input id="eraseAll" type="checkbox" />
        <label for="eraseAll">Erase all flash first</label>
      </div>

      <div class="actions">
        <button id="connectBtn" type="button">Connect</button>
        <button id="flashBtn" type="button" disabled>Flash binaries</button>
      </div>
    </section>

    <section class="panel">
      <h2>Status</h2>
      <pre id="log"></pre>
    </section>
  </main>
`;

const connectButton = document.querySelector<HTMLButtonElement>("#connectBtn");
const flashButton = document.querySelector<HTMLButtonElement>("#flashBtn");
const baudrateInput = document.querySelector<HTMLInputElement>("#baudrate");
const eraseAllInput = document.querySelector<HTMLInputElement>("#eraseAll");
const logOutput = document.querySelector<HTMLPreElement>("#log");

if (!connectButton || !flashButton || !baudrateInput || !eraseAllInput || !logOutput) {
  throw new Error("Missing required UI elements");
}

let transport: Transport | null = null;
let loader: ESPLoader | null = null;
let connected = false;
let detectedChip = "";

const appendLog = (message: string): void => {
  logOutput.textContent += `${message}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
};

const terminal: IEspLoaderTerminal = {
  clean() {
    logOutput.textContent = "";
  },
  writeLine(data: string) {
    appendLog(data);
  },
  write(data: string) {
    appendLog(data);
  },
};

const setBusy = (busy: boolean) => {
  connectButton.disabled = busy;
  flashButton.disabled = busy || !connected;
};

const fetchBinary = async (path: string): Promise<Uint8Array> => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load binary: ${path}`);
  }
  return new Uint8Array(await response.arrayBuffer());
};

const ensureWebSerial = () => {
  if (!("serial" in navigator)) {
    throw new Error("Web Serial API not available. Use Chrome or Edge.");
  }
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const connect = async () => {
  ensureWebSerial();

  // Disconnect any existing transport before requesting a new port.
  if (transport) {
    await transport.disconnect();
    transport = null;
    loader = null;
    connected = false;
  }

  setBusy(true);
  appendLog("Requesting serial port...");

  try {
    // Transport['device'] is SerialPort (from w3c-web-serial via esptool-js).
    const port = await (
      navigator as Navigator & {
        serial: { requestPort(): Promise<Transport["device"]> };
      }
    ).serial.requestPort();

    transport = new Transport(port, true);

    const baudrate = Number(baudrateInput.value) || 115200;
    const options: LoaderOptions = {
      transport,
      baudrate,
      terminal,
      debugLogging: false,
    };

    loader = new ESPLoader(options);
    try {
      const chipName = await loader.main();
      connected = true;
      detectedChip = chipName;
      appendLog(`Connected to ${chipName}`);
      appendLog(`Bootloader address: 0x${bootloaderAddress(chipName).toString(16)}`);
    } catch (err) {
      // loader.main() opens the port; disconnect so it can be re-requested.
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
    appendLog("Not connected yet.");
    return;
  }

  setBusy(true);
  appendLog("Preparing binaries...");

  try {
    const flashMap = buildFlashMap(detectedChip);
    const binaries = await Promise.all(
      flashMap.map(async (entry) => ({
        data: await fetchBinary(entry.path),
        address: entry.address,
      })),
    );

    const flashOptions: FlashOptions = {
      fileArray: binaries,
      flashMode: "dio" as FlashModeValues,
      flashFreq: "40m" as FlashFreqValues,
      flashSize: "4MB" as FlashSizeValues,
      eraseAll: eraseAllInput.checked,
      compress: true,
      reportProgress: (fileIndex, written, total) => {
        const percent = total > 0 ? ((written / total) * 100).toFixed(1) : "0.0";
        appendLog(`File ${fileIndex + 1}/${binaries.length}: ${percent}%`);
      },
    };

    appendLog("Flashing...");
    await loader.writeFlash(flashOptions);
    appendLog("Flash complete.");
    await loader.after("hard_reset");
    appendLog("Device reset.");
  } finally {
    setBusy(false);
  }
};

connectButton.addEventListener("click", () => {
  connect().catch((error: unknown) => {
    appendLog(`Connect failed: ${toErrorMessage(error)}`);
  });
});

flashButton.addEventListener("click", () => {
  flash().catch((error: unknown) => {
    appendLog(`Flash failed: ${toErrorMessage(error)}`);
  });
});
