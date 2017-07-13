import React, { Component } from 'react';
import { View, Button, TextInput, WebView, Text } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { Note } from 'lib/models/note.js'
import { Folder } from 'lib/models/folder.js'
import { ScreenHeader } from 'lib/components/screen-header.js';
import { Checkbox } from 'lib/components/checkbox.js'
import { _ } from 'lib/locale.js';
import marked from 'lib/marked.js';

class NoteScreenComponent extends React.Component {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.state = {
			note: Note.new(),
			mode: 'view',
			noteMetadata: '',
			showNoteMetadata: false,
			folder: null,
		}
	}

	componentWillMount() {
		if (!this.props.noteId) {
			let note = this.props.itemType == 'todo' ? Note.newTodo(this.props.folderId) : Note.new(this.props.folderId);
			this.setState({ note: note });
			this.refreshNoteMetadata();
		} else {
			Note.load(this.props.noteId).then((note) => {
				this.setState({ note: note });
				this.refreshNoteMetadata();
			});
		}

		this.refreshFolder();
	}

	async currentFolder() {
		let folderId = this.props.folderId;
		if (!folderId) {
			if (this.state.note && this.state.note.parent_id) folderId = this.state.note.parent_id;
		}

		if (!folderId) return Folder.defaultFolder();

		return Folder.load(folderId);
	}

	async refreshFolder() {
		this.setState({ folder: await this.currentFolder() });
	}

	noteComponent_change(propName, propValue) {
		this.setState((prevState, props) => {
			let note = Object.assign({}, prevState.note);
			note[propName] = propValue;
			return { note: note }
		});
	}

	async refreshNoteMetadata(force = null) {
		if (force !== true && !this.state.showNoteMetadata) return;

		let noteMetadata = await Note.serializeAllProps(this.state.note);
		this.setState({ noteMetadata: noteMetadata });
	}

	title_changeText(text) {
		this.noteComponent_change('title', text);
	}

	body_changeText(text) {
		this.noteComponent_change('body', text);
	}

	async saveNoteButton_press() {
		let note = Object.assign({}, this.state.note);

		if (!this.state.note.parent_id) {
			let folder = await Folder.defaultFolder();
			if (!folder) {
				Log.warn('Cannot save note without a notebook');
				return;
			}
			note.parent_id = folder.id;
		}

		let isNew = !note.id;
		note = await Note.save(note);
		this.setState({ note: note });
		if (isNew) Note.updateGeolocation(note.id);
		this.refreshNoteMetadata();
	}

	deleteNote_onPress(noteId) {
		Log.info('DELETE', noteId);
	}

	attachFile_onPress(noteId) {

	}

	showMetadata_onPress() {
		this.setState({ showNoteMetadata: !this.state.showNoteMetadata });
		this.refreshNoteMetadata(true);
	}

	menuOptions() {
		return [
			{ title: _('Attach file'), onPress: () => { this.attachFile_onPress(this.state.note.id); } },
			{ title: _('Delete note'), onPress: () => { this.deleteNote_onPress(this.state.note.id); } },
			{ title: _('Toggle metadata'), onPress: () => { this.showMetadata_onPress(); } },
		];
	}

	render() {
		const note = this.state.note;
		const isTodo = !!Number(note.is_todo);
		const folder = this.state.folder;
		let todoComponents = null;

		if (note.is_todo) {
			todoComponents = (
				<View>
					<Button title="test" onPress={this.saveNoteButton_press} />
				</View>
			);
		}

		let bodyComponent = null;
		if (this.state.mode == 'view') {
			const source = {
				html: note ? marked(note.body, { gfm: true, breaks: true }) : '',
			};

			bodyComponent = (
				<View style={{flex:1}}>
					<WebView source={source}/>
					<Button title="Edit note" onPress={() => { this.setState({ mode: 'edit' }); }}/>
				</View>
			);
		} else {
			bodyComponent = <TextInput style={{flex: 1, textAlignVertical: 'top', fontFamily: 'monospace'}} multiline={true} value={note.body} onChangeText={(text) => this.body_changeText(text)} />
		}

		let title = null;
		let noteHeaderTitle = note && note.title ? note.title : _('New note');
		if (folder) {
			title = folder.title + ' > ' + noteHeaderTitle;
		} else {
			title = noteHeaderTitle;
		}

		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} menuOptions={this.menuOptions()} title={title} />
				<View style={{ flexDirection: 'row' }}>
					{ isTodo && <Checkbox checked={!!Number(note.todo_completed)} /> }<TextInput style={{flex:1}} value={note.title} onChangeText={(text) => this.title_changeText(text)} />
				</View>
				{ bodyComponent }
				{ todoComponents }
				<Button title="Save note" onPress={() => this.saveNoteButton_press()} />
				{ this.state.showNoteMetadata && <Text>{this.state.noteMetadata}</Text> }
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