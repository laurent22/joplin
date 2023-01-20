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
// Email recipient_id was incorrectly set to "0" by default. This migration set
// it to an empty string by default, and update all rows that have "0" as
// recipient_id.
function up(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.alterTable('emails', (table) => {
            table.string('recipient_id', 32).defaultTo('').notNullable().alter();
        });
        yield db('emails').update({ recipient_id: '' }).where('recipient_id', '=', '0');
    });
}
exports.up = up;
function down(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.alterTable('emails', (table) => {
            table.string('recipient_id', 32).defaultTo(0).notNullable().alter();
        });
    });
}
exports.down = down;
//# sourceMappingURL=20220121172409_email_recipient_default.js.map