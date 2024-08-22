import { EditorState, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { EditorSettings, OnEventCallback } from '../../types';
import getSearchState from './getSearchState';
import { EditorEventType } from '../../events';
import { search, searchPanelOpen, setSearchQuery } from '@codemirror/search';

const searchExtension = (onEvent: OnEventCallback, settings: EditorSettings): Extension => {
	const onSearchDialogUpdate = (state: EditorState) => {
		const newSearchState = getSearchState(state);

		onEvent({
			kind: EditorEventType.UpdateSearchDialog,
			searchState: newSearchState,
		});
	};

	return [
		search(settings.useExternalSearch ? {
			createPanel(_editor: EditorView) {
				return {
					// The actual search dialog is implemented with react native,
					// use a dummy element.
					dom: document.createElement('div'),
					mount() { },
					destroy() { },
				};
			},
		} : undefined),

		EditorState.transactionExtender.of((tr) => {
			if (tr.effects.some(e => e.is(setSearchQuery)) || searchPanelOpen(tr.state) !== searchPanelOpen(tr.startState)) {
				onSearchDialogUpdate(tr.state);
			}
			return null;
		}),
	];
};

export default searchExtension;
