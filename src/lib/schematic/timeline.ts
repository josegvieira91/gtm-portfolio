// src/lib/schematic/timeline.ts
//
// Single job: build the GSAP timeline that drives a schematic's motion,
// either scroll-scrubbed or as the hero's one-shot autoplay, behind a
// gsap.matchMedia() reduced-motion gate that is structurally incapable of
// registering anything when the user prefers reduced motion. This part is
// not negotiable: if neither matchMedia query below matches
// (i.e. the OS's reduced-motion preference is set), this module never
// touches the DOM and never registers a ScrollTrigger. The SSR final-drawn
// state (Schematic.astro) stands exactly as delivered in that case. That
// is the entire reduced-motion fallback, there is no third branch for it.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import type { Diagram } from './types';
import type { SchematicConfig } from './config';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

/** DOM refs collected by SchematicController.ts before mounting. Callouts
 * map to an array because the same step id can render twice in the DOM
 * (desktop column and mobile layout, toggled by CSS breakpoint). Both tween
 * together, only the CSS-visible one is ever seen.
 *
 * This used to also carry an `svg` ref (`querySelector('[data-
 * schematic-svg]')`), collected by SchematicController.ts but read by
 * nothing here or anywhere else. Dropped from both this interface and the
 * collection site -- the `data-schematic-svg` DOM attribute itself stays in
 * Schematic.astro's SSR markup, only the unused JS lookup goes. */
export interface SchematicRefs {
  section: Element;
  nodes: Record<string, Element>;
  edges: Record<string, Element>;
  callouts: Record<string, Element[]>;
  packet?: Element | null;
}

export interface MountOptions {
  mode: 'scroll' | 'auto';
  mobilePin: SchematicConfig['mobilePin'];
}

/** Move every animated element BACKWARD to its pre-animation start state.
 * Only ever called from inside a matched `(prefers-reduced-motion:
 * no-preference)` matchMedia branch, never at SSR or CSS time. */
function setUndrawnStart(diagram: Diagram, refs: SchematicRefs): void {
  const edgeEls = diagram.edges.map((e) => refs.edges[e.id]).filter(Boolean);
  if (edgeEls.length) gsap.set(edgeEls, { drawSVG: '0%' });

  const nodeEls = diagram.nodes.map((n) => refs.nodes[n.id]).filter(Boolean);
  if (nodeEls.length) gsap.set(nodeEls, { opacity: 0, scale: 0.85, transformOrigin: '50% 50%' });

  const calloutEls = Object.values(refs.callouts).flat();
  if (calloutEls.length) gsap.set(calloutEls, { opacity: 0.35 });

  if (refs.packet) gsap.set(refs.packet, { opacity: 0 });
}

/** Walk diagram.steps in order onto an existing gsap.timeline(): draw each
 * step's edges, activate its nodes, toggle its callout on (and the
 * previous step's callout back to dimmed), and settle the packet marker on
 * the step's final node, so there is no ambiguous between-node resting state.
 * Shared by both the scroll-scrubbed mount and the one-shot hero autoplay
 * so the two motion modes never drift apart. */
function buildStepTimeline(diagram: Diagram, refs: SchematicRefs, tl: gsap.core.Timeline): void {
  let prevCalloutStepId: string | null = null;

  diagram.steps.forEach((step) => {
    tl.addLabel(step.id);

    // The FIRST tween added for a step must anchor to the step's own label
    // (just added above), not '<'. '<' resolves to the start time of the
    // previously-ADDED TWEEN, and across a step boundary
    // that's the PRIOR step's own first tween, not this step's label. Used
    // unconditionally (as this loop originally did for every tween,
    // including each step's first), every step's tweens collapse onto
    // step 1's start time: verified with a standalone GSAP timeline replay
    // of this exact position-parameter pattern, label positions for a
    // 5-step diagram came out as [0, 1, 1, 1, 1] instead of [0, 1, 2, 3, 4].
    // On a real device this reads as "only the last callout's activation
    // tween ever visibly wins the scrub, and everything converges once the
    // scroll reaches the collapsed end point", which is exactly the mobile Safari
    // report from the real-iPhone spike. Anchoring each step's first tween
    // to `step.id` fixes the absolute position; every other tween in the
    // same step still chains off it with '<' exactly as before.
    let stepAnchor: string | '<' = step.id;
    const nextPos = (): string => {
      const pos = stepAnchor;
      stepAnchor = '<';
      return pos;
    };

    // Hero autoplay latency: this function is shared by both the
    // scroll-scrubbed case-page mount AND the hero's real-time
    // one-shot autoplay. For scroll-scrub, `scrub` maps 0-100% scroll
    // progress to 0-100% of the timeline's own duration proportionally, so
    // shortening these per-tween durations changes nothing visually there,
    // only the nominal total. For autoplay (no ScrollTrigger, played in
    // real wall-clock time), the total duration IS how long the user
    // waits. The original 1s/0.6s/0.4s/0.8s durations, combined with the
    // step-anchor fix above (which correctly stopped steps from collapsing
    // onto each other), gave each step a real ~1s slot. 5 steps in
    // hero.json meant the hero's "schematic:autoplay-complete" event (and
    // therefore the name/title overlay fade-in, gated on it) didn't fire
    // for ~5 real seconds. Measured via a real headless run: dispatched at
    // t=5080ms. That reads as a stuck/frozen hero, not a drawing one.
    // Shorter, snappier per-tween durations bring the whole 5-step hero
    // draw to ~1.5-2s, a normal hero-intro pace, with zero change to the
    // case-page scrub's visual proportions.
    step.activateEdges.forEach((id) => {
      const el = refs.edges[id];
      if (el) tl.to(el, { drawSVG: '100%', duration: 0.35, ease: 'none' }, nextPos());
    });

    step.activateNodes.forEach((id) => {
      const el = refs.nodes[id];
      if (el) tl.to(el, { opacity: 1, scale: 1, duration: 0.3 }, nextPos());
    });

    if (step.callout) {
      const active = refs.callouts[step.id];
      if (active?.length) tl.to(active, { opacity: 1, duration: 0.3 }, nextPos());
      if (prevCalloutStepId) {
        const prev = refs.callouts[prevCalloutStepId];
        if (prev?.length) tl.to(prev, { opacity: 0.35, duration: 0.3 }, nextPos());
      }
      prevCalloutStepId = step.id;
    }

    if (step.packetPath?.length && refs.packet) {
      const lastNodeId = step.packetPath[step.packetPath.length - 1];
      const lastNode = refs.nodes[lastNodeId];
      // The packet reads its target from the node's own SSR-computed
      // position (data-cx/data-cy, written by SchematicNode.astro) rather
      // than re-deriving layout math here. layout.ts stays the single
      // source of truth for coordinates.
      const cx = lastNode?.getAttribute('data-cx');
      const cy = lastNode?.getAttribute('data-cy');
      if (cx && cy) {
        tl.to(refs.packet, { opacity: 1, attr: { cx: Number(cx), cy: Number(cy) }, duration: 0.35 }, nextPos());
      }
    }
  });
}

/**
 * Mount the scroll-scrubbed (or one-shot, `mode: 'auto'`) schematic
 * timeline, gated entirely behind gsap.matchMedia(). Returns the
 * matchMedia context so a future caller can `.revert()` it on cleanup.
 */
export function mountSchematic(diagram: Diagram, refs: SchematicRefs, options: MountOptions): gsap.MatchMedia {
  const mm = gsap.matchMedia();

  // IN-12 fix: both matchMedia branches below used to repeat the same four
  // steps inline -- setUndrawnStart, build a gsap.timeline gated on
  // `options.mode`, run buildStepTimeline, return the ScrollTrigger cleanup
  // -- differing only in the ScrollTrigger options object. That duplication
  // is exactly what let an earlier desktop `end:` fix land in one branch
  // and not the other. Extracted once here, called from both
  // `mm.add` callbacks below with only the branch-specific options object.
  const mount = (stOptions: ScrollTrigger.Vars): (() => void) => {
    setUndrawnStart(diagram, refs);
    const tl = gsap.timeline(options.mode === 'scroll' ? { scrollTrigger: stOptions } : {});
    buildStepTimeline(diagram, refs, tl);
    return () => tl.scrollTrigger?.kill();
  };

  // Desktop: the diagram stays fixed while callouts scroll past it in the
  // right column. This used to be a GSAP `pin:true` with
  // `end: '+=' + diagram.steps.length * 400`, a magic-number scroll
  // distance completely decoupled from the section's REAL DOM height (the
  // callout column's `gap-[60vh]` stack, several viewport-heights tall).
  // Whenever those two disagreed (they always did, since 400px/step has no
  // relationship to a vh-based gap), the pin released mid-scroll, before
  // the callouts finished passing by, producing a jarring clipped/jumping
  // layout. The fixed diagram is now `md:sticky md:top-0` in CSS
  // (DiagramSection.astro) instead of a JS pin. Sticky positioning is
  // inherently always in sync with the real DOM height, no distance to
  // keep in sync by hand. `end: 'bottom bottom'` makes the scrub span
  // exactly the section's natural scroll-through range (from its top
  // hitting the viewport top to its bottom hitting the viewport bottom),
  // which is precisely how long the sticky diagram stays stuck. The two
  // mechanisms share the same underlying DOM height by construction.
  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () =>
    mount({
      trigger: refs.section,
      start: 'top top', // matches md:sticky md:top-0 engaging
      scrub: 1,
      end: 'bottom bottom',
    })
  );

  // No snap on either branch: snapping to step labels pulled the page back
  // to the nearest step (or past it) while the reader was still scrolling,
  // which read as the page fighting the scroll. The diagram still draws
  // progressively with the scrub; it just stops wherever the reader stops.
  //
  // Mobile: pin only if SCHEMATIC_CONFIG.mobilePin === 'pin', which is what
  // real-device testing settled on. When unpinned, the diagram still draws
  // progressively via the same scrub, it just does not lock in
  // place visually.
  //
  // pinType stays at GSAP's default ('fixed'). An explicit
  // `pinType: 'transform'` was tried once as an overflow fix and
  // REVERTED: on real WebKit it repositions the section
  // per scroll event, which lags visibly during iOS momentum scroll
  // ("insane jitter" in the real-device report) and left displaced/ghost
  // content after programmatic scrolls. The overflow it was chasing was
  // never a pin-measurement problem at all. The root cause was viewBoxFor()
  // sizing the SVG viewBox from node centers instead of true extents
  // (layout.ts), which WebKit paints outside the viewport where Chrome
  // clips. The real-iPhone verdict ("smooth") was recorded against this
  // default pinType.
  mm.add('(prefers-reduced-motion: no-preference) and (max-width: 767px)', () =>
    mount({
      trigger: refs.section,
      pin: options.mode === 'scroll' && options.mobilePin === 'pin',
      scrub: 1,
      end: '+=' + diagram.steps.length * 320,
    })
  );

  // No third branch exists. When the OS's reduced-motion preference is set,
  // neither query above matches, this function has done nothing to the DOM,
  // and no ScrollTrigger was ever registered, so the SSR final-drawn state
  // stands exactly as delivered.

  // Defense in depth: ScrollTrigger's pin and scrub measurements are taken
  // at whatever moment matchMedia's callback runs,
  // which can be before the self-hosted variable font
  // (@fontsource-variable/jetbrains-mono) has finished swapping in and
  // settling final text-driven layout metrics. GSAP's own documented fix
  // for exactly this class of "measured-too-early" pin bug is a
  // `ScrollTrigger.refresh()` once fonts are ready. Harmless to call from
  // every schematic instance. `document.fonts.ready` is a single
  // page-wide promise, so this only ever adds a few cheap, idempotent
  // refresh() calls, never duplicate ScrollTrigger instances.
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready
      .then(() => ScrollTrigger.refresh())
      .catch((err) => console.error('[schematic] font-ready refresh failed', err));
  }

  return mm;
}

/**
 * One-shot autoplay for the home hero: the same step loop as a plain
 * `gsap.timeline()` played once on mount, no ScrollTrigger involved.
 * Reduced-motion gated the same way as `mountSchematic`.
 *
 * On completion, dispatches a `schematic:autoplay-complete` CustomEvent on
 * `refs.section`. This module has no business knowing about page-specific
 * overlay text (e.g. BlueprintHero's name/title), so a DOM event is the
 * hand-off point rather than a page-specific callback param. The dispatch
 * lives INSIDE the matched `no-preference` branch only: reduced-motion
 * users never see the event because this callback body never runs for
 * them, same structural guarantee as every other branch in this file.
 */
export function autoplaySchematic(diagram: Diagram, refs: SchematicRefs): gsap.MatchMedia {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    setUndrawnStart(diagram, refs);
    const tl = gsap.timeline();
    buildStepTimeline(diagram, refs, tl);
    tl.call(() => {
      refs.section.dispatchEvent(new CustomEvent('schematic:autoplay-complete'));
    });
    return () => tl.kill();
  });

  return mm;
}
