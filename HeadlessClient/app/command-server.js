const { BaseCommand } = require('./base-command.js');
const { _ } = require('lib/locale.js');
const Setting = require('lib/models/Setting.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry');
const { Logger } = require('lib/logger.js');
const { shim } = require('lib/shim');
const fs = require('fs');

class Command extends BaseCommand {

	usage() {
		return 'server [command]';
	}

	description() {
		return _('Start, stop or check the API server. To specify on which port it should run, set the api.port config variable. Commands are (start|stop|status).');
	}

	async action(args) {
		const command = args.command;

		const ClipperServer = require('lib/ClipperServer');
		const stdoutFn = (s) => this.stdout(s);
		const clipperLogger = new Logger();
		clipperLogger.addTarget('file', { path: Setting.value('profileDir') + '/log-clipper.txt' });
		clipperLogger.addTarget('console', { console: {
			info: stdoutFn,
			warn: stdoutFn,
			error: stdoutFn,
		}});
		ClipperServer.instance().setDispatch(action => {});
		ClipperServer.instance().setLogger(clipperLogger);

		const pidPath = Setting.value('profileDir') + '/clipper-pid.txt';
		const runningOnPort = await ClipperServer.instance().isRunning();

		if (command === 'start' || command === undefined) {
			if (runningOnPort) {
				this.stdout(_('Server is already running on port %d', runningOnPort));
			} else {
				const { app } = require('./app.js');
				app().initRedux();
				const handleSignal = (signal) => {
					this.logger().info('Received ' + signal + ', going to exit.');
					app().exit();
				};
				process.on('SIGTERM', () => handleSignal('SIGTERM'));
				process.on('SIGINT',  () => handleSignal('SIGINT'));
				const ResourceService = require('lib/services/ResourceService');
				ResourceService.runInBackground();
				await shim.fsDriver().writeFile(pidPath, process.pid.toString(), 'utf-8');
				await ClipperServer.instance().start();
				const WebClipService = require('lib/services/WebClipService.js')
				this.webclipService_ = WebClipService.instance();
				this.webclipService_.start();
				const { reg } = require('lib/registry.js');
				reg.scheduleSync(0);
				const filesystemSyncTargetId = SyncTargetRegistry.nameToId('filesystem');
				if (Setting.value('sync.target') === filesystemSyncTargetId) {
					const syncPath = Setting.value('sync.' + filesystemSyncTargetId + '.path');
					fs.watch(syncPath, {recursive: true}, (eventType, filename) => {
						if (!filename.endsWith('.md')) return;
						this.logger().info('scheduleSync triggered by sync.target file change: ' + eventType + ' on ' + filename);
						reg.scheduleSync(1000);
					})
				}
			}
		} else if (command === 'status') {
			this.stdout(runningOnPort ? _('Server is running on port %d', runningOnPort) : _('Server is not running.'));
		} else if (command === 'stop') {
			if (!runningOnPort) {
				this.stdout(_('Server is not running'));
				return;
			}
			const pid = await shim.fsDriver().readFile(pidPath);
			if (!pid) return;
			process.kill(pid, 'SIGTERM');
		}
	}

}

module.exports = Command;
