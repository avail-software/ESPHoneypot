export type Screen = "boot" | "select" | "configure" | "flash";

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type FlashPhase =
  | "idle"
  | "flashing"
  | "configuring"
  | "done"
  | "error";

export interface LogEntry {
  category: string;
  text: string;
}

export interface AppState {
  screen: Screen;
  confirming: boolean;
  selectedBoardId: string;
  connectionState: ConnectionState;
  detectedChip: string | null;
  flashPhase: FlashPhase;
  flashProgress: number;
  flashFileIndex: number;
  flashFileCount: number;
  logs: readonly LogEntry[];
  errorMessage: string | null;
}

export const INITIAL_STATE: AppState = {
  screen: "boot",
  confirming: false,
  selectedBoardId: "heltec-v3",
  connectionState: "disconnected",
  detectedChip: null,
  flashPhase: "idle",
  flashProgress: 0,
  flashFileIndex: 0,
  flashFileCount: 0,
  logs: [],
  errorMessage: null,
};
