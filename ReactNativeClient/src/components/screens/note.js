import React, { Component } from 'react';
import { View, Button, TextInput } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'src/log.js'
import { Note } from 'src/models/note.js'
import { ScreenHeader } from 'src/components/screen-header.js';

class NoteScreenComponent extends React.Component {
	
	static navigationOptions = (options) => {
		return { header: null };
	}

	constructor() {
		super();
		this.state = { note: Note.newNote() }
	}

	componentWillMount() {
		this.setState({ note: this.props.note });
	}

	noteComponent_change = (propName, propValue) => {
		this.setState((prevState, props) => {
			let note = Object.assign({}, prevState.note);
			note[propName] = propValue;
			return { note: note }
		});
	}

	title_changeText = (text) => {
		this.noteComponent_change('title', text);
	}

	body_changeText = (text) => {
		this.noteComponent_change('body', text);
	}

	saveNoteButton_press = () => {
		Note.save(this.state.note).then((note) => {
			this.props.dispatch({
				type: 'NOTES_UPDATE_ONE',
				note: note,
			});
		}).catch((error) => {
			Log.warn('Cannot save note', error);
		});
	}

	render() {
		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} />
				<TextInput value={this.state.note.parent_id} />
				<TextInput value={this.state.note.title} onChangeText={this.title_changeText} />
				<TextInput style={{flex: 1, textAlignVertical: 'top'}} multiline={true} value={this.state.note.body} onChangeText={this.body_changeText} />
				<Button title="Save note" onPress={this.saveNoteButton_press} />
			</View>
		);
	}

}

const NoteScreen = connect(
	(state) => {
		return {
			note: state.selectedNoteId ? Note.byId(state.notes, state.selectedNoteId) : Note.newNote(state.selectedFolderId),
		};
	}
)(NoteScreenComponent)

export { NoteScreen };