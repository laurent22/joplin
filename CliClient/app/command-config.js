const { BaseCommand } = require('./base-command.js');
const { _, setLocale } = require('lib/locale.js');
const { app } = require('./app.js');
const Setting = require('lib/models/Setting.js');

class Command extends BaseCommand {
	usage() {
		return 'config [name] [value]';
	}

	description() {
		return _('Gets or sets a config value. If [value] is not provided, it will show the value of [name]. If neither [name] nor [value] is provided, it will list the current configuration.');
	}

	options() {
		return [['-v, --verbose', _('Also displays unset and hidden config variables.')]];
	}

	async action(args) {
		const verbose = args.options.verbose;

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

		if (!args.name && !args.value) {
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

		if (args.name && !args.value) {
			this.stdout(renderKeyValue(args.name));
			app()
				.gui()
				.showConsole();
			app()
				.gui()
				.maximizeConsole();
			return;
		}

		Setting.setValue(args.name, args.value);

		if (args.name == 'locale') {
			setLocale(Setting.value('locale'));
			app().onLocaleChanged();
		}

		await Setting.saveAll();
	}
}

module.exports = Command;
