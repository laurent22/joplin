// Adds a "No results" indication to the built-in CodeMirror search panel:
// when the current query has no matches in the document, a status message is
// shown and the next/previous buttons are disabled. The match check stops at
// the first match, so it stays cheap on large notes.

import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { getSearchQuery, searchPanelOpen, SearchQuery, setSearchQuery } from '@codemirror/search';
import { _ } from '@joplin/lib/locale';

const statusClass = 'cm-search-no-results';

const queryHasMatch = (view: EditorView, query: SearchQuery): boolean => {
	if (!query.valid) return false;
	return !query.getCursor(view.state).next().done;
};

const updatePanelStatus = (view: EditorView) => {
	// The mobile app uses its own (React Native) search dialog - there is no
	// search panel element to update in that case.
	const panelDom = view.dom.querySelector<HTMLElement>('.cm-panel.cm-search');
	if (!panelDom) return;

	let status = panelDom.querySelector<HTMLElement>(`.${statusClass}`);
	if (!status) {
		status = document.createElement('span');
		status.className = statusClass;
		status.setAttribute('role', 'status');
		status.setAttribute('aria-live', 'polite');
		// input[name=search] is set by CodeMirror itself, independent of locale.
		panelDom.querySelector('input[name=search]')?.insertAdjacentElement('afterend', status);
	}

	const query = getSearchQuery(view.state);
	const noResults = query.search.length > 0 && !queryHasMatch(view, query);

	// Avoid redundant DOM writes so screen readers are not re-announced the
	// same status on every editor update.
	const statusText = noResults ? _('No results') : '';
	if (status.textContent !== statusText) {
		status.textContent = statusText;
	}
	status.style.display = noResults ? '' : 'none';
	for (const name of ['next', 'prev']) {
		const button = panelDom.querySelector<HTMLButtonElement>(`button[name=${name}]`);
		if (button && button.disabled !== noResults) {
			button.disabled = noResults;
		}
	}
};

// Panel plugin: refreshes the status when the panel opens, the query changes,
// or the document changes while the panel is open.
const noResultsSearchStatus = ViewPlugin.fromClass(class {
	public constructor(private view: EditorView) { }

	public update(update: ViewUpdate) {
		if (!searchPanelOpen(update.state)) return;
		const justOpened = !searchPanelOpen(update.startState);
		const queryChanged = update.transactions.some(tr => tr.effects.some(e => e.is(setSearchQuery)));
		if (justOpened || queryChanged || update.docChanged) {
			// ViewPlugin.update runs after the view's DOM update, so the panel
			// element is already present.
			updatePanelStatus(this.view);
		}
	}
});

export default noResultsSearchStatus;
