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
function up(_db) {
    return __awaiter(this, void 0, void 0, function* () {
        // try {
        // 	await db.schema.alterTable('emails', function(table: Knex.CreateTableBuilder) {
        // 		table.dropUnique(['recipient_email', 'key']);
        // 	});
        // } catch (error) {
        // 	// console.warn('Could not drop unique constraint - this is not an error.', error);
        // }
    });
}
exports.up = up;
function down(_db) {
    return __awaiter(this, void 0, void 0, function* () {
    });
}
exports.down = down;
//# sourceMappingURL=20210809222118_email_key_fix.js.map