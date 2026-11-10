import { Canvas, CanvasEdge, CanvasNode, CanvasNodeSide, FileCanvasNode } from './jsoncanvas';
import { resolveCanvasColor } from './presetColors';
import { ThemeAppearance } from '../../themes/type';
import { escapeHtml } from '../../string-utils';
import { _ } from '../../locale';

export interface FileCardContent {
	header?: string;
	bodyHtml?: string;
	imageSrc?: string;
	// Shown in a faded, italic style, for example for deleted or locked items
	isNotice?: boolean;
}

export interface WhiteboardTheme {
	appearance: ThemeAppearance;
	color: string;
	colorFaded: string;
	backgroundColor: string;
	dividerColor: string;
}

export interface RenderToHtmlOptions {
	theme: WhiteboardTheme;
	renderMarkdown: (markdown: string)=> Promise<string>;
	renderFileCard: (node: FileCanvasNode)=> Promise<FileCardContent>;
}

interface Point {
	x: number;
	y: number;
}

interface Bounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

const padding = 40;

export const canvasBounds = (canvas: Canvas): Bounds => {
	if (!canvas.nodes.length) return { x: 0, y: 0, width: 0, height: 0 };
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const n of canvas.nodes) {
		minX = Math.min(minX, n.x);
		minY = Math.min(minY, n.y);
		maxX = Math.max(maxX, n.x + n.width);
		maxY = Math.max(maxY, n.y + n.height);
	}
	return { x: minX - padding, y: minY - padding, width: maxX - minX + padding * 2, height: maxY - minY + padding * 2 };
};

const anchorPoint = (n: CanvasNode, side: CanvasNodeSide): Point => {
	switch (side) {
	case 'top': return { x: n.x + n.width / 2, y: n.y };
	case 'bottom': return { x: n.x + n.width / 2, y: n.y + n.height };
	case 'left': return { x: n.x, y: n.y + n.height / 2 };
	case 'right': return { x: n.x + n.width, y: n.y + n.height / 2 };
	}
};

// Edges without a side (allowed by the spec) attach to the side facing the other node
const facingSide = (from: CanvasNode, to: CanvasNode): CanvasNodeSide => {
	const dx = (to.x + to.width / 2) - (from.x + from.width / 2);
	const dy = (to.y + to.height / 2) - (from.y + from.height / 2);
	if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
	return dy >= 0 ? 'bottom' : 'top';
};

// Same curve as the default React Flow edge used by the editor (getBezierPath, curvature 0.25)
const controlOffset = (distance: number) => distance >= 0 ? 0.5 * distance : 0.25 * 25 * Math.sqrt(-distance);

const controlPoint = (side: CanvasNodeSide, from: Point, to: Point): Point => {
	switch (side) {
	case 'left': return { x: from.x - controlOffset(from.x - to.x), y: from.y };
	case 'right': return { x: from.x + controlOffset(to.x - from.x), y: from.y };
	case 'top': return { x: from.x, y: from.y - controlOffset(from.y - to.y) };
	case 'bottom': return { x: from.x, y: from.y + controlOffset(to.y - from.y) };
	}
};

export const edgeGeometry = (edge: CanvasEdge, from: CanvasNode, to: CanvasNode) => {
	const fromSide = edge.fromSide ?? facingSide(from, to);
	const toSide = edge.toSide ?? facingSide(to, from);
	const source = anchorPoint(from, fromSide);
	const target = anchorPoint(to, toSide);
	const c1 = controlPoint(fromSide, source, target);
	const c2 = controlPoint(toSide, target, source);
	const round = (n: number) => Math.round(n * 100) / 100;
	return {
		path: `M${round(source.x)},${round(source.y)} C${round(c1.x)},${round(c1.y)} ${round(c2.x)},${round(c2.y)} ${round(target.x)},${round(target.y)}`,
		labelPosition: {
			x: round(source.x * 0.125 + c1.x * 0.375 + c2.x * 0.375 + target.x * 0.125),
			y: round(source.y * 0.125 + c1.y * 0.375 + c2.y * 0.375 + target.y * 0.125),
		},
	};
};

const colorStyle = (node: CanvasNode, theme: WhiteboardTheme) => {
	const stroke = resolveCanvasColor(node.color, theme.appearance, 'stroke');
	const fill = resolveCanvasColor(node.color, theme.appearance, 'fill');
	const rules = [];
	if (stroke) rules.push(`border-color: ${stroke}`);
	if (fill) rules.push(`background: ${fill}`);
	return rules.length ? ` style="${escapeHtml(rules.join('; '))}"` : '';
};

const foreignObject = (n: CanvasNode, content: string) => {
	return `<foreignObject x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}">${content}</foreignObject>`;
};

const renderGroup = (n: CanvasNode, theme: WhiteboardTheme) => {
	const label = n.type === 'group' && n.label ? `<div class="label">${escapeHtml(n.label)}</div>` : '';
	return foreignObject(n, `<div xmlns="http://www.w3.org/1999/xhtml" class="wb-group"${colorStyle(n, theme)}>${label}</div>`);
};

const renderCard = async (n: CanvasNode, options: RenderToHtmlOptions) => {
	let content = '';
	let extraClass = '';
	if (n.type === 'text') {
		extraClass = ' -text';
		content = `<div class="wb-md">${n.text ? await options.renderMarkdown(n.text) : ''}</div>`;
	} else if (n.type === 'link') {
		content = `<div class="header">${escapeHtml(_('Link'))}</div><div class="body -url"><a href="${escapeHtml(n.url)}">${escapeHtml(n.url)}</a></div>`;
	} else if (n.type === 'file') {
		const card = await options.renderFileCard(n);
		if (card.imageSrc) {
			extraClass = ' -image';
			content = `<img class="image" src="${escapeHtml(card.imageSrc)}" alt="${escapeHtml(card.header ?? '')}"/>`;
		} else {
			if (card.header) content += `<div class="header">${escapeHtml(card.header)}</div>`;
			content += `<div class="body wb-md${card.isNotice ? ' -notice' : ''}">${card.bodyHtml ?? ''}</div>`;
		}
	}
	return foreignObject(n, `<div xmlns="http://www.w3.org/1999/xhtml" class="wb-card${extraClass}"${colorStyle(n, options.theme)}>${content}</div>`);
};

const renderEdge = (edge: CanvasEdge, nodes: Map<string, CanvasNode>, theme: WhiteboardTheme, markerIds: Map<string, string>) => {
	const from = nodes.get(edge.fromNode);
	const to = nodes.get(edge.toNode);
	if (!from || !to) return '';
	const stroke = resolveCanvasColor(edge.color, theme.appearance, 'stroke') ?? theme.colorFaded;
	if (!markerIds.has(stroke)) markerIds.set(stroke, `wb-arrow-${markerIds.size}`);
	const marker = `url(#${markerIds.get(stroke)})`;
	const { path, labelPosition } = edgeGeometry(edge, from, to);
	const markerStart = edge.fromEnd === 'arrow' ? ` marker-start="${marker}"` : '';
	const markerEnd = edge.toEnd === 'none' ? '' : ` marker-end="${marker}"`;
	let output = `<path class="wb-edge" d="${path}" stroke="${escapeHtml(stroke)}"${markerStart}${markerEnd}/>`;
	if (edge.label) {
		output += `<text class="wb-edge-label" x="${labelPosition.x}" y="${labelPosition.y}">${escapeHtml(edge.label)}</text>`;
	}
	return output;
};

const styles = (theme: WhiteboardTheme) => `
	.joplin-whiteboard { display: block; width: 100%; height: auto; max-height: 100vh; break-inside: avoid; margin: 1em 0; color: ${theme.color}; }
	.joplin-whiteboard .wb-edge { fill: none; stroke-width: 1; }
	.joplin-whiteboard .wb-edge-label { font-size: 12px; text-anchor: middle; dominant-baseline: central; fill: ${theme.color}; paint-order: stroke; stroke: ${theme.backgroundColor}; stroke-width: 6px; stroke-linejoin: round; }
	.joplin-whiteboard .wb-card { box-sizing: border-box; width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; border: 1px solid ${theme.dividerColor}; border-radius: 6px; background: ${theme.backgroundColor}; color: ${theme.color}; font-size: 13px; line-height: 1.4; }
	.joplin-whiteboard .wb-card.-text { padding: 8px; }
	.joplin-whiteboard .wb-card.-image { align-items: center; justify-content: center; }
	.joplin-whiteboard .wb-card > .header { flex-shrink: 0; padding: 4px 8px; border-bottom: 1px solid ${theme.dividerColor}; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.joplin-whiteboard .wb-card > .body { flex: 1; padding: 8px; overflow: hidden; word-break: break-word; }
	.joplin-whiteboard .wb-card > .body.-url { word-break: break-all; }
	.joplin-whiteboard .wb-card > .body.-notice { color: ${theme.colorFaded}; font-style: italic; }
	.joplin-whiteboard .wb-card > .image { max-width: 100%; max-height: 100%; object-fit: contain; }
	.joplin-whiteboard .wb-group { box-sizing: border-box; width: 100%; height: 100%; border: 2px dashed ${theme.dividerColor}; border-radius: 8px; background: rgba(127, 127, 127, 0.06); }
	.joplin-whiteboard .wb-group > .label { margin: 6px 10px; font-size: 12px; font-weight: 600; color: ${theme.colorFaded}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.joplin-whiteboard .wb-md { word-break: break-word; }
	.joplin-whiteboard .wb-md > :first-child { margin-top: 0; }
	.joplin-whiteboard .wb-md > :last-child { margin-bottom: 0; }
	.joplin-whiteboard .wb-md h1 { font-size: 16px; margin: 4px 0; }
	.joplin-whiteboard .wb-md h2 { font-size: 15px; margin: 4px 0; }
	.joplin-whiteboard .wb-md h3 { font-size: 14px; margin: 3px 0; }
	.joplin-whiteboard .wb-md h4, .joplin-whiteboard .wb-md h5, .joplin-whiteboard .wb-md h6 { font-size: 13px; margin: 3px 0; }
	.joplin-whiteboard .wb-md p { margin: 8px 0; }
	.joplin-whiteboard .wb-md ul, .joplin-whiteboard .wb-md ol { margin: 4px 0; padding-left: 20px; }
	.joplin-whiteboard .wb-md img { max-width: 100%; height: auto; }
`;

// Renders a whiteboard as a static, self-contained SVG that scales to the width of the page. Cards are HTML inside
// <foreignObject> so that their Markdown keeps its formatting and text stays selectable in the exported PDF.
const renderToHtml = async (canvas: Canvas, options: RenderToHtmlOptions) => {
	const { theme } = options;
	if (!canvas.nodes.length) return '';

	const bounds = canvasBounds(canvas);
	const nodesById = new Map(canvas.nodes.map(n => [n.id, n]));
	const groups = canvas.nodes.filter(n => n.type === 'group').map(n => renderGroup(n, theme));
	const cards = [];
	for (const n of canvas.nodes) {
		if (n.type !== 'group') cards.push(await renderCard(n, options));
	}
	const markerIds = new Map<string, string>();
	const edges = canvas.edges.map(e => renderEdge(e, nodesById, theme, markerIds));
	const markers = [...markerIds.entries()].map(([color, id]) =>
		`<marker id="${id}" viewBox="-10 -10 20 20" refX="0" refY="0" markerWidth="27" markerHeight="27" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><polyline points="-5,-4 0,0 -5,4 -5,-4" stroke="${escapeHtml(color)}" fill="${escapeHtml(color)}" stroke-linecap="round" stroke-linejoin="round"/></marker>`,
	);

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" class="joplin-whiteboard" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}">`,
		`<style>${styles(theme)}</style>`,
		`<defs>${markers.join('')}</defs>`,
		...groups,
		...edges,
		...cards,
		'</svg>',
	].join('');
};

export default renderToHtml;
