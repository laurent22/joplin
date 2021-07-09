import sqlts from '@rmp135/sql-ts';

require('source-map-support').install();

const dbFilePath: string = `${__dirname}/../../src/db.ts`;

const fileReplaceWithinMarker = '// AUTO-GENERATED-TYPES';

const config = {
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
	'extends': {
		'main.sessions': 'WithDates, WithUuid',
		'main.users': 'WithDates, WithUuid',
		'main.items': 'WithDates, WithUuid',
		'main.api_clients': 'WithDates, WithUuid',
		'main.changes': 'WithDates, WithUuid',
		'main.notifications': 'WithDates, WithUuid',
		'main.shares': 'WithDates, WithUuid',
		'main.share_users': 'WithDates, WithUuid',
		'main.user_items': 'WithDates',
		'main.emails': 'WithDates',
		'main.tokens': 'WithDates',
	},
};

const propertyTypes: Record<string, string> = {
	'*.item_type': 'ItemType',
	'changes.type': 'ChangeType',
	'notifications.level': 'NotificationLevel',
	'shares.type': 'ShareType',
	'items.content': 'Buffer',
	'items.jop_updated_time': 'number',
	'share_users.status': 'ShareUserStatus',
	'emails.sender_id': 'EmailSender',
	'emails.sent_time': 'number',
	'subscriptions.last_payment_time': 'number',
	'subscriptions.last_payment_failed_time': 'number',
	'users.can_share_folder': 'number | null',
	'users.can_share_note': 'number | null',
	'users.max_total_item_size': 'number | null',
	'users.max_item_size': 'number | null',
	'users.total_item_size': 'number',
};

function insertContentIntoFile(filePath: string, markerOpen: string, markerClose: string, contentToInsert: string): void {
	const fs = require('fs');
	if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
	let content: string = fs.readFileSync(filePath, 'utf-8');
	// [^]* matches any character including new lines
	const regex: RegExp = new RegExp(`${markerOpen}[^]*?${markerClose}`);
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
function createTypeString(table: any) {
	const colStrings = [];
	for (const col of table.columns) {
		const name = col.propertyName as string;
		let type = col.propertyType;

		if (table.extends && table.extends.indexOf('WithDates') >= 0) {
			if (['created_time', 'updated_time'].includes(name)) continue;
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
function createRuntimeObject(table: any) {
	const colStrings = [];
	for (const col of table.columns) {
		const name = col.propertyName;
		const type = col.propertyType;
		colStrings.push(`\t\t${name}: { type: '${type}' },`);
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

	let content = `// Auto-generated using \`npm run generate-types\`\n${typeStrings.join('\n\n')}`;
	content += '\n\n';
	content += `export const databaseSchema: DatabaseTables = {\n${tableStrings.join('\n')}\n};`;

	insertContentIntoFile(dbFilePath, fileReplaceWithinMarker, fileReplaceWithinMarker, content);
}

main().catch(error => {
	console.error('Fatal error', error);
	process.exit(1);
});
