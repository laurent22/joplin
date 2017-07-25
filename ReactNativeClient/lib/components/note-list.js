import React, { Component } from 'react';
import { connect } from 'react-redux'
import { ListView, Text, TouchableHighlight, Switch, View, StyleSheet } from 'react-native';
import { Log } from 'lib/log.js';
import { _ } from 'lib/locale.js';
import { Checkbox } from 'lib/components/checkbox.js';
import { NoteItem } from 'lib/components/note-item.js';
import { reg } from 'lib/registry.js';
import { Note } from 'lib/models/note.js';
import { Setting } from 'lib/models/setting.js';
import { time } from 'lib/time-utils.js';
import { globalStyle } from 'lib/components/global-style.js';

const styles = StyleSheet.create({
	noItemMessage: {
		paddingLeft: globalStyle.marginLeft,
		paddingRight: globalStyle.marginRight,
		paddingTop: globalStyle.marginTop,
		paddingBottom: globalStyle.marginBottom
	},
});

class NoteListComponent extends Component {

	constructor() {
		super();
		const ds = new ListView.DataSource({
			rowHasChanged: (r1, r2) => { return r1 !== r2; }
		});
		this.state = {
			dataSource: ds,
			items: [],
			selectedItemIds: [],
		};
	}

	filterNotes(notes) {
		const todoFilter = Setting.value('todoFilter');
		if (todoFilter == 'all') return notes;

		const now = time.unixMs();
		const maxInterval = 1000 * 60 * 60 * 24;
		const notRecentTime = now - maxInterval;

		let output = [];
		for (let i = 0; i < notes.length; i++) {
			const note = notes[i];
			if (note.is_todo) {
				if (todoFilter == 'recent' && note.updated_time < notRecentTime && !!note.todo_completed) continue;
				if (todoFilter == 'nonCompleted' && !!note.todo_completed) continue;
			}
			output.push(note);
		}
		return output;
	}

	componentWillMount() {
		const newDataSource = this.state.dataSource.cloneWithRows(this.filterNotes(this.props.items));
		this.state = { dataSource: newDataSource };
	}

	componentWillReceiveProps(newProps) {
		// https://stackoverflow.com/questions/38186114/react-native-redux-and-listview
		this.setState({
			dataSource: this.state.dataSource.cloneWithRows(this.filterNotes(newProps.items)),
		});
	}

	async todoCheckbox_change(itemId, checked) {	
		let note = await Note.load(itemId);
		await Note.save({ id: note.id, todo_completed: checked ? time.unixMs() : 0 });
		reg.scheduleSync();
	}

	listView_itemPress(noteId) {
		this.props.dispatch({
			type: 'Navigation/NAVIGATE',
			routeName: 'Note',
			noteId: noteId,
		});
	}

	listView_itemLongPress(itemId) {}

	render() {
		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39

		if (this.state.dataSource.getRowCount()) {
			return (
				<ListView
					dataSource={this.state.dataSource}
					renderRow={(note) => {
						return <NoteItem
							note={note}
							onPress={(note) => this.listView_itemPress(note.id) }
							onCheckboxChange={(note, checked) => this.todoCheckbox_change(note.id, checked) }
						/> }}
					enableEmptySections={true}
				/>
			);
		} else {
			const noItemMessage = _('There are currently no notes. Create one by clicking on the (+) button.');
			return <Text style={styles.noItemMessage} >{noItemMessage}</Text>;
		}
	}
}

const NoteList = connect(
	(state) => {
		return { items: state.notes };
	}
)(NoteListComponent)

export { NoteList };