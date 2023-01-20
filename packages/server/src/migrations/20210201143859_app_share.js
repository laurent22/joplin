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
function up(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.createTable('share_users', function (table) {
            table.string('id', 32).unique().primary().notNullable();
            table.string('share_id', 32).notNullable();
            table.string('user_id', 32).notNullable();
            table.integer('status').defaultTo(0).notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
        });
        yield db.schema.alterTable('share_users', function (table) {
            table.unique(['share_id', 'user_id']);
        });
        yield db.schema.alterTable('files', function (table) {
            table.string('source_file_id', 32).defaultTo('').notNullable();
        });
        yield db.schema.alterTable('files', function (table) {
            table.index(['owner_id']);
            table.index(['source_file_id']);
        });
        yield db.schema.alterTable('changes', function (table) {
            table.index(['item_id']);
        });
        yield db.schema.dropTable('shares');
        yield db.schema.createTable('shares', function (table) {
            table.string('id', 32).unique().primary().notNullable();
            table.string('owner_id', 32).notNullable();
            table.string('item_id', 32).notNullable();
            table.integer('type').notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
        });
    });
}
exports.up = up;
function down(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.dropTable('share_users');
    });
}
exports.down = down;
//# sourceMappingURL=20210201143859_app_share.js.map