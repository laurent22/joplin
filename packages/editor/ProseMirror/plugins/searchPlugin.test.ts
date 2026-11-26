import { getSearchState } from 'prosemirror-search';
import { TextSelection } from 'prosemirror-state';
import { EditorCommandType } from '../../types';
import commands from '../commands/commands';
import createTestEditor from '../testing/createTestEditor';
import searchExtension, { scrollSearchSelectionIntoView } from './searchPlugin';

const searchState = {
	useRegex: false,
	caseSensitive: false,
	searchText: '',
	replaceText: '',
	dialogVisible: true,
};

describe('searchPlugin', () => {
	test('typing a query selects and scrolls to its match', () => {
		const extension = searchExtension(jest.fn());
		const editor = createTestEditor({ html: '<p>First Match2</p><p>Second Match2</p>', plugins: extension.plugin });
		const coordsSpy = jest.spyOn(editor, 'coordsAtPos').mockReturnValue({ top: window.innerHeight + 190, bottom: window.innerHeight + 200, left: 0, right: 0 });
		const scrollSpy = jest.spyOn(window, 'scrollBy').mockImplementation(() => {});
		try {
			document.getSelection()?.removeAllRanges();
			extension.updateState(editor, searchState, 'test');
			expect(scrollSpy).not.toHaveBeenCalled();

			extension.updateState(editor, { ...searchState, searchText: 'Match' }, 'test');
			const firstMatchStart = editor.state.selection.from;
			expect(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)).toBe('Match');
			expect(scrollSpy).toHaveBeenCalledWith(0, 216);

			scrollSpy.mockClear();
			extension.updateState(editor, { ...searchState, searchText: 'Match2' }, 'test');
			expect(editor.state.selection.from).toBe(firstMatchStart);
			expect(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)).toBe('Match2');
			expect(scrollSpy).toHaveBeenCalledWith(0, 216);

			scrollSpy.mockClear();
			extension.updateState(editor, { ...searchState, searchText: 'Match2', replaceText: 'Other' }, 'test');
			expect(scrollSpy).not.toHaveBeenCalled();
		} finally {
			coordsSpy.mockRestore();
			scrollSpy.mockRestore();
			editor.destroy();
		}
	});

	test.each([
		{ name: 'ShowSearch', command: EditorCommandType.ShowSearch },
		{ name: 'ToggleSearch', command: EditorCommandType.ToggleSearch },
	])('$name keeps the scroll position when search opens', ({ command }) => {
		const extension = searchExtension(jest.fn());
		const editor = createTestEditor({ html: '<p>Earlier</p><p>Target</p>', plugins: extension.plugin });
		const coordsSpy = jest.spyOn(editor, 'coordsAtPos').mockReturnValue({ top: window.innerHeight + 190, bottom: window.innerHeight + 200, left: 0, right: 0 });
		const scrollSpy = jest.spyOn(window, 'scrollBy').mockImplementation(() => {});
		try {
			document.getSelection()?.removeAllRanges();
			extension.updateState(editor, { ...searchState, searchText: 'Target', dialogVisible: false }, 'test');
			expect(scrollSpy).not.toHaveBeenCalled();

			commands[command](editor.state, editor.dispatch, editor);
			expect(editor.state.selection.from).toBe(1);
			expect(scrollSpy).not.toHaveBeenCalled();
			expect(coordsSpy).not.toHaveBeenCalled();
		} finally {
			coordsSpy.mockRestore();
			scrollSpy.mockRestore();
			editor.destroy();
		}
	});

	test('opening search with a term does not scroll until the term changes', () => {
		const extension = searchExtension(jest.fn());
		const editor = createTestEditor({ html: '<p>Targeted</p>', plugins: extension.plugin });
		const coordsSpy = jest.spyOn(editor, 'coordsAtPos').mockReturnValue({ top: window.innerHeight + 190, bottom: window.innerHeight + 200, left: 0, right: 0 });
		const scrollSpy = jest.spyOn(window, 'scrollBy').mockImplementation(() => {});
		try {
			document.getSelection()?.removeAllRanges();
			extension.updateState(editor, { ...searchState, searchText: 'Target' }, 'test');
			expect(editor.state.selection.from).toBe(1);
			expect(scrollSpy).not.toHaveBeenCalled();

			extension.updateState(editor, { ...searchState, searchText: 'Targeted' }, 'test');
			expect(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)).toBe('Targeted');
			expect(scrollSpy).toHaveBeenCalledWith(0, 216);
		} finally {
			coordsSpy.mockRestore();
			scrollSpy.mockRestore();
			editor.destroy();
		}
	});

	test('typing a query wraps to a match before the cursor', () => {
		const extension = searchExtension(jest.fn());
		const editor = createTestEditor({ html: '<p>First match</p><p>Last paragraph</p>', plugins: extension.plugin });
		const coordsSpy = jest.spyOn(editor, 'coordsAtPos').mockReturnValue({ top: 100, bottom: 120, left: 0, right: 0 });
		try {
			extension.updateState(editor, searchState, 'test');
			editor.dispatch(editor.state.tr.setSelection(TextSelection.atEnd(editor.state.doc)));
			extension.updateState(editor, { ...searchState, searchText: 'First' }, 'test');
			expect(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)).toBe('First');
			expect(getSearchState(editor.state).query.search).toBe('First');
		} finally {
			coordsSpy.mockRestore();
			editor.destroy();
		}
	});

	test('scrolls within the visible viewport when a keyboard reduces its height', () => {
		const editor = createTestEditor({ html: '<p>Target</p>' });
		const coordsSpy = jest.spyOn(editor, 'coordsAtPos').mockReturnValue({ top: 300, bottom: 320, left: 0, right: 0 });
		const scrollSpy = jest.spyOn(window, 'scrollBy').mockImplementation(() => {});
		const previousViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');
		Object.defineProperty(window, 'visualViewport', { configurable: true, value: { offsetTop: 0, height: 200 } });
		try {
			scrollSearchSelectionIntoView(editor);
			expect(scrollSpy).toHaveBeenCalledWith(0, 136);
		} finally {
			if (previousViewport) {
				Object.defineProperty(window, 'visualViewport', previousViewport);
			} else {
				Reflect.deleteProperty(window, 'visualViewport');
			}
			coordsSpy.mockRestore();
			scrollSpy.mockRestore();
			editor.destroy();
		}
	});
});
