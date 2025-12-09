import * as React from 'react';

import { StyleSheet, View, Text, ScrollView, ViewStyle, Platform, AccessibilityInfo, ScrollViewProps, TextStyle } from 'react-native';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from './global-style';
import ComboBox, { Option } from './ComboBox';
import IconButton from './IconButton';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TagEntity } from '@joplin/lib/services/database/types';
import { Divider } from 'react-native-paper';
import focusView from '../utils/focusView';
import { msleep } from '@joplin/utils/time';
import { getCollator, getCollatorLocale } from '@joplin/lib/models/utils/getCollator';

export enum TagEditorMode {
	Large,
	Compact,
}

interface Props {
	themeId: number;
	tags: string[];
	allTags: TagEntity[];
	mode: TagEditorMode;
	style: ViewStyle;
	onTagsChange: (newTags: string[])=> void;
	headerStyle?: TextStyle;
	searchResultProps?: ScrollViewProps;
}

const useStyles = (themeId: number, headerStyle: TextStyle|undefined) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			tag: {
				borderRadius: 16,
				paddingStart: 8,
				backgroundColor: theme.backgroundColor3,
				color: theme.color3,
				flexDirection: 'row',
				alignItems: 'center',
				maxWidth: '100%',
				gap: 4,
			},
			tagText: {
				color: theme.color3,
				fontSize: theme.fontSize,
				flexShrink: 1,
			},
			removeTagButton: {
				color: theme.color3,
				fontSize: theme.fontSize,
				padding: 3,
			},
			tagBoxRoot: {
				flexDirection: 'column',
				flexShrink: 1,
			},
			tagBoxScrollView: {
				borderColor: theme.dividerColor,
				borderWidth: 1,
				borderRadius: 4,
				height: 80,
				flexShrink: 1,
			},
			tagBoxContent: {
				flexDirection: 'row',
				gap: 4,
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
				paddingLeft: 4,
				paddingRight: 4,
				flexWrap: 'wrap',
				maxWidth: '100%',
			},
			header: {
				...theme.headerStyle,
				fontSize: theme.fontSize,
				marginBottom: theme.itemMarginBottom,
				...headerStyle,
			},
			divider: {
				marginTop: theme.margin * 1.4,
				marginBottom: theme.margin,
				backgroundColor: theme.dividerColor,
			},
			tagSearch: {
				flexGrow: 1,
				flexShrink: 1,
			},
			noTagsLabel: {
				fontSize: theme.fontSize,
				color: theme.colorFaded,
			},
		});
	}, [themeId, headerStyle]);
};

type Styles = ReturnType<typeof useStyles>;

interface TagChipProps {
	title: string;
	themeId: number;
	styles: Styles;
	onRemove: (title: string)=> void;

	autofocus: boolean;
	onAutoFocusComplete: ()=> void;
}

const TagCard: React.FC<TagChipProps> = props => {
	const onRemove = useCallback(() => {
		props.onRemove(props.title);
	}, [props.title, props.onRemove]);

	const removeButtonRef = useRef<View>(null);
	useEffect(() => {
		if (props.autofocus) {
			focusView('TagEditor::TagCard', removeButtonRef.current);
			props.onAutoFocusComplete();
		}
	}, [props.autofocus, props.onAutoFocusComplete]);

	return <View
		style={props.styles.tag}
		role='listitem'
	>
		<Text
			ellipsizeMode='tail'
			numberOfLines={1}
			style={props.styles.tagText}
		>{props.title}</Text>
		<IconButton
			pressableRef={removeButtonRef}
			themeId={props.themeId}
			description={_('Remove %s', props.title)}
			iconName='fas fa-times-circle'
			iconStyle={props.styles.removeTagButton}
			onPress={onRemove}
		/>
	</View>;
};

interface TagsBoxProps {
	tags: string[];
	autofocusTag: string;
	onAutoFocusComplete: ()=> void;
	styles: Styles;
	themeId: number;
	onRemoveTag: (tag: string)=> void;
}

const TagsBox: React.FC<TagsBoxProps> = props => {
	const collatorLocale = getCollatorLocale();
	const collator = useMemo(() => {
		return getCollator(collatorLocale);
	}, [collatorLocale]);

	const onRemoveTag = useCallback((tag: string) => {
		props.onRemoveTag(tag);
	}, [props.onRemoveTag]);

	const renderContent = () => {
		if (props.tags.length) {
			return props.tags
				.sort((a, b) => {
					return collator.compare(a, b);
				})
				.map(tag => (
					<TagCard
						key={`tag-${tag}`}
						title={tag}
						styles={props.styles}
						themeId={props.themeId}
						onRemove={onRemoveTag}
						autofocus={props.autofocusTag === tag}
						onAutoFocusComplete={props.onAutoFocusComplete}
					/>
				));
		} else {
			return <Text
				style={props.styles.noTagsLabel}
			>{_('No tags')}</Text>;
		}
	};

	return <View style={props.styles.tagBoxRoot}>
		<Text style={props.styles.header} role='heading'>{_('Associated tags:')}</Text>
		<ScrollView
			keyboardShouldPersistTaps="handled"
			style={props.styles.tagBoxScrollView}
			// On web, specifying aria-live here announces changes to the associated tags.
			// However, on Android (and possibly iOS), this breaks focus behavior:
			aria-live={Platform.OS === 'web' ? 'polite' : undefined}
		>
			<View
				// Accessibility: Marking the list of tags as a list seems to prevent focus from jumping
				// to the top of the modal after removing a tag.
				role='list'
				style={props.styles.tagBoxContent}
			>
				{renderContent()}
			</View>
		</ScrollView>
	</View>;
};

const TagEditor: React.FC<Props> = props => {
	const styles = useStyles(props.themeId, props.headerStyle);

	const comboBoxItems = useMemo(() => {
		return props.allTags
			// Exclude tags already associated with the note
			.filter(tag => !props.tags.some(o => o.toLowerCase() === tag.title?.toLowerCase()))
			.map((tag): Option => {
				const title = tag.title ?? 'Untitled';
				return {
					title,
					icon: null,
					accessibilityHint: _('Adds tag'),
					willRemoveOnPress: true,
				};
			});
	}, [props.tags, props.allTags]);

	const [autofocusTag, setAutofocusTag] = useState('');
	const onAutoFocusComplete = useCallback(() => {
		// Clear the auto-focus state so that a different view can be auto-focused in the future
		setAutofocusTag('');
	}, []);

	const onAddTag = useCallback((title: string) => {
		AccessibilityInfo.announceForAccessibility(_('Added tag: %s', title));
		props.onTagsChange([...props.tags, title.trim()]);
	}, [props.tags, props.onTagsChange]);

	const onRemoveTag = useCallback(async (title: string) => {
		if (!title) return;
		const lowercaseTitle = title.toLowerCase();
		const previousTagIndex = props.tags.findIndex(item => item.toLowerCase() === lowercaseTitle);
		const targetTag = props.tags[previousTagIndex + 1] ?? props.tags[previousTagIndex - 1];
		setAutofocusTag(targetTag);

		// Workaround: Delay auto-focusing the next tag. On iOS, a brief delay is required to
		// prevent focus from occasionally jumping away from the tag box.
		await msleep(100);
		AccessibilityInfo.announceForAccessibility(_('Removed tag: %s', title));
		props.onTagsChange(props.tags.filter(tag => tag.toLowerCase() !== lowercaseTitle));
	}, [props.tags, props.onTagsChange]);

	const onComboBoxSelect = useCallback((item: { title: string }) => {
		onAddTag(item.title);
		return { willRemove: true };
	}, [onAddTag]);

	const allTagsSetNormalized = useMemo(() => {
		return new Set([
			...props.allTags.map(tag => tag.title?.trim()?.toLowerCase()),
			...props.tags.map(tag => tag.trim().toLowerCase()),
		]);
	}, [props.allTags, props.tags]);

	const onCanAddTag = useCallback((tag: string) => {
		return !allTagsSetNormalized.has(tag.trim().toLowerCase());
	}, [allTagsSetNormalized]);

	const showAssociatedTags = props.mode === TagEditorMode.Large || props.tags.length > 0;

	return <View style={props.style}>
		{showAssociatedTags && <>
			<TagsBox
				themeId={props.themeId}
				styles={styles}
				tags={props.tags}
				onRemoveTag={onRemoveTag}
				autofocusTag={autofocusTag}
				onAutoFocusComplete={onAutoFocusComplete}
			/>
			<Divider style={styles.divider}/>
		</>}
		<Text style={styles.header} role='heading'>{_('Add tags:')}</Text>
		<ComboBox
			items={comboBoxItems}
			onItemSelected={onComboBoxSelect}
			onAddItem={onAddTag}
			canAddItem={onCanAddTag}
			alwaysExpand={props.mode === TagEditorMode.Large}
			style={styles.tagSearch}
			placeholder={_('Search tags')}
			searchInputProps={{
				autoCapitalize: 'none',
			}}
			searchResultProps={props.searchResultProps}
		/>
	</View>;
};

export default TagEditor;
