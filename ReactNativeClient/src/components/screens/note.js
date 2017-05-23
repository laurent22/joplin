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
		this.state = { note: Note.new() }
	}

	componentWillMount() {
		if (!this.props.noteId) {
			this.setState({ note: Note.new(this.props.folderId) });
		} else {
			Note.load(this.props.noteId).then((note) => {
				this.setState({ note: note });
			});
		}
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
		let isNew = !this.state.note.id;
		Note.save(this.state.note).then((note) => {
			Log.info('NOTE', note);
			if (isNew) Note.updateGeolocation(note.id);
		});
	}

	render() {
		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} />
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
			noteId: state.selectedNoteId,
			folderId: state.selectedFolderId,
		};
	}
)(NoteScreenComponent)

export { NoteScreen };