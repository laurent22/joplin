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
const BaseModel_1 = require("./BaseModel");
class EventModel extends BaseModel_1.default {
    get tableName() {
        return 'events';
    }
    autoTimestampEnabled() {
        return false;
    }
    uuidType() {
        return BaseModel_1.UuidType.Native;
    }
    create(type, name = '') {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.save({
                name,
                type,
                created_time: Date.now(),
            });
        });
    }
    lastEventByTypeAndName(type, name) {
        return __awaiter(this, void 0, void 0, function* () {
            return this
                .db(this.tableName)
                .where('type', '=', type)
                .where('name', '=', name)
                .orderBy('counter', 'desc')
                .first();
        });
    }
}
exports.default = EventModel;
//# sourceMappingURL=EventModel.js.map