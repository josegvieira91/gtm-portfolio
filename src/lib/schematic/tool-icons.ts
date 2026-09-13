// src/lib/schematic/tool-icons.ts
//
// Single job: the ONE source of truth mapping each catalog tool key to its
// Simple Icons slug, or to a local hand-drawn fallback where Simple Icons
// has no entry, and to the brand's real default color. The hex has to be the
// actual brand color rather than the cyanotype accent, or the logo node
// treatment stops reading as genuinely brand-colored. SchematicNode.astro,
// StackBadges.astro and MachineWall all import this map. No local
// tool-to-icon maps anywhere else.

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
  // Content-pass expansion (2026-07-25, José's tool-diversity call): every
  // tool below is recordable in a live account (free tier / dev org / test
  // mode or trial), which is the hard rule for anything shown on this site. Hexes
  // verified against simple-icons' own data JSON.
  gmail: { slug: 'gmail', hex: '#EA4335' },
  googlesheets: { slug: 'googlesheets', hex: '#34A853' },
  googlecalendar: { slug: 'googlecalendar', hex: '#4285F4' },
  zapier: { slug: 'zapier', hex: '#FF4F00' },
  make: { slug: 'make', hex: '#6D00CC' },
  openai: { slug: 'openai', hex: '#000000' },
  metabase: { slug: 'metabase', hex: '#509EE3' },
  posthog: { slug: 'posthog', hex: '#000000' },
  stripe: { slug: 'stripe', hex: '#635BFF' },
  // No Simple Icons entry for these three. Hand glyphs live in
  // icons/ (resolved via local-icons.ts); Apollo and Instantly marks traced
  // from the brands' own site SVGs, Clay's hex sampled from clay.com ink.
  clay: { slug: null, hex: '#1D2026', local: 'icons/clay.svg' },
  apollo: { slug: null, hex: '#000000', local: 'icons/apollo.svg' },
  instantly: { slug: null, hex: '#0281FF', local: 'icons/instantly.svg' },
};
