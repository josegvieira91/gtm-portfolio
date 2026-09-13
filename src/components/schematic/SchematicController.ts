// src/components/schematic/SchematicController.ts
//
// Deferred hydration entry point for every schematic on the page. It
// finds each [data-schematic-root], attaches ONE IntersectionObserver per
// element (rootMargin 200px, so the heavy gsap/ScrollTrigger/DrawSVG chunk
// starts loading just before the schematic approaches the viewport, not on
// initial page load), and on first intersection dynamically imports the
// timeline module and mounts it. This is the vanilla-island equivalent of
// `client:visible`. No top-level static `import ... from 'gsap'` exists
// anywhere in this file. gsap is only ever reachable through the
// `import()` below, inside the observer callback.
import { SCHEMATIC_CONFIG } from '../../lib/schematic/config';
import type { Diagram } from '../../lib/schematic/types';
// This was a locally-declared `CollectedRefs` interface,
// structurally identical to `SchematicRefs` below except `packet`
// optionality, that had to be kept in sync by hand. Type-only import is
// required so the gsap-bearing module is not pulled into the initial
// bundle (see header comment above) -- exactly the same type-only pattern
// already used for `Diagram` from `../../lib/schematic/types`.
import type { SchematicRefs } from '../../lib/schematic/timeline';

// `positions` and `layout` used to be serialized into every embedded
// payload but nothing on the client ever read either -- coordinates come
// from the node's own SSR `data-cx`/`data-cy` attributes instead
// (timeline.ts, layout.ts stays the single source of truth). Reduced to
// the one field the client actually mounts with.
interface DiagramPayload {
  diagram: Diagram;
}

/**
 * Collect the DOM refs `mountSchematic`/`autoplaySchematic` animate. The
 * ScrollTrigger pin boundary (`section`) is the closest ancestor marked
 * `[data-pin-section]`, which DiagramSection.astro puts on its outer
 * wrapper so the pin spans both the diagram column and the callout
 * column. Standalone usage (hero/mini schematics with no such ancestor)
 * falls back to the schematic root itself.
 */
function collectRefs(schematicRoot: Element): SchematicRefs {
  const section = schematicRoot.closest('[data-pin-section]') ?? schematicRoot;

  const nodes: Record<string, Element> = {};
  schematicRoot.querySelectorAll('[data-node-id]').forEach((el) => {
    const id = el.getAttribute('data-node-id');
    if (id) nodes[id] = el;
  });

  const edges: Record<string, Element> = {};
  schematicRoot.querySelectorAll('[data-edge-id]').forEach((el) => {
    const id = el.getAttribute('data-edge-id');
    if (id) edges[id] = el;
  });

  // Callouts live in `section`, not necessarily inside `schematicRoot`
  // itself (DiagramSection renders them as a sibling column), and the
  // same step id can appear twice (desktop + mobile layout, CSS-toggled),
  // so every match for a given id is collected, not just the first.
  const callouts: Record<string, Element[]> = {};
  section.querySelectorAll('[data-step-callout]').forEach((el) => {
    const id = el.getAttribute('data-step-callout');
    if (!id) return;
    (callouts[id] ??= []).push(el);
  });

  const packet = schematicRoot.querySelector('[data-packet]');

  return { section, nodes, edges, callouts, packet };
}

async function hydrate(schematicRoot: Element): Promise<void> {
  const payloadEl = schematicRoot.querySelector('script[type="application/json"][data-diagram]');
  if (!payloadEl?.textContent) return;

  let payload: DiagramPayload;
  try {
    payload = JSON.parse(payloadEl.textContent);
  } catch (err) {
    console.error('[schematic] hydrate failed: invalid diagram payload JSON', err);
    return;
  }

  const mode = (schematicRoot.getAttribute('data-mode') as 'scroll' | 'auto' | null) ?? 'scroll';
  const refs = collectRefs(schematicRoot);

  // Dynamic import: the ONLY place gsap/ScrollTrigger/DrawSVG enter the
  // bundle graph, kept out of the initial page load.
  const { mountSchematic, autoplaySchematic } = await import('../../lib/schematic/timeline');

  if (mode === 'auto') {
    autoplaySchematic(payload.diagram, refs);
  } else {
    mountSchematic(payload.diagram, refs, {
      mode: 'scroll',
      mobilePin: SCHEMATIC_CONFIG.mobilePin,
    });
  }
}

/**
 * Attach one IntersectionObserver per `[data-schematic-root]` found under
 * `root`. On first intersection the observer disconnects itself and
 * hydrates that schematic. gsap loads only when a schematic approaches
 * the viewport, never on initial page load. Astro dedupes
 * identical inline component `<script>`s, so this runs once per page
 * regardless of how many `<Schematic>` instances render.
 */
export function initSchematics(root: ParentNode = document): void {
  const roots = root.querySelectorAll('[data-schematic-root]');
  roots.forEach((schematicRoot) => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.disconnect();
            hydrate(schematicRoot).catch((err) => console.error('[schematic] hydrate failed', err));
          }
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(schematicRoot);
  });
}
