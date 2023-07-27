import { EditorSettings } from '../types';
import { initCodeMirror } from './CodeMirror';
import { themeStyle } from '@joplin/lib/theme';
import Setting from '@joplin/lib/models/Setting';
import { forceParsing } from '@codemirror/language';
import loadLangauges from './testUtil/loadLanguages';

import { expect, describe, it } from '@jest/globals';


const createEditorSettings = (themeId: number) => {
	const themeData = themeStyle(themeId);
	const editorSettings: EditorSettings = {
		katexEnabled: true,
		spellcheckEnabled: true,
		readOnly: false,
		themeId,
		themeData,
	};

	return editorSettings;
};

describe('CodeMirror', () => {
	// This checks for a regression -- occasionally, when updating packages,
	// syntax highlighting in the CodeMirror editor stops working. This is usually
	// fixed by
	// 1. removing all `@codemirror/` and `@lezer/` dependencies from yarn.lock,
	// 2. upgrading all CodeMirror packages to the latest versions in package.json, and
	// 3. re-running `yarn install`.
	//
	// See https://github.com/laurent22/joplin/issues/7253
	it('should give headings a different style', async () => {
		const headerLineText = '# Testing...';
		const initialText = `${headerLineText}\nThis is a test.`;
		const editorSettings = createEditorSettings(Setting.THEME_LIGHT);

		await loadLangauges();
		const editor = initCodeMirror(document.body, initialText, editorSettings);

		// Force the generation of the syntax tree now.
		forceParsing(editor.editor);

		// CodeMirror nests the tag that styles the header within .cm-headerLine:
		//  <div class='cm-headerLine'><span class='someclass'>Testing...</span></div>
		const headerLineContent = document.body.querySelector('.cm-headerLine > span')!;


		expect(headerLineContent.textContent).toBe(headerLineText);

		const style = getComputedStyle(headerLineContent);
		expect(style.borderBottom).not.toBe('');
		expect(style.fontSize).toBe('1.6em');
	});
});
