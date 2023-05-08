import Setting, { SettingStorage } from '@joplin/lib/models/Setting';
import { schemaUrl } from '@joplin/lib/models/settings/types';
import { SettingItemType } from '@joplin/lib/services/plugins/api/types';
import shim from '@joplin/lib/shim';

const BaseCommand = require('./base-command').default;

function settingTypeToSchemaType(type: SettingItemType): string {
	const map: Record<SettingItemType, string> = {
		[SettingItemType.Int]: 'integer',
		[SettingItemType.String]: 'string',
		[SettingItemType.Bool]: 'boolean',
		[SettingItemType.Array]: 'array',
		[SettingItemType.Object]: 'object',
		[SettingItemType.Button]: '',
	};

	const r = map[type];
	if (r === '') return '';

	if (!r) throw new Error(`Unsupported type: ${type}`);

	return r;
}

class Command extends BaseCommand {
	public usage() {
		return 'settingschema <file>';
	}

	public description() {
		return 'Build the setting schema file';
	}

	public enabled() {
		return false;
	}

	public async action(args: any) {
		const schema: Record<string, any> = {
			title: 'JSON schema for Joplin setting files',
			'$id': schemaUrl,
			'$schema': 'https://json-schema.org/draft-07/schema#',
			type: 'object',
			properties: {},
		};

		const metadata = Setting.metadata();

		for (const key of Object.keys(metadata)) {
			const md = metadata[key];

			const type = settingTypeToSchemaType(md.type);
			if (!type) continue;

			const props: Record<string, any> = {};
			props.type = type;
			props.default = md.value;

			const description: string[] = [];
			if (md.label && md.label()) description.push(md.label());
			if (md.description && md.description('desktop')) description.push(md.description('desktop'));

			if (description.length) props.description = description.join('. ');
			if (md.isEnum) props.enum = Object.keys(md.options()).map((v: any) => Setting.formatValue(key, v));
			if ('minimum' in md) props.minimum = md.minimum;
			if ('maximum' in md) props.maximum = md.maximum;
			if (!md.public || md.storage !== SettingStorage.File) props['$comment'] = 'private';
			schema.properties[key] = props;
		}

		const outFilePath = args['file'];

		await shim.fsDriver().writeFile(outFilePath, JSON.stringify(schema, null, '\t'), 'utf8');
	}
}

module.exports = Command;
