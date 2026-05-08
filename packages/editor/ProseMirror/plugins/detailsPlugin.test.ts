import createTestEditor from '../testing/createTestEditor';
import createTestEditorWithSerializer from '../testing/createTestEditorWithSerializer';
import detailsPlugin from './detailsPlugin';

describe('detailsPlugin', () => {
	it('should add jop-noMdConv attributes to <details> and <summary>', () => {
		const { toHtml, normalizeHtml } = createTestEditorWithSerializer({
			html: `
				<details><summary>Test</summary>
					<p>Test...</p>
				</details>
			`,
			plugins: [detailsPlugin],
		});

		expect(toHtml()).toBe(normalizeHtml([
			'<details class="jop-noMdConv"><summary class="jop-noMdConv">Test</summary>',
			'<p>Test...</p>',
			'</details>',
		].join('')));
	});

	it.each([
		{ initialOpen: false },
		{ initialOpen: true },
	])('toggling the details element should update its state (%j)', ({ initialOpen }) => {
		const view = createTestEditor({
			html: `
				<details${initialOpen ? ' open' : ''}><summary>Test summary</summary>
					<p>Test content.</p>
				</details>
			`,
			plugins: [detailsPlugin],
		});

		const details = view.dom.querySelector('details');
		details.open = !initialOpen;
		details.dispatchEvent(new Event('toggle'));

		// The changes to the DOM should be reflected in the editor state
		expect(view.state.doc.toJSON()).toMatchObject({
			content: [
				{
					type: 'details',
					attrs: { open: !initialOpen },
					content: [
						{ type: 'details_summary' },
						{ type: 'paragraph' },
					],
				},
			],
		});
	});
});
