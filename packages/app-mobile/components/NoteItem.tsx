import * as React from 'react';
import { memo, useCallback, useMemo } from 'react';
import { connect } from 'react-redux';
import { Text, View, StyleSheet, TextStyle, ViewStyle, AccessibilityInfo, TouchableOpacity } from 'react-native';
import Checkbox from './Checkbox';
import Note from '@joplin/lib/models/Note';
import time from '@joplin/lib/time';
import { themeStyle } from './global-style';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../utils/types';
import { Dispatch } from 'redux';
import { NoteEntity } from '@joplin/lib/services/database/types';
import useOnLongPressProps from '../utils/hooks/useOnLongPressProps';

interface Props {
	dispatch: Dispatch;
	themeId: number;
	note: NoteEntity;
	noteSelectionEnabled: boolean;
	selectedNoteIds: string[];
}


const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		const listItem: ViewStyle = {
			flexDirection: 'row',
			// height: 40,
			borderBottomWidth: 1,
			borderBottomColor: theme.dividerColor,
			alignItems: 'flex-start',
			paddingLeft: theme.marginLeft,
			paddingRight: theme.marginRight,
			paddingTop: theme.itemMarginTop,
			paddingBottom: theme.itemMarginBottom,
			// backgroundColor: theme.backgroundColor,
		};

		const listItemWithCheckbox = { ...listItem };
		delete listItemWithCheckbox.paddingTop;
		delete listItemWithCheckbox.paddingBottom;
		delete listItemWithCheckbox.paddingLeft;

		const listItemText: TextStyle = {
			flex: 1,
			color: theme.color,
			fontSize: theme.fontSize,
		};

		const listItemTextWithCheckbox = { ...listItemText };
		listItemTextWithCheckbox.marginTop = theme.itemMarginTop - 1;
		listItemTextWithCheckbox.marginBottom = listItem.paddingBottom;

		const selectionWrapper: ViewStyle = { };

		const selectionWrapperSelected = { ...selectionWrapper };
		selectionWrapperSelected.backgroundColor = theme.selectedColor;

		return StyleSheet.create({
			listItem,
			listItemText,
			selectionWrapper,
			listItemWithCheckbox,
			listItemTextWithCheckbox,
			selectionWrapperSelected,
			checkboxStyle: {
				color: theme.color,
				paddingRight: 10,
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
				paddingLeft: theme.marginLeft,
			},
			checkedOpacityStyle: {
				opacity: 0.4,
			},
			uncheckedOpacityStyle: { },
		});
	}, [themeId]);
};

const NoteItemComponent: React.FC<Props> = memo(props => {
	const styles = useStyles(props.themeId);

	const todoCheckbox_change = useCallback(async (checked: boolean) => {
		if (!props.note) return;

		const newNote = {
			id: props.note.id,
			todo_completed: checked ? time.unixMs() : 0,
		};
		await Note.save(newNote);

		props.dispatch({ type: 'NOTE_SORT' });
	}, [props.note, props.dispatch]);

	const onPress = useCallback(() => {
		if (!props.note) return;
		if (props.note.encryption_applied) return;

		if (props.noteSelectionEnabled) {
			props.dispatch({
				type: 'NOTE_SELECTION_TOGGLE',
				id: props.note.id,
			});
		} else {
			props.dispatch({
				type: 'NAV_GO',
				routeName: 'Note',
				noteId: props.note.id,
			});
		}
	}, [props.note, props.noteSelectionEnabled, props.dispatch]);

	const onLongPress = useCallback(() => {
		if (!props.note) return;

		if (!props.noteSelectionEnabled) {
			AccessibilityInfo.announceForAccessibility(_('Entering selection mode'));
		}

		props.dispatch({
			type: props.noteSelectionEnabled ? 'NOTE_SELECTION_TOGGLE' : 'NOTE_SELECTION_START',
			id: props.note.id,
		});
	}, [props.dispatch, props.note, props.noteSelectionEnabled]);


	const note = props.note ?? {};
	const isTodo = !!Number(note.is_todo);
	const checkboxChecked = !!Number(note.todo_completed);

	const checkboxStyle = styles.checkboxStyle;
	const listItemStyle = isTodo ? styles.listItemWithCheckbox : styles.listItem;
	const listItemTextStyle = isTodo ? styles.listItemTextWithCheckbox : styles.listItemText;
	const opacityStyle = isTodo && checkboxChecked ? styles.checkedOpacityStyle : styles.uncheckedOpacityStyle;
	const isSelected = props.noteSelectionEnabled && props.selectedNoteIds.includes(note.id);

	const selectionWrapperStyle = isSelected ? styles.selectionWrapperSelected : styles.selectionWrapper;

	const noteTitle = Note.displayTitle(note);

	const selectDeselectLabel = isSelected ? _('Deselect') : _('Select');
	const onLongPressProps = useOnLongPressProps({ onLongPress, actionDescription: selectDeselectLabel });

	const contextMenuProps = {
		// Web only.
		onContextMenu: onLongPressProps.onContextMenu,
	};
	return (
		<View
			// context menu listeners need to be added to a parent view of the
			// TouchableOpacity -- on web, TouchableOpacity registers a custom
			// onContextMenu handler that can't be overridden.
			{...contextMenuProps}
		>
			<TouchableOpacity
				activeOpacity={0.5}
				onPress={onPress}
				accessibilityRole='button'
				accessibilityHint={props.noteSelectionEnabled ? '' : _('Opens note')}
				aria-pressed={props.noteSelectionEnabled ? isSelected : undefined}
				accessibilityState={{ selected: isSelected }}
				{...onLongPressProps}
			>
				<View style={[selectionWrapperStyle, opacityStyle, listItemStyle]}>
					{isTodo ? <Checkbox
						style={checkboxStyle}
						checked={checkboxChecked}
						onChange={todoCheckbox_change}
						accessibilityLabel={_('to-do: %s', noteTitle)}
					/> : null }
					<Text style={listItemTextStyle}>{noteTitle}</Text>
				</View>
			</TouchableOpacity>
		</View>
	);
});

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
		noteSelectionEnabled: state.noteSelectionEnabled,
		selectedNoteIds: state.selectedNoteIds,
	};
})(NoteItemComponent);

