import BaseCommand from './base-command';
import { _, setLocale } from '@joplin/lib/locale';
import app from './app';
import * as fs from 'fs-extra';
import Setting, { AppType } from '@joplin/lib/models/Setting';
import { ReadStream } from 'tty';

class Command extends BaseCommand {
	public override usage() {
		return 'config [name] [value]';
	}

	public override description() {
		return _('Gets or sets a config value. If [value] is not provided, it will show the value of [name]. If neither [name] nor [value] is provided, it will list the current configuration.');
	}

	public override options() {
		return [
			['-v, --verbose', _('Also displays unset and hidden config variables.')],
			['--export', 'Writes all settings to STDOUT as JSON including secure variables.'],
			['--import', 'Reads in JSON formatted settings from STDIN.'],
			['--import-file <file>', 'Reads in settings from <file>. <file> must contain valid JSON.'],
		];
	}

	private async __importSettings(inputStream: ReadStream|fs.ReadStream) {
		return new Promise<void>((resolve, reject) => {
			// being defensive and not attempting to settle twice
			let isSettled = false;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const chunks: any = [];

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
				} catch (error) {
					isSettled = true;
					return reject(new Error(`Invalid JSON passed to config --import: \n${error.message}.`));
				}
				if (settingsObj) {
					// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
		const verbose = args.options.verbose;
		const isExport = args.options.export;
		const isImport = args.options.import || args.options.importFile;
		const importFile = args.options.importFile;

		const renderKeyValue = (name: string) => {
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
			const keys = Setting.keys(!verbose, AppType.Cli);
			keys.sort();

			if (isExport) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				const resultObj = keys.reduce<Record<string, any>>((acc, key) => {
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
			let fileStream: ReadStream|fs.ReadStream = process.stdin;
			if (importFile) {
				fileStream = fs.createReadStream(importFile, { autoClose: true });
			}
			await this.__importSettings(fileStream);
		} else {
			Setting.setValue(args.name, args.value);
		}


		if (args.name === 'locale') {
			setLocale(Setting.value('locale'));
		}

		await Setting.saveAll();
	}
}

module.exports = Command;
