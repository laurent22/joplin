// Make it possible to require("/lib/...") without specifying full path
//require('app-module-path').addPath(__dirname + '/../ReactNativeClient');
require('app-module-path').addPath(__dirname);

const electronApp = require('electron').app;
const { BrowserWindow } = require('electron');
const { Setting } = require('lib/models/setting.js');
const { BaseModel } = require('lib/base-model.js');
const { _ } = require('lib/locale.js');
const path = require('path')
const url = require('url')
const os = require('os');
const fs = require('fs-extra');
const { Logger } = require('lib/logger.js');
const { reg } = require('lib/registry.js');
const { sprintf } = require('sprintf-js');
const { JoplinDatabase } = require('lib/joplin-database.js');
const { DatabaseDriverNode } = require('lib/database-driver-node.js');

class Application {

	constructor(electronApp) {
		this.electronApp_ = electronApp;
		this.loadState_ = 'start';
		this.win_ = null;
		this.logger_ = new Logger();
		this.dbLogger_ = new Logger();
		this.database_ = null;

		this.electronApp_.on('ready', () => {
			this.loadState_ = 'ready';
		})
	}

	createWindow() {
		// Create the browser window.
		this.win_ = new BrowserWindow({width: 800, height: 600})

		// and load the index.html of the app.
		this.win_.loadURL(url.format({
			pathname: path.join(__dirname, 'index.html'),
			protocol: 'file:',
			slashes: true
		}))

		// Open the DevTools.
		this.win_.webContents.openDevTools()

		// Emitted when the window is closed.
		this.win_.on('closed', () => {
			// Dereference the window object, usually you would store windows
			// in an array if your app supports multi windows, this is the time
			// when you should delete the corresponding element.
			this.win_ = null
		})
	}

	waitForElectronAppReady() {
		if (this.loadState_ === 'ready') return Promise.resolve();

		return new Promise((resolve, reject) => {
			const iid = setInterval(() => {
				if (this.loadState_ === 'ready') {
					clearInterval(iid);
					resolve();
				}
			}, 10);
		});
	}

	async start() {
		let initArgs = { env: 'dev', logLevel: Logger.LEVEL_DEBUG };

		Setting.setConstant('appName', initArgs.env == 'dev' ? 'joplindev-desktop' : 'joplin-desktop');

		const profileDir = os.homedir() + '/.config/' + Setting.value('appName');
		const resourceDir = profileDir + '/resources';
		const tempDir = profileDir + '/tmp';

		Setting.setConstant('env', initArgs.env);
		Setting.setConstant('profileDir', profileDir);
		Setting.setConstant('resourceDir', resourceDir);
		Setting.setConstant('tempDir', tempDir);

		await fs.mkdirp(profileDir, 0o755);
		await fs.mkdirp(resourceDir, 0o755);
		await fs.mkdirp(tempDir, 0o755);

		this.logger_.addTarget('file', { path: profileDir + '/log.txt' });
		this.logger_.setLevel(initArgs.logLevel);

		reg.setLogger(this.logger_);
		reg.dispatch = (o) => {};

		this.dbLogger_.addTarget('file', { path: profileDir + '/log-database.txt' });
		this.dbLogger_.setLevel(initArgs.logLevel);

		if (Setting.value('env') === 'dev') {
			//this.dbLogger_.setLevel(Logger.LEVEL_WARN);
		}

		const packageJson = require('./package.json');
		this.logger_.info(sprintf('Starting %s %s (%s)...', packageJson.name, packageJson.version, Setting.value('env')));
		this.logger_.info('Profile directory: ' + profileDir);

		this.database_ = new JoplinDatabase(new DatabaseDriverNode());
		//this.database_.setLogExcludedQueryTypes(['SELECT']);
		this.database_.setLogger(this.dbLogger_);
		await this.database_.open({ name: profileDir + '/database.sqlite' });

		reg.setDb(this.database_);
		BaseModel.db_ = this.database_;

		// Since we are doing other async things before creating the window, we might miss
		// the "ready" event. So we use the function below to make sure that the app is
		// ready.
		await this.waitForElectronAppReady();

		this.createWindow();

		// Quit when all windows are closed.
		this.electronApp_.on('window-all-closed', () => {
			// On macOS it is common for applications and their menu bar
			// to stay active until the user quits explicitly with Cmd + Q
			if (process.platform !== 'darwin') {
				this.electronApp_.quit()
			}
		})

		this.electronApp_.on('activate', () => {
			// On macOS it's common to re-create a window in the app when the
			// dock icon is clicked and there are no other windows open.
			if (this.win_ === null) {
				createWindow()
			}
		})
	}

}

process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled promise rejection', p, 'reason:', reason);
	process.exit(1);
});

const app = new Application(electronApp);
app.start().catch((error) => {
	console.error(_('Fatal error:'));
	console.error(error);
});