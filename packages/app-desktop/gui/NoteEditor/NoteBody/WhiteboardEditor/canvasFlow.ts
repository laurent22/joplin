import { CSSProperties } from 'react';
import { Edge as FlowEdge, MarkerType, Node as FlowNode } from '@xyflow/react';
import { Canvas, CanvasEdge, CanvasNode, CanvasNodeSide } from '@joplin/lib/services/whiteboard/jsoncanvas';

export type WhiteboardNodeData = {
	canvasNode: CanvasNode;
};

export type WhiteboardFlowNode = FlowNode<WhiteboardNodeData>;
export type WhiteboardFlowEdge = FlowEdge<{ canvasEdge: CanvasEdge }>;

const flowTypeForCanvasType = (type: CanvasNode['type']): string => {
	switch (type) {
	case 'text': return 'wbText';
	case 'file': return 'wbFile';
	case 'link': return 'wbLink';
	case 'group': return 'wbGroup';
	}
};

export const canvasNodeToFlowNode = (n: CanvasNode): WhiteboardFlowNode => {
	const isGroup = n.type === 'group';
	// React Flow forces `pointerEvents: 'all'` as an inline style on the node
	// wrapper, which beats any CSS class rule. For groups we override it back
	// to 'none' via the node's own `style` (which React Flow spreads after its
	// own pointerEvents). Children re-enable pointer-events selectively, so
	// only the handle / label actually catches mouse events.
	const style: CSSProperties = { width: n.width, height: n.height };
	if (isGroup) style.pointerEvents = 'none';
	return {
		id: n.id,
		type: flowTypeForCanvasType(n.type),
		position: { x: n.x, y: n.y },
		data: { canvasNode: n },
		style,
		width: n.width,
		height: n.height,
		selectable: true,
		draggable: true,
		// Restrict drag/select initiation to the explicit handle and label so
		// clicks elsewhere bubble through to the pane (panning) or to a card
		// on top (interacting with it).
		...(isGroup ? { dragHandle: '.whiteboard-group-handle' } : {}),
	};
};

const sideToHandle = (side: CanvasNodeSide | undefined): string | undefined => {
	if (!side) return undefined;
	return side;
};

// markerUnits userSpaceOnUse keeps arrowhead size fixed regardless of edge
// stroke width — selected edges have a thicker stroke and would otherwise
// render a proportionally bigger arrow.
const arrowMarker = () => ({ type: MarkerType.ArrowClosed, width: 27, height: 27, markerUnits: 'userSpaceOnUse' });

export interface CanvasToFlowResult {
	nodes: WhiteboardFlowNode[];
	edges: WhiteboardFlowEdge[];
}

export const canvasToFlow = (canvas: Canvas): CanvasToFlowResult => {
	const nodes: WhiteboardFlowNode[] = canvas.nodes.map(canvasNodeToFlowNode);

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

	return { nodes, edges };
};

const handleToSide = (handle?: string | null): CanvasNodeSide | undefined => {
	if (handle === 'top' || handle === 'right' || handle === 'bottom' || handle === 'left') return handle;
	return undefined;
};

export const flowToCanvas = (
	flowNodes: WhiteboardFlowNode[],
	flowEdges: WhiteboardFlowEdge[],
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

	// JSONCanvas z-order is array order: first = bottom, last = top. Groups
	// are visual containers and must render behind regular nodes, so we sort
	// them to the front of the array on serialize.
	nodes.sort((a, b) => {
		if (a.type === 'group' && b.type !== 'group') return -1;
		if (a.type !== 'group' && b.type === 'group') return 1;
		return 0;
	});

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
