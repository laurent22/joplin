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
		return [
			['-v, --verbose', _('Also displays unset and hidden config variables.')],
			['--export', 'Writes all settings to STDOUT as JSON including secure variables.'],
			['--import', 'Reads in JSON formatted settings from STDIN.'],
			['--import-file <file>', 'Reads in settings from <file>. <file> must contain valid JSON.'],
		];
	}
	async __importSettings(inputStream) {
		return new Promise((resolve, reject) => {
			// being defensive and not attempting to settle twice
			let isSettled = false;
			const chunks = [];

			inputStream.on('readable', () => {
				let chunk;
				while ((chunk = inputStream.read()) !== null) {
					chunks.push(chunk);
				}
			});

			inputStream.on('end', () => {
				const json = chunks.join('');
				let settingsObj;
				try {
					settingsObj = JSON.parse(json);
				} catch (err) {
					isSettled = true;
					return reject(new Error(`Invalid JSON passed to config --import: \n${err.message}.`));
				}
				if (settingsObj) {
					Object.entries(settingsObj)
						.forEach(([key, value]) => {
							Setting.setValue(key, value);
						});
				}
				if (!isSettled) {
					isSettled = true;
					resolve();
				}
			});

			inputStream.on('error', (error) => {
				if (!isSettled) {
					isSettled = true;
					reject(error);
				}
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
			if (md.secure && value) value = '********';

			if (Setting.isEnum(name)) {
				return _('%s = %s (%s)', name, value, Setting.enumOptionsDoc(name));
			} else {
				return _('%s = %s', name, value);
			}
		};

		if (isExport || (!isImport && !args.value)) {
			const keys = Setting.keys(!verbose, 'cli');
			keys.sort();

			if (isExport) {
				const resultObj = keys.reduce((acc, key) => {
					const value = Setting.value(key);
					if (!verbose && !value) return acc;
					acc[key] = value;
					return acc;
				}, {});
				// Printing the object in "pretty" format so it's easy to read/edit
				this.stdout(JSON.stringify(resultObj, null, 2));
			} else if (!args.name) {
				for (let i = 0; i < keys.length; i++) {
					const value = Setting.value(keys[i]);
					if (!verbose && !value) continue;
					this.stdout(renderKeyValue(keys[i]));
				}
			} else {
				this.stdout(renderKeyValue(args.name));
			}

			app().gui().showConsole();
			app().gui().maximizeConsole();

			return;
		}

		if (isImport) {
			let fileStream = process.stdin;
			if (importFile) {
				fileStream = fs.createReadStream(importFile, { autoClose: true });
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
