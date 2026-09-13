// src/components/schematic/local-icons.ts
//
// Single lookup for the hand-drawn tool glyphs, for the tools with no
// Simple Icons entry: Clay, Apollo and Instantly. Keys match the `local`
// field in tool-icons.ts ("icons/clay.svg"). Consumers (SchematicNode,
// StackBadges, MachineWall) resolve through this map instead of importing
// any one glyph directly, so adding a tool = drop the SVG in icons/ + one
// tool-icons.ts entry, zero component edits. Each glyph is a single-path
// SVG with fill="currentColor" so the brand hex applies via CSS color.
const raw = import.meta.glob<string>('./icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const LOCAL_ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(raw).map(([path, svg]) => [path.replace('./', ''), svg])
);
