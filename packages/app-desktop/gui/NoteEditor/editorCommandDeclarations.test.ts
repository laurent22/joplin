import WhenClause from '@joplin/lib/services/WhenClause';
import { enabledCondition } from './editorCommandDeclarations';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
			{ textBold: true },
		],
		[
			{
				markdownEditorPaneVisible: false,
			},
			{ textBold: false },
		],
		[
			{
				noteIsReadOnly: true,
			},
			{ textBold: false },
		],
		[
			// In the Markdown editor, but only the viewer is visible
			{
				markdownEditorPaneVisible: false,
				richTextEditorVisible: false,
			},
			{ textBold: false },
		],
		[
			// In the Markdown editor, and the viewer is visible
			{
				markdownEditorPaneVisible: true,
				richTextEditorVisible: false,
			},
			{ textBold: true },
		],
		[
			// In the RT editor
			{
				markdownEditorPaneVisible: false,
				richTextEditorVisible: true,
			},
			{ textBold: true },
		],
		[
			// In the Markdown editor, and the command palette is visible
			{
				markdownEditorPaneVisible: true,
				richTextEditorVisible: false,
				gotoAnythingVisible: true,
				modalDialogVisible: true,
			},
			{ textBold: true },
		],
		[
			// In the Markdown editor, and the command palette is visible
			{
				markdownEditorPaneVisible: true,
				richTextEditorVisible: false,
				gotoAnythingVisible: true,
				modalDialogVisible: true,
			},
			{ textBold: true },
		],
		[
			// Rich Text Editor, HTML note
			{
				markdownEditorPaneVisible: false,
				richTextEditorVisible: true,
				noteIsMarkdown: false,
			},
			{
				textCopy: true,
				textPaste: true,
				textSelectAll: true,
			},
		],
		[
			// Rich Text Editor, read-only note
			{
				markdownEditorPaneVisible: false,
				richTextEditorVisible: true,
				noteIsReadOnly: true,
			},
			{
				textBold: false,
				textPaste: false,

				// TODO: textCopy should be enabled in read-only notes:
				// textCopy: false,
			},
		],
	])('should correctly determine whether command is enabled (case %#)', (context, expectedStates) => {
		const actualStates = [];
		for (const commandName of Object.keys(expectedStates)) {
			const condition = enabledCondition(commandName);
			const wc = new WhenClause(condition);
			const actual = wc.evaluate({ ...baseContext, ...context });
			actualStates.push([commandName, actual]);
		}

		const expectedStatesArray = Object.entries(expectedStates);
		expect(actualStates).toEqual(expectedStatesArray);
	});

});
