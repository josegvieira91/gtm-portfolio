// src/lib/schematic/types.ts
//
// Single job: shared TypeScript types for the schematic engine, mirroring
// the zod schemas in src/content.config.ts exactly. Drift between the two
// breaks the engine silently, so any schema change here must be mirrored
// there and vice versa. Zero imports from astro or gsap: these are plain
// types, safe to import from both build-time (layout.ts) and client-side
// (the future controller/timeline modules) code.

export interface DiagramNode {
  id: string;
  label: string;
  stage: number;
  lane: number;
  kind: 'trigger' | 'process' | 'store' | 'output';
  tool: string;
  /** Manual grid-coordinate override. Wins over {stage, lane} when present. */
  grid?: { x: number; y: number };
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
}

export interface DiagramCallout {
  text: string;
  anchor: string;
  side: string;
}

export interface DiagramStep {
  id: string;
  activateNodes: string[];
  activateEdges: string[];
  packetPath?: string[];
  callout?: DiagramCallout;
}

export interface Diagram {
  id: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  steps: DiagramStep[];
}

export interface LayoutOptions {
  stageWidth: number;
  laneHeight: number;
  padding: number;
  nodeWidth: number;
  nodeHeight: number;
}

export interface NodePosition {
  x: number;
  y: number;
}
