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
const time_1 = require("../utils/time");
function up(db) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(yield db.schema.hasColumn('items', 'owner_id'))) {
            yield db.schema.alterTable('items', (table) => {
                table.string('owner_id', 32).defaultTo('').notNullable();
            });
        }
        const pageSize = 1000;
        const itemCount = (yield db('items')
            .count('id', { as: 'total' })
            .where('owner_id', '=', '')
            .first())['total'];
        let itemDone = 0;
        while (true) {
            const items = yield db('items')
                .join('user_items', 'items.id', 'user_items.item_id')
                .select(['items.id', 'user_items.user_id'])
                .where('owner_id', '=', '')
                .limit(pageSize);
            if (!items.length)
                break;
            console.info(`Processing items ${itemDone} / ${itemCount}`);
            yield db.transaction((trx) => __awaiter(this, void 0, void 0, function* () {
                for (const item of items) {
                    yield trx('items').update({ owner_id: item.user_id }).where('id', '=', item.id);
                }
            }));
            itemDone += items.length;
            yield (0, time_1.msleep)(10000);
        }
        yield db.schema.alterTable('items', (table) => {
            table.string('owner_id', 32).notNullable().alter();
        });
    });
}
exports.up = up;
function down(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.schema.alterTable('items', (table) => {
            table.dropColumn('owner_id');
        });
    });
}
exports.down = down;
//# sourceMappingURL=20211027112530_item_owner.js.map