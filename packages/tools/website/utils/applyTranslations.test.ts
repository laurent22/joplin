import applyTranslations from './applyTranslations';

describe('applyTranslations', () => {

	it('should apply translations', async () => {
		const tests = [
			{
				html: '<div><span translate>Translate me</span></div>',
				translations: {
					'Translate me': 'Traduis moi',
				},
				htmlTranslated: '<div>\n<span translate>\nTraduis moi\n</span>\n</div>',
			},
			{
				html: '<div><span translate>Missing translation</span></div>',
				translations: {},
				htmlTranslated: '<div>\n<span translate>\nMissing translation\n</span>\n</div>',
			},
			{
				html: '<h1 translate class="text-center">\nFree your <span class="frame-bg frame-bg-blue">notes</span>\n</h1>',
				translations: {
					'Free your <span class="frame-bg frame-bg-blue">notes</span>': 'Libérez vos <span class="frame-bg frame-bg-blue">notes</span>',
				},
				htmlTranslated: '<h1 translate class="text-center">\nLibérez vos <span class="frame-bg frame-bg-blue">notes</span>\n</h1>',
			},
		];

		for (const test of tests) {
			const actual = applyTranslations(test.html, test.translations);
			expect(actual).toEqual(test.htmlTranslated);
		}
	});

});
