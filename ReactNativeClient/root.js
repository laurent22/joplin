const React = require('react'); const Component = React.Component;
const { Keyboard, NativeModules } = require('react-native');
const { connect, Provider } = require('react-redux');
const { BackButtonService } = require('lib/services/back-button.js');
const { createStore, applyMiddleware } = require('redux');
const { shimInit } = require('lib/shim-init-react.js');
const { Log } = require('lib/log.js');
const { AppNav } = require('lib/components/app-nav.js');
const { Logger } = require('lib/logger.js');
const { Note } = require('lib/models/note.js');
const { Folder } = require('lib/models/folder.js');
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const { Resource } = require('lib/models/resource.js');
const { Tag } = require('lib/models/tag.js');
const { NoteTag } = require('lib/models/note-tag.js');
const { BaseItem } = require('lib/models/base-item.js');
const { BaseModel } = require('lib/base-model.js');
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
const { Setting } = require('lib/models/setting.js');
const { MenuContext } = require('react-native-popup-menu');
const { SideMenu } = require('lib/components/side-menu.js');
const { SideMenuContent } = require('lib/components/side-menu-content.js');
const { DatabaseDriverReactNative } = require('lib/database-driver-react-native');
const { reg } = require('lib/registry.js');
const { _, setLocale, closestSupportedLocale, defaultLocale } = require('lib/locale.js');
const RNFetchBlob = require('react-native-fetch-blob').default;
const { PoorManIntervals } = require('lib/poor-man-intervals.js');
const { reducer, defaultState } = require('lib/reducer.js');

const generalMiddleware = store => next => async (action) => {
	if (action.type !== 'SIDE_MENU_OPEN_PERCENT') reg.logger().info('Reducer action', action.type);
	PoorManIntervals.update(); // This function needs to be called regularly so put it here

	const result = next(action);
	const newState = store.getState();

	if (action.type == 'NAV_GO') Keyboard.dismiss();

	if (['NOTES_UPDATE_ONE', 'NOTES_DELETE', 'FOLDERS_UPDATE_ONE', 'FOLDER_DELETE'].indexOf(action.type) >= 0) {
		if (!await reg.syncStarted()) reg.scheduleSync();
	}

	if (action.type == 'SETTINGS_UPDATE_ONE' && action.key == 'sync.interval' || action.type == 'SETTINGS_UPDATE_ALL') {
		reg.setupRecurrentSync();
	}

	if (action.type == 'NAV_GO' && action.routeName == 'Notes') {
		Setting.setValue('activeFolderId', newState.selectedFolderId);
	}

  	return result;
}

let store = createStore(reducer, applyMiddleware(generalMiddleware));

async function initialize(dispatch, backButtonHandler) {
	shimInit();

	Setting.setConstant('env', __DEV__ ? 'dev' : 'prod');
	Setting.setConstant('appId', 'net.cozic.joplin');
	Setting.setConstant('appType', 'mobile');
	Setting.setConstant('resourceDir', RNFetchBlob.fs.dirs.DocumentDir);

	const logDatabase = new Database(new DatabaseDriverReactNative());
	await logDatabase.open({ name: 'log.sqlite' });
	await logDatabase.exec(Logger.databaseCreateTableSql());

	const mainLogger = new Logger();
	mainLogger.addTarget('database', { database: logDatabase, source: 'm' });
	if (Setting.value('env') == 'dev') mainLogger.addTarget('console');
	mainLogger.setLevel(Logger.LEVEL_DEBUG);

	reg.setLogger(mainLogger);

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
	BaseModel.db_ = db;

	BaseItem.loadClass('Note', Note);
	BaseItem.loadClass('Folder', Folder);
	BaseItem.loadClass('Resource', Resource);
	BaseItem.loadClass('Tag', Tag);
	BaseItem.loadClass('NoteTag', NoteTag);

	try {
		if (Setting.value('env') == 'prod') {
			await db.open({ name: 'joplin.sqlite' })
		} else {
			await db.open({ name: 'joplin-66.sqlite' })
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
			const locale = NativeModules.I18nManager.localeIdentifier
			if (!locale) locale = defaultLocale();
			Setting.setValue('locale', closestSupportedLocale(locale));
			Setting.setValue('firstStart', 0)
		}

		setLocale(Setting.value('locale'));

		reg.logger().info('Loading folders...');

		await FoldersScreenUtils.refreshFolders();

		const tags = await Tag.all();

		dispatch({
			type: 'TAGS_UPDATE_ALL',
			tags: tags,
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

	BackButtonService.initialize(backButtonHandler);

	reg.setupRecurrentSync();

	if (Setting.value('env') == 'dev') {
		// reg.scheduleSync();
	} else {
		reg.scheduleSync();
	}

	reg.logger().info('Application initialized');
}

class AppComponent extends React.Component {

	constructor() {
		super();
		this.lastSyncStarted_ = defaultState.syncStarted;
	}

	async componentDidMount() {
		if (this.props.appState == 'starting') {
			this.props.dispatch({
				type: 'SET_APP_STATE',
				state: 'initializing',
			});

			await initialize(this.props.dispatch, this.backButtonHandler.bind(this));

			this.props.dispatch({
				type: 'SET_APP_STATE',
				state: 'ready',
			});
		}
	}

	async backButtonHandler() {
		if (this.props.showSideMenu) {
			this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
			return true;
		}

		if (this.props.historyCanGoBack) {
			this.props.dispatch({ type: 'NAV_BACK' });
			return true;
		}

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

		const sideMenuContent = <SideMenuContent/>;

		const appNavInit = {
			Welcome: { screen: WelcomeScreen },
			Notes: { screen: NotesScreen },
			Note: { screen: NoteScreen },
			Folder: { screen: FolderScreen },
			OneDriveLogin: { screen: OneDriveLoginScreen },
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
					<AppNav screens={appNavInit} />
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