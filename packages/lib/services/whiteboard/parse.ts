import { Canvas, CanvasEdge, CanvasNode, emptyCanvas, fenceTag } from './jsoncanvas';

// Matches the first ` ```jsoncanvas ` fence in a note body. Captures:
//   1: the body before the fence (incl. trailing newline if any)
//   2: the JSON content between the fences
//   3: the body after the closing fence
//
// Fence opener allows optional whitespace and an optional info-string newline.
// Fence closer is a line consisting of just three or more backticks.
const fenceRegex = new RegExp(
	`^([\\s\\S]*?)\`\`\`${fenceTag}[ \\t]*\\r?\\n([\\s\\S]*?)\\r?\\n\`\`\`[ \\t]*(?:\\r?\\n|$)([\\s\\S]*)$`,
);

export interface ParseResult {
	canvas: Canvas;
	prefix: string;
	suffix: string;
	// True if the fence existed and parsed cleanly. False means the body has
	// no fence, or the fence content is not valid JSONCanvas.
	hasCanvas: boolean;
	// When the fence existed but could not be parsed, this carries a
	// human-readable explanation (the JSON parser's message, or a description
	// of the schema violation). Null when there's no fence at all, or when
	// parsing succeeded.
	parseError: string | null;
}

// Cheap precheck — `fenceRegex` uses lazy [\s\S]*? matching that's O(n) on
// strings without a fence, so a literal-substring check first lets us bail
// out without touching the regex engine for any note that isn't a whiteboard.
const fenceMarker = `\`\`\`${fenceTag}`;

export const hasWhiteboardFence = (body: string): boolean => {
	if (!body) return false;
	if (body.indexOf(fenceMarker) === -1) return false;
	return fenceRegex.test(body);
};

const isObject = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const validateNode = (raw: unknown): CanvasNode | null => {
	if (!isObject(raw)) return null;
	const { id, type, x, y, width, height } = raw;
	if (typeof id !== 'string' || !id) return null;
	if (typeof type !== 'string') return null;
	if (typeof x !== 'number' || typeof y !== 'number') return null;
	if (typeof width !== 'number' || typeof height !== 'number') return null;

	switch (type) {
	case 'text':
		if (typeof raw.text !== 'string') return null;
		return raw as unknown as CanvasNode;
	case 'file':
		if (typeof raw.file !== 'string') return null;
		return raw as unknown as CanvasNode;
	case 'link':
		if (typeof raw.url !== 'string') return null;
		return raw as unknown as CanvasNode;
	case 'group':
		return raw as unknown as CanvasNode;
	default:
		return null;
	}
};

const validateEdge = (raw: unknown): CanvasEdge | null => {
	if (!isObject(raw)) return null;
	const { id, fromNode, toNode } = raw;
	if (typeof id !== 'string' || !id) return null;
	if (typeof fromNode !== 'string' || !fromNode) return null;
	if (typeof toNode !== 'string' || !toNode) return null;
	return raw as unknown as CanvasEdge;
};

const validateCanvas = (raw: unknown): Canvas | string => {
	if (!isObject(raw)) return 'Top-level JSONCanvas value must be an object with `nodes` and `edges` arrays.';
	const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
	const rawEdges = Array.isArray(raw.edges) ? raw.edges : [];
	const nodes: CanvasNode[] = [];
	for (const n of rawNodes) {
		const v = validateNode(n);
		if (v) nodes.push(v);
	}
	const edges: CanvasEdge[] = [];
	const nodeIds = new Set(nodes.map(n => n.id));
	for (const e of rawEdges) {
		const v = validateEdge(e);
		// Drop edges that point at nodes we couldn't validate — the
		// alternative is dangling refs that crash the renderer.
		if (v && nodeIds.has(v.fromNode) && nodeIds.has(v.toNode)) edges.push(v);
	}
	return { nodes, edges };
};

export const parseWhiteboard = (body: string): ParseResult => {
	if (!body) return { canvas: emptyCanvas(), prefix: '', suffix: '', hasCanvas: false, parseError: null };

	// Same precheck as hasWhiteboardFence — skip the O(n) backtracking regex
	// scan when the literal opening marker isn't even present.
	if (body.indexOf(fenceMarker) === -1) return { canvas: emptyCanvas(), prefix: body, suffix: '', hasCanvas: false, parseError: null };

	const match = body.match(fenceRegex);
	if (!match) return { canvas: emptyCanvas(), prefix: body, suffix: '', hasCanvas: false, parseError: null };

	const [, prefix, jsonText, suffix] = match;

	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonText);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { canvas: emptyCanvas(), prefix, suffix, hasCanvas: false, parseError: `Invalid JSON: ${message}` };
	}

	const canvas = validateCanvas(parsed);
	if (typeof canvas === 'string') return { canvas: emptyCanvas(), prefix, suffix, hasCanvas: false, parseError: canvas };

	return { canvas, prefix, suffix, hasCanvas: true, parseError: null };
};
