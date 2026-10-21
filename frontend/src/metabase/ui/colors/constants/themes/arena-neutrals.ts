import type { MetabaseColorKey, MetabaseThemeV2 } from "../../types";
import { ds } from "../arena-ds";

/**
 * Sim neutrals applied on top of the upstream theme builders.
 *
 * Keep these overrides in this file. `light.ts` and `dark.ts` should stay
 * aligned with upstream aside from the call into here, so the next merge does
 * not have to reconcile the whole color map.
 *
 * Brand, focus, and status ramps stay on the upstream theme. Only surfaces,
 * borders, body text, and the neutral controls that follow them move to Sim.
 */
function overlayNeutrals(
  theme: MetabaseThemeV2,
  overrides: Partial<Record<MetabaseColorKey, string>>,
): MetabaseThemeV2 {
  const colors: Record<string, string> = { ...theme.colors };

  for (const [key, value] of Object.entries(overrides)) {
    if (value != null) {
      colors[key] = value;
    }
  }

  // Started from a complete theme and only replaced existing neutral keys.
  return { ...theme, colors: colors as MetabaseThemeV2["colors"] };
}

export function applyArenaLightNeutrals(
  theme: MetabaseThemeV2,
): MetabaseThemeV2 {
  const t = ds.light;

  return overlayNeutrals(theme, {
    "background_page-primary": t.bg,
    "background_page-primary-inverse": t.surfaceInverted,
    "background_page-secondary": t.surface1,
    "background_page-secondary-inverse": t.surfaceInverted,
    "background_page-tertiary": t.surface6,
    "background_page-tertiary-inverse": ds.black,
    "background_surface-disabled": t.surface6,
    "background_surface-disabled-inverse": t.surfaceInvertedHover,
    "background_surface-primary": t.surface2,
    "background_surface-primary-hover": t.surfaceHover,
    "background_surface-primary-inverse": t.surfaceInverted,
    "background_surface-primary-inverse-hover": t.surfaceInvertedHover,
    "background_surface-primary-inverse-pressed": t.borderInverted,
    "background_surface-primary-pressed": t.surfaceActive,
    "background_surface-secondary": t.surface3,
    "background_surface-secondary-hover": t.surfaceHover,
    "background_surface-secondary-inverse": t.surfaceInvertedHover,
    "background_surface-secondary-inverse-hover": t.borderInverted,
    "background_surface-secondary-inverse-pressed": t.surfaceInvertedHover,
    "background_surface-secondary-pressed": t.surfaceActive,
    "border-neutral": t.border,
    "border-neutral-inverse-strong": t.textMuted,
    "border-neutral-strong": t.textMutedInverse,
    "border-neutral-strongest": t.textMuted,
    "border-neutral-subtle": t.border1,
    "border-on_dark": t.borderInverted,
    "button-default-neutral-default": t.surface2,
    "button-default-neutral-hover": t.surfaceHover,
    "button-default-neutral-pressed": t.surfaceActive,
    "button-light-neutral-default": t.surface3,
    "button-light-neutral-hover": t.surfaceHover,
    "button-light-neutral-pressed": t.surfaceActive,
    "button-on_dark-disabled": t.surfaceInvertedHover,
    "button-on_dark_primary-neutral-default": ds.white,
    "button-on_dark_primary-neutral-hover": t.surface6,
    "button-on_dark_primary-neutral-pressed": t.surfaceActive,
    "button-on_dark_secondary-neutral-default": t.surfaceInvertedHover,
    "button-on_dark_secondary-neutral-hover": t.borderInverted,
    "button-on_dark_secondary-neutral-pressed": t.surfaceInvertedHover,
    "button-subtle-neutral-hover": t.surfaceHover,
    "button-subtle-neutral-pressed": t.surfaceActive,
    "button_label-default-neutral-default": t.textPrimary,
    "button_label-light-neutral-default": t.textPrimary,
    "button_label-on_dark-disabled": t.textMuted,
    "button_label-on_dark_primary-neutral-default": t.textPrimary,
    "button_label-on_dark_secondary-neutral-default": ds.white,
    "button_label-subtle-neutral-default": t.textPrimary,
    "chart-axis": t.border,
    "core-white": ds.white,
    "feedback-neutral-strong": t.textMuted,
    "icon-disabled": t.textIconMuted,
    "icon-disabled-inverse": t.textMuted,
    "icon-primary": t.textIcon,
    "icon-primary-inverse": t.textInverse,
    "icon-secondary": t.textSecondary,
    "icon-secondary-inverse": t.textMutedInverse,
    "input-background": t.surface1,
    "modal-overlay": t.overlay,
    "segmented_control-hover": t.surfaceHover,
    "segmented_control-pressed": t.surfaceActive,
    "segmented_control-selected": ds.white,
    "shadow-default": t.shadow,
    "switch-disabled": t.surface6,
    "switch-unchecked": t.surface6,
    "text-disabled": t.textMuted,
    "text-disabled-inverse": t.textMuted,
    "text-primary": t.textPrimary,
    "text-primary-inverse": t.textInverse,
    "text-secondary": t.textSecondary,
    "text-secondary-inverse": t.textMutedInverse,
    "text-secondary-opaque": t.textSecondary,
    "text-selected": t.textPrimary,
    "tooltip-background": t.surfaceInverted,
    "tooltip-background-focused": t.surfaceInvertedHover,
    "tooltip-text": t.textInverse,
    "tooltip-text-secondary": t.textMutedInverse,
  });
}

export function applyArenaDarkNeutrals(
  theme: MetabaseThemeV2,
): MetabaseThemeV2 {
  const t = ds.dark;

  return overlayNeutrals(theme, {
    "background_page-primary": t.bg,
    "background_page-primary-inverse": ds.white,
    "background_page-secondary": t.surface1,
    "background_page-secondary-inverse": ds.light.surface3,
    "background_page-tertiary": t.bg,
    "background_page-tertiary-inverse": t.textMutedInverse,
    "background_surface-disabled": t.surface6,
    "background_surface-disabled-inverse": t.textMutedInverse,
    "background_surface-primary": t.surface2,
    "background_surface-primary-hover": t.surfaceHover,
    "background_surface-primary-inverse": ds.white,
    "background_surface-primary-inverse-hover": ds.light.surface3,
    "background_surface-primary-inverse-pressed": t.textMutedInverse,
    "background_surface-primary-pressed": t.surfaceActive,
    "background_surface-secondary": t.surface1,
    "background_surface-secondary-hover": t.surfaceHover,
    "background_surface-secondary-inverse": ds.light.surface3,
    "background_surface-secondary-inverse-hover": t.textMutedInverse,
    "background_surface-secondary-inverse-pressed": t.textMuted,
    "background_surface-secondary-pressed": t.surfaceActive,
    "border-neutral": t.border,
    "border-neutral-inverse-strong": t.textMuted,
    "border-neutral-strong": t.textMuted,
    "border-neutral-strongest": t.textTertiary,
    "border-neutral-subtle": t.surface5,
    "border-on_dark": t.border,
    "button-default-neutral-default": t.surface2,
    "button-default-neutral-hover": t.surfaceHover,
    "button-default-neutral-pressed": t.surfaceActive,
    "button-light-neutral-default": t.surface1,
    "button-light-neutral-hover": t.surfaceHover,
    "button-light-neutral-pressed": t.surfaceActive,
    "button-subtle-neutral-hover": t.surfaceHover,
    "button-subtle-neutral-pressed": t.surfaceActive,
    "button_label-default-neutral-default": t.textPrimary,
    "button_label-light-neutral-default": t.textPrimary,
    "button_label-subtle-neutral-default": t.textPrimary,
    "chart-axis": t.border,
    "core-white": t.bg,
    "feedback-neutral-strong": t.textMuted,
    "icon-disabled": t.textIconMuted,
    "icon-disabled-inverse": t.textMuted,
    "icon-primary": t.textIcon,
    "icon-primary-inverse": t.textInverse,
    "icon-secondary": t.textSecondary,
    "icon-secondary-inverse": t.surface6,
    "input-background": t.surface1,
    "modal-overlay": t.overlay,
    "segmented_control-hover": t.surfaceHover,
    "segmented_control-pressed": t.surfaceActive,
    "segmented_control-selected": t.surface6,
    "shadow-default": t.shadow,
    "switch-disabled": t.surface6,
    "switch-unchecked": t.surface6,
    "text-disabled": t.textMuted,
    "text-disabled-inverse": t.textMuted,
    "text-primary": t.textPrimary,
    "text-primary-inverse": t.textInverse,
    "text-secondary": t.textSecondary,
    "text-secondary-inverse": t.surface6,
    "text-secondary-opaque": t.textSecondary,
    "text-selected": ds.white,
    "tooltip-background": t.surface5,
    "tooltip-background-focused": t.surface6,
    "tooltip-text": t.textPrimary,
    "tooltip-text-secondary": t.textSecondary,
  });
}
