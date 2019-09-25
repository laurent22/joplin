"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var BaseModel_1 = require("./BaseModel");
var db_1 = require("../db");
var UserModel_1 = require("./UserModel");
var ReadOrWriteKeys;
(function (ReadOrWriteKeys) {
    ReadOrWriteKeys["CanRead"] = "can_read";
    ReadOrWriteKeys["CanWrite"] = "can_write";
})(ReadOrWriteKeys || (ReadOrWriteKeys = {}));
var PermissionModel = /** @class */ (function (_super) {
    __extends(PermissionModel, _super);
    function PermissionModel() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(PermissionModel.prototype, "tableName", {
        get: function () {
            return 'permissions';
        },
        enumerable: true,
        configurable: true
    });
    PermissionModel.prototype.filePermissions = function (fileId, userId) {
        if (userId === void 0) { userId = null; }
        return __awaiter(this, void 0, void 0, function () {
            var p;
            return __generator(this, function (_a) {
                p = {
                    item_type: db_1.ItemType.File,
                    item_id: fileId,
                };
                if (userId)
                    p.user_id = userId;
                return [2 /*return*/, this.db(this.tableName).where(p).select()];
            });
        });
    };
    PermissionModel.prototype.canReadOrWrite = function (fileId, userId, method) {
        return __awaiter(this, void 0, void 0, function () {
            var permissions, _i, permissions_1, p, userModel, owner;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!userId || !fileId)
                            return [2 /*return*/, false];
                        return [4 /*yield*/, this.filePermissions(fileId, userId)];
                    case 1:
                        permissions = _a.sent();
                        for (_i = 0, permissions_1 = permissions; _i < permissions_1.length; _i++) {
                            p = permissions_1[_i];
                            if (p[method] || p.is_owner)
                                return [2 /*return*/, true];
                        }
                        userModel = new UserModel_1.default({ userId: userId });
                        return [4 /*yield*/, userModel.load(userId)];
                    case 2:
                        owner = _a.sent();
                        if (owner.is_admin)
                            return [2 /*return*/, true];
                        return [2 /*return*/, false];
                }
            });
        });
    };
    PermissionModel.prototype.canRead = function (fileId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.canReadOrWrite(fileId, userId, ReadOrWriteKeys.CanRead)];
            });
        });
    };
    PermissionModel.prototype.canWrite = function (fileId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.canReadOrWrite(fileId, userId, ReadOrWriteKeys.CanWrite)];
            });
        });
    };
    PermissionModel.prototype.deleteByFileId = function (fileId) {
        return __awaiter(this, void 0, void 0, function () {
            var permissions, ids;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.filePermissions(fileId)];
                    case 1:
                        permissions = _a.sent();
                        ids = permissions.map(function (m) { return m.id; });
                        _super.prototype.delete.call(this, ids);
                        return [2 /*return*/];
                }
            });
        });
    };
    return PermissionModel;
}(BaseModel_1.default));
exports.default = PermissionModel;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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bnQiOlsiaW1wb3J0IEJhc2VNb2RlbCBmcm9tICcuL0Jhc2VNb2RlbCc7XG5pbXBvcnQgeyBQZXJtaXNzaW9uLCBJdGVtVHlwZSwgVXNlciB9IGZyb20gJy4uL2RiJztcbmltcG9ydCBVc2VyTW9kZWwgZnJvbSAnLi9Vc2VyTW9kZWwnO1xuXG5lbnVtIFJlYWRPcldyaXRlS2V5cyB7XG5cdENhblJlYWQgPSAnY2FuX3JlYWQnLFxuXHRDYW5Xcml0ZSA9ICdjYW5fd3JpdGUnLFxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQZXJtaXNzaW9uTW9kZWwgZXh0ZW5kcyBCYXNlTW9kZWwge1xuXG5cdGdldCB0YWJsZU5hbWUoKTpzdHJpbmcge1xuXHRcdHJldHVybiAncGVybWlzc2lvbnMnO1xuXHR9XG5cblx0YXN5bmMgZmlsZVBlcm1pc3Npb25zKGZpbGVJZDpzdHJpbmcsIHVzZXJJZDpzdHJpbmcgPSBudWxsKTpQcm9taXNlPEFycmF5PFBlcm1pc3Npb24+PiB7XG5cdFx0Y29uc3QgcDpQZXJtaXNzaW9uID0ge1xuXHRcdFx0aXRlbV90eXBlOiBJdGVtVHlwZS5GaWxlLFxuXHRcdFx0aXRlbV9pZDogZmlsZUlkLFxuXHRcdH07XG5cblx0XHRpZiAodXNlcklkKSBwLnVzZXJfaWQgPSB1c2VySWQ7XG5cblx0XHRyZXR1cm4gdGhpcy5kYjxQZXJtaXNzaW9uPih0aGlzLnRhYmxlTmFtZSkud2hlcmUocCkuc2VsZWN0KCk7XG5cdH1cblxuXHRwcml2YXRlIGFzeW5jIGNhblJlYWRPcldyaXRlKGZpbGVJZDpzdHJpbmcsIHVzZXJJZDpzdHJpbmcsIG1ldGhvZDpSZWFkT3JXcml0ZUtleXMpOlByb21pc2U8Ym9vbGVhbj4ge1xuXHRcdGlmICghdXNlcklkIHx8ICFmaWxlSWQpIHJldHVybiBmYWxzZTtcblx0XHRjb25zdCBwZXJtaXNzaW9ucyA9IGF3YWl0IHRoaXMuZmlsZVBlcm1pc3Npb25zKGZpbGVJZCwgdXNlcklkKTtcblx0XHRmb3IgKGNvbnN0IHAgb2YgcGVybWlzc2lvbnMpIHtcblx0XHRcdGlmIChwW21ldGhvZF0gfHwgcC5pc19vd25lcikgcmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlck1vZGVsID0gbmV3IFVzZXJNb2RlbCh7IHVzZXJJZDogdXNlcklkIH0pO1xuXHRcdGNvbnN0IG93bmVyOlVzZXIgPSBhd2FpdCB1c2VyTW9kZWwubG9hZCh1c2VySWQpO1xuXHRcdGlmIChvd25lci5pc19hZG1pbikgcmV0dXJuIHRydWU7XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRhc3luYyBjYW5SZWFkKGZpbGVJZDpzdHJpbmcsIHVzZXJJZDpzdHJpbmcpOlByb21pc2U8Ym9vbGVhbj4ge1xuXHRcdHJldHVybiB0aGlzLmNhblJlYWRPcldyaXRlKGZpbGVJZCwgdXNlcklkLCBSZWFkT3JXcml0ZUtleXMuQ2FuUmVhZCk7XG5cdH1cblxuXHRhc3luYyBjYW5Xcml0ZShmaWxlSWQ6c3RyaW5nLCB1c2VySWQ6c3RyaW5nKTpQcm9taXNlPGJvb2xlYW4+IHtcblx0XHRyZXR1cm4gdGhpcy5jYW5SZWFkT3JXcml0ZShmaWxlSWQsIHVzZXJJZCwgUmVhZE9yV3JpdGVLZXlzLkNhbldyaXRlKTtcblx0fVxuXG5cdGFzeW5jIGRlbGV0ZUJ5RmlsZUlkKGZpbGVJZDpzdHJpbmcpOlByb21pc2U8dm9pZD4ge1xuXHRcdGNvbnN0IHBlcm1pc3Npb25zID0gYXdhaXQgdGhpcy5maWxlUGVybWlzc2lvbnMoZmlsZUlkKTtcblx0XHRjb25zdCBpZHMgPSBwZXJtaXNzaW9ucy5tYXAobSA9PiBtLmlkKTtcblx0XHRzdXBlci5kZWxldGUoaWRzKTtcblx0fVxuXG59XG4iXX0=
