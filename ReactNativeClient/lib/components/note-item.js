import React, { Component } from 'react';
import { connect } from 'react-redux'
import { ListView, Text, TouchableHighlight, View, StyleSheet } from 'react-native';
import { Log } from 'lib/log.js';
import { _ } from 'lib/locale.js';
import { Checkbox } from 'lib/components/checkbox.js';
import { reg } from 'lib/registry.js';
import { Note } from 'lib/models/note.js';
import { time } from 'lib/time-utils.js';
import { globalStyle, themeStyle } from 'lib/components/global-style.js';

class NoteItemComponent extends Component {

	constructor() {
		super();
		this.styles_ = {};
	}

	noteItem_press(noteId) {
		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Note',
			noteId: noteId,
		});
	}

	styles() {
		const theme = themeStyle(this.props.theme);

		if (this.styles_[this.props.theme]) return this.styles_[this.props.theme];
		this.styles_ = {};

		let styles = {
			listItem: {
				flexDirection: 'row',
				//height: 40,
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
				alignItems: 'center',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
				backgroundColor: theme.backgroundColor,
			},
			listItemText: {
				flex: 1,
				color: theme.color,
				fontSize: theme.fontSize,
			},
		};

		styles.listItemFadded = Object.assign({}, styles.listItem);
		styles.listItemFadded.opacity = 0.4;

		this.styles_[this.props.theme] = StyleSheet.create(styles);
		return this.styles_[this.props.theme];
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
		const theme = themeStyle(this.props.theme);

		const checkboxStyle = !Number(note.is_todo) ? { display: 'none' } : { color: theme.color };
		const checkboxChecked = !!Number(note.todo_completed);

		const listItemStyle = !!Number(note.is_todo) && checkboxChecked ? this.styles().listItemFadded : this.styles().listItem;

		return (
			<TouchableHighlight onPress={() => this.onPress()} underlayColor="#0066FF">
				<View style={ listItemStyle }>
					<Checkbox
						style={checkboxStyle}
						checked={checkboxChecked}
						onChange={(checked) => this.todoCheckbox_change(checked)}
					/>
					<Text style={this.styles().listItemText}>{note.title}</Text>
				</View>
			</TouchableHighlight>
		);
	}

}

const NoteItem = connect(
	(state) => {
		return {
			theme: state.settings.theme,
		};
	}
)(NoteItemComponent)

export { NoteItem }