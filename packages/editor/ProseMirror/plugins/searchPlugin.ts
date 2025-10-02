import { getSearchState, search, SearchQuery, setSearchState } from 'prosemirror-search';
import { SearchState } from '../../types';
import { Plugin, EditorState, Command, Transaction } from 'prosemirror-state';
import { EditorEvent, EditorEventType } from '../../events';

const visiblePlugin = new Plugin({
	state: {
		init: () => false,
		apply: (tr, value) => {
			const visibleMeta = tr.getMeta(visiblePlugin);
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
		dispatch(state.tr.setMeta(visiblePlugin, { visible }));
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
				changeSources: [transaction.getMeta(visiblePlugin)?.changeSource ?? 'unknown'],
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
		updateState: (editorState: EditorState, searchState: SearchState, changeSource: string) => {
			let transaction = editorState.tr;
			setSearchVisible(searchState.dialogVisible)(editorState, (newTransaction) => {
				transaction = newTransaction;
			});
			transaction = setSearchState(transaction, new SearchQuery({
				search: searchState.searchText,
				caseSensitive: searchState.caseSensitive,
				regexp: searchState.useRegex,
				replace: searchState.replaceText,
			}));
			transaction.setMeta(visiblePlugin, { changeSource });
			lastState = { ...searchState };

			return transaction;
		},
	};
};

export default searchExtension;
