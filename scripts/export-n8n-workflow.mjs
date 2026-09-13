#!/usr/bin/env node
//
// Export one n8n workflow into this repo, sanitized.
//
//   node --env-file=.env scripts/export-n8n-workflow.mjs <workflow-id> <output-path>
//
// Reads N8N_API_KEY (or N8N_LAB_KEY) for the n8n public API, and N8N_API_URL
// for the base URL, which defaults to http://127.0.0.1:5678 so the instance
// hostname never has to be written down anywhere in this repo.
//
// Why a script and not the download button: an export taken by hand carries
// instance-local identifiers that mean nothing to a reader and should not be
// published. Doing it in code makes the rules the same every time.
//
// What it strips:
//   1. Bookkeeping the API adds and n8n's own file export leaves out: the
//      workflow id, versionId, timestamps, sharing, trigger counts.
//   2. Every webhook `path`, replaced with PLACEHOLDER. A path plus a known
//      base URL reconstructs a live callable endpoint.
//   3. Every `webhookId`, replaced with PLACEHOLDER. Same reasoning, and
//      n8n regenerates them on import anyway.
//   4. Every credential `id`. The name stays, so an importer can see which
//      credential slot to fill. The id is instance-local and correlates two
//      exports to one instance when it repeats across files.
//
// What it does not do: rename credentials. That happens in n8n before the
// export, so the sanitized name is what the tool itself holds. The script
// fails loudly if it finds a credential name that is not a PLACEHOLDER_*,
// rather than quietly papering over it. See docs/sanitization-checklist.md.
//
// Run scripts/sanitize-check.sh against the output directory afterwards. This
// script is the first gate, not the only one.

import fs from 'node:fs';
import path from 'node:path';

const PLACEHOLDER = 'PLACEHOLDER';
const CREDENTIAL_NAME_RE = /^PLACEHOLDER_[A-Z0-9_]+$/;

// n8n's own file export writes these keys and nothing else. Matching it keeps
// an export from this script diffable against one taken from the UI.
const EXPORT_KEYS = [
  'name',
  'nodes',
  'connections',
  'pinData',
  'settings',
  'staticData',
  'meta',
  'tags',
  'active',
];

function usage(message) {
  if (message) console.error(`error: ${message}\n`);
  console.error('usage: node --env-file=.env scripts/export-n8n-workflow.mjs <workflow-id> <output-path>');
  process.exit(1);
}

const [workflowId, outputPath] = process.argv.slice(2);
if (!workflowId || !outputPath) usage('need a workflow id and an output path');

const apiKey = process.env.N8N_API_KEY || process.env.N8N_LAB_KEY;
if (!apiKey) usage('set N8N_API_KEY (or N8N_LAB_KEY) in .env');

const baseUrl = (process.env.N8N_API_URL || 'http://127.0.0.1:5678').replace(/\/+$/, '');

const response = await fetch(`${baseUrl}/api/v1/workflows/${encodeURIComponent(workflowId)}`, {
  headers: { 'X-N8N-API-KEY': apiKey },
});
if (!response.ok) {
  console.error(`error: n8n returned ${response.status} for workflow ${workflowId}`);
  process.exit(1);
}
const live = await response.json();

const findings = [];
let strippedPaths = 0;
let strippedWebhookIds = 0;
let strippedCredentialIds = 0;

const nodes = (live.nodes ?? []).map((node) => {
  const clean = { ...node };

  if (Object.prototype.hasOwnProperty.call(clean, 'webhookId')) {
    if (clean.webhookId !== PLACEHOLDER) strippedWebhookIds += 1;
    clean.webhookId = PLACEHOLDER;
  }

  if (clean.parameters && typeof clean.parameters.path === 'string') {
    if (clean.parameters.path !== PLACEHOLDER) strippedPaths += 1;
    clean.parameters = { ...clean.parameters, path: PLACEHOLDER };
  }

  if (clean.credentials) {
    const credentials = {};
    for (const [type, value] of Object.entries(clean.credentials)) {
      const { id, ...rest } = value ?? {};
      if (id !== undefined) strippedCredentialIds += 1;
      if (rest.name && !CREDENTIAL_NAME_RE.test(rest.name)) {
        findings.push(`node "${node.name}" uses credential "${rest.name}"; rename it in n8n to PLACEHOLDER_<TYPE> and export again`);
      }
      credentials[type] = rest;
    }
    clean.credentials = credentials;
  }

  return clean;
});

if (findings.length > 0) {
  console.error('export refused:');
  for (const finding of findings) console.error(`  - ${finding}`);
  process.exit(1);
}

const exported = {};
for (const key of EXPORT_KEYS) {
  switch (key) {
    case 'nodes':
      exported.nodes = nodes;
      break;
    case 'pinData':
      exported.pinData = live.pinData ?? {};
      break;
    case 'tags':
      // Tag objects carry instance-local ids and creation timestamps.
      exported.tags = (live.tags ?? []).map((tag) => (typeof tag === 'string' ? tag : tag.name));
      break;
    case 'active':
      exported.active = false;
      break;
    default:
      exported[key] = live[key] ?? null;
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(exported, null, 2)}\n`);

console.log(`wrote ${outputPath}`);
console.log(`  nodes: ${nodes.length}`);
console.log(`  webhook paths replaced: ${strippedPaths}`);
console.log(`  webhookIds replaced: ${strippedWebhookIds}`);
console.log(`  credential ids removed: ${strippedCredentialIds}`);
console.log('  run scripts/sanitize-check.sh on the output directory before committing');
