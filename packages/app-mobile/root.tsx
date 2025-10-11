import * as React from 'react';
import shim from '@joplin/lib/shim';
import PerformanceLogger from '@joplin/lib/PerformanceLogger';

shim.setReact(React);
PerformanceLogger.onAppStartBegin();

import setupQuickActions from './setupQuickActions';
import AlarmService from '@joplin/lib/services/AlarmService';
import Alarm from '@joplin/lib/models/Alarm';
import time from '@joplin/lib/time';
import Logger from '@joplin/utils/Logger';
import NoteScreen from './components/screens/Note/Note';
import UpgradeSyncTargetScreen from './components/screens/UpgradeSyncTargetScreen';
import Setting, { } from '@joplin/lib/models/Setting';
import PoorManIntervals from '@joplin/lib/PoorManIntervals';
import { NotesParent, serializeNotesParent } from '@joplin/lib/reducer';
import ShareExtension, { UnsubscribeShareListener } from './utils/ShareExtension';
import handleShared from './utils/shareHandler';
import { _, setLocale } from '@joplin/lib/locale';
import SyncTargetJoplinServer from '@joplin/lib/SyncTargetJoplinServer';
import SyncTargetJoplinCloud from '@joplin/lib/SyncTargetJoplinCloud';
import SyncTargetOneDrive from '@joplin/lib/SyncTargetOneDrive';
import { Keyboard, BackHandler, Animated, StatusBar, Platform, Dimensions } from 'react-native';
import { AppState as RNAppState, EmitterSubscription, View, Text, Linking, NativeEventSubscription, Appearance, ActivityIndicator } from 'react-native';
import getResponsiveValue from './components/getResponsiveValue';
import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';
const DropdownAlert = require('react-native-dropdownalert').default;
import SafeAreaView from './components/SafeAreaView';
const { connect, Provider } = require('react-redux');
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import BackButtonService, { BackButtonHandler } from './services/BackButtonService';
import NavService from '@joplin/lib/services/NavService';
import { createStore, applyMiddleware, Dispatch } from 'redux';
import reduxSharedMiddleware from '@joplin/lib/components/shared/reduxSharedMiddleware';
const { AppNav } = require('./components/app-nav.js');
import Folder from '@joplin/lib/models/Folder';
import NotesScreen from './components/screens/Notes/Notes';
import TagsScreen from './components/screens/tags';
import ConfigScreen from './components/screens/ConfigScreen/ConfigScreen';
const { FolderScreen } = require('./components/screens/folder.js');
import LogScreen from './components/screens/LogScreen';
import StatusScreen from './components/screens/status';
import SearchScreen from './components/screens/SearchScreen';
const { OneDriveLoginScreen } = require('./components/screens/onedrive-login.js');
import EncryptionConfigScreen from './components/screens/encryption-config';
import DropboxLoginScreen from './components/screens/dropbox-login.js';
import { MenuProvider } from 'react-native-popup-menu';
import SideMenu, { SideMenuPosition } from './components/SideMenu';
import SideMenuContent from './components/side-menu-content';
import SideMenuContentNote, { SideMenuContentOptions } from './components/SideMenuContentNote';
import { reg } from '@joplin/lib/registry';
import { defaultState } from '@joplin/lib/reducer';
import ResourceFetcher from '@joplin/lib/services/ResourceFetcher';
import SearchEngine from '@joplin/lib/services/search/SearchEngine';
import { themeStyle } from './components/global-style';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import SyncTargetFilesystem from '@joplin/lib/SyncTargetFilesystem';
const SyncTargetNextcloud = require('@joplin/lib/SyncTargetNextcloud.js');
const SyncTargetWebDAV = require('@joplin/lib/SyncTargetWebDAV.js');
const SyncTargetDropbox = require('@joplin/lib/SyncTargetDropbox.js');
const SyncTargetAmazonS3 = require('@joplin/lib/SyncTargetAmazonS3.js');
import SyncTargetJoplinServerSAML from '@joplin/lib/SyncTargetJoplinServerSAML';
import BiometricPopup from './components/biometrics/BiometricPopup';
import { isCallbackUrl, parseCallbackUrl, CallbackUrlCommand } from '@joplin/lib/callbackUrlUtils';
import JoplinCloudLoginScreen from './components/screens/JoplinCloudLoginScreen';

import SyncTargetNone from '@joplin/lib/SyncTargetNone';



SyncTargetRegistry.addClass(SyncTargetNone);
SyncTargetRegistry.addClass(SyncTargetOneDrive);
SyncTargetRegistry.addClass(SyncTargetNextcloud);
SyncTargetRegistry.addClass(SyncTargetWebDAV);
SyncTargetRegistry.addClass(SyncTargetDropbox);
SyncTargetRegistry.addClass(SyncTargetFilesystem);
SyncTargetRegistry.addClass(SyncTargetAmazonS3);
SyncTargetRegistry.addClass(SyncTargetJoplinServer);
SyncTargetRegistry.addClass(SyncTargetJoplinServerSAML);
SyncTargetRegistry.addClass(SyncTargetJoplinCloud);

import DecryptionWorker from '@joplin/lib/services/DecryptionWorker';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import setupNotifications from './utils/setupNotifications';
import { loadMasterKeysFromSettings } from '@joplin/lib/services/e2ee/utils';
import { Theme, ThemeAppearance } from '@joplin/lib/themes/type';
import ProfileSwitcher from './components/ProfileSwitcher/ProfileSwitcher';
import ProfileEditor from './components/ProfileSwitcher/ProfileEditor';
import sensorInfo, { SensorInfo } from './components/biometrics/sensorInfo';
import { setDispatch } from './services/profiles';
import { ReactNode } from 'react';
import autodetectTheme, { onSystemColorSchemeChange } from './utils/autodetectTheme';
import PluginRunnerWebView from './components/plugins/PluginRunnerWebView';
import { refreshFolders, scheduleRefreshFolders } from '@joplin/lib/folders-screen-utils';
import ShareManager from './components/screens/ShareManager';
import { setDateFormat, setTimeFormat, setTimeLocale } from '@joplin/utils/time';
import DialogManager from './components/DialogManager';
import { AppState } from './utils/types';
import { getDisplayParentId } from '@joplin/lib/services/trash';
import PluginNotification from './components/plugins/PluginNotification';
import FocusControl from './components/accessibility/FocusControl/FocusControl';
import SsoLoginScreen from './components/screens/SsoLoginScreen';
import SamlShared from '@joplin/lib/components/shared/SamlShared';
import NoteRevisionViewer from './components/screens/NoteRevisionViewer';
import DocumentScanner from './components/screens/DocumentScanner/DocumentScanner';
import buildStartupTasks from './utils/buildStartupTasks';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import appReducer from './utils/appReducer';
import SyncWizard from './components/SyncWizard/SyncWizard';

const logger = Logger.create('root');
const perfLogger = PerformanceLogger.create();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let storeDispatch: any = function(_action: any) {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const logReducerAction = function(action: any) {
	if (['SIDE_MENU_OPEN_PERCENT', 'SYNC_REPORT_UPDATE'].indexOf(action.type) >= 0) return;

	const msg = [action.type];
	if (action.routeName) msg.push(action.routeName);

	// reg.logger().debug('Reducer action', msg.join(', '));
};

const biometricsEnabled = (sensorInfo: SensorInfo): boolean => {
	return !!sensorInfo && sensorInfo.enabled;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const generalMiddleware = (store: any) => (next: any) => async (action: any) => {
	logReducerAction(action);
	PoorManIntervals.update(); // This function needs to be called regularly so put it here

	const result = next(action);
	const newState: AppState = store.getState();
	let doRefreshFolders = false;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	await reduxSharedMiddleware(store, next, action, storeDispatch as any);

	if (action.type === 'NAV_GO') Keyboard.dismiss();

	if (['NOTE_UPDATE_ONE', 'NOTE_DELETE', 'FOLDER_UPDATE_ONE', 'FOLDER_DELETE'].indexOf(action.type) >= 0) {
		if (!await reg.syncTarget().syncStarted()) void reg.scheduleSync(reg.syncAsYouTypeInterval(), { syncSteps: ['update_remote', 'delete_remote'] }, true);
		SearchEngine.instance().scheduleSyncTables();
	}

	if (['FOLDER_UPDATE_ONE'].indexOf(action.type) >= 0) {
		doRefreshFolders = true;
	}

	if (['EVENT_NOTE_ALARM_FIELD_CHANGE', 'NOTE_DELETE'].indexOf(action.type) >= 0) {
		await AlarmService.updateNoteNotification(action.id, action.type === 'NOTE_DELETE');
	}

	if (action.type === 'NOTE_DELETE' && newState.route?.routeName === 'Note' && newState.route.noteId === action.id) {
		const parentItem = action.originalItem?.parent_id ? await Folder.load(action.originalItem?.parent_id) : null;
		const parentId = getDisplayParentId(action.originalItem, parentItem);
		await NavService.go('Notes', { folderId: parentId });
	}

	if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'sync.interval' || action.type === 'SETTING_UPDATE_ALL') {
		reg.setupRecurrentSync();
	}

	if ((action.type === 'SETTING_UPDATE_ONE' && (action.key === 'dateFormat' || action.key === 'timeFormat')) || (action.type === 'SETTING_UPDATE_ALL')) {
		time.setDateFormat(Setting.value('dateFormat'));
		time.setTimeFormat(Setting.value('timeFormat'));
		setDateFormat(Setting.value('dateFormat'));
		setTimeFormat(Setting.value('timeFormat'));
	}

	if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'locale' || action.type === 'SETTING_UPDATE_ALL') {
		setLocale(Setting.value('locale'));
		setTimeLocale(Setting.value('locale'));
	}

	// Like the desktop and CLI apps, we run this whenever the sync target properties change.
	// Previously, this only ran when encryption was enabled/disabled. However, after fetching
	// a new key, this needs to run and so we run it when the sync target info changes.
	if (
		(action.type === 'SETTING_UPDATE_ONE' && (action.key === 'syncInfoCache' || action.key.startsWith('encryption.')))
		|| action.type === 'SETTING_UPDATE_ALL'
	) {
		await loadMasterKeysFromSettings(EncryptionService.instance());
		void DecryptionWorker.instance().scheduleStart();
		const loadedMasterKeyIds = EncryptionService.instance().loadedMasterKeyIds();

		storeDispatch({
			type: 'MASTERKEY_REMOVE_NOT_LOADED',
			ids: loadedMasterKeyIds,
		});

		// Schedule a sync operation so that items that need to be encrypted
		// are sent to sync target.
		void reg.scheduleSync(null, null, true);
	}

	if (
		action.type === 'AUTODETECT_THEME'
		|| action.type === 'SETTING_UPDATE_ALL'
		|| (action.type === 'SETTING_UPDATE_ONE' && ['themeAutoDetect', 'preferredLightTheme', 'preferredDarkTheme'].includes(action.key))
	) {
		autodetectTheme();
	}

	if (action.type === 'NAV_GO' && action.routeName === 'Notes') {
		if ('selectedFolderId' in newState) {
			Setting.setValue('activeFolderId', newState.selectedFolderId);
		}

		const notesParent: NotesParent = {
			type: action.smartFilterId ? 'SmartFilter' : 'Folder',
			selectedItemId: action.smartFilterId ? action.smartFilterId : newState.selectedFolderId,
		};
		Setting.setValue('notesParent', serializeNotesParent(notesParent));
	}

	if (action.type === 'SYNC_GOT_ENCRYPTED_ITEM') {
		void DecryptionWorker.instance().scheduleStart();
	}

	if (action.type === 'SYNC_CREATED_OR_UPDATED_RESOURCE') {
		void ResourceFetcher.instance().autoAddResources();
	}

	if (doRefreshFolders) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		await scheduleRefreshFolders((action: any) => storeDispatch(action), newState.selectedFolderId);
	}

	return result;
};

const store = createStore(appReducer, applyMiddleware(generalMiddleware));
storeDispatch = store.dispatch;

async function initialize(dispatch: Dispatch) {
	setDispatch(dispatch);

	const startupTasks = buildStartupTasks(dispatch, store);

	for (const [name, task] of startupTasks) {
		await perfLogger.track(name, async () => {
			try {
				await task();
			} catch (error) {
				logger.error(`Startup failure during task: ${name}`);
				throw error;
			}
		});
	}

	logger.info('Application initialized');
}

interface AppComponentProps {
	dispatch: Dispatch;
	themeId: number;
	biometricsDone: boolean;
	routeName: string;
	selectedFolderId: string;
	appState: string;
	noteSideMenuOptions: SideMenuContentOptions;
	disableSideMenuGestures: boolean;
	historyCanGoBack: boolean;
	showSideMenu: boolean;
	noteSelectionEnabled: boolean;
}

interface AppComponentState {
	sideMenuWidth: number;
	sensorInfo: SensorInfo;
	sideMenuContentOpacity: Animated.Value;
}

class AppComponent extends React.Component<AppComponentProps, AppComponentState> {

	private urlOpenListener_: EmitterSubscription|null = null;
	private appStateChangeListener_: NativeEventSubscription|null = null;
	private themeChangeListener_: NativeEventSubscription|null = null;
	private keyboardShowListener_: EmitterSubscription|null = null;
	private keyboardHideListener_: EmitterSubscription|null = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private dropdownAlert_ = (_data: any) => new Promise<any>(res => res);
	private callbackUrl: string|null = null;

	private lastSyncStarted_ = false;
	private quickActionShortcutListener_: EmitterSubscription|undefined;
	private unsubscribeScreenWidthChangeHandler_: EmitterSubscription|undefined;
	private unsubscribeNetInfoHandler_: NetInfoSubscription|undefined;
	private unsubscribeNewShareListener_: UnsubscribeShareListener|undefined;
	private onAppStateChange_: ()=> void;
	private backButtonHandler_: BackButtonHandler;
	private handleNewShare_: ()=> void;
	private handleOpenURL_: (event: unknown)=> void;

	public constructor(props: AppComponentProps) {
		super(props);

		this.state = {
			sideMenuContentOpacity: new Animated.Value(0),
			sideMenuWidth: this.getSideMenuWidth(),
			sensorInfo: null,
		};

		this.lastSyncStarted_ = defaultState.syncStarted;

		this.backButtonHandler_ = () => {
			return this.backButtonHandler();
		};

		this.onAppStateChange_ = () => {
			PoorManIntervals.update();
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		this.handleOpenURL_ = (event: any) => {
			// logger.info('Sharing: handleOpenURL_: start');

			// If this is called while biometrics haven't been done yet, we can
			// ignore the call, because handleShareData() will be called once
			// biometricsDone is `true`.
			if (event.url === ShareExtension.shareURL && this.props.biometricsDone) {
				logger.info('Sharing: handleOpenURL_: Processing share data');
				void this.handleShareData();
			} else if (isCallbackUrl(event.url)) {
				logger.info('received callback url: ', event.url);
				this.callbackUrl = event.url;
				if (this.props.biometricsDone) {
					void this.handleCallbackUrl();
				}
			}
		};

		this.handleNewShare_ = () => {
			// logger.info('Sharing: handleNewShare_: start');

			// look at this.handleOpenURL_ comment
			if (this.props.biometricsDone) {
				logger.info('Sharing: handleNewShare_: Processing share data');
				void this.handleShareData();
			}
		};

		this.unsubscribeNewShareListener_ = ShareExtension.addShareListener(this.handleNewShare_);

		this.handleScreenWidthChange_ = this.handleScreenWidthChange_.bind(this);
	}

	// 2020-10-08: It seems the initialisation code is quite fragile in general and should be kept simple.
	// For example, adding a loading screen as was done in this commit: https://github.com/laurent22/joplin/commit/569355a3182bc12e50a54249882e3d68a72c2b28.
	// had for effect that sharing with the app would create multiple instances of the app, thus breaking
	// database access and so on. It's unclear why it happens and how to fix it but reverting that commit
	// fixed the issue for now.
	//
	// Changing app launch mode doesn't help.
	//
	// It's possible that it's a bug in React Native, or perhaps the framework expects that the whole app can be
	// mounted/unmounted or multiple ones can be running at the same time, but the app was not designed in this
	// way.
	//
	// More reports and info about the multiple instance bug:
	//
	// https://github.com/laurent22/joplin/issues/3800
	// https://github.com/laurent22/joplin/issues/3804
	// https://github.com/laurent22/joplin/issues/3807
	// https://discourse.joplinapp.org/t/webdav-config-encryption-config-randomly-lost-on-android/11364
	// https://discourse.joplinapp.org/t/android-keeps-on-resetting-my-sync-and-theme/11443
	public async componentDidMount() {
		if (this.props.appState === 'starting') {
			this.props.dispatch({
				type: 'APP_STATE_SET',
				state: 'initializing',
			});

			try {
				NetInfo.configure({
					reachabilityUrl: 'https://joplinapp.org/connection_check/',
					reachabilityTest: async (response) => response.status === 200,
				});

				// This will be called right after adding the event listener
				// so there's no need to check netinfo on startup
				this.unsubscribeNetInfoHandler_ = NetInfo.addEventListener(({ type, details }) => {
					const isMobile = details?.isConnectionExpensive || type === 'cellular';
					reg.setIsOnMobileData(isMobile);
					this.props.dispatch({
						type: 'MOBILE_DATA_WARNING_UPDATE',
						isOnMobileData: isMobile,
					});
				});
			} catch (error) {
				reg.logger().warn('Something went wrong while checking network info');
				reg.logger().info(error);
			}

			try {
				await perfLogger.track('root/initialize', () => initialize(this.props.dispatch));
			} catch (error) {
				alert(`Something went wrong while starting the application: ${error}`);
				this.props.dispatch({
					type: 'APP_STATE_SET',
					state: 'error',
				});
				throw error;
			}

			// https://reactnative.dev/docs/linking#handling-deep-links
			//
			// The handler added with Linking.addEventListener() is only triggered when app is already open.
			//
			// When the app is not already open and the deep link triggered app launch,
			// the URL can be obtained with Linking.getInitialURL().
			//
			// We only save the URL here since we want to show the content only
			// after biometrics check is passed or known disabled.
			const url = await Linking.getInitialURL();
			if (url && isCallbackUrl(url)) {
				logger.info('received initial callback url: ', url);
				this.callbackUrl = url;
			}

			const loadedSensorInfo = await sensorInfo();
			this.setState({ sensorInfo: loadedSensorInfo });

			// If biometrics is disabled we set biometricsDone to `true`. We do
			// it with a delay so that the component is properly mounted, and
			// the componentDidUpdate gets triggered (which in turns will handle
			// the share data, if any).
			setTimeout(() => {
				if (!biometricsEnabled(loadedSensorInfo)) {
					this.props.dispatch({
						type: 'BIOMETRICS_DONE_SET',
						value: true,
					});
				}
			}, 100);

			this.props.dispatch({
				type: 'APP_STATE_SET',
				state: 'ready',
			});

			// setTimeout(() => {
			// 	this.props.dispatch({
			// 		type: 'NAV_GO',
			// 		routeName: 'ProfileSwitcher',
			// 	});
			// }, 1000);
		}

		this.urlOpenListener_ = Linking.addEventListener('url', this.handleOpenURL_);

		BackButtonService.initialize(this.backButtonHandler_);

		AlarmService.setInAppNotificationHandler(async (alarmId: string) => {
			const alarm = await Alarm.load(alarmId);
			const notification = await Alarm.makeNotification(alarm);
			void this.dropdownAlert_({
				type: 'info',
				title: notification.title,
				message: notification.body ? notification.body : '',
			});
		});

		this.appStateChangeListener_ = RNAppState.addEventListener('change', this.onAppStateChange_);
		this.unsubscribeScreenWidthChangeHandler_ = Dimensions.addEventListener('change', this.handleScreenWidthChange_);

		this.themeChangeListener_ = Appearance.addChangeListener(
			({ colorScheme }) => onSystemColorSchemeChange(colorScheme),
		);
		onSystemColorSchemeChange(Appearance.getColorScheme());

		this.quickActionShortcutListener_ = await perfLogger.track('root/setupQuickActions',
			() => setupQuickActions(this.props.dispatch),
		);

		await perfLogger.track('root/setupNotifications',
			() => setupNotifications(this.props.dispatch),
		);

		this.keyboardShowListener_ = Keyboard.addListener('keyboardDidShow', () => {
			this.props.dispatch({
				type: 'KEYBOARD_VISIBLE_CHANGE',
				visible: true,
			});
		});
		this.keyboardHideListener_ = Keyboard.addListener('keyboardDidHide', () => {
			this.props.dispatch({
				type: 'KEYBOARD_VISIBLE_CHANGE',
				visible: false,
			});
		});

		// Setting.setValue('encryption.masterPassword', 'WRONG');
		// setTimeout(() => NavService.go('EncryptionConfig'), 2000);
	}

	public componentWillUnmount() {
		if (this.appStateChangeListener_) {
			this.appStateChangeListener_.remove();
			this.appStateChangeListener_ = null;
		}

		if (this.urlOpenListener_) {
			this.urlOpenListener_.remove();
			this.urlOpenListener_ = null;
		}

		if (this.themeChangeListener_) {
			this.themeChangeListener_.remove();
			this.themeChangeListener_ = null;
		}

		if (this.unsubscribeScreenWidthChangeHandler_) {
			this.unsubscribeScreenWidthChangeHandler_.remove();
			this.unsubscribeScreenWidthChangeHandler_ = null;
		}

		if (this.unsubscribeNetInfoHandler_) this.unsubscribeNetInfoHandler_();

		if (this.unsubscribeNewShareListener_) {
			this.unsubscribeNewShareListener_();
			this.unsubscribeNewShareListener_ = undefined;
		}

		if (this.quickActionShortcutListener_) {
			this.quickActionShortcutListener_.remove();
			this.quickActionShortcutListener_ = undefined;
		}

		if (this.keyboardShowListener_) {
			this.keyboardShowListener_.remove();
			this.keyboardShowListener_ = undefined;
		}
		if (this.keyboardHideListener_) {
			this.keyboardHideListener_.remove();
			this.keyboardHideListener_ = undefined;
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async componentDidUpdate(prevProps: any) {
		if (this.props.biometricsDone !== prevProps.biometricsDone && this.props.biometricsDone) {
			logger.info('Sharing: componentDidUpdate: biometricsDone');
			void this.handleShareData();
			void this.handleCallbackUrl();
		}
	}

	private async backButtonHandler() {
		if (this.props.noteSelectionEnabled) {
			this.props.dispatch({ type: 'NOTE_SELECTION_END' });
			return true;
		}

		if (this.props.showSideMenu) {
			this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
			return true;
		}

		if (this.props.historyCanGoBack) {
			this.props.dispatch({ type: 'NAV_BACK' });
			return true;
		}

		BackHandler.exitApp();

		return false;
	}

	private async handleShareData() {
		const sharedData = await ShareExtension.data();

		if (sharedData) {
			reg.logger().info('Received shared data');

			// selectedFolderId can be null if no screens other than "All notes"
			// have been opened.
			const targetFolder = this.props.selectedFolderId ?? (await Folder.defaultFolder())?.id;
			if (targetFolder) {
				logger.info('Sharing: handleShareData: Processing...');
				await handleShared(sharedData, targetFolder, this.props.dispatch);
			} else {
				reg.logger().info('Cannot handle share - default folder id is not set');
			}
		} else {
			logger.info('Sharing: received empty share data.');
		}
	}

	private async handleCallbackUrl() {
		const url = this.callbackUrl;
		this.callbackUrl = null;
		if (url === null) {
			return;
		}

		const { command, params } = parseCallbackUrl(url);

		// adopted from app-mobile/utils/shareHandler.ts
		// We go back one screen in case there's already a note open -
		// if we don't do this, the dispatch below will do nothing
		// (because routeName wouldn't change)
		this.props.dispatch({ type: 'NAV_BACK' });
		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		switch (command) {

		case CallbackUrlCommand.OpenNote:
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Note',
				noteId: params.id,
			});
			break;

		case CallbackUrlCommand.OpenTag:
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Notes',
				tagId: params.id,
			});
			break;

		case CallbackUrlCommand.OpenFolder:
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Notes',
				folderId: params.id,
			});
			break;
		}
	}

	private async handleScreenWidthChange_() {
		this.setState({ sideMenuWidth: this.getSideMenuWidth() });
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public UNSAFE_componentWillReceiveProps(newProps: any) {
		if (newProps.syncStarted !== this.lastSyncStarted_) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			if (!newProps.syncStarted) void refreshFolders((action: any) => this.props.dispatch(action), this.props.selectedFolderId);
			this.lastSyncStarted_ = newProps.syncStarted;
		}
	}

	private sideMenu_change = (isOpen: boolean) => {
		// Make sure showSideMenu property of state is updated
		// when the menu is open/closed.
		// Avoid dispatching unnecessarily. See https://github.com/laurent22/joplin/issues/12427
		if (isOpen !== this.props.showSideMenu) {
			this.props.dispatch({
				type: isOpen ? 'SIDE_MENU_OPEN' : 'SIDE_MENU_CLOSE',
			});
		}
	};

	private getSideMenuWidth = () => {
		const sideMenuWidth = getResponsiveValue({
			sm: 250,
			md: 260,
			lg: 270,
			xl: 280,
			xxl: 290,
		});

		return sideMenuWidth;
	};

	public render() {
		if (this.props.appState !== 'ready') {
			if (this.props.appState === 'error') {
				return <Text>Startup error.</Text>;
			}

			// Loading can take a particularly long time for the first time on web -- show progress.
			if (Platform.OS === 'web') {
				return <View style={{ marginLeft: 'auto', marginRight: 'auto', paddingTop: 20 }}>
					<ActivityIndicator accessibilityLabel={_('Loading...')} />
				</View>;
			} else {
				return null;
			}
		}
		const theme: Theme = themeStyle(this.props.themeId);

		let sideMenuContent: ReactNode = null;
		let menuPosition = SideMenuPosition.Left;
		let disableSideMenuGestures = this.props.disableSideMenuGestures;

		if (this.props.routeName === 'Note') {
			sideMenuContent = <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundColor }}><SideMenuContentNote options={this.props.noteSideMenuOptions}/></SafeAreaView>;
			menuPosition = SideMenuPosition.Right;
		} else if (this.props.routeName === 'Config') {
			disableSideMenuGestures = true;
		} else {
			sideMenuContent = <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundColor }}><SideMenuContent/></SafeAreaView>;
		}

		const appNavInit = {
			Notes: { screen: NotesScreen },
			Note: { screen: NoteScreen },
			Tags: { screen: TagsScreen },
			Folder: { screen: FolderScreen },
			OneDriveLogin: { screen: OneDriveLoginScreen },
			DropboxLogin: { screen: DropboxLoginScreen },
			JoplinCloudLogin: { screen: JoplinCloudLoginScreen },
			JoplinServerSamlLogin: { screen: SsoLoginScreen(new SamlShared()) },
			EncryptionConfig: { screen: EncryptionConfigScreen },
			UpgradeSyncTarget: { screen: UpgradeSyncTargetScreen },
			ShareManager: { screen: ShareManager },
			ProfileSwitcher: { screen: ProfileSwitcher },
			ProfileEditor: { screen: ProfileEditor },
			NoteRevisionViewer: { screen: NoteRevisionViewer },
			Log: { screen: LogScreen },
			Status: { screen: StatusScreen },
			Search: { screen: SearchScreen },
			Config: { screen: ConfigScreen },
			DocumentScanner: { screen: DocumentScanner },
		};


		// const statusBarStyle = theme.appearance === 'light-content';
		const statusBarStyle = 'light-content';

		const shouldShowMainContent = !biometricsEnabled(this.state.sensorInfo) || this.props.biometricsDone;

		logger.info('root.biometrics: biometricsDone', this.props.biometricsDone);
		logger.info('root.biometrics: biometricsEnabled', biometricsEnabled(this.state.sensorInfo));
		logger.info('root.biometrics: shouldShowMainContent', shouldShowMainContent);
		logger.info('root.biometrics: this.state.sensorInfo', this.state.sensorInfo);

		// The right sidemenu can be difficult to close due to a bug in the sidemenu
		// library (right sidemenus can't be swiped closed).
		//
		// Additionally, it can interfere with scrolling in the note viewer, so we use
		// a smaller edge hit width.
		const menuEdgeHitWidth = menuPosition === 'right' ? 20 : 30;

		const mainContent = (
			<View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
				<SideMenu
					menu={sideMenuContent}
					edgeHitWidth={menuEdgeHitWidth}
					toleranceX={4}
					toleranceY={20}
					openMenuOffset={this.state.sideMenuWidth}
					menuPosition={menuPosition}
					onChange={this.sideMenu_change}
					isOpen={this.props.showSideMenu}
					disableGestures={disableSideMenuGestures}
				>
					<View style={{ flexGrow: 1, flexShrink: 1, flexBasis: '100%' }}>
						<SafeAreaView style={{ flex: 1 }} titleBarUnderlayColor={theme.backgroundColor2}>
							<View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
								{ shouldShowMainContent && <AppNav screens={appNavInit} dispatch={this.props.dispatch} /> }
							</View>
							{/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied */}
							<DropdownAlert alert={(func: any) => (this.dropdownAlert_ = func)} />
							<SyncWizard/>
						</SafeAreaView>
					</View>
				</SideMenu>
				<PluginRunnerWebView />
				<PluginNotification/>
			</View>
		);


		const paperTheme = theme.appearance === ThemeAppearance.Dark ? MD3DarkTheme : MD3LightTheme;

		// Wrap everything in a PaperProvider -- this allows using components from react-native-paper
		return (
			<FocusControl.Provider>
				<MenuProvider
					style={{ flex: 1 }}
					closeButtonLabel={_('Dismiss')}
				>
					<PaperProvider theme={{
						...paperTheme,
						version: 3,
						colors: {
							...paperTheme.colors,
							onPrimaryContainer: theme.color5,
							primaryContainer: theme.backgroundColor5,

							outline: theme.codeBorderColor,

							primary: theme.color4,
							onPrimary: theme.backgroundColor4,

							background: theme.backgroundColor,

							surface: theme.backgroundColor,
							onSurface: theme.color,

							secondaryContainer: theme.raisedBackgroundColor,
							onSecondaryContainer: theme.raisedColor,

							surfaceVariant: theme.backgroundColor3,
							onSurfaceVariant: theme.color3,

							elevation: {
								level0: 'transparent',
								level1: theme.oddBackgroundColor,
								level2: theme.raisedBackgroundColor,
								level3: theme.raisedBackgroundColor,
								level4: theme.raisedBackgroundColor,
								level5: theme.raisedBackgroundColor,
							},
						},
					}}>
						<DialogManager themeId={this.props.themeId}>
							<StatusBar barStyle={statusBarStyle} />
							<SafeAreaProvider>
								<FocusControl.MainAppContent style={{ flex: 1 }}>
									{shouldShowMainContent ? mainContent : (
										<SafeAreaView>
											<BiometricPopup
												dispatch={this.props.dispatch}
												themeId={this.props.themeId}
												sensorInfo={this.state.sensorInfo}
											/>
										</SafeAreaView>
									)}
								</FocusControl.MainAppContent>
							</SafeAreaProvider>
						</DialogManager>
					</PaperProvider>
				</MenuProvider>
			</FocusControl.Provider>
		);
	}
}

const mapStateToProps = (state: AppState) => {
	return {
		historyCanGoBack: state.historyCanGoBack,
		showSideMenu: state.showSideMenu,
		syncStarted: state.syncStarted,
		appState: state.appState,
		noteSelectionEnabled: state.noteSelectionEnabled,
		selectedFolderId: state.selectedFolderId,
		routeName: state.route.routeName,
		themeId: state.settings.theme,
		noteSideMenuOptions: state.noteSideMenuOptions,
		disableSideMenuGestures: state.disableSideMenuGestures,
		biometricsDone: state.biometricsDone,
		biometricsEnabled: state.settings['security.biometricsEnabled'],
	};
};

const App = connect(mapStateToProps)(AppComponent);

export default class Root extends React.Component {
	public render() {
		return (
			<Provider store={store}>
				<App/>
			</Provider>
		);
	}
}
