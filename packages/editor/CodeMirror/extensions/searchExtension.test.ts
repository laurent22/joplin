import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../testing/createTestEditor';
import { getSearchQuery, openSearchPanel, SearchQuery, setSearchQuery } from '@codemirror/search';
import { EditorView } from '@codemirror/view';
import searchExtension from './searchExtension';
import createEditorSettings from '../../testing/createEditorSettings';
import { Second } from '@joplin/utils/time';

const setSearchText = (text: string, view: EditorView) => {
	const oldQuery = getSearchQuery(view.state);
	const query = new SearchQuery({
		search: text,
		caseSensitive: oldQuery.caseSensitive,
		regexp: oldQuery.regexp,
		replace: oldQuery.replace,
	});
	view.dispatch({
		effects: [
			setSearchQuery.of(query),
		],
	});
};

const setSearchTextAndWait = async (text: string, view: EditorView) => {
	setSearchText(text, view);
	await jest.advanceTimersByTimeAsync(Second);
};

const createEditor = async (initialText: string, cursorPosition: number) => {
	const view = await createTestEditor(initialText, EditorSelection.cursor(cursorPosition), [], [
		searchExtension(()=>{}, createEditorSettings(1)),
	]);
	openSearchPanel(view);

	return view;
};

const getSelectionFrom = (view: EditorView) => {
	return view.state.selection.main.from;
};

describe('searchExtension', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	test('should auto-scroll to a match when the search changes', async () => {
		const view = await createEditor('Line 1\n\nLine 3\nLine 4', 0);
		const docText = view.state.doc.toString();

		await setSearchTextAndWait('Line 3', view);
		expect(getSelectionFrom(view)).toBe(docText.indexOf('Line 3'));

		await setSearchTextAndWait('Line 4', view);
		expect(getSelectionFrom(view)).toBe(docText.indexOf('Line 4'));
	});

	test('should advance to the next match on change', async () => {
		const view = await createEditor('Match\nMatch2\nMatch23', 0);
		const docText = view.state.doc.toString();

		await setSearchTextAndWait('Match', view);
		expect(getSelectionFrom(view)).toBe(0);

		await setSearchTextAndWait('Match2', view);
		expect(getSelectionFrom(view)).toBe(docText.indexOf('Match2'));

		await setSearchTextAndWait('Match23', view);
		expect(getSelectionFrom(view)).toBe(docText.indexOf('Match23'));
	});

	test('should preserve auto-match start position until selection is manually changed', async () => {
		const view = await createEditor('Match1\nMatch2\nMatch23', 0);
		const docText = view.state.doc.toString();

		await setSearchTextAndWait('Match2', view);
		expect(getSelectionFrom(view)).toBe(docText.indexOf('Match2'));

		await setSearchTextAndWait('Match', view);
		expect(getSelectionFrom(view)).toBe(docText.indexOf('Match'));

		await setSearchTextAndWait('Match23', view);
		expect(getSelectionFrom(view)).toBe(docText.indexOf('Match23'));

		// Manually setting the selection should change the match start location
		view.dispatch({
			selection: EditorSelection.single('Match1\n'.length),
		});
		await setSearchTextAndWait('Match2', view);
		expect(getSelectionFrom(view)).toBe(docText.indexOf('Match2'));
	});

	test('search should wrap to the top when not found after the cursor', async () => {
		const view = await createEditor('Before\nOther\nOther 2', 5);

		await setSearchTextAndWait('Before', view);
		expect(getSelectionFrom(view)).toBe(0);
	});
});
