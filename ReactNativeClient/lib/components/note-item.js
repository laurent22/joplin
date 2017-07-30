import React, { Component } from 'react';
import { connect } from 'react-redux'
import { ListView, Text, TouchableHighlight, View, StyleSheet } from 'react-native';
import { Log } from 'lib/log.js';
import { _ } from 'lib/locale.js';
import { Checkbox } from 'lib/components/checkbox.js';
import { reg } from 'lib/registry.js';
import { Note } from 'lib/models/note.js';
import { time } from 'lib/time-utils.js';
import { globalStyle } from 'lib/components/global-style.js';

let styles = {
	listItem: {
		flexDirection: 'row',
		height: 40,
		borderBottomWidth: 1,
		borderBottomColor: globalStyle.dividerColor,
		alignItems: 'center',
		paddingLeft: globalStyle.marginLeft,
		paddingRight: globalStyle.marginRight,
		backgroundColor: globalStyle.backgroundColor,
	},
	listItemText: {
		flex: 1,
		color: globalStyle.color,
	},
};

styles.listItemFadded = Object.assign({}, styles.listItem);
styles.listItemFadded.opacity = 0.4;

styles = StyleSheet.create(styles);

class NoteItemComponent extends Component {

	noteItem_press(noteId) {
		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Note',
			noteId: noteId,
		});
	}

	async todoCheckbox_change(checked) {	
		if (!this.props.note) return;

		const newNote = {
			id: this.props.note.id,
			todo_completed: checked ? time.unixMs() : 0,
		}
		await Note.save(newNote);
	}

	onPress() {
		if (!this.props.note) return;

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Note',
			noteId: this.props.note.id,
		});
	}

	render() {
		const note = this.props.note ? this.props.note : {};
		const onPress = this.props.onPress;
		const onCheckboxChange = this.props.onCheckboxChange;

		const checkboxStyle = !Number(note.is_todo) ? { display: 'none' } : { color: globalStyle.color };
		const checkboxChecked = !!Number(note.todo_completed);

		const listItemStyle = !!Number(note.is_todo) && checkboxChecked ? styles.listItemFadded : styles.listItem;

		return (
			<TouchableHighlight style={{borderWidth:1, borderColor:'red'}} onPress={() => this.onPress()} underlayColor="#0066FF">
				<View style={ listItemStyle }>
					<Checkbox
						style={checkboxStyle}
						checked={checkboxChecked}
						onChange={(checked) => this.todoCheckbox_change(checked)}
					/>
					<Text style={styles.listItemText}>{note.title}</Text>
				</View>
			</TouchableHighlight>
		);
	}

}

const NoteItem = connect(
	(state) => {
		return {};
	}
)(NoteItemComponent)

export { NoteItem }