import React, { Component } from 'react';
import { BackHandler, View, Button, TextInput, WebView, Text, StyleSheet, Linking } from 'react-native';
import { connect } from 'react-redux'
import { Log } from 'lib/log.js'
import { Note } from 'lib/models/note.js'
import { Resource } from 'lib/models/resource.js'
import { Folder } from 'lib/models/folder.js'
import { BaseModel } from 'lib/base-model.js'
import { ActionButton } from 'lib/components/action-button.js';
import Icon from 'react-native-vector-icons/Ionicons';
import { ScreenHeader } from 'lib/components/screen-header.js';
import { time } from 'lib/time-utils.js';
import { Checkbox } from 'lib/components/checkbox.js'
import { _ } from 'lib/locale.js';
import { reg } from 'lib/registry.js';
import { shim } from 'lib/shim.js';
import { BaseScreenComponent } from 'lib/components/base-screen.js';
import { dialogs } from 'lib/dialogs.js';
import { globalStyle } from 'lib/components/global-style.js';
import DialogBox from 'react-native-dialogbox';
import { NoteBodyViewer } from 'lib/components/note-body-viewer.js';

const styleObject = {
	titleTextInput: {
		flex: 1,
		paddingLeft: 0,
		color: globalStyle.color,
		backgroundColor: globalStyle.backgroundColor,
		fontWeight: 'bold',
		fontSize: globalStyle.fontSize,
	},
	bodyTextInput: {
		flex: 1,
		paddingLeft: globalStyle.marginLeft,
		paddingRight: globalStyle.marginRight,
		textAlignVertical: 'top',
		color: globalStyle.color,
		backgroundColor: globalStyle.backgroundColor,
		fontSize: globalStyle.fontSize,
	},
	noteBodyViewer: {
		flex: 1,
		paddingLeft: globalStyle.marginLeft,
		paddingRight: globalStyle.marginRight,
		paddingTop: globalStyle.marginTop,
		paddingBottom: globalStyle.marginBottom,
	},
};

styleObject.titleContainer = {
	flex: 0,
	flexDirection: 'row',
	paddingLeft: globalStyle.marginLeft,
	paddingRight: globalStyle.marginRight,
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
			isLoading: true,
			resources: {},
			titleTextInputHeight: 20,
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

	async componentWillMount() {
		BackHandler.addEventListener('hardwareBackPress', this.backHandler);

		let note = null;
		let mode = 'view';
		if (!this.props.noteId) {
			note = this.props.itemType == 'todo' ? Note.newTodo(this.props.folderId) : Note.new(this.props.folderId);
			mode = 'edit';
		} else {
			note = await Note.load(this.props.noteId);
		}

		const folder = Folder.byId(this.props.folders, note.parent_id);

		this.setState({
			lastSavedNote: Object.assign({}, note),
			note: note,
			mode: mode,
			folder: folder,
			isLoading: false,
		});

		this.refreshNoteMetadata();
	}

	componentWillUnmount() {
		BackHandler.removeEventListener('hardwareBackPress', this.backHandler);
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

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			folderId: folderId,
		});
	}

	attachFile_onPress() {

	}

	toggleIsTodo_onPress() {
		let newNote = Note.toggleIsTodo(this.state.note);
		let newState = { note: newNote };
		//if (!newNote.id) newState.lastSavedNote = Object.assign({}, newNote);
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
			// { title: _('Attach file'), onPress: () => { this.attachFile_onPress(); } },
			{ title: _('Delete note'), onPress: () => { this.deleteNote_onPress(); } },
			{ title: note && !!note.is_todo ? _('Convert to regular note') : _('Convert to todo'), onPress: () => { this.toggleIsTodo_onPress(); } },
			{ title: this.state.showNoteMetadata ? _('Hide metadata') : _('Show metadata'), onPress: () => { this.showMetadata_onPress(); } },
			{ title: _('View location on map'), onPress: () => { this.showOnMap_onPress(); } },
		];
	}

	async todoCheckbox_change(checked) {
		await this.saveOneProperty('todo_completed', checked ? time.unixMs() : 0);
	}

	titleTextInput_contentSizeChange(event) {
		let height = event.nativeEvent.contentSize.height;
		this.setState({ titleTextInputHeight: height });
	}

	render() {
		if (this.state.isLoading) {
			return (
				<View style={this.styles().screen}>
					<ScreenHeader/>
				</View>
			);
		}

		const note = this.state.note;
		const isTodo = !!Number(note.is_todo);
		const folder = this.state.folder;
		const isNew = !note.id;

		let bodyComponent = null;
		if (this.state.mode == 'view') {
			const onCheckboxChange = (newBody) => {
				this.saveOneProperty('body', newBody);
			};

			bodyComponent = <NoteBodyViewer style={styles.noteBodyViewer} note={note} onCheckboxChange={(newBody) => { onCheckboxChange(newBody) }}/>
		} else {
			const focusBody = !isNew && !!note.title;
			bodyComponent = (
				<TextInput
					autoCapitalize="sentences"
					autoFocus={focusBody}
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

		const titleTextInputStyle = Object.assign({}, styleObject.titleTextInput);
		titleTextInputStyle.height = this.state.titleTextInputHeight;

		const titleComp = (
			<View style={titleContainerStyle}>
				{ isTodo && <Checkbox checked={!!Number(note.todo_completed)} onChange={(checked) => { this.todoCheckbox_change(checked) }} /> }
				<TextInput
					onContentSizeChange={(event) => this.titleTextInput_contentSizeChange(event)}
					autoFocus={isNew}
					multiline={true}
					underlineColorAndroid="#ffffff00"
					autoCapitalize="sentences"
					style={titleTextInputStyle}
					value={note.title}
					onChangeText={(text) => this.title_changeText(text)}
				/>
			</View>
		);

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
						}
					}}
					menuOptions={this.menuOptions()}
					showSaveButton={showSaveButton}
					saveButtonDisabled={saveButtonDisabled}
					onSaveButtonPress={() => this.saveNoteButton_press()}
				/>
				{ titleComp }
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