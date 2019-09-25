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
var BaseModel_1 = require("./BaseModel");
var PermissionModel_1 = require("./PermissionModel");
var db_1 = require("../db");
var errors_1 = require("../utils/errors");
var uuidgen_1 = require("../utils/uuidgen");
var routeUtils_1 = require("../utils/routeUtils");
var nodeEnv = process.env.NODE_ENV || 'development';
var FileModel = /** @class */ (function (_super) {
    __extends(FileModel, _super);
    function FileModel() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(FileModel.prototype, "tableName", {
        get: function () {
            return 'files';
        },
        enumerable: true,
        configurable: true
    });
    FileModel.prototype.userRootFile = function () {
        return __awaiter(this, void 0, void 0, function () {
            var r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.db(this.tableName).select('files.id').from(this.tableName).leftJoin('permissions', 'permissions.item_id', 'files.id').where({
                            'item_type': db_1.ItemType.File,
                            'user_id': this.userId,
                            'is_root': 1,
                        }).first()];
                    case 1:
                        r = _a.sent();
                        if (!r)
                            return [2 /*return*/, null];
                        return [2 /*return*/, this.load(r.id)];
                }
            });
        });
    };
    FileModel.prototype.userRootFileId = function () {
        return __awaiter(this, void 0, void 0, function () {
            var r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.userRootFile()];
                    case 1:
                        r = _a.sent();
                        return [2 /*return*/, r ? r.id : ''];
                }
            });
        });
    };
    FileModel.prototype.fileOwnerId = function (fileId) {
        return __awaiter(this, void 0, void 0, function () {
            var r;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.db('permissions').select('permissions.user_id').where({
                            'item_type': db_1.ItemType.File,
                            'item_id': fileId,
                            'is_owner': 1,
                        }).first()];
                    case 1:
                        r = _a.sent();
                        if (!r)
                            return [2 /*return*/, null];
                        return [2 /*return*/, r.user_id];
                }
            });
        });
    };
    Object.defineProperty(FileModel.prototype, "defaultFields", {
        get: function () {
            return Object.keys(db_1.databaseSchema[this.tableName]).filter(function (f) { return f !== 'content'; });
        },
        enumerable: true,
        configurable: true
    });
    FileModel.prototype.allByParent = function (parentId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!parentId) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.userRootFileId()];
                    case 1:
                        parentId = _b.sent();
                        _b.label = 2;
                    case 2: return [2 /*return*/, (_a = this.db(this.tableName)).select.apply(_a, this.defaultFields).where({ parent_id: parentId })];
                }
            });
        });
    };
    FileModel.prototype.fileByName = function (parentId, name) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                return [2 /*return*/, (_a = this.db(this.tableName)).select.apply(_a, this.defaultFields).where({
                        parent_id: parentId,
                        name: name,
                    }).first()];
            });
        });
    };
    FileModel.prototype.validate = function (object, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var file, parentId, invalidParentError, parentFile, error_1, permissionModel, canWrite, existingFile;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        file = object;
                        if (options.isNew) {
                            if (!file.is_root && !file.name)
                                throw new errors_1.ErrorUnprocessableEntity('name cannot be empty');
                        }
                        else {
                            if ('name' in file && !file.name)
                                throw new errors_1.ErrorUnprocessableEntity('name cannot be empty');
                        }
                        parentId = file.parent_id;
                        if (!!parentId) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.userRootFileId()];
                    case 1:
                        parentId = _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!('parent_id' in file && !file.is_root)) return [3 /*break*/, 8];
                        invalidParentError = function (extraInfo) {
                            var msg = "Invalid parent ID or no permission to write to it: " + parentId;
                            if (nodeEnv !== 'production')
                                msg += " (" + extraInfo + ")";
                            return new errors_1.ErrorForbidden(msg);
                        };
                        if (!parentId)
                            throw invalidParentError('No parent ID');
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.load(parentId)];
                    case 4:
                        parentFile = _a.sent();
                        if (!parentFile)
                            throw invalidParentError('Cannot load parent file');
                        if (!parentFile.is_directory)
                            throw invalidParentError('Specified parent is not a directory');
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _a.sent();
                        if (error_1.message.indexOf('Invalid parent') === 0)
                            throw error_1;
                        throw invalidParentError("Unknown: " + error_1.message);
                    case 6:
                        permissionModel = new PermissionModel_1.default();
                        return [4 /*yield*/, permissionModel.canWrite(parentId, this.userId)];
                    case 7:
                        canWrite = _a.sent();
                        if (!canWrite)
                            throw invalidParentError('Cannot write to file');
                        _a.label = 8;
                    case 8:
                        if (!('name' in file && !file.is_root)) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.fileByName(parentId, file.name)];
                    case 9:
                        existingFile = _a.sent();
                        if (existingFile && options.isNew)
                            throw new errors_1.ErrorUnprocessableEntity("Already a file with name \"" + file.name + "\"");
                        if (existingFile && file.id === existingFile.id)
                            throw new errors_1.ErrorUnprocessableEntity("Already a file with name \"" + file.name + "\"");
                        _a.label = 10;
                    case 10: return [2 /*return*/, file];
                }
            });
        });
    };
    FileModel.prototype.fromApiInput = function (object) {
        return __awaiter(this, void 0, void 0, function () {
            var file;
            return __generator(this, function (_a) {
                file = {};
                if ('id' in object)
                    file.id = object.id;
                if ('name' in object)
                    file.name = object.name;
                if ('parent_id' in object)
                    file.parent_id = object.parent_id;
                if ('mime_type' in object)
                    file.mime_type = object.mime_type;
                return [2 /*return*/, file];
            });
        });
    };
    FileModel.prototype.toApiOutput = function (object) {
        var output = __assign({}, object);
        delete output.content;
        return output;
    };
    FileModel.prototype.createRootFile = function () {
        return __awaiter(this, void 0, void 0, function () {
            var existingRootFile, fileModel, id;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.userRootFile()];
                    case 1:
                        existingRootFile = _a.sent();
                        if (existingRootFile)
                            throw new Error("User " + this.userId + " has already a root file");
                        fileModel = new FileModel({ userId: this.userId });
                        id = uuidgen_1.default();
                        return [2 /*return*/, fileModel.save({
                                id: id,
                                is_directory: 1,
                                is_root: 1,
                                name: id,
                            }, { isNew: true })];
                }
            });
        });
    };
    FileModel.prototype.checkCanReadPermissions = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var permissionModel, canRead;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        permissionModel = new PermissionModel_1.default();
                        return [4 /*yield*/, permissionModel.canRead(id, this.userId)];
                    case 1:
                        canRead = _a.sent();
                        if (!canRead)
                            throw new errors_1.ErrorForbidden();
                        return [2 /*return*/];
                }
            });
        });
    };
    FileModel.prototype.pathToFiles = function (path, mustExist) {
        if (mustExist === void 0) { mustExist = true; }
        return __awaiter(this, void 0, void 0, function () {
            var filenames, output, parent, i, filename, file;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        filenames = routeUtils_1.splitItemPath(path);
                        output = [];
                        parent = null;
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < filenames.length)) return [3 /*break*/, 7];
                        filename = filenames[i];
                        file = null;
                        if (!(i === 0)) return [3 /*break*/, 3];
                        // For now we only support "root" as a root component, but potentially it could
                        // be any special directory like "documents", "pictures", etc.
                        if (filename !== 'root')
                            throw new errors_1.ErrorBadRequest("unknown path root component: " + filename);
                        return [4 /*yield*/, this.userRootFile()];
                    case 2:
                        file = _a.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.fileByName(parent.id, filename)];
                    case 4:
                        file = _a.sent();
                        _a.label = 5;
                    case 5:
                        if (!file && !mustExist)
                            return [2 /*return*/, []];
                        if (!file)
                            throw new errors_1.ErrorNotFound("file not found: \"" + filename + "\" on parent \"" + (parent ? parent.name : '') + "\"");
                        output.push(file);
                        parent = __assign({}, file);
                        _a.label = 6;
                    case 6:
                        i++;
                        return [3 /*break*/, 1];
                    case 7: return [2 /*return*/, output];
                }
            });
        });
    };
    FileModel.prototype.idFromItemId = function (id, mustExist) {
        if (mustExist === void 0) { mustExist = true; }
        return __awaiter(this, void 0, void 0, function () {
            var itemId, files;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (typeof id === 'string')
                            return [2 /*return*/, id];
                        itemId = id;
                        if (!(itemId.addressingType === db_1.ItemAddressingType.Id)) return [3 /*break*/, 1];
                        return [2 /*return*/, itemId.value];
                    case 1: return [4 /*yield*/, this.pathToFiles(itemId.value, mustExist)];
                    case 2:
                        files = _a.sent();
                        if (!files.length && !mustExist)
                            return [2 /*return*/, ''];
                        if (!files.length)
                            throw new errors_1.ErrorNotFound("invalid path: " + itemId.value);
                        return [2 /*return*/, files[files.length - 1].id];
                }
            });
        });
    };
    FileModel.prototype.loadWithContent = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var idString, file;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.idFromItemId(id)];
                    case 1:
                        idString = _a.sent();
                        return [4 /*yield*/, this.checkCanReadPermissions(idString)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.db(this.tableName).select('*').where({ id: idString }).first()];
                    case 3:
                        file = _a.sent();
                        return [2 /*return*/, file];
                }
            });
        });
    };
    FileModel.prototype.load = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var idString;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.idFromItemId(id)];
                    case 1:
                        idString = _a.sent();
                        return [4 /*yield*/, this.checkCanReadPermissions(idString)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, _super.prototype.load.call(this, idString)];
                }
            });
        });
    };
    FileModel.prototype.save = function (object, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var isNew, txIndex, file, _a, permission, permissionModel, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        isNew = this.isNew(object, options);
                        return [4 /*yield*/, this.startTransaction()];
                    case 1:
                        txIndex = _b.sent();
                        file = __assign({}, object);
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 8, , 10]);
                        if (!(!file.parent_id && !file.is_root)) return [3 /*break*/, 4];
                        _a = file;
                        return [4 /*yield*/, this.userRootFileId()];
                    case 3:
                        _a.parent_id = _b.sent();
                        _b.label = 4;
                    case 4:
                        if ('content' in file)
                            file.size = file.content ? file.content.byteLength : 0;
                        return [4 /*yield*/, _super.prototype.save.call(this, file, options)];
                    case 5:
                        file = _b.sent();
                        if (!isNew) return [3 /*break*/, 7];
                        permission = {
                            user_id: this.options.userId,
                            is_owner: 1,
                            item_type: db_1.ItemType.File,
                            item_id: file.id,
                            can_read: 1,
                            can_write: 1,
                        };
                        permissionModel = new PermissionModel_1.default();
                        return [4 /*yield*/, permissionModel.save(permission)];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7: return [3 /*break*/, 10];
                    case 8:
                        error_2 = _b.sent();
                        return [4 /*yield*/, this.rollbackTransaction(txIndex)];
                    case 9:
                        _b.sent();
                        throw error_2;
                    case 10: return [4 /*yield*/, this.commitTransaction(txIndex)];
                    case 11:
                        _b.sent();
                        return [2 /*return*/, file];
                }
            });
        });
    };
    FileModel.prototype.delete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var idString, permissionModel, canWrite, txIndex, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.idFromItemId(id)];
                    case 1:
                        idString = _a.sent();
                        permissionModel = new PermissionModel_1.default();
                        return [4 /*yield*/, permissionModel.canWrite(idString, this.userId)];
                    case 2:
                        canWrite = _a.sent();
                        if (!canWrite)
                            throw new errors_1.ErrorForbidden();
                        return [4 /*yield*/, this.startTransaction()];
                    case 3:
                        txIndex = _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 7, , 9]);
                        return [4 /*yield*/, permissionModel.deleteByFileId(idString)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, _super.prototype.delete.call(this, idString)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 7:
                        error_3 = _a.sent();
                        return [4 /*yield*/, this.rollbackTransaction(txIndex)];
                    case 8:
                        _a.sent();
                        throw error_3;
                    case 9: return [4 /*yield*/, this.commitTransaction(txIndex)];
                    case 10:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return FileModel;
}(BaseModel_1.default));
exports.default = FileModel;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUE7O3dCQUFyQyxTQUFxQyxDQUFDO3dCQUV0QyxzQkFBTyxJQUFJLEVBQUM7Ozs7S0FDWjtJQUVLLDBCQUFNLEdBQVosVUFBYSxFQUFrQjs7Ozs7NEJBQ2IscUJBQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsRUFBQTs7d0JBQXRDLFFBQVEsR0FBRyxTQUEyQjt3QkFFdEMsZUFBZSxHQUFHLElBQUkseUJBQWUsRUFBRSxDQUFDO3dCQUNyQixxQkFBTSxlQUFlLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUE7O3dCQUF4RSxRQUFRLEdBQVcsU0FBcUQ7d0JBQzlFLElBQUksQ0FBQyxRQUFROzRCQUFFLE1BQU0sSUFBSSx1QkFBYyxFQUFFLENBQUM7d0JBRTFCLHFCQUFNLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFBOzt3QkFBdkMsT0FBTyxHQUFHLFNBQTZCOzs7O3dCQUc1QyxxQkFBTSxlQUFlLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFBOzt3QkFBOUMsU0FBOEMsQ0FBQzt3QkFDL0MscUJBQU0saUJBQU0sTUFBTSxZQUFDLFFBQVEsQ0FBQyxFQUFBOzt3QkFBNUIsU0FBNEIsQ0FBQzs7Ozt3QkFFN0IscUJBQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxFQUFBOzt3QkFBdkMsU0FBdUMsQ0FBQzt3QkFDeEMsTUFBTSxPQUFLLENBQUM7NEJBR2IscUJBQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxFQUFBOzt3QkFBckMsU0FBcUMsQ0FBQzs7Ozs7S0FDdEM7SUFFRixnQkFBQztBQUFELENBdlBBLEFBdVBDLENBdlBzQyxtQkFBUyxHQXVQL0MiLCJmaWxlIjoiRmlsZU1vZGVsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IEJhc2VNb2RlbCwgeyBWYWxpZGF0ZU9wdGlvbnMsIFNhdmVPcHRpb25zIH0gZnJvbSAnLi9CYXNlTW9kZWwnO1xuaW1wb3J0IFBlcm1pc3Npb25Nb2RlbCBmcm9tICcuL1Blcm1pc3Npb25Nb2RlbCc7XG5pbXBvcnQgeyBGaWxlLCBQZXJtaXNzaW9uLCBJdGVtVHlwZSwgZGF0YWJhc2VTY2hlbWEsIEl0ZW1JZCwgSXRlbUFkZHJlc3NpbmdUeXBlIH0gZnJvbSAnLi4vZGInO1xuaW1wb3J0IHsgRXJyb3JGb3JiaWRkZW4sIEVycm9yVW5wcm9jZXNzYWJsZUVudGl0eSwgRXJyb3JOb3RGb3VuZCwgRXJyb3JCYWRSZXF1ZXN0IH0gZnJvbSAnLi4vdXRpbHMvZXJyb3JzJztcbmltcG9ydCB1dWlkZ2VuIGZyb20gJy4uL3V0aWxzL3V1aWRnZW4nO1xuaW1wb3J0IHsgc3BsaXRJdGVtUGF0aCB9IGZyb20gJy4uL3V0aWxzL3JvdXRlVXRpbHMnO1xuXG5jb25zdCBub2RlRW52ID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgfHwgJ2RldmVsb3BtZW50JztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRmlsZU1vZGVsIGV4dGVuZHMgQmFzZU1vZGVsIHtcblxuXHRnZXQgdGFibGVOYW1lKCk6c3RyaW5nIHtcblx0XHRyZXR1cm4gJ2ZpbGVzJztcblx0fVxuXG5cdGFzeW5jIHVzZXJSb290RmlsZSgpOlByb21pc2U8RmlsZT4ge1xuXHRcdGNvbnN0IHIgPSBhd2FpdCB0aGlzLmRiKHRoaXMudGFibGVOYW1lKS5zZWxlY3QoJ2ZpbGVzLmlkJykuZnJvbSh0aGlzLnRhYmxlTmFtZSkubGVmdEpvaW4oJ3Blcm1pc3Npb25zJywgJ3Blcm1pc3Npb25zLml0ZW1faWQnLCAnZmlsZXMuaWQnKS53aGVyZSh7XG5cdFx0XHQnaXRlbV90eXBlJzogSXRlbVR5cGUuRmlsZSxcblx0XHRcdCd1c2VyX2lkJzogdGhpcy51c2VySWQsXG5cdFx0XHQnaXNfcm9vdCc6IDEsXG5cdFx0fSkuZmlyc3QoKTtcblxuXHRcdGlmICghcikgcmV0dXJuIG51bGw7XG5cblx0XHRyZXR1cm4gdGhpcy5sb2FkKHIuaWQpO1xuXHR9XG5cblx0YXN5bmMgdXNlclJvb3RGaWxlSWQoKTpQcm9taXNlPHN0cmluZz4ge1xuXHRcdGNvbnN0IHIgPSBhd2FpdCB0aGlzLnVzZXJSb290RmlsZSgpO1xuXHRcdHJldHVybiByID8gci5pZCA6ICcnO1xuXHR9XG5cblx0YXN5bmMgZmlsZU93bmVySWQoZmlsZUlkOnN0cmluZyk6UHJvbWlzZTxzdHJpbmc+IHtcblx0XHRjb25zdCByID0gYXdhaXQgdGhpcy5kYigncGVybWlzc2lvbnMnKS5zZWxlY3QoJ3Blcm1pc3Npb25zLnVzZXJfaWQnKS53aGVyZSh7XG5cdFx0XHQnaXRlbV90eXBlJzogSXRlbVR5cGUuRmlsZSxcblx0XHRcdCdpdGVtX2lkJzogZmlsZUlkLFxuXHRcdFx0J2lzX293bmVyJzogMSxcblx0XHR9KS5maXJzdCgpO1xuXG5cdFx0aWYgKCFyKSByZXR1cm4gbnVsbDtcblxuXHRcdHJldHVybiByLnVzZXJfaWQ7XG5cdH1cblxuXHRnZXQgZGVmYXVsdEZpZWxkcygpOnN0cmluZ1tdIHtcblx0XHRyZXR1cm4gT2JqZWN0LmtleXMoZGF0YWJhc2VTY2hlbWFbdGhpcy50YWJsZU5hbWVdKS5maWx0ZXIoZiA9PiBmICE9PSAnY29udGVudCcpO1xuXHR9XG5cblx0YXN5bmMgYWxsQnlQYXJlbnQocGFyZW50SWQ6c3RyaW5nKTpQcm9taXNlPEZpbGVbXT4ge1xuXHRcdGlmICghcGFyZW50SWQpIHBhcmVudElkID0gYXdhaXQgdGhpcy51c2VyUm9vdEZpbGVJZCgpO1xuXHRcdHJldHVybiB0aGlzLmRiKHRoaXMudGFibGVOYW1lKS5zZWxlY3QoLi4udGhpcy5kZWZhdWx0RmllbGRzKS53aGVyZSh7IHBhcmVudF9pZDogcGFyZW50SWQgfSk7XG5cdH1cblxuXHRhc3luYyBmaWxlQnlOYW1lKHBhcmVudElkOnN0cmluZywgbmFtZTpzdHJpbmcpOlByb21pc2U8RmlsZT4ge1xuXHRcdHJldHVybiB0aGlzLmRiPEZpbGU+KHRoaXMudGFibGVOYW1lKS5zZWxlY3QoLi4udGhpcy5kZWZhdWx0RmllbGRzKS53aGVyZSh7XG5cdFx0XHRwYXJlbnRfaWQ6IHBhcmVudElkLFxuXHRcdFx0bmFtZTogbmFtZSxcblx0XHR9KS5maXJzdCgpO1xuXHR9XG5cblx0YXN5bmMgdmFsaWRhdGUob2JqZWN0OkZpbGUsIG9wdGlvbnM6VmFsaWRhdGVPcHRpb25zID0ge30pOlByb21pc2U8RmlsZT4ge1xuXHRcdGNvbnN0IGZpbGU6RmlsZSA9IG9iamVjdDtcblxuXHRcdGlmIChvcHRpb25zLmlzTmV3KSB7XG5cdFx0XHRpZiAoIWZpbGUuaXNfcm9vdCAmJiAhZmlsZS5uYW1lKSB0aHJvdyBuZXcgRXJyb3JVbnByb2Nlc3NhYmxlRW50aXR5KCduYW1lIGNhbm5vdCBiZSBlbXB0eScpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoJ25hbWUnIGluIGZpbGUgJiYgIWZpbGUubmFtZSkgdGhyb3cgbmV3IEVycm9yVW5wcm9jZXNzYWJsZUVudGl0eSgnbmFtZSBjYW5ub3QgYmUgZW1wdHknKTtcblx0XHR9XG5cblx0XHRsZXQgcGFyZW50SWQgPSBmaWxlLnBhcmVudF9pZDtcblx0XHRpZiAoIXBhcmVudElkKSBwYXJlbnRJZCA9IGF3YWl0IHRoaXMudXNlclJvb3RGaWxlSWQoKTtcblxuXHRcdGlmICgncGFyZW50X2lkJyBpbiBmaWxlICYmICFmaWxlLmlzX3Jvb3QpIHtcblx0XHRcdGNvbnN0IGludmFsaWRQYXJlbnRFcnJvciA9IGZ1bmN0aW9uKGV4dHJhSW5mbzpzdHJpbmcpIHtcblx0XHRcdFx0bGV0IG1zZyA9IGBJbnZhbGlkIHBhcmVudCBJRCBvciBubyBwZXJtaXNzaW9uIHRvIHdyaXRlIHRvIGl0OiAke3BhcmVudElkfWA7XG5cdFx0XHRcdGlmIChub2RlRW52ICE9PSAncHJvZHVjdGlvbicpIG1zZyArPSBgICgke2V4dHJhSW5mb30pYDtcblx0XHRcdFx0cmV0dXJuIG5ldyBFcnJvckZvcmJpZGRlbihtc2cpO1xuXHRcdFx0fTtcblxuXHRcdFx0aWYgKCFwYXJlbnRJZCkgdGhyb3cgaW52YWxpZFBhcmVudEVycm9yKCdObyBwYXJlbnQgSUQnKTtcblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Y29uc3QgcGFyZW50RmlsZTpGaWxlID0gYXdhaXQgdGhpcy5sb2FkKHBhcmVudElkKTtcblx0XHRcdFx0aWYgKCFwYXJlbnRGaWxlKSB0aHJvdyBpbnZhbGlkUGFyZW50RXJyb3IoJ0Nhbm5vdCBsb2FkIHBhcmVudCBmaWxlJyk7XG5cdFx0XHRcdGlmICghcGFyZW50RmlsZS5pc19kaXJlY3RvcnkpIHRocm93IGludmFsaWRQYXJlbnRFcnJvcignU3BlY2lmaWVkIHBhcmVudCBpcyBub3QgYSBkaXJlY3RvcnknKTtcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdGlmIChlcnJvci5tZXNzYWdlLmluZGV4T2YoJ0ludmFsaWQgcGFyZW50JykgPT09IDApIHRocm93IGVycm9yO1xuXHRcdFx0XHR0aHJvdyBpbnZhbGlkUGFyZW50RXJyb3IoYFVua25vd246ICR7ZXJyb3IubWVzc2FnZX1gKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgcGVybWlzc2lvbk1vZGVsID0gbmV3IFBlcm1pc3Npb25Nb2RlbCgpO1xuXG5cdFx0XHRjb25zdCBjYW5Xcml0ZTpib29sZWFuID0gYXdhaXQgcGVybWlzc2lvbk1vZGVsLmNhbldyaXRlKHBhcmVudElkLCB0aGlzLnVzZXJJZCk7XG5cdFx0XHRpZiAoIWNhbldyaXRlKSB0aHJvdyBpbnZhbGlkUGFyZW50RXJyb3IoJ0Nhbm5vdCB3cml0ZSB0byBmaWxlJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCduYW1lJyBpbiBmaWxlICYmICFmaWxlLmlzX3Jvb3QpIHtcblx0XHRcdGNvbnN0IGV4aXN0aW5nRmlsZSA9IGF3YWl0IHRoaXMuZmlsZUJ5TmFtZShwYXJlbnRJZCwgZmlsZS5uYW1lKTtcblx0XHRcdGlmIChleGlzdGluZ0ZpbGUgJiYgb3B0aW9ucy5pc05ldykgdGhyb3cgbmV3IEVycm9yVW5wcm9jZXNzYWJsZUVudGl0eShgQWxyZWFkeSBhIGZpbGUgd2l0aCBuYW1lIFwiJHtmaWxlLm5hbWV9XCJgKTtcblx0XHRcdGlmIChleGlzdGluZ0ZpbGUgJiYgZmlsZS5pZCA9PT0gZXhpc3RpbmdGaWxlLmlkKSB0aHJvdyBuZXcgRXJyb3JVbnByb2Nlc3NhYmxlRW50aXR5KGBBbHJlYWR5IGEgZmlsZSB3aXRoIG5hbWUgXCIke2ZpbGUubmFtZX1cImApO1xuXHRcdH1cblxuXHRcdHJldHVybiBmaWxlO1xuXHR9XG5cblx0YXN5bmMgZnJvbUFwaUlucHV0KG9iamVjdDpGaWxlKTpQcm9taXNlPEZpbGU+IHtcblx0XHRjb25zdCBmaWxlOkZpbGUgPSB7fTtcblxuXHRcdGlmICgnaWQnIGluIG9iamVjdCkgZmlsZS5pZCA9IG9iamVjdC5pZDtcblx0XHRpZiAoJ25hbWUnIGluIG9iamVjdCkgZmlsZS5uYW1lID0gb2JqZWN0Lm5hbWU7XG5cdFx0aWYgKCdwYXJlbnRfaWQnIGluIG9iamVjdCkgZmlsZS5wYXJlbnRfaWQgPSBvYmplY3QucGFyZW50X2lkO1xuXHRcdGlmICgnbWltZV90eXBlJyBpbiBvYmplY3QpIGZpbGUubWltZV90eXBlID0gb2JqZWN0Lm1pbWVfdHlwZTtcblxuXHRcdHJldHVybiBmaWxlO1xuXHR9XG5cblx0dG9BcGlPdXRwdXQob2JqZWN0OmFueSk6YW55IHtcblx0XHRjb25zdCBvdXRwdXQ6RmlsZSA9IHsgLi4ub2JqZWN0IH07XG5cdFx0ZGVsZXRlIG91dHB1dC5jb250ZW50O1xuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHRhc3luYyBjcmVhdGVSb290RmlsZSgpOlByb21pc2U8RmlsZT4ge1xuXHRcdGNvbnN0IGV4aXN0aW5nUm9vdEZpbGUgPSBhd2FpdCB0aGlzLnVzZXJSb290RmlsZSgpO1xuXHRcdGlmIChleGlzdGluZ1Jvb3RGaWxlKSB0aHJvdyBuZXcgRXJyb3IoYFVzZXIgJHt0aGlzLnVzZXJJZH0gaGFzIGFscmVhZHkgYSByb290IGZpbGVgKTtcblxuXHRcdGNvbnN0IGZpbGVNb2RlbCA9IG5ldyBGaWxlTW9kZWwoeyB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG5cdFx0Y29uc3QgaWQgPSB1dWlkZ2VuKCk7XG5cblx0XHRyZXR1cm4gZmlsZU1vZGVsLnNhdmUoe1xuXHRcdFx0aWQ6IGlkLFxuXHRcdFx0aXNfZGlyZWN0b3J5OiAxLFxuXHRcdFx0aXNfcm9vdDogMSxcblx0XHRcdG5hbWU6IGlkLCAvLyBOYW1lIG11c3QgYmUgdW5pcXVlIHNvIHdlIHNldCBpdCB0byB0aGUgSURcblx0XHR9LCB7IGlzTmV3OiB0cnVlIH0pO1xuXHR9XG5cblx0cHJpdmF0ZSBhc3luYyBjaGVja0NhblJlYWRQZXJtaXNzaW9ucyhpZDpzdHJpbmcpOlByb21pc2U8dm9pZD4ge1xuXHRcdGNvbnN0IHBlcm1pc3Npb25Nb2RlbCA9IG5ldyBQZXJtaXNzaW9uTW9kZWwoKTtcblx0XHRjb25zdCBjYW5SZWFkOmJvb2xlYW4gPSBhd2FpdCBwZXJtaXNzaW9uTW9kZWwuY2FuUmVhZChpZCwgdGhpcy51c2VySWQpO1xuXHRcdGlmICghY2FuUmVhZCkgdGhyb3cgbmV3IEVycm9yRm9yYmlkZGVuKCk7XG5cdH1cblxuXHRwcml2YXRlIGFzeW5jIHBhdGhUb0ZpbGVzKHBhdGg6c3RyaW5nLCBtdXN0RXhpc3Q6Ym9vbGVhbiA9IHRydWUpOlByb21pc2U8RmlsZVtdPiB7XG5cdFx0Y29uc3QgZmlsZW5hbWVzID0gc3BsaXRJdGVtUGF0aChwYXRoKTtcblx0XHRjb25zdCBvdXRwdXQ6RmlsZVtdID0gW107XG5cdFx0bGV0IHBhcmVudDpGaWxlID0gbnVsbDtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgZmlsZW5hbWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRjb25zdCBmaWxlbmFtZSA9IGZpbGVuYW1lc1tpXTtcblx0XHRcdGxldCBmaWxlOkZpbGUgPSBudWxsO1xuXHRcdFx0aWYgKGkgPT09IDApIHtcblx0XHRcdFx0Ly8gRm9yIG5vdyB3ZSBvbmx5IHN1cHBvcnQgXCJyb290XCIgYXMgYSByb290IGNvbXBvbmVudCwgYnV0IHBvdGVudGlhbGx5IGl0IGNvdWxkXG5cdFx0XHRcdC8vIGJlIGFueSBzcGVjaWFsIGRpcmVjdG9yeSBsaWtlIFwiZG9jdW1lbnRzXCIsIFwicGljdHVyZXNcIiwgZXRjLlxuXHRcdFx0XHRpZiAoZmlsZW5hbWUgIT09ICdyb290JykgdGhyb3cgbmV3IEVycm9yQmFkUmVxdWVzdChgdW5rbm93biBwYXRoIHJvb3QgY29tcG9uZW50OiAke2ZpbGVuYW1lfWApO1xuXHRcdFx0XHRmaWxlID0gYXdhaXQgdGhpcy51c2VyUm9vdEZpbGUoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZpbGUgPSBhd2FpdCB0aGlzLmZpbGVCeU5hbWUocGFyZW50LmlkLCBmaWxlbmFtZSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghZmlsZSAmJiAhbXVzdEV4aXN0KSByZXR1cm4gW107XG5cblx0XHRcdGlmICghZmlsZSkgdGhyb3cgbmV3IEVycm9yTm90Rm91bmQoYGZpbGUgbm90IGZvdW5kOiBcIiR7ZmlsZW5hbWV9XCIgb24gcGFyZW50IFwiJHtwYXJlbnQgPyBwYXJlbnQubmFtZSA6ICcnfVwiYCk7XG5cblx0XHRcdG91dHB1dC5wdXNoKGZpbGUpO1xuXHRcdFx0cGFyZW50ID0gey4uLmZpbGV9O1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHRhc3luYyBpZEZyb21JdGVtSWQoaWQ6c3RyaW5nIHwgSXRlbUlkLCBtdXN0RXhpc3Q6Ym9vbGVhbiA9IHRydWUpOlByb21pc2U8c3RyaW5nPiB7XG5cdFx0aWYgKHR5cGVvZiBpZCA9PT0gJ3N0cmluZycpIHJldHVybiBpZDtcblxuXHRcdGNvbnN0IGl0ZW1JZCA9IGlkIGFzIEl0ZW1JZDtcblx0XHRpZiAoaXRlbUlkLmFkZHJlc3NpbmdUeXBlID09PSBJdGVtQWRkcmVzc2luZ1R5cGUuSWQpIHtcblx0XHRcdHJldHVybiBpdGVtSWQudmFsdWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IGZpbGVzID0gYXdhaXQgdGhpcy5wYXRoVG9GaWxlcyhpdGVtSWQudmFsdWUsIG11c3RFeGlzdCk7XG5cdFx0XHRpZiAoIWZpbGVzLmxlbmd0aCAmJiAhbXVzdEV4aXN0KSByZXR1cm4gJyc7XG5cdFx0XHRpZiAoIWZpbGVzLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yTm90Rm91bmQoYGludmFsaWQgcGF0aDogJHtpdGVtSWQudmFsdWV9YCk7XG5cdFx0XHRyZXR1cm4gZmlsZXNbZmlsZXMubGVuZ3RoIC0gMV0uaWQ7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgbG9hZFdpdGhDb250ZW50KGlkOnN0cmluZyB8IEl0ZW1JZCk6UHJvbWlzZTxhbnk+IHtcblx0XHRjb25zdCBpZFN0cmluZyA9IGF3YWl0IHRoaXMuaWRGcm9tSXRlbUlkKGlkKTtcblx0XHRhd2FpdCB0aGlzLmNoZWNrQ2FuUmVhZFBlcm1pc3Npb25zKGlkU3RyaW5nKTtcblx0XHRjb25zdCBmaWxlOkZpbGUgPSBhd2FpdCB0aGlzLmRiPEZpbGU+KHRoaXMudGFibGVOYW1lKS5zZWxlY3QoJyonKS53aGVyZSh7IGlkOiBpZFN0cmluZyB9KS5maXJzdCgpO1xuXHRcdHJldHVybiBmaWxlO1xuXHR9XG5cblx0YXN5bmMgbG9hZChpZDpzdHJpbmcgfCBJdGVtSWQpOlByb21pc2U8RmlsZT4ge1xuXHRcdGNvbnN0IGlkU3RyaW5nID0gYXdhaXQgdGhpcy5pZEZyb21JdGVtSWQoaWQpO1xuXHRcdGF3YWl0IHRoaXMuY2hlY2tDYW5SZWFkUGVybWlzc2lvbnMoaWRTdHJpbmcpO1xuXHRcdHJldHVybiBzdXBlci5sb2FkKGlkU3RyaW5nKTtcblx0fVxuXG5cdGFzeW5jIHNhdmUob2JqZWN0OkZpbGUsIG9wdGlvbnM6U2F2ZU9wdGlvbnMgPSB7fSk6UHJvbWlzZTxGaWxlPiB7XG5cdFx0Y29uc3QgaXNOZXcgPSB0aGlzLmlzTmV3KG9iamVjdCwgb3B0aW9ucyk7XG5cblx0XHRjb25zdCB0eEluZGV4ID0gYXdhaXQgdGhpcy5zdGFydFRyYW5zYWN0aW9uKCk7XG5cblx0XHRsZXQgZmlsZTpGaWxlID0geyAuLi4gb2JqZWN0IH07XG5cblx0XHR0cnkge1xuXHRcdFx0aWYgKCFmaWxlLnBhcmVudF9pZCAmJiAhZmlsZS5pc19yb290KSBmaWxlLnBhcmVudF9pZCA9IGF3YWl0IHRoaXMudXNlclJvb3RGaWxlSWQoKTtcblxuXHRcdFx0aWYgKCdjb250ZW50JyBpbiBmaWxlKSBmaWxlLnNpemUgPSBmaWxlLmNvbnRlbnQgPyBmaWxlLmNvbnRlbnQuYnl0ZUxlbmd0aCA6IDA7XG5cblx0XHRcdGZpbGUgPSBhd2FpdCBzdXBlci5zYXZlKGZpbGUsIG9wdGlvbnMpO1xuXG5cdFx0XHRpZiAoaXNOZXcpIHtcblx0XHRcdFx0Y29uc3QgcGVybWlzc2lvbjpQZXJtaXNzaW9uID0ge1xuXHRcdFx0XHRcdHVzZXJfaWQ6IHRoaXMub3B0aW9ucy51c2VySWQsXG5cdFx0XHRcdFx0aXNfb3duZXI6IDEsXG5cdFx0XHRcdFx0aXRlbV90eXBlOiBJdGVtVHlwZS5GaWxlLFxuXHRcdFx0XHRcdGl0ZW1faWQ6IGZpbGUuaWQsXG5cdFx0XHRcdFx0Y2FuX3JlYWQ6IDEsXG5cdFx0XHRcdFx0Y2FuX3dyaXRlOiAxLFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGNvbnN0IHBlcm1pc3Npb25Nb2RlbCA9IG5ldyBQZXJtaXNzaW9uTW9kZWwoKTtcblx0XHRcdFx0YXdhaXQgcGVybWlzc2lvbk1vZGVsLnNhdmUocGVybWlzc2lvbik7XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdGF3YWl0IHRoaXMucm9sbGJhY2tUcmFuc2FjdGlvbih0eEluZGV4KTtcblx0XHRcdHRocm93IGVycm9yO1xuXHRcdH1cblxuXHRcdGF3YWl0IHRoaXMuY29tbWl0VHJhbnNhY3Rpb24odHhJbmRleCk7XG5cblx0XHRyZXR1cm4gZmlsZTtcblx0fVxuXG5cdGFzeW5jIGRlbGV0ZShpZDpzdHJpbmcgfCBJdGVtSWQpOlByb21pc2U8dm9pZD4ge1xuXHRcdGNvbnN0IGlkU3RyaW5nID0gYXdhaXQgdGhpcy5pZEZyb21JdGVtSWQoaWQpO1xuXG5cdFx0Y29uc3QgcGVybWlzc2lvbk1vZGVsID0gbmV3IFBlcm1pc3Npb25Nb2RlbCgpO1xuXHRcdGNvbnN0IGNhbldyaXRlOmJvb2xlYW4gPSBhd2FpdCBwZXJtaXNzaW9uTW9kZWwuY2FuV3JpdGUoaWRTdHJpbmcsIHRoaXMudXNlcklkKTtcblx0XHRpZiAoIWNhbldyaXRlKSB0aHJvdyBuZXcgRXJyb3JGb3JiaWRkZW4oKTtcblxuXHRcdGNvbnN0IHR4SW5kZXggPSBhd2FpdCB0aGlzLnN0YXJ0VHJhbnNhY3Rpb24oKTtcblxuXHRcdHRyeSB7XG5cdFx0XHRhd2FpdCBwZXJtaXNzaW9uTW9kZWwuZGVsZXRlQnlGaWxlSWQoaWRTdHJpbmcpO1xuXHRcdFx0YXdhaXQgc3VwZXIuZGVsZXRlKGlkU3RyaW5nKTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0YXdhaXQgdGhpcy5yb2xsYmFja1RyYW5zYWN0aW9uKHR4SW5kZXgpO1xuXHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0fVxuXG5cdFx0YXdhaXQgdGhpcy5jb21taXRUcmFuc2FjdGlvbih0eEluZGV4KTtcblx0fVxuXG59XG4iXX0=
