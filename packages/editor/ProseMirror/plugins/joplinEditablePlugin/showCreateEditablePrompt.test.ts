import createTestEditor from '../../testing/createTestEditor';
import joplinEditablePlugin from './joplinEditablePlugin';
import { Second } from '@joplin/utils/time';
import showCreateEditablePrompt from './showCreateEditablePrompt';
import mockEditorApi from '../../testing/mockEditorApi';

const createEditor = (html: string) => {
	const editorApi = mockEditorApi();
	const editor = createTestEditor({
		plugins: [joplinEditablePlugin, editorApi.plugin],
		html,
	});
	editorApi.setup(editor);

	return editor;
};

const findEditorDialog = () => {
	const dialog = document.querySelector('dialog.joplin-dialog');
	if (!dialog) {
		return null;
	}

	const editor = dialog.querySelector('textarea');
	const submitButton = dialog.querySelector('button');

	return {
		editor,
		submitButton,
	};
};

describe('showCreateEditorPrompt', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		document.body.replaceChildren();
	});

	test('should allow creating a new code block', async () => {
		const editor = createEditor('');
		showCreateEditablePrompt('```\ntest\n```', false)(editor.state, editor.dispatch, editor);

		const dialog = findEditorDialog();
		dialog.submitButton.click();

		await jest.advanceTimersByTimeAsync(Second);

		expect(editor.state.doc.toJSON()).toMatchObject({
			content: [{
				type: 'joplinEditableBlock',
				attrs: {
					source: '```\ntest\n```',
				},
			}],
		});
	});
});
