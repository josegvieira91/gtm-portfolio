// src/content/config.ts
//
// Content collection schemas for the case studies and their diagram data.
// z now comes from astro/zod (Astro's own re-export of its bundled zod,
// still current at Astro 7.1.3; astro:content's z export is deprecated).
// Never install a second zod copy. This is not a second copy, just a
// different re-export path.
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const cases = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/cases' }),
  // The function form gives access to `image()`, which turns a missing
  // evidence screenshot into a build error instead of a silently broken
  // <img> at runtime.
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // slug flows straight into params.slug and an href with no
      // encoding, and diagramId flows into a filesystem path -- both are
      // owner-authored/build-time so not exploitable today, but a stray space,
      // slash, or ".." should fail at `astro check`, not produce a broken
      // route or a silent out-of-tree stat with no error.
      slug: z.string().regex(/^[a-z0-9-]+$/, 'must be lowercase kebab-case'),
      track: z.enum(['gtm', 'lab']).default('gtm'),
      category: z.string(),
      heroMetric: z.string().optional(),
      stack: z.array(z.string()),
      metrics: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      // The video path is retired for every case: one standard, no video
      // anywhere. `video` used to be
      // an optional string here (Case 1's recording path); removed rather
      // than left optional-and-unused, so a stray `video:` line in a case's
      // frontmatter fails `astro check` instead of silently doing nothing.
      // Evidence pack: 1-3 stills of one real execution.
      // `image()` resolves each `src` at build time -- a missing file under
      // src/assets/cases/<slug>/ fails `astro check`/`astro build`, not a
      // silent broken image at runtime. The minimum is 1 rather than 2
      // because the HTML ExecutionReplay carries the explanation, so
      // one real still (the execution header, the receipt) is enough; the
      // still no longer has to also narrate the CRM record and the alert.
      evidence: z
        .array(
          z.object({
            src: image(),
            alt: z.string(),
            caption: z.string(),
          })
        )
        .min(1)
        .max(3)
        .optional(),
      // Sanitized workflow JSON download. Either one file
      // (workflows/<slug>/<file>.json) or a whole case folder for a
      // multi-export chain (trailing slash, e.g. Case 8's Zaps).
      export: z
        .string()
        .regex(/^workflows\/[a-z0-9-]+\/([a-z0-9-]+\.json)?$/)
        .optional(),
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
      grid: z.object({ x: z.number(), y: z.number() }).optional(), // manual override
    })),
    edges: z.array(z.object({ id: z.string(), from: z.string(), to: z.string() })),
    steps: z.array(z.object({
      id: z.string(),
      activateNodes: z.array(z.string()),
      activateEdges: z.array(z.string()),
      packetPath: z.array(z.string()).optional(),
      // anchor and side are optional: DiagramSection.astro only ever
      // consumes step.callout?.text; nothing reads anchor or side today.
      // All 41 existing authored callouts keep validating unchanged, and
      // new callouts written during later diagram true-ups may omit both
      // fields. Wiring anchor into buildStepTimeline for a highlight feature
      // was considered and rejected, since nothing has asked for it.
      callout: z.object({
        text: z.string(),
        anchor: z.string().optional(),
        side: z.string().optional(),
      }).optional(),
    })),
  }),
});

// The execution replay data feeding
// ExecutionReplay.astro -- one JSON file per case under
// src/content/replays/, derived from that case's sanitized execution
// export. Data hygiene: never a hostname, webhook path, token,
// credential name, record id or channel id -- only node names, timings,
// synthetic lead data and statuses. `step.window`, when present, is the
// id of one of this replay's own `windows` entries (loose string, not an
// enum of the two ids seen in Case 1, since a future case's window ids
// may differ, e.g. Salesforce or email instead of HubSpot/Slack).
const replays = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/replays' }),
  schema: z.object({
    caseSlug: z.string().regex(/^[a-z0-9-]+$/, 'must be lowercase kebab-case'),
    source: z.string(),
    totalMs: z.number(),
    windows: z.array(
      z.object({
        id: z.string(),
        kind: z.enum(['log', 'contact', 'slack']),
        title: z.string(),
      })
    ),
    steps: z.array(
      z.object({
        at: z.number(),
        node: z.string(),
        line: z.string(),
        tone: z.enum(['ok', 'warn', 'wait', 'done']).optional(),
        window: z.string().optional(),
      })
    ),
    // Both panes are optional because not every case has both. Case 3's
    // waterfall never touches Slack, and a replay that renders an empty Slack
    // window for it would be claiming a tool the run did not use. A replay
    // supplies whichever panes its `windows` list declares, and
    // ExecutionReplay.astro renders only those.
    contact: z
      .object({
        name: z.string(),
        company: z.string(),
        email: z.string(),
        created: z.string(),
      })
      .optional(),
    slack: z
      .object({
        bot: z.string(),
        time: z.string(),
        headline: z.string(),
        fields: z.array(z.object({ label: z.string(), value: z.string() })),
      })
      .optional(),
  }),
});

export const collections = { cases, diagrams, replays };
