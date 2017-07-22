import React, { Component } from 'react';
import { connect } from 'react-redux'
import { ListView, Text, TouchableHighlight, Switch, View, StyleSheet } from 'react-native';
import { Log } from 'lib/log.js';
import { _ } from 'lib/locale.js';
import { Checkbox } from 'lib/components/checkbox.js';
import { reg } from 'lib/registry.js';
import { Note } from 'lib/models/note.js';
import { time } from 'lib/time-utils.js';
import { globalStyle } from 'lib/components/global-style.js';

const styleObject = {
	listItem: {
		flexDirection: 'row',
		height: 40,
		borderBottomWidth: 1,
		borderBottomColor: globalStyle.dividerColor,
		alignItems: 'center',
		paddingLeft: globalStyle.marginLeft,
		backgroundColor: globalStyle.backgroundColor,
	},
	listItemText: {
		color: globalStyle.color,
	},
};

const styles = StyleSheet.create(styleObject);

class NoteItemComponent extends Component {

	noteItem_press(noteId) {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Note',
			noteId: noteId,
		});
	}

	render() {
		const note = this.props.note ? this.props.note : {};
		const onPress = this.props.onPress;
		const onLongPress = this.props.onLongPress;
		const onCheckboxChange = this.props.onCheckboxChange;

		const checkboxStyle = !Number(note.is_todo) ? { display: 'none' } : { color: globalStyle.color };
		const checkboxChecked = !!Number(note.todo_completed);

		return (
			<TouchableHighlight onPress={() => onPress ? onPress(note) : this.noteItem_press(note.id)} onLongPress={() => onLongPress(note)} underlayColor="#0066FF">
				<View style={ styles.listItem }>
					<Checkbox style={checkboxStyle} checked={checkboxChecked} onChange={(checked) => { onCheckboxChange(note, checked) }}/><Text style={styles.listItemText}>{note.title}</Text>
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