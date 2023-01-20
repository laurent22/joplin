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
        yield db.schema.createTable('storages', (table) => {
            table.increments('id').unique().primary().notNullable();
            table.text('connection_string').notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
        });
        const now = Date.now();
        yield db('storages').insert({
            connection_string: 'Type=Database',
            updated_time: now,
            created_time: now,
        });
        // First we create the column and set a default so as to populate the
        // content_storage_id field.
        yield db.schema.alterTable('items', (table) => {
            table.integer('content_storage_id').defaultTo(1).notNullable();
        });
        // Once it's set, we remove the default as that should be explicitly set.
        yield db.schema.alterTable('items', (table) => {
            table.integer('content_storage_id').notNullable().alter();
        });
        yield db.schema.alterTable('storages', (table) => {
            table.unique(['connection_string']);
        });
    });
}
exports.up = up;
function down(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.dropTable('storages');
        yield db.schema.alterTable('items', (table) => {
            table.dropColumn('content_storage_id');
        });
    });
}
exports.down = down;
//# sourceMappingURL=20211105183559_storage.js.map