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
    configFields: [
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
    ],
  },
];

export const findBoard = (id: string): BoardConfig | undefined =>
  BOARDS.find((b) => b.id === id);

export const defaultBoard = (): BoardConfig => BOARDS[0];
