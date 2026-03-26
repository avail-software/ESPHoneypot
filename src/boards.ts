import type { FlashFreqValues, FlashModeValues, FlashSizeValues } from "esptool-js";

export interface FlashImage {
  path: string;
  address: number;
}

export interface ConfigField {
  id: string;
  label: string;
  type: "text" | "password" | "url" | "checkbox" | "select";
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
  /** For type "select": the available options. */
  options?: { value: string; label: string }[];
  /**
   * Only include this field when another field has a specific value.
   * The field is hidden in the UI and excluded from serial config values
   * when the condition is not met.
   */
  visibleWhen?: { field: string; value: string };
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
  /** Fields the user can configure via the first-boot serial wizard. Order matters. */
  configFields?: ConfigField[];
}

const HONEYPOT_CONFIG_FIELDS: ConfigField[] = [
  {
    id: "wifi_ssid",
    label: "WiFi SSID",
    type: "text",
    defaultValue: "",
    placeholder: "Your network name",
    required: true,
  },
  {
    id: "wifi_pass",
    label: "WiFi Password",
    type: "password",
    defaultValue: "",
    placeholder: "Your network password",
    required: true,
  },
  {
    id: "alert_mode",
    label: "Alert Target",
    type: "select",
    defaultValue: "canary",
    options: [
      { value: "canary", label: "Canary Token" },
      { value: "discord", label: "Discord Webhook" },
    ],
  },
  {
    id: "canary_url",
    label: "Canary Token URL",
    type: "url",
    defaultValue: "",
    placeholder: "https://canarytokens.com/...",
    visibleWhen: { field: "alert_mode", value: "canary" },
  },
  {
    id: "discord_webhook",
    label: "Discord Webhook URL",
    type: "url",
    defaultValue: "",
    placeholder: "https://discord.com/api/webhooks/...",
    visibleWhen: { field: "alert_mode", value: "discord" },
  },
  {
    id: "ftp_user",
    label: "FTP Username",
    type: "text",
    defaultValue: "admin",
  },
  {
    id: "ftp_pass",
    label: "FTP Password",
    type: "password",
    defaultValue: "password",
  },
  {
    id: "append_ip",
    label: "Append IP to Canary URL",
    type: "checkbox",
    defaultValue: "n",
  },
  {
    id: "append_char",
    label: "URL Append Delimiter",
    type: "text",
    defaultValue: "?",
  },
];

/** ESP32-S3 / C3 / C6 place the bootloader at 0x0; original ESP32 at 0x1000. */
const S3_IMAGES: FlashImage[] = [
  { path: "/bootloader.bin", address: 0x0 },
  { path: "/partitions.bin", address: 0x8000 },
  { path: "/firmware.bin", address: 0x10000 },
];

const C3_IMAGES: FlashImage[] = [
  { path: "/bootloader.bin", address: 0x0 },
  { path: "/partitions.bin", address: 0x8000 },
  { path: "/firmware.bin", address: 0x10000 },
];

const C6_IMAGES: FlashImage[] = [
  { path: "/bootloader.bin", address: 0x0 },
  { path: "/partitions.bin", address: 0x8000 },
  { path: "/firmware.bin", address: 0x10000 },
];

const ESP32_IMAGES: FlashImage[] = [
  { path: "/bootloader.bin", address: 0x1000 },
  { path: "/partitions.bin", address: 0x8000 },
  { path: "/firmware.bin", address: 0x10000 },
];

/**
 * Add new boards here. The first entry is selected by default.
 * Use "keep" for flashMode / flashFreq / flashSize to preserve
 * whatever the build system baked into the binary headers.
 */
export const BOARDS: BoardConfig[] = [
  // ── ESP32-S3 boards ────────────────────────────────────────────
  {
    id: "heltec-v3",
    name: "Heltec WiFi LoRa 32 V3",
    chip: "ESP32-S3",
    description: "ESP32-S3 + SX1262, 8 MB flash, 0.96″ OLED",
    images: S3_IMAGES,
    flashMode: "keep",
    flashFreq: "keep",
    flashSize: "keep",
    defaultBaudrate: 921600,
    configFields: HONEYPOT_CONFIG_FIELDS,
  },
  {
    id: "esp32-s3-devkitc",
    name: "ESP32-S3-DevKitC-1",
    chip: "ESP32-S3",
    description: "Official Espressif S3 devkit, 8 MB flash, 2 MB PSRAM",
    images: S3_IMAGES,
    flashMode: "keep",
    flashFreq: "keep",
    flashSize: "keep",
    defaultBaudrate: 921600,
    configFields: HONEYPOT_CONFIG_FIELDS,
  },
  {
    id: "xiao-esp32s3",
    name: "Seeed XIAO ESP32-S3",
    chip: "ESP32-S3",
    description: "Ultra-compact 21 × 17.8 mm, 8 MB flash, 8 MB PSRAM",
    images: S3_IMAGES,
    flashMode: "keep",
    flashFreq: "keep",
    flashSize: "keep",
    defaultBaudrate: 921600,
    configFields: HONEYPOT_CONFIG_FIELDS,
  },
  // ── ESP32-C3 boards ────────────────────────────────────────────
  {
    id: "esp32-c3-devkitc",
    name: "ESP32-C3-DevKitC-02",
    chip: "ESP32-C3",
    description: "Official Espressif C3 devkit, RISC-V, 4 MB flash",
    images: C3_IMAGES,
    flashMode: "keep",
    flashFreq: "keep",
    flashSize: "keep",
    defaultBaudrate: 460800,
    configFields: HONEYPOT_CONFIG_FIELDS,
  },
  {
    id: "xiao-esp32c3",
    name: "Seeed XIAO ESP32-C3",
    chip: "ESP32-C3",
    description: "Ultra-compact 21 × 17.8 mm, RISC-V, 4 MB flash",
    images: C3_IMAGES,
    flashMode: "keep",
    flashFreq: "keep",
    flashSize: "keep",
    defaultBaudrate: 460800,
    configFields: HONEYPOT_CONFIG_FIELDS,
  },
  // ── ESP32-C6 boards ────────────────────────────────────────────
  {
    id: "esp32-c6-devkitc",
    name: "ESP32-C6-DevKitC-1",
    chip: "ESP32-C6",
    description: "WiFi 6 + Thread / Zigbee, dual RISC-V, 8 MB flash",
    images: C6_IMAGES,
    flashMode: "keep",
    flashFreq: "keep",
    flashSize: "keep",
    defaultBaudrate: 460800,
    configFields: HONEYPOT_CONFIG_FIELDS,
  },
  {
    id: "xiao-esp32c6",
    name: "Seeed XIAO ESP32-C6",
    chip: "ESP32-C6",
    description: "Compact WiFi 6 + Thread / Zigbee, 4 MB flash",
    images: C6_IMAGES,
    flashMode: "keep",
    flashFreq: "keep",
    flashSize: "keep",
    defaultBaudrate: 460800,
    configFields: HONEYPOT_CONFIG_FIELDS,
  },
  // ── Classic ESP32 boards ───────────────────────────────────────
  {
    id: "lilygo-t-beam",
    name: "LILYGO T-Beam v1.2",
    chip: "ESP32",
    description: "ESP32 + SX1276 LoRa + NEO-M8N GPS, 4 MB flash",
    images: ESP32_IMAGES,
    flashMode: "keep",
    flashFreq: "keep",
    flashSize: "keep",
    defaultBaudrate: 921600,
    configFields: HONEYPOT_CONFIG_FIELDS,
  },
  {
    id: "esp32-devkitc",
    name: "ESP32-DevKitC V4",
    chip: "ESP32",
    description: "Official Espressif classic devkit, dual-core, 4 MB flash",
    images: ESP32_IMAGES,
    flashMode: "keep",
    flashFreq: "keep",
    flashSize: "keep",
    defaultBaudrate: 921600,
    configFields: HONEYPOT_CONFIG_FIELDS,
  },
];

export const findBoard = (id: string): BoardConfig | undefined =>
  BOARDS.find((b) => b.id === id);

export const defaultBoard = (): BoardConfig => BOARDS[0];
