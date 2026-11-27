export const CANVAS_NODE_WIDTH = 196;

export function canvasEdgeGeometry(source, target, nodeHeights) {
  const startX = source.x + CANVAS_NODE_WIDTH;
  const startY = source.y + (nodeHeights[source.id] ?? source.height ?? 144) / 2;
  const endX = target.x;
  const endY = target.y + (nodeHeights[target.id] ?? target.height ?? 144) / 2;
  const curve = Math.max(12, Math.abs(endX - startX) / 2);
  return {
    startX,
    startY,
    midX: (startX + endX) / 2,
    midY: (startY + endY) / 2,
    path: `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`,
  };
}

export function canvasBranch(edge, source, target) {
  if (source.type !== 'conditional') return null;
  if (edge.branch === 'true' || edge.branch === 'false') return edge.branch;
  if (/\b(true|high value)\b/i.test(edge.label ?? '')) return 'true';
  if (/\b(false|routine)\b/i.test(edge.label ?? '')) return 'false';
  if (target.type === 'hitl') return 'true';
  if (target.type === 'router') return 'false';
  return null;
}
