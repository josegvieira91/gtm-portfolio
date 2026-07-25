// src/lib/schematic/tool-icons.ts
//
// Single job: the ONE source of truth mapping each catalog tool key to its
// Simple Icons slug (or local hand-drawn fallback, Pitfall 4: Clay has no
// Simple Icons entry) and the brand's real default color (Pitfall 5: use
// the actual hex, not the cyanotype accent, so the "logo" node treatment
// (GATE 1, D-05b) reads as genuinely brand-colored). SchematicNode.astro
// (this plan) imports this map; StackBadges.astro (02-05) and MachineWall
// (02-09) import it too — no local tool->icon maps anywhere else.

export interface ToolIcon {
  /** Simple Icons slug (e.g. "n8n"). Null when no Simple Icons entry exists. */
  slug: string | null;
  /** Brand's real default color, verified against simple-icons' own data. */
  hex: string;
  /** Path (relative to src/components/schematic/) to a hand-drawn fallback glyph. */
  local?: string;
}

export const TOOL_ICONS: Record<string, ToolIcon> = {
  n8n: { slug: 'n8n', hex: '#EA4B71' },
  hubspot: { slug: 'hubspot', hex: '#FF7A59' },
  salesforce: { slug: 'salesforce', hex: '#00A1E0' },
  slack: { slug: 'slack', hex: '#4A154B' },
  claude: { slug: 'claude', hex: '#D97757' },
  whatsapp: { slug: 'whatsapp', hex: '#25D366' },
  postgres: { slug: 'postgresql', hex: '#4169E1' },
  calcom: { slug: 'caldotcom', hex: '#292929' },
  // Pitfall 4: Simple Icons has no Clay mark. Hand-drawn fallback glyph
  // (icons/clay.svg), hex sampled from clay.com's own site ink color.
  clay: { slug: null, hex: '#1D2026', local: 'icons/clay.svg' },
};
