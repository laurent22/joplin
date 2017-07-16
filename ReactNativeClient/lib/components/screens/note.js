import React, { Component } from 'react';
import { BackHandler, View, Button, TextInput, WebView, Text, StyleSheet } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { Note } from 'lib/models/note.js'
import { Folder } from 'lib/models/folder.js'
import { BaseModel } from 'lib/base-model.js'
import { ActionButton } from 'lib/components/action-button.js';
import Icon from 'react-native-vector-icons/Ionicons';
import { ScreenHeader } from 'lib/components/screen-header.js';
import { time } from 'lib/time-utils.js';
import { Checkbox } from 'lib/components/checkbox.js'
import { _ } from 'lib/locale.js';
import marked from 'lib/marked.js';
import { reg } from 'lib/registry.js';
import { BaseScreenComponent } from 'lib/components/base-screen.js';
import { dialogs } from 'lib/dialogs.js';
import { NotesScreenUtils } from 'lib/components/screens/notes-utils.js'
import DialogBox from 'react-native-dialogbox';

const styles = StyleSheet.create({
	webView: {
		fontSize: 10,
	},
});

class NoteScreenComponent extends BaseScreenComponent {
	
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
			lastSavedNote: null,
		};

		this.saveButtonHasBeenShown_ = false;

		this.backHandler = () => {
			if (!this.state.note.id) {
				return false;
			}

			if (this.state.mode == 'edit') {
				this.setState({
					note: Object.assign({}, this.state.lastSavedNote),
					mode: 'view',
				});
				return true;
			}

			return false;
		};
	}

	isModified() {
		if (!this.state.note || !this.state.lastSavedNote) return false;
		let diff = BaseModel.diffObjects(this.state.note, this.state.lastSavedNote);
		delete diff.type_;
		return !!Object.getOwnPropertyNames(diff).length;
	}

	componentWillMount() {
		BackHandler.addEventListener('hardwareBackPress', this.backHandler);

		if (!this.props.noteId) {
			let note = this.props.itemType == 'todo' ? Note.newTodo(this.props.folderId) : Note.new(this.props.folderId);
			this.setState({
				lastSavedNote: Object.assign({}, note),
				note: note,
				mode: 'edit',
			});
			this.refreshNoteMetadata();
		} else {
			Note.load(this.props.noteId).then((note) => {
				this.setState({
					lastSavedNote: Object.assign({}, note),
					note: note,
				});
				this.refreshNoteMetadata();
			});
		}

		this.refreshFolder();
	}

	componentWillUnmount() {
		BackHandler.removeEventListener('hardwareBackPress', this.backHandler);
	}

	async currentFolder() {
		let folderId = this.props.folderId;
		if (!folderId) {
			if (this.state.note && this.state.note.parent_id) folderId = this.state.note.parent_id;
		}

		if (!folderId) return Folder.defaultFolder();

		return Folder.load(folderId);
	}

	async refreshFolder(folderId = null) {
		if (!folderId) {
			this.setState({ folder: await this.currentFolder() });
		} else {
			this.setState({ folder: await Folder.load(folderId) });
		}
	}

	noteComponent_change(propName, propValue) {
		let note = Object.assign({}, this.state.note);
		note[propName] = propValue;
		this.setState({ note: note });
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

		if (!note.parent_id) {
			let folder = await Folder.defaultFolder();
			if (!folder) {
				Log.warn('Cannot save note without a notebook');
				return;
			}
			note.parent_id = folder.id;
		}

		let isNew = !note.id;
		if (!note.title) note.title = _('Untitled');
		note = await Note.save(note);
		this.setState({
			lastSavedNote: Object.assign({}, note),
			note: note,
		});
		if (isNew) Note.updateGeolocation(note.id);
		this.refreshNoteMetadata();

		reg.scheduleSync();
	}

	async deleteNote_onPress() {
		let note = this.state.note;
		if (!note.id) return;

		let ok = await dialogs.confirm(this, _('Delete note?'));
		if (!ok) return;

		let folderId = note.parent_id;

		await Note.delete(note.id);
		await NotesScreenUtils.openNoteList(folderId);

		reg.scheduleSync();
	}

	attachFile_onPress() {

	}

	showMetadata_onPress() {
		this.setState({ showNoteMetadata: !this.state.showNoteMetadata });
		this.refreshNoteMetadata(true);
	}

	menuOptions() {
		return [
			{ title: _('Attach file'), onPress: () => { this.attachFile_onPress(); } },
			{ title: _('Delete note'), onPress: () => { this.deleteNote_onPress(); } },
			{ title: _('Toggle metadata'), onPress: () => { this.showMetadata_onPress(); } },
		];
	}

	async saveOneProperty(name, value) {
		let note = Object.assign({}, this.state.note);

		if (note.id) {
			let toSave = { id: note.id };
			toSave[name] = value;
			toSave = await Note.save(toSave);
			note[name] = toSave[name];

			this.setState({
				lastSavedNote: Object.assign({}, note),
				note: note,
			});

			reg.scheduleSync();
		} else {
			note[name] = value;
			this.setState({	note: note });
		}
	}

	async todoCheckbox_change(checked) {
		await this.saveOneProperty('todo_completed', checked ? time.unixMs() : 0);
		reg.scheduleSync();
	}

	render() {
		const note = this.state.note;
		const isTodo = !!Number(note.is_todo);
		const folder = this.state.folder;

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
			bodyComponent = (
				<TextInput
					autoCapitalize="sentences"
					autoFocus={true}
					style={{flex: 1, textAlignVertical: 'top', fontFamily: 'monospace'}}
					multiline={true}
					value={note.body}
					onChangeText={(text) => this.body_changeText(text)}
				/>
			);
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

			if (this.state.mode == 'edit') return <ActionButton style={{display:'none'}}/>;

			return <ActionButton multiStates={true} buttons={buttons} buttonIndex={0} />
		}

		const titlePickerItems = () => {
			let output = [];
			for (let i = 0; i < this.props.folders.length; i++) {
				let f = this.props.folders[i];
				output.push({ label: f.title, value: f.id });
			}
			return output;
		}

		const actionButtonComp = renderActionButton();

		let showSaveButton = this.state.mode == 'edit' || this.isModified() || this.saveButtonHasBeenShown_;
		let saveButtonDisabled = !this.isModified();

		if (showSaveButton) this.saveButtonHasBeenShown_ = true;

		return (
			<View style={this.styles().screen}>
				<ScreenHeader
					titlePicker={{
						items: titlePickerItems(),
						selectedValue: folder ? folder.id : null,
						onValueChange: async (itemValue, itemIndex) => {
							let note = Object.assign({}, this.state.note);
							if (note.id) await Note.moveToFolder(note.id, itemValue);
							note.parent_id = itemValue;

							const folder = await Folder.load(note.parent_id);

							this.setState({
								lastSavedNote: Object.assign({}, note),
								note: note,
								folder: folder,
							});

							reg.scheduleSync();
						}
					}}
					navState={this.props.navigation.state}
					menuOptions={this.menuOptions()}
					showSaveButton={showSaveButton}
					saveButtonDisabled={saveButtonDisabled}
					onSaveButtonPress={() => this.saveNoteButton_press()}
				/>
				<View style={{ flexDirection: 'row' }}>
					{ isTodo && <Checkbox checked={!!Number(note.todo_completed)} onChange={(checked) => { this.todoCheckbox_change(checked) }} /> }<TextInput autoCapitalize="sentences" style={{flex:1}} value={note.title} onChangeText={(text) => this.title_changeText(text)} />
				</View>
				{ bodyComponent }
				{ actionButtonComp }
				{ this.state.showNoteMetadata && <Text>{this.state.noteMetadata}</Text> }
				<DialogBox ref={dialogbox => { this.dialogbox = dialogbox }}/>
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
			folders: state.folders,
		};
	}
)(NoteScreenComponent)

export { NoteScreen };