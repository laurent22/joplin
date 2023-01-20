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
        yield db.schema.createTable('backup_items', (table) => {
            table.increments('id').unique().primary().notNullable();
            table.integer('type').notNullable();
            table.text('key', 'mediumtext').notNullable();
            table.string('user_id', 32).defaultTo('').notNullable();
            table.binary('content').notNullable();
            table.bigInteger('created_time').notNullable();
        });
    });
}
exports.up = up;
function down(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.dropTable('backup_items');
    });
}
exports.down = down;
//# sourceMappingURL=20220201151223_backup_items.js.map