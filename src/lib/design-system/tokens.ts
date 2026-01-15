import { animations } from "./animations";
import type { AnimationTokens } from "./animations";
import { colors } from "./colors";
import type { ColorPalette } from "./colors";
import { spacing } from "./spacing";
import type { SpacingScale } from "./spacing";
import { typography } from "./typography";
import type { TypographyScale } from "./typography";

export const tokens = {
  colors,
  typography,
  spacing,
  animations,
} as const satisfies Record<string, unknown>;

export type DesignTokens = {
  colors: ColorPalette;
  typography: TypographyScale;
  spacing: SpacingScale;
  animations: AnimationTokens;
};
