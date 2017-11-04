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

class Application extends BaseApplication {

	constructor(electronApp) {
		super();

		this.electronApp_ = electronApp;
	}

	gui() {
		return this.gui_;
	}

	async start(argv) {
		argv = await super.start(argv);

		this.initRedux();

		this.gui_ = new ElectronAppWrapper(this.electronApp_, this, this.store());

		try {
			this.gui_.setLogger(this.logger());
			await this.gui().start();

			// Since the settings need to be loaded before the store is created, it will never
			// receive the SETTINGS_UPDATE_ALL even, which mean state.settings will not be
			// initialised. So we manually call dispatchUpdateAll() to force an update.
			Setting.dispatchUpdateAll();

			await FoldersScreenUtils.refreshFolders();

			const tags = await Tag.allWithNotes();

			this.dispatch({
				type: 'TAGS_UPDATE_ALL',
				tags: tags,
			});

			this.store().dispatch({
				type: 'FOLDERS_SELECT',
				id: Setting.value('activeFolderId'),
			});
		} catch (error) {
			await this.gui_.exit();
			throw error;
		}
	}

}

let application_ = null;

function app() {
	if (!application_) throw new Error('Application has not been initialized');
	return application_;
}

function initApp(electronApp) {
	if (application_) throw new Error('Application has already been initialized');
	application_ = new Application(electronApp);
	return application_;
}

module.exports = { app, initApp };