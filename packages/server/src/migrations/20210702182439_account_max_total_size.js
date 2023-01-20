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
// Due to a bug in Knex.js, it is not possible to drop a column and
// recreate it in the same migration. So this is split into two migrations.
// https://github.com/knex/knex/issues/2581
function up(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.alterTable('users', function (table) {
            table.dropColumn('max_item_size');
            table.dropColumn('can_share_folder');
            table.dropColumn('can_share_note');
        });
    });
}
exports.up = up;
function down(_db) {
    return __awaiter(this, void 0, void 0, function* () {
    });
}
exports.down = down;
//# sourceMappingURL=20210702182439_account_max_total_size.js.map