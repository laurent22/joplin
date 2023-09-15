/**
 * @jest-environment jsdom
 */

import { EditorKeymap, EditorLanguageType, EditorSettings } from '../types';
import createEditor from './createEditor';
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
		useExternalSearch: true,
		readOnly: false,
		automatchBraces: false,
		ignoreModifiers: false,

		keymap: EditorKeymap.Default,
		language: EditorLanguageType.Markdown,
		themeData,
	};

	return editorSettings;
};

describe('createEditor', () => {
	beforeAll(() => {
		jest.useFakeTimers();
	});

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
		const editor = createEditor(document.body, {
			initialText,
			settings: editorSettings,
			onEvent: _event => {},
			onLogMessage: _message => {},
		});

		// Force the generation of the syntax tree now.
		forceParsing(editor.editor);

		const headerLine = document.body.querySelector('.cm-headerLine')!;
		expect(headerLine.textContent).toBe(headerLineText);

		// CodeMirror nests the tag that styles the header within .cm-headerLine:
		//  <div class='cm-headerLine'><span class='someclass'>Testing...</span></div>
		const headerLineContent = document.body.querySelectorAll('.cm-headerLine > span');
		expect(headerLineContent.length).toBeGreaterThanOrEqual(1);
		for (const part of headerLineContent) {
			const style = getComputedStyle(part);
			expect(style.borderBottom).not.toBe('');
			expect(style.fontSize).toBe('1.6em');
		}

		// Cleanup
		editor.remove();
	});

	it('should support loading plugins', async () => {
		const initialText = '# Test\nThis is a test.';
		const editorSettings = createEditorSettings(Setting.THEME_LIGHT);

		const editor = createEditor(document.body, {
			initialText,
			settings: editorSettings,
			onEvent: _event => {},
			onLogMessage: _message => {},
		});

		const getContentScriptJs = jest.fn(async () => {
			return `
				exports.default = context => {
					context.postMessage(context.pluginId);
				};
			`;
		});
		const postMessageHandler = jest.fn();

		const testPlugin1 = {
			pluginId: 'a.plugin.id',
			contentScriptId: 'a.plugin.id.contentScript',
			contentScriptJs: getContentScriptJs,
			postMessageHandler,
		};
		const testPlugin2 = {
			pluginId: 'another.plugin.id',
			contentScriptId: 'another.plugin.id.contentScript',
			contentScriptJs: getContentScriptJs,
			postMessageHandler,
		};

		// Should be able to load a plugin
		await editor.setPlugins([
			testPlugin1,
		]);

		// Allow plugins to load
		await jest.runAllTimersAsync();

		// Because plugin loading is done by adding script elements to the document,
		// we test for the presence of these script elements, rather than waiting for
		// them to run.
		expect(document.querySelectorAll('#joplin-plugin-scripts-container')).toHaveLength(1);

		// Only one script should be present.
		const scriptContainer = document.querySelector('#joplin-plugin-scripts-container');
		expect(scriptContainer.querySelectorAll('script')).toHaveLength(1);

		// Adding another plugin should add another script element
		await editor.setPlugins([
			testPlugin2, testPlugin1,
		]);
		await jest.runAllTimersAsync();

		// There should now be script elements for each plugin
		expect(scriptContainer.querySelectorAll('script')).toHaveLength(2);

		// Removing the editor should remove the script container
		editor.remove();
		expect(document.querySelectorAll('#joplin-plugin-scripts-container')).toHaveLength(0);
	});
});
