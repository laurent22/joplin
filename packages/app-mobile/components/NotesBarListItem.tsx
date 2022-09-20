import * as React from 'react';
import Checkbox from './checkbox';
import Note from '@joplin/lib/models/Note';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Style } from './global-style';
import { State } from '@joplin/lib/reducer';
const { connect } = require('react-redux');
const { _ } = require('@joplin/lib/locale');
import shim from '@joplin/lib/shim';
import { themeStyle } from './global-style';


interface NoteListProps {
	note: any;
    themeId: number;
	todoCheckbox_change: (checked: boolean)=> void;
	dispatch: Function;
	selectedNoteId: string;
}

const NotesBarListItemComponent = function(props: NoteListProps) {
	const note = props.note ?? {};
	const isTodo = !!Number(note.is_todo);

	const styles = (): Style => {
		const themeId = props.themeId;
		const theme = themeStyle(themeId);

		const styles: Style = {
			horizontalFlex: {
				flexDirection: 'row',
			},
			padding: {
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: 12,
				paddingBottom: 12,
			},
			button: {
				height: 42,
				width: 42,
				backgroundColor: theme.color4,
				alignItems: 'center',
				justifyContent: 'center',
				borderRadius: 4,
				flex: 0.5,
				marginLeft: 8,
			},
			itemText: {
				fontSize: theme.fontSize,
				color: theme.color,
				paddingTop: 12,
				paddingBottom: 12,
			},
			checkbox: {
				paddingRight: 10,
				paddingLeft: theme.marginLeft,
				paddingTop: 12,
				paddingBottom: 12,
				color: theme.color,
			},
			selectedItem: props.selectedNoteId === note.id ? {
				backgroundColor: theme.dividerColor,
			} : null,
			item: {
				borderBottomWidth: 1,
				borderColor: theme.dividerColor,
			},
		};

		return StyleSheet.create(styles);
	};

	const onTodoCheckboxChange = async (checked: boolean) => {
		await props.todoCheckbox_change(checked);
	};

	const onPress = async () => {
		if (!note) return;
		if (note.encryption_applied) return;

		props.dispatch({
			type: 'NAV_BACK',
		});

		shim.setTimeout(() => {
			props.dispatch({
				type: 'NAV_GO',
				routeName: 'Note',
				noteId: note.id,
			});
		}, 5);
	};

	const noteTitle = Note.displayTitle(note);
	let item;

	if (isTodo) {
		item = (
			<View>
				<TouchableOpacity style={[styles().horizontalFlex, styles().item, styles().selectedItem]} onPress={onPress}>
					<Checkbox
						style={styles().checkbox}
						checked={!!Number(note.todo_completed)}
						onChange={(checked) => onTodoCheckboxChange(checked)}
						accessibilityLabel={_('to-do: %s', noteTitle)}
					/>
					<Text style={styles().itemText}>{noteTitle}</Text>
				</TouchableOpacity>
			</View>
		);
	} else {
		item = (
			<View>
				<TouchableOpacity onPress={onPress} style={[styles().selectedItem, styles().item]}>
					<Text style={[styles().itemText, styles().padding]}>{noteTitle}</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return item;
};

const NotesBarListItem = connect((state: State) => {
	return {
		themeId: state.settings.theme,
		selectedNoteId: state.selectedNoteIds[0],
	};
})(NotesBarListItemComponent);

export default NotesBarListItem;
