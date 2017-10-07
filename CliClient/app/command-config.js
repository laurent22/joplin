import { BaseCommand } from './base-command.js';
import { _, setLocale } from 'lib/locale.js';
import { app } from './app.js';
import { Setting } from 'lib/models/setting.js';

class Command extends BaseCommand {

	usage() {
		return 'config [name] [value]';
	}

	description() {
		return _("Gets or sets a config value. If [value] is not provided, it will show the value of [name]. If neither [name] nor [value] is provided, it will list the current configuration.");
	}

	options() {
		return [
			['-v, --verbose', _('Also displays unset and hidden config variables.')],
		];
	}

	async action(args) {
		const verbose = args.options.verbose;

		const renderKeyValue = (name) => {
			const value = Setting.value(name);
			if (Setting.isEnum(name)) {
				return _('%s = %s (%s)', name, value, Setting.enumOptionsDoc(name));
			} else {
				return _('%s = %s', name, value);
			}
		}

		if (!args.name && !args.value) {
			let keys = Setting.keys(!verbose, 'cli');
			for (let i = 0; i < keys.length; i++) {
				const value = Setting.value(keys[i]);
				if (!verbose && !value) continue;
				this.stdout(renderKeyValue(keys[i]));
			}
			return;
		}

		if (args.name && !args.value) {
			this.stdout(renderKeyValue(args.name));
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