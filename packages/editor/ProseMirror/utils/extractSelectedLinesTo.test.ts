import { TextSelection } from 'prosemirror-state';
import createTestEditor from '../testing/createTestEditor';
import extractSelectedLinesTo from './extractSelectedLinesTo';
import schema from '../schema';

describe('extractSelectedLinesTo', () => {
	test.each([
		{
			label: 'should extract a single line containing the cursor to a heading',
			initial: {
				docHtml: '<p>Line 1<br>Line 2<br>Line 3</p>',
				// Put the cursor in the middle of the second line
				cursorPosition: '<Line 1|Line'.length,
			},
			convertTo: { type: schema.nodes.heading, attrs: { level: 1 } },
			expected: {
				// The section of the document containing the cursor should now be a new line
				docJson: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Line 1' }],
					},
					{
						type: 'heading',
						attrs: { level: 1 },
						content: [{ type: 'text', text: 'Line 2' }],
					},
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Line 3' }],
					},
				],
				// The cursor should move to the end of the extracted line
				cursorPosition: '<Line 1><Line 2'.length,
			},
		},
		{
			label: 'should convert an empty paragraph to a heading',
			initial: {
				docHtml: '<p>Line 1</p><p></p><p>Line 3</p>',
				cursorPosition: '<Line 1><'.length,
			},
			convertTo: { type: schema.nodes.heading },
			expected: {
				docJson: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Line 1' }],
					},
					{
						type: 'heading',
					},
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Line 3' }],
					},
				],
				cursorPosition: '<Line 1><'.length,
			},
		},
		{
			label: 'should convert the last line in a paragraph to a heading',
			initial: {
				docHtml: '<p>Line 1<br/></p><p>End</p>',
				cursorPosition: '<Line 1|'.length,
			},
			convertTo: { type: schema.nodes.heading },
			expected: {
				docJson: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Line 1' }],
					},
					{
						type: 'heading',
					},
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'End' }],
					},
				],
				cursorPosition: '<Line 1><'.length,
			},
		},
		{
			label: 'should convert the first line in a paragraph to a heading',
			initial: {
				docHtml: '<p><br/>Line 1</p><p>End</p>',
				cursorPosition: '<'.length,
			},
			convertTo: { type: schema.nodes.heading },
			expected: {
				docJson: [
					{
						type: 'heading',
					},
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Line 1' }],
					},
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'End' }],
					},
				],
				cursorPosition: '<'.length,
			},
		},
	])('$label', ({ initial, expected, convertTo }) => {
		const view = createTestEditor({
			html: initial.docHtml,
		});
		view.dispatch(view.state.tr.setSelection(
			TextSelection.create(
				view.state.doc,
				initial.cursorPosition,
			),
		));

		const { transaction } = extractSelectedLinesTo(
			{ type: convertTo.type, attrs: convertTo.attrs ?? { } },
			view.state.tr,
			view.state.selection,
		);
		view.dispatch(transaction);

		expect(view.state.doc.toJSON()).toMatchObject({
			content: expected.docJson,
		});

		// All of the tests in this group expect a single cursor
		expect(view.state.selection.empty).toBe(true);
		expect(view.state.selection.from).toBe(expected.cursorPosition);
	});

	test('should extract multiple lines in the same paragraph to a new paragraph', () => {
		const view = createTestEditor({
			html: '<p>Line 1<br>Line 2<br>Line 3<br>Line 4</p>',
		});
		view.dispatch(view.state.tr.setSelection(
			TextSelection.create(
				view.state.doc,
				// ...from the middle of the second line...
				'<Line 1|Line'.length,
				// ...to the end of the third line
				'<Line 1|Line 2|Line 3'.length,
			),
		));

		const { transaction } = extractSelectedLinesTo(
			{ type: schema.nodes.paragraph, attrs: { } },
			view.state.tr,
			view.state.selection,
		);

		view.dispatch(transaction);

		// The section of the document containing the cursor should now be a new line
		expect(view.state.doc.toJSON()).toMatchObject({
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Line 1' }],
				},
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Line 2' },
						{ type: 'hard_break' },
						{ type: 'text', text: 'Line 3' },
					],
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Line 4' }],
				},
			],
		});
	});
});
