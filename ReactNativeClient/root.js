const React = require('react'); const Component = React.Component;
const { AppState, Keyboard, NativeModules, BackHandler } = require('react-native');
const { SafeAreaView } = require('react-navigation');
const { connect, Provider } = require('react-redux');
const { BackButtonService } = require('lib/services/back-button.js');
const NavService = require('lib/services/NavService.js');
const AlarmService = require('lib/services/AlarmService.js');
const AlarmServiceDriver = require('lib/services/AlarmServiceDriver');
const Alarm = require('lib/models/Alarm');
const { createStore, applyMiddleware } = require('redux');
const { shimInit } = require('lib/shim-init-react.js');
const { Log } = require('lib/log.js');
const { time } = require('lib/time-utils.js');
const { AppNav } = require('lib/components/app-nav.js');
const { Logger } = require('lib/logger.js');
const Note = require('lib/models/Note.js');
const Folder = require('lib/models/Folder.js');
const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const Resource = require('lib/models/Resource.js');
const Tag = require('lib/models/Tag.js');
const NoteTag = require('lib/models/NoteTag.js');
const BaseItem = require('lib/models/BaseItem.js');
const MasterKey = require('lib/models/MasterKey.js');
const BaseModel = require('lib/BaseModel.js');
const { JoplinDatabase } = require('lib/joplin-database.js');
const { Database } = require('lib/database.js');
const { NotesScreen } = require('lib/components/screens/notes.js');
const { NoteScreen } = require('lib/components/screens/note.js');
const { ConfigScreen } = require('lib/components/screens/config.js');
const { FolderScreen } = require('lib/components/screens/folder.js');
const { LogScreen } = require('lib/components/screens/log.js');
const { StatusScreen } = require('lib/components/screens/status.js');
const { WelcomeScreen } = require('lib/components/screens/welcome.js');
const { SearchScreen } = require('lib/components/screens/search.js');
const { OneDriveLoginScreen } = require('lib/components/screens/onedrive-login.js');
const { EncryptionConfigScreen } = require('lib/components/screens/encryption-config.js');
const Setting = require('lib/models/Setting.js');
const { MenuContext } = require('react-native-popup-menu');
const { SideMenu } = require('lib/components/side-menu.js');
const { SideMenuContent } = require('lib/components/side-menu-content.js');
const { DatabaseDriverReactNative } = require('lib/database-driver-react-native');
const { reg } = require('lib/registry.js');
const { _, setLocale, closestSupportedLocale, defaultLocale } = require('lib/locale.js');
const RNFetchBlob = require('react-native-fetch-blob').default;
const { PoorManIntervals } = require('lib/poor-man-intervals.js');
const { reducer, defaultState } = require('lib/reducer.js');
const { FileApiDriverLocal } = require('lib/file-api-driver-local.js');
const DropdownAlert = require('react-native-dropdownalert').default;

const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');
const SyncTargetOneDrive = require('lib/SyncTargetOneDrive.js');
const SyncTargetFilesystem = require('lib/SyncTargetFilesystem.js');
const SyncTargetOneDriveDev = require('lib/SyncTargetOneDriveDev.js');
const SyncTargetNextcloud = require('lib/SyncTargetNextcloud.js');
const SyncTargetWebDAV = require('lib/SyncTargetWebDAV.js');
SyncTargetRegistry.addClass(SyncTargetOneDrive);
SyncTargetRegistry.addClass(SyncTargetOneDriveDev);
SyncTargetRegistry.addClass(SyncTargetNextcloud);
SyncTargetRegistry.addClass(SyncTargetWebDAV);

// Disabled because not fully working
//SyncTargetRegistry.addClass(SyncTargetFilesystem);

const FsDriverRN = require('lib/fs-driver-rn.js').FsDriverRN;
const DecryptionWorker = require('lib/services/DecryptionWorker');
const EncryptionService = require('lib/services/EncryptionService');

let storeDispatch = function(action) {};

const generalMiddleware = store => next => async (action) => {
	if (['SIDE_MENU_OPEN_PERCENT', 'SYNC_REPORT_UPDATE'].indexOf(action.type) < 0) reg.logger().info('Reducer action', action.type);
	PoorManIntervals.update(); // This function needs to be called regularly so put it here

	const result = next(action);
	const newState = store.getState();

	if (action.type == 'NAV_GO') Keyboard.dismiss();

	if (['NOTE_UPDATE_ONE', 'NOTE_DELETE', 'FOLDER_UPDATE_ONE', 'FOLDER_DELETE'].indexOf(action.type) >= 0) {
		if (!await reg.syncTarget().syncStarted()) reg.scheduleSync();
	}

	if (['EVENT_NOTE_ALARM_FIELD_CHANGE', 'NOTE_DELETE'].indexOf(action.type) >= 0) {
		await AlarmService.updateNoteNotification(action.id, action.type === 'NOTE_DELETE');
	}

	if (action.type == 'SETTING_UPDATE_ONE' && action.key == 'sync.interval' || action.type == 'SETTING_UPDATE_ALL') {
		reg.setupRecurrentSync();
	}

	if ((action.type == 'SETTING_UPDATE_ONE' && (action.key == 'dateFormat' || action.key == 'timeFormat')) || (action.type == 'SETTING_UPDATE_ALL')) {
		time.setDateFormat(Setting.value('dateFormat'));
		time.setTimeFormat(Setting.value('timeFormat'));
	}

	if (action.type == 'SETTING_UPDATE_ONE' && action.key == 'locale' || action.type == 'SETTING_UPDATE_ALL') {
		setLocale(Setting.value('locale'));
	}

	if ((action.type == 'SETTING_UPDATE_ONE' && (action.key.indexOf('encryption.') === 0)) || (action.type == 'SETTING_UPDATE_ALL')) {
		await EncryptionService.instance().loadMasterKeysFromSettings();
		DecryptionWorker.instance().scheduleStart();
		const loadedMasterKeyIds = EncryptionService.instance().loadedMasterKeyIds();

		storeDispatch({
			type: 'MASTERKEY_REMOVE_NOT_LOADED',
			ids: loadedMasterKeyIds,
		});

		// Schedule a sync operation so that items that need to be encrypted
		// are sent to sync target.
		reg.scheduleSync();
	}

	if (action.type == 'NAV_GO' && action.routeName == 'Notes') {
		Setting.setValue('activeFolderId', newState.selectedFolderId);
	}

	if (action.type === 'SYNC_GOT_ENCRYPTED_ITEM') {
		DecryptionWorker.instance().scheduleStart();
	}

  	return result;
}

let navHistory = [];

function historyCanGoBackTo(route) {
	if (route.routeName == 'Note') return false;
	if (route.routeName == 'Folder') return false;

	return true;
}

const appDefaultState = Object.assign({}, defaultState, {
	sideMenuOpenPercent: 0,
	route: {
		type: 'NAV_GO',
		routeName: 'Welcome',
		params: {},
	},
	noteSelectionEnabled: false,
});

const appReducer = (state = appDefaultState, action) => {
	let newState = state;
	let historyGoingBack = false;

	try {
		switch (action.type) {

			case 'NAV_BACK':

				if (!navHistory.length) break;

				let newAction = null;
				while (navHistory.length) {
					newAction = navHistory.pop();
					if (newAction.routeName != state.route.routeName) break;
				}

				action = newAction ? newAction : navHistory.pop();

				historyGoingBack = true;

				// Fall throught

			case 'NAV_GO':

				const currentRoute = state.route;
				const currentRouteName = currentRoute ? currentRoute.routeName : '';

				if (!historyGoingBack && historyCanGoBackTo(currentRoute)) {
					// If the route *name* is the same (even if the other parameters are different), we
					// overwrite the last route in the history with the current one. If the route name
					// is different, we push a new history entry.
					if (currentRoute.routeName == action.routeName) {
						// nothing
					} else {
						navHistory.push(currentRoute);
					}
				}

				// HACK: whenever a new screen is loaded, all the previous screens of that type
				// are overwritten with the new screen parameters. This is because the way notes
				// are currently loaded is not optimal (doesn't retain history properly) so
				// this is a simple fix without doing a big refactoring to change the way notes
				// are loaded. Might be good enough since going back to different folders
				// is probably not a common workflow.
				for (let i = 0; i < navHistory.length; i++) {
					let n = navHistory[i];
					if (n.routeName == action.routeName) {
						navHistory[i] = Object.assign({}, action);
					}
				}

				if (action.routeName == 'Welcome') navHistory = [];

				//reg.logger().info('Route: ' + currentRouteName + ' => ' + action.routeName);

				newState = Object.assign({}, state);

				if ('noteId' in action) {
					newState.selectedNoteIds = action.noteId ? [action.noteId] : [];
				}

				if ('folderId' in action) {
					newState.selectedFolderId = action.folderId;
					newState.notesParentType = 'Folder';
				}

				if ('tagId' in action) {
					newState.selectedTagId = action.tagId;
					newState.notesParentType = 'Tag';
				}

				if ('itemType' in action) {
					newState.selectedItemType = action.itemType;
				}

				newState.route = action;
				newState.historyCanGoBack = !!navHistory.length;
				break;

			case 'SIDE_MENU_TOGGLE':

				newState = Object.assign({}, state);
				newState.showSideMenu = !newState.showSideMenu
				break;

			case 'SIDE_MENU_OPEN':

				newState = Object.assign({}, state);
				newState.showSideMenu = true
				break;

			case 'SIDE_MENU_CLOSE':

				newState = Object.assign({}, state);
				newState.showSideMenu = false
				break;

			case 'SIDE_MENU_OPEN_PERCENT':

				newState = Object.assign({}, state);
				newState.sideMenuOpenPercent = action.value;
				break;

			case 'NOTE_SELECTION_TOGGLE':

				newState = Object.assign({}, state);

				const noteId = action.id;
				const newSelectedNoteIds = state.selectedNoteIds.slice();
				const existingIndex = state.selectedNoteIds.indexOf(noteId);

				if (existingIndex >= 0) {
					newSelectedNoteIds.splice(existingIndex, 1);
				} else {
					newSelectedNoteIds.push(noteId);
				}

				newState.selectedNoteIds = newSelectedNoteIds;
				newState.noteSelectionEnabled = !!newSelectedNoteIds.length;
				break;

			case 'NOTE_SELECTION_START':

				if (!state.noteSelectionEnabled) {
					newState = Object.assign({}, state);
					newState.noteSelectionEnabled = true;
					newState.selectedNoteIds = [action.id];
				}
				break;

			case 'NOTE_SELECTION_END':

				newState = Object.assign({}, state);
				newState.noteSelectionEnabled = false;
				newState.selectedNoteIds = [];
				break;


		}
	} catch (error) {
		error.message = 'In reducer: ' + error.message + ' Action: ' + JSON.stringify(action);
		throw error;
	}

	return reducer(newState, action);
}

let store = createStore(appReducer, applyMiddleware(generalMiddleware));
storeDispatch = store.dispatch;

async function initialize(dispatch) {
	shimInit();

	Setting.setConstant('env', __DEV__ ? 'dev' : 'prod');
	Setting.setConstant('appId', 'net.cozic.joplin-mobile');
	Setting.setConstant('appType', 'mobile');
	//Setting.setConstant('resourceDir', () => { return RNFetchBlob.fs.dirs.DocumentDir; });
	Setting.setConstant('resourceDir', RNFetchBlob.fs.dirs.DocumentDir);

	const logDatabase = new Database(new DatabaseDriverReactNative());
	await logDatabase.open({ name: 'log.sqlite' });
	await logDatabase.exec(Logger.databaseCreateTableSql());

	const mainLogger = new Logger();
	mainLogger.addTarget('database', { database: logDatabase, source: 'm' });
	mainLogger.setLevel(Logger.LEVEL_INFO);
	
	if (Setting.value('env') == 'dev') {
		mainLogger.addTarget('console');
		mainLogger.setLevel(Logger.LEVEL_DEBUG);
	}

	reg.setLogger(mainLogger);
	reg.setShowErrorMessageBoxHandler((message) => { alert(message) });

	reg.logger().info('====================================');
	reg.logger().info('Starting application ' + Setting.value('appId') + ' (' + Setting.value('env') + ')');

	const dbLogger = new Logger();
	dbLogger.addTarget('database', { database: logDatabase, source: 'm' }); 
	if (Setting.value('env') == 'dev') {
		dbLogger.addTarget('console');
		dbLogger.setLevel(Logger.LEVEL_INFO); // Set to LEVEL_DEBUG for full SQL queries
	} else {
		dbLogger.setLevel(Logger.LEVEL_INFO);
	}

	let db = new JoplinDatabase(new DatabaseDriverReactNative());
	db.setLogger(dbLogger);
	reg.setDb(db);

	reg.dispatch = dispatch;
	BaseModel.dispatch = dispatch;
	FoldersScreenUtils.dispatch = dispatch;
	BaseSyncTarget.dispatch = dispatch;
	NavService.dispatch = dispatch;
	BaseModel.db_ = db;

	BaseItem.loadClass('Note', Note);
	BaseItem.loadClass('Folder', Folder);
	BaseItem.loadClass('Resource', Resource);
	BaseItem.loadClass('Tag', Tag);
	BaseItem.loadClass('NoteTag', NoteTag);
	BaseItem.loadClass('MasterKey', MasterKey);

	const fsDriver = new FsDriverRN();

	Resource.fsDriver_ = fsDriver;
	FileApiDriverLocal.fsDriver_ = fsDriver;

	AlarmService.setDriver(new AlarmServiceDriver());
	AlarmService.setLogger(mainLogger);

	try {
		if (Setting.value('env') == 'prod') {
			await db.open({ name: 'joplin.sqlite' })
		} else {
			await db.open({ name: 'joplin-68.sqlite' })
			//await db.open({ name: 'joplin-67.sqlite' })

			// await db.exec('DELETE FROM notes');
			// await db.exec('DELETE FROM folders');
			// await db.exec('DELETE FROM tags');
			// await db.exec('DELETE FROM note_tags');
			// await db.exec('DELETE FROM resources');
			// await db.exec('DELETE FROM deleted_items');

			// await db.exec('UPDATE notes SET is_conflict = 1 where id like "546f%"');
		}

		reg.logger().info('Database is ready.');
		reg.logger().info('Loading settings...');
		await Setting.load();

		if (Setting.value('firstStart')) {
			let locale = NativeModules.I18nManager.localeIdentifier
			if (!locale) locale = defaultLocale();
			Setting.setValue('locale', closestSupportedLocale(locale));
			if (Setting.value('env') === 'dev') Setting.setValue('sync.target', SyncTargetRegistry.nameToId('onedrive_dev'));
			Setting.setValue('firstStart', 0)
		}

		reg.logger().info('Sync target: ' + Setting.value('sync.target'));

		setLocale(Setting.value('locale'));

		// ----------------------------------------------------------------
		// E2EE SETUP
		// ----------------------------------------------------------------

		EncryptionService.fsDriver_ = fsDriver;
		EncryptionService.instance().setLogger(mainLogger);
		BaseItem.encryptionService_ = EncryptionService.instance();
		DecryptionWorker.instance().dispatch = dispatch;
		DecryptionWorker.instance().setLogger(mainLogger);
		DecryptionWorker.instance().setEncryptionService(EncryptionService.instance());
		await EncryptionService.instance().loadMasterKeysFromSettings();

		// ----------------------------------------------------------------
		// / E2EE SETUP
		// ----------------------------------------------------------------

		reg.logger().info('Loading folders...');

		await FoldersScreenUtils.refreshFolders();

		const tags = await Tag.all();

		dispatch({
			type: 'TAG_UPDATE_ALL',
			items: tags,
		});

		const masterKeys = await MasterKey.all();

		dispatch({
			type: 'MASTERKEY_UPDATE_ALL',
			items: masterKeys,
		});

		let folderId = Setting.value('activeFolderId');
		let folder = await Folder.load(folderId);

		if (!folder) folder = await Folder.defaultFolder();

		if (!folder) {
			dispatch({
				type: 'NAV_GO',
				routeName: 'Welcome',
			});
		} else {
			dispatch({
				type: 'NAV_GO',
				routeName: 'Notes',
				folderId: folder.id,
			});
		}
	} catch (error) {
		reg.logger().error('Initialization error:', error);
	}

	reg.setupRecurrentSync();

	PoorManIntervals.setTimeout(() => {
		AlarmService.garbageCollect();
	}, 1000 * 60 * 60);

	reg.scheduleSync().then(() => {
		// Wait for the first sync before updating the notifications, since synchronisation
		// might change the notifications.
		AlarmService.updateAllNotifications();

		DecryptionWorker.instance().scheduleStart();
	});

	reg.logger().info('Application initialized');
}

class AppComponent extends React.Component {

	constructor() {
		super();
		this.lastSyncStarted_ = defaultState.syncStarted;

		this.backButtonHandler_ = () => {
			return this.backButtonHandler();
		}

		this.onAppStateChange_ = () => {
			PoorManIntervals.update();
		}
	}

	async componentDidMount() {
		if (this.props.appState == 'starting') {
			this.props.dispatch({
				type: 'APP_STATE_SET',
				state: 'initializing',
			});

			await initialize(this.props.dispatch);

			this.props.dispatch({
				type: 'APP_STATE_SET',
				state: 'ready',
			});
		}

		BackButtonService.initialize(this.backButtonHandler_);

		AlarmService.setInAppNotificationHandler(async (alarmId) => {
			const alarm = await Alarm.load(alarmId);
			const notification = await Alarm.makeNotification(alarm);
			this.dropdownAlert_.alertWithType('info', notification.title, notification.body ? notification.body : '');
		});

		AppState.addEventListener('change', this.onAppStateChange_);
	}

	componentWillUnmount() {
		AppState.removeEventListener('change', this.onAppStateChange_);
	}

	async backButtonHandler() {
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

	componentWillReceiveProps(newProps) {
		if (newProps.syncStarted != this.lastSyncStarted_) {
			if (!newProps.syncStarted) FoldersScreenUtils.refreshFolders();
			this.lastSyncStarted_ = newProps.syncStarted;
		}
	}

	sideMenu_change(isOpen) {
		// Make sure showSideMenu property of state is updated
		// when the menu is open/closed.
		this.props.dispatch({
			type: isOpen ? 'SIDE_MENU_OPEN' : 'SIDE_MENU_CLOSE',
		});
	}

	render() {
		if (this.props.appState != 'ready') return null;

		const sideMenuContent = <SafeAreaView style={{flex:1}}><SideMenuContent/></SafeAreaView>;

		const appNavInit = {
			Welcome: { screen: WelcomeScreen },
			Notes: { screen: NotesScreen },
			Note: { screen: NoteScreen },
			Folder: { screen: FolderScreen },
			OneDriveLogin: { screen: OneDriveLoginScreen },
			EncryptionConfig: { screen: EncryptionConfigScreen },
			Log: { screen: LogScreen },
			Status: { screen: StatusScreen },
			Search: { screen: SearchScreen },
			Config: { screen: ConfigScreen },
		};

		return (
			<SideMenu
				menu={sideMenuContent}
				onChange={(isOpen) => this.sideMenu_change(isOpen)}
				onSliding={(percent) => {
					this.props.dispatch({
						type: 'SIDE_MENU_OPEN_PERCENT',
						value: percent,
					});
				}}
				>
				<MenuContext style={{ flex: 1 }}>
					<SafeAreaView style={{flex:1}}>
						<AppNav screens={appNavInit} />
					</SafeAreaView>
					<DropdownAlert ref={ref => this.dropdownAlert_ = ref} tapToCloseEnabled={true} />
				</MenuContext>
			</SideMenu>
		);
	}
}

const mapStateToProps = (state) => {
	return {
		historyCanGoBack: state.historyCanGoBack,
		showSideMenu: state.showSideMenu,
		syncStarted: state.syncStarted,
		appState: state.appState,
		noteSelectionEnabled: state.noteSelectionEnabled,
	};
};

const App = connect(mapStateToProps)(AppComponent);

class Root extends React.Component {
	render() {
		return (
			<Provider store={store}>
				<App/>
			</Provider>
		);
	}
}

module.exports = { Root };