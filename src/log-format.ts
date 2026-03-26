import type { LogEntry } from "./types";

export interface LogPattern {
  match: RegExp;
  category: string;
}

/**
 * Configurable lookup table that maps raw esptool / serial messages
 * to styled terminal categories.  Edit this array to change how log
 * lines are categorised in the UI.
 */
export const LOG_PATTERNS: LogPattern[] = [
  { match: /^Requesting serial/i, category: "CONN" },
  { match: /^Connected/i, category: "CONN" },
  { match: /^Connecting/i, category: "CONN" },
  { match: /serial port/i, category: "CONN" },
  { match: /^Chip is/i, category: "CONN" },
  { match: /^Detected/i, category: "CONN" },
  { match: /stub/i, category: "CONN" },

  { match: /erase|erasing/i, category: "ERASE" },
  { match: /compressed/i, category: "ERASE" },

  { match: /^Flash/i, category: "WRITE" },
  { match: /^File \d/i, category: "WRITE" },
  { match: /^Writing/i, category: "WRITE" },
  { match: /wrote/i, category: "WRITE" },
  { match: /0x[0-9a-f]/i, category: "WRITE" },

  { match: /verify|hash/i, category: "VERIFY" },

  { match: /reset|reboot/i, category: "SYS" },
  { match: /preparing/i, category: "SYS" },
  { match: /reopening/i, category: "SYS" },
  { match: /done/i, category: "SYS" },

  { match: /\[device\]/i, category: "CONFIG" },
  { match: /config/i, category: "CONFIG" },
  { match: /entering/i, category: "CONFIG" },
  { match: /saved/i, category: "CONFIG" },

  { match: /⚠|warn/i, category: "WARN" },
  { match: /error|fail/i, category: "ERR" },
];

const FALLBACK_CATEGORY = "SYS";

export function formatLog(raw: string): LogEntry {
  const trimmed = raw.trim();
  for (const p of LOG_PATTERNS) {
    if (p.match.test(trimmed)) {
      return { category: p.category, text: trimmed };
    }
  }
  return { category: FALLBACK_CATEGORY, text: trimmed };
}
