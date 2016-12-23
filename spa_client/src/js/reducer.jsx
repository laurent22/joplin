import deepcopy from 'deepcopy';

export function reducer(state, action) {
	switch (action.type) {

		case 'SELECT_FOLDER':

			var state = deepcopy(state);
			state.selectedFolderId = action.id;
			return state;

		case 'SELECT_NOTE':

			var state = deepcopy(state);
			state.selectedNoteId = action.id;
			return state;

		case 'TOGGLE_FOLDER':

			var state = deepcopy(state);
			var idx = state.expandedFolderIds.indexOf(action.id);
			if (idx < 0) {
				state.expandedFolderIds.push(action.id);
			} else {
				state.expandedFolderIds.splice(idx, 1);
			}
			return state;

	}

	return state;
}