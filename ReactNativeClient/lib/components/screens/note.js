import React, { Component } from 'react';
import { BackHandler, View, Button, TextInput, WebView, Text, StyleSheet, Linking, Image } from 'react-native';
import { connect } from 'react-redux'
import { uuid } from 'lib/uuid.js';
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
import { globalStyle, themeStyle } from 'lib/components/global-style.js';
import DialogBox from 'react-native-dialogbox';
import { NoteBodyViewer } from 'lib/components/note-body-viewer.js';
import RNFetchBlob from 'react-native-fetch-blob';
import { DocumentPicker, DocumentPickerUtil } from 'react-native-document-picker';
import ImageResizer from 'react-native-image-resizer';

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

		this.styles_ = {};

		// Disabled for now because it doesn't work consistently and proabably interfer with the backHandler
		// on root.js. Handling of the back button should be in one single place for this to work well.

		// this.backHandler = () => {
		// 	if (!this.state.note.id) {
		// 		return false;
		// 	}

		// 	if (this.state.mode == 'edit') {
		// 		this.setState({
		// 			note: Object.assign({}, this.state.lastSavedNote),
		// 			mode: 'view',
		// 		});
		// 		return true;
		// 	}

		// 	return false;
		// };
	}

	styles() {
		const themeId = this.props.theme;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		let styles = {
			// titleTextInput: {
			// 	flex: 1,
			// 	paddingLeft: 0,
			// 	color: theme.color,
			// 	backgroundColor: theme.backgroundColor,
			// 	fontWeight: 'bold',
			// 	fontSize: theme.fontSize,
			// },
			bodyTextInput: {
				flex: 1,
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				textAlignVertical: 'top',
				color: theme.color,
				backgroundColor: theme.backgroundColor,
				fontSize: theme.fontSize,
			},
			noteBodyViewer: {
				flex: 1,
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: theme.marginTop,
				paddingBottom: theme.marginBottom,
			},
			metadata: {
				paddingLeft: globalStyle.marginLeft,
				paddingRight: globalStyle.marginRight,
				color: theme.color,
			},
		};

		styles.titleContainer = {
			flex: 0,
			flexDirection: 'row',
			paddingLeft: theme.marginLeft,
			paddingRight: theme.marginRight,
			borderBottomColor: theme.dividerColor,
			borderBottomWidth: 1,
		};

		styles.titleContainerTodo = Object.assign({}, styles.titleContainer);

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	isModified() {
		if (!this.state.note || !this.state.lastSavedNote) return false;
		let diff = BaseModel.diffObjects(this.state.note, this.state.lastSavedNote);
		delete diff.type_;
		return !!Object.getOwnPropertyNames(diff).length;
	}

	async componentWillMount() {
		// BackHandler.addEventListener('hardwareBackPress', this.backHandler);

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
		// BackHandler.removeEventListener('hardwareBackPress', this.backHandler);
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

	async pickDocument() {
		return new Promise((resolve, reject) => {
			DocumentPicker.show({ filetype: [DocumentPickerUtil.images()] }, (error,res) => {
				if (error) {
					reject(error);
					return;
				}

				resolve(res);
			});
		});
	}

	async imageDimensions(uri) {
		return new Promise((resolve, reject) => {
			Image.getSize(uri, (width, height) => {
				resolve({ width: width, height: height });
			}, (error) => { reject(error) });
		});
	}

	async attachFile_onPress() {
		const res = await this.pickDocument();

		const localFilePath = res.uri;

		reg.logger().info('Got file: ' + localFilePath);
		reg.logger().info('Got type: ' + res.type);

		// res.uri,
		// res.type, // mime type
		// res.fileName,
		// res.fileSize

		let resource = Resource.new();
		resource.id = uuid.create();
		resource.mime = res.type;
		resource.title = res.fileName ? res.fileName : _('Untitled');

		let targetPath = Resource.fullPath(resource);

		if (res.type == 'image/jpeg' || res.type == 'image/jpg' || res.type == 'image/png') {
			const maxSize = 1920;

			let dimensions = await this.imageDimensions(localFilePath);

			reg.logger().info('Original dimensions ', dimensions);
			if (dimensions.width > maxSize || dimensions.height > maxSize) {
				dimensions.width = maxSize;
				dimensions.height = maxSize;
			}
			reg.logger().info('New dimensions ', dimensions);

			const format = res.type == 'image/png' ? 'PNG' : 'JPEG';
			reg.logger().info('Resizing image ' + localFilePath);
			const resizedImagePath = await ImageResizer.createResizedImage(localFilePath, dimensions.width, dimensions.height, format, 85);
			reg.logger().info('Resized image ', resizedImagePath);
			RNFetchBlob.fs.cp(resizedImagePath, targetPath); // mv doesn't work ("source path does not exist") so need to do cp and unlink
			
			try {
				RNFetchBlob.fs.unlink(resizedImagePath);
			} catch (error) {
				reg.logger().info('Error when unlinking cached file: ', error);
			}
		} else {
			RNFetchBlob.fs.cp(localFilePath, targetPath);
		}

		await Resource.save(resource, { isNew: true });

		const resourceTag = Resource.markdownTag(resource);

		const newNote = Object.assign({}, this.state.note);
		newNote.body += "\n" + resourceTag;
		this.setState({ note: newNote });
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
			{ title: _('Attach file'), onPress: () => { this.attachFile_onPress(); } },
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

		const theme = themeStyle(this.props.theme);
		const note = this.state.note;
		const isTodo = !!Number(note.is_todo);
		const folder = this.state.folder;
		const isNew = !note.id;

		let bodyComponent = null;
		if (this.state.mode == 'view') {
			const onCheckboxChange = (newBody) => {
				this.saveOneProperty('body', newBody);
			};

			bodyComponent = <NoteBodyViewer style={this.styles().noteBodyViewer} webViewStyle={theme} note={note} onCheckboxChange={(newBody) => { onCheckboxChange(newBody) }}/>
		} else {
			const focusBody = !isNew && !!note.title;
			bodyComponent = (
				<TextInput
					autoCapitalize="sentences"
					autoFocus={focusBody}
					style={this.styles().bodyTextInput}
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

		const titleContainerStyle = isTodo ? this.styles().titleContainerTodo : this.styles().titleContainer;

		let titleTextInputStyle = {
			flex: 1,
			paddingLeft: 0,
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			fontWeight: 'bold',
			fontSize: theme.fontSize,
		};

		titleTextInputStyle.height = this.state.titleTextInputHeight;

		const titleComp = (
			<View style={titleContainerStyle}>
				{ isTodo && <Checkbox style={{ color: theme.color }} checked={!!Number(note.todo_completed)} onChange={(checked) => { this.todoCheckbox_change(checked) }} /> }
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
			<View style={this.rootStyle(this.props.theme).root}>
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
				{ this.state.showNoteMetadata && <Text style={this.styles().metadata}>{this.state.noteMetadata}</Text> }
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
			theme: state.settings.theme,
		};
	}
)(NoteScreenComponent)

export { NoteScreen };