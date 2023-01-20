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
        yield db.schema.alterTable('items', function (table) {
            table.bigInteger('jop_updated_time').defaultTo(0).notNullable();
        });
        while (true) {
            const items = yield db('items')
                .select('id', 'content')
                .where('jop_type', '>', 0)
                .andWhere('jop_updated_time', '=', 0)
                .limit(1000);
            if (!items.length)
                break;
            yield db.transaction((trx) => __awaiter(this, void 0, void 0, function* () {
                for (const item of items) {
                    const unserialized = JSON.parse(item.content);
                    yield trx('items').update({ jop_updated_time: unserialized.updated_time }).where('id', '=', item.id);
                }
            }));
        }
    });
}
exports.up = up;
function down(_db) {
    return __awaiter(this, void 0, void 0, function* () {
    });
}
exports.down = down;
//# sourceMappingURL=20210618192423_jop_updated_time.js.map