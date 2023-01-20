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
exports.down = exports.up = void 0;
// parent_id: ${'parent_id' in note ? note.parent_id : defaultFolderId}
// created_time: 2020-10-15T10:34:16.044Z
// updated_time: 2021-01-28T23:10:30.054Z
// is_conflict: 0
// latitude: 0.00000000
// longitude: 0.00000000
// altitude: 0.0000
// author:
// source_url:
// is_todo: 1
// todo_due: 1602760405000
// todo_completed: 0
// source: joplindev-desktop
// source_application: net.cozic.joplindev-desktop
// application_data:
// order: 0
// user_created_time: 2020-10-15T10:34:16.044Z
// user_updated_time: 2020-10-19T17:21:03.394Z
// encryption_cipher_text:
// encryption_applied: 0
// markup_language: 1
// is_shared: 1
// type_: 1`;
function up(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.createTable('items', function (table) {
            table.string('id', 32).unique().primary().notNullable();
            table.text('name').notNullable();
            table.string('mime_type', 128).defaultTo('application/octet-stream').notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
            table.binary('content').defaultTo('').notNullable();
            table.integer('content_size').defaultTo(0).notNullable();
            table.string('jop_id', 32).defaultTo('').notNullable();
            table.string('jop_parent_id', 32).defaultTo('').notNullable();
            table.string('jop_share_id', 32).defaultTo('').notNullable();
            table.integer('jop_type', 2).defaultTo(0).notNullable();
            table.integer('jop_encryption_applied', 1).defaultTo(0).notNullable();
        });
        yield db.schema.alterTable('items', function (table) {
            table.index('name');
            table.index('jop_id');
            table.index('jop_parent_id');
            table.index('jop_type');
            table.index('jop_share_id');
        });
        yield db.schema.createTable('user_items', function (table) {
            table.increments('id').unique().primary().notNullable();
            table.string('user_id', 32).notNullable();
            table.string('item_id', 32).notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
        });
        yield db.schema.alterTable('user_items', function (table) {
            table.unique(['user_id', 'item_id']);
            table.index('user_id');
            table.index('item_id');
        });
        yield db.schema.createTable('item_resources', function (table) {
            table.increments('id').unique().primary().notNullable();
            table.string('item_id', 32).notNullable();
            table.string('resource_id', 32).notNullable();
        });
        yield db.schema.alterTable('item_resources', function (table) {
            table.unique(['item_id', 'resource_id']);
            table.index(['item_id', 'resource_id']);
        });
        yield db.schema.createTable('key_values', function (table) {
            table.increments('id').unique().primary().notNullable();
            table.text('key').notNullable();
            table.integer('type').notNullable();
            table.text('value').notNullable();
        });
        yield db.schema.alterTable('key_values', function (table) {
            table.index(['key']);
        });
        yield db.schema.alterTable('shares', function (table) {
            table.dropColumn('is_auto');
            table.string('note_id', 32).defaultTo('').notNullable();
            table.index(['note_id']);
            table.index(['folder_id']);
            table.index(['item_id']);
        });
        yield db.schema.alterTable('changes', function (table) {
            table.text('previous_item').defaultTo('').notNullable();
            table.string('user_id', 32).defaultTo('').notNullable();
            table.dropColumn('owner_id');
            table.dropColumn('parent_id');
            table.index('user_id');
        });
        // Previous changes aren't relevant anymore since they relate to a "files"
        // table that is no longer used.
        yield db('changes').truncate();
        yield db.schema.dropTable('permissions');
        yield db.schema.dropTable('joplin_file_contents');
    });
}
exports.up = up;
function down(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.dropTable('items');
    });
}
exports.down = down;
//# sourceMappingURL=20210412110640_item_refactor.js.map