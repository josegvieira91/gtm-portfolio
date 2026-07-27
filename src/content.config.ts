// src/content/config.ts
//
// Content collection schemas for the case studies and their diagram data.
// z now comes from astro/zod (Astro's own re-export of its bundled zod,
// still current at Astro 7.1.3 — astro:content's z export is deprecated) —
// never install a second zod copy (project CLAUDE.md, RESEARCH.md Code
// Example #1); this is not a second copy, just a different re-export path.
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const cases = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/cases' }),
  schema: z.object({
    title: z.string(),
    // IN-07 fix: slug flows straight into params.slug and an href with no
    // encoding, and diagramId flows into a filesystem path -- both are
    // owner-authored/build-time so not exploitable today, but a stray space,
    // slash, or ".." should fail at `astro check`, not produce a broken
    // route or a silent out-of-tree stat with no error.
    slug: z.string().regex(/^[a-z0-9-]+$/, 'must be lowercase kebab-case'),
    track: z.enum(['gtm', 'lab']).default('gtm'), // SITE-09
    category: z.string(),
    heroMetric: z.string().optional(),
    stack: z.array(z.string()),
    metrics: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
    video: z.string().optional(),
    diagramId: z.string().regex(/^[a-z0-9-]+$/, 'must be lowercase kebab-case').optional(), // explicit pairing fallback if filename match isn't used
    featured: z.boolean().default(false),
    draft: z.boolean().default(true),
  }),
});

const diagrams = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/diagrams' }),
  schema: z.object({
    id: z.string(),
    nodes: z.array(z.object({
      id: z.string(),
      label: z.string(),
      stage: z.number(),
      lane: z.number(),
      kind: z.enum(['trigger', 'process', 'store', 'output']),
      tool: z.string(),
      grid: z.object({ x: z.number(), y: z.number() }).optional(), // D-12 manual override
    })),
    edges: z.array(z.object({ id: z.string(), from: z.string(), to: z.string() })),
    steps: z.array(z.object({
      id: z.string(),
      activateNodes: z.array(z.string()),
      activateEdges: z.array(z.string()),
      packetPath: z.array(z.string()).optional(),
      // IN-02: anchor/side made optional — DiagramSection.astro only ever
      // consumes step.callout?.text; nothing reads anchor or side today.
      // All 41 existing authored callouts keep validating unchanged, and
      // new callouts authored during Phase 3 diagram true-ups may omit
      // both fields. Wiring anchor into buildStepTimeline for a highlight
      // feature was considered and rejected: out of this phase's content +
      // hygiene scope, and not requested by any Phase 3 requirement.
      callout: z.object({
        text: z.string(),
        anchor: z.string().optional(),
        side: z.string().optional(),
      }).optional(),
    })),
  }),
});

export const collections = { cases, diagrams };
