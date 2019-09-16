import sqlts from '@rmp135/sql-ts'

const dbFilePath:string = __dirname + '/../../app/db.ts'

const config = {
	"dialect":"sqlite3",
	"connection": {
		"filename": "./db.sqlite"
	},
	"useNullAsDefault": true,
	"excludedTables": ["knex_migrations", "knex_migrations_lock", "android_metadata"],
	"interfaceNameFormat": "PascalCaseSingular",
	"filename": "./app/db",
	"fileReplaceWithinMarker": "// AUTO-GENERATED-TYPES",
	"extends": {
		"main.sessions": "WithDates",
		"main.users": "WithDates"
	}
  }

function insertContentIntoFile(filePath:string, markerOpen:string, markerClose:string, contentToInsert:string):void {
	const fs = require('fs');
	if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath);
	let content:string = fs.readFileSync(filePath, 'utf-8');
	// [^]* matches any character including new lines
	const regex:RegExp = new RegExp(markerOpen + '[^]*?' + markerClose);
	if (!content.match(regex)) throw new Error('Could not find markers: ' + markerOpen);
	content = content.replace(regex, markerOpen + "\n" + contentToInsert + "\n" + markerClose);
	fs.writeFileSync(filePath, content);
};

function createTypeString(table:any) {
	const colStrings = [];
	for (const col of table.columns) {
		if (table.extends === 'WithDates') {
			if (['created_time', 'updated_time'].includes(col.propertyName)) continue;
		}

		colStrings.push('\t' + col.propertyName + '?: ' + col.propertyType);
	}

	const header = ['export interface'];
	header.push(table.interfaceName);
	if (table.extends) header.push('extends ' + table.extends);

	return header.join(' ') + ' {\n' + colStrings.join('\n') + '\n}';
}

async function main() {
	const definitions = await sqlts.toObject(config);

	const typeStrings = [];

	for (const table of definitions.tables) {	
		typeStrings.push(createTypeString(table));
	}

	const content = '// Auto-generated using `npm run generate-types`\n' + typeStrings.join('\n\n');
	
	insertContentIntoFile(dbFilePath, config.fileReplaceWithinMarker, config.fileReplaceWithinMarker, content);
}

main().catch(error => {
	console.error('Fatal error', error);
	process.exit(1);
});