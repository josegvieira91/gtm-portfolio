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
   *
   * HUMAN GATE 2 SPIKE RESULT (02-07, 2026-07-25): verdict SMOOTH.
   * Device: iPhone (Dynamic Island class), iOS version not captured.
   * Pin holds with no jitter, no address-bar jump, packet tracks the
   * finger — NONE of the L1-L4 fix-ladder steps from RESEARCH.md were
   * applied; `mobilePin` stays 'pin' exactly as the D-06 default.
   *
   * Two real bugs surfaced during real-device re-testing after the
   * "smooth" verdict, both fixed with the pin mechanism UNCHANGED
   * (GSAP's default pinType, no explicit pinType override — an explicit
   * `pinType: 'transform'` was tried as a fix and reverted after it
   * caused visible jitter + displaced content on real WebKit, see
   * timeline.ts):
   * 1. Horizontal overflow ("cut at both edges" on real iPhone, invisible
   *    in Chrome-based headless checks): root cause was `viewBoxFor()` in
   *    layout.ts sizing the SVG viewBox from node CENTERS instead of true
   *    node+label extents — Chrome clips content that leaks past the
   *    viewBox by default, WebKit paints it. Fixed at the source in
   *    layout.ts; the pin mechanism itself was never the problem.
   * 2. Machine-wall mini-schematics (cards) not fitting their panel —
   *    unrelated to the pin/scrub mechanism, fixed via letterboxed
   *    `h-full` sizing (Schematic.astro) and a dedicated simplified
   *    diagram for case-01's card (case-01-mini.json).
   *
   * WARNING (02-REVIEW.md WR-12): do not flip this to 'unpinned' without
   * first fixing timeline.ts's mobile branch. It still derives its
   * ScrollTrigger `end` from a hardcoded `diagram.steps.length * 320`
   * magic-number distance decoupled from the real DOM height -- the exact
   * class of bug the desktop branch's own fix (see timeline.ts) already
   * removed. With `pin: true` this is currently self-consistent (GSAP
   * inserts a spacer of that exact height), but flipping to 'unpinned'
   * alone (pin: false) reintroduces the decoupled-scroll-distance bug on
   * mobile: the diagram would finish drawing before or after the content
   * it belongs to, depending on viewport height.
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
