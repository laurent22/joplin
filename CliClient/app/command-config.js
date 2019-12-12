const { BaseCommand } = require('./base-command.js');
const { _, setLocale } = require('lib/locale.js');
const { app } = require('./app.js');
const fs = require('fs-extra');
const Setting = require('lib/models/Setting.js');

class Command extends BaseCommand {
	usage() {
		return 'config [name] [value]';
	}

	description() {
		return _('Gets or sets a config value. If [value] is not provided, it will show the value of [name]. If neither [name] nor [value] is provided, it will list the current configuration.');
	}

	options() {
		return [['-v, --verbose', _('Also displays unset and hidden config variables.')],
			['--export', _('Writes the variables to STDOUT in plain text including secure variables.')],
			['--import', _('Reads the variables from STDIN in plain text in the format [name]=[value] and sets them as if you had individually called config [name] [value].')],
			['--import-file <file>', _('Reads the variables from <file> in plain text in the format [name]=[value] and sets them as if you had individually called config [name] [value].')]];
	}
	async __importSettings(fileStream) {
		return new Promise((resolve) => {
			const readline = require('readline');

			const rl = readline.createInterface({
				input: fileStream,
			});

			rl.on('line', (line) => {
				line = line ? line.trim() : '';
				if (!line) {
					return;
				}
				const [name, value] = line.split('=');
				Setting.setValue(name, value);
			})
				.on('close', () => {
					resolve();
				});
		});
	}
	async action(args) {
		const verbose = args.options.verbose;
		const isExport = args.options.export;
		const isImport = args.options.import || args.options.importFile;
		const importFile = args.options.importFile;

		const renderKeyValue = name => {
			const md = Setting.settingMetadata(name);
			let value = Setting.value(name);
			if (typeof value === 'object' || Array.isArray(value)) value = JSON.stringify(value);
			if (md.secure && value && !isExport) value = '********';

			if (isExport) {
				// No spaces as this will cause problems
				return _('%s=%s', name, value);
			}
			if (Setting.isEnum(name)) {
				return _('%s = %s (%s)', name, value, Setting.enumOptionsDoc(name));
			} else {
				return _('%s = %s', name, value);
			}
		};

		if (!isImport && !args.name && !args.value) {
			let keys = Setting.keys(!verbose, 'cli');
			keys.sort();
			for (let i = 0; i < keys.length; i++) {
				const value = Setting.value(keys[i]);
				if (!verbose && !value) continue;
				this.stdout(renderKeyValue(keys[i]));
			}
			app()
				.gui()
				.showConsole();
			app()
				.gui()
				.maximizeConsole();
			return;
		}

		if (!isImport && args.name && !args.value) {
			this.stdout(renderKeyValue(args.name));
			app()
				.gui()
				.showConsole();
			app()
				.gui()
				.maximizeConsole();
			return;
		}

		if (isImport) {
			let fileStream = process.stdin;
			if (importFile) {
				fileStream = fs.createReadStream(importFile, {autoClose: true});
			}
			await this.__importSettings(fileStream);
		} else {
			Setting.setValue(args.name, args.value);
		}


		if (args.name == 'locale') {
			setLocale(Setting.value('locale'));
			app().onLocaleChanged();
		}

		await Setting.saveAll();
	}
}

module.exports = Command;
