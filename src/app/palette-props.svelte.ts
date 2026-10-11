import type { PaletteProps } from "../ui/palette/types";

/**
 * Props for a mounted palette as reactive state, so the composition root can swap in a refreshed
 * heading list without remounting (the palette keeps its query and selection).
 */
export function reactivePaletteProps(initial: PaletteProps): PaletteProps {
  const props = $state(initial);
  return props;
}
