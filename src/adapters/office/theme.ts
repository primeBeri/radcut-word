import type { HostTheme } from "../../core/ports/host-shell";

const LIGHT: HostTheme = { isDark: false, background: "#ffffff", foreground: "#242424" };

/** `#rgb` or `#rrggbb` (any case) as lower-case `#rrggbb`, or null. */
function normaliseColour(value: string | undefined): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value?.trim() ?? "");
  if (!match) return null;
  const hex = match[1]!.toLowerCase();
  return `#${hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex}`;
}

function isDarkColour(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! < 128;
}

/**
 * The Office theme as the core sees it (research R11). `isDarkTheme` is reported by Word on
 * Windows (Black theme → true); if it is missing, the body background decides. The
 * prefers-color-scheme media query does not follow the Office theme, so it is never used.
 */
export function readOfficeTheme(): HostTheme {
  const theme = Office.context.officeTheme as (Office.OfficeTheme & { isDarkTheme?: boolean }) | undefined;
  if (!theme) return LIGHT;
  const background = normaliseColour(theme.bodyBackgroundColor) ?? LIGHT.background;
  const foreground = normaliseColour(theme.bodyForegroundColor) ?? LIGHT.foreground;
  return { isDark: theme.isDarkTheme ?? isDarkColour(background), background, foreground };
}
