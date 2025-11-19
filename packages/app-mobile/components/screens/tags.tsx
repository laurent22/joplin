import * as React from 'react';

import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
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
import IconButton from '../IconButton';

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
		});
	}, [themeId]);
};


const TagsScreenComponent: React.FC<Props> = props => {
	const [tags, setTags] = useState<TagEntity[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [showSearch, setShowSearch] = useState(false);
	const styles = useStyles(props.themeId);
	const theme = themeStyle(props.themeId);
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
			if (!event.cancelled) {
				setTags([]);
			}
		}
	}, [searchQuery, collator], { interval: 200 });

	const onSearchButtonPress = useCallback(() => {
		setShowSearch(!showSearch);
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
				<View style={styles.searchContainer}>
					<TextInput
						style={styles.searchTextInput}
						autoFocus={true}
						underlineColorAndroid="#ffffff00"
						onChangeText={setSearchQuery}
						value={searchQuery}
						placeholder={_('Search tags')}
						placeholderTextColor={theme.colorFaded}
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
