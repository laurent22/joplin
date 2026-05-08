import createTestEditorWithSerializer from '../testing/createTestEditorWithSerializer';

const testImageUrl = 'data:image/svg+xml;utf8,some-icon-here';

describe('imagePlugin', () => {
	test('should preserve image ALT text on save', () => {
		const { toHtml, normalizeHtml } = createTestEditorWithSerializer({
			html: `
				<img src="${testImageUrl}" alt="Test"/>
			`,
			plugins: [],
		});

		expect(toHtml()).toBe(normalizeHtml(`<p><img src="${testImageUrl}" alt="Test"/></p>`));
	});
});
