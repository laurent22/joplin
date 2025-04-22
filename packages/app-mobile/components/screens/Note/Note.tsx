import AsyncActionQueue from '@joplin/lib/AsyncActionQueue';
import uuid from '@joplin/lib/uuid';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import UndoRedoService from '@joplin/lib/services/UndoRedoService';
import NoteBodyViewer from '../../NoteBodyViewer/NoteBodyViewer';
import checkPermissions from '../../../utils/checkPermissions';
import NoteEditor from '../../NoteEditor/NoteEditor';
import * as React from 'react';
import { Keyboard, View, TextInput, StyleSheet, Linking, Share, NativeSyntheticEvent } from 'react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import { connect } from 'react-redux';
import Note from '@joplin/lib/models/Note';
import BaseItem from '@joplin/lib/models/BaseItem';
import Resource from '@joplin/lib/models/Resource';
import Folder from '@joplin/lib/models/Folder';
const Clipboard = require('@react-native-clipboard/clipboard').default;
const md5 = require('md5');
import BackButtonService from '../../../services/BackButtonService';
import NavService, { OnNavigateCallback as OnNavigateCallback } from '@joplin/lib/services/NavService';
import { ModelType } from '@joplin/lib/BaseModel';
import FloatingActionButton from '../../buttons/FloatingActionButton';
const { fileExtension, safeFileExtension } = require('@joplin/lib/path-utils');
import * as mimeUtils from '@joplin/lib/mime-utils';
import ScreenHeader, { MenuOptionType } from '../../ScreenHeader';
import NoteTagsDialog from '../NoteTagsDialog';
import time from '@joplin/lib/time';
import Checkbox from '../../Checkbox';
import { _, currentLocale } from '@joplin/lib/locale';
import { reg } from '@joplin/lib/registry';
import ResourceFetcher from '@joplin/lib/services/ResourceFetcher';
import { BaseScreenComponent } from '../../base-screen';
import { themeStyle, editorFont } from '../../global-style';
import shared, { BaseNoteScreenComponent, Props as BaseProps } from '@joplin/lib/components/shared/note-screen-shared';
import SelectDateTimeDialog from '../../SelectDateTimeDialog';
import ShareExtension from '../../../utils/ShareExtension.js';
import CameraView from '../../CameraView/CameraView';
import { FolderEntity, NoteEntity, ResourceEntity } from '@joplin/lib/services/database/types';
import Logger from '@joplin/utils/Logger';
import ImageEditor from '../../NoteEditor/ImageEditor/ImageEditor';
import promptRestoreAutosave from '../../NoteEditor/ImageEditor/promptRestoreAutosave';
import isEditableResource from '../../NoteEditor/ImageEditor/isEditableResource';
import { ChangeEvent as EditorChangeEvent, SelectionRangeChangeEvent, UndoRedoDepthChangeEvent } from '@joplin/editor/events';
import { join } from 'path';
import { Dispatch } from 'redux';
import { RefObject, useContext } from 'react';
import { SelectionRange } from '../../NoteEditor/types';
import { getNoteCallbackUrl } from '@joplin/lib/callbackUrlUtils';
import { AppState } from '../../../utils/types';
import restoreItems from '@joplin/lib/services/trash/restoreItems';
import { getDisplayParentTitle } from '@joplin/lib/services/trash';
import { PluginHtmlContents, PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import debounce from '../../../utils/debounce';
import { focus } from '@joplin/lib/utils/focusHandler';
import CommandService, { RegisteredRuntime } from '@joplin/lib/services/CommandService';
import { ResourceInfo } from '../../NoteBodyViewer/hooks/useRerenderHandler';
import getImageDimensions from '../../../utils/image/getImageDimensions';
import resizeImage from '../../../utils/image/resizeImage';
import { CameraResult } from '../../CameraView/types';
import { DialogContext, DialogControl } from '../../DialogManager';
import { CommandRuntimeProps, EditorMode, PickerResponse } from './types';
import commands from './commands';
import { AttachFileAction, AttachFileOptions } from './commands/attachFile';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import PluginUserWebView from '../../plugins/dialogs/PluginUserWebView';
import getShownPluginEditorView from '@joplin/lib/services/plugins/utils/getShownPluginEditorView';
import getActivePluginEditorView from '@joplin/lib/services/plugins/utils/getActivePluginEditorView';
import EditorPluginHandler from '@joplin/lib/services/plugins/EditorPluginHandler';
import AudioRecordingBanner from '../../voiceTyping/AudioRecordingBanner';
import SpeechToTextBanner from '../../voiceTyping/SpeechToTextBanner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const emptyArray: any[] = [];

const logger = Logger.create('screens/Note');

interface InsertTextOptions {
	newLine?: boolean;
}

interface NoteNavigation {
	// Arguments passed to the NAV_GO action
	state: {
		newNoteAttachFileAction?: AttachFileAction;
	};
}

interface Props extends BaseProps {
	provisionalNoteIds: string[];
	navigation: NoteNavigation;
	dispatch: Dispatch;
	noteId: string;
	useEditorBeta: boolean;
	plugins: PluginStates;
	themeId: number;
	editorFontSize: number;
	editorFont: number; // e.g. Setting.FONT_MENLO
	viewerFontSize: number;
	showSideMenu: boolean;
	searchQuery: string;
	ftsEnabled: number;
	highlightedWords: string[];
	noteHash: string;
	toolbarEnabled: boolean;
	'plugins.shownEditorViewIds': string[];
	pluginHtmlContents: PluginHtmlContents;
	editorNoteReloadTimeRequest: number;
}

interface ComponentProps extends Props {
	dialogs: DialogControl;
}

interface State {
	note: NoteEntity;
	mode: EditorMode;
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
	showAudioRecorder: boolean;
	imageEditorResource: ResourceEntity;
	imageEditorResourceFilepath: string;
	noteResources: Record<string, ResourceInfo>;
	newAndNoTitleChangeNoteId: boolean|null;
	noteLastLoadTime: number;

	undoRedoButtonState: {
		canUndo: boolean;
		canRedo: boolean;
	};

	showSpeechToTextDialog: boolean;
}

class NoteScreenComponent extends BaseScreenComponent<ComponentProps, State> implements BaseNoteScreenComponent {
	// This isn't in this.state because we don't want changing scroll to trigger
	// a re-render.
	private lastBodyScroll: number|undefined = undefined;

	private saveActionQueues_: Record<string, AsyncActionQueue>;
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
	private commandRegistration_: RegisteredRuntime|null = null;
	private editorPluginHandler_ = new EditorPluginHandler(PluginService.instance());

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static navigationOptions(): any {
		return { header: null };
	}

	public constructor(props: ComponentProps) {
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
			showAudioRecorder: false,
			imageEditorResource: null,
			noteResources: {},
			imageEditorResourceFilepath: null,
			newAndNoTitleChangeNoteId: null,
			noteLastLoadTime: Date.now(),

			undoRedoButtonState: {
				canUndo: false,
				canRedo: false,
			},

			showSpeechToTextDialog: false,
		};

		this.titleTextFieldRef = React.createRef();

		this.saveActionQueues_ = {};

		// this.markdownEditorRef = React.createRef(); // For focusing the Markdown editor

		this.doFocusUpdate_ = false;

		this.styles_ = {};

		this.editorRef = React.createRef();

		const saveDialog = async () => {
			if (this.isModified()) {
				const buttonId = await this.props.dialogs.showMenu(
					_('This note has been modified:'),
					[{ text: _('Save changes'), id: 'save' }, { text: _('Discard changes'), id: 'discard' }, { text: _('Cancel'), id: 'cancel' }],
				);

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
					mode: 'view',
				});

				await this.undoRedoService_.reset();

				return true;
			}

			if (this.state.fromShare) {
				// Note: In the past, NAV_BACK caused undesired behaviour in this case:
				// - share to Joplin from some other app
				// - open Joplin and open any note
				// - go back -- with NAV_BACK this causes the app to exit rather than just showing notes
				// This no longer seems to happen, but this case should be checked when adjusting navigation
				// history behavior.
				this.props.dispatch({
					type: 'NAV_BACK',
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
				await CommandService.instance().execute('openItem', msg);
			} catch (error) {
				await this.props.dialogs.error(error.message);
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
		this.onBodyViewerCheckboxChange = this.onBodyViewerCheckboxChange.bind(this);
		this.onUndoRedoDepthChange = this.onUndoRedoDepthChange.bind(this);
		this.speechToTextDialog_onText = this.speechToTextDialog_onText.bind(this);
		this.audioRecorderDialog_onDismiss = this.audioRecorderDialog_onDismiss.bind(this);
	}

	private registerCommands() {
		if (this.commandRegistration_) return;

		const dialogs = () => this.props.dialogs;
		this.commandRegistration_ = CommandService.instance().componentRegisterCommands<CommandRuntimeProps>(
			{
				attachFile: this.attachFile.bind(this),
				hideKeyboard: () => {
					if (this.useEditorBeta()) {
						this.editorRef?.current?.hideKeyboard();
					} else {
						Keyboard.dismiss();
					}
				},
				insertText: this.insertText.bind(this),
				get dialogs() {
					return dialogs();
				},
				setCameraVisible: (visible) => {
					this.setState({ showCamera: visible });
				},
				setTagDialogVisible: (visible) => {
					if (!this.state.note || !this.state.note.id) return;

					this.setState({ noteTagDialogShown: visible });
				},
				setAudioRecorderVisible: (visible) => {
					this.setState({ showAudioRecorder: visible });
				},
				getMode: () => this.state.mode,
				setMode: (mode: 'view'|'edit') => {
					this.setState({ mode });
				},
			},
			commands,
			true,
		);
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

		const cacheKey = [themeId, this.state.titleTextInputHeight].join('_');

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
			toggleSpaceButtonContent: {
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
			flexBasis: 'auto',
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

		this.styles_[cacheKey] = StyleSheet.create(styles);
		return this.styles_[cacheKey];
	}

	public isModified() {
		return shared.isModified(this);
	}

	public async requestGeoLocationPermissions() {
		if (!Setting.value('trackLocation')) return;
		if (Platform.OS === 'web') return;

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

		// Although it is async, we don't wait for the answer so that if permission
		// has already been granted, it doesn't slow down opening the note. If it hasn't
		// been granted, the popup will open anyway.
		void this.requestGeoLocationPermissions();

		const action = this.props.navigation.state?.newNoteAttachFileAction;
		if (action) {
			setTimeout(async () => {
				if (action === AttachFileAction.AttachDrawing) {
					await this.drawPicture_onPress();
				} else {
					const options: AttachFileOptions = {
						action: action,
					};
					await CommandService.instance().execute('attachFile', '', options);
				}
			}, 100);
		}

		await this.editorPluginHandler_.emitActivationCheck();

		setTimeout(() => {
			this.editorPluginHandler_.emitUpdate(this.props['plugins.shownEditorViewIds']);
		}, 300);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public onMarkForDownload(event: any) {
		void ResourceFetcher.instance().markForDownload(event.resourceId);
	}

	public async markAllAttachedResourcesForDownload() {
		const resourceIds = await Note.linkedResourceIds(this.state.note.body);
		await ResourceFetcher.instance().markForDownload(resourceIds);
	}

	public componentDidUpdate(prevProps: Props, prevState: State) {
		if (this.doFocusUpdate_) {
			this.doFocusUpdate_ = false;
			this.scheduleFocusUpdate();
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

			// Handle automatic resource downloading
			if (this.state.note?.body && Setting.value('sync.resourceDownloadMode') === 'auto') {
				void this.markAllAttachedResourcesForDownload();
			}
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
				routeName: 'Note',
				noteId: noteId,
				noteHash: noteHash,
			});
		}

		if (this.props['plugins.shownEditorViewIds'] !== prevProps['plugins.shownEditorViewIds']) {
			const { editorPlugin } = getShownPluginEditorView(this.props.plugins, this.props['plugins.shownEditorViewIds']);
			if (!editorPlugin && this.props.editorNoteReloadTimeRequest > this.state.noteLastLoadTime) {
				void shared.reloadNote(this);
			}
		}

		if (prevProps.noteId && this.props.noteId && prevProps.noteId !== this.props.noteId) {
			void this.editorPluginHandler_.emitActivationCheck();
		}
	}

	public componentWillUnmount() {
		BackButtonService.removeHandler(this.backHandler);
		NavService.removeHandler(this.navHandler);

		shared.uninstallResourceHandling(this.refreshResource);

		void this.saveActionQueue(this.state.note.id).processAllNow();

		// It cannot theoretically be undefined, since componentDidMount should always be called before
		// componentWillUnmount, but with React Native the impossible often becomes possible.
		if (this.undoRedoService_) this.undoRedoService_.off('stackChange', this.undoRedoService_stackChange);

		this.commandRegistration_?.deregister();
		this.commandRegistration_ = null;
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

	public async resizeImage(localFilePath: string, targetPath: string, mimeType: string) {
		const maxSize = Resource.IMAGE_MAX_DIMENSION;
		const dimensions = await getImageDimensions(localFilePath);
		reg.logger().info('Original dimensions ', dimensions);

		const saveOriginalImage = async () => {
			await shim.fsDriver().copy(localFilePath, targetPath);
			return true;
		};
		const saveResizedImage = async () => {
			dimensions.width = maxSize;
			dimensions.height = maxSize;
			reg.logger().info('New dimensions ', dimensions);

			await resizeImage({
				inputPath: localFilePath,
				outputPath: targetPath,
				maxWidth: dimensions.width,
				maxHeight: dimensions.height,
				quality: 85,
				format: mimeType === 'image/png' ? 'PNG' : 'JPEG',
			});
			return true;
		};

		const canResize = dimensions.width > maxSize || dimensions.height > maxSize;
		if (canResize) {
			const resizeLargeImages = Setting.value('imageResizing');
			if (resizeLargeImages === 'alwaysAsk') {
				const userAnswer = await this.props.dialogs.showMenu(
					`${_('You are about to attach a large image (%dx%d pixels). Would you like to resize it down to %d pixels before attaching it?', dimensions.width, dimensions.height, maxSize)}\n\n${_('(You may disable this prompt in the options)')}`, [
						{ text: _('Yes'), id: 'yes' },
						{ text: _('No'), id: 'no' },
						{ text: _('Cancel'), id: 'cancel' },
					]);
				if (userAnswer === 'yes') return await saveResizedImage();
				if (userAnswer === 'no') return await saveOriginalImage();
				if (userAnswer === 'cancel' || !userAnswer) return false;
			} else if (resizeLargeImages === 'alwaysResize') {
				return await saveResizedImage();
			}
		}

		return await saveOriginalImage();
	}

	private async insertText(text: string, { newLine = false }: InsertTextOptions = {}) {
		const newNote = { ...this.state.note };
		const separator = newLine ? '\n' : '';

		if (this.state.mode === 'edit') {
			let newText = '';

			if (this.selection) {
				newText = `${separator}${text}${separator}`;
				const prefix = newNote.body.substring(0, this.selection.start);
				const suffix = newNote.body.substring(this.selection.end);
				newNote.body = `${prefix}${newText}${suffix}`;
			} else {
				newText = `${separator}${separator}${text}`;
				newNote.body = `${newNote.body}${newText}`;
			}

			if (this.useEditorBeta()) {
				// The beta editor needs to be explicitly informed of changes
				// to the note's body
				if (this.editorRef.current) {
					this.editorRef.current.insertText(newText);
				} else {
					logger.info(`Tried to insert text ${text} to the note when the editor is not visible -- updating the note body instead.`);
				}
			}
		} else {
			newNote.body += `${separator}${text}`;
		}

		this.setState({ note: newNote });
		return newNote;
	}

	public async attachFile(
		pickerResponse: PickerResponse,
		fileType: string,
	): Promise<ResourceEntity|null> {
		if (!pickerResponse) {
			// User has cancelled
			return null;
		}

		const localFilePath = Platform.select({
			ios: decodeURI(pickerResponse.uri),
			default: pickerResponse.uri,
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
					await this.props.dialogs.error(_('Unsupported image type: %s', mimeType));
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
			await this.props.dialogs.error(error.message);
			return null;
		}

		const itDoes = await shim.fsDriver().waitTillExists(targetPath);
		if (!itDoes) throw new Error(`Resource file was not created: ${targetPath}`);

		const fileStat = await shim.fsDriver().stat(targetPath);
		resource.size = fileStat.size;

		resource = await Resource.save(resource, { isNew: true });

		const resourceTag = Resource.markupTag(resource);
		const newNote = await this.insertText(resourceTag, { newLine: true });

		void this.refreshResource(resource, newNote.body);

		this.scheduleSave();

		return resource;
	}

	private cameraView_onPhoto(data: CameraResult) {
		void this.attachFile(
			data,
			'image',
		);

		this.setState({ showCamera: false });
	}

	private cameraView_onInsertBarcode = (data: string) => {
		this.setState({ showCamera: false });
		void this.insertText(data, { newLine: true });
	};

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
		logger.info('Showing image editor...');
		this.setState({
			showImageEditor: true,
			imageEditorResourceFilepath: null,
			imageEditorResource: null,
		});
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

	private toggleIsTodo_onPress() {
		shared.toggleIsTodo_onPress(this);

		this.scheduleSave();
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
		if (Platform.OS === 'android') {
			const response = await checkPermissions(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);

			// The POST_NOTIFICATIONS permission isn't supported on Android API < 33.
			// (If unsupported, returns NEVER_ASK_AGAIN).
			// On earlier releases, notifications should work without this permission.
			if (response === PermissionsAndroid.RESULTS.DENIED) {
				logger.warn('POST_NOTIFICATIONS permission was not granted');
				return;
			}
		}

		if (Platform.OS === 'web') {
			alert('Warning: The due-date has been saved, but showing notifications is not supported by Joplin Web.');
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
			await this.props.dialogs.error(error.message);
		}
	}

	private async showSource_onPress() {
		if (!this.state.note.id) return;

		const note = await Note.load(this.state.note.id);
		try {
			await Linking.openURL(note.source_url);
		} catch (error) {
			await this.props.dialogs.error(error.message);
		}
	}

	private copyMarkdownLink_onPress() {
		const note = this.state.note;
		Clipboard.setString(Note.markdownTag(note));
	}

	private copyExternalLink_onPress() {
		const note = this.state.note;
		Clipboard.setString(getNoteCallbackUrl(note.id));
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

	public onAttach = async (filePath?: string) => {
		await CommandService.instance().execute('attachFile', filePath);
	};

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

		const cacheKey = md5([isTodo, isSaved, pluginCommands.join(','), readOnly].join('_'));
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
				onPress: () => this.onAttach(),
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

		const shareSupported = Platform.OS !== 'web' || !!navigator.share;
		if (shareSupported) {
			output.push({
				title: _('Share'),
				onPress: () => {
					void this.share_onPress();
				},
				disabled: readOnly,
			});
		}

		const voiceTypingSupported = Platform.OS === 'android';
		if (voiceTypingSupported) {
			output.push({
				title: _('Voice typing...'),
				onPress: () => {
					// this.voiceRecording_onPress();
					this.setState({ showSpeechToTextDialog: true });
				},
				disabled: readOnly,
			});
		}

		const commandService = CommandService.instance();
		const whenContext = commandService.currentWhenClauseContext();
		const addButtonFromCommand = (commandName: string, title?: string) => {
			if (commandName === '-') {
				output.push({ isDivider: true });
			} else {
				output.push({
					title: title ?? commandService.description(commandName),
					onPress: async () => {
						void commandService.execute(commandName);
					},
					disabled: !commandService.isEnabled(commandName, whenContext),
				});
			}
		};

		if (isSaved && !isDeleted) {
			addButtonFromCommand('setTags');
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

			// External links are not supported on web.
			if (Platform.OS !== 'web') {
				output.push({
					title: _('Copy external link'),
					onPress: () => {
						this.copyExternalLink_onPress();
					},
				});
			}
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

		if (whenContext.inTrash) {
			addButtonFromCommand('permanentlyDeleteNote');
		} else {
			addButtonFromCommand('deleteNote', _('Delete'));
		}

		if (pluginCommands.length) {
			output.push({ isDivider: true });

			for (const commandName of pluginCommands) {
				addButtonFromCommand(commandName);
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
		if (this.focusUpdateIID_) shim.clearInterval(this.focusUpdateIID_);

		const startTime = Date.now();

		this.focusUpdateIID_ = shim.setInterval(() => {
			if (!this.state.note) return;

			let fieldToFocus = this.state.note.is_todo ? 'title' : 'body';
			if (this.state.mode === 'view') fieldToFocus = '';

			let done = false;

			if (fieldToFocus === 'title' && this.titleTextFieldRef?.current) {
				done = true;
				focus('Note::focusUpdate::title', this.titleTextFieldRef.current);
			} else if (fieldToFocus === 'body' && this.editorRef?.current) {
				done = true;
				focus('Note::focusUpdate::body', this.editorRef.current);
			}

			if (Date.now() - startTime > 5000) {
				logger.warn(`Timeout while trying to set focus on ${fieldToFocus}`);
				done = true;
			}

			if (!this.noteEditorVisible()) {
				logger.info(`Note editor is not visible - not setting focus on ${fieldToFocus}`);
				done = true;
			}

			if (done) {
				shim.clearInterval(this.focusUpdateIID_);
				this.focusUpdateIID_ = null;
			}
		}, 50);
	}

	private async folderPickerOptions_valueChanged(itemValue: string) {
		const note = this.state.note;
		const isProvisionalNote = this.props.provisionalNoteIds.includes(note.id);

		if (isProvisionalNote) {
			await this.saveNoteButton_press(itemValue);
		} else {
			await Note.moveToFolder(
				note.id,
				itemValue,
				{ dispatchOptions: { preserveSelection: true } },
			);
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
			visible: !this.state.readOnly,
			disabled: false,
			selectedFolderId: this.state.folder ? this.state.folder.id : null,
			onValueChange: this.folderPickerOptions_valueChanged,
		};

		if (
			this.folderPickerOptions_
			&& options.selectedFolderId === this.folderPickerOptions_.selectedFolderId
			&& options.visible === this.folderPickerOptions_.visible
		) {
			return this.folderPickerOptions_;
		}

		this.folderPickerOptions_ = options;
		return this.folderPickerOptions_;
	}

	private onBodyViewerScroll = (scrollTop: number) => {
		this.lastBodyScroll = scrollTop;
	};

	public onBodyViewerCheckboxChange(newBody: string) {
		void this.saveOneProperty('body', newBody);
	}

	private speechToTextDialog_onText(text: string) {
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

	private audioRecordingDialog_onFile = (file: PickerResponse) => {
		return this.attachFile(file, 'audio');
	};

	private audioRecorderDialog_onDismiss = () => {
		this.setState({ showSpeechToTextDialog: false, showAudioRecorder: false });
	};

	private speechToTextDialog_onDismiss = () => {
		this.setState({ showSpeechToTextDialog: false });
	};

	private noteEditorVisible() {
		return !this.state.showCamera && !this.state.showImageEditor;
	}

	public render() {
		// Commands must be registered before child components can render.
		// Calling this in the constructor won't work in strict mode, where
		// componentWillUnmount (which removes the commands) can be called
		// multiple times.
		this.registerCommands();

		const { editorPlugin, editorView } = getShownPluginEditorView(this.props.plugins, this.props['plugins.shownEditorViewIds']);

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
			return <CameraView
				style={{ flex: 1 }}
				onPhoto={this.cameraView_onPhoto}
				onInsertBarcode={this.cameraView_onInsertBarcode}
				onCancel={this.cameraView_onCancel}
			/>;
		} else if (this.state.showImageEditor) {
			return <ImageEditor
				resourceFilename={this.state.imageEditorResourceFilepath}
				themeId={this.props.themeId}
				onSave={this.onSaveDrawing}
				onExit={this.onCloseDrawing}
			/>;
		}

		const renderPluginEditor = () => {
			return <PluginUserWebView
				viewInfo={{ plugin: editorPlugin, view: editorView }}
				themeId={this.props.themeId}
				onLoadEnd={() => {}}
				pluginHtmlContents={this.props.pluginHtmlContents}
				setDialogControl={() => {}}
				style={{}}
			/>;
		};

		// Currently keyword highlighting is supported only when FTS is available.
		const keywords = this.props.searchQuery && !!this.props.ftsEnabled ? this.props.highlightedWords : emptyArray;

		let bodyComponent = null;

		if (editorView) {
			bodyComponent = renderPluginEditor();
		} else {
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
							fontSize={this.props.viewerFontSize}
							noteHash={this.props.noteHash}
							onCheckboxChange={this.onBodyViewerCheckboxChange}
							onMarkForDownload={this.onMarkForDownload}
							onRequestEditResource={this.onEditResource}
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
						noteId={this.props.noteId}
						noteHash={this.props.noteHash}
						initialText={note.body}
						initialSelection={this.selection}
						onChange={this.onMarkdownEditorTextChange}
						onSelectionChange={this.onMarkdownEditorSelectionChange}
						onUndoRedoDepthChange={this.onUndoRedoDepthChange}
						onAttach={this.onAttach}
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
		}

		const voiceTypingDialogShown = this.state.showSpeechToTextDialog || this.state.showAudioRecorder;
		const renderActionButton = () => {
			if (voiceTypingDialogShown) return null;
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

			return <FloatingActionButton mainButton={editButton} />;
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

		const renderVoiceTypingDialogs = () => {
			const result = [];
			if (this.state.showAudioRecorder) {
				result.push(<AudioRecordingBanner
					key='audio-recorder'
					onFileSaved={this.audioRecordingDialog_onFile}
					onDismiss={this.audioRecorderDialog_onDismiss}
				/>);
			}
			if (this.state.showSpeechToTextDialog) {
				result.push(<SpeechToTextBanner
					key='speech-to-text'
					locale={currentLocale()}
					onText={this.speechToTextDialog_onText}
					onDismiss={this.speechToTextDialog_onDismiss}
				/>);
			}
			return result;
		};

		const { editorPlugin: activeEditorPlugin } = getActivePluginEditorView(this.props.plugins);

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
					showPluginEditorButton={!!activeEditorPlugin}
					undoButtonDisabled={!this.state.undoRedoButtonState.canUndo && this.state.undoRedoButtonState.canRedo}
					onUndoButtonPress={this.screenHeader_undoButtonPress}
					onRedoButtonPress={this.screenHeader_redoButtonPress}
					title={getDisplayParentTitle(this.state.note, this.state.folder)}
				/>
				{titleComp}
				{bodyComponent}
				{renderVoiceTypingDialogs()}
				{renderActionButton()}

				<SelectDateTimeDialog themeId={this.props.themeId} shown={this.state.alarmDialogShown} date={dueDate} onAccept={this.onAlarmDialogAccept} onReject={this.onAlarmDialogReject} />

				{noteTagDialog}
			</View>
		);
	}
}

// We added this change to reset the component state when the props.noteId is changed.
// NoteScreenComponent original implementation assumed that noteId would never change,
// which can cause some bugs where previously set state to another note would interfere
// how the new note should be rendered
const NoteScreenWrapper = (props: Props) => {
	const dialogs = useContext(DialogContext);
	return (
		<NoteScreenComponent key={props.noteId} dialogs={dialogs} {...props} />
	);
};

const NoteScreen = connect((state: AppState) => {
	return {
		noteId: state.selectedNoteIds.length ? state.selectedNoteIds[0] : null,
		noteHash: state.selectedNoteHash,
		itemType: state.selectedItemType,
		folders: state.folders,
		searchQuery: state.searchQuery,
		themeId: state.settings.theme,
		editorFont: state.settings['style.editor.fontFamily'] as number,
		editorFontSize: state.settings['style.editor.fontSize'],
		viewerFontSize: state.settings['style.viewer.fontSize'],
		toolbarEnabled: state.settings['editor.mobile.toolbarEnabled'],
		ftsEnabled: state.settings['db.ftsEnabled'],
		sharedData: state.sharedData,
		showSideMenu: state.showSideMenu,
		provisionalNoteIds: state.provisionalNoteIds,
		highlightedWords: state.highlightedWords,
		plugins: state.pluginService.plugins,
		'plugins.shownEditorViewIds': state.settings['plugins.shownEditorViewIds'] || [],
		pluginHtmlContents: state.pluginService.pluginHtmlContents,
		editorNoteReloadTimeRequest: state.editorNoteReloadTimeRequest,

		// What we call "beta editor" in this component is actually the (now
		// default) CodeMirror editor. That should be refactored to make it less
		// confusing.
		useEditorBeta: !state.settings['editor.usePlainText'],
	};
})(NoteScreenWrapper);

export default NoteScreen;
