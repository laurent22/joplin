import { hasWhiteboardFence, parseWhiteboard } from './parse';
import { newWhiteboardBody, serializeWhiteboard } from './serialize';
import { isInternalRef, RefKind, resolveFileRef } from './resolveRef';
import { Canvas } from './jsoncanvas';
import { resolveCanvasColor } from './presetColors';
import { ThemeAppearance } from '../../themes/type';

const sampleCanvas: Canvas = {
	nodes: [
		{ id: 'a', type: 'text', x: 0, y: 0, width: 200, height: 100, text: 'Hello' },
		{ id: 'b', type: 'file', x: 300, y: 0, width: 200, height: 100, file: ':/0123456789abcdef0123456789abcdef' },
		{ id: 'c', type: 'link', x: 0, y: 200, width: 200, height: 100, url: 'https://example.com' },
		{ id: 'g', type: 'group', x: -50, y: -50, width: 600, height: 400, label: 'Phase 1' },
	],
	edges: [
		{ id: 'e1', fromNode: 'a', fromSide: 'right', toNode: 'b', toSide: 'left', label: 'depends on' },
	],
};

describe('whiteboard', () => {
	test('parses a body with a jsoncanvas fence and preserves surrounding text', () => {
		const before = '# My note\n\nSome intro text.\n\n';
		const after = '\nA closing paragraph.\n';
		const body = `${before}\`\`\`jsoncanvas\n${JSON.stringify(sampleCanvas)}\n\`\`\`${after}`;

		const result = parseWhiteboard(body);

		expect(result.hasCanvas).toBe(true);
		expect(result.prefix).toBe(before);
		expect(result.suffix).toBe(after.replace(/^\n/, '')); // leading newline is consumed by the fence terminator
		expect(result.canvas.nodes).toHaveLength(4);
		expect(result.canvas.edges).toHaveLength(1);
	});

	test('hasWhiteboardFence detects fence presence', () => {
		expect(hasWhiteboardFence('plain note')).toBe(false);
		expect(hasWhiteboardFence('```jsoncanvas\n{}\n```')).toBe(true);
		expect(hasWhiteboardFence('# title\n\n```jsoncanvas\n{}\n```\n')).toBe(true);
	});

	test('returns empty canvas with hasCanvas=false when fence content is invalid JSON', () => {
		const body = '```jsoncanvas\nthis is not json\n```';
		const result = parseWhiteboard(body);
		expect(result.hasCanvas).toBe(false);
		expect(result.canvas.nodes).toHaveLength(0);
		expect(result.canvas.edges).toHaveLength(0);
		expect(result.parseError).toMatch(/^Invalid JSON: /);
	});

	test('reports a schema error when the JSON is valid but not a JSONCanvas object', () => {
		const body = '```jsoncanvas\n[]\n```';
		const result = parseWhiteboard(body);
		expect(result.hasCanvas).toBe(false);
		expect(result.parseError).toMatch(/JSONCanvas/);
	});

	test('parseError is null when there is no fence at all', () => {
		expect(parseWhiteboard('').parseError).toBeNull();
		expect(parseWhiteboard('plain note').parseError).toBeNull();
	});

	test('drops invalid nodes and edges that reference unknown nodes', () => {
		const dirty = {
			nodes: [
				{ id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 100, text: 'ok' },
				{ id: 'b', type: 'text', x: 0, y: 0 }, // missing dimensions
				{ type: 'text', x: 0, y: 0, width: 100, height: 100, text: 'no id' },
			],
			edges: [
				{ id: 'e1', fromNode: 'a', toNode: 'a' },
				{ id: 'e2', fromNode: 'a', toNode: 'ghost' },
			],
		};
		const body = `\`\`\`jsoncanvas\n${JSON.stringify(dirty)}\n\`\`\``;
		const result = parseWhiteboard(body);
		expect(result.canvas.nodes.map(n => n.id)).toEqual(['a']);
		expect(result.canvas.edges.map(e => e.id)).toEqual(['e1']);
	});

	test('round-trips: serialize then parse yields the same canvas', () => {
		const body = serializeWhiteboard('', sampleCanvas);
		const result = parseWhiteboard(body);
		expect(result.hasCanvas).toBe(true);
		expect(result.canvas).toEqual(sampleCanvas);
	});

	test('serialize replaces an existing fence in place and preserves prefix/suffix', () => {
		const original = `Intro\n\n\`\`\`jsoncanvas\n${JSON.stringify({ nodes: [], edges: [] })}\n\`\`\`\n\nOutro\n`;
		const updated = serializeWhiteboard(original, sampleCanvas);
		const result = parseWhiteboard(updated);
		expect(result.canvas).toEqual(sampleCanvas);
		expect(result.prefix).toBe('Intro\n\n');
		expect(updated.endsWith('Outro\n')).toBe(true);
	});

	test('serialize appends a fence when none exists', () => {
		const before = '# Title\n\nSome content.';
		const updated = serializeWhiteboard(before, sampleCanvas);
		expect(updated.startsWith(before)).toBe(true);
		expect(hasWhiteboardFence(updated)).toBe(true);
	});

	test('newWhiteboardBody produces a parseable empty canvas', () => {
		const body = newWhiteboardBody();
		const result = parseWhiteboard(body);
		expect(result.hasCanvas).toBe(true);
		expect(result.canvas.nodes).toEqual([]);
		expect(result.canvas.edges).toEqual([]);
	});

	test('round-trips edge fromEnd / toEnd / sides without losing or flipping them', () => {
		const canvas: Canvas = {
			nodes: [
				{ id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 100, text: 'a' },
				{ id: 'b', type: 'text', x: 200, y: 0, width: 100, height: 100, text: 'b' },
			],
			edges: [
				{ id: 'forward', fromNode: 'a', toNode: 'b', toEnd: 'arrow' },
				{ id: 'backward', fromNode: 'a', toNode: 'b', fromEnd: 'arrow', toEnd: 'none' },
				{ id: 'both', fromNode: 'a', toNode: 'b', fromEnd: 'arrow', toEnd: 'arrow' },
				{ id: 'sided', fromNode: 'a', toNode: 'b', fromSide: 'right', toSide: 'left' },
			],
		};
		const body = serializeWhiteboard('', canvas);
		const result = parseWhiteboard(body);
		expect(result.hasCanvas).toBe(true);
		expect(result.canvas.edges).toEqual(canvas.edges);
	});

	test('preserves group nodes through parse + serialize', () => {
		// Joplin's editor doesn't render group nodes but must not silently
		// drop them on save — other tools may contain them.
		const canvas: Canvas = {
			nodes: [
				{ id: 'g', type: 'group', x: -50, y: -50, width: 400, height: 300, label: 'Phase 1', background: '#eee' },
				{ id: 't', type: 'text', x: 0, y: 0, width: 100, height: 60, text: 'inside' },
			],
			edges: [],
		};
		const body = serializeWhiteboard('', canvas);
		const result = parseWhiteboard(body);
		expect(result.hasCanvas).toBe(true);
		expect(result.canvas.nodes).toEqual(canvas.nodes);
	});

	test.each([
		[':/0123456789abcdef0123456789abcdef', RefKind.Resource, '0123456789abcdef0123456789abcdef'],
		['https://example.com/foo.pdf', RefKind.External, 'https://example.com/foo.pdf'],
		['Notes/Foo.md', RefKind.External, 'Notes/Foo.md'],
	])('resolveFileRef classifies %s', (value, kind, id) => {
		const r = resolveFileRef(value);
		expect(r.kind).toBe(kind);
		expect(r.id).toBe(id);
	});

	test('resolveFileRef respects kindHint for internal refs', () => {
		const r = resolveFileRef(':/0123456789abcdef0123456789abcdef', RefKind.Note);
		expect(r.kind).toBe(RefKind.Note);
	});

	test('isInternalRef matches only proper :/ id strings', () => {
		expect(isInternalRef(':/0123456789abcdef0123456789abcdef')).toBe(true);
		expect(isInternalRef(':/short')).toBe(false);
		expect(isInternalRef('not internal')).toBe(false);
	});

	test.each([
		[undefined, ThemeAppearance.Light, undefined],
		// Preset IDs resolve to different hex values per theme.
		['1', ThemeAppearance.Light, '#d64545'],
		['1', ThemeAppearance.Dark, '#e57373'],
		// Arbitrary hex strings (the spec's escape hatch) pass through untouched.
		['#abcdef', ThemeAppearance.Light, '#abcdef'],
		['#abcdef', ThemeAppearance.Dark, '#abcdef'],
		// Unknown non-preset strings also pass through — browsers will fall
		// back to their default handling for unrecognised colours.
		['not-a-preset', ThemeAppearance.Light, 'not-a-preset'],
	])('resolveCanvasColor(%s, %s) → %s', (input, appearance, expected) => {
		expect(resolveCanvasColor(input, appearance, 'stroke')).toBe(expected);
	});

	test('preset canvas color round-trips through serialize + parse on both nodes and edges', () => {
		const colored: Canvas = {
			nodes: [
				{ id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 100, text: 'a', color: '3' },
				{ id: 'b', type: 'text', x: 200, y: 0, width: 100, height: 100, text: 'b' },
			],
			edges: [
				{ id: 'e', fromNode: 'a', toNode: 'b', color: '4' },
			],
		};
		const body = serializeWhiteboard('', colored);
		const result = parseWhiteboard(body);
		expect(result.hasCanvas).toBe(true);
		expect(result.canvas.nodes.find(n => n.id === 'a')?.color).toBe('3');
		expect(result.canvas.edges[0].color).toBe('4');
	});
});
