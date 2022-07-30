import * as React from 'react';
import Checkbox from './checkbox';
import Note from '@joplin/lib/models/Note';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Style } from './global-style';
import { State } from '@joplin/lib/reducer';
const { connect } = require('react-redux');
import { themeStyle } from './global-style';
const { _ } = require('@joplin/lib/locale');

interface NoteListProps {
	note: any;
    themeId: string;
	todoCheckbox_change: (checked: boolean)=> void;
}

const NotesBarListItemComponent = function(props: NoteListProps) {
	const note = props.note ? props.note : {};
	const isTodo = !!Number(note.is_todo);

	function styles() {
		const themeId = props.themeId;
		const theme = themeStyle(themeId);

		let styles: Style = {
			horizontalFlex: {
				flexDirection: 'row',
			},
			padding: {
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: 12,
				paddingBottom: 12,
			},
			divider: {
				backgroundColor: theme.dividerColor,
				height: 1,
				width: '100%',
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
			},
			checkbox: {
				paddingRight: 10,
			},
		};

		styles = StyleSheet.create(styles);

		return styles;
	}

	const dividerComp = (
		<View style={styles().divider}></View>
	);

	async function onTodoCheckboxChange(checked: boolean) {
		await props.todoCheckbox_change(checked);
	}

	const noteTitle = Note.displayTitle(note);
	let item;

	if (isTodo) {
		item = (
			<View>
				<TouchableOpacity style={[styles().padding, styles().horizontalFlex]}>
					<Checkbox
						style={styles().checkbox}
						checked={!!Number(note.todo_completed)}
						onChange={(checked) => onTodoCheckboxChange(checked)}
						accessibilityLabel={_('to-do: %s', noteTitle)}
					/>
					<Text style={styles().itemText}>{noteTitle}</Text>
				</TouchableOpacity>
				{dividerComp}
			</View>
		);
	} else {
		item = (
			<View>
				<TouchableOpacity style={styles().padding}>
					<Text style={styles().itemText}>{noteTitle}</Text>
				</TouchableOpacity>
				{dividerComp}
			</View>
		);
	}

	return item;
};

const NotesBarListItem = connect((state: State) => {
	return {
		themeId: state.settings.theme,
	};
})(NotesBarListItemComponent);

export default NotesBarListItem;
