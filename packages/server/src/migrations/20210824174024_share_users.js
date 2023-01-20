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
        yield db.schema.alterTable('share_users', (table) => {
            table.text('master_key', 'mediumtext').defaultTo('').notNullable();
        });
        yield db.schema.alterTable('shares', (table) => {
            table.string('master_key_id', 32).defaultTo('').notNullable();
        });
    });
}
exports.up = up;
function down(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.alterTable('share_users', (table) => {
            table.dropColumn('master_key');
        });
        yield db.schema.alterTable('shares', (table) => {
            table.dropColumn('master_key_id');
        });
    });
}
exports.down = down;
//# sourceMappingURL=20210824174024_share_users.js.map