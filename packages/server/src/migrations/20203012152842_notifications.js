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
    yield db.schema.createTable('notifications', (table) => {
        table.string('id', 32).unique().primary().notNullable();
        table.string('owner_id', 32).notNullable();
        table.integer('level').notNullable();
        table.text('key', 'string').notNullable();
        table.text('message', 'mediumtext').notNullable();
        table.integer('read').defaultTo(0).notNullable();
        table.integer('canBeDismissed').defaultTo(1).notNullable();
        table.bigInteger('updated_time').notNullable();
        table.bigInteger('created_time').notNullable();
    });
    yield db.schema.alterTable('notifications', (table) => {
        table.unique(['owner_id', 'key']);
    });
});
exports.up = up;
const down = (db) => __awaiter(void 0, void 0, void 0, function* () {
    yield db.schema.dropTable('notifications');
});
exports.down = down;
//# sourceMappingURL=20203012152842_notifications.js.map