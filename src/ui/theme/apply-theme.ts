import type { HostTheme } from "../../core/ports/host-shell";

/** Select the light or dark token set from the Office theme (research R11). */
export function applyTheme(theme: HostTheme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme.isDark ? "dark" : "light";
}
