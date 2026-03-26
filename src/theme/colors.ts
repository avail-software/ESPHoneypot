export const C = {
  bg: "#FFFFFF",
  dark: "#0A0A0A",
  panel: "rgba(10,10,10,0.97)",
  yellow: "#F5B800",
  pink: "#FF0080",
  white: "#FFFFFF",
  grey: "#666",
  dim: "#E0E0E0",
  mid: "#1a1a1a",
  text: "#0A0A0A",
  textMid: "#555",
  textFaint: "#AAA",
} as const;

export type ColorKey = keyof typeof C;
