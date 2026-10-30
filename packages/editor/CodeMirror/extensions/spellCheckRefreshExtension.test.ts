import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import spellCheckRefreshExtension, {
	createSpellCheckRefreshPlugin,
	refreshSpellCheck,
} from './spellCheckRefreshExtension';
import editorSettingsExtension from './editorSettingsExtension';
import selectedNoteIdExtension, { setNoteIdEffect } from './selectedNoteIdExtension';
import { EditorKeymap, EditorLanguageType, EditorSettings } from '../../types';

const createMockSettings = (spellcheckEnabled = true): EditorSettings => ({
	spellcheckEnabled,
	markdownMarkEnabled: true,
	markdownInsertEnabled: true,
	katexEnabled: true,
	useExternalSearch: true,
	readOnly: false,
	automatchBraces: false,
	ignoreModifiers: false,
	autocompleteMarkup: true,
	tabMovesFocus: false,
	inlineRenderingEnabled: true,
	tableEditingEnabled: true,
	highlightActiveLine: false,
	keymap: EditorKeymap.Default,
	preferMacShortcuts: false,
	language: EditorLanguageType.Markdown,
	themeData: { themeId: 1, paddingBottom: 0 } as any,
	indentWithTabs: true,
	editorLabel: 'Markdown editor',
	imageRenderingEnabled: false,
});

describe('spellCheckRefreshExtension', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('refreshSpellCheck should toggle spellcheck attributes on contentDOM when enabled', () => {
		const settings = createMockSettings();
		settings.spellcheckEnabled = true;

		const state = EditorState.create({
			doc: 'Test misspelled wrd',
			extensions: [
				editorSettingsExtension(settings),
				EditorView.contentAttributes.of({ spellcheck: 'true' }),
			],
		});

		const view = new EditorView({ state, parent: document.body });
		const setAttributeSpy = jest.spyOn(view.contentDOM, 'setAttribute');

		refreshSpellCheck(view);

		expect(setAttributeSpy).toHaveBeenCalledWith('spellcheck', 'false');
		expect(setAttributeSpy).toHaveBeenCalledWith('spellcheck', 'true');

		view.destroy();
	});

	it('refreshSpellCheck should do nothing if spellcheck is disabled in settings', () => {
		const settings = createMockSettings();
		settings.spellcheckEnabled = false;

		const state = EditorState.create({
			doc: 'Test misspelled wrd',
			extensions: [
				editorSettingsExtension(settings),
				EditorView.contentAttributes.of({ spellcheck: 'false' }),
			],
		});

		const view = new EditorView({ state, parent: document.body });
		const setAttributeSpy = jest.spyOn(view.contentDOM, 'setAttribute');

		refreshSpellCheck(view);

		expect(setAttributeSpy).not.toHaveBeenCalled();

		view.destroy();
	});

	it('refreshSpellCheck should call forceSpellCheck if available on contentDOM', () => {
		const settings = createMockSettings();
		settings.spellcheckEnabled = true;

		const state = EditorState.create({
			doc: 'Test misspelled wrd',
			extensions: [
				editorSettingsExtension(settings),
				EditorView.contentAttributes.of({ spellcheck: 'true' }),
			],
		});

		const view = new EditorView({ state, parent: document.body });
		const forceSpellCheckMock = jest.fn();
		(view.contentDOM as unknown as { forceSpellCheck: () => void }).forceSpellCheck = forceSpellCheckMock;

		refreshSpellCheck(view);

		expect(forceSpellCheckMock).toHaveBeenCalledTimes(1);

		view.destroy();
	});

	it('should schedule initial quick refresh on editor initialization', () => {
		const settings = createMockSettings();
		settings.spellcheckEnabled = true;

		const state = EditorState.create({
			doc: 'Hello world',
			extensions: [
				editorSettingsExtension(settings),
				EditorView.contentAttributes.of({ spellcheck: 'true' }),
				spellCheckRefreshExtension,
			],
		});

		const view = new EditorView({ state, parent: document.body });
		const setAttributeSpy = jest.spyOn(view.contentDOM, 'setAttribute');

		// Fast-forward initial quick delay (100ms)
		jest.advanceTimersByTime(100);

		expect(setAttributeSpy).toHaveBeenCalledWith('spellcheck', 'false');
		expect(setAttributeSpy).toHaveBeenCalledWith('spellcheck', 'true');

		view.destroy();
	});

	it('should schedule debounced refresh when document text is changed or backspaced', () => {
		const settings = createMockSettings();
		settings.spellcheckEnabled = true;

		const plugin = createSpellCheckRefreshPlugin({ debounceMs: 500, quickDelayMs: 100 });

		const state = EditorState.create({
			doc: 'Hello world',
			extensions: [
				editorSettingsExtension(settings),
				EditorView.contentAttributes.of({ spellcheck: 'true' }),
				plugin,
			],
		});

		const view = new EditorView({ state, parent: document.body });
		jest.advanceTimersByTime(100); // Flush initial timer

		const setAttributeSpy = jest.spyOn(view.contentDOM, 'setAttribute');
		setAttributeSpy.mockClear();

		// Simulate typing / backspacing
		view.dispatch({
			changes: { from: 5, to: 11, insert: ' there' },
		});

		// 250ms elapsed - should not have refreshed yet
		jest.advanceTimersByTime(250);
		expect(setAttributeSpy).not.toHaveBeenCalled();

		// More changes before debounce completes (e.g. rapid typing or backspacing)
		view.dispatch({
			changes: { from: 11, to: 11, insert: '!' },
		});

		// Another 300ms elapsed (total 550ms from first, but only 300ms from second)
		jest.advanceTimersByTime(300);
		expect(setAttributeSpy).not.toHaveBeenCalled();

		// Complete remaining debounce time (200ms)
		jest.advanceTimersByTime(200);
		expect(setAttributeSpy).toHaveBeenCalledWith('spellcheck', 'false');
		expect(setAttributeSpy).toHaveBeenCalledWith('spellcheck', 'true');

		view.destroy();
	});

	it('should trigger quick refresh when switching notes via setNoteIdEffect', () => {
		const settings = createMockSettings();
		settings.spellcheckEnabled = true;

		const state = EditorState.create({
			doc: 'Note 1 content',
			extensions: [
				editorSettingsExtension(settings),
				selectedNoteIdExtension,
				EditorView.contentAttributes.of({ spellcheck: 'true' }),
				spellCheckRefreshExtension,
			],
		});

		const view = new EditorView({ state, parent: document.body });
		jest.advanceTimersByTime(100); // Flush initial

		const setAttributeSpy = jest.spyOn(view.contentDOM, 'setAttribute');
		setAttributeSpy.mockClear();

		// Switch note (note ID effect + whole body replacement)
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: 'Note 2 new mispelled content' },
			effects: [setNoteIdEffect.of('note-2')],
		});

		// Should refresh after quickDelayMs (100ms) instead of full debounce (500ms)
		jest.advanceTimersByTime(100);
		expect(setAttributeSpy).toHaveBeenCalledWith('spellcheck', 'false');
		expect(setAttributeSpy).toHaveBeenCalledWith('spellcheck', 'true');

		view.destroy();
	});

	it('should clean up pending timers on destroy', () => {
		const settings = createMockSettings();
		settings.spellcheckEnabled = true;

		const state = EditorState.create({
			doc: 'Hello',
			extensions: [
				editorSettingsExtension(settings),
				EditorView.contentAttributes.of({ spellcheck: 'true' }),
				spellCheckRefreshExtension,
			],
		});

		const view = new EditorView({ state, parent: document.body });
		const setAttributeSpy = jest.spyOn(view.contentDOM, 'setAttribute');

		// Destroy before initial timer fires
		view.destroy();

		jest.advanceTimersByTime(1000);
		expect(setAttributeSpy).not.toHaveBeenCalled();
	});
});
