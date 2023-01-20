"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sql_ts_1 = require("@rmp135/sql-ts");
require('source-map-support').install();
const dbFilePath = `${__dirname}/../../src/services/database/types.ts`;
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
    'tableNameCasing': 'pascal',
    'filename': './db',
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
const propertyTypes = {
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
function insertContentIntoFile(filePath, markerOpen, markerClose, contentToInsert) {
    const fs = require('fs');
    if (!fs.existsSync(filePath))
        throw new Error(`File not found: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf-8');
    // [^]* matches any character including new lines
    const regex = new RegExp(`${markerOpen}[^]*?${markerClose}`);
    if (!content.match(regex))
        throw new Error(`Could not find markers: ${markerOpen}`);
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
function createTypeString(table) {
    const colStrings = [];
    for (const col of table.columns) {
        const name = col.propertyName;
        let type = col.propertyType;
        if (table.extends && table.extends.indexOf('WithDates') >= 0) {
            if (['created_time', 'updated_time'].includes(name))
                continue;
        }
        if (table.extends && table.extends.indexOf('WithCreatedDate') >= 0) {
            if (['created_time'].includes(name))
                continue;
        }
        if (table.extends && table.extends.indexOf('WithUuid') >= 0) {
            if (['id'].includes(name))
                continue;
        }
        if ((name === 'id' || name.endsWith('_id') || name === 'uuid') && type === 'string')
            type = 'Uuid';
        if (propertyTypes[`*.${name}`])
            type = propertyTypes[`*.${name}`];
        if (propertyTypes[`${table.name}.${name}`])
            type = propertyTypes[`${table.name}.${name}`];
        colStrings.push(`\t${name}?: ${type};`);
    }
    const header = ['export interface'];
    header.push(table.interfaceName);
    if (table.extends)
        header.push(`extends ${table.extends}`);
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
function createRuntimeObject(table) {
    const colStrings = [];
    for (const col of table.columns) {
        const name = col.propertyName;
        const type = col.propertyType;
        colStrings.push(`\t\t${name}: { type: '${type}' },`);
    }
    return `\t${table.name}: {\n${colStrings.join('\n')}\n\t},`;
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const definitions = yield sql_ts_1.default.toObject(config);
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
    });
}
main().catch(error => {
    console.error('Fatal error', error);
    process.exit(1);
});
//# sourceMappingURL=generateTypes.js.map