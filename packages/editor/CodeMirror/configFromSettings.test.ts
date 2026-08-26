/**
 * @jest-environment jsdom
 */

import { EditorSelection } from '@codemirror/state';
import Setting from '@joplin/lib/models/Setting';
import { expect, describe, it } from '@jest/globals';
import createEditor from './createEditor';
import createEditorSettings from '../testing/createEditorSettings';
import typeText from './testing/typeText';

const createControl = (initialText: string) => {
	const settings = createEditorSettings(Setting.THEME_LIGHT);
	settings.automatchBraces = true;
	return createEditor(document.body, {
		initialText,
		initialNoteId: '',
		settings,
		onEvent: _event => {},
		onLogMessage: _message => {},
		onPasteFile: null,
		resolveImageSrc: src => Promise.resolve(src),
		onLocalize: input => input,
	});
};

describe('configFromSettings', () => {
	it('should not auto-close backticks when closing a fenced block', async () => {
		// Regression test for https://github.com/laurent22/joplin/issues/12569 --
		// with the cursor after two backticks and nothing selected, the third
		// backtick closes the fence and must not be auto-paired.
		const control = createControl('``');
		const editor = control.editor;
		editor.dispatch({ selection: EditorSelection.cursor(2) });

		typeText(editor, '`');

		expect(editor.state.doc.toString()).toBe('```');
	});

	it('should wrap a selection in a fenced code block when typing three backticks', async () => {
		const control = createControl('hello');
		const editor = control.editor;
		editor.dispatch({ selection: EditorSelection.range(0, 'hello'.length) });

		typeText(editor, '`');
		typeText(editor, '`');
		typeText(editor, '`');

		expect(editor.state.doc.toString()).toBe('```hello```');
	});
});
