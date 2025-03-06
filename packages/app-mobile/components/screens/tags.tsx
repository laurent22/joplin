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
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';

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
	const styles = useStyles(props.themeId);

	type TagItemPressEvent = { id: string };

	useAsyncEffect(async () => {
		const tags = await Tag.allWithNotes();
		tags.sort((a, b) => {
			return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : +1;
		});
		setTags(tags);
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
