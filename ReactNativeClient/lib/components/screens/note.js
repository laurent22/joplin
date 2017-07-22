import React, { Component } from 'react';
import { BackHandler, View, Button, TextInput, WebView, Text, StyleSheet, Linking } from 'react-native';
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
import { globalStyle } from 'lib/components/global-style.js';
import DialogBox from 'react-native-dialogbox';

const styleObject = {
	titleTextInput: {
		flex: 1,
		paddingLeft: 0,
		color: globalStyle.color,
		backgroundColor: globalStyle.backgroundColor,
	},
	bodyTextInput: {
		flex: 1,
		paddingLeft: globalStyle.marginLeft,
		paddingRight: globalStyle.marginRight,
		textAlignVertical: 'top',
		color: globalStyle.color,
		backgroundColor: globalStyle.backgroundColor,
	},
	bodyViewContainer: {
		flex: 1,
		paddingLeft: globalStyle.marginLeft,
		paddingRight: globalStyle.marginRight,
		paddingTop: globalStyle.marginTop,
		paddingBottom: globalStyle.marginBottom,
	},
};

styleObject.titleContainer = {
	flexDirection: 'row',
	paddingLeft: globalStyle.marginLeft,
	paddingRight: globalStyle.marginRight,
	height: 40,
	borderBottomColor: globalStyle.dividerColor,
	borderBottomWidth: 1,
};

styleObject.titleContainerTodo = Object.assign({}, styleObject.titleContainer);

const styles = StyleSheet.create(styleObject);

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

	async noteExists(noteId) {
		const existingNote = await Note.load(noteId);
		return !!existingNote;
	}

	async saveNoteButton_press() {
		let note = Object.assign({}, this.state.note);

		// Note has been deleted while user was modifying it. In that, we
		// just save a new note by clearing the note ID.
		if (note.id && !(await this.noteExists(note.id))) delete note.id;

		reg.logger().info('Saving note: ', note);

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

	async saveOneProperty(name, value) {
		let note = Object.assign({}, this.state.note);

		// Note has been deleted while user was modifying it. In that, we
		// just save a new note by clearing the note ID.
		if (note.id && !(await this.noteExists(note.id))) delete note.id;

		reg.logger().info('Saving note property: ', note.id, name, value);

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

	async toggleIsTodo_onPress() {
		let note = await Note.toggleIsTodo(this.state.note.id);
		let newState = { note: note };
		if (!note.id) newState.lastSavedNote = Object.assign({}, note);
		this.setState(newState);
	}

	showMetadata_onPress() {
		this.setState({ showNoteMetadata: !this.state.showNoteMetadata });
		this.refreshNoteMetadata(true);
	}

	async showOnMap_onPress() {
		if (!this.state.note.id) return;

		let note = await Note.load(this.state.note.id);
		try {
			const url = Note.geolocationUrl(note);
			Linking.openURL(url);
		} catch (error) {
			await dialogs.error(this, error.message);
		}
	}

	menuOptions() {
		const note = this.state.note;

		return [
			{ title: _('Attach file'), onPress: () => { this.attachFile_onPress(); } },
			{ title: _('Delete note'), onPress: () => { this.deleteNote_onPress(); } },
			{ title: note && !!note.is_todo ? _('Convert to regular note') : _('Convert to todo'), onPress: () => { this.toggleIsTodo_onPress(); } },
			{ title: this.state.showNoteMetadata ? _('Hide metadata') : _('Show metadata'), onPress: () => { this.showMetadata_onPress(); } },
			{ title: _('View location on map'), onPress: () => { this.showOnMap_onPress(); } },
		];
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
			function toggleTickAt(body, index) {
				let counter = -1;
				while (body.indexOf('- [ ]') >= 0 || body.indexOf('- [X]') >= 0) {
					counter++;

					body = body.replace(/- \[(X| )\]/, function(v, p1) {
						let s = p1 == ' ' ? 'NOTICK' : 'TICK';
						if (index == counter) {
							s = s == 'NOTICK' ? 'TICK' : 'NOTICK';
						}
						return '°°JOP°CHECKBOX°' + s + '°°';
					});
				}

				body = body.replace(/°°JOP°CHECKBOX°NOTICK°°/g, '- [ ]'); 
				body = body.replace(/°°JOP°CHECKBOX°TICK°°/g, '- [X]'); 

				return body;
			}

			function markdownToHtml(body, style) {
				// https://necolas.github.io/normalize.css/
				const normalizeCss = `
					html{line-height:1.15;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}body{margin:0}
					article,aside,footer,header,nav,section{display:block}h1{font-size:2em;margin:.67em 0}hr{box-sizing:content-box;height:0;overflow:visible}
					pre{font-family:monospace,monospace;font-size:1em}a{background-color:transparent;-webkit-text-decoration-skip:objects}
					b,strong{font-weight:bolder}small{font-size:80%}img{border-style:none}
				`;

				const css = `
					body {
						font-size: ` + style.htmlFontSize + `;
						color: ` + style.htmlColor + `;
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
					a.checkbox {
						font-size: 1.4em;
						position: relative;
						top: 0.1em;
						text-decoration: none;
						color: ` + style.htmlColor + `;
					}
					table {
						border-collapse: collapse;
					}
					td, th {
						border: 1px solid silver;
						padding: .5em 1em .5em 1em;
					}
					hr {
						border: 1px solid ` + style.htmlDividerColor + `;
					}
				`;

				let counter = -1;
				while (body.indexOf('- [ ]') >= 0 || body.indexOf('- [X]') >= 0) {
					body = body.replace(/- \[(X| )\]/, function(v, p1) {
						let s = p1 == ' ' ? 'NOTICK' : 'TICK';
						counter++;
						return '°°JOP°CHECKBOX°' + s + '°' + counter + '°°';
					});
				}

				const renderer = new marked.Renderer();
				renderer.link = function (href, title, text) {
					const js = "postMessage(" + JSON.stringify(href) + "); return false;";
					let output = "<a href='#' onclick='" + js + "'>" + text + '</a>';
					return output;
				}

				let html = note ? '<style>' + normalizeCss + "\n" + css + '</style>' + marked(body, { gfm: true, breaks: true, renderer: renderer }) : '';

				let elementId = 1;
				while (html.indexOf('°°JOP°') >= 0) {
					html = html.replace(/°°JOP°CHECKBOX°([A-Z]+)°(\d+)°°/, function(v, type, index) {
						const js = "postMessage('checkboxclick_" + type + '_' + index + "'); this.textContent = this.textContent == '☐' ? '☑' : '☐';";
						return '<a href="#" onclick="' + js + '" class="checkbox">' + (type == 'NOTICK' ? '☐' : '☑') + '</a>';
					});
				}

				return html;
			}

			bodyComponent = (
				<View style={styles.bodyViewContainer}>
					<WebView
						source={{ html: markdownToHtml(note.body, globalStyle) }}
						onMessage={(event) => {
							let msg = event.nativeEvent.data;

							reg.logger().info('postMessage received: ' + msg);

							if (msg.indexOf('checkboxclick_') === 0) {
								msg = msg.split('_');
								let index = Number(msg[msg.length - 1]);
								let currentState = msg[msg.length - 2]; // Not really needed but keep it anyway
								const newBody = toggleTickAt(note.body, index);
								this.saveOneProperty('body', newBody);
							} else {
								Linking.openURL(msg);
							}
						}}
					/>
				</View>
			);
		} else {
			bodyComponent = (
				<TextInput
					autoCapitalize="sentences"
					autoFocus={true}
					style={styles.bodyTextInput}
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

		const titleContainerStyle = isTodo ? styles.titleContainerTodo : styles.titleContainer;

		return (
			<View style={this.styles().screen}>
				<ScreenHeader
					titlePicker={{
						items: titlePickerItems(),
						selectedValue: folder ? folder.id : null,
						onValueChange: async (itemValue, itemIndex) => {
							let note = Object.assign({}, this.state.note);

							// RN bug: https://github.com/facebook/react-native/issues/9220
							// The Picker fires the onValueChange when the component is initialized
							// so we need to check that it has actually changed.
							if (note.parent_id == itemValue) return;

							reg.logger().info('Moving note: ' + note.parent_id + ' => ' + itemValue);

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
				<View style={titleContainerStyle}>
					{ isTodo && <Checkbox checked={!!Number(note.todo_completed)} onChange={(checked) => { this.todoCheckbox_change(checked) }} /> }<TextInput underlineColorAndroid="#ffffff00" autoCapitalize="sentences" style={styles.titleTextInput} value={note.title} onChangeText={(text) => this.title_changeText(text)} />
				</View>
				{ bodyComponent }
				{ actionButtonComp }
				{ this.state.showNoteMetadata && <Text style={{ paddingLeft: globalStyle.marginLeft, paddingRight: globalStyle.marginRight, }}>{this.state.noteMetadata}</Text> }
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