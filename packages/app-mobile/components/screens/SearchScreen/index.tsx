import * as React from 'react';

import { StyleSheet, View, TextInput } from 'react-native';
import { connect } from 'react-redux';
import ScreenHeader from '../../ScreenHeader';
import { _ } from '@joplin/lib/locale';
import { ThemeStyle, themeStyle } from '../../global-style';
import { AppState } from '../../../utils/types';
import { Dispatch } from 'redux';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import IconButton from '../../IconButton';
import SearchResults from './SearchResults';
import AccessibleView from '../../accessibility/AccessibleView';

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
			searchContainer: {
				flexDirection: 'row',
				alignItems: 'center',
				borderWidth: 1,
				borderColor: theme.dividerColor,
			},
			searchTextInput: {
				...theme.lineInput,
				paddingLeft: theme.marginLeft,
				flex: 1,
				backgroundColor: theme.backgroundColor,
				color: theme.color,
			},
			clearIcon: {
				...theme.icon,
				color: theme.colorFaded,
				paddingRight: theme.marginRight,
				backgroundColor: theme.backgroundColor,
			},
			rootStyle: visible ? theme.rootStyle : theme.hiddenRootStyle,
		});
	}, [theme, visible]);
};

const SearchScreenComponent: React.FC<Props> = props => {
	const theme = themeStyle(props.themeId);
	const styles = useStyles(theme, props.visible);

	const [query, setQuery] = useState(props.query);

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

	const onHighlightedWordsChange = useCallback((words: string[]) => {
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
					enabled: props.noteSelectionEnabled,
					mustSelect: true,
				}}
				showSideMenuButton={false}
				showSearchButton={false}
			/>
			<View style={styles.body}>
				<View style={styles.searchContainer}>
					<TextInput
						style={styles.searchTextInput}
						autoFocus={props.visible}
						underlineColorAndroid="#ffffff00"
						onChangeText={setQuery}
						value={query}
						selectionColor={theme.textSelectionColor}
						keyboardAppearance={theme.keyboardAppearance}
					/>
					<IconButton
						themeId={props.themeId}
						iconStyle={styles.clearIcon}
						iconName='ionicon close-circle'
						onPress={clearButton_press}
						description={_('Clear')}
					/>
				</View>

				<SearchResults
					query={query}
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
