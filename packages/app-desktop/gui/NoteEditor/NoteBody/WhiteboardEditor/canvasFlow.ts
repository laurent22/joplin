// Translation between the JSONCanvas spec shape and React Flow's
// node/edge shape. Pure functions, no React imports.

import { Edge as FlowEdge, MarkerType, Node as FlowNode } from '@xyflow/react';
import { Canvas, CanvasEdge, CanvasNode, CanvasNodeSide } from '@joplin/lib/services/whiteboard/jsoncanvas';

export type WhiteboardNodeData = {
	canvasNode: CanvasNode;
};

export type WhiteboardFlowNode = FlowNode<WhiteboardNodeData>;
export type WhiteboardFlowEdge = FlowEdge<{ canvasEdge: CanvasEdge }>;

// Maps JSONCanvas node types to our React Flow node types. Group nodes are
// not rendered, so they're filtered out before this is called.
const flowTypeForCanvasType = (type: 'text' | 'file' | 'link'): string => {
	switch (type) {
	case 'text': return 'wbText';
	case 'file': return 'wbFile';
	case 'link': return 'wbLink';
	}
};

// Convert a single (non-group) JSONCanvas node into the React Flow shape.
// Used both by the bulk converter at load time and by the surface when the
// user creates a new node interactively.
export const canvasNodeToFlowNode = (n: Exclude<CanvasNode, { type: 'group' }>): WhiteboardFlowNode => ({
	id: n.id,
	type: flowTypeForCanvasType(n.type),
	position: { x: n.x, y: n.y },
	data: { canvasNode: n },
	style: { width: n.width, height: n.height },
	width: n.width,
	height: n.height,
	selectable: true,
	draggable: true,
});

const sideToHandle = (side: CanvasNodeSide | undefined): string | undefined => {
	if (!side) return undefined;
	return side; // React Flow handle ids match side names ('top', 'right', 'bottom', 'left').
};

// `markerUnits: 'userSpaceOnUse'` keeps the arrowhead at an absolute size,
// independent of the edge's stroke width. Without it, selected edges (which
// have a thicker stroke) would render a proportionally bigger arrow.
const arrowMarker = () => ({ type: MarkerType.ArrowClosed, width: 27, height: 27, markerUnits: 'userSpaceOnUse' });

export interface CanvasToFlowResult {
	nodes: WhiteboardFlowNode[];
	edges: WhiteboardFlowEdge[];
	// JSONCanvas group nodes are not rendered by this editor, but we keep them
	// here so they can be merged back on save and round-trip cleanly.
	preservedGroups: CanvasNode[];
}

export const canvasToFlow = (canvas: Canvas): CanvasToFlowResult => {
	const preservedGroups: CanvasNode[] = [];
	const nodes: WhiteboardFlowNode[] = [];

	for (const n of canvas.nodes) {
		if (n.type === 'group') {
			preservedGroups.push(n);
			continue;
		}
		nodes.push(canvasNodeToFlowNode(n));
	}

	const edges: WhiteboardFlowEdge[] = canvas.edges.map(e => ({
		id: e.id,
		source: e.fromNode,
		target: e.toNode,
		sourceHandle: sideToHandle(e.fromSide),
		targetHandle: sideToHandle(e.toSide),
		label: e.label,
		data: { canvasEdge: e },
		type: 'default',
		markerStart: e.fromEnd === 'arrow' ? arrowMarker() : undefined,
		markerEnd: e.toEnd === 'none' ? undefined : arrowMarker(),
	}));

	return { nodes, edges, preservedGroups };
};

const handleToSide = (handle?: string | null): CanvasNodeSide | undefined => {
	if (handle === 'top' || handle === 'right' || handle === 'bottom' || handle === 'left') return handle;
	return undefined;
};

// Apply React Flow positions back to canvas nodes. Preserves any field we
// don't track (color, subpath, etc.) by spreading the original canvasNode
// from `data`. Group nodes that were filtered out at load time are merged
// back unchanged via `preservedGroups`.
export const flowToCanvas = (
	flowNodes: WhiteboardFlowNode[],
	flowEdges: WhiteboardFlowEdge[],
	preservedGroups: CanvasNode[] = [],
): Canvas => {
	const nodes: CanvasNode[] = flowNodes.map(fn => {
		const orig = fn.data?.canvasNode;
		const width = (typeof fn.width === 'number' ? fn.width : (typeof fn.style?.width === 'number' ? fn.style.width : orig?.width)) ?? 200;
		const height = (typeof fn.height === 'number' ? fn.height : (typeof fn.style?.height === 'number' ? fn.style.height : orig?.height)) ?? 100;
		const base = {
			id: fn.id,
			x: fn.position.x,
			y: fn.position.y,
			width,
			height,
		};
		if (!orig) {
			return { ...base, type: 'text', text: '' };
		}
		return { ...orig, ...base };
	});

	// Re-attach preserved group nodes so a round-trip doesn't drop them.
	for (const g of preservedGroups) nodes.push(g);

	const edges: CanvasEdge[] = flowEdges.map(fe => {
		const orig = fe.data?.canvasEdge;
		const fromEnd: CanvasEdge['fromEnd'] = fe.markerStart ? 'arrow' : 'none';
		const toEnd: CanvasEdge['toEnd'] = fe.markerEnd ? 'arrow' : 'none';
		return {
			id: fe.id,
			fromNode: fe.source,
			toNode: fe.target,
			fromSide: handleToSide(fe.sourceHandle),
			toSide: handleToSide(fe.targetHandle),
			label: typeof fe.label === 'string' ? fe.label : (orig?.label),
			...(orig?.color ? { color: orig.color } : {}),
			fromEnd,
			toEnd,
		};
	});

	return { nodes, edges };
};
