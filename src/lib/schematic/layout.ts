// src/lib/schematic/layout.ts
//
// Single job: turn a diagram's {stage, lane} grid, or a per-node manual
// override, into SVG coordinates, and route the edges between them.
// Pure and DOM-free by design: no framework/DOM dependency, no import from
// astro/gsap/document/window. Every function here is a plain data
// transform, unit-testable against fixture JSON with no browser or build
// context required.
import type { Diagram, LayoutOptions, NodePosition } from './types';

/**
 * Convert every node's grid position into an SVG {x, y}. A node's manual
 * `grid` override always wins when present; otherwise position derives
 * from `{stage, lane}` scaled
 * by `opts.stageWidth`/`opts.laneHeight` and offset by `opts.padding`.
 */
export function computeLayout(
  diagram: Diagram,
  opts: LayoutOptions
): Record<string, NodePosition> {
  const positions: Record<string, NodePosition> = {};
  for (const node of diagram.nodes) {
    positions[node.id] = node.grid
      ? { x: node.grid.x, y: node.grid.y }
      : {
          x: opts.padding + node.stage * opts.stageWidth,
          y: opts.padding + node.lane * opts.laneHeight,
        };
  }
  return positions;
}

/**
 * Build an SVG path `d` attribute connecting two node positions, matching
 * circuit-schematic convention: a straight horizontal line when both
 * points share the same y (same lane), or an orthogonal elbow (horizontal,
 * then vertical, then horizontal) when lanes differ.
 */
export function edgePath(fromPos: NodePosition, toPos: NodePosition): string {
  if (fromPos.y === toPos.y) {
    return `M${fromPos.x},${fromPos.y} L${toPos.x},${toPos.y}`;
  }
  const midX = (fromPos.x + toPos.x) / 2;
  return `M${fromPos.x},${fromPos.y} L${midX},${fromPos.y} L${midX},${toPos.y} L${toPos.x},${toPos.y}`;
}

// Label metrics mirrored from SchematicNode.astro's <text> rendering. The
// label is centered on the node's cx at `text-[9px]` (9 SVG user units) in
// the mono face with `tracking-wide`; 0.63 is a conservative per-character
// advance ratio for JetBrains Mono at that tracking. LABEL_DY is the
// baseline offset below the node's bottom edge (labelY = y + h + 14), and
// the 0.35em term covers descender depth below the baseline.
const LABEL_FONT_SIZE = 9;
const LABEL_ADVANCE = 0.63;
const LABEL_DY = 14;

/**
 * Compute an SVG `viewBox` string covering every node's TRUE extents: the
 * node box (nodeWidth/nodeHeight around the center) plus its label's
 * estimated text width and baseline drop, expanded by `opts.padding` on
 * every edge.
 *
 * Why extents and not centers: sizing the box
 * from node CENTERS ± padding let content poke outside the viewBox
 * whenever nodeWidth/2 > padding (full: 60 > 40, mini: 20 > 16) or a
 * label ran wider than its node (every mini label). Chrome clips painted
 * content at the svg viewport so the leak was invisible there; WebKit
 * paints it, which is exactly the "cut at both edges / ghost text outside
 * the diagram" seen on the real iPhone.
 */
export function viewBoxFor(
  diagram: Diagram,
  positions: Record<string, NodePosition>,
  opts: LayoutOptions
): string {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of diagram.nodes) {
    const p = positions[node.id];
    if (!p) continue;
    const labelHalfW = (node.label.length * LABEL_FONT_SIZE * LABEL_ADVANCE) / 2;
    const halfW = Math.max(opts.nodeWidth / 2, labelHalfW);
    minX = Math.min(minX, p.x - halfW);
    maxX = Math.max(maxX, p.x + halfW);
    minY = Math.min(minY, p.y - opts.nodeHeight / 2);
    maxY = Math.max(maxY, p.y + opts.nodeHeight / 2 + LABEL_DY + LABEL_FONT_SIZE * 0.35);
  }
  const x0 = minX - opts.padding;
  const y0 = minY - opts.padding;
  const x1 = maxX + opts.padding;
  const y1 = maxY + opts.padding;
  return `${x0} ${y0} ${x1 - x0} ${y1 - y0}`;
}
