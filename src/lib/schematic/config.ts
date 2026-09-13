// src/lib/schematic/config.ts
//
// Single job: hold the schematic engine's visual and behavioral switches as
// one typed config object, so no component re-derives these choices
// independently. No dependency beyond plain TypeScript types.

export interface SchematicConfig {
  /** Tool chips render brand-colored logos rather than mono line-art. */
  nodeStyle: 'line-art' | 'logo';
  /**
   * Mobile pin behavior for the scroll-scrubbed diagram. It starts at 'pin',
   * the same treatment desktop gets, with an unpinned progressive-draw scrub
   * as the fallback if pin plus scrub cannot hold 60fps.
   *
   * Tested on a real iPhone, 2026-07-25: smooth. The pin holds with no
   * jitter, no address-bar jump, and the packet tracks the finger, so none
   * of the fallback steps were needed and `mobilePin` stays at 'pin'.
   *
   * Two real bugs surfaced during real-device re-testing after the
   * "smooth" verdict, both fixed with the pin mechanism UNCHANGED
   * (GSAP's default pinType, no explicit override. An explicit
   * `pinType: 'transform'` was tried as a fix and reverted after it caused
   * visible jitter and displaced content on real WebKit, see timeline.ts):
   * 1. Horizontal overflow ("cut at both edges" on real iPhone, invisible
   *    in Chrome-based headless checks): root cause was `viewBoxFor()` in
   *    layout.ts sizing the SVG viewBox from node CENTERS instead of true
   *    node and label extents. Chrome clips content that leaks past the
   *    viewBox by default and WebKit paints it. Fixed at the source in
   *    layout.ts; the pin mechanism itself was never the problem.
   * 2. Machine-wall mini-schematics (cards) not fitting their panel. That
   *    one is unrelated to pin and scrub, fixed via letterboxed
   *    `h-full` sizing (Schematic.astro) and a dedicated simplified
   *    diagram for case-01's card (case-01-mini.json).
   *
   * WARNING: do not flip this to 'unpinned' without first fixing
   * timeline.ts's mobile branch. It still derives its
   * ScrollTrigger `end` from a hardcoded `diagram.steps.length * 320`
   * magic-number distance decoupled from the real DOM height, the exact
   * class of bug the desktop branch's own fix (see timeline.ts) already
   * removed. With `pin: true` this is currently self-consistent (GSAP
   * inserts a spacer of that exact height), but flipping to 'unpinned'
   * alone (pin: false) reintroduces the decoupled-scroll-distance bug on
   * mobile: the diagram would finish drawing before or after the content
   * it belongs to, depending on viewport height.
   */
  mobilePin: 'pin' | 'unpinned';
  /** Machine wall tool filter is single-select plus All. */
  filterMode: 'single-select-all' | 'multi-or';
  /** Card hover shows a simplified node skeleton. */
  miniSchematic: 'skeleton' | 'full-mini';
}

export const SCHEMATIC_CONFIG: SchematicConfig = {
  nodeStyle: 'logo',
  mobilePin: 'pin',
  filterMode: 'single-select-all',
  miniSchematic: 'skeleton',
};
