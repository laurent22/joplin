import createTestEditor from '../testing/createTestEditor';
import detailsPlugin from './detailsPlugin';
import originalMarkupPlugin from './originalMarkupPlugin';

describe('detailsPlugin', () => {
	it('should add jop-noMdConv attributes to <details> and <summary>', () => {
		const serializer = new XMLSerializer();
		const markupToHtml = originalMarkupPlugin(node => serializer.serializeToString(node));
		const view = createTestEditor({
			html: `
				<details><summary>Test</summary>
					<p>Test...</p>
				</details>
			`,
			plugins: [detailsPlugin, markupToHtml.plugin],
		});

		// Serialize, then parse to normalize the HTML (for comparison
		// with the HTML serialized by markupToHtml).
		const expectedState = serializer.serializeToString(
			new DOMParser().parseFromString([
				'<details class="jop-noMdConv"><summary class="jop-noMdConv">Test</summary>',
				'<p>Test...</p>',
				'</details>',
			].join(''), 'text/html').querySelector('details'),
		);

		expect(
			markupToHtml.stateToMarkup(view.state).trim(),
		).toBe(expectedState);
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
