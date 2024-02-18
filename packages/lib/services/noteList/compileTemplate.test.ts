import { expectThrow } from '../../testing/test-utils';
import compileTemplate from './compileTemplate';

describe('compileTemplate', () => {

	it('should compile a template', () => {
		const actual = compileTemplate('', '<span>{{value}}</span>', {}, [
			{
				name: 'note.is_todo',
				width: 20,
			},
			{
				name: 'note.user_updated_time:display',
				width: 100,
			},
			{
				name: 'note.titleHtml',
				width: 0,
			},
		]);

		expect(actual).toContain('<span>{{note.is_todo}}</span>');
		expect(actual).toContain('<span>{{note.user_updated_time:display}}</span>');
		expect(actual).toContain('<span>{{{note.titleHtml}}}</span>');

		const widthInfo = actual.match(/(width: (\d+)px|flex: 1)/g);
		expect(widthInfo).toEqual(['width: 20px', 'width: 100px', 'flex: 1']);

	});

	it('should use per-value templates', () => {
		const actual = compileTemplate('', '<span>{{value}}</span>', {
			'note.is_todo': '<span>[x]</span>',
		}, [
			{
				name: 'note.is_todo',
				width: 20,
			},
			{
				name: 'note.titleHtml',
				width: 0,
			},
		]);

		expect(actual).not.toContain('<span>{{note.is_todo}}</span>');
		expect(actual).toContain('<span>[x]</span>');
		expect(actual).toContain('<span>{{{note.titleHtml}}}</span>');
	});

	it('should wrap cell items', () => {
		const actual = compileTemplate('<div class="row">{{{cells}}}</div>', '<span>{{value}}</span>', {}, [
			{
				name: 'note.titleHtml',
				width: 0,
			},
		]);

		expect(actual.startsWith('<div class="row">')).toBe(true);
		expect(actual.endsWith('</div>')).toBe(true);
		expect(actual).not.toContain('{{{cells}}}');
		expect(actual).toContain('{{{note.titleHtml}}}');
	});

	it('should throw an error if the root template does not contain a {{{cells}}} tag', async () => {
		await expectThrow(async () => compileTemplate('<div class="row">{{cells}}</div>', '{{value}}', {}, [
			{
				name: 'note.titleHtml',
				width: 0,
			},
		]));

		await expectThrow(async () => compileTemplate('<div class="row">{{{wrongcells}}}</div>', '{{value}}', {}, [
			{
				name: 'note.titleHtml',
				width: 0,
			},
		]));

		await expectThrow(async () => compileTemplate('<div class="row">{{{bla}}}</div>', '{{value}}', {}, [
			{
				name: 'note.titleHtml',
				width: 0,
			},
		]));
	});

});
