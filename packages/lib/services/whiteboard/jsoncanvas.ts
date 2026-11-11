// Type definitions for the JSONCanvas 1.0 spec — https://jsoncanvas.org
//
// Joplin extension: a `file` value starting with `:/` is a Joplin internal ID
// reference (note or resource), not a path. Anything else is treated as a
// regular file path / external reference.

export type CanvasNodeSide = 'top' | 'right' | 'bottom' | 'left';

export type CanvasColor =
	// Preset palette from the spec: '1' red, '2' orange, '3' yellow,
	// '4' green, '5' cyan, '6' purple. Hex strings are also allowed.
	| '1' | '2' | '3' | '4' | '5' | '6'
	| string;

interface BaseCanvasNode {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color?: CanvasColor;
}

export interface TextCanvasNode extends BaseCanvasNode {
	type: 'text';
	text: string;
}

export interface FileCanvasNode extends BaseCanvasNode {
	type: 'file';
	// In Joplin, this can be `:/<noteId>` or `:/<resourceId>` as well as a
	// regular path (for cross-vault interop with other apps).
	file: string;
	subpath?: string;
}

export interface LinkCanvasNode extends BaseCanvasNode {
	type: 'link';
	url: string;
}

export interface GroupCanvasNode extends BaseCanvasNode {
	type: 'group';
	label?: string;
	background?: string;
	backgroundStyle?: 'cover' | 'ratio' | 'repeat';
}

export type CanvasNode =
	| TextCanvasNode
	| FileCanvasNode
	| LinkCanvasNode
	| GroupCanvasNode;

export interface CanvasEdge {
	id: string;
	fromNode: string;
	fromSide?: CanvasNodeSide;
	fromEnd?: 'none' | 'arrow';
	toNode: string;
	toSide?: CanvasNodeSide;
	toEnd?: 'none' | 'arrow';
	color?: CanvasColor;
	label?: string;
}

export interface Canvas {
	nodes: CanvasNode[];
	edges: CanvasEdge[];
}

export const emptyCanvas = (): Canvas => ({ nodes: [], edges: [] });

// The fence language tag used inside note bodies to mark a JSONCanvas block.
export const fenceTag = 'jsoncanvas';
