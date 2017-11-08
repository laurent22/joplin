require('app-module-path').addPath(__dirname);

const { BaseApplication } = require('lib/BaseApplication');
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const { Setting } = require('lib/models/setting.js');
const { BaseModel } = require('lib/base-model.js');
const { _ } = require('lib/locale.js');
const os = require('os');
const fs = require('fs-extra');
const { Logger } = require('lib/logger.js');
const { Tag } = require('lib/models/tag.js');
const { reg } = require('lib/registry.js');
const { sprintf } = require('sprintf-js');
const { JoplinDatabase } = require('lib/joplin-database.js');
const { DatabaseDriverNode } = require('lib/database-driver-node.js');
const { ElectronAppWrapper } = require('./ElectronAppWrapper');
const { defaultState } = require('lib/reducer.js');

const appDefaultState = Object.assign({}, defaultState, {
	route: {
		type: 'NAV_GO',
		routeName: 'Main',
		params: {},
	},
	navHistory: [],
}); 

class Application extends BaseApplication {

	hasGui() {
		return true;
	}

	reducer(state = appDefaultState, action) {
		let newState = state;

		try {
			switch (action.type) {

				case 'NAV_BACK':
				case 'NAV_GO':

					const goingBack = action.type === 'NAV_BACK';

					if (goingBack && !state.navHistory.length) break;

					const currentRoute = state.route;

					newState = Object.assign({}, state);
					let newNavHistory = state.navHistory.slice();

					if (goingBack) {
						let newAction = null;
						while (newNavHistory.length) {
							newAction = newNavHistory.pop();
							if (newAction.routeName !== state.route.routeName) break;
						}

						if (!newAction) break;

						action = newAction;
					}
					
					if (!goingBack) newNavHistory.push(currentRoute);
					newState.navHistory = newNavHistory
					newState.route = action;
					break;

				case 'WINDOW_CONTENT_SIZE_SET':

					newState = Object.assign({}, state);
					newState.windowContentSize = action.size;
					break;

			}
		} catch (error) {
			error.message = 'In reducer: ' + error.message + ' Action: ' + JSON.stringify(action);
			throw error;
		}

		return super.reducer(newState, action);
	}

	async start(argv) {
		argv = await super.start(argv);

		this.initRedux();

		// Since the settings need to be loaded before the store is created, it will never
		// receive the SETTING_UPDATE_ALL even, which mean state.settings will not be
		// initialised. So we manually call dispatchUpdateAll() to force an update.
		Setting.dispatchUpdateAll();

		await FoldersScreenUtils.refreshFolders();

		const tags = await Tag.allWithNotes();

		this.dispatch({
			type: 'TAG_UPDATE_ALL',
			tags: tags,
		});

		this.store().dispatch({
			type: 'FOLDER_SELECT',
			id: Setting.value('activeFolderId'),
		});
	}

}

let application_ = null;

function app() {
	if (!application_) application_ = new Application();
	return application_;
}

function initApp(electronApp) {
	if (application_) throw new Error('Application has already been initialized');
	application_ = new Application(electronApp);
	return application_;
}

module.exports = { app, initApp };