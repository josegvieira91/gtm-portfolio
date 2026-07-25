// src/lib/schematic/config.ts
//
// Single job: hold the schematic engine's Gate 1-decided visual/behavioral
// switches as one typed config object, so no component re-derives these
// choices independently. No dependency beyond plain TypeScript types.

export interface SchematicConfig {
  /** GATE 1 (D-05b): brand-colored tool logos in chips, not mono line-art. */
  nodeStyle: 'line-art' | 'logo';
  /**
   * Mobile pin behavior for the scroll-scrubbed diagram (D-07). Initialized to
   * 'pin' as the D-06 desktop default; spike-decided in plan 02-07 on a real
   * iPhone, fallback locked by D-07 (unpinned progressive-draw scrub) if
   * pin+scrub can't hold smooth 60fps.
   */
  mobilePin: 'pin' | 'unpinned';
  /** GATE 1 discretion pick kept: machine wall tool filter is single-select + All. */
  filterMode: 'single-select-all' | 'multi-or';
  /** GATE 1 discretion pick kept: card hover shows a simplified node skeleton. */
  miniSchematic: 'skeleton' | 'full-mini';
}

export const SCHEMATIC_CONFIG: SchematicConfig = {
  nodeStyle: 'logo',
  mobilePin: 'pin',
  filterMode: 'single-select-all',
  miniSchematic: 'skeleton',
};
