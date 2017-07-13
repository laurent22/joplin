import React, { Component } from 'react';
import { View, Button, TextInput, WebView, Text, StyleSheet } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { Note } from 'lib/models/note.js'
import { Folder } from 'lib/models/folder.js'
import { ActionButton } from 'lib/components/action-button.js';
import Icon from 'react-native-vector-icons/Ionicons';
import { ScreenHeader } from 'lib/components/screen-header.js';
import { Checkbox } from 'lib/components/checkbox.js'
import { _ } from 'lib/locale.js';
import marked from 'lib/marked.js';

const styles = StyleSheet.create({
	webView: {
		fontSize: 10,
	},
});

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

			// https://necolas.github.io/normalize.css/
			const normalizeCss = `
				html{line-height:1.15;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}body{margin:0}
				article,aside,footer,header,nav,section{display:block}h1{font-size:2em;margin:.67em 0}hr{box-sizing:content-box;height:0;overflow:visible}
				pre{font-family:monospace,monospace;font-size:1em}a{background-color:transparent;-webkit-text-decoration-skip:objects}
				b,strong{font-weight:bolder}small{font-size:80%}img{border-style:none}
			`;
			const css = `
				body {
					font-size: 14px;
					margin: 1em;
				}
				h1 {
					font-size: 1.2em;
					font-weight: bold;
				}
				h2 {
					font-size: 1em;
					font-weight: bold;
				}
				li {
					
				}
				ul {
					padding-left: 1em;
				}
				.checkbox {
					font-size: 1.4em;
					position: relative;
					top: 0.1em;
				}
			`;

			let body = note.body;
			body = body.replace(/- \[ \]/g, '☐');
			body = body.replace(/- \[X\]/g, '☑');

			const source = {
				html: note ? '<style>' + normalizeCss + "\n" + css + '</style>' + marked(body, { gfm: true, breaks: true }) : '',
			};

			source.html = source.html.replace(/☐/g, '<span class="checkbox">☐</span>')
			source.html = source.html.replace(/☑/g, '<span class="checkbox">☑</span>')

			bodyComponent = (
				<View style={{flex:1}}>
					<WebView source={source}/>
				</View>
			);
		} else {
			bodyComponent = <TextInput autoFocus={true} style={{flex: 1, textAlignVertical: 'top', fontFamily: 'monospace'}} multiline={true} value={note.body} onChangeText={(text) => this.body_changeText(text)} />
		}

		let title = null;
		let noteHeaderTitle = note && note.title ? note.title : _('New note');
		if (folder) {
			title = folder.title + ' > ' + noteHeaderTitle;
		} else {
			title = noteHeaderTitle;
		}

		const renderActionButton = () => {
			let buttons = [];

			buttons.push({
				title: _('Edit'),
				icon: 'md-create',
				onPress: () => {
					this.setState({ mode: 'edit' });
				},
			});

			buttons.push({
				title: _('Save'),
				icon: 'md-checkmark',
				onPress: () => {
					this.saveNoteButton_press();
					return false;
				},
			});

			return <ActionButton isToggle={true} buttons={buttons}/>
		}

		const actionButtonComp = renderActionButton();

		return (
			<View style={{flex: 1}}>
				<ScreenHeader navState={this.props.navigation.state} menuOptions={this.menuOptions()} title={title} />
				<View style={{ flexDirection: 'row' }}>
					{ isTodo && <Checkbox checked={!!Number(note.todo_completed)} /> }<TextInput style={{flex:1}} value={note.title} onChangeText={(text) => this.title_changeText(text)} />
				</View>
				{ bodyComponent }
				{ todoComponents }
				{ actionButtonComp }
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