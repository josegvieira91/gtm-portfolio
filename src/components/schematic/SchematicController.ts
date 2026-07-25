// src/components/schematic/SchematicController.ts
//
// Deferred hydration entry point for every schematic on the page (SITE-04):
// finds each [data-schematic-root], attaches ONE IntersectionObserver per
// element (rootMargin 200px, so the heavy gsap/ScrollTrigger/DrawSVG chunk
// starts loading just before the schematic approaches the viewport, not on
// initial page load), and on first intersection dynamically imports the
// timeline module and mounts it. This is the vanilla-island equivalent of
// `client:visible`. No top-level static `import ... from 'gsap'` exists
// anywhere in this file — gsap is only ever reachable through the
// `import()` below, inside the observer callback.
import { SCHEMATIC_CONFIG } from '../../lib/schematic/config';
import type { Diagram, NodePosition } from '../../lib/schematic/types';

interface DiagramPayload {
  diagram: Diagram;
  positions: Record<string, NodePosition>;
  layout: unknown;
}

interface CollectedRefs {
  section: Element;
  svg: Element | null;
  nodes: Record<string, Element>;
  edges: Record<string, Element>;
  callouts: Record<string, Element[]>;
  packet: Element | null;
}

/**
 * Collect the DOM refs `mountSchematic`/`autoplaySchematic` animate. The
 * ScrollTrigger pin boundary (`section`) is the closest ancestor marked
 * `[data-pin-section]` — DiagramSection.astro puts this on its outer
 * wrapper so the pin spans both the diagram column and the callout column
 * (D-06). Standalone usage (hero/mini schematics with no such ancestor)
 * falls back to the schematic root itself.
 */
function collectRefs(schematicRoot: Element): CollectedRefs {
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
  // itself (DiagramSection renders them as a sibling column) — and the
  // same step id can appear twice (desktop + mobile layout, CSS-toggled),
  // so every match for a given id is collected, not just the first.
  const callouts: Record<string, Element[]> = {};
  section.querySelectorAll('[data-step-callout]').forEach((el) => {
    const id = el.getAttribute('data-step-callout');
    if (!id) return;
    (callouts[id] ??= []).push(el);
  });

  const packet = schematicRoot.querySelector('[data-packet]');
  const svg = schematicRoot.querySelector('[data-schematic-svg]');

  return { section, svg, nodes, edges, callouts, packet };
}

async function hydrate(schematicRoot: Element): Promise<void> {
  const payloadEl = schematicRoot.querySelector('script[type="application/json"][data-diagram]');
  if (!payloadEl?.textContent) return;

  let payload: DiagramPayload;
  try {
    payload = JSON.parse(payloadEl.textContent);
  } catch {
    return;
  }

  const mode = (schematicRoot.getAttribute('data-mode') as 'scroll' | 'auto' | null) ?? 'scroll';
  const refs = collectRefs(schematicRoot);

  // Dynamic import: the ONLY place gsap/ScrollTrigger/DrawSVG enter the
  // bundle graph, kept out of the initial page load (SITE-04).
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
 * hydrates that schematic — gsap loads only when a schematic approaches
 * the viewport (SITE-04), never on initial page load. Astro dedupes
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
            void hydrate(schematicRoot);
          }
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(schematicRoot);
  });
}
