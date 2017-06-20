import React, { Component } from 'react';
import { View, Button, TextInput } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'
import { Note } from 'src/models/note.js'
import { Registry } from 'src/registry.js'
import { ScreenHeader } from 'src/components/screen-header.js';
import { Checkbox } from 'src/components/checkbox.js'
import { NoteFolderService } from 'src/services/note-folder-service.js';
import { _ } from 'src/locale.js';

class NoteScreenComponent extends React.Component {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.state = { note: Note.new() }
		this.originalNote = null;
	}

	componentWillMount() {
		if (!this.props.noteId) {
			let note = this.props.itemType == 'todo' ? Note.newTodo(this.props.folderId) : Note.new(this.props.folderId);
			Log.info(note);
			this.setState({ note: note });
		} else {
			Note.load(this.props.noteId).then((note) => {
				this.originalNote = Object.assign({}, note);
				this.setState({ note: note });
			});
		}
	}

	noteComponent_change(propName, propValue) {
		this.setState((prevState, props) => {
			let note = Object.assign({}, prevState.note);
			note[propName] = propValue;
			return { note: note }
		});
	}

	title_changeText(text) {
		this.noteComponent_change('title', text);
	}

	body_changeText(text) {
		this.noteComponent_change('body', text);
	}

	saveNoteButton_press() {

		console.warn('CHANGE NOT TESTED');

		let isNew = !this.state.note.id;
		let toSave = BaseModel.diffObjects(this.originalNote, this.state.note);
		toSave.id = this.state.note.id;
		Note.save(toSave).then((note) => {
			this.originalNote = Object.assign({}, note);
			this.setState({ note: note });
			if (isNew) return Note.updateGeolocation(note.id);
		});
		
		// NoteFolderService.save('note', this.state.note, this.originalNote).then((note) => {
		// 	this.originalNote = Object.assign({}, note);
		// 	this.setState({ note: note });
		// });
	}

	deleteNote_onPress(noteId) {
		Log.info('DELETE', noteId);
	}

	attachFile_onPress(noteId) {
	}

	menuOptions() {
		return [
			{ title: _('Attach file'), onPress: () => { this.attachFile_onPress(this.state.note.id); } },
			{ title: _('Delete note'), onPress: () => { this.deleteNote_onPress(this.state.note.id); } },
		];
	}

	render() {
		const note = this.state.note;
		const isTodo = !!Number(note.is_todo);
		let todoComponents = null;

		if (note.is_todo) {
			todoComponents = (
				<View>
					<Button title="test" onPress={this.saveNoteButton_press} />
				</View>
			);
		}

		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} menuOptions={this.menuOptions()} />
				<View style={{ flexDirection: 'row' }}>
					{ isTodo && <Checkbox checked={!!Number(note.todo_completed)} /> }<TextInput style={{flex:1}} value={note.title} onChangeText={(text) => this.title_changeText(text)} />
				</View>
				<TextInput style={{flex: 1, textAlignVertical: 'top'}} multiline={true} value={note.body} onChangeText={(text) => this.body_changeText(text)} />
				{ todoComponents }
				<Button title="Save note" onPress={() => this.saveNoteButton_press()} />
			</View>
		);
	}

}

const NoteScreen = connect(
	(state) => {
		return {
			noteId: state.selectedNoteId,
			folderId: state.selectedFolderId,
			itemType: state.selectedItemType,
		};
	}
)(NoteScreenComponent)

export { NoteScreen };