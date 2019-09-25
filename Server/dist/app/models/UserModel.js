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
var FileModel_1 = require("./FileModel");
var auth = require("../utils/auth");
var errors_1 = require("../utils/errors");
var UserModel = /** @class */ (function (_super) {
    __extends(UserModel, _super);
    function UserModel() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(UserModel.prototype, "tableName", {
        get: function () {
            return 'users';
        },
        enumerable: true,
        configurable: true
    });
    UserModel.prototype.loadByEmail = function (email) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                user = { email: email };
                return [2 /*return*/, this.db(this.tableName).where(user).first()];
            });
        });
    };
    UserModel.prototype.fromApiInput = function (object) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                user = {};
                if ('id' in object)
                    user.id = object.id;
                if ('email' in object)
                    user.email = object.email;
                if ('password' in object)
                    user.password = object.password;
                if ('is_admin' in object)
                    user.is_admin = object.is_admin;
                return [2 /*return*/, user];
            });
        });
    };
    UserModel.prototype.toApiOutput = function (object) {
        var output = __assign({}, object);
        delete output.password;
        return output;
    };
    UserModel.prototype.validate = function (object, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var user, owner, existingUser;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, _super.prototype.validate.call(this, object, options)];
                    case 1:
                        user = _a.sent();
                        return [4 /*yield*/, this.load(this.userId)];
                    case 2:
                        owner = _a.sent();
                        if (options.isNew) {
                            if (!owner.is_admin)
                                throw new errors_1.ErrorForbidden('non-admin user cannot create a new user');
                            if (!user.email)
                                throw new errors_1.ErrorUnprocessableEntity('email must be set');
                            if (!user.password)
                                throw new errors_1.ErrorUnprocessableEntity('password must be set');
                        }
                        else {
                            if (!owner.is_admin && user.id !== owner.id)
                                throw new errors_1.ErrorForbidden('non-admin user cannot modify another user');
                            if ('email' in user && !user.email)
                                throw new errors_1.ErrorUnprocessableEntity('email must be set');
                            if ('password' in user && !user.password)
                                throw new errors_1.ErrorUnprocessableEntity('password must be set');
                            if (!owner.is_admin && 'is_admin' in user)
                                throw new errors_1.ErrorForbidden('non-admin user cannot make a user an admin');
                            if (owner.is_admin && owner.id === user.id && 'is_admin' in user && !user.is_admin)
                                throw new errors_1.ErrorUnprocessableEntity('non-admin user cannot remove admin bit from themselves');
                        }
                        if (!('email' in user)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.loadByEmail(user.email)];
                    case 3:
                        existingUser = _a.sent();
                        if (existingUser && existingUser.id !== user.id)
                            throw new errors_1.ErrorUnprocessableEntity("there is already a user with this email: " + user.email);
                        _a.label = 4;
                    case 4: return [2 /*return*/, user];
                }
            });
        });
    };
    UserModel.prototype.checkIsOwnerOrAdmin = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var owner;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.userId)
                            throw new errors_1.ErrorForbidden('no user is active');
                        if (userId === this.userId)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.load(this.userId)];
                    case 1:
                        owner = _a.sent();
                        if (!owner.is_admin)
                            throw new errors_1.ErrorForbidden();
                        return [2 /*return*/];
                }
            });
        });
    };
    UserModel.prototype.load = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.checkIsOwnerOrAdmin(id)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, _super.prototype.load.call(this, id)];
                }
            });
        });
    };
    UserModel.prototype.delete = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var txIndex, fileModel, rootFile, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.checkIsOwnerOrAdmin(id)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.startTransaction()];
                    case 2:
                        txIndex = _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 7, , 9]);
                        fileModel = new FileModel_1.default({ userId: this.userId });
                        return [4 /*yield*/, fileModel.userRootFile()];
                    case 4:
                        rootFile = _a.sent();
                        return [4 /*yield*/, fileModel.delete(rootFile.id)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, _super.prototype.delete.call(this, id)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 7:
                        error_1 = _a.sent();
                        return [4 /*yield*/, this.rollbackTransaction(txIndex)];
                    case 8:
                        _a.sent();
                        throw error_1;
                    case 9: return [4 /*yield*/, this.commitTransaction(txIndex)];
                    case 10:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    UserModel.prototype.save = function (object, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var txIndex, isNew, newUser, fileModel, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.startTransaction()];
                    case 1:
                        txIndex = _a.sent();
                        isNew = this.isNew(object, options);
                        newUser = __assign({}, object);
                        if (isNew && newUser.password)
                            newUser.password = auth.hashPassword(newUser.password);
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 6, , 8]);
                        return [4 /*yield*/, _super.prototype.save.call(this, newUser, options)];
                    case 3:
                        newUser = _a.sent();
                        if (!isNew) return [3 /*break*/, 5];
                        fileModel = new FileModel_1.default({ userId: newUser.id });
                        return [4 /*yield*/, fileModel.createRootFile()];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        error_2 = _a.sent();
                        return [4 /*yield*/, this.rollbackTransaction(txIndex)];
                    case 7:
                        _a.sent();
                        throw error_2;
                    case 8: return [4 /*yield*/, this.commitTransaction(txIndex)];
                    case 9:
                        _a.sent();
                        return [2 /*return*/, newUser];
                }
            });
        });
    };
    return UserModel;
}(BaseModel_1.default));
exports.default = UserModel;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFDLENBQUM7d0JBRTFCLElBQUksS0FBSyxJQUFJLE9BQU8sQ0FBQyxRQUFROzRCQUFFLE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7Ozs7d0JBRzNFLHFCQUFNLGlCQUFNLElBQUksWUFBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQUE7O3dCQUE1QyxPQUFPLEdBQUcsU0FBa0MsQ0FBQzs2QkFFekMsS0FBSyxFQUFMLHdCQUFLO3dCQUNGLFNBQVMsR0FBRyxJQUFJLG1CQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ3hELHFCQUFNLFNBQVMsQ0FBQyxjQUFjLEVBQUUsRUFBQTs7d0JBQWhDLFNBQWdDLENBQUM7Ozs7O3dCQUdsQyxxQkFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEVBQUE7O3dCQUF2QyxTQUF1QyxDQUFDO3dCQUN4QyxNQUFNLE9BQUssQ0FBQzs0QkFHYixxQkFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUE7O3dCQUFyQyxTQUFxQyxDQUFDO3dCQUV0QyxzQkFBTyxPQUFPLEVBQUM7Ozs7S0FDZjtJQUVGLGdCQUFDO0FBQUQsQ0EvR0EsQUErR0MsQ0EvR3NDLG1CQUFTLEdBK0cvQyIsImZpbGUiOiJVc2VyTW9kZWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQmFzZU1vZGVsLCB7IFNhdmVPcHRpb25zLCBWYWxpZGF0ZU9wdGlvbnMgfSBmcm9tICcuL0Jhc2VNb2RlbCc7XG5pbXBvcnQgeyBVc2VyIH0gZnJvbSAnLi4vZGInO1xuaW1wb3J0IEZpbGVNb2RlbCBmcm9tICcuL0ZpbGVNb2RlbCc7XG5pbXBvcnQgKiBhcyBhdXRoIGZyb20gJy4uL3V0aWxzL2F1dGgnO1xuaW1wb3J0IHsgRXJyb3JVbnByb2Nlc3NhYmxlRW50aXR5LCBFcnJvckZvcmJpZGRlbiB9IGZyb20gJy4uL3V0aWxzL2Vycm9ycyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFVzZXJNb2RlbCBleHRlbmRzIEJhc2VNb2RlbCB7XG5cblx0Z2V0IHRhYmxlTmFtZSgpOnN0cmluZyB7XG5cdFx0cmV0dXJuICd1c2Vycyc7XG5cdH1cblxuXHRhc3luYyBsb2FkQnlFbWFpbChlbWFpbDpzdHJpbmcpOlByb21pc2U8VXNlcj4ge1xuXHRcdGNvbnN0IHVzZXI6VXNlciA9IHsgZW1haWw6IGVtYWlsIH07XG5cdFx0cmV0dXJuIHRoaXMuZGI8VXNlcj4odGhpcy50YWJsZU5hbWUpLndoZXJlKHVzZXIpLmZpcnN0KCk7XG5cdH1cblxuXHRhc3luYyBmcm9tQXBpSW5wdXQob2JqZWN0OlVzZXIpOlByb21pc2U8VXNlcj4ge1xuXHRcdGNvbnN0IHVzZXI6VXNlciA9IHt9O1xuXG5cdFx0aWYgKCdpZCcgaW4gb2JqZWN0KSB1c2VyLmlkID0gb2JqZWN0LmlkO1xuXHRcdGlmICgnZW1haWwnIGluIG9iamVjdCkgdXNlci5lbWFpbCA9IG9iamVjdC5lbWFpbDtcblx0XHRpZiAoJ3Bhc3N3b3JkJyBpbiBvYmplY3QpIHVzZXIucGFzc3dvcmQgPSBvYmplY3QucGFzc3dvcmQ7XG5cdFx0aWYgKCdpc19hZG1pbicgaW4gb2JqZWN0KSB1c2VyLmlzX2FkbWluID0gb2JqZWN0LmlzX2FkbWluO1xuXG5cdFx0cmV0dXJuIHVzZXI7XG5cdH1cblxuXHR0b0FwaU91dHB1dChvYmplY3Q6VXNlcik6VXNlciB7XG5cdFx0Y29uc3Qgb3V0cHV0OlVzZXIgPSB7IC4uLm9iamVjdCB9O1xuXHRcdGRlbGV0ZSBvdXRwdXQucGFzc3dvcmQ7XG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdGFzeW5jIHZhbGlkYXRlKG9iamVjdDpVc2VyLCBvcHRpb25zOlZhbGlkYXRlT3B0aW9ucyA9IHt9KTpQcm9taXNlPFVzZXI+IHtcblx0XHRjb25zdCB1c2VyOlVzZXIgPSBhd2FpdCBzdXBlci52YWxpZGF0ZShvYmplY3QsIG9wdGlvbnMpO1xuXG5cdFx0Y29uc3Qgb3duZXI6VXNlciA9IGF3YWl0IHRoaXMubG9hZCh0aGlzLnVzZXJJZCk7XG5cblx0XHRpZiAob3B0aW9ucy5pc05ldykge1xuXHRcdFx0aWYgKCFvd25lci5pc19hZG1pbikgdGhyb3cgbmV3IEVycm9yRm9yYmlkZGVuKCdub24tYWRtaW4gdXNlciBjYW5ub3QgY3JlYXRlIGEgbmV3IHVzZXInKTtcblx0XHRcdGlmICghdXNlci5lbWFpbCkgdGhyb3cgbmV3IEVycm9yVW5wcm9jZXNzYWJsZUVudGl0eSgnZW1haWwgbXVzdCBiZSBzZXQnKTtcblx0XHRcdGlmICghdXNlci5wYXNzd29yZCkgdGhyb3cgbmV3IEVycm9yVW5wcm9jZXNzYWJsZUVudGl0eSgncGFzc3dvcmQgbXVzdCBiZSBzZXQnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKCFvd25lci5pc19hZG1pbiAmJiB1c2VyLmlkICE9PSBvd25lci5pZCkgdGhyb3cgbmV3IEVycm9yRm9yYmlkZGVuKCdub24tYWRtaW4gdXNlciBjYW5ub3QgbW9kaWZ5IGFub3RoZXIgdXNlcicpO1xuXHRcdFx0aWYgKCdlbWFpbCcgaW4gdXNlciAmJiAhdXNlci5lbWFpbCkgdGhyb3cgbmV3IEVycm9yVW5wcm9jZXNzYWJsZUVudGl0eSgnZW1haWwgbXVzdCBiZSBzZXQnKTtcblx0XHRcdGlmICgncGFzc3dvcmQnIGluIHVzZXIgJiYgIXVzZXIucGFzc3dvcmQpIHRocm93IG5ldyBFcnJvclVucHJvY2Vzc2FibGVFbnRpdHkoJ3Bhc3N3b3JkIG11c3QgYmUgc2V0Jyk7XG5cdFx0XHRpZiAoIW93bmVyLmlzX2FkbWluICYmICdpc19hZG1pbicgaW4gdXNlcikgdGhyb3cgbmV3IEVycm9yRm9yYmlkZGVuKCdub24tYWRtaW4gdXNlciBjYW5ub3QgbWFrZSBhIHVzZXIgYW4gYWRtaW4nKTtcblx0XHRcdGlmIChvd25lci5pc19hZG1pbiAmJiBvd25lci5pZCA9PT0gdXNlci5pZCAmJiAnaXNfYWRtaW4nIGluIHVzZXIgJiYgIXVzZXIuaXNfYWRtaW4pIHRocm93IG5ldyBFcnJvclVucHJvY2Vzc2FibGVFbnRpdHkoJ25vbi1hZG1pbiB1c2VyIGNhbm5vdCByZW1vdmUgYWRtaW4gYml0IGZyb20gdGhlbXNlbHZlcycpO1xuXHRcdH1cblxuXHRcdGlmICgnZW1haWwnIGluIHVzZXIpIHtcblx0XHRcdGNvbnN0IGV4aXN0aW5nVXNlciA9IGF3YWl0IHRoaXMubG9hZEJ5RW1haWwodXNlci5lbWFpbCk7XG5cdFx0XHRpZiAoZXhpc3RpbmdVc2VyICYmIGV4aXN0aW5nVXNlci5pZCAhPT0gdXNlci5pZCkgdGhyb3cgbmV3IEVycm9yVW5wcm9jZXNzYWJsZUVudGl0eShgdGhlcmUgaXMgYWxyZWFkeSBhIHVzZXIgd2l0aCB0aGlzIGVtYWlsOiAke3VzZXIuZW1haWx9YCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHVzZXI7XG5cdH1cblxuXHRhc3luYyBjaGVja0lzT3duZXJPckFkbWluKHVzZXJJZDpzdHJpbmcpOlByb21pc2U8dm9pZD4ge1xuXHRcdGlmICghdGhpcy51c2VySWQpIHRocm93IG5ldyBFcnJvckZvcmJpZGRlbignbm8gdXNlciBpcyBhY3RpdmUnKTtcblxuXHRcdGlmICh1c2VySWQgPT09IHRoaXMudXNlcklkKSByZXR1cm47XG5cblx0XHRjb25zdCBvd25lciA9IGF3YWl0IHRoaXMubG9hZCh0aGlzLnVzZXJJZCk7XG5cdFx0aWYgKCFvd25lci5pc19hZG1pbikgdGhyb3cgbmV3IEVycm9yRm9yYmlkZGVuKCk7XG5cdH1cblxuXHRhc3luYyBsb2FkKGlkOnN0cmluZyk6UHJvbWlzZTxVc2VyPiB7XG5cdFx0YXdhaXQgdGhpcy5jaGVja0lzT3duZXJPckFkbWluKGlkKTtcblx0XHRyZXR1cm4gc3VwZXIubG9hZChpZCk7XG5cdH1cblxuXHRhc3luYyBkZWxldGUoaWQ6c3RyaW5nKTpQcm9taXNlPHZvaWQ+IHtcblx0XHRhd2FpdCB0aGlzLmNoZWNrSXNPd25lck9yQWRtaW4oaWQpO1xuXG5cdFx0Y29uc3QgdHhJbmRleCA9IGF3YWl0IHRoaXMuc3RhcnRUcmFuc2FjdGlvbigpO1xuXG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IGZpbGVNb2RlbCA9IG5ldyBGaWxlTW9kZWwoeyB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXHRcdFx0Y29uc3Qgcm9vdEZpbGUgPSBhd2FpdCBmaWxlTW9kZWwudXNlclJvb3RGaWxlKCk7XG5cdFx0XHRhd2FpdCBmaWxlTW9kZWwuZGVsZXRlKHJvb3RGaWxlLmlkKTtcblx0XHRcdGF3YWl0IHN1cGVyLmRlbGV0ZShpZCk7XG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdGF3YWl0IHRoaXMucm9sbGJhY2tUcmFuc2FjdGlvbih0eEluZGV4KTtcblx0XHRcdHRocm93IGVycm9yO1xuXHRcdH1cblxuXHRcdGF3YWl0IHRoaXMuY29tbWl0VHJhbnNhY3Rpb24odHhJbmRleCk7XG5cdH1cblxuXHRhc3luYyBzYXZlKG9iamVjdDpVc2VyLCBvcHRpb25zOlNhdmVPcHRpb25zID0ge30pOlByb21pc2U8VXNlcj4ge1xuXHRcdGNvbnN0IHR4SW5kZXggPSBhd2FpdCB0aGlzLnN0YXJ0VHJhbnNhY3Rpb24oKTtcblxuXHRcdGNvbnN0IGlzTmV3ID0gdGhpcy5pc05ldyhvYmplY3QsIG9wdGlvbnMpO1xuXG5cdFx0bGV0IG5ld1VzZXIgPSB7Li4ub2JqZWN0fTtcblxuXHRcdGlmIChpc05ldyAmJiBuZXdVc2VyLnBhc3N3b3JkKSBuZXdVc2VyLnBhc3N3b3JkID0gYXV0aC5oYXNoUGFzc3dvcmQobmV3VXNlci5wYXNzd29yZCk7XG5cblx0XHR0cnkge1xuXHRcdFx0bmV3VXNlciA9IGF3YWl0IHN1cGVyLnNhdmUobmV3VXNlciwgb3B0aW9ucyk7XG5cblx0XHRcdGlmIChpc05ldykge1xuXHRcdFx0XHRjb25zdCBmaWxlTW9kZWwgPSBuZXcgRmlsZU1vZGVsKHsgdXNlcklkOiBuZXdVc2VyLmlkIH0pO1xuXHRcdFx0XHRhd2FpdCBmaWxlTW9kZWwuY3JlYXRlUm9vdEZpbGUoKTtcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0YXdhaXQgdGhpcy5yb2xsYmFja1RyYW5zYWN0aW9uKHR4SW5kZXgpO1xuXHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0fVxuXG5cdFx0YXdhaXQgdGhpcy5jb21taXRUcmFuc2FjdGlvbih0eEluZGV4KTtcblxuXHRcdHJldHVybiBuZXdVc2VyO1xuXHR9XG5cbn1cbiJdfQ==
