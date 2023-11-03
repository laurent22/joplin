/* eslint-disable no-console */

import sqlts, { Config, Table } from '@rmp135/sql-ts';

require('source-map-support').install();

const dbFilePath = `${__dirname}/../../src/services/database/types.ts`;

const fileReplaceWithinMarker = '// AUTO-GENERATED-TYPES';

const config: Config = {
	'client': 'sqlite3',
	'connection': {
		'filename': './db-buildTypes.sqlite',
	},
	'useNullAsDefault': true,
	'excludedTables': [
		'main.knex_migrations',
		'main.knex_migrations_lock',
		'android_metadata',
	],
	'interfaceNameFormat': '${table}',
	'singularTableNames': true,
	'tableNameCasing': 'pascal' as any,
	'filename': './db',
	'columnSortOrder': 'source',
	'extends': {
		'main.api_clients': 'WithDates, WithUuid',
		'main.backup_items': 'WithCreatedDate',
		'main.changes': 'WithDates, WithUuid',
		'main.emails': 'WithDates',
		'main.events': 'WithUuid',
		'main.items': 'WithDates, WithUuid',
		'main.notifications': 'WithDates, WithUuid',
		'main.sessions': 'WithDates, WithUuid',
		'main.share_users': 'WithDates, WithUuid',
		'main.shares': 'WithDates, WithUuid',
		'main.task_states': 'WithDates',
		'main.tokens': 'WithDates',
		'main.user_deletions': 'WithDates',
		'main.user_flags': 'WithDates',
		'main.user_items': 'WithDates',
		'main.users': 'WithDates, WithUuid',
	},
};

const propertyTypes: Record<string, string> = {
	'*.item_type': 'ItemType',
	'backup_items.content': 'Buffer',
	'changes.type': 'ChangeType',
	'emails.sender_id': 'EmailSender',
	'emails.sent_time': 'number',
	'events.created_time': 'number',
	'events.type': 'EventType',
	'items.content': 'Buffer',
	'items.jop_updated_time': 'number',
	'notifications.level': 'NotificationLevel',
	'share_users.status': 'ShareUserStatus',
	'shares.type': 'ShareType',
	'subscriptions.last_payment_failed_time': 'number',
	'subscriptions.last_payment_time': 'number',
	'task_states.task_id': 'TaskId',
	'user_deletions.end_time': 'number',
	'user_deletions.scheduled_time': 'number',
	'user_deletions.start_time': 'number',
	'user_flags.type': 'UserFlagType',
	'users.can_share_folder': 'number | null',
	'users.can_share_note': 'number | null',
	'users.disabled_time': 'number',
	'users.max_item_size': 'number | null',
	'users.max_total_item_size': 'number | null',
	'users.total_item_size': 'number',
};

function insertContentIntoFile(filePath: string, markerOpen: string, markerClose: string, contentToInsert: string): void {
	const fs = require('fs');
	if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
	let content: string = fs.readFileSync(filePath, 'utf-8');
	// [^]* matches any character including new lines
	const regex = new RegExp(`${markerOpen}[^]*?${markerClose}`);
	if (!content.match(regex)) throw new Error(`Could not find markers: ${markerOpen}`);
	content = content.replace(regex, `${markerOpen}\n${contentToInsert}\n${markerClose}`);
	fs.writeFileSync(filePath, content);
}

// To output:
//
// export interface User extends WithDates, WithUuid {
// 	email?: string
// 	password?: string
// 	is_admin?: number
// }
function createTypeString(table: Table) {
	const colStrings = [];
	for (const col of table.columns) {
		const name = col.propertyName as string;
		let type = col.propertyType;

		if (table.extends && table.extends.indexOf('WithDates') >= 0) {
			if (['created_time', 'updated_time'].includes(name)) continue;
		}

		if (table.extends && table.extends.indexOf('WithCreatedDate') >= 0) {
			if (['created_time'].includes(name)) continue;
		}

		if (table.extends && table.extends.indexOf('WithUuid') >= 0) {
			if (['id'].includes(name)) continue;
		}

		if ((name === 'id' || name.endsWith('_id') || name === 'uuid') && type === 'string') type = 'Uuid';
		if (propertyTypes[`*.${name}`]) type = propertyTypes[`*.${name}`];
		if (propertyTypes[`${table.name}.${name}`]) type = propertyTypes[`${table.name}.${name}`];

		colStrings.push(`\t${name}?: ${type};`);
	}

	const header = ['export interface'];
	header.push(table.interfaceName);

	if (table.extends) header.push(`extends ${table.extends}`);

	return `${header.join(' ')} {\n${colStrings.join('\n')}\n}`;
}

// SQLite default values are always strings regardless of the column types. So
// here we convert it to the correct type.
const formatDefaultValue = (value: string | null, type: string): null | number | string => {
	if (value === null) return value;

	// From https://www.sqlite.org/datatype3.html
	//
	// Note that DECIMAL(10,5) is also a valid type - this is checked in the
	// conditional below
	const numericTypes = [
		'INT',
		'INTEGER',
		'TINYINT',
		'SMALLINT',
		'MEDIUMINT',
		'BIGINT',
		'UNSIGNED BIG INT',
		'INT2',
		'INT8',
		'REAL',
		'DOUBLE',
		'DOUBLE PRECISION',
		'FLOAT',
		'NUMERIC',
		'BOOLEAN',
		'DATE',
		'DATETIME',
	];

	// SQLite default values are always surrounded by double quotes or single
	// quotes - eg `"3"` (for numeric value 3) or `"example"` (for string
	// `example`). So here we remove the quotes, but to safe we check that they
	// are actually present.
	if (value.length && value[0] === '"' && value[value.length - 1] === '"') {
		value = value.substring(1, value.length - 1);
	} else if (value.length && value[0] === '\'' && value[value.length - 1] === '\'') {
		value = value.substring(1, value.length - 1);
	}

	type = type.toUpperCase();

	if (numericTypes.includes(type) || type.startsWith('DECIMAL')) {
		if (value.toLowerCase() === 'null') return null;
		const output = Number(value);
		if (isNaN(output)) throw new Error(`Could not convert default value: ${value}`);
		return output;
	} else {
		return value;
	}
};

// To output:
//
// export const databaseSchema:DatabaseTables = {
// 	users: {
// 		id: { type: "string" },
// 		email: { type: "string" },
// 		password: { type: "string" },
// 		is_admin: { type: "number" },
// 		updated_time: { type: "number" },
// 		created_time: { type: "number" },
// 	},
// }
function createRuntimeObject(table: Table) {
	const colStrings = [];
	for (const col of table.columns) {
		const name = col.propertyName;
		const type = col.propertyType;
		let defaultValue = formatDefaultValue(col.defaultValue, col.type);
		if (typeof defaultValue === 'string') defaultValue = `'${defaultValue}'`;
		colStrings.push(`\t\t${name}: { type: '${type}', defaultValue: ${defaultValue} },`);
	}

	return `\t${table.name}: {\n${colStrings.join('\n')}\n\t},`;
}

async function main() {
	const definitions = await sqlts.toObject(config);

	const typeStrings = [];
	for (const table of definitions.tables) {
		typeStrings.push(createTypeString(table));
	}

	const tableStrings = [];
	for (const table of definitions.tables) {
		tableStrings.push(createRuntimeObject(table));
	}

	let content = `// Auto-generated using \`yarn run generate-types\`\n${typeStrings.join('\n\n')}`;
	content += '\n\n';
	content += `export const databaseSchema: DatabaseTables = {\n${tableStrings.join('\n')}\n};`;

	insertContentIntoFile(dbFilePath, fileReplaceWithinMarker, fileReplaceWithinMarker, content);

	console.info(`Types have been updated in ${dbFilePath}`);
}

main().catch(error => {
	console.error('Fatal error', error);
	process.exit(1);
});
