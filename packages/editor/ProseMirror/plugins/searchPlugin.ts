import { getSearchState, search, SearchQuery, setSearchState } from 'prosemirror-search';
import { SearchState } from '../../types';
import { Plugin, EditorState, Command, Transaction, TextSelection } from 'prosemirror-state';
import { EditorEvent, EditorEventType } from '../../events';
import { EditorView } from 'prosemirror-view';

export const scrollSearchSelectionIntoView = (view: EditorView) => {
	// ProseMirror skips its own scroll when the DOM selection is outside the editor,
	// which can happen while the mobile search controls have focus.
	const rect = view.coordsAtPos(view.state.selection.from);
	const editorWindow = view.dom.ownerDocument.defaultView;
	const margin = 16;
	if (rect.top < margin) {
		editorWindow.scrollBy(0, rect.top - margin);
	} else if (rect.bottom > editorWindow.innerHeight - margin) {
		editorWindow.scrollBy(0, rect.bottom - editorWindow.innerHeight + margin);
	}
};

type VisibleMetaState = {
	visible: boolean;
	changeSource: string;
};
const getVisibleMeta = (tr: Transaction): VisibleMetaState|undefined => (
	tr.getMeta(visiblePlugin)
);
const setVisibleMeta = (tr: Transaction, metaState: VisibleMetaState): Transaction => (
	tr.setMeta(visiblePlugin, metaState)
);

const visiblePlugin = new Plugin({
	state: {
		init: () => false,
		apply: (tr, value) => {
			const visibleMeta = getVisibleMeta(tr);
			if (visibleMeta) {
				return visibleMeta.visible;
			}
			return value;
		},
	},
});

export const getSearchVisible = (state: EditorState) => {
	return visiblePlugin.getState(state);
};
export const setSearchVisible = (visible: boolean): Command => (state, dispatch) => {
	if (getSearchVisible(state) === visible) {
		return false;
	}
	if (dispatch) {
		dispatch(setVisibleMeta(state.tr, { visible, changeSource: 'setSearchVisible' }));
	}
	return true;
};

const searchExtension = (onEditorEvent: (event: EditorEvent)=> void) => {

	let lastState: SearchState|null = null;
	const checkSearchStateChange = (state: EditorState, transaction: Transaction) => {
		const currentQuery = getSearchState(state).query;
		const currentVisible = getSearchVisible(state);

		const currentState: SearchState = {
			useRegex: currentQuery.regexp,
			caseSensitive: currentQuery.caseSensitive,
			searchText: currentQuery.search,
			replaceText: currentQuery.replace,
			dialogVisible: currentVisible,
		};

		let changed = false;
		for (const entryName of Object.keys(currentState)) {
			const entryKey = entryName as keyof SearchState;
			if (!lastState || currentState[entryKey] !== lastState[entryKey]) {
				changed = true;
				break;
			}
		}

		if (changed) {
			lastState = currentState;
			onEditorEvent({
				kind: EditorEventType.UpdateSearchDialog,
				searchState: currentState,
				changeSources: [getVisibleMeta(transaction)?.changeSource ?? 'unknown'],
			});
		}
	};

	const checkStateChangePlugin = new Plugin<null>({
		state: {
			init: ()=>null,
			apply: (transaction, oldValue, _oldState, state) => {
				checkSearchStateChange(state, transaction);
				return oldValue;
			},
		},
	});

	return {
		plugin: [
			search({}),
			visiblePlugin,
			checkStateChangePlugin,
		],
		updateState: (view: EditorView, searchState: SearchState, changeSource: string) => {
			const previousQuery = getSearchState(view.state).query;
			const shouldSelectMatch = getSearchVisible(view.state) && searchState.dialogVisible && !!searchState.searchText && (
				searchState.searchText !== previousQuery.search || searchState.caseSensitive !== previousQuery.caseSensitive || searchState.useRegex !== previousQuery.regexp
			);

			let transaction = view.state.tr;
			transaction = setSearchState(transaction, new SearchQuery({
				search: searchState.searchText,
				caseSensitive: searchState.caseSensitive,
				regexp: searchState.useRegex,
				replace: searchState.replaceText,
			}));
			setVisibleMeta(transaction, { changeSource, visible: searchState.dialogVisible });
			lastState = { ...searchState };
			view.dispatch(transaction);

			if (shouldSelectMatch) {
				const state = view.state;
				const query = getSearchState(state).query;
				const match = query.findNext(state, state.selection.from) ?? query.findNext(state, 0);
				if (match && match.from < match.to) {
					view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, match.from, match.to)).scrollIntoView());
					scrollSearchSelectionIntoView(view);
				}
			}
		},
	};
};

export default searchExtension;
