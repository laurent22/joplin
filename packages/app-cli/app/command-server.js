const BaseCommand = require('./base-command').default;
const { _ } = require('@joplin/lib/locale');
const Setting = require('@joplin/lib/models/Setting').default;
const Logger = require('@joplin/utils/Logger').default;
const shim = require('@joplin/lib/shim').default;

class Command extends BaseCommand {

	usage() {
		return 'server <command>';
	}

	description() {
		return `${_('Start, stop or check the API server. To specify on which port it should run, set the api.port config variable. Commands are (%s).', ['start', 'stop', 'status'].join('|'))} This is an experimental feature - use at your own risks! It is recommended that the server runs off its own separate profile so that no two CLI instances access that profile at the same time. Use --profile to specify the profile path.`;
	}

	options() {
		return [
			['--exit-early', 'Allow the command to exit while the server is still running. The server will still stop when the app exits. Valid only for the `start` subcommand.'],
			['--quiet', 'Log less information to the console. More verbose logs will still be available through log-clipper.txt.'],
		];
	}

	async action(args) {
		const command = args.command;

		const ClipperServer = require('@joplin/lib/ClipperServer').default;
		ClipperServer.instance().initialize();
		const stdoutFn = (...s) => this.stdout(s.join(' '));
		const ignoreOutputFn = ()=>{};
		const clipperLogger = new Logger();
		clipperLogger.addTarget('file', { path: `${Setting.value('profileDir')}/log-clipper.txt` });
		clipperLogger.addTarget('console', { console: {
			info: args.options.quiet ? ignoreOutputFn : stdoutFn,
			warn: args.options.quiet ? ignoreOutputFn : stdoutFn,
			error: stdoutFn,
		} });
		ClipperServer.instance().setDispatch(() => {});
		ClipperServer.instance().setLogger(clipperLogger);

		const pidPath = `${Setting.value('profileDir')}/clipper-pid.txt`;
		const runningOnPort = await ClipperServer.instance().isRunning();

		if (command === 'start') {
			if (runningOnPort) {
				this.stdout(_('Server is already running on port %d', runningOnPort));
			} else {
				await shim.fsDriver().writeFile(pidPath, process.pid.toString(), 'utf-8');
				const promise = ClipperServer.instance().start();

				if (!args.options['exit-early']) {
					await promise; // Never exit
				}
			}
		} else if (command === 'status') {
			this.stdout(runningOnPort ? _('Server is running on port %d', runningOnPort) : _('Server is not running.'));
		} else if (command === 'stop') {
			if (!runningOnPort) {
				this.stdout(_('Server is not running.'));
				return;
			}
			const pid = await shim.fsDriver().readFile(pidPath);
			if (!pid) return;
			process.kill(pid, 'SIGTERM');
		}
	}

}

module.exports = Command;
