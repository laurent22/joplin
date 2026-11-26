import { getSearchState } from 'prosemirror-search';
import { TextSelection } from 'prosemirror-state';
import createTestEditor from '../testing/createTestEditor';
import searchExtension from './searchPlugin';

describe('searchPlugin', () => {
	test('typing a query selects and scrolls to its match', () => {
		const extension = searchExtension(jest.fn());
		const editor = createTestEditor({ html: '<p>First Match2</p><p>Second Match2</p>', plugins: extension.plugin });
		const coordsSpy = jest.spyOn(editor, 'coordsAtPos').mockReturnValue({ top: window.innerHeight + 190, bottom: window.innerHeight + 200, left: 0, right: 0 });
		const scrollSpy = jest.spyOn(window, 'scrollBy').mockImplementation(() => {});
		const searchState = {
			useRegex: false,
			caseSensitive: false,
			searchText: '',
			replaceText: '',
			dialogVisible: true,
		};
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

	test('typing a query wraps to a match before the cursor', () => {
		const extension = searchExtension(jest.fn());
		const editor = createTestEditor({ html: '<p>First match</p><p>Last paragraph</p>', plugins: extension.plugin });
		try {
			extension.updateState(editor, { useRegex: false, caseSensitive: false, searchText: '', replaceText: '', dialogVisible: true }, 'test');
			editor.dispatch(editor.state.tr.setSelection(TextSelection.atEnd(editor.state.doc)));
			const coordsSpy = jest.spyOn(editor, 'coordsAtPos').mockReturnValue({ top: 100, bottom: 120, left: 0, right: 0 });
			try {
				extension.updateState(editor, { useRegex: false, caseSensitive: false, searchText: 'First', replaceText: '', dialogVisible: true }, 'test');
				expect(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)).toBe('First');
				expect(getSearchState(editor.state).query.search).toBe('First');
			} finally {
				coordsSpy.mockRestore();
			}
		} finally {
			editor.destroy();
		}
	});
});
