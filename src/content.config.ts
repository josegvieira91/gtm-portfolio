// src/content/config.ts
//
// Content collection schemas for the case studies and their diagram data.
// zod comes from astro:content (Astro bundles it) — never install a second
// zod copy (project CLAUDE.md, RESEARCH.md Code Example #1).
import { defineCollection, z } from 'astro:content';
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
      callout: z.object({ text: z.string(), anchor: z.string(), side: z.string() }).optional(),
    })),
  }),
});

export const collections = { cases, diagrams };
