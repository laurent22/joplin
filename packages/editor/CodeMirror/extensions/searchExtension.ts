import { EditorState, Extension, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { EditorSettings, OnEventCallback } from '../../types';
import getSearchState from '../utils/getSearchState';
import { EditorEventType } from '../../events';
import { search, searchPanelOpen, setSearchQuery } from '@codemirror/search';

export const searchChangeSourceEffect = StateEffect.define<string>();

const searchExtension = (onEvent: OnEventCallback, settings: EditorSettings): Extension => {
	const onSearchDialogUpdate = (state: EditorState, changeSources: string[]) => {
		const newSearchState = getSearchState(state);

		onEvent({
			kind: EditorEventType.UpdateSearchDialog,
			searchState: newSearchState,
			changeSources,
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
				const changeSourceEffects = tr.effects.filter(effect => effect.is(searchChangeSourceEffect));
				const changeSources = changeSourceEffects.map(effect => effect.value);

				onSearchDialogUpdate(tr.state, changeSources);
			}
			return null;
		}),
	];
};

export default searchExtension;
