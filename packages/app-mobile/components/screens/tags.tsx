import * as React from 'react';

import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import Tag from '@joplin/lib/models/Tag';
import { themeStyle } from '../global-style';
import { ScreenHeader } from '../ScreenHeader';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../../utils/types';
import { TagEntity } from '@joplin/lib/services/database/types';
import { useCallback, useMemo, useState } from 'react';
import { Dispatch } from 'redux';
import useQueuedAsyncEffect from '@joplin/lib/hooks/useQueuedAsyncEffect';
import { getCollator, getCollatorLocale } from '@joplin/lib/models/utils/getCollator';
import SearchBar from './SearchScreen/SearchBar';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('tags');

interface Props {
	dispatch: Dispatch;
	themeId: number;
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		return StyleSheet.create({
			listItem: {
				flexDirection: 'row',
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
				alignItems: 'flex-start',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
			},
			listItemText: {
				flex: 1,
				color: theme.color,
				fontSize: theme.fontSize,
			},
			rootStyle: theme.rootStyle,
		});
	}, [themeId]);
};


const TagsScreenComponent: React.FC<Props> = props => {
	const [tags, setTags] = useState<TagEntity[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [showSearch, setShowSearch] = useState(false);
	const styles = useStyles(props.themeId);
	const collatorLocale = getCollatorLocale();
	const collator = useMemo(() => {
		return getCollator(collatorLocale);
	}, [collatorLocale]);

	type TagItemPressEvent = { id: string };

	useQueuedAsyncEffect(async (event) => {
		try {
			let fetchedTags: TagEntity[];

			if (searchQuery.trim()) {
				const searchPattern = `*${searchQuery.trim()}*`;
				fetchedTags = await Tag.searchAllWithNotes({
					titlePattern: searchPattern,
				});
			} else {
				fetchedTags = await Tag.allWithNotes();
			}

			fetchedTags.sort((a, b) => {
				return collator.compare(a.title, b.title);
			});

			if (!event.cancelled) {
				setTags(fetchedTags);
			}
		} catch (error) {
			logger.error('Error fetching tags', error);
			if (!event.cancelled) {
				setTags([]);
			}
		}
	}, [searchQuery, collator], { interval: 200 });

	const onSearchButtonPress = useCallback(() => {
		setShowSearch(!showSearch);

		// If the search button is pressed while the search bar is open, in addition to hiding the search bar, it should clear the search
		if (showSearch) {
			setSearchQuery('');
		}
	}, [showSearch]);

	const clearButton_press = useCallback(() => {
		setSearchQuery('');
	}, []);

	const onTagItemPress = useCallback((event: TagItemPressEvent) => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			tagId: event.id,
		});
	}, [props.dispatch]);

	type RenderItemEvent = { item: TagEntity };
	const onRenderItem = useCallback(({ item }: RenderItemEvent) => {
		return (
			<TouchableOpacity
				onPress={() => onTagItemPress({ id: item.id })}
				accessibilityRole='button'
				accessibilityHint={_('Shows notes for tag')}
			>
				<View style={styles.listItem}>
					<Text style={styles.listItemText}>{item.title}</Text>
				</View>
			</TouchableOpacity>
		);
	}, [onTagItemPress, styles]);

	return (
		<View style={styles.rootStyle}>
			<ScreenHeader
				title={_('Tags')}
				showSearchButton={true}
				onSearchButtonPress={onSearchButtonPress}
			/>
			{showSearch && (
				<SearchBar
					themeId={props.themeId}
					autoFocus={true}
					placeholder={_('Search tags')}
					value={searchQuery}
					onChangeText={setSearchQuery}
					onClearButtonPress={clearButton_press}
				/>
			)}
			<FlatList style={{ flex: 1 }} data={tags} renderItem={onRenderItem} keyExtractor={tag => tag.id} />
		</View>
	);
};


const TagsScreen = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(TagsScreenComponent);

export default TagsScreen;
