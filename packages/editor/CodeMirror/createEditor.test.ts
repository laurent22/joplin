/**
 * @jest-environment jsdom
 */

import createEditor from './createEditor';
import Setting from '@joplin/lib/models/Setting';
import { forceParsing } from '@codemirror/language';
import loadLanguages from './testUtil/loadLanguages';

import { expect, describe, it } from '@jest/globals';
import createEditorSettings from './testUtil/createEditorSettings';


describe('createEditor', () => {
	beforeAll(() => {
		jest.useFakeTimers();

		for (const scriptContainer of document.querySelectorAll('#joplin-plugin-scripts-container')) {
			scriptContainer.remove();
		}
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

		await loadLanguages();
		const editor = createEditor(document.body, {
			initialText,
			initialNoteId: '',
			settings: editorSettings,
			onEvent: _event => {},
			onLogMessage: _message => {},
			onPasteFile: null,
		});

		// Force the generation of the syntax tree now.
		forceParsing(editor.editor);

		const headerLine = document.body.querySelector('.cm-headerLine')!;
		expect(headerLine.textContent).toBe(headerLineText);
		expect(getComputedStyle(headerLine).fontSize).toBe('1.6em');

		// CodeMirror nests the tag that styles the header within .cm-headerLine:
		//  <div class='cm-headerLine'><span class='someclass'>Testing...</span></div>
		const headerLineContent = document.body.querySelectorAll('.cm-headerLine > span');
		expect(headerLineContent.length).toBeGreaterThanOrEqual(1);

		// Cleanup
		editor.remove();
	});

	it('should support loading plugins', async () => {
		const initialText = '# Test\nThis is a test.';
		const editorSettings = createEditorSettings(Setting.THEME_LIGHT);

		const editor = createEditor(document.body, {
			initialText,
			initialNoteId: '',
			settings: editorSettings,
			onEvent: _event => {},
			onLogMessage: _message => {},
			onPasteFile: null,
		});

		const getContentScriptJs = jest.fn(async () => {
			return `
				exports.default = context => {
					context.postMessage(context.pluginId);
					return {};
				};
			`;
		});
		const postMessageHandler = jest.fn();

		const testPlugin1 = {
			pluginId: 'a.plugin.id',
			contentScriptId: 'a.plugin.id.contentScript',
			loadCssAsset: async (_name: string) => '* { color: red; }',
			contentScriptJs: getContentScriptJs,
			postMessageHandler,
		};
		const testPlugin2 = {
			pluginId: 'another.plugin.id',
			contentScriptId: 'another.plugin.id.contentScript',
			loadCssAsset: async (_name: string) => '...',
			contentScriptJs: getContentScriptJs,
			postMessageHandler,
		};

		// Should be able to load a plugin
		await editor.setContentScripts([
			testPlugin1,
		]);

		// Allow plugins to load
		await jest.runAllTimersAsync();

		// Because plugin loading is done by adding script elements to the document,
		// we test for the presence of these script elements, rather than waiting for
		// them to run.
		expect(document.querySelectorAll('#joplin-plugin-scripts-container script')).toHaveLength(1);

		// Only one script should be present.
		const scriptContainer = document.querySelector('#joplin-plugin-scripts-container');
		expect(scriptContainer.querySelectorAll('script')).toHaveLength(1);

		// Adding another plugin should add another script element
		await editor.setContentScripts([
			testPlugin2, testPlugin1,
		]);
		await jest.runAllTimersAsync();

		// There should now be script elements for each plugin
		expect(scriptContainer.querySelectorAll('script')).toHaveLength(2);

		// Removing the editor should remove the script container
		editor.remove();
		expect(document.querySelectorAll('#joplin-plugin-scripts-container script')).toHaveLength(0);
	});

	it('should support multiple content scripts from the same plugin', async () => {
		const initialText = '# Test\nThis is a test.';
		const editorSettings = createEditorSettings(Setting.THEME_LIGHT);

		const editor = createEditor(document.body, {
			initialText,
			initialNoteId: '',
			settings: editorSettings,
			onEvent: _event => {},
			onLogMessage: _message => {},
			onPasteFile: null,
		});

		const getContentScriptJs = jest.fn(async () => {
			return `
				exports.default = context => {
					context.postMessage(context.pluginId);
					return {};
				};
			`;
		});
		const postMessageHandler = jest.fn();

		const pluginId = 'a.plugin.id';
		const testPlugin1 = {
			pluginId,
			contentScriptId: 'a.plugin.id.contentScript',
			loadCssAsset: async (_name: string) => '',
			contentScriptJs: getContentScriptJs,
			postMessageHandler,
		};
		const testPlugin2 = {
			pluginId,
			contentScriptId: 'another.plugin.id.contentScript',
			loadCssAsset: async (_name: string) => '',
			contentScriptJs: getContentScriptJs,
			postMessageHandler,
		};

		await editor.setContentScripts([
			testPlugin1, testPlugin2,
		]);

		// Allows plugins to load
		await jest.runAllTimersAsync();

		// Should be one script container for each plugin
		expect(document.querySelectorAll('#joplin-plugin-scripts-container script')).toHaveLength(2);
	});

	it('should be possible to access the initial note ID', () => {
		const initialText = '# Test\nThis is a test.';
		const editorSettings = createEditorSettings(Setting.THEME_LIGHT);

		const editor = createEditor(document.body, {
			initialText,
			initialNoteId: 'Initial note ID',
			settings: editorSettings,
			onEvent: () => {},
			onLogMessage: () => {},
			onPasteFile: null,
		});
		const editorState = editor.editor.state;
		const idFacet = editor.joplinExtensions.noteIdFacet;
		expect(editorState.facet(idFacet)).toBe('Initial note ID');
	});
});
