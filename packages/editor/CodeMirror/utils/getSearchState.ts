import { EditorState } from '@codemirror/state';
import { SearchState } from '../../types';
import { getSearchQuery, searchPanelOpen } from '@codemirror/search';

const getSearchState = (state: EditorState) => {
	const query = getSearchQuery(state);
	const searchState: SearchState = {
		searchText: query.search,
		replaceText: query.replace,
		useRegex: query.regexp,
		caseSensitive: query.caseSensitive,
		dialogVisible: searchPanelOpen(state),
	};
	return searchState;
};

export default getSearchState;
