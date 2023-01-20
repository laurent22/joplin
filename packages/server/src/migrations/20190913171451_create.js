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
const db_1 = require("../db");
const auth_1 = require("../utils/auth");
const uuidgen_1 = require("../utils/uuidgen");
function up(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.createTable('users', function (table) {
            table.string('id', 32).unique().primary().notNullable();
            table.text('email', 'mediumtext').unique().notNullable();
            table.text('password', 'mediumtext').notNullable();
            table.text('full_name', 'mediumtext').defaultTo('').notNullable();
            table.integer('is_admin').defaultTo(0).notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
        });
        yield db.schema.alterTable('users', function (table) {
            table.index(['email']);
        });
        yield db.schema.createTable('sessions', function (table) {
            table.string('id', 32).unique().primary().notNullable();
            table.string('user_id', 32).notNullable();
            table.string('auth_code', 32).defaultTo('').notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
        });
        yield db.schema.createTable('permissions', function (table) {
            table.string('id', 32).unique().primary().notNullable();
            table.string('user_id', 32).notNullable();
            table.integer('item_type').notNullable();
            table.string('item_id', 32).notNullable();
            table.integer('can_read').defaultTo(0).notNullable();
            table.integer('can_write').defaultTo(0).notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
        });
        yield db.schema.alterTable('permissions', function (table) {
            table.unique(['user_id', 'item_type', 'item_id']);
            table.index(['item_id']);
            table.index(['item_type', 'item_id']);
        });
        yield db.schema.createTable('files', function (table) {
            table.string('id', 32).unique().primary().notNullable();
            table.string('owner_id', 32).notNullable();
            table.text('name').notNullable();
            table.binary('content').defaultTo('').notNullable();
            table.string('mime_type', 128).defaultTo('application/octet-stream').notNullable();
            table.integer('size').defaultTo(0).notNullable();
            table.integer('is_directory').defaultTo(0).notNullable();
            table.integer('is_root').defaultTo(0).notNullable();
            table.string('parent_id', 32).defaultTo('').notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
        });
        yield db.schema.alterTable('files', function (table) {
            table.unique(['parent_id', 'name']);
            table.index(['parent_id']);
        });
        yield db.schema.createTable('changes', function (table) {
            // Note that in this table, the counter is the primary key, since
            // we want it to be automatically incremented. There's also a
            // column ID to publicly identify a change.
            table.increments('counter').unique().primary().notNullable();
            table.string('id', 32).unique().notNullable();
            table.string('owner_id', 32).notNullable();
            table.integer('item_type').notNullable();
            table.string('parent_id', 32).defaultTo('').notNullable();
            table.string('item_id', 32).notNullable();
            table.text('item_name').defaultTo('').notNullable();
            table.integer('type').notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
        });
        yield db.schema.alterTable('changes', function (table) {
            table.index(['id']);
            table.index(['parent_id']);
        });
        yield db.schema.createTable('api_clients', function (table) {
            table.string('id', 32).unique().primary().notNullable();
            table.string('name', 32).notNullable();
            table.string('secret', 32).notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
        });
        const adminId = (0, uuidgen_1.default)();
        const adminRootFileId = (0, uuidgen_1.default)();
        const now = Date.now();
        yield db('users').insert({
            id: adminId,
            email: db_1.defaultAdminEmail,
            password: (0, auth_1.hashPassword)(db_1.defaultAdminPassword),
            full_name: 'Admin',
            is_admin: 1,
            updated_time: now,
            created_time: now,
        });
        yield db('files').insert({
            id: adminRootFileId,
            owner_id: adminId,
            name: adminRootFileId,
            size: 0,
            is_directory: 1,
            is_root: 1,
            updated_time: now,
            created_time: now,
        });
        yield db('api_clients').insert({
            id: (0, uuidgen_1.default)(),
            name: 'Joplin',
            secret: 'sdrNUPtKNdY5Z5tF4bthqu',
            updated_time: now,
            created_time: now,
        });
    });
}
exports.up = up;
function down(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.dropTable('users');
        yield db.schema.dropTable('sessions');
        yield db.schema.dropTable('permissions');
        yield db.schema.dropTable('files');
        yield db.schema.dropTable('api_clients');
        yield db.schema.dropTable('changes');
    });
}
exports.down = down;
//# sourceMappingURL=20190913171451_create.js.map