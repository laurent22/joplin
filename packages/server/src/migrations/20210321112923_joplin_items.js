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
        yield db.schema.createTable('joplin_file_contents', function (table) {
            table.string('id', 32).unique().primary().notNullable();
            table.string('owner_id', 32).notNullable();
            table.string('item_id', 32).notNullable();
            table.string('parent_id', 32).defaultTo('').notNullable();
            table.integer('type', 2).notNullable();
            table.bigInteger('updated_time').notNullable();
            table.bigInteger('created_time').notNullable();
            table.integer('encryption_applied', 1).notNullable();
            table.binary('content').defaultTo('').notNullable();
        });
        yield db.schema.alterTable('files', function (table) {
            table.integer('content_type', 2).defaultTo(1).notNullable();
            table.string('content_id', 32).defaultTo('').notNullable();
        });
    });
}
exports.up = up;
function down(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.dropTable('joplin_file_contents');
    });
}
exports.down = down;
//# sourceMappingURL=20210321112923_joplin_items.js.map