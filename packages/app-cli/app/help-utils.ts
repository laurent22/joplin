import { wrap } from '@joplin/lib/string-utils';
import Setting, { AppType } from '@joplin/lib/models/Setting';
import { SettingItem } from '@joplin/lib/models/settings/types';
import { _ } from '@joplin/lib/locale';
import BaseCommand from './base-command';

const MAX_WIDTH = 78;
const INDENT = '    ';

type TwoColumnRow = [string, string];

const renderTwoColumnData = (options: TwoColumnRow[], baseIndent: string, width: number) => {
	const output: string[] = [];
	const optionColWidth = getOptionColWidth(options);

	for (let i = 0; i < options.length; i++) {
		const option = options[i];
		const flag = option[0];
		const indent = baseIndent + INDENT + ' '.repeat(optionColWidth + 2);

		let r = wrap(option[1], indent, width);
		r = r.substr(flag.length + (baseIndent + INDENT).length);
		r = baseIndent + INDENT + flag + r;
		output.push(r);
	}

	return output.join('\n');
};

// eslint-disable-next-line import/prefer-default-export -- file is named after its functional area (help-utils); default-export of renderCommandHelp would diverge from the file name
export const renderCommandHelp = (cmd: BaseCommand, width: number|null = null) => {
	if (width === null) width = MAX_WIDTH;

	const baseIndent = '';

	const output: string[] = [];
	output.push(baseIndent + cmd.usage());
	output.push('');
	output.push(wrap(cmd.description(), baseIndent + INDENT, width));

	const optionString = renderTwoColumnData(cmd.options() as TwoColumnRow[], baseIndent, width);

	if (optionString) {
		output.push('');
		output.push(optionString);
	}

	if (cmd.name() === 'config') {
		const renderMetadata = (md: SettingItem): TwoColumnRow => {
			const desc: string[] = [];

			if (md.label) {
				let label = md.label();
				if (label.length && label[label.length - 1] !== '.') label += '.';
				desc.push(label);
			}

			const description = Setting.keyDescription(md.key, AppType.Cli);
			if (description) desc.push(description);

			desc.push(_('Type: %s.', md.isEnum ? _('Enum') : Setting.typeToString(md.type)));
			if (md.isEnum) desc.push(_('Possible values: %s.', Setting.enumOptionsDoc(md.key, '%s (%s)')));

			let defaultString = null;

			if ('value' in md) {
				if (md.type === Setting.TYPE_STRING) {
					defaultString = md.value ? `"${md.value}"` : null;
				} else if (md.type === Setting.TYPE_INT) {
					defaultString = (md.value ? md.value : 0).toString();
				} else if (md.type === Setting.TYPE_BOOL) {
					defaultString = md.value === true ? 'true' : 'false';
				}
			}

			if (defaultString !== null) desc.push(_('Default: %s', defaultString));

			return [md.key, desc.join('\n')];
		};

		output.push('');
		output.push(_('Possible keys/values:'));
		output.push('');

		const keysValues: TwoColumnRow[] = [];
		const keys = Setting.keys(true, AppType.Cli);
		for (let i = 0; i < keys.length; i++) {
			if (keysValues.length) keysValues.push(['', '']);
			const md = Setting.settingMetadata(keys[i]);
			if (!md.label) continue;
			keysValues.push(renderMetadata(md));
		}

		output.push(renderTwoColumnData(keysValues, baseIndent, width));
	}

	return output.join('\n');
};

const getOptionColWidth = (options: TwoColumnRow[]) => {
	let output = 0;
	for (let j = 0; j < options.length; j++) {
		const option = options[j];
		if (option[0].length > output) output = option[0].length;
	}
	return output;
};
