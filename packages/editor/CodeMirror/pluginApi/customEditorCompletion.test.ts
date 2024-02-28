import { EditorState, StateEffect } from '@codemirror/state';
import createEditorControl from '../testUtil/createEditorControl';
import { EditorView } from '@codemirror/view';
import { completeFromList, completionStatus, currentCompletions } from '@codemirror/autocomplete';
import typeText from '../testUtil/typeText';

const waitForShownCompletionsToContain = (editor: EditorView, completionLabels: string[]) => {
	return new Promise<string[]>(resolve => {
		let resolved = false;
		const checkCompletions = (state: EditorState) => {
			if (resolved) {
				return;
			}

			const completions = currentCompletions(state).map(completion => completion.label);

			for (const result of completionLabels) {
				if (!completions.includes(result)) {
					return;
				}
			}

			resolve(completions);
			resolved = true;
		};
		checkCompletions(editor.state);

		editor.dispatch({
			effects: StateEffect.appendConfig.of(EditorState.transactionExtender.of(transaction => {
				checkCompletions(transaction.state);
				return null;
			})),
		});
	});
};

describe('customEditorCompletion', () => {
	test('should not show completions when no completion sources have been registered', async () => {
		const editorControl = createEditorControl('');

		const completion = completeFromList(['test']);
		editorControl.addExtension([
			EditorState.languageData.of(() => [{ autocomplete: completion }]),
		]);

		const editor = editorControl.editor;
		typeText(editor, 'tes');

		// Would be 'pending' or 'active' if trying to autocomplete.
		expect(completionStatus(editor.state)).toBe(null);
	});

	test('should show languageData completions when languageData-based autocomplete is enabled', async () => {
		const editorControl = createEditorControl('');

		const completion = completeFromList(['function']);
		editorControl.addExtension([
			EditorState.languageData.of(() => [{ autocomplete: completion }]),
			editorControl.joplinExtensions.enableLanguageDataAutocomplete.of(true),
		]);

		const editor = editorControl.editor;
		typeText(editor, 'fun');
		await waitForShownCompletionsToContain(editor, ['function']);
	});

	test.each([
		{ useLanguageData: false },
		{ useLanguageData: true },
	])('should show completions from all registered sources (%j)', async ({ useLanguageData }) => {
		const editorControl = createEditorControl('');
		const completion1 = completeFromList(['completion1-test', 'completion1-test2']);
		const completion2 = completeFromList(['completion2-test', 'completion2-test2']);

		const joplinExtensions = editorControl.joplinExtensions;
		editorControl.addExtension([
			joplinExtensions.completionSource(completion1),
			joplinExtensions.completionSource(completion2),
			joplinExtensions.enableLanguageDataAutocomplete.of(useLanguageData),
		]);

		const editor = editorControl.editor;
		typeText(editor, 'com');

		await waitForShownCompletionsToContain(editor, ['completion1-test', 'completion2-test']);
	});
});
