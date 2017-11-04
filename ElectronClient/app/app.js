const { BaseApplication } = require('lib/BaseApplication');
const { Setting } = require('lib/models/setting.js');
const { BaseModel } = require('lib/base-model.js');
const { _ } = require('lib/locale.js');
const os = require('os');
const fs = require('fs-extra');
const { Logger } = require('lib/logger.js');
const { reg } = require('lib/registry.js');
const { sprintf } = require('sprintf-js');
const { JoplinDatabase } = require('lib/joplin-database.js');
const { DatabaseDriverNode } = require('lib/database-driver-node.js');
const { ElectronAppWrapper } = require('./ElectronAppWrapper');

class Application extends BaseApplication {

	constructor(electronApp) {
		super();

		this.gui_ = new ElectronAppWrapper(electronApp);
	}

	gui() {
		return this.gui_;
	}

	async start(argv) {
		argv = await super.start(argv);

		await this.gui().start();		
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