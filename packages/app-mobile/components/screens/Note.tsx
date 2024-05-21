import AsyncActionQueue from '@joplin/lib/AsyncActionQueue';
import uuid from '@joplin/lib/uuid';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import UndoRedoService from '@joplin/lib/services/UndoRedoService';
import NoteBodyViewer from '../NoteBodyViewer/NoteBodyViewer';
import checkPermissions from '../../utils/checkPermissions';
import NoteEditor from '../NoteEditor/NoteEditor';
import { Size } from '@joplin/utils/types';
const FileViewer = require('react-native-file-viewer').default;
const React = require('react');
import { Keyboard, View, TextInput, StyleSheet, Linking, Image, Share, NativeSyntheticEvent } from 'react-native';
import { Platform, PermissionsAndroid } from 'react-native';
const { connect } = require('react-redux');
// const { MarkdownEditor } = require('@joplin/lib/../MarkdownEditor/index.js');
import Note from '@joplin/lib/models/Note';
import BaseItem from '@joplin/lib/models/BaseItem';
import Resource from '@joplin/lib/models/Resource';
import Folder from '@joplin/lib/models/Folder';
const Clipboard = require('@react-native-clipboard/clipboard').default;
const md5 = require('md5');
const { BackButtonService } = require('../../services/back-button.js');
import NavService, { OnNavigateCallback as OnNavigateCallback } from '@joplin/lib/services/NavService';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import ActionButton from '../ActionButton';
const { fileExtension, safeFileExtension } = require('@joplin/lib/path-utils');
const mimeUtils = require('@joplin/lib/mime-utils.js').mime;
import ScreenHeader, { MenuOptionType } from '../ScreenHeader';
import NoteTagsDialog from './NoteTagsDialog';
import time from '@joplin/lib/time';
const { Checkbox } = require('../checkbox.js');
import { _, currentLocale } from '@joplin/lib/locale';
import { reg } from '@joplin/lib/registry';
import ResourceFetcher from '@joplin/lib/services/ResourceFetcher';
import { BaseScreenComponent } from '../base-screen';
import { themeStyle, editorFont } from '../global-style';
const { dialogs } = require('../../utils/dialogs.js');
const DialogBox = require('react-native-dialogbox').default;
import ImageResizer from '@bam.tech/react-native-image-resizer';
import shared, { BaseNoteScreenComponent } from '@joplin/lib/components/shared/note-screen-shared';
import { Asset, ImagePickerResponse, launchImageLibrary } from 'react-native-image-picker';
import SelectDateTimeDialog from '../SelectDateTimeDialog';
import ShareExtension from '../../utils/ShareExtension.js';
import CameraView from '../CameraView';
import { FolderEntity, NoteEntity, ResourceEntity } from '@joplin/lib/services/database/types';
import Logger from '@joplin/utils/Logger';
import ImageEditor from '../NoteEditor/ImageEditor/ImageEditor';
import promptRestoreAutosave from '../NoteEditor/ImageEditor/promptRestoreAutosave';
import isEditableResource from '../NoteEditor/ImageEditor/isEditableResource';
import VoiceTypingDialog from '../voiceTyping/VoiceTypingDialog';
import { voskEnabled } from '../../services/voiceTyping/vosk';
import { isSupportedLanguage } from '../../services/voiceTyping/vosk.android';
import { ChangeEvent as EditorChangeEvent, SelectionRangeChangeEvent, UndoRedoDepthChangeEvent } from '@joplin/editor/events';
import { join } from 'path';
import { Dispatch } from 'redux';
import { RefObject } from 'react';
import { SelectionRange } from '../NoteEditor/types';
import { AppState } from '../../utils/types';
import restoreItems from '@joplin/lib/services/trash/restoreItems';
import { getDisplayParentTitle } from '@joplin/lib/services/trash';
import { PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import pickDocument from '../../utils/pickDocument';
import debounce from '../../utils/debounce';
import { focus } from '@joplin/lib/utils/focusHandler';
import CommandService from '@joplin/lib/services/CommandService';
const urlUtils = require('@joplin/lib/urlUtils');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const emptyArray: any[] = [];

const logger = Logger.create('screens/Note');

interface Props {
	provisionalNoteIds: string[];
	dispatch: Dispatch;
	noteId: string;
	useEditorBeta: boolean;
	plugins: PluginStates;
	themeId: number;
	editorFontSize: number;
	editorFont: number; // e.g. Setting.FONT_MENLO
	showSideMenu: boolean;
	searchQuery: string[];
	ftsEnabled: boolean;
	highlightedWords: string[];
	noteHash: string;
	toolbarEnabled: boolean;
}

interface State {
	note: NoteEntity;
	mode: 'view'|'edit';
	readOnly: boolean;
	folder: FolderEntity|null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	lastSavedNote: any;
	isLoading: boolean;
	titleTextInputHeight: number;
	alarmDialogShown: boolean;
	heightBumpView: number;
	noteTagDialogShown: boolean;
	fromShare: boolean;
	showCamera: boolean;
	showImageEditor: boolean;
	imageEditorResource: ResourceEntity;
	imageEditorResourceFilepath: string;
	noteResources: Record<string, ResourceEntity>;
	newAndNoTitleChangeNoteId: boolean|null;

	HACK_webviewLoadingState: number;

	undoRedoButtonState: {
		canUndo: boolean;
		canRedo: boolean;
	};

	voiceTypingDialogShown: boolean;
}

class NoteScreenComponent extends BaseScreenComponent<Props, State> implements BaseNoteScreenComponent {
	// This isn't in this.state because we don't want changing scroll to trigger
	// a re-render.
	private lastBodyScroll: number|undefined = undefined;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private saveActionQueues_: any;
	private doFocusUpdate_: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private styles_: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private editorRef: any;
	private titleTextFieldRef: RefObject<TextInput>;
	private navHandler: OnNavigateCallback;
	private backHandler: ()=> Promise<boolean>;
	private undoRedoService_: UndoRedoService;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private noteTagDialog_closeRequested: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private onJoplinLinkClick_: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private refreshResource: (resource: any, noteBody?: string)=> Promise<void>;
	private selection: SelectionRange;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private menuOptionsCache_: Record<string, any>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private focusUpdateIID_: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private folderPickerOptions_: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public dialogbox: any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static navigationOptions(): any {
		return { header: null };
	}

	public constructor(props: Props) {
		super(props);

		this.state = {
			note: Note.new(),
			mode: 'view',
			readOnly: false,
			folder: null,
			lastSavedNote: null,
			isLoading: true,
			titleTextInputHeight: 20,
			alarmDialogShown: false,
			heightBumpView: 0,
			noteTagDialogShown: false,
			fromShare: false,
			showCamera: false,
			showImageEditor: false,
			imageEditorResource: null,
			noteResources: {},
			imageEditorResourceFilepath: null,
			newAndNoTitleChangeNoteId: null,

			// HACK: For reasons I can't explain, when the WebView is present, the TextInput initially does not display (It's just a white rectangle with
			// no visible text). It will only appear when tapping it or doing certain action like selecting text on the webview. The bug started to
			// appear one day and did not go away - reverting to an old RN version did not help, undoing all
			// the commits till a working version did not help. The bug also does not happen in the simulator which makes it hard to fix.
			// Eventually, a way that "worked" is to add a 1px margin on top of the text input just after the webview has loaded, then removing this
			// margin. This forces RN to update the text input and to display it. Maybe that hack can be removed once RN is upgraded.
			// See https://github.com/laurent22/joplin/issues/1057
			HACK_webviewLoadingState: 0,

			undoRedoButtonState: {
				canUndo: false,
				canRedo: false,
			},

			voiceTypingDialogShown: false,
		};

		this.saveActionQueues_ = {};

		// this.markdownEditorRef = React.createRef(); // For focusing the Markdown editor

		this.doFocusUpdate_ = false;

		this.styles_ = {};

		this.editorRef = React.createRef();

		const saveDialog = async () => {
			if (this.isModified()) {
				const buttonId = await dialogs.pop(this, _('This note has been modified:'), [{ text: _('Save changes'), id: 'save' }, { text: _('Discard changes'), id: 'discard' }, { text: _('Cancel'), id: 'cancel' }]);

				if (buttonId === 'cancel') return true;
				if (buttonId === 'save') await this.saveNoteButton_press();
			}

			return false;
		};

		this.navHandler = async () => {
			return await saveDialog();
		};

		this.backHandler = async () => {

			if (this.isModified()) {
				await this.saveNoteButton_press();
			}

			const isProvisionalNote = this.props.provisionalNoteIds.includes(this.props.noteId);

			if (isProvisionalNote) {
				return false;
			}

			if (this.state.mode === 'edit') {
				Keyboard.dismiss();

				this.setState({
					note: { ...this.state.lastSavedNote },
					mode: 'view',
				});

				await this.undoRedoService_.reset();

				return true;
			}

			if (this.state.fromShare) {
				// effectively the same as NAV_BACK but NAV_BACK causes undesired behaviour in this case:
				// - share to Joplin from some other app
				// - open Joplin and open any note
				// - go back -- with NAV_BACK this causes the app to exit rather than just showing notes
				this.props.dispatch({
					type: 'NAV_GO',
					routeName: 'Notes',
					folderId: this.state.note.parent_id,
				});

				ShareExtension.close();
				return true;
			}

			return false;
		};

		this.noteTagDialog_closeRequested = () => {
			this.setState({ noteTagDialogShown: false });
		};

		this.onJoplinLinkClick_ = async (msg: string) => {
			try {
				const resourceUrlInfo = urlUtils.parseResourceUrl(msg);
				if (resourceUrlInfo) {
					const itemId = resourceUrlInfo.itemId;
					const item = await BaseItem.loadItemById(itemId);
					if (!item) throw new Error(_('No item with ID %s', itemId));

					if (item.type_ === BaseModel.TYPE_NOTE) {
						this.props.dispatch({
							type: 'NAV_GO',
							routeName: 'Note',
							noteId: item.id,
							noteHash: resourceUrlInfo.hash,
						});
					} else if (item.type_ === BaseModel.TYPE_RESOURCE) {
						if (!(await Resource.isReady(item))) throw new Error(_('This attachment is not downloaded or not decrypted yet.'));

						const resourcePath = Resource.fullPath(item);
						logger.info(`Opening resource: ${resourcePath}`);
						await FileViewer.open(resourcePath);
					} else {
						throw new Error(_('The Joplin mobile app does not currently support this type of link: %s', BaseModel.modelTypeToName(item.type_)));
					}
				} else {
					if (msg.indexOf('file://') === 0) {
						throw new Error(_('Links with protocol "%s" are not supported', 'file://'));
					} else {
						await Linking.openURL(msg);
					}
				}
			} catch (error) {
				dialogs.error(this, error.message);
			}
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		this.refreshResource = async (resource: any, noteBody: string = null) => {
			if (noteBody === null && this.state.note && this.state.note.body) noteBody = this.state.note.body;
			if (noteBody === null) return;

			const resourceIds = await Note.linkedResourceIds(noteBody);
			if (resourceIds.indexOf(resource.id) >= 0) {
				shared.clearResourceCache();
				const attachedResources = await shared.attachedResources(noteBody);
				this.setState({ noteResources: attachedResources });
			}
		};

		this.takePhoto_onPress = this.takePhoto_onPress.bind(this);
		this.cameraView_onPhoto = this.cameraView_onPhoto.bind(this);
		this.cameraView_onCancel = this.cameraView_onCancel.bind(this);
		this.properties_onPress = this.properties_onPress.bind(this);
		this.showOnMap_onPress = this.showOnMap_onPress.bind(this);
		this.onMarkForDownload = this.onMarkForDownload.bind(this);
		this.sideMenuOptions = this.sideMenuOptions.bind(this);
		this.folderPickerOptions_valueChanged = this.folderPickerOptions_valueChanged.bind(this);
		this.saveNoteButton_press = this.saveNoteButton_press.bind(this);
		this.onAlarmDialogAccept = this.onAlarmDialogAccept.bind(this);
		this.onAlarmDialogReject = this.onAlarmDialogReject.bind(this);
		this.todoCheckbox_change = this.todoCheckbox_change.bind(this);
		this.title_changeText = this.title_changeText.bind(this);
		this.undoRedoService_stackChange = this.undoRedoService_stackChange.bind(this);
		this.screenHeader_undoButtonPress = this.screenHeader_undoButtonPress.bind(this);
		this.screenHeader_redoButtonPress = this.screenHeader_redoButtonPress.bind(this);
		this.onBodyViewerLoadEnd = this.onBodyViewerLoadEnd.bind(this);
		this.onBodyViewerCheckboxChange = this.onBodyViewerCheckboxChange.bind(this);
		this.onUndoRedoDepthChange = this.onUndoRedoDepthChange.bind(this);
		this.voiceTypingDialog_onText = this.voiceTypingDialog_onText.bind(this);
		this.voiceTypingDialog_onDismiss = this.voiceTypingDialog_onDismiss.bind(this);
	}

	private useEditorBeta(): boolean {
		return this.props.useEditorBeta;
	}


	private onUndoRedoDepthChange(event: UndoRedoDepthChangeEvent) {
		if (this.useEditorBeta()) {
			this.setState({ undoRedoButtonState: {
				canUndo: !!event.undoDepth,
				canRedo: !!event.redoDepth,
			} });
		}
	}

	private undoRedoService_stackChange() {
		if (!this.useEditorBeta()) {
			this.setState({ undoRedoButtonState: {
				canUndo: this.undoRedoService_.canUndo,
				canRedo: this.undoRedoService_.canRedo,
			} });
		}
	}

	private async undoRedo(type: 'undo'|'redo') {
		const undoState = await this.undoRedoService_[type](this.undoState());
		if (!undoState) return;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		this.setState((state: any) => {
			const newNote = { ...state.note };
			newNote.body = undoState.body;
			return {
				note: newNote,
			};
		});
	}

	private screenHeader_undoButtonPress() {
		if (this.useEditorBeta()) {
			this.editorRef.current.undo();
		} else {
			void this.undoRedo('undo');
		}
	}

	private screenHeader_redoButtonPress() {
		if (this.useEditorBeta()) {
			this.editorRef.current.redo();
		} else {
			void this.undoRedo('redo');
		}
	}

	public undoState(noteBody: string = null) {
		return {
			body: noteBody === null ? this.state.note.body : noteBody,
		};
	}

	public styles() {
		const themeId = this.props.themeId;
		const theme = themeStyle(themeId);

		const cacheKey = [themeId, this.state.titleTextInputHeight, this.state.HACK_webviewLoadingState].join('_');

		if (this.styles_[cacheKey]) return this.styles_[cacheKey];
		this.styles_ = {};

		// TODO: Clean up these style names and nesting
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const styles: any = {
			screen: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
			bodyTextInput: {
				flex: 1,
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,

				// Add extra space to allow scrolling past end of document, and also to fix this:
				// https://github.com/laurent22/joplin/issues/1437
				// 2020-04-20: removed bottom padding because it doesn't work properly in Android
				// Instead of being inside the scrollable area, the padding is outside thus
				// restricting the view.
				// See https://github.com/laurent22/joplin/issues/3041#issuecomment-616267739
				// paddingBottom: Math.round(dimensions.height / 4),

				textAlignVertical: 'top',
				color: theme.color,
				backgroundColor: theme.backgroundColor,
				fontSize: this.props.editorFontSize,
				fontFamily: editorFont(this.props.editorFont),
			},
			noteBodyViewer: {
				flex: 1,
			},
			checkbox: {
				color: theme.color,
				paddingRight: 10,
				paddingLeft: theme.marginLeft,
				paddingTop: 10, // Added for iOS (Not needed for Android??)
				paddingBottom: 10, // Added for iOS (Not needed for Android??)
			},
			markdownButtons: {
				borderColor: theme.dividerColor,
				color: theme.urlColor,
			},
		};

		styles.noteBodyViewerPreview = {
			...styles.noteBodyViewer,
			borderTopColor: theme.dividerColor,
			borderTopWidth: 1,
			borderBottomColor: theme.dividerColor,
			borderBottomWidth: 1,
		};

		styles.titleContainer = {
			flex: 0,
			flexDirection: 'row',
			paddingLeft: theme.marginLeft,
			paddingRight: theme.marginRight,
			borderBottomColor: theme.dividerColor,
			borderBottomWidth: 1,
		};

		styles.titleContainerTodo = { ...styles.titleContainer };
		styles.titleContainerTodo.paddingLeft = 0;

		styles.titleTextInput = {
			flex: 1,
			marginTop: 0,
			paddingLeft: 0,
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			fontWeight: 'bold',
			fontSize: theme.fontSize,
			paddingTop: 10, // Added for iOS (Not needed for Android??)
			paddingBottom: 10, // Added for iOS (Not needed for Android??)
		};

		if (this.state.HACK_webviewLoadingState === 1) styles.titleTextInput.marginTop = 1;

		this.styles_[cacheKey] = StyleSheet.create(styles);
		return this.styles_[cacheKey];
	}

	public isModified() {
		return shared.isModified(this);
	}

	public async requestGeoLocationPermissions() {
		if (!Setting.value('trackLocation')) return;

		const response = await checkPermissions(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
			message: _('In order to associate a geo-location with the note, the app needs your permission to access your location.\n\nYou may turn off this option at any time in the Configuration screen.'),
			title: _('Permission needed'),
		});

		// If the user simply pressed "Deny", we don't automatically switch it off because they might accept
		// once we show the rationale again on second try. If they press "Never again" however we switch it off.
		// https://github.com/zoontek/react-native-permissions/issues/385#issuecomment-563132396
		if (response === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
			reg.logger().info('Geo-location tracking has been automatically disabled');
			Setting.setValue('trackLocation', false);
		}
	}

	public async componentDidMount() {
		BackButtonService.addHandler(this.backHandler);
		NavService.addHandler(this.navHandler);

		shared.clearResourceCache();
		shared.installResourceHandling(this.refreshResource);

		await shared.initState(this);

		this.undoRedoService_ = new UndoRedoService();
		this.undoRedoService_.on('stackChange', this.undoRedoService_stackChange);

		if (this.state.note && this.state.note.body && Setting.value('sync.resourceDownloadMode') === 'auto') {
			const resourceIds = await Note.linkedResourceIds(this.state.note.body);
			await ResourceFetcher.instance().markForDownload(resourceIds);
		}

		// Although it is async, we don't wait for the answer so that if permission
		// has already been granted, it doesn't slow down opening the note. If it hasn't
		// been granted, the popup will open anyway.
		void this.requestGeoLocationPermissions();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public onMarkForDownload(event: any) {
		void ResourceFetcher.instance().markForDownload(event.resourceId);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public componentDidUpdate(prevProps: any, prevState: any) {
		if (this.doFocusUpdate_) {
			this.doFocusUpdate_ = false;
			this.focusUpdate();
		}

		if (prevProps.showSideMenu !== this.props.showSideMenu && this.props.showSideMenu) {
			this.props.dispatch({
				type: 'NOTE_SIDE_MENU_OPTIONS_SET',
				options: this.sideMenuOptions(),
			});
		}

		if (prevState.isLoading !== this.state.isLoading && !this.state.isLoading) {
			// If there's autosave data, prompt the user to restore it.
			void promptRestoreAutosave((drawingData: string) => {
				void this.attachNewDrawing(drawingData);
			});
		}

		// Disable opening/closing the side menu with touch gestures
		// when the image editor is open.
		if (prevState.showImageEditor !== this.state.showImageEditor) {
			this.props.dispatch({
				type: 'SET_SIDE_MENU_TOUCH_GESTURES_DISABLED',
				disableSideMenuGestures: this.state.showImageEditor,
			});
		}

		if (prevProps.noteId && this.props.noteId && prevProps.noteId !== this.props.noteId) {
			// Easier to just go back, then go to the note since
			// the Note screen doesn't handle reloading a different note
			const noteId = this.props.noteId;
			const noteHash = this.props.noteHash;

			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Notes',
				folderId: this.state.note.parent_id,
			});

			shim.setTimeout(() => {
				this.props.dispatch({
					type: 'NAV_GO',
					routeName: 'Note',
					noteId: noteId,
					noteHash: noteHash,
				});
			}, 5);
		}
	}

	public componentWillUnmount() {
		BackButtonService.removeHandler(this.backHandler);
		NavService.removeHandler(this.navHandler);

		shared.uninstallResourceHandling(this.refreshResource);

		this.saveActionQueue(this.state.note.id).processAllNow();

		// It cannot theoretically be undefined, since componentDidMount should always be called before
		// componentWillUnmount, but with React Native the impossible often becomes possible.
		if (this.undoRedoService_) this.undoRedoService_.off('stackChange', this.undoRedoService_stackChange);
	}

	private title_changeText(text: string) {
		shared.noteComponent_change(this, 'title', text);
		this.setState({ newAndNoTitleChangeNoteId: null });
	}

	private onPlainEditorTextChange = (text: string) => {
		if (!this.undoRedoService_.canUndo) {
			this.undoRedoService_.push(this.undoState());
		} else {
			this.undoRedoService_.schedulePush(this.undoState());
		}

		shared.noteComponent_change(this, 'body', text);
	};

	// Avoid saving immediately -- the NoteEditor's content isn't controlled by its props
	// and updating this.state.note immediately causes slow rerenders.
	//
	// See https://github.com/laurent22/joplin/issues/10130
	private onMarkdownEditorTextChange = debounce((event: EditorChangeEvent) => {
		shared.noteComponent_change(this, 'body', event.value);
	}, 100);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private onPlainEditorSelectionChange = (event: NativeSyntheticEvent<any>) => {
		this.selection = event.nativeEvent.selection;
	};

	private onMarkdownEditorSelectionChange = (event: SelectionRangeChangeEvent) => {
		this.selection = { start: event.from, end: event.to };
	};

	public makeSaveAction() {
		return async () => {
			return shared.saveNoteButton_press(this, null, null);
		};
	}

	public saveActionQueue(noteId: string) {
		if (!this.saveActionQueues_[noteId]) {
			this.saveActionQueues_[noteId] = new AsyncActionQueue(500);
		}
		return this.saveActionQueues_[noteId];
	}

	public scheduleSave() {
		this.saveActionQueue(this.state.note.id).push(this.makeSaveAction());
	}

	private async saveNoteButton_press(folderId: string = null) {
		await shared.saveNoteButton_press(this, folderId, null);

		Keyboard.dismiss();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async saveOneProperty(name: string, value: any) {
		await shared.saveOneProperty(this, name, value);
	}

	private async deleteNote_onPress() {
		const note = this.state.note;
		if (!note.id) return;

		const folderId = note.parent_id;

		await Note.delete(note.id, { toTrash: true, sourceDescription: 'Delete note button' });

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			folderId: folderId,
		});
	}

	private async pickDocuments() {
		const result = await pickDocument(true);
		return result;
	}

	public async imageDimensions(uri: string): Promise<Size> {
		return new Promise((resolve, reject) => {
			Image.getSize(
				uri,
				(width: number, height: number) => {
					resolve({ width: width, height: height });
				},
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				(error: any) => {
					reject(error);
				},
			);
		});
	}

	public async resizeImage(localFilePath: string, targetPath: string, mimeType: string) {
		const maxSize = Resource.IMAGE_MAX_DIMENSION;
		const dimensions = await this.imageDimensions(localFilePath);
		reg.logger().info('Original dimensions ', dimensions);

		const saveOriginalImage = async () => {
			await shim.fsDriver().copy(localFilePath, targetPath);
			return true;
		};
		const saveResizedImage = async () => {
			dimensions.width = maxSize;
			dimensions.height = maxSize;
			reg.logger().info('New dimensions ', dimensions);

			const format = mimeType === 'image/png' ? 'PNG' : 'JPEG';
			reg.logger().info(`Resizing image ${localFilePath}`);
			const resizedImage = await ImageResizer.createResizedImage(
				localFilePath,
				dimensions.width,
				dimensions.height,
				format,
				85, // quality
				undefined, // rotation
				undefined, // outputPath
				true, // keep metadata
			);

			const resizedImagePath = resizedImage.uri;
			reg.logger().info('Resized image ', resizedImagePath);
			reg.logger().info(`Moving ${resizedImagePath} => ${targetPath}`);

			await shim.fsDriver().copy(resizedImagePath, targetPath);

			try {
				await shim.fsDriver().unlink(resizedImagePath);
			} catch (error) {
				reg.logger().warn('Error when unlinking cached file: ', error);
			}
			return true;
		};

		const canResize = dimensions.width > maxSize || dimensions.height > maxSize;
		if (canResize) {
			const resizeLargeImages = Setting.value('imageResizing');
			if (resizeLargeImages === 'alwaysAsk') {
				const userAnswer = await dialogs.pop(this, `${_('You are about to attach a large image (%dx%d pixels). Would you like to resize it down to %d pixels before attaching it?', dimensions.width, dimensions.height, maxSize)}\n\n${_('(You may disable this prompt in the options)')}`, [
					{ text: _('Yes'), id: 'yes' },
					{ text: _('No'), id: 'no' },
					{ text: _('Cancel'), id: 'cancel' },
				]);
				if (userAnswer === 'yes') return await saveResizedImage();
				if (userAnswer === 'no') return await saveOriginalImage();
				if (userAnswer === 'cancel') return false;
			} else if (resizeLargeImages === 'alwaysResize') {
				return await saveResizedImage();
			}
		}

		return await saveOriginalImage();
	}

	public async attachFile(pickerResponse: Asset, fileType: string): Promise<ResourceEntity|null> {
		if (!pickerResponse) {
			// User has cancelled
			return null;
		}

		const localFilePath = Platform.select({
			android: pickerResponse.uri,
			ios: decodeURI(pickerResponse.uri),
		});

		let mimeType = pickerResponse.type;

		if (!mimeType) {
			const ext = fileExtension(localFilePath);
			mimeType = mimeUtils.fromFileExtension(ext);
		}

		if (!mimeType && fileType === 'image') {
			// Assume JPEG if we couldn't determine the file type. It seems to happen with the image picker
			// when the file path is something like content://media/external/images/media/123456
			// If the image is not a JPEG, something will throw an error below, but there's a good chance
			// it will work.
			reg.logger().info('Missing file type and could not detect it - assuming image/jpg');
			mimeType = 'image/jpg';
		}

		reg.logger().info(`Got file: ${localFilePath}`);
		reg.logger().info(`Got type: ${mimeType}`);

		let resource: ResourceEntity = Resource.new();
		resource.id = uuid.create();
		resource.mime = mimeType;
		resource.title = pickerResponse.fileName ? pickerResponse.fileName : '';
		resource.file_extension = safeFileExtension(fileExtension(pickerResponse.fileName ? pickerResponse.fileName : localFilePath));

		if (!resource.mime) resource.mime = 'application/octet-stream';

		const targetPath = Resource.fullPath(resource);

		try {
			if (mimeType === 'image/jpeg' || mimeType === 'image/jpg' || mimeType === 'image/png') {
				const done = await this.resizeImage(localFilePath, targetPath, mimeType);
				if (!done) return null;
			} else {
				if (fileType === 'image' && mimeType !== 'image/svg+xml') {
					dialogs.error(this, _('Unsupported image type: %s', mimeType));
					return null;
				} else {
					await shim.fsDriver().copy(localFilePath, targetPath);
					const stat = await shim.fsDriver().stat(targetPath);

					if (stat.size >= 200 * 1024 * 1024) {
						await shim.fsDriver().remove(targetPath);
						throw new Error('Resources larger than 200 MB are not currently supported as they may crash the mobile applications. The issue is being investigated and will be fixed at a later time.');
					}
				}
			}
		} catch (error) {
			reg.logger().warn('Could not attach file:', error);
			await dialogs.error(this, error.message);
			return null;
		}

		const itDoes = await shim.fsDriver().waitTillExists(targetPath);
		if (!itDoes) throw new Error(`Resource file was not created: ${targetPath}`);

		const fileStat = await shim.fsDriver().stat(targetPath);
		resource.size = fileStat.size;

		resource = await Resource.save(resource, { isNew: true });

		const resourceTag = Resource.markupTag(resource);

		const newNote = { ...this.state.note };

		if (this.state.mode === 'edit') {
			let newText = '';

			if (this.selection) {
				newText = `\n${resourceTag}\n`;
				const prefix = newNote.body.substring(0, this.selection.start);
				const suffix = newNote.body.substring(this.selection.end);
				newNote.body = `${prefix}${newText}${suffix}`;
			} else {
				newText = `\n${resourceTag}`;
				newNote.body = `${newNote.body}\n${newText}`;
			}

			if (this.useEditorBeta()) {
				// The beta editor needs to be explicitly informed of changes
				// to the note's body
				if (this.editorRef.current) {
					this.editorRef.current.insertText(newText);
				} else {
					logger.error(`Tried to attach resource ${resource.id} to the note when the editor is not visible!`);
				}
			}
		} else {
			newNote.body += `\n${resourceTag}`;
		}

		this.setState({ note: newNote });

		void this.refreshResource(resource, newNote.body);

		this.scheduleSave();

		return resource;
	}

	private async attachPhoto_onPress() {
		// the selection Limit should be specified. I think 200 is enough?
		const response: ImagePickerResponse = await launchImageLibrary({ mediaType: 'photo', includeBase64: false, selectionLimit: 200 });

		if (response.errorCode) {
			reg.logger().warn('Got error from picker', response.errorCode);
			return;
		}

		if (response.didCancel) {
			reg.logger().info('User cancelled picker');
			return;
		}

		for (const asset of response.assets) {
			await this.attachFile(asset, 'image');
		}
	}

	private takePhoto_onPress() {
		this.setState({ showCamera: true });
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private cameraView_onPhoto(data: any) {
		void this.attachFile(
			{
				uri: data.uri,
				type: 'image/jpg',
			},
			'image',
		);

		this.setState({ showCamera: false });
	}

	private cameraView_onCancel() {
		this.setState({ showCamera: false });
	}

	private async attachNewDrawing(svgData: string) {
		const filePath = `${Setting.value('resourceDir')}/saved-drawing.joplin.svg`;
		await shim.fsDriver().writeFile(filePath, svgData, 'utf8');
		logger.info('Saved new drawing to', filePath);

		return await this.attachFile({
			uri: filePath,
			fileName: _('Drawing'),
		}, 'image');
	}

	private async updateDrawing(svgData: string) {
		let resource: ResourceEntity|null = this.state.imageEditorResource;

		if (!resource) {
			resource = await this.attachNewDrawing(svgData);

			// Set resource and file path to allow
			// 1. subsequent saves to update the resource
			// 2. the editor to load from the resource's filepath (can happen
			//    if the webview is reloaded).
			this.setState({
				imageEditorResourceFilepath: Resource.fullPath(resource),
				imageEditorResource: resource,
			});
		} else {
			logger.info('Saving drawing to resource', resource.id);

			const tempFilePath = join(Setting.value('tempDir'), uuid.createNano());
			await shim.fsDriver().writeFile(tempFilePath, svgData, 'utf8');

			resource = await Resource.updateResourceBlobContent(
				resource.id,
				tempFilePath,
			);
			await shim.fsDriver().remove(tempFilePath);

			await this.refreshResource(resource);
		}
	}

	private onSaveDrawing = async (svgData: string) => {
		await this.updateDrawing(svgData);
	};

	private onCloseDrawing = () => {
		this.setState({ showImageEditor: false });
	};

	private drawPicture_onPress = async () => {
		if (this.state.mode === 'edit') {
			// Create a new empty drawing and attach it now, before the image editor is opened.
			// With the present structure of Note.tsx, the we can't use this.editorRef while
			// the image editor is open, and thus can't attach drawings at the cursor location.
			const resource = await this.attachNewDrawing('');
			await this.editDrawing(resource);
		} else {
			logger.info('Showing image editor...');
			this.setState({
				showImageEditor: true,
				imageEditorResourceFilepath: null,
				imageEditorResource: null,
			});
		}
	};

	private async editDrawing(item: BaseItem) {
		const filePath = Resource.fullPath(item);
		this.setState({
			showImageEditor: true,
			imageEditorResourceFilepath: filePath,
			imageEditorResource: item,
		});
	}

	private onEditResource = async (message: string) => {
		const messageData = /^edit:(.*)$/.exec(message);
		if (!messageData) {
			throw new Error('onEditResource: Error: Invalid message');
		}

		const resourceId = messageData[1];

		const resource = await BaseItem.loadItemById(resourceId);
		await Resource.requireIsReady(resource);

		if (isEditableResource(resource.mime)) {
			await this.editDrawing(resource);
		} else {
			throw new Error(_('Unable to edit resource of type %s', resource.mime));
		}
	};

	private async attachFile_onPress() {
		const response = await this.pickDocuments();
		for (const asset of response) {
			await this.attachFile(asset, 'all');
		}
	}

	private toggleIsTodo_onPress() {
		shared.toggleIsTodo_onPress(this);

		this.scheduleSave();
	}

	private tags_onPress() {
		if (!this.state.note || !this.state.note.id) return;

		this.setState({ noteTagDialogShown: true });
	}

	private async share_onPress() {
		await Share.share({
			message: `${this.state.note.title}\n\n${this.state.note.body}`,
			title: this.state.note.title,
		});
	}

	private properties_onPress() {
		this.props.dispatch({ type: 'SIDE_MENU_OPEN' });
	}

	public async onAlarmDialogAccept(date: Date) {
		const response = await checkPermissions(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);

		// The POST_NOTIFICATIONS permission isn't supported on Android API < 33.
		// (If unsupported, returns NEVER_ASK_AGAIN).
		// On earlier releases, notifications should work without this permission.
		if (response === PermissionsAndroid.RESULTS.DENIED) {
			logger.warn('POST_NOTIFICATIONS permission was not granted');
			return;
		}

		const newNote = { ...this.state.note };
		newNote.todo_due = date ? date.getTime() : 0;

		await this.saveOneProperty('todo_due', date ? date.getTime() : 0);

		this.setState({ alarmDialogShown: false });
	}

	public onAlarmDialogReject() {
		this.setState({ alarmDialogShown: false });
	}

	private async showOnMap_onPress() {
		if (!this.state.note.id) return;

		const note = await Note.load(this.state.note.id);
		try {
			const url = Note.geolocationUrl(note);
			await Linking.openURL(url);
		} catch (error) {
			this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
			await dialogs.error(this, error.message);
		}
	}

	private async showSource_onPress() {
		if (!this.state.note.id) return;

		const note = await Note.load(this.state.note.id);
		try {
			await Linking.openURL(note.source_url);
		} catch (error) {
			await dialogs.error(this, error.message);
		}
	}

	private copyMarkdownLink_onPress() {
		const note = this.state.note;
		Clipboard.setString(Note.markdownTag(note));
	}

	public sideMenuOptions() {
		const note = this.state.note;
		if (!note) return [];

		const output = [];

		const createdDateString = time.formatMsToLocal(note.user_created_time);
		const updatedDateString = time.formatMsToLocal(note.user_updated_time);

		output.push({ title: _('Created: %s', createdDateString) });
		output.push({ title: _('Updated: %s', updatedDateString) });
		output.push({ isDivider: true });

		output.push({
			title: _('View on map'),
			onPress: () => {
				void this.showOnMap_onPress();
			},
		});
		if (note.source_url) {
			output.push({
				title: _('Go to source URL'),
				onPress: () => {
					void this.showSource_onPress();
				},
			});
		}

		return output;
	}

	public async showAttachMenu() {
		// If the keyboard is editing a WebView, the standard Keyboard.dismiss()
		// may not work. As such, we also need to call hideKeyboard on the editorRef
		this.editorRef.current?.hideKeyboard();

		const buttons = [];

		// On iOS, it will show "local files", which means certain files saved from the browser
		// and the iCloud files, but it doesn't include photos and images from the CameraRoll
		//
		// On Android, it will depend on the phone, but usually it will allow browsing all files and photos.
		buttons.push({ text: _('Attach file'), id: 'attachFile' });

		// Disabled on Android because it doesn't work due to permission issues, but enabled on iOS
		// because that's only way to browse photos from the camera roll.
		if (Platform.OS === 'ios') buttons.push({ text: _('Attach photo'), id: 'attachPhoto' });
		buttons.push({ text: _('Take photo'), id: 'takePhoto' });

		const buttonId = await dialogs.pop(this, _('Choose an option'), buttons);

		if (buttonId === 'takePhoto') this.takePhoto_onPress();
		if (buttonId === 'attachFile') void this.attachFile_onPress();
		if (buttonId === 'attachPhoto') void this.attachPhoto_onPress();
	}

	// private vosk_:Vosk;

	// private async getVosk() {
	// 	if (this.vosk_) return this.vosk_;
	// 	this.vosk_ = new Vosk();
	// 	await this.vosk_.loadModel('model-fr-fr');
	// 	return this.vosk_;
	// }

	// private async voiceRecording_onPress() {
	// 	logger.info('Vosk: Getting instance...');

	// 	const vosk = await this.getVosk();

	// 	this.voskResult_ = [];

	// 	const eventHandlers: any[] = [];

	// 	eventHandlers.push(vosk.onResult(e => {
	// 		logger.info('Vosk: result', e.data);
	// 		this.voskResult_.push(e.data);
	// 	}));

	// 	eventHandlers.push(vosk.onError(e => {
	// 		logger.warn('Vosk: error', e.data);
	// 	}));

	// 	eventHandlers.push(vosk.onTimeout(e => {
	// 		logger.warn('Vosk: timeout', e.data);
	// 	}));

	// 	eventHandlers.push(vosk.onFinalResult(e => {
	// 		logger.info('Vosk: final result', e.data);
	// 	}));

	// 	logger.info('Vosk: Starting recording...');

	// 	void vosk.start();

	// 	const buttonId = await dialogs.pop(this, 'Voice recording in progress...', [
	// 		{ text: 'Stop recording', id: 'stop' },
	// 		{ text: _('Cancel'), id: 'cancel' },
	// 	]);

	// 	logger.info('Vosk: Stopping recording...');
	// 	vosk.stop();

	// 	for (const eventHandler of eventHandlers) {
	// 		eventHandler.remove();
	// 	}

	// 	logger.info('Vosk: Recording stopped:', this.voskResult_);

	// 	if (buttonId === 'cancel') return;

	// 	const newNote: NoteEntity = { ...this.state.note };
	// 	newNote.body = `${newNote.body} ${this.voskResult_.join(' ')}`;
	// 	this.setState({ note: newNote });
	// 	this.scheduleSave();
	// }



	public menuOptions() {
		const note = this.state.note;
		const isTodo = note && !!note.is_todo;
		const isSaved = note && note.id;
		const readOnly = this.state.readOnly;
		const isDeleted = !!this.state.note.deleted_time;

		const pluginCommands = pluginUtils.commandNamesFromViews(this.props.plugins, 'noteToolbar');

		const cacheKey = md5([isTodo, isSaved, pluginCommands.join(',')].join('_'));
		if (!this.menuOptionsCache_) this.menuOptionsCache_ = {};

		if (this.menuOptionsCache_[cacheKey]) return this.menuOptionsCache_[cacheKey];

		const output: MenuOptionType[] = [];

		// The file attachment modules only work in Android >= 5 (Version 21)
		// https://github.com/react-community/react-native-image-picker/issues/606

		// As of 2020-10-13, support for attaching images from the gallery is removed
		// as the package react-native-image-picker has permission issues. It's still
		// possible to attach files, which has often a similar UI, with thumbnails for
		// images so normally it should be enough.
		let canAttachPicture = true;
		if (Platform.OS === 'android' && Platform.Version < 21) canAttachPicture = false;
		if (canAttachPicture) {
			output.push({
				title: _('Attach...'),
				onPress: () => this.showAttachMenu(),
				disabled: readOnly,
			});
		}

		output.push({
			title: _('Draw picture'),
			onPress: () => this.drawPicture_onPress(),
			disabled: readOnly,
		});

		if (isTodo) {
			output.push({
				title: _('Set alarm'),
				onPress: () => {
					this.setState({ alarmDialogShown: true });
				},
				disabled: readOnly,
			});
		}

		output.push({
			title: _('Share'),
			onPress: () => {
				void this.share_onPress();
			},
			disabled: readOnly,
		});

		// Voice typing is enabled only for French language and on Android for now
		if (voskEnabled && shim.mobilePlatform() === 'android' && isSupportedLanguage(currentLocale())) {
			output.push({
				title: _('Voice typing...'),
				onPress: () => {
					// this.voiceRecording_onPress();
					this.setState({ voiceTypingDialogShown: true });
				},
				disabled: readOnly,
			});
		}

		if (isSaved && !isDeleted) {
			output.push({
				title: _('Tags'),
				onPress: () => {
					this.tags_onPress();
				},
			});
		}

		output.push({
			title: isTodo ? _('Convert to note') : _('Convert to todo'),
			onPress: () => {
				this.toggleIsTodo_onPress();
			},
			disabled: readOnly,
		});

		if (isSaved && !isDeleted) {
			output.push({
				title: _('Copy Markdown link'),
				onPress: () => {
					this.copyMarkdownLink_onPress();
				},
			});
		}

		output.push({
			title: _('Properties'),
			onPress: () => {
				this.properties_onPress();
			},
		});

		if (isDeleted) {
			output.push({
				title: _('Restore'),
				onPress: async () => {
					await restoreItems(ModelType.Note, [this.state.note.id]);
					this.props.dispatch({
						type: 'NAV_GO',
						routeName: 'Notes',
					});
				},
			});
		}

		output.push({
			title: _('Delete'),
			onPress: () => {
				void this.deleteNote_onPress();
			},
			disabled: readOnly,
		});

		if (pluginCommands.length) {
			output.push({ isDivider: true });

			const commandService = CommandService.instance();
			for (const commandName of pluginCommands) {
				if (commandName === '-') {
					output.push({ isDivider: true });
				} else {
					output.push({
						title: commandService.description(commandName),
						onPress: async () => {
							void commandService.execute(commandName);
						},
						disabled: !commandService.isEnabled(commandName),
					});
				}
			}
		}

		this.menuOptionsCache_ = {};
		this.menuOptionsCache_[cacheKey] = output;

		return output;
	}

	private async todoCheckbox_change(checked: boolean) {
		await this.saveOneProperty('todo_completed', checked ? time.unixMs() : 0);
	}

	public scheduleFocusUpdate() {
		if (this.focusUpdateIID_) shim.clearTimeout(this.focusUpdateIID_);

		this.focusUpdateIID_ = shim.setTimeout(() => {
			this.focusUpdateIID_ = null;
			this.focusUpdate();
		}, 100);
	}

	public focusUpdate() {
		if (this.focusUpdateIID_) shim.clearTimeout(this.focusUpdateIID_);
		this.focusUpdateIID_ = null;

		if (!this.state.note) return;
		let fieldToFocus = this.state.note.is_todo ? 'title' : 'body';
		if (this.state.mode === 'view') fieldToFocus = '';

		// Avoid writing `this.titleTextFieldRef.current` -- titleTextFieldRef may
		// be undefined.
		if (fieldToFocus === 'title' && this.titleTextFieldRef?.current) {
			focus('Note::focusUpdate', this.titleTextFieldRef.current);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private async folderPickerOptions_valueChanged(itemValue: any) {
		const note = this.state.note;
		const isProvisionalNote = this.props.provisionalNoteIds.includes(note.id);

		if (isProvisionalNote) {
			await this.saveNoteButton_press(itemValue);
		} else {
			await Note.moveToFolder(note.id, itemValue);
		}

		note.parent_id = itemValue;

		const folder = await Folder.load(note.parent_id);

		this.setState({
			lastSavedNote: { ...note },
			note: note,
			folder: folder,
		});
	}

	public folderPickerOptions() {
		const options = {
			enabled: !this.state.readOnly,
			selectedFolderId: this.state.folder ? this.state.folder.id : null,
			onValueChange: this.folderPickerOptions_valueChanged,
		};

		if (this.folderPickerOptions_ && options.selectedFolderId === this.folderPickerOptions_.selectedFolderId) return this.folderPickerOptions_;

		this.folderPickerOptions_ = options;
		return this.folderPickerOptions_;
	}

	public onBodyViewerLoadEnd() {
		shim.setTimeout(() => {
			this.setState({ HACK_webviewLoadingState: 1 });
			shim.setTimeout(() => {
				this.setState({ HACK_webviewLoadingState: 0 });
			}, 50);
		}, 5);
	}

	private onBodyViewerScroll = (scrollTop: number) => {
		this.lastBodyScroll = scrollTop;
	};

	public onBodyViewerCheckboxChange(newBody: string) {
		void this.saveOneProperty('body', newBody);
	}

	private voiceTypingDialog_onText(text: string) {
		if (this.state.mode === 'view') {
			const newNote: NoteEntity = { ...this.state.note };
			newNote.body = `${newNote.body} ${text}`;
			this.setState({ note: newNote });
			this.scheduleSave();
		} else {
			if (this.useEditorBeta()) {
				// We add a space so that if the feature is used twice in a row,
				// the sentences are not stuck to each others.
				this.editorRef.current.insertText(`${text} `);
			} else {
				logger.warn('Voice typing is not supported in plaintext editor');
			}
		}
	}

	private voiceTypingDialog_onDismiss() {
		this.setState({ voiceTypingDialogShown: false });
	}

	public render() {
		if (this.state.isLoading) {
			return (
				<View style={this.styles().screen}>
					<ScreenHeader />
				</View>
			);
		}

		const theme = themeStyle(this.props.themeId);
		const note: NoteEntity = this.state.note;
		const isTodo = !!Number(note.is_todo);

		if (this.state.showCamera) {
			return <CameraView themeId={this.props.themeId} style={{ flex: 1 }} onPhoto={this.cameraView_onPhoto} onCancel={this.cameraView_onCancel} />;
		} else if (this.state.showImageEditor) {
			return <ImageEditor
				resourceFilename={this.state.imageEditorResourceFilepath}
				themeId={this.props.themeId}
				onSave={this.onSaveDrawing}
				onExit={this.onCloseDrawing}
			/>;
		}

		// Currently keyword highlighting is supported only when FTS is available.
		const keywords = this.props.searchQuery && !!this.props.ftsEnabled ? this.props.highlightedWords : emptyArray;

		let bodyComponent = null;
		if (this.state.mode === 'view') {
			// Note: as of 2018-12-29 it's important not to display the viewer if the note body is empty,
			// to avoid the HACK_webviewLoadingState related bug.
			bodyComponent =
				!note || !note.body.trim() ? null : (
					<NoteBodyViewer
						onJoplinLinkClick={this.onJoplinLinkClick_}
						style={this.styles().noteBodyViewer}
						// Extra bottom padding to make it possible to scroll past the
						// action button (so that it doesn't overlap the text)
						paddingBottom={150}
						noteBody={note.body}
						noteMarkupLanguage={note.markup_language}
						noteResources={this.state.noteResources}
						highlightedKeywords={keywords}
						themeId={this.props.themeId}
						noteHash={this.props.noteHash}
						onCheckboxChange={this.onBodyViewerCheckboxChange}
						onMarkForDownload={this.onMarkForDownload}
						onRequestEditResource={this.onEditResource}
						onLoadEnd={this.onBodyViewerLoadEnd}
						onScroll={this.onBodyViewerScroll}
						initialScroll={this.lastBodyScroll}
						pluginStates={this.props.plugins}
					/>
				);
		} else {
			// Note: In theory ScrollView can be used to provide smoother scrolling of the TextInput.
			// However it causes memory or rendering issues on older Android devices, probably because
			// the whole text input has to be in memory for the scrollview to work. So we keep it as
			// a plain TextInput for now.
			// See https://github.com/laurent22/joplin/issues/3041

			// IMPORTANT: The TextInput selection is unreliable and cannot be used in a controlled component
			// context. In other words, the selection should be considered read-only. For example, if the selection
			// is saved to the state in onSelectionChange and the current text in onChangeText, then set
			// back in `selection` and `value` props, it will mostly work. But when typing fast, sooner or
			// later the real selection will be different from what is stored in the state, thus making
			// the cursor jump around. Eg, when typing "abcdef", it will do this:
			//     abcd|
			//     abcde|
			//     abcde|f

			if (!this.useEditorBeta()) {
				bodyComponent = (
					<TextInput
						autoCapitalize="sentences"
						style={this.styles().bodyTextInput}
						ref="noteBodyTextField"
						multiline={true}
						value={note.body}
						onChangeText={this.onPlainEditorTextChange}
						onSelectionChange={this.onPlainEditorSelectionChange}
						blurOnSubmit={false}
						selectionColor={theme.textSelectionColor}
						keyboardAppearance={theme.keyboardAppearance}
						placeholder={_('Add body')}
						placeholderTextColor={theme.colorFaded}
						// need some extra padding for iOS so that the keyboard won't cover last line of the note
						// see https://github.com/laurent22/joplin/issues/3607
						// Property is gone as of RN 0.72?
						// paddingBottom={ (Platform.OS === 'ios' ? 40 : 0) as any}
					/>
				);
			} else {
				const editorStyle = this.styles().bodyTextInput;

				bodyComponent = <NoteEditor
					ref={this.editorRef}
					toolbarEnabled={this.props.toolbarEnabled}
					themeId={this.props.themeId}
					initialText={note.body}
					initialSelection={this.selection}
					onChange={this.onMarkdownEditorTextChange}
					onSelectionChange={this.onMarkdownEditorSelectionChange}
					onUndoRedoDepthChange={this.onUndoRedoDepthChange}
					onAttach={() => this.showAttachMenu()}
					readOnly={this.state.readOnly}
					plugins={this.props.plugins}
					style={{
						...editorStyle,

						// Allow the editor to set its own padding
						paddingLeft: 0,
						paddingRight: 0,
					}}
				/>;
			}
		}

		const renderActionButton = () => {
			if (this.state.voiceTypingDialogShown) return null;
			if (!this.state.note || !!this.state.note.deleted_time) return null;

			const editButton = {
				label: _('Edit'),
				icon: 'create',
				onPress: () => {
					this.setState({ mode: 'edit' });

					this.doFocusUpdate_ = true;
				},
			};

			if (this.state.mode === 'edit') return null;

			return <ActionButton mainButton={editButton} dispatch={this.props.dispatch} />;
		};

		// Save button is not really needed anymore with the improved save logic
		const showSaveButton = false; // this.state.mode === 'edit' || this.isModified() || this.saveButtonHasBeenShown_;
		const saveButtonDisabled = true;// !this.isModified();

		const titleContainerStyle = isTodo ? this.styles().titleContainerTodo : this.styles().titleContainer;

		const dueDate = Note.dueDateObject(note);

		const titleComp = (
			<View style={titleContainerStyle}>
				{isTodo && <Checkbox style={this.styles().checkbox} checked={!!Number(note.todo_completed)} onChange={this.todoCheckbox_change} />}
				<TextInput
					ref={this.titleTextFieldRef}
					underlineColorAndroid="#ffffff00"
					autoCapitalize="sentences"
					style={this.styles().titleTextInput}
					value={note.title}
					onChangeText={this.title_changeText}
					selectionColor={theme.textSelectionColor}
					keyboardAppearance={theme.keyboardAppearance}
					placeholder={_('Add title')}
					placeholderTextColor={theme.colorFaded}
					editable={!this.state.readOnly}
				/>
			</View>
		);

		const noteTagDialog = !this.state.noteTagDialogShown ? null : <NoteTagsDialog onCloseRequested={this.noteTagDialog_closeRequested} />;

		const renderVoiceTypingDialog = () => {
			if (!this.state.voiceTypingDialogShown) return null;
			return <VoiceTypingDialog locale={currentLocale()} onText={this.voiceTypingDialog_onText} onDismiss={this.voiceTypingDialog_onDismiss}/>;
		};

		return (
			<View style={this.rootStyle(this.props.themeId).root}>
				<ScreenHeader
					folderPickerOptions={this.folderPickerOptions()}
					menuOptions={this.menuOptions()}
					showSaveButton={showSaveButton}
					saveButtonDisabled={saveButtonDisabled}
					onSaveButtonPress={this.saveNoteButton_press}
					showSideMenuButton={false}
					showSearchButton={false}
					showUndoButton={(this.state.undoRedoButtonState.canUndo || this.state.undoRedoButtonState.canRedo) && this.state.mode === 'edit'}
					showRedoButton={this.state.undoRedoButtonState.canRedo && this.state.mode === 'edit'}
					undoButtonDisabled={!this.state.undoRedoButtonState.canUndo && this.state.undoRedoButtonState.canRedo}
					onUndoButtonPress={this.screenHeader_undoButtonPress}
					onRedoButtonPress={this.screenHeader_redoButtonPress}
					title={getDisplayParentTitle(this.state.note, this.state.folder)}
				/>
				{titleComp}
				{bodyComponent}
				{renderActionButton()}
				{renderVoiceTypingDialog()}

				<SelectDateTimeDialog themeId={this.props.themeId} shown={this.state.alarmDialogShown} date={dueDate} onAccept={this.onAlarmDialogAccept} onReject={this.onAlarmDialogReject} />

				<DialogBox
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					ref={(dialogbox: any) => {
						this.dialogbox = dialogbox;
					}}
				/>
				{noteTagDialog}
			</View>
		);
	}
}

const NoteScreen = connect((state: AppState) => {
	return {
		noteId: state.selectedNoteIds.length ? state.selectedNoteIds[0] : null,
		noteHash: state.selectedNoteHash,
		folderId: state.selectedFolderId,
		itemType: state.selectedItemType,
		folders: state.folders,
		searchQuery: state.searchQuery,
		themeId: state.settings.theme,
		editorFont: [state.settings['style.editor.fontFamily']],
		editorFontSize: state.settings['style.editor.fontSize'],
		toolbarEnabled: state.settings['editor.mobile.toolbarEnabled'],
		ftsEnabled: state.settings['db.ftsEnabled'],
		sharedData: state.sharedData,
		showSideMenu: state.showSideMenu,
		provisionalNoteIds: state.provisionalNoteIds,
		highlightedWords: state.highlightedWords,
		plugins: state.pluginService.plugins,

		// What we call "beta editor" in this component is actually the (now
		// default) CodeMirror editor. That should be refactored to make it less
		// confusing.
		useEditorBeta: !state.settings['editor.usePlainText'],
	};
})(NoteScreenComponent);

export default NoteScreen;
