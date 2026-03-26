import { C } from "../theme/colors";

const px = 'style="display:block;image-rendering:pixelated"';

export const iconFlash = (size = 32, color: string = C.yellow): string => `
  <svg width="${size}" height="${size}" viewBox="0 0 32 32" ${px}>
    <rect x="4"  y="0"  width="16" height="6"  fill="${color}"/>
    <rect x="4"  y="0"  width="6"  height="18" fill="${color}"/>
    <rect x="10" y="12" width="18" height="6"  fill="${color}"/>
    <rect x="22" y="12" width="6"  height="20" fill="${color}"/>
    <rect x="4"  y="26" width="24" height="6"  fill="${color}"/>
  </svg>`;

export const iconTarget = (size = 32, color: string = C.pink): string => `
  <svg width="${size}" height="${size}" viewBox="0 0 32 32" ${px}>
    <rect x="0"  y="12" width="32" height="8" fill="${color}"/>
    <rect x="12" y="0"  width="8"  height="32" fill="${color}"/>
    <rect x="10" y="10" width="12" height="12" fill="${C.white}"/>
    <rect x="13" y="13" width="6"  height="6"  fill="${color}"/>
  </svg>`;

export const iconArrow = (size = 24, color: string = C.yellow): string => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" ${px}>
    <rect x="0"  y="9"  width="18" height="6"  fill="${color}"/>
    <rect x="12" y="0"  width="6"  height="6"  fill="${color}"/>
    <rect x="18" y="6"  width="6"  height="6"  fill="${color}"/>
    <rect x="12" y="18" width="6"  height="6"  fill="${color}"/>
  </svg>`;

export const iconCheck = (size = 28, color: string = C.yellow): string => `
  <svg width="${size}" height="${size}" viewBox="0 0 28 28" ${px}>
    <rect x="0"  y="14" width="8"  height="8"  fill="${color}"/>
    <rect x="8"  y="18" width="6"  height="8"  fill="${color}"/>
    <rect x="14" y="10" width="6"  height="8"  fill="${color}"/>
    <rect x="20" y="2"  width="8"  height="8"  fill="${color}"/>
  </svg>`;

export const iconShield = (
  size = 40,
  color: string = C.yellow,
  accent: string = C.pink,
): string => `
  <svg width="${size}" height="${size}" viewBox="0 0 40 40" ${px}>
    <rect x="8"  y="0"  width="24" height="8"  fill="${color}"/>
    <rect x="0"  y="8"  width="40" height="6"  fill="${color}"/>
    <rect x="0"  y="14" width="8"  height="18" fill="${color}"/>
    <rect x="32" y="14" width="8"  height="18" fill="${color}"/>
    <rect x="8"  y="32" width="8"  height="8"  fill="${color}"/>
    <rect x="24" y="32" width="8"  height="8"  fill="${color}"/>
    <rect x="16" y="36" width="8"  height="4"  fill="${color}"/>
    <rect x="12" y="14" width="16" height="18" fill="${C.dark}"/>
    <rect x="16" y="18" width="8"  height="10" fill="${accent}"/>
  </svg>`;

export const iconWarn = (size = 24, color: string = C.pink): string => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" ${px}>
    <rect x="8"  y="0"  width="8"  height="4"  fill="${color}"/>
    <rect x="4"  y="4"  width="16" height="4"  fill="${color}"/>
    <rect x="0"  y="8"  width="24" height="4"  fill="${color}"/>
    <rect x="0"  y="12" width="24" height="4"  fill="${color}"/>
    <rect x="0"  y="16" width="24" height="4"  fill="${color}"/>
    <rect x="4"  y="20" width="16" height="4"  fill="${color}"/>
    <rect x="10" y="6"  width="4"  height="8"  fill="${C.white}"/>
    <rect x="10" y="16" width="4"  height="4"  fill="${C.white}"/>
  </svg>`;

export const blockCorner = (
  size = 48,
  color: string = C.dark,
  flip = false,
): string => `
  <svg width="${size}" height="${size}" viewBox="0 0 48 48"
       style="display:block;image-rendering:pixelated;${flip ? "transform:rotate(180deg)" : ""}">
    <rect x="0"  y="0"  width="48" height="10" fill="${color}"/>
    <rect x="0"  y="0"  width="10" height="48" fill="${color}"/>
    <rect x="10" y="10" width="12" height="6"  fill="${color}"/>
    <rect x="10" y="10" width="6"  height="12" fill="${color}"/>
  </svg>`;
