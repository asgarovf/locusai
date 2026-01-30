/**
 * Simple ANSI color utility for terminal output
 * Dependency-free and works in Node.js/Bun environments
 */

const ESC = "\u001b[";
const RESET = `${ESC}0m`;

const colors = {
  reset: RESET,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  italic: `${ESC}3m`,
  underline: `${ESC}4m`,

  // Foreground colors
  black: `${ESC}30m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  white: `${ESC}37m`,
  gray: `${ESC}90m`,

  // Foreground bright colors
  brightRed: `${ESC}91m`,
  brightGreen: `${ESC}92m`,
  brightYellow: `${ESC}93m`,
  brightBlue: `${ESC}94m`,
  brightMagenta: `${ESC}95m`,
  brightCyan: `${ESC}96m`,
  brightWhite: `${ESC}97m`,
  // Background colors
  bgBlack: `${ESC}40m`,
  bgRed: `${ESC}41m`,
  bgGreen: `${ESC}42m`,
  bgYellow: `${ESC}43m`,
  bgBlue: `${ESC}44m`,
  bgMagenta: `${ESC}45m`,
  bgCyan: `${ESC}46m`,
  bgWhite: `${ESC}47m`,
};

type ColorName = keyof typeof colors;

export const c = {
  text: (text: string, ...colorNames: ColorName[]) => {
    const codes = colorNames.map((name) => colors[name]).join("");
    return `${codes}${text}${RESET}`;
  },

  // Shortcuts
  bold: (t: string) => c.text(t, "bold"),
  dim: (t: string) => c.text(t, "dim"),
  red: (t: string) => c.text(t, "red"),
  green: (t: string) => c.text(t, "green"),
  yellow: (t: string) => c.text(t, "yellow"),
  blue: (t: string) => c.text(t, "blue"),
  magenta: (t: string) => c.text(t, "magenta"),
  cyan: (t: string) => c.text(t, "cyan"),
  gray: (t: string) => c.text(t, "gray"),

  white: (t: string) => c.text(t, "white"),
  brightBlue: (t: string) => c.text(t, "brightBlue"),
  bgBlue: (t: string) => c.text(t, "bgBlue", "white", "bold"),

  // Combinations
  success: (t: string) => c.text(t, "green", "bold"),
  error: (t: string) => c.text(t, "red", "bold"),
  warning: (t: string) => c.text(t, "yellow", "bold"),
  info: (t: string) => c.text(t, "cyan", "bold"),
  primary: (t: string) => c.text(t, "blue", "bold"),
  secondary: (t: string) => c.text(t, "magenta", "bold"),
  header: (t: string) => c.text(` ${t} `, "bgBlue", "white", "bold"),
  step: (t: string) => c.text(` ${t} `, "bgCyan", "black", "bold"),
  underline: (t: string) => c.text(t, "underline"),
};
