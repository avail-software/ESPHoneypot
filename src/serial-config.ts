/**
 * Automates the firmware's first-boot serial configuration wizard.
 *
 * After flashing and hard-reset the firmware prints:
 *   "Press ENTER within 15 seconds to configure settings via Serial."
 * followed by sequential prompts that each end with "]: ".
 *
 * This module reopens the serial port, detects the prompts, and sends
 * the user-supplied values in order.
 */

/** Minimal port interface — matches what Web Serial provides. */
export interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream<Uint8Array>;
}

export interface ConfigureOptions {
  port: SerialPortLike;
  /** Values in the exact order the firmware prompts for them. */
  values: string[];
  log: (msg: string) => void;
  /** Overall timeout in ms (default 45 000). */
  timeoutMs?: number;
}

const PROMPT_END = "]: ";
const ENTER_PATTERN = "ENTER";
const SAVED_PATTERN = "saved";

export async function configureDevice(opts: ConfigureOptions): Promise<void> {
  const { port, values, log, timeoutMs = 45_000 } = opts;

  log("Opening port at 115 200 baud…");
  await port.open({ baudRate: 115200 });
  log("Port open — listening for first-boot prompt…");

  const reader = port.readable.getReader();
  const writer = port.writable.getWriter();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  let buffer = "";
  let fieldIndex = 0;
  let inConfigMode = false;

  const deadline = setTimeout(() => reader.cancel(), timeoutMs);

  const send = async (text: string) => {
    await writer.write(encoder.encode(text));
  };

  /** Log and remove only complete lines (ending with \n) from the buffer. */
  const flushLines = () => {
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).replace(/\r$/, "").trim();
      if (line) log(`[device] ${line}`);
      buffer = buffer.slice(idx + 1);
    }
  };

  /** Log whatever is left in the buffer (incomplete line) and clear it. */
  const flushRemainder = () => {
    const text = buffer.trim();
    if (text) log(`[device] ${text}`);
    buffer = "";
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // ── Step 1: detect first-boot prompt and send ENTER ──
      // Check BEFORE flushing lines so "Press ENTER…\n" isn't lost.
      if (!inConfigMode && buffer.includes(ENTER_PATTERN)) {
        flushLines();
        flushRemainder();
        log("Entering configuration mode…");
        await send("\n");
        inConfigMode = true;
        continue;
      }

      // ── Step 2: respond to each config prompt (ends with "]: ") ──
      if (inConfigMode && fieldIndex < values.length && buffer.includes(PROMPT_END)) {
        flushLines();
        flushRemainder();
        await send(values[fieldIndex] + "\n");
        fieldIndex++;
        continue;
      }

      // ── Step 3: all values sent — wait for "saved" confirmation ──
      if (inConfigMode && fieldIndex >= values.length && buffer.toLowerCase().includes(SAVED_PATTERN)) {
        flushLines();
        flushRemainder();
        log("Configuration saved to device.");
        break;
      }

      // No pattern matched yet — flush complete lines for log output.
      flushLines();
    }
  } finally {
    clearTimeout(deadline);
    reader.releaseLock();
    writer.releaseLock();
    await port.close();
  }

  if (!inConfigMode) {
    log(
      "Device did not enter first-boot mode. " +
        'It may already be configured — enable "Erase all flash first" and re-flash.',
    );
  } else if (fieldIndex < values.length) {
    log(`Warning: only ${fieldIndex}/${values.length} fields were configured.`);
  }
}
