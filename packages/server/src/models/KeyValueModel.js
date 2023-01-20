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
exports.ValueType = void 0;
const db_1 = require("../db");
const time_1 = require("../utils/time");
const BaseModel_1 = require("./BaseModel");
var ValueType;
(function (ValueType) {
    ValueType[ValueType["Integer"] = 1] = "Integer";
    ValueType[ValueType["String"] = 2] = "String";
})(ValueType = exports.ValueType || (exports.ValueType = {}));
class KeyValueModel extends BaseModel_1.default {
    get tableName() {
        return 'key_values';
    }
    hasUuid() {
        return false;
    }
    autoTimestampEnabled() {
        return false;
    }
    valueType(value) {
        if (typeof value === 'number')
            return ValueType.Integer;
        if (typeof value === 'string')
            return ValueType.String;
        throw new Error(`Unsupported value type: ${typeof value}`);
    }
    serializeValue(value) {
        return value.toString();
    }
    unserializeValue(type, value) {
        if (type === ValueType.Integer)
            return Number(value);
        if (type === ValueType.String)
            return `${value}`;
        throw new Error(`Unsupported type: ${type}`);
    }
    setValue(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            const type = this.valueType(value);
            yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                yield this.db(this.tableName).where('key', '=', key).delete();
                yield this.db(this.tableName).insert({
                    key,
                    value: this.serializeValue(value),
                    type,
                });
            }), 'KeyValueModel::setValue');
        });
    }
    value(key, defaultValue = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield this.db(this.tableName).where('key', '=', key).first();
            if (!row)
                return defaultValue;
            return this.unserializeValue(row.type, row.value);
        });
    }
    readThenWrite(key, handler) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(0, db_1.returningSupported)(this.db)) {
                // While inside a transaction SQlite should lock the whole database
                // file, which should allow atomic read then write.
                yield this.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                    const value = yield this.value(key);
                    const newValue = yield handler(value);
                    yield this.setValue(key, newValue);
                }), 'KeyValueModel::readThenWrite');
                return;
            }
            let loopCount = 0;
            while (true) {
                const row = yield this.db(this.tableName).where('key', '=', key).first();
                const newValue = yield handler(row ? row.value : null);
                let previousValue = null;
                if (row) {
                    previousValue = row.value;
                }
                else {
                    yield this.setValue(key, newValue);
                    previousValue = newValue;
                }
                const updatedRows = yield this
                    .db(this.tableName)
                    .update({ value: newValue }, ['id'])
                    .where('key', '=', key)
                    .where('value', '=', previousValue);
                if (updatedRows.length)
                    return;
                loopCount++;
                if (loopCount >= 10)
                    throw new Error(`Could not update key: ${key}`);
                yield (0, time_1.msleep)(10000 * Math.random());
            }
        });
    }
    deleteValue(key) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db(this.tableName).where('key', '=', key).delete();
        });
    }
    delete(_id, _options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Call ::deleteValue()');
        });
    }
    deleteAll() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db(this.tableName).delete();
        });
    }
}
exports.default = KeyValueModel;
//# sourceMappingURL=KeyValueModel.js.map