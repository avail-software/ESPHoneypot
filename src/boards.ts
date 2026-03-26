import type { FlashFreqValues, FlashModeValues, FlashSizeValues } from "esptool-js";

export interface FlashImage {
  path: string;
  address: number;
}

export interface BoardConfig {
  id: string;
  name: string;
  chip: string;
  description: string;
  images: FlashImage[];
  flashMode: FlashModeValues;
  flashFreq: FlashFreqValues;
  flashSize: FlashSizeValues;
  defaultBaudrate: number;
}

/**
 * Add new boards here. The first entry is selected by default.
 * Use "keep" for flashMode / flashFreq / flashSize to preserve
 * whatever the build system baked into the binary headers.
 */
export const BOARDS: BoardConfig[] = [
  {
    id: "heltec-v3",
    name: "Heltec WiFi LoRa 32 V3",
    chip: "ESP32-S3",
    description: "ESP32-S3 + SX1262, 8 MB flash, 0.96″ OLED",
    images: [
      { path: "/bootloader.bin", address: 0x0 },
      { path: "/partitions.bin", address: 0x8000 },
      { path: "/firmware.bin", address: 0x10000 },
    ],
    flashMode: "keep",
    flashFreq: "keep",
    flashSize: "keep",
    defaultBaudrate: 921600,
  },
];

export const findBoard = (id: string): BoardConfig | undefined =>
  BOARDS.find((b) => b.id === id);

export const defaultBoard = (): BoardConfig => BOARDS[0];
