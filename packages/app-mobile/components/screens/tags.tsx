import * as React from 'react';

import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import Tag from '@joplin/lib/models/Tag';
import { themeStyle } from '../global-style';
import { ScreenHeader } from '../ScreenHeader';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../../utils/types';
import { TagEntity } from '@joplin/lib/services/database/types';
import { useCallback, useMemo, useState, useContext } from 'react';
import { Dispatch } from 'redux';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { getCollator, getCollatorLocale } from '@joplin/lib/models/utils/getCollator';
import { DialogContext } from '../DialogManager';
import useOnLongPressProps from '../../utils/hooks/useOnLongPressProps';
import { substrWithEllipsis } from '@joplin/lib/string-utils';
import { PromptButtonSpec } from '../DialogManager/types';

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
	const longPressProps = useOnLongPressProps({
		onLongPress: () => onLongPress(tag),
		actionDescription: _('Edit tag'),
	});

	return (
		<TouchableOpacity
			onPress={() => onPress(tag.id)}
			accessibilityRole='button'
			accessibilityHint={_('Shows notes for tag')}
			{...longPressProps}
		>
			<View style={styles.listItem}>
				<Text style={styles.listItemText}>{tag.title}</Text>
			</View>
		</TouchableOpacity>
	);
};


const TagsScreenComponent: React.FC<Props> = props => {
	const [tags, setTags] = useState<TagEntity[]>([]);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const styles = useStyles(props.themeId);
	const dialogs = useContext(DialogContext);
	const collatorLocale = getCollatorLocale();
	const collator = useMemo(() => {
		return getCollator(collatorLocale);
	}, [collatorLocale]);

	type TagItemPressEvent = { id: string };

	const loadTags = useCallback(async () => {
		const tags = await Tag.allWithNotes();
		tags.sort((a, b) => {
			return collator.compare(a.title, b.title);
		});
		setTags(tags);
	}, [collator]);

	useAsyncEffect(async () => {
		await loadTags();
	}, [loadTags, refreshTrigger]);

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
						const updatedTag = { ...tag, title: newName.trim() };
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
			<ScreenHeader title={_('Tags')} showSearchButton={false} />
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
