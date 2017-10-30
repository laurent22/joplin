import React, { Component } from 'react';
import { Keyboard, NativeModules } from 'react-native';
import { connect, Provider } from 'react-redux'
import { BackButtonService } from 'lib/services/back-button.js';
import { createStore, applyMiddleware } from 'redux';
import { shimInit } from 'lib/shim-init-react.js';
import { Log } from 'lib/log.js'
import { AppNav } from 'lib/components/app-nav.js'
import { Logger } from 'lib/logger.js'
import { Note } from 'lib/models/note.js'
import { Folder } from 'lib/models/folder.js'
import { FoldersScreenUtils } from 'lib/folders-screen-utils.js';
import { Resource } from 'lib/models/resource.js'
import { Tag } from 'lib/models/tag.js'
import { NoteTag } from 'lib/models/note-tag.js'
import { BaseItem } from 'lib/models/base-item.js'
import { BaseModel } from 'lib/base-model.js'
import { JoplinDatabase } from 'lib/joplin-database.js'
import { Database } from 'lib/database.js'
import { NotesScreen } from 'lib/components/screens/notes.js'
import { NoteScreen } from 'lib/components/screens/note.js'
import { ConfigScreen } from 'lib/components/screens/config.js'
import { FolderScreen } from 'lib/components/screens/folder.js'
import { LogScreen } from 'lib/components/screens/log.js'
import { StatusScreen } from 'lib/components/screens/status.js'
import { WelcomeScreen } from 'lib/components/screens/welcome.js'
import { SearchScreen } from 'lib/components/screens/search.js'
import { OneDriveLoginScreen } from 'lib/components/screens/onedrive-login.js'
import { Setting } from 'lib/models/setting.js'
import { MenuContext } from 'react-native-popup-menu';
import { SideMenu } from 'lib/components/side-menu.js';
import { SideMenuContent } from 'lib/components/side-menu-content.js';
import { DatabaseDriverReactNative } from 'lib/database-driver-react-native';
import { reg } from 'lib/registry.js';
import { _, setLocale, closestSupportedLocale, defaultLocale } from 'lib/locale.js';
import RNFetchBlob from 'react-native-fetch-blob';
import { PoorManIntervals } from 'lib/poor-man-intervals.js';
import { reducer, defaultState } from 'lib/reducer.js';

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

export { Root };