import { EditorSelection, EditorState, Extension, StateEffect, StateField } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { EditorSettings, OnEventCallback } from '../../types';
import getSearchState from '../utils/getSearchState';
import { EditorEventType } from '../../events';
import { search, searchPanelOpen, SearchQuery, setSearchQuery } from '@codemirror/search';
import announceSearchMatch from '../vendor/announceSearchMatch';

type CancelEvent = { cancelled: boolean };

const scanForFirstMatch = async (
	state: EditorState,
	query: SearchQuery,
	startPosition: number,
	delayFunction: ()=> Promise<void>,
	cancelEvent: CancelEvent,
) => {
	if (cancelEvent.cancelled) return null;

	const pageSizeChars = 40_000;
	let nextStartPosition = startPosition;

	const nextCursor = () => {
		if (nextStartPosition >= state.doc.length) {
			return null;
		}

		let endPosition = Math.min(nextStartPosition + pageSizeChars, state.doc.length);
		const endPositionLine = state.doc.lineAt(endPosition);
		// Always search up to the end of the current line to avoid getting partial matches.
		endPosition = endPositionLine.to;

		const cursor = query.getCursor(state, nextStartPosition, endPosition);
		nextStartPosition = endPosition;
		return cursor;
	};

	const nextCursorAndWait = async () => {
		const result = nextCursor();
		await delayFunction();
		return result;
	};

	for (let cursor = nextCursor(); !!cursor && !cancelEvent.cancelled; cursor = await nextCursorAndWait()) {
		const match = cursor.next();
		if (match?.value && match.value.to && match.value.from !== match.value.to) {
			return match.value;
		}
	}
	return null;
};

// Included in a transaction if it was caused by the auto-scroll-to-next-match logic
const autoMatchAnnotation = StateEffect.define<boolean>();

const autoMatchSearchStartField = StateField.define<number>({
	create: (state) => state.selection.main.from,
	update: (lastValue, viewUpdate) => {
		const changedByAutoMatch = viewUpdate.effects.some(effect => effect.is(autoMatchAnnotation));
		const sameSelection = viewUpdate.startState.selection.eq(viewUpdate.newSelection);
		const noSignificantChanges = sameSelection && !viewUpdate.docChanged;

		if (changedByAutoMatch || noSignificantChanges) {
			return lastValue;
		}
		return viewUpdate.newSelection.main.from;
	},
});

const autoScrollToMatchPlugin = ViewPlugin.fromClass(class {
	private _lastCancelEvent: CancelEvent = { cancelled: false };
	public constructor(private _view: EditorView) { }

	private async handleScrollOnQueryChange_(
		query: SearchQuery,
		state: EditorState,
		startState: EditorState,
		cancelEvent: CancelEvent,
	) {
		const isOpenSearchPanelEvent = () => searchPanelOpen(startState) && !searchPanelOpen(state);
		if (
			!query || query.search.length === 0
			// Avoid auto-scrolling to the search result when first opening the search panel
			|| isOpenSearchPanelEvent()
		) {
			return;
		}
		const getFirstMatchAfter = async (pos: number) => {
			const delayFunction = () => {
				return new Promise<void>(resolve => {
					requestAnimationFrame(() => resolve());
				});
			};
			return await scanForFirstMatch(
				state, query, pos, delayFunction, cancelEvent,
			);
		};

		const searchStart = state.field(autoMatchSearchStartField);
		const firstMatchAfterSelection = await getFirstMatchAfter(searchStart);
		const targetMatch = firstMatchAfterSelection ?? await getFirstMatchAfter(0);

		if (targetMatch && targetMatch.from >= 0 && !cancelEvent.cancelled) {
			this._view.dispatch({
				selection: EditorSelection.single(targetMatch.from, targetMatch.to),
				effects: [
					// Mark this transaction as an auto-match. This allows listeners to
					// process the transaction differently.
					autoMatchAnnotation.of(true),

					EditorView.scrollIntoView(targetMatch.from),
					announceSearchMatch(state, targetMatch),
				],
				userEvent: 'select.search',
			});
		}
	}

	public async update(update: ViewUpdate) {
		let lastQueryUpdate: StateEffect<SearchQuery>|null = null;
		for (const tr of update.transactions) {
			const queryUpdate = tr.effects.find(e => e.is(setSearchQuery));
			if (queryUpdate) {
				lastQueryUpdate = queryUpdate;
			}
		}

		const cancelOngoingSearch = () => {
			this._lastCancelEvent.cancelled = true;
		};

		const newCancelEvent = () => {
			cancelOngoingSearch();
			const cancelEvent = { cancelled: false };
			this._lastCancelEvent = cancelEvent;
			return cancelEvent;
		};

		if (!searchPanelOpen(update.state)) {
			cancelOngoingSearch();
		} else if (lastQueryUpdate) {
			void this.handleScrollOnQueryChange_(
				lastQueryUpdate.value, update.state, update.startState, newCancelEvent(),
			);
		}
	}
}, {
	provide: () => autoMatchSearchStartField,
});

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

		autoScrollToMatchPlugin,

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
