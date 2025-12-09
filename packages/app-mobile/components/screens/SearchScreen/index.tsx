import * as React from 'react';

import { StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';
import ScreenHeader from '../../ScreenHeader';
import { _ } from '@joplin/lib/locale';
import { ThemeStyle, themeStyle } from '../../global-style';
import { AppState } from '../../../utils/types';
import { Dispatch } from 'redux';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchResults from './SearchResults';
import AccessibleView from '../../accessibility/AccessibleView';
import { ComplexTerm } from '@joplin/lib/services/search/SearchEngine';
import SearchBar from './SearchBar';

interface Props {
	themeId: number;
	query: string;
	visible: boolean;
	dispatch: Dispatch;

	noteSelectionEnabled: boolean;
	ftsEnabled: number;
}

const useStyles = (theme: ThemeStyle, visible: boolean) => {
	return useMemo(() => {
		return StyleSheet.create({
			body: {
				flex: 1,
			},
			rootStyle: visible ? theme.rootStyle : theme.hiddenRootStyle,
		});
	}, [theme, visible]);
};

// Workaround for https://github.com/laurent22/joplin/issues/12823:
// Disable search-as-you-type for short 0-2 character searches that
// are likely to match the start of a large number of words.
const useSearchPaused = (query: string) => {
	const [pauseDisabled, setPauseDisabled] = useState(false);
	// Only disable search-as-you-type for a subset of all characters.
	// This is, for example, to ensure that search-as-you-type remains
	// enabled for CJK characters (e.g. U+6570 has length 1).
	const paused = query.match(/^[a-z0-9]{0,2}$/i);

	const onOverridePause = useCallback(() => {
		setPauseDisabled(true);
	}, []);

	useEffect(() => {
		setPauseDisabled(false);
	}, [query]);

	return {
		paused: paused && !pauseDisabled,
		onOverridePause,
	};
};

const SearchScreenComponent: React.FC<Props> = props => {
	const theme = themeStyle(props.themeId);
	const styles = useStyles(theme, props.visible);

	const [query, setQuery] = useState(props.query);
	const { paused, onOverridePause } = useSearchPaused(query);

	const globalQueryRef = useRef(props.query);
	globalQueryRef.current = props.query;
	useEffect(() => {
		if (globalQueryRef.current !== query) {
			props.dispatch({
				type: 'SEARCH_QUERY',
				query,
			});
		}
	}, [props.dispatch, query]);

	const clearButton_press = useCallback(() => {
		setQuery('');
	}, []);

	const onHighlightedWordsChange = useCallback((words: (ComplexTerm | string)[]) => {
		props.dispatch({
			type: 'SET_HIGHLIGHTED',
			words,
		});
	}, [props.dispatch]);

	return (
		<AccessibleView style={styles.rootStyle} inert={!props.visible}>
			<ScreenHeader
				title={_('Search')}
				folderPickerOptions={{
					visible: props.noteSelectionEnabled,
					mustSelect: true,
				}}
				showSideMenuButton={false}
				showSearchButton={false}
			/>
			<View style={styles.body}>
				<SearchBar
					themeId={props.themeId}
					autoFocus={props.visible}
					value={query}
					onChangeText={setQuery}
					onSubmitEditing={onOverridePause}
					onClearButtonPress={clearButton_press}
				/>
				<SearchResults
					query={query}
					paused={paused}
					ftsEnabled={props.ftsEnabled}
					onHighlightedWordsChange={onHighlightedWordsChange}
				/>
			</View>
		</AccessibleView>
	);
};

const SearchScreen = connect((state: AppState) => {
	return {
		query: state.searchQuery,
		themeId: state.settings.theme,
		settings: state.settings,
		noteSelectionEnabled: state.noteSelectionEnabled,
		ftsEnabled: state.settings['db.ftsEnabled'],
	};
})(SearchScreenComponent);

export default SearchScreen;
