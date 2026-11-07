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

	test('a whole-word query does not match a mere substring', async () => {
		const view = await createDesktopEditor('Matching words here', 0);
		view.dispatch({
			effects: setSearchQuery.of(new SearchQuery({ search: 'Match', wholeWord: true })),
		});
		expect(getStatus(view)?.textContent).toBe('No results');
		expect(getButton(view, 'next')?.disabled).toBe(true);

		view.dispatch({
			effects: setSearchQuery.of(new SearchQuery({ search: 'Matching', wholeWord: true })),
		});
		expect(getStatus(view)?.textContent).toBe('');
		expect(getButton(view, 'next')?.disabled).toBe(false);
	});

	test('a case-sensitive query only matches the same case', async () => {
		const view = await createDesktopEditor('Line 1\nLine 2', 0);
		view.dispatch({
			effects: setSearchQuery.of(new SearchQuery({ search: 'line', caseSensitive: true })),
		});
		expect(getStatus(view)?.textContent).toBe('No results');

		view.dispatch({
			effects: setSearchQuery.of(new SearchQuery({ search: 'Line', caseSensitive: true })),
		});
		expect(getStatus(view)?.textContent).toBe('');
	});

	// The status check uses a fast native scan instead of SearchCursor for
	// plain-text and whole-word queries. These tests pin the exact SearchCursor
	// semantics around Unicode normalization, case folding and escapes by
	// comparing the status against what a real SearchCursor reports.
	test.each([
		// SearchCursor normalizes with NFKD: a query matches its
		// composed/decomposed forms in either direction...
		{ doc: 'caf\u00E9 au lait', search: 'caf\u00E9', expectMatch: true },
		{ doc: 'cafe\u0301 au lait', search: 'caf\u00E9', expectMatch: true },
		{ doc: 'caf\u00E9 au lait', search: 'cafe\u0301', expectMatch: true },
		// ...but a match must end at the end of a code point's normalized
		// form: "cafe" does not match "caf\u00E9" (\u00E9 normalizes to "e"
		// plus a combining mark). A full syllable matches ("\uD55C" in
		// "\uD55C\uAD6D\uC5B4"), but a partial one ("\u1112\u1161") does not.
		{ doc: 'caf\u00E9 au lait', search: 'cafe', expectMatch: false },
		{ doc: '\uD55C\uAD6D\uC5B4', search: '\uD55C', expectMatch: true },
		{ doc: '\uD55C\uAD6D\uC5B4', search: '\u1112\u1161', expectMatch: false },
		{ doc: '\uD55C\uAD6D\uC5B4', search: '\uD55C\uAD6D', expectMatch: true },
		{ doc: '\uD55C\uAD6D\uC5B4', search: '\u1112\u1161\u11AB\u1100\u116E\u11A8\u110B\u1165', expectMatch: true },
		// Ligatures normalize to their components: the full expansion matches,
		// but a prefix of it does not end at a normalized-form boundary.
		{ doc: '\uFB01le', search: 'fi', expectMatch: true },
		{ doc: '\uFB01le', search: 'f', expectMatch: false },
		// Case folding is per code point, not whole-string (final sigma).
		{ doc: '\u039F\u03A3', search: '\u03BF\u03C3', caseSensitive: false, expectMatch: true },
		{ doc: '\u039F\u03A3', search: '\u03BF\u03C2', caseSensitive: false, expectMatch: false },
		{ doc: '\u03A3\u0391\u03A3', search: '\u03C3\u03B1\u03C3', caseSensitive: false, expectMatch: true },
		// Escape sequences are interpreted by the search panel.
		{ doc: 'x\ny', search: 'x\\ny', expectMatch: true },
		{ doc: 'x\\ny', search: 'x\\ny', expectMatch: false },
		{ doc: 'tab\tseparated', search: 'tab\\tseparated', expectMatch: true },
		// Case-sensitive queries still normalize.
		{ doc: 'caf\u00E9', search: 'cafe\u0301', caseSensitive: true, expectMatch: true },
		{ doc: 'caf\u00E9', search: 'cafe', caseSensitive: true, expectMatch: false },
		// Whole-word queries fall back to the cursor when the text occurs.
		{ doc: 'caf\u00E9', search: 'caf\u00E9', wholeWord: true, expectMatch: true },
		{ doc: 'xcaf\u00E9', search: 'caf\u00E9', wholeWord: true, expectMatch: false },
		{ doc: 'caf\u00E9', search: 'cafe', wholeWord: true, expectMatch: false },
])('matches SearchCursor semantics: search %j in %j', async ({ doc, search, caseSensitive, wholeWord, expectMatch }) => {
		const view = await createDesktopEditor(doc, 0);
		view.dispatch({
			effects: setSearchQuery.of(new SearchQuery({ search, caseSensitive, wholeWord })),
		});

		const query = new SearchQuery({ search, caseSensitive, wholeWord });
		const cursorHasMatch = !query.getCursor(view.state).next().done;
		expect(cursorHasMatch).toBe(expectMatch);
		expect(getStatus(view)?.textContent).toBe(expectMatch ? '' : 'No results');
		expect(getButton(view, 'next')?.disabled).toBe(!expectMatch);
	});
});
