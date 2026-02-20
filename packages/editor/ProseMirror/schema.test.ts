import createTestEditorWithSerializer from './testing/createTestEditorWithSerializer';

describe('ProseMirror/schema', () => {
	it('should preserve style, border and class attributes on table elements', () => {
		const { toHtml } = createTestEditorWithSerializer({
			html: `
				<table border="1" style="background-color: rgb(248, 202, 198);" class="jop-noMdConv">
					<tbody>
						<tr><td>Test</td></tr>
					</tbody>
				</table>
			`,
			plugins: [],
		});

		const output = toHtml();
		expect(output).toContain('background-color: rgb(248, 202, 198)');
		expect(output).toContain('border="1"');
		expect(output).toContain('class="jop-noMdConv"');
	});
});
