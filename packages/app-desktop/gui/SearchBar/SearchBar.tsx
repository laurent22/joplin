import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import SearchInput from '../lib/SearchInput/SearchInput';
import Setting from '@joplin/lib/models/Setting';
import { stateUtils } from '@joplin/lib/reducer';
import BaseModel from '@joplin/lib/BaseModel';
import uuid from '@joplin/lib/uuid';
const { connect } = require('react-redux');
import Note from '@joplin/lib/models/Note';
const debounce = require('debounce');
const styled = require('styled-components').default;

export const Root = styled.div`
	position: relative;
	display: flex;
	width: 100%;
`;

interface Props {
	inputRef?: any;
	notesParentType: string;
	dispatch?: Function;
	selectedNoteId: string;
}

function SearchBar(props: Props) {
	const [query, setQuery] = useState('');
	const [searchStarted, setSearchStarted] = useState(false);
	const searchId = useRef(uuid.create());

	useEffect(() => {
		function search(searchId: string, query: string, dispatch: Function) {
			dispatch({
				type: 'SEARCH_UPDATE',
				search: {
					id: searchId,
					title: query,
					query_pattern: query,
					query_folder_id: null,
					type_: BaseModel.TYPE_SEARCH,
				},
			});

			dispatch({
				type: 'SEARCH_SELECT',
				id: searchId,
			});
		}

		const debouncedSearch = debounce(search, 500);
		if (searchStarted) debouncedSearch(searchId.current, query, props.dispatch);
		return () => {
			debouncedSearch.clear();
		};
	}, [query, searchStarted]);

	const onExitSearch = useCallback(async (navigateAway = true) => {
		setQuery('');
		setSearchStarted(false);

		if (navigateAway) {
			const note = props.selectedNoteId ? await Note.load(props.selectedNoteId) : null;

			if (note) {
				props.dispatch({
					type: 'FOLDER_AND_NOTE_SELECT',
					folderId: note.parent_id,
					noteId: note.id,
				});
			} else {
				const folderId = Setting.value('activeFolderId');
				if (folderId) {
					props.dispatch({
						type: 'FOLDER_SELECT',
						id: folderId,
					});
				}
			}
		}
	}, [props.selectedNoteId]);

	function onChange(event: any) {
		setSearchStarted(true);
		setQuery(event.value);
	}

	function onFocus() {
		props.dispatch({
			type: 'FOCUS_SET',
			field: 'globalSearch',
		});
	}

	function onBlur() {
		// Do it after a delay so that the "Clear" button
		// can be clicked on (otherwise the field loses focus
		// and is resized before the click event has been processed)
		setTimeout(() => {
			props.dispatch({
				type: 'FOCUS_CLEAR',
				field: 'globalSearch',
			});
		}, 300);
	}

	const onKeyDown = useCallback((event: any) => {
		if (event.key === 'Escape') {
			if (document.activeElement) (document.activeElement as any).blur();
			void onExitSearch();
		}
	}, [onExitSearch]);

	const onSearchButtonClick = useCallback(() => {
		void onExitSearch();
	}, [onExitSearch]);

	useEffect(() => {
		if (props.notesParentType !== 'Search') {
			void onExitSearch(false);
		}
	}, [props.notesParentType, onExitSearch]);

	return (
		<Root>
			<SearchInput
				inputRef={props.inputRef}
				value={query}
				onChange={onChange}
				onFocus={onFocus}
				onBlur={onBlur}
				onKeyDown={onKeyDown}
				onSearchButtonClick={onSearchButtonClick}
				searchStarted={searchStarted}
			/>
		</Root>
	);
}

const mapStateToProps = (state: any) => {
	return {
		notesParentType: state.notesParentType,
		selectedNoteId: stateUtils.selectedNoteId(state),
	};
};

export default connect(mapStateToProps)(SearchBar);
