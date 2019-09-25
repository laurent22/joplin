"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var db_1 = require("../db");
var dbUtils_1 = require("../utils/dbUtils");
var uuidgen_1 = require("../utils/uuidgen");
var errors_1 = require("../utils/errors");
var cache_1 = require("../utils/cache");
var BaseModel = /** @class */ (function () {
    function BaseModel(options) {
        if (options === void 0) { options = null; }
        this.options_ = null;
        this.defaultFields_ = [];
        this.options_ = Object.assign({}, options);
        if ('userId' in this.options && !this.options.userId)
            throw new Error('If userId is set, it cannot be null');
    }
    Object.defineProperty(BaseModel.prototype, "options", {
        get: function () {
            return this.options_;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseModel.prototype, "userId", {
        get: function () {
            return this.options.userId;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseModel.prototype, "db", {
        get: function () {
            if (dbUtils_1.transactionHandler.activeTransaction)
                return dbUtils_1.transactionHandler.activeTransaction;
            return db_1.default;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseModel.prototype, "defaultFields", {
        get: function () {
            if (!this.defaultFields_.length) {
                this.defaultFields_ = Object.keys(db_1.databaseSchema[this.tableName]);
            }
            return this.defaultFields_.slice();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BaseModel.prototype, "tableName", {
        get: function () {
            throw new Error('Not implemented');
        },
        enumerable: true,
        configurable: true
    });
    BaseModel.prototype.hasDateProperties = function () {
        return true;
    };
    BaseModel.prototype.startTransaction = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, dbUtils_1.transactionHandler.start()];
            });
        });
    };
    BaseModel.prototype.commitTransaction = function (txIndex) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, dbUtils_1.transactionHandler.commit(txIndex)];
            });
        });
    };
    BaseModel.prototype.rollbackTransaction = function (txIndex) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, dbUtils_1.transactionHandler.rollback(txIndex)];
            });
        });
    };
    BaseModel.prototype.all = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                return [2 /*return*/, (_a = this.db(this.tableName)).select.apply(_a, this.defaultFields)];
            });
        });
    };
    BaseModel.prototype.fromApiInput = function (object) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, object];
            });
        });
    };
    BaseModel.prototype.toApiOutput = function (object) {
        return __assign({}, object);
    };
    BaseModel.prototype.validate = function (object, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!options.isNew && !object.id)
                    throw new errors_1.ErrorUnprocessableEntity('id is missing');
                return [2 /*return*/, object];
            });
        });
    };
    BaseModel.prototype.isNew = function (object, options) {
        if (options.isNew === false)
            return false;
        if (options.isNew === true)
            return true;
        return !object.id;
    };
    BaseModel.prototype.save = function (object, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var toSave, isNew, timestamp, objectId, updatedCount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!object)
                            throw new Error('Object cannot be empty');
                        toSave = Object.assign({}, object);
                        isNew = this.isNew(object, options);
                        if (isNew && !toSave.id) {
                            toSave.id = uuidgen_1.default();
                        }
                        if (this.hasDateProperties()) {
                            timestamp = Date.now();
                            if (isNew) {
                                toSave.created_time = timestamp;
                            }
                            toSave.updated_time = timestamp;
                        }
                        if (!(options.skipValidation !== true)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.validate(object, { isNew: isNew })];
                    case 1:
                        object = _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!isNew) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.db(this.tableName).insert(toSave)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 4:
                        objectId = toSave.id;
                        if (!objectId)
                            throw new Error('Missing "id" property');
                        return [4 /*yield*/, cache_1.default.delete(objectId)];
                    case 5:
                        _a.sent();
                        delete toSave.id;
                        return [4 /*yield*/, this.db(this.tableName).update(toSave).where({ id: objectId })];
                    case 6:
                        updatedCount = _a.sent();
                        toSave.id = objectId;
                        // Sanity check:
                        if (updatedCount !== 1)
                            throw new errors_1.ErrorBadRequest("one row should have been updated, but " + updatedCount + " row(s) were updated");
                        _a.label = 7;
                    case 7: return [2 /*return*/, toSave];
                }
            });
        });
    };
    BaseModel.prototype.load = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var cached;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!id)
                            throw new Error('id cannot be empty');
                        if (!(typeof id === 'string'))
                            throw new Error('ItemId support must be implemented in sub-class');
                        return [4 /*yield*/, cache_1.default.object(id)];
                    case 1:
                        cached = _a.sent();
                        if (cached)
                            return [2 /*return*/, cached];
                        return [4 /*yield*/, this.db(this.tableName).select(this.defaultFields).where({ id: id }).first()];
                    case 2:
                        cached = _a.sent();
                        return [4 /*yield*/, cache_1.default.setObject(id, cached)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, cached];
                }
            });
        });
    };
    BaseModel.prototype.delete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var ids, query, i, deletedCount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!id)
                            throw new Error('id cannot be empty');
                        if (!(typeof id === 'string') && !Array.isArray(id))
                            throw new Error('ItemId support must be implemented in sub-class');
                        ids = typeof id === 'string' ? [id] : id;
                        if (!ids.length)
                            throw new Error('no id provided');
                        query = this.db(this.tableName).where({ id: ids[0] });
                        for (i = 1; i < ids.length; i++)
                            query.orWhere({ id: ids[i] });
                        return [4 /*yield*/, cache_1.default.delete(ids)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, query.del()];
                    case 2:
                        deletedCount = _a.sent();
                        if (deletedCount !== ids.length)
                            throw new Error(ids.length + " row(s) should have been deleted by " + deletedCount + " row(s) were deleted");
                        return [2 /*return*/];
                }
            });
        });
    };
    return BaseModel;
}());
exports.default = BaseModel;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFFLENBQUMsRUFBRTs0QkFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBRW5FLHFCQUFNLGVBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUE7O3dCQUF2QixTQUF1QixDQUFDO3dCQUVILHFCQUFNLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBQTs7d0JBQWhDLFlBQVksR0FBRyxTQUFpQjt3QkFDdEMsSUFBSSxZQUFZLEtBQUssR0FBRyxDQUFDLE1BQU07NEJBQUUsTUFBTSxJQUFJLEtBQUssQ0FBSSxHQUFHLENBQUMsTUFBTSw0Q0FBdUMsWUFBWSx5QkFBc0IsQ0FBQyxDQUFDOzs7OztLQUN6STtJQUVGLGdCQUFDO0FBQUQsQ0EvSUEsQUErSUMsSUFBQSIsImZpbGUiOiJCYXNlTW9kZWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZGIsIHsgV2l0aERhdGVzLCBXaXRoVXVpZCwgRmlsZSwgVXNlciwgU2Vzc2lvbiwgUGVybWlzc2lvbiwgZGF0YWJhc2VTY2hlbWEsIEl0ZW1JZCB9IGZyb20gJy4uL2RiJztcbmltcG9ydCAqIGFzIEtuZXggZnJvbSAna25leCc7XG5pbXBvcnQgeyB0cmFuc2FjdGlvbkhhbmRsZXIgfSBmcm9tICcuLi91dGlscy9kYlV0aWxzJztcbmltcG9ydCB1dWlkZ2VuIGZyb20gJy4uL3V0aWxzL3V1aWRnZW4nO1xuaW1wb3J0IHsgRXJyb3JVbnByb2Nlc3NhYmxlRW50aXR5LCBFcnJvckJhZFJlcXVlc3QgfSBmcm9tICcuLi91dGlscy9lcnJvcnMnO1xuaW1wb3J0IGNhY2hlIGZyb20gJy4uL3V0aWxzL2NhY2hlJztcblxuZXhwb3J0IGludGVyZmFjZSBNb2RlbE9wdGlvbnMge1xuXHR1c2VySWQ/OiBzdHJpbmdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTYXZlT3B0aW9ucyB7XG5cdGlzTmV3PzogYm9vbGVhbixcblx0c2tpcFZhbGlkYXRpb24/OiBib29sZWFuLFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFZhbGlkYXRlT3B0aW9ucyB7XG5cdGlzTmV3PzogYm9vbGVhblxufVxuXG5leHBvcnQgZGVmYXVsdCBhYnN0cmFjdCBjbGFzcyBCYXNlTW9kZWwge1xuXG5cdHByaXZhdGUgb3B0aW9uc186TW9kZWxPcHRpb25zID0gbnVsbDtcblx0cHJpdmF0ZSBkZWZhdWx0RmllbGRzXzpzdHJpbmdbXSA9IFtdO1xuXG5cdGNvbnN0cnVjdG9yKG9wdGlvbnM6TW9kZWxPcHRpb25zID0gbnVsbCkge1xuXHRcdHRoaXMub3B0aW9uc18gPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zKTtcblxuXHRcdGlmICgndXNlcklkJyBpbiB0aGlzLm9wdGlvbnMgJiYgIXRoaXMub3B0aW9ucy51c2VySWQpIHRocm93IG5ldyBFcnJvcignSWYgdXNlcklkIGlzIHNldCwgaXQgY2Fubm90IGJlIG51bGwnKTtcblx0fVxuXG5cdGdldCBvcHRpb25zKCk6TW9kZWxPcHRpb25zIHtcblx0XHRyZXR1cm4gdGhpcy5vcHRpb25zXztcblx0fVxuXG5cdGdldCB1c2VySWQoKTpzdHJpbmcge1xuXHRcdHJldHVybiB0aGlzLm9wdGlvbnMudXNlcklkO1xuXHR9XG5cblx0Z2V0IGRiKCk6S25leDxhbnksIGFueVtdPiB7XG5cdFx0aWYgKHRyYW5zYWN0aW9uSGFuZGxlci5hY3RpdmVUcmFuc2FjdGlvbikgcmV0dXJuIHRyYW5zYWN0aW9uSGFuZGxlci5hY3RpdmVUcmFuc2FjdGlvbjtcblx0XHRyZXR1cm4gZGI7XG5cdH1cblxuXHRnZXQgZGVmYXVsdEZpZWxkcygpOnN0cmluZ1tdIHtcblx0XHRpZiAoIXRoaXMuZGVmYXVsdEZpZWxkc18ubGVuZ3RoKSB7XG5cdFx0XHR0aGlzLmRlZmF1bHRGaWVsZHNfID0gT2JqZWN0LmtleXMoZGF0YWJhc2VTY2hlbWFbdGhpcy50YWJsZU5hbWVdKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuZGVmYXVsdEZpZWxkc18uc2xpY2UoKTtcblx0fVxuXG5cdGdldCB0YWJsZU5hbWUoKTpzdHJpbmcge1xuXHRcdHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG5cdH1cblxuXHRoYXNEYXRlUHJvcGVydGllcygpOmJvb2xlYW4ge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0YXN5bmMgc3RhcnRUcmFuc2FjdGlvbigpOlByb21pc2U8bnVtYmVyPiB7XG5cdFx0cmV0dXJuIHRyYW5zYWN0aW9uSGFuZGxlci5zdGFydCgpO1xuXHR9XG5cblx0YXN5bmMgY29tbWl0VHJhbnNhY3Rpb24odHhJbmRleDpudW1iZXIpOlByb21pc2U8dm9pZD4ge1xuXHRcdHJldHVybiB0cmFuc2FjdGlvbkhhbmRsZXIuY29tbWl0KHR4SW5kZXgpO1xuXHR9XG5cblx0YXN5bmMgcm9sbGJhY2tUcmFuc2FjdGlvbih0eEluZGV4Om51bWJlcik6UHJvbWlzZTx2b2lkPiB7XG5cdFx0cmV0dXJuIHRyYW5zYWN0aW9uSGFuZGxlci5yb2xsYmFjayh0eEluZGV4KTtcblx0fVxuXG5cdGFzeW5jIGFsbCgpOlByb21pc2U8RmlsZVtdIHwgVXNlcltdIHwgU2Vzc2lvbltdIHwgUGVybWlzc2lvbltdPiB7XG5cdFx0cmV0dXJuIHRoaXMuZGIodGhpcy50YWJsZU5hbWUpLnNlbGVjdCguLi50aGlzLmRlZmF1bHRGaWVsZHMpO1xuXHR9XG5cblx0YXN5bmMgZnJvbUFwaUlucHV0KG9iamVjdDpGaWxlIHwgVXNlciB8IFNlc3Npb24gfCBQZXJtaXNzaW9uKTpQcm9taXNlPEZpbGUgfCBVc2VyIHwgU2Vzc2lvbiB8IFBlcm1pc3Npb24+IHtcblx0XHRyZXR1cm4gb2JqZWN0O1xuXHR9XG5cblx0dG9BcGlPdXRwdXQob2JqZWN0OmFueSk6YW55IHtcblx0XHRyZXR1cm4geyAuLi5vYmplY3QgfTtcblx0fVxuXG5cdGFzeW5jIHZhbGlkYXRlKG9iamVjdDpGaWxlIHwgVXNlciB8IFNlc3Npb24gfCBQZXJtaXNzaW9uLCBvcHRpb25zOlZhbGlkYXRlT3B0aW9ucyA9IHt9KTpQcm9taXNlPEZpbGUgfCBVc2VyIHwgU2Vzc2lvbiB8IFBlcm1pc3Npb24+IHtcblx0XHRpZiAoIW9wdGlvbnMuaXNOZXcgJiYgIShvYmplY3QgYXMgV2l0aFV1aWQpLmlkKSB0aHJvdyBuZXcgRXJyb3JVbnByb2Nlc3NhYmxlRW50aXR5KCdpZCBpcyBtaXNzaW5nJyk7XG5cdFx0cmV0dXJuIG9iamVjdDtcblx0fVxuXG5cdGlzTmV3KG9iamVjdDpGaWxlIHwgVXNlciB8IFNlc3Npb24gfCBQZXJtaXNzaW9uLCBvcHRpb25zOlNhdmVPcHRpb25zKTpib29sZWFuIHtcblx0XHRpZiAob3B0aW9ucy5pc05ldyA9PT0gZmFsc2UpIHJldHVybiBmYWxzZTtcblx0XHRpZiAob3B0aW9ucy5pc05ldyA9PT0gdHJ1ZSkgcmV0dXJuIHRydWU7XG5cdFx0cmV0dXJuICEob2JqZWN0IGFzIFdpdGhVdWlkKS5pZDtcblx0fVxuXG5cdGFzeW5jIHNhdmUob2JqZWN0OkZpbGUgfCBVc2VyIHwgU2Vzc2lvbiB8IFBlcm1pc3Npb24sIG9wdGlvbnM6U2F2ZU9wdGlvbnMgPSB7fSk6UHJvbWlzZTxGaWxlIHwgVXNlciB8IFNlc3Npb24gfCBQZXJtaXNzaW9uPiB7XG5cdFx0aWYgKCFvYmplY3QpIHRocm93IG5ldyBFcnJvcignT2JqZWN0IGNhbm5vdCBiZSBlbXB0eScpO1xuXG5cdFx0Y29uc3QgdG9TYXZlID0gT2JqZWN0LmFzc2lnbih7fSwgb2JqZWN0KTtcblxuXHRcdGNvbnN0IGlzTmV3ID0gdGhpcy5pc05ldyhvYmplY3QsIG9wdGlvbnMpO1xuXG5cdFx0aWYgKGlzTmV3ICYmICEodG9TYXZlIGFzIFdpdGhVdWlkKS5pZCkge1xuXHRcdFx0KHRvU2F2ZSBhcyBXaXRoVXVpZCkuaWQgPSB1dWlkZ2VuKCk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuaGFzRGF0ZVByb3BlcnRpZXMoKSkge1xuXHRcdFx0Y29uc3QgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcblx0XHRcdGlmIChpc05ldykge1xuXHRcdFx0XHQodG9TYXZlIGFzIFdpdGhEYXRlcykuY3JlYXRlZF90aW1lID0gdGltZXN0YW1wO1xuXHRcdFx0fVxuXHRcdFx0KHRvU2F2ZSBhcyBXaXRoRGF0ZXMpLnVwZGF0ZWRfdGltZSA9IHRpbWVzdGFtcDtcblx0XHR9XG5cblx0XHRpZiAob3B0aW9ucy5za2lwVmFsaWRhdGlvbiAhPT0gdHJ1ZSkgb2JqZWN0ID0gYXdhaXQgdGhpcy52YWxpZGF0ZShvYmplY3QsIHsgaXNOZXc6IGlzTmV3IH0pO1xuXG5cdFx0aWYgKGlzTmV3KSB7XG5cdFx0XHRhd2FpdCB0aGlzLmRiKHRoaXMudGFibGVOYW1lKS5pbnNlcnQodG9TYXZlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc3Qgb2JqZWN0SWQ6c3RyaW5nID0gKHRvU2F2ZSBhcyBXaXRoVXVpZCkuaWQ7XG5cdFx0XHRpZiAoIW9iamVjdElkKSB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgXCJpZFwiIHByb3BlcnR5Jyk7XG5cdFx0XHRhd2FpdCBjYWNoZS5kZWxldGUob2JqZWN0SWQpO1xuXHRcdFx0ZGVsZXRlICh0b1NhdmUgYXMgV2l0aFV1aWQpLmlkO1xuXHRcdFx0Y29uc3QgdXBkYXRlZENvdW50Om51bWJlciA9IGF3YWl0IHRoaXMuZGIodGhpcy50YWJsZU5hbWUpLnVwZGF0ZSh0b1NhdmUpLndoZXJlKHtpZDogb2JqZWN0SWQgfSk7XG5cdFx0XHR0b1NhdmUuaWQgPSBvYmplY3RJZDtcblxuXHRcdFx0Ly8gU2FuaXR5IGNoZWNrOlxuXHRcdFx0aWYgKHVwZGF0ZWRDb3VudCAhPT0gMSkgdGhyb3cgbmV3IEVycm9yQmFkUmVxdWVzdChgb25lIHJvdyBzaG91bGQgaGF2ZSBiZWVuIHVwZGF0ZWQsIGJ1dCAke3VwZGF0ZWRDb3VudH0gcm93KHMpIHdlcmUgdXBkYXRlZGApO1xuXHRcdH1cblxuXHRcdHJldHVybiB0b1NhdmU7XG5cdH1cblxuXHRhc3luYyBsb2FkKGlkOnN0cmluZyB8IEl0ZW1JZCk6UHJvbWlzZTxGaWxlIHwgVXNlciB8IFNlc3Npb24gfCBQZXJtaXNzaW9uPiB7XG5cdFx0aWYgKCFpZCkgdGhyb3cgbmV3IEVycm9yKCdpZCBjYW5ub3QgYmUgZW1wdHknKTtcblxuXHRcdGlmICghKHR5cGVvZiBpZCA9PT0gJ3N0cmluZycpKSB0aHJvdyBuZXcgRXJyb3IoJ0l0ZW1JZCBzdXBwb3J0IG11c3QgYmUgaW1wbGVtZW50ZWQgaW4gc3ViLWNsYXNzJyk7XG5cblx0XHRsZXQgY2FjaGVkOm9iamVjdCA9IGF3YWl0IGNhY2hlLm9iamVjdChpZCk7XG5cdFx0aWYgKGNhY2hlZCkgcmV0dXJuIGNhY2hlZDtcblxuXHRcdGNhY2hlZCA9IGF3YWl0IHRoaXMuZGIodGhpcy50YWJsZU5hbWUpLnNlbGVjdCh0aGlzLmRlZmF1bHRGaWVsZHMpLndoZXJlKHsgaWQ6IGlkIH0pLmZpcnN0KCk7XG5cdFx0YXdhaXQgY2FjaGUuc2V0T2JqZWN0KGlkLCBjYWNoZWQpO1xuXHRcdHJldHVybiBjYWNoZWQ7XG5cdH1cblxuXHRhc3luYyBkZWxldGUoaWQ6c3RyaW5nIHwgc3RyaW5nW10gfCBJdGVtSWQpOlByb21pc2U8dm9pZD4ge1xuXHRcdGlmICghaWQpIHRocm93IG5ldyBFcnJvcignaWQgY2Fubm90IGJlIGVtcHR5Jyk7XG5cblx0XHRpZiAoISh0eXBlb2YgaWQgPT09ICdzdHJpbmcnKSAmJiAhQXJyYXkuaXNBcnJheShpZCkpIHRocm93IG5ldyBFcnJvcignSXRlbUlkIHN1cHBvcnQgbXVzdCBiZSBpbXBsZW1lbnRlZCBpbiBzdWItY2xhc3MnKTtcblxuXHRcdGNvbnN0IGlkcyA9IHR5cGVvZiBpZCA9PT0gJ3N0cmluZycgPyBbaWRdIDogaWQ7XG5cblx0XHRpZiAoIWlkcy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcignbm8gaWQgcHJvdmlkZWQnKTtcblxuXHRcdGNvbnN0IHF1ZXJ5ID0gdGhpcy5kYih0aGlzLnRhYmxlTmFtZSkud2hlcmUoeyBpZDogaWRzWzBdIH0pO1xuXHRcdGZvciAobGV0IGkgPSAxOyBpIDwgaWRzLmxlbmd0aDsgaSsrKSBxdWVyeS5vcldoZXJlKHsgaWQ6IGlkc1tpXSB9KTtcblxuXHRcdGF3YWl0IGNhY2hlLmRlbGV0ZShpZHMpO1xuXG5cdFx0Y29uc3QgZGVsZXRlZENvdW50ID0gYXdhaXQgcXVlcnkuZGVsKCk7XG5cdFx0aWYgKGRlbGV0ZWRDb3VudCAhPT0gaWRzLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKGAke2lkcy5sZW5ndGh9IHJvdyhzKSBzaG91bGQgaGF2ZSBiZWVuIGRlbGV0ZWQgYnkgJHtkZWxldGVkQ291bnR9IHJvdyhzKSB3ZXJlIGRlbGV0ZWRgKTtcblx0fVxuXG59XG4iXX0=
