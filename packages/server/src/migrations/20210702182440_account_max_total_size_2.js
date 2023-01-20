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
        yield db.schema.alterTable('users', function (table) {
            table.integer('max_item_size').defaultTo(null).nullable();
            table.specificType('can_share_folder', 'smallint').defaultTo(null).nullable();
            table.specificType('can_share_note', 'smallint').defaultTo(null).nullable();
            table.bigInteger('max_total_item_size').defaultTo(null).nullable();
        });
        yield db.schema.alterTable('users', function (table) {
            table.integer('total_item_size').defaultTo(0).notNullable();
        });
    });
}
exports.up = up;
function down(_db) {
    return __awaiter(this, void 0, void 0, function* () {
    });
}
exports.down = down;
//# sourceMappingURL=20210702182440_account_max_total_size_2.js.map