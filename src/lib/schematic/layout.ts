// src/lib/schematic/layout.ts
//
// Single job: turn a diagram's {stage, lane} grid (or a per-node manual
// override, D-12) into SVG coordinates, and route the edges between them.
// Pure and DOM-free by design: no framework/DOM dependency, no import from
// astro/gsap/document/window. Every function here is a plain data
// transform, unit-testable against fixture JSON with no browser or build
// context required.
import type { Diagram, LayoutOptions, NodePosition } from './types';

/**
 * Convert every node's grid position into an SVG {x, y}. A node's manual
 * `grid` override wins when present (D-12: this override capability is
 * non-negotiable); otherwise position derives from `{stage, lane}` scaled
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

/**
 * Compute an SVG `viewBox` string covering every node position, expanded
 * by `opts.padding` on every edge.
 */
export function viewBoxFor(
  positions: Record<string, NodePosition>,
  opts: LayoutOptions
): string {
  const values = Object.values(positions);
  const xs = values.map((p) => p.x);
  const ys = values.map((p) => p.y);
  const minX = Math.min(...xs) - opts.padding;
  const minY = Math.min(...ys) - opts.padding;
  const maxX = Math.max(...xs) + opts.padding;
  const maxY = Math.max(...ys) + opts.padding;
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}
