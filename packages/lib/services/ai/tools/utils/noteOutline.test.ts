import { noteOutline, noteSections, renderOutline, resolveSection } from './noteOutline';

describe('noteOutline', () => {

	test('should build positional paths reflecting nesting', () => {
		const body = [
			'Preamble text',
			'',
			'# One',
			'',
			'## One A',
			'',
			'## One B',
			'',
			'### One B i',
			'',
			'# Two',
			'',
		].join('\n');

		expect(noteOutline(body).map(e => [e.path, e.heading])).toEqual([
			['0', ''],
			['1', 'One'],
			['1.1', 'One A'],
			['1.2', 'One B'],
			['1.2.1', 'One B i'],
			['2', 'Two'],
		]);
	});

	test.each([
		['### deep\n\n# top\n\n## mid\n', ['1', '2', '2.1']],
		['# a\n\n### x\n\n## y\n\n# b\n', ['1', '1.1', '1.2', '2']],
		['## a\n\n## b\n\n# c\n\n## d\n', ['1', '2', '3', '3.1']],
	])('should keep paths unique when heading levels are irregular (%#)', (body, expected) => {
		expect(noteOutline(body).map(e => e.path)).toEqual(expected);
	});

	test('should omit the preamble entry when there is no content before the first heading', () => {
		const outline = noteOutline('# One\n\ntext\n');
		expect(outline.map(e => e.path)).toEqual(['1']);
	});

	test('should return a single section covering the whole body when there are no headings', () => {
		const body = 'Just some text\n\nand more.\n';
		expect(noteOutline(body)).toEqual([{ path: '0', heading: '', chars: body.length }]);
	});

	test('should include subsections in a section size and extent', () => {
		const body = '# One\n\nabc\n\n## One A\n\ndef\n\n# Two\n\nxyz\n';
		const sections = noteSections(body);
		const one = sections.find(s => s.path === '1');
		expect(body.slice(one.start, one.end)).toBe('# One\n\nabc\n\n## One A\n\ndef\n\n');
		expect(noteOutline(body).find(e => e.path === '1').chars).toBe(one.end - one.start);
	});

	test('should ignore heading-like lines inside code blocks', () => {
		const body = '# Real\n\n```\n# Fake\n```\n';
		expect(noteOutline(body).map(e => e.heading)).toEqual(['Real']);
	});

	test('should detect setext headings', () => {
		const body = 'Title\n=====\n\ntext\n\nSub\n---\n\nmore\n';
		expect(noteOutline(body).map(e => [e.path, e.heading])).toEqual([['1', 'Title'], ['1.1', 'Sub']]);
	});

	test.each([
		['1.2', 'Target'],
		['Target', 'Target'],
		['  target  ', 'Target'],
	])('should resolve section address %s', (address, expectedHeading) => {
		const body = '# One\n\n## Other\n\n## Target\n\ncontent\n';
		const resolution = resolveSection(body, address);
		expect(resolution.error).toBeNull();
		expect(resolution.section.heading).toBe(expectedHeading);
	});

	test.each([
		['# a\tb\n', 'a b'],
		['a\nb\n===\n', 'a b'],
		['#    spaced   out   \n', 'spaced out'],
	])('should collapse whitespace in headings (%#)', (body, expected) => {
		expect(noteOutline(body)[0].heading).toBe(expected);
		// The collapsed form must still resolve, since that is what the model sees.
		expect(resolveSection(body, expected).section.path).toBe('1');
	});

	test('should render the outline as tab-separated lines', () => {
		const body = '# One\n\nabc\n\n## One A\n\ndef\n';
		expect(renderOutline(body)).toBe([
			'path\tchars\theading',
			'1\t26\tOne',
			'1.1\t14\tOne A',
		].join('\n'));
	});

	test('should error and list candidates when several headings match', () => {
		const body = '# Desktop\n\n## Build\n\n# Mobile\n\n## Build\n';
		const resolution = resolveSection(body, 'Build');
		expect(resolution.section).toBeNull();
		expect(resolution.error).toContain('1.1 (under "Desktop")');
		expect(resolution.error).toContain('2.1 (under "Mobile")');
	});

	test.each([
		['9.9'],
		['No such heading'],
	])('should error on unresolvable address %s', (address) => {
		const resolution = resolveSection('# One\n\ntext\n', address);
		expect(resolution.section).toBeNull();
		expect(resolution.error).toBeTruthy();
	});

});
