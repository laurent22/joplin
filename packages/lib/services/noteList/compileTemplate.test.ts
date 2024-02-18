import compileTemplate from './compileTemplate';

describe('useRenderedNote', () => {

	it('should compile a template', () => {
		const actual = compileTemplate('<span>{{value}}</span>', {}, [
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
		const actual = compileTemplate('<span>{{value}}</span>', {
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

});
