// src/lib/schematic/timeline.ts
//
// Single job: build the GSAP timeline that drives a schematic's motion —
// scroll-scrubbed (D-06/D-08) or one-shot autoplay (D-09, the hero) — behind
// a gsap.matchMedia() reduced-motion gate that is structurally incapable of
// registering anything when the user prefers reduced motion. Pattern 2 /
// Pitfall 2, non-negotiable: if neither matchMedia query below matches
// (i.e. the OS's reduced-motion preference is set), this module never
// touches the DOM and never registers a ScrollTrigger. The SSR final-drawn
// state (Schematic.astro) stands exactly as delivered in that case — this
// is the entire reduced-motion fallback, there is no third branch for it.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import type { Diagram } from './types';
import type { SchematicConfig } from './config';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

/** DOM refs collected by SchematicController.ts before mounting. Callouts
 * map to an array because the same step id can render twice in the DOM
 * (desktop column + mobile layout, toggled by CSS breakpoint) — both tween
 * together, only the CSS-visible one is ever seen. */
export interface SchematicRefs {
  section: Element;
  svg: Element | null;
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
 * no-preference)` matchMedia branch — never at SSR/CSS time (Pattern 2). */
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
 * the step's final node — no ambiguous between-node resting state (D-08).
 * Shared by both the scroll-scrubbed mount and the one-shot hero autoplay
 * so the two motion modes never drift apart. */
function buildStepTimeline(diagram: Diagram, refs: SchematicRefs, tl: gsap.core.Timeline): void {
  let prevCalloutStepId: string | null = null;

  diagram.steps.forEach((step) => {
    tl.addLabel(step.id);

    step.activateEdges.forEach((id) => {
      const el = refs.edges[id];
      if (el) tl.to(el, { drawSVG: '100%', duration: 1, ease: 'none' }, '<');
    });

    step.activateNodes.forEach((id) => {
      const el = refs.nodes[id];
      if (el) tl.to(el, { opacity: 1, scale: 1, duration: 0.6 }, '<');
    });

    if (step.callout) {
      const active = refs.callouts[step.id];
      if (active?.length) tl.to(active, { opacity: 1, duration: 0.4 }, '<');
      if (prevCalloutStepId) {
        const prev = refs.callouts[prevCalloutStepId];
        if (prev?.length) tl.to(prev, { opacity: 0.35, duration: 0.4 }, '<');
      }
      prevCalloutStepId = step.id;
    }

    if (step.packetPath?.length && refs.packet) {
      const lastNodeId = step.packetPath[step.packetPath.length - 1];
      const lastNode = refs.nodes[lastNodeId];
      // The packet reads its target from the node's own SSR-computed
      // position (data-cx/data-cy, written by SchematicNode.astro) rather
      // than re-deriving layout math here — layout.ts stays the single
      // source of truth for coordinates.
      const cx = lastNode?.getAttribute('data-cx');
      const cy = lastNode?.getAttribute('data-cy');
      if (cx && cy) {
        tl.to(refs.packet, { opacity: 1, attr: { cx: Number(cx), cy: Number(cy) }, duration: 0.8 }, '<');
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

  // Desktop (D-06): the diagram pins, callouts scroll past it in the right column.
  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
    setUndrawnStart(diagram, refs);
    const tl = gsap.timeline(
      options.mode === 'scroll'
        ? {
            scrollTrigger: {
              trigger: refs.section,
              pin: true,
              scrub: 1,
              end: '+=' + diagram.steps.length * 400,
              snap: 'labels', // D-08: soft snap to each step
            },
          }
        : {}
    );
    buildStepTimeline(diagram, refs, tl);
    return () => tl.scrollTrigger?.kill();
  });

  // Mobile (D-07): pin only if SCHEMATIC_CONFIG.mobilePin === 'pin' (spike-
  // decided in 02-07); when unpinned, the diagram still draws progressively
  // via the same scrub+snap, just without visually locking in place.
  mm.add('(prefers-reduced-motion: no-preference) and (max-width: 767px)', () => {
    setUndrawnStart(diagram, refs);
    const pinMobile = options.mode === 'scroll' && options.mobilePin === 'pin';
    const tl = gsap.timeline(
      options.mode === 'scroll'
        ? {
            scrollTrigger: {
              trigger: refs.section,
              pin: pinMobile,
              scrub: 1,
              end: '+=' + diagram.steps.length * 320,
              snap: 'labels',
            },
          }
        : {}
    );
    buildStepTimeline(diagram, refs, tl);
    return () => tl.scrollTrigger?.kill();
  });

  // No third branch exists. When the OS's reduced-motion preference is set,
  // neither query above matches, this function has done nothing to the DOM,
  // and no ScrollTrigger was ever registered — the SSR final-drawn state
  // stands exactly as delivered.

  return mm;
}

/**
 * One-shot autoplay for the home hero (D-09): the same step loop as a plain
 * `gsap.timeline()` played once on mount, no ScrollTrigger involved.
 * Reduced-motion gated the same way as `mountSchematic`.
 */
export function autoplaySchematic(diagram: Diagram, refs: SchematicRefs): gsap.MatchMedia {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    setUndrawnStart(diagram, refs);
    const tl = gsap.timeline();
    buildStepTimeline(diagram, refs, tl);
    return () => tl.kill();
  });

  return mm;
}
