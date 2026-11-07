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

describe('search panel no-results indication', () => {
	const createDesktopEditor = async (initialText: string, cursorPosition: number) => {
		const settings = { ...createEditorSettings(1), useExternalSearch: false };
		const view = await createTestEditor(initialText, EditorSelection.cursor(cursorPosition), [], [
			searchExtension(()=>{}, settings),
		]);
		openSearchPanel(view);
		return view;
	};

	const getStatus = (view: EditorView) =>
		view.dom.querySelector<HTMLElement>('.cm-panel.cm-search .cm-search-no-results');
	const getButton = (view: EditorView, name: string) =>
		view.dom.querySelector<HTMLButtonElement>(`.cm-panel.cm-search button[name=${name}]`);

	test('shows "No results" and disables navigation when there are no matches', async () => {
		const view = await createDesktopEditor('Line 1\n\nLine 3\nLine 4', 0);
		await setSearchTextAndWait('not present', view);
		expect(getStatus(view)?.textContent).toBe('No results');
		expect(getButton(view, 'next')?.disabled).toBe(true);
		expect(getButton(view, 'prev')?.disabled).toBe(true);
	});

	test('hides the indication when the search has matches', async () => {
		const view = await createDesktopEditor('Line 1\n\nLine 3\nLine 4', 0);
		await setSearchTextAndWait('Line 3', view);
		expect(getStatus(view)?.textContent).toBe('');
		expect(getButton(view, 'next')?.disabled).toBe(false);
		expect(getButton(view, 'prev')?.disabled).toBe(false);
	});

	test('updates the indication when the document changes while searching', async () => {
		const view = await createDesktopEditor('Line 1\n\nLine 3\nLine 4', 0);
		await setSearchTextAndWait('Line 3', view);
		view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'nothing here' } });
		expect(getStatus(view)?.textContent).toBe('No results');
	});
});
