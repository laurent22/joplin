import * as React from 'react';

import { View, Text, FlatList, StyleSheet, AccessibilityRole } from 'react-native';
import { connect } from 'react-redux';
import Tag from '@joplin/lib/models/Tag';
import { themeStyle } from '../global-style';
import { ScreenHeader } from '../ScreenHeader';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../../utils/types';
import { TagEntity } from '@joplin/lib/services/database/types';
import { useCallback, useMemo, useState, useContext } from 'react';
import { Dispatch } from 'redux';
import useQueuedAsyncEffect from '@joplin/lib/hooks/useQueuedAsyncEffect';
import { getCollator, getCollatorLocale } from '@joplin/lib/models/utils/getCollator';
import { DialogContext } from '../DialogManager';
import useOnLongPressProps from '../../utils/hooks/useOnLongPressProps';
import { substrWithEllipsis } from '@joplin/lib/string-utils';
import { PromptButtonSpec } from '../DialogManager/types';
import MultiTouchableOpacity from '../buttons/MultiTouchableOpacity';
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

interface TagItemProps {
	tag: TagEntity;
	themeId: number;
	onPress: (id: string)=> void;
	onLongPress: (tag: TagEntity)=> void;
}

const TagItem: React.FC<TagItemProps> = ({ tag, themeId, onPress, onLongPress }) => {
	const styles = useStyles(themeId);
	const onLongPressProps = useOnLongPressProps({ onLongPress: () => onLongPress(tag), actionDescription: _('Edit tag') });
	const accessibilityRole: AccessibilityRole = 'button';
	const pressableProps = {
		accessibilityRole,
		accessibilityHint: _('Shows notes for tag'),
		...onLongPressProps,
	};

	return (
		<MultiTouchableOpacity
			{...pressableProps}
			containerProps={{
				style: {},
			}}
			onPress={() => onPress(tag.id)}
			beforePressable={null}
		>
			<View style={styles.listItem}>
				<Text style={styles.listItemText}>{tag.title}</Text>
			</View>
		</MultiTouchableOpacity>
	);
};


const TagsScreenComponent: React.FC<Props> = props => {
	const [tags, setTags] = useState<TagEntity[]>([]);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [searchQuery, setSearchQuery] = useState('');
	const [showSearch, setShowSearch] = useState(false);
	const styles = useStyles(props.themeId);
	const dialogs = useContext(DialogContext);
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
	}, [searchQuery, collator, refreshTrigger], { interval: 200 });

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

	const onTagItemLongPress = useCallback(async (tag: TagEntity) => {
		const menuItems: PromptButtonSpec[] = [];

		const generateTagDeletion = () => {
			return () => {
				dialogs.prompt('', _('Delete tag "%s"?\n\nAll notes associated with this tag will remain, but the tag will be removed from all notes.', substrWithEllipsis(tag.title, 0, 32)), [
					{
						text: _('OK'),
						onPress: async () => {
							await Tag.delete(tag.id, { sourceDescription: 'tags-screen (long-press)' });
							setRefreshTrigger(prev => prev + 1);
						},
					},
					{
						text: _('Cancel'),
						onPress: () => { },
						style: 'cancel',
					},
				]);
			};
		};

		menuItems.push({
			text: _('Rename'),
			onPress: async () => {
				const newName = await dialogs.promptForText(_('Rename tag:'), tag.title);
				if (newName && newName.trim() && newName.trim() !== tag.title) {
					try {
						const updatedTag = { ...tag, title: newName };
						await Tag.save(updatedTag, { fields: ['title'], userSideValidation: true });
						setRefreshTrigger(prev => prev + 1);
					} catch (error) {
						await dialogs.error(error instanceof Error ? error.message : String(error));
					}
				}
			},
		});

		menuItems.push({
			text: _('Delete'),
			onPress: generateTagDeletion(),
			style: 'destructive',
		});

		menuItems.push({
			text: _('Cancel'),
			onPress: () => {},
			style: 'cancel',
		});

		dialogs.prompt(
			'',
			_('Tag: %s', tag.title),
			menuItems,
		);
	}, [dialogs]);

	type RenderItemEvent = { item: TagEntity };
	const onRenderItem = useCallback(({ item }: RenderItemEvent) => {
		return (
			<TagItem
				tag={item}
				themeId={props.themeId}
				onPress={(id) => onTagItemPress({ id })}
				onLongPress={onTagItemLongPress}
			/>
		);
	}, [onTagItemPress, onTagItemLongPress, props.themeId]);

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
