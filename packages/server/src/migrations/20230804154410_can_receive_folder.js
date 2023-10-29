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
const up = (db) => __awaiter(void 0, void 0, void 0, function* () {
    yield db.schema.alterTable('users', (table) => {
        table.specificType('can_receive_folder', 'smallint').defaultTo(null).nullable();
    });
});
exports.up = up;
const down = (db) => __awaiter(void 0, void 0, void 0, function* () {
    yield db.schema.alterTable('users', (table) => {
        table.dropColumn('can_receive_folder');
    });
});
exports.down = down;
//# sourceMappingURL=20230804154410_can_receive_folder.js.map