# HONEY//BOOT

HONEY//BOOT is a browser-based flasher for an ESP32 FTP canary. It packages prebuilt firmware, lets an operator configure the device in a Web Serial UI, and then flashes and provisions the board directly from the browser.

The deployed device acts as an FTP honeypot/canary and supports two alerting targets:

- Discord webhooks
- CanaryTokens URLs

The web app handles the full operator flow:

- select a supported ESP32 board
- connect to the board over Web Serial
- enter Wi-Fi and honeypot settings
- flash the firmware images
- reopen the serial port and drive the firmware's first-boot configuration wizard automatically

## Features

- Desktop browser flasher built with Vite and TypeScript
- Uses `esptool-js` and the Web Serial API, so no native desktop installer is required
- Ships with bundled firmware images: `bootloader.bin`, `partitions.bin`, and `firmware.bin`
- Supports Discord webhook or CanaryToken alert delivery
- Configures Wi-Fi credentials, FTP username/password, and optional source-IP appending
- Supports multiple ESP32 board definitions with per-chip flash offsets and baud rates
- Includes a guided UI for board selection, configuration, and flash progress/log output

## How It Works

The app is a static web interface that serves prebuilt ESP32 binaries from the `binaries/` directory. When a user clicks through the UI:

1. The app requests a serial port with the browser Web Serial API.
2. `esptool-js` connects to the selected board and writes the firmware images.
3. After flashing, the board is hard-reset.
4. The app reconnects at `115200` baud and waits for the firmware's first-boot serial setup prompt.
5. The app submits the values entered in the UI in the same order the firmware expects them.

That means the user can both flash and configure the device from the same browser session.

## Supported Configuration

The configuration panel currently exposes these device settings:

- Wi-Fi SSID
- Wi-Fi password
- Alert target mode: CanaryToken or Discord webhook
- CanaryToken URL when CanaryToken mode is selected
- Discord webhook URL when Discord mode is selected
- FTP username
- FTP password
- Optional "append IP to Canary URL" toggle
- Optional URL delimiter used when appending the IP

## Supported Boards

Board definitions are currently included for:

- Heltec WiFi LoRa 32 V3
- ESP32-S3-DevKitC-1
- Seeed XIAO ESP32-S3
- ESP32-C3-DevKitC-02
- Seeed XIAO ESP32-C3
- ESP32-C6-DevKitC-1
- Seeed XIAO ESP32-C6
- LILYGO T-Beam v1.2
- ESP32-DevKitC V4

The app distinguishes between classic ESP32 and newer S3/C3/C6 families so it can flash the bootloader at the correct address.

## Browser Requirements

This project requires a desktop browser with Web Serial support.

- Chrome or Edge on desktop
- A USB-connected supported ESP32 board
- Permission to access the board's serial port

Mobile browsers and browsers without Web Serial support are blocked by the UI.

## Development

### Prerequisites

- Node.js 20+ recommended
- npm
- A Chromium-based desktop browser for local testing

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Firmware Assets

Vite is configured with `publicDir: "binaries"`, so the firmware images in `binaries/` are served from the web root at runtime:

- `/bootloader.bin`
- `/partitions.bin`
- `/firmware.bin`

To update the device payload, replace those binaries with the latest firmware build artifacts while keeping the expected filenames, or update the board image definitions in `src/boards.ts` if the layout changes.

## Project Structure

```text
src/
  boards.ts              Supported board matrix and configuration fields
  serial-config.ts       First-boot serial wizard automation
  services/
    flash-service.ts     Web Serial + esptool-js flashing flow
  components/
    app.ts               Screen orchestration
    select-screen.ts     Board selection and port detection
    configure-screen.ts  Device configuration UI
    flash-screen.ts      Flash progress and serial logs
binaries/
  bootloader.bin
  partitions.bin
  firmware.bin
```

## Operator Flow

1. Open the web app in Chrome or Edge on a desktop machine.
2. Select the ESP32 board model.
3. Click `SCAN PORT` and choose the device.
4. Enter Wi-Fi credentials and alert destination settings.
5. Optionally change baud rate or erase all flash in advanced settings.
6. Click `FLASH`.
7. Wait for the flash and serial configuration phases to complete.

When the process finishes, the device is reset and should be running the configured FTP canary firmware.

## Notes For Maintainers

- The web app does not build firmware; it flashes prebuilt binaries.
- Configuration field order matters because the browser automation sends values in the same order the firmware prompts for them.
- Conditional fields such as CanaryToken URL vs Discord webhook URL are included or omitted based on the selected alert mode.

## Tech Stack

- TypeScript
- Vite
- Web Serial API
- `esptool-js`
- Three.js for the UI viewport/effects
