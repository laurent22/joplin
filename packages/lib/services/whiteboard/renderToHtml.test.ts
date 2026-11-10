import renderToHtml, { canvasBounds, edgeGeometry, RenderToHtmlOptions } from './renderToHtml';
import { Canvas, CanvasEdge, CanvasNode } from './jsoncanvas';
import { ThemeAppearance } from '../../themes/type';

const options = (overrides: Partial<RenderToHtmlOptions> = {}): RenderToHtmlOptions => ({
	theme: { appearance: ThemeAppearance.Light, color: '#000000', colorFaded: '#777777', backgroundColor: '#ffffff', dividerColor: '#dddddd' },
	renderMarkdown: async markdown => `<p>${markdown}</p>`,
	renderFileCard: async node => ({ header: 'File', bodyHtml: node.file }),
	...overrides,
});

const card = (id: string, x: number, y: number): CanvasNode => ({ id, type: 'text', x, y, width: 100, height: 50, text: id });

describe('whiteboard/renderToHtml', () => {
	test('should return nothing for an empty board', async () => {
		expect(await renderToHtml({ nodes: [], edges: [] }, options())).toBe('');
	});

	test('should size the board to its nodes plus a margin', () => {
		expect(canvasBounds({ nodes: [card('a', -100, 20), card('b', 300, 400)], edges: [] })).toEqual({ x: -140, y: -20, width: 580, height: 510 });
	});

	test.each<[string, Partial<CanvasEdge>, string]>([
		['explicit sides', { fromSide: 'right', toSide: 'left' }, 'M100,25 C150,25 150,25 200,25'],
		['sides facing each other when unset', {}, 'M100,25 C150,25 150,25 200,25'],
		['a curve that loops back', { fromSide: 'left', toSide: 'right' }, 'M0,25 C-108.25,25 408.25,25 300,25'],
	])('should draw an edge with %s', (_label, sides, expectedPath) => {
		const edge: CanvasEdge = { id: 'e', fromNode: 'a', toNode: 'b', ...sides };
		expect(edgeGeometry(edge, card('a', 0, 0), card('b', 200, 0)).path).toBe(expectedPath);
	});

	test('should put groups behind edges and edges behind cards', async () => {
		const canvas: Canvas = {
			nodes: [card('a', 0, 0), { id: 'g', type: 'group', x: -50, y: -50, width: 400, height: 200, label: 'Phase 1' }, card('b', 200, 0)],
			edges: [{ id: 'e', fromNode: 'a', toNode: 'b' }],
		};
		const html = await renderToHtml(canvas, options());
		const positions = ['Phase 1', 'class="wb-edge"', '<p>a</p>', '<p>b</p>'].map(s => html.indexOf(s));
		expect(positions.every(p => p >= 0)).toBe(true);
		expect([...positions].sort((x, y) => x - y)).toEqual(positions);
	});

	test('should only draw the arrowheads that the edge has', async () => {
		const canvas = (edge: Partial<CanvasEdge>): Canvas => ({ nodes: [card('a', 0, 0), card('b', 200, 0)], edges: [{ id: 'e', fromNode: 'a', toNode: 'b', ...edge }] });
		const none = await renderToHtml(canvas({ fromEnd: 'none', toEnd: 'none' }), options());
		const both = await renderToHtml(canvas({ fromEnd: 'arrow', toEnd: 'arrow' }), options());
		expect(none).not.toContain('marker-start');
		expect(none).not.toContain('marker-end');
		expect(both).toContain('marker-start=');
		expect(both).toContain('marker-end=');
	});

	test('should use the preset and custom colours of nodes and edges', async () => {
		const html = await renderToHtml({
			nodes: [{ ...card('a', 0, 0), color: '1' }, { ...card('b', 200, 0), color: '#123456' }],
			edges: [{ id: 'e', fromNode: 'a', toNode: 'b', color: '4' }],
		}, options());
		expect(html).toContain('border-color: #d64545; background: #fde5e5');
		expect(html).toContain('border-color: #123456; background: #123456');
		expect(html).toContain('stroke="#3a9a4a"');
	});

	test('should escape text that does not come from the Markdown renderer', async () => {
		const html = await renderToHtml({
			nodes: [
				{ id: 'l', type: 'link', x: 0, y: 0, width: 100, height: 50, url: 'https://example.com/?a="b"&c=<d>' },
				{ id: 'g', type: 'group', x: 0, y: 100, width: 100, height: 50, label: '<script>alert(1)</script>' },
				card('a', 200, 0),
			],
			edges: [{ id: 'e', fromNode: 'l', toNode: 'a', label: '<b>label</b>' }],
		}, options());
		expect(html).not.toMatch(/<script|<b>|<d>|"b"/);
		expect(html).toContain('href="https://example.com/?a=&quot;b&quot;&amp;c=&lt;d&gt;"');
	});

	test.each([
		['https://example.com', true],
		['mailto:someone@example.com', true],
		['javascript:alert(1)', false],
		['data:text/html,<script>alert(1)</script>', false],
	])('should only make web link cards clickable (%s)', async (url, isClickable) => {
		const html = await renderToHtml({ nodes: [{ id: 'l', type: 'link', x: 0, y: 0, width: 100, height: 50, url }], edges: [] }, options());
		expect(html.includes('<a href=')).toBe(isClickable);
		expect(html).not.toContain('<script>');
	});

	test('should render images and notices from file cards', async () => {
		const html = await renderToHtml({ nodes: [{ id: 'f', type: 'file', x: 0, y: 0, width: 100, height: 50, file: ':/x' }, { id: 'n', type: 'file', x: 0, y: 100, width: 100, height: 50, file: ':/y' }], edges: [] }, options({
			renderFileCard: async node => node.file === ':/x' ? { imageSrc: '_resources/x.png', header: 'photo' } : { header: 'Linked item', bodyHtml: 'Deleted', isNotice: true },
		}));
		expect(html).toContain('<img class="image" src="_resources/x.png" alt="photo"/>');
		expect(html).toContain('class="body wb-md -notice">Deleted</div>');
	});
});
