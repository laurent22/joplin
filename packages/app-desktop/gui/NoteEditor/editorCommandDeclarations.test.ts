import WhenClause from '@joplin/lib/services/WhenClause';
import { enabledCondition } from './editorCommandDeclarations';

const baseContext: Record<string, any> = {
	modalDialogVisible: false,
	gotoAnythingVisible: false,
	markdownEditorPaneVisible: true,
	oneNoteSelected: true,
	noteIsMarkdown: true,
	noteIsReadOnly: false,
	richTextEditorVisible: false,
};

describe('editorCommandDeclarations', () => {

	test.each([
		[
			{},
			true,
		],
		[
			{
				markdownEditorPaneVisible: false,
			},
			false,
		],
		[
			{
				noteIsReadOnly: true,
			},
			false,
		],
		[
			// In the Markdown editor, but only the viewer is visible
			{
				markdownEditorPaneVisible: false,
				richTextEditorVisible: false,
			},
			false,
		],
		[
			// In the Markdown editor, and the viewer is visible
			{
				markdownEditorPaneVisible: true,
				richTextEditorVisible: false,
			},
			true,
		],
		[
			// In the RT editor
			{
				markdownEditorPaneVisible: false,
				richTextEditorVisible: true,
			},
			true,
		],
	])('should create the enabledCondition', (context: Record<string, any>, expected: boolean) => {
		const condition = enabledCondition('textBold');
		const wc = new WhenClause(condition);
		const actual = wc.evaluate({ ...baseContext, ...context });
		expect(actual).toBe(expected);
	});

});
