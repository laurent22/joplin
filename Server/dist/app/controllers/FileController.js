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
var FileModel_1 = require("../models/FileModel");
var BaseController_1 = require("./BaseController");
var routeUtils_1 = require("../utils/routeUtils");
var FileController = /** @class */ (function (_super) {
    __extends(FileController, _super);
    function FileController() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    FileController.prototype.createFile = function (sessionId, file) {
        return __awaiter(this, void 0, void 0, function () {
            var user, fileModel, newFile;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initSession(sessionId)];
                    case 1:
                        user = _a.sent();
                        fileModel = new FileModel_1.default({ userId: user.id });
                        return [4 /*yield*/, fileModel.fromApiInput(file)];
                    case 2:
                        newFile = _a.sent();
                        return [4 /*yield*/, fileModel.save(file)];
                    case 3:
                        newFile = _a.sent();
                        return [2 /*return*/, fileModel.toApiOutput(newFile)];
                }
            });
        });
    };
    FileController.prototype.getFile = function (sessionId, fileId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, fileModel, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.initSession(sessionId)];
                    case 1:
                        user = _c.sent();
                        fileModel = new FileModel_1.default({ userId: user.id });
                        _b = (_a = fileModel).toApiOutput;
                        return [4 /*yield*/, fileModel.load(fileId)];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
    };
    FileController.prototype.getFileContent = function (sessionId, fileId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, fileModel, file;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initSession(sessionId)];
                    case 1:
                        user = _a.sent();
                        fileModel = new FileModel_1.default({ userId: user.id });
                        return [4 /*yield*/, fileModel.loadWithContent(fileId)];
                    case 2:
                        file = _a.sent();
                        return [2 /*return*/, file];
                }
            });
        });
    };
    FileController.prototype.getAll = function (sessionId, parentId) {
        if (parentId === void 0) { parentId = ''; }
        return __awaiter(this, void 0, void 0, function () {
            var user, fileModel;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initSession(sessionId)];
                    case 1:
                        user = _a.sent();
                        fileModel = new FileModel_1.default({ userId: user.id });
                        return [2 /*return*/, fileModel.allByParent(parentId)];
                }
            });
        });
    };
    FileController.prototype.updateFile = function (sessionId, file) {
        return __awaiter(this, void 0, void 0, function () {
            var user, fileModel, newFile;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initSession(sessionId)];
                    case 1:
                        user = _a.sent();
                        fileModel = new FileModel_1.default({ userId: user.id });
                        return [4 /*yield*/, fileModel.fromApiInput(file)];
                    case 2:
                        newFile = _a.sent();
                        return [4 /*yield*/, fileModel.save(newFile)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    FileController.prototype.updateFileContent = function (sessionId, fileId, content) {
        return __awaiter(this, void 0, void 0, function () {
            var user, fileModel, file, id;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initSession(sessionId)];
                    case 1:
                        user = _a.sent();
                        fileModel = new FileModel_1.default({ userId: user.id });
                        file = { content: content };
                        if (!(typeof fileId === 'string')) return [3 /*break*/, 2];
                        file.id = fileId;
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, fileModel.idFromItemId(fileId, false)];
                    case 3:
                        id = _a.sent();
                        if (id) {
                            file.id = id;
                        }
                        else {
                            file.name = routeUtils_1.removeFilePathPrefix(fileId.value);
                        }
                        _a.label = 4;
                    case 4: return [4 /*yield*/, fileModel.save(file)];
                    case 5:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    FileController.prototype.deleteFile = function (sessionId, fileId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, fileModel;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initSession(sessionId)];
                    case 1:
                        user = _a.sent();
                        fileModel = new FileModel_1.default({ userId: user.id });
                        return [4 /*yield*/, fileModel.delete(fileId)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return FileController;
}(BaseController_1.default));
exports.default = FileController;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUFNLENBQUMsRUFBQTs7d0JBQTlCLFNBQThCLENBQUM7Ozs7O0tBQy9CO0lBRUYscUJBQUM7QUFBRCxDQTlEQSxBQThEQyxDQTlEMkMsd0JBQWMsR0E4RHpEIiwiZmlsZSI6IkZpbGVDb250cm9sbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRmlsZSwgSXRlbUlkIH0gZnJvbSAnLi4vZGInO1xuaW1wb3J0IEZpbGVNb2RlbCBmcm9tICcuLi9tb2RlbHMvRmlsZU1vZGVsJztcbmltcG9ydCBCYXNlQ29udHJvbGxlciBmcm9tICcuL0Jhc2VDb250cm9sbGVyJztcbmltcG9ydCB7IHJlbW92ZUZpbGVQYXRoUHJlZml4IH0gZnJvbSAnLi4vdXRpbHMvcm91dGVVdGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZpbGVDb250cm9sbGVyIGV4dGVuZHMgQmFzZUNvbnRyb2xsZXIge1xuXG5cdGFzeW5jIGNyZWF0ZUZpbGUoc2Vzc2lvbklkOnN0cmluZywgZmlsZTpGaWxlKTpQcm9taXNlPEZpbGU+IHtcblx0XHRjb25zdCB1c2VyID0gYXdhaXQgdGhpcy5pbml0U2Vzc2lvbihzZXNzaW9uSWQpO1xuXHRcdGNvbnN0IGZpbGVNb2RlbCA9IG5ldyBGaWxlTW9kZWwoeyB1c2VySWQ6IHVzZXIuaWQgfSk7XG5cdFx0bGV0IG5ld0ZpbGUgPSBhd2FpdCBmaWxlTW9kZWwuZnJvbUFwaUlucHV0KGZpbGUpO1xuXHRcdG5ld0ZpbGUgPSBhd2FpdCBmaWxlTW9kZWwuc2F2ZShmaWxlKTtcblx0XHRyZXR1cm4gZmlsZU1vZGVsLnRvQXBpT3V0cHV0KG5ld0ZpbGUpO1xuXHR9XG5cblx0YXN5bmMgZ2V0RmlsZShzZXNzaW9uSWQ6c3RyaW5nLCBmaWxlSWQ6c3RyaW5nIHwgSXRlbUlkKTpQcm9taXNlPEZpbGU+IHtcblx0XHRjb25zdCB1c2VyID0gYXdhaXQgdGhpcy5pbml0U2Vzc2lvbihzZXNzaW9uSWQpO1xuXHRcdGNvbnN0IGZpbGVNb2RlbCA9IG5ldyBGaWxlTW9kZWwoeyB1c2VySWQ6IHVzZXIuaWQgfSk7XG5cdFx0cmV0dXJuIGZpbGVNb2RlbC50b0FwaU91dHB1dChhd2FpdCBmaWxlTW9kZWwubG9hZChmaWxlSWQpKTtcblx0fVxuXG5cdGFzeW5jIGdldEZpbGVDb250ZW50KHNlc3Npb25JZDpzdHJpbmcsIGZpbGVJZDpzdHJpbmcgfCBJdGVtSWQpOlByb21pc2U8RmlsZT4ge1xuXHRcdGNvbnN0IHVzZXIgPSBhd2FpdCB0aGlzLmluaXRTZXNzaW9uKHNlc3Npb25JZCk7XG5cdFx0Y29uc3QgZmlsZU1vZGVsID0gbmV3IEZpbGVNb2RlbCh7IHVzZXJJZDogdXNlci5pZCB9KTtcblx0XHRjb25zdCBmaWxlOkZpbGUgPSBhd2FpdCBmaWxlTW9kZWwubG9hZFdpdGhDb250ZW50KGZpbGVJZCk7XG5cdFx0cmV0dXJuIGZpbGU7XG5cdH1cblxuXHRhc3luYyBnZXRBbGwoc2Vzc2lvbklkOnN0cmluZywgcGFyZW50SWQ6c3RyaW5nID0gJycpOlByb21pc2U8RmlsZVtdPiB7XG5cdFx0Y29uc3QgdXNlciA9IGF3YWl0IHRoaXMuaW5pdFNlc3Npb24oc2Vzc2lvbklkKTtcblx0XHRjb25zdCBmaWxlTW9kZWwgPSBuZXcgRmlsZU1vZGVsKHsgdXNlcklkOiB1c2VyLmlkIH0pO1xuXHRcdHJldHVybiBmaWxlTW9kZWwuYWxsQnlQYXJlbnQocGFyZW50SWQpO1xuXHR9XG5cblx0YXN5bmMgdXBkYXRlRmlsZShzZXNzaW9uSWQ6c3RyaW5nLCBmaWxlOkZpbGUpOlByb21pc2U8dm9pZD4ge1xuXHRcdGNvbnN0IHVzZXIgPSBhd2FpdCB0aGlzLmluaXRTZXNzaW9uKHNlc3Npb25JZCk7XG5cdFx0Y29uc3QgZmlsZU1vZGVsID0gbmV3IEZpbGVNb2RlbCh7IHVzZXJJZDogdXNlci5pZCB9KTtcblx0XHRjb25zdCBuZXdGaWxlID0gYXdhaXQgZmlsZU1vZGVsLmZyb21BcGlJbnB1dChmaWxlKTtcblx0XHRhd2FpdCBmaWxlTW9kZWwuc2F2ZShuZXdGaWxlKTtcblx0fVxuXG5cdGFzeW5jIHVwZGF0ZUZpbGVDb250ZW50KHNlc3Npb25JZDpzdHJpbmcsIGZpbGVJZDpzdHJpbmcgfCBJdGVtSWQsIGNvbnRlbnQ6YW55KTpQcm9taXNlPGFueT4ge1xuXHRcdGNvbnN0IHVzZXIgPSBhd2FpdCB0aGlzLmluaXRTZXNzaW9uKHNlc3Npb25JZCk7XG5cdFx0Y29uc3QgZmlsZU1vZGVsID0gbmV3IEZpbGVNb2RlbCh7IHVzZXJJZDogdXNlci5pZCB9KTtcblxuXHRcdGNvbnN0IGZpbGU6RmlsZSA9IHsgY29udGVudDogY29udGVudCB9O1xuXG5cdFx0aWYgKHR5cGVvZiBmaWxlSWQgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRmaWxlLmlkID0gZmlsZUlkO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zdCBpZCA9IGF3YWl0IGZpbGVNb2RlbC5pZEZyb21JdGVtSWQoZmlsZUlkLCBmYWxzZSk7XG5cdFx0XHRpZiAoaWQpIHtcblx0XHRcdFx0ZmlsZS5pZCA9IGlkO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZmlsZS5uYW1lID0gcmVtb3ZlRmlsZVBhdGhQcmVmaXgoZmlsZUlkLnZhbHVlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRhd2FpdCBmaWxlTW9kZWwuc2F2ZShmaWxlKTtcblx0fVxuXG5cdGFzeW5jIGRlbGV0ZUZpbGUoc2Vzc2lvbklkOnN0cmluZywgZmlsZUlkOnN0cmluZyB8IEl0ZW1JZCk6UHJvbWlzZTx2b2lkPiB7XG5cdFx0Y29uc3QgdXNlciA9IGF3YWl0IHRoaXMuaW5pdFNlc3Npb24oc2Vzc2lvbklkKTtcblx0XHRjb25zdCBmaWxlTW9kZWwgPSBuZXcgRmlsZU1vZGVsKHsgdXNlcklkOiB1c2VyLmlkIH0pO1xuXHRcdGF3YWl0IGZpbGVNb2RlbC5kZWxldGUoZmlsZUlkKTtcblx0fVxuXG59XG4iXX0=
