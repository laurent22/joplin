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
var testUtils_1 = require("../testUtils");
var FileController_1 = require("../../app/controllers/FileController");
var FileModel_1 = require("../../app/models/FileModel");
var fs = require("fs-extra");
var db_1 = require("../../app/db");
var PermissionModel_1 = require("../../app/models/PermissionModel");
var errors_1 = require("../../app/utils/errors");
function makeTestFile(id, ext, parentId) {
    if (id === void 0) { id = 1; }
    if (ext === void 0) { ext = 'jpg'; }
    if (parentId === void 0) { parentId = ''; }
    return __awaiter(this, void 0, void 0, function () {
        var basename, file, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    basename = ext === 'jpg' ? 'photo' : 'poster';
                    _a = {
                        name: id > 1 ? basename + "-" + id + "." + ext : basename + "." + ext
                    };
                    return [4 /*yield*/, fs.readFile(testUtils_1.supportDir + "/" + basename + "." + ext)];
                case 1:
                    file = (_a.content = _b.sent(),
                        _a.mime_type = "image/" + ext,
                        _a.parent_id = parentId,
                        _a);
                    return [2 /*return*/, file];
            }
        });
    });
}
function makeTestDirectory(name) {
    if (name === void 0) { name = 'Docs'; }
    return __awaiter(this, void 0, void 0, function () {
        var file;
        return __generator(this, function (_a) {
            file = {
                name: name,
                parent_id: '',
                is_directory: 1,
            };
            return [2 /*return*/, file];
        });
    });
}
describe('FileController', function () {
    var _this = this;
    beforeEach(function (done) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testUtils_1.clearDatabase()];
                case 1:
                    _a.sent();
                    done();
                    return [2 /*return*/];
            }
        });
    }); });
    it('should create a file', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, session, file, fileController, newFile, fileModel, originalFileHex, newFileHex;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1, true)];
                    case 1:
                        _a = _b.sent(), user = _a.user, session = _a.session;
                        return [4 /*yield*/, makeTestFile()];
                    case 2:
                        file = _b.sent();
                        fileController = new FileController_1.default();
                        return [4 /*yield*/, fileController.createFile(session.id, file)];
                    case 3:
                        newFile = _b.sent();
                        expect(!!newFile.id).toBe(true);
                        expect(newFile.name).toBe(file.name);
                        expect(newFile.mime_type).toBe(file.mime_type);
                        expect(!!newFile.parent_id).toBe(true);
                        expect(!newFile.content).toBe(true);
                        expect(newFile.size > 0).toBe(true);
                        fileModel = new FileModel_1.default({ userId: user.id });
                        return [4 /*yield*/, fileModel.loadWithContent(newFile.id)];
                    case 4:
                        newFile = _b.sent();
                        expect(!!newFile).toBe(true);
                        originalFileHex = file.content.toString('hex');
                        newFileHex = newFile.content.toString('hex');
                        expect(newFileHex.length > 0).toBe(true);
                        expect(newFileHex).toBe(originalFileHex);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should get files', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var session1, session2, file1, file2, file3, fileController, fileId1, fileId2, error, allFiles;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1)];
                    case 1:
                        session1 = (_a.sent()).session;
                        return [4 /*yield*/, testUtils_1.createUserAndSession(2)];
                    case 2:
                        session2 = (_a.sent()).session;
                        return [4 /*yield*/, makeTestFile(1)];
                    case 3:
                        file1 = _a.sent();
                        return [4 /*yield*/, makeTestFile(2)];
                    case 4:
                        file2 = _a.sent();
                        return [4 /*yield*/, makeTestFile(3)];
                    case 5:
                        file3 = _a.sent();
                        fileController = new FileController_1.default();
                        return [4 /*yield*/, fileController.createFile(session1.id, file1)];
                    case 6:
                        file1 = _a.sent();
                        return [4 /*yield*/, fileController.createFile(session1.id, file2)];
                    case 7:
                        file2 = _a.sent();
                        return [4 /*yield*/, fileController.createFile(session2.id, file3)];
                    case 8:
                        file3 = _a.sent();
                        fileId1 = file1.id;
                        fileId2 = file2.id;
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, fileController.getFile(session1.id, file3.id)];
                            }); }); })];
                    case 9:
                        error = _a.sent();
                        expect(error instanceof errors_1.ErrorForbidden).toBe(true);
                        return [4 /*yield*/, fileController.getFile(session1.id, file1.id)];
                    case 10:
                        file1 = _a.sent();
                        expect(file1.id).toBe(fileId1);
                        return [4 /*yield*/, fileController.getAll(session1.id)];
                    case 11:
                        allFiles = _a.sent();
                        expect(allFiles.length).toBe(2);
                        expect(JSON.stringify(allFiles.map(function (f) { return f.id; }).sort())).toBe(JSON.stringify([fileId1, fileId2].sort()));
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should not let create a file in a directory not owned by user', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var session, user2, fileModel2, rootFile2, file, fileController, hasThrown;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1)];
                    case 1:
                        session = (_a.sent()).session;
                        return [4 /*yield*/, testUtils_1.createUser(2)];
                    case 2:
                        user2 = _a.sent();
                        fileModel2 = new FileModel_1.default({ userId: user2.id });
                        return [4 /*yield*/, fileModel2.userRootFile()];
                    case 3:
                        rootFile2 = _a.sent();
                        return [4 /*yield*/, makeTestFile()];
                    case 4:
                        file = _a.sent();
                        file.parent_id = rootFile2.id;
                        fileController = new FileController_1.default();
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, fileController.createFile(session.id, file)];
                            }); }); })];
                    case 5:
                        hasThrown = _a.sent();
                        expect(!!hasThrown).toBe(true);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should update file properties', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, session, user, fileModel, file, fileController, hasThrown;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1, true)];
                    case 1:
                        _a = _b.sent(), session = _a.session, user = _a.user;
                        fileModel = new FileModel_1.default({ userId: user.id });
                        return [4 /*yield*/, makeTestFile()];
                    case 2:
                        file = _b.sent();
                        fileController = new FileController_1.default();
                        return [4 /*yield*/, fileController.createFile(session.id, file)];
                    case 3:
                        file = _b.sent();
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, fileController.updateFile(session.id, { id: file.id, name: '' })];
                            }); }); })];
                    case 4:
                        hasThrown = _b.sent();
                        expect(!!hasThrown).toBe(true);
                        return [4 /*yield*/, fileController.updateFile(session.id, { id: file.id, name: 'modified.jpg' })];
                    case 5:
                        _b.sent();
                        return [4 /*yield*/, fileModel.load(file.id)];
                    case 6:
                        file = _b.sent();
                        expect(file.name).toBe('modified.jpg');
                        return [4 /*yield*/, fileController.updateFile(session.id, { id: file.id, mime_type: 'image/png' })];
                    case 7:
                        _b.sent();
                        return [4 /*yield*/, fileModel.load(file.id)];
                    case 8:
                        file = _b.sent();
                        expect(file.mime_type).toBe('image/png');
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should not allow duplicate filenames', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var session, file1, file2, fileController, hasThrown;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1, true)];
                    case 1:
                        session = (_a.sent()).session;
                        return [4 /*yield*/, makeTestFile(1)];
                    case 2:
                        file1 = _a.sent();
                        return [4 /*yield*/, makeTestFile(1)];
                    case 3:
                        file2 = _a.sent();
                        fileController = new FileController_1.default();
                        return [4 /*yield*/, fileController.createFile(session.id, file1)];
                    case 4:
                        file1 = _a.sent();
                        expect(!!file1.id).toBe(true);
                        expect(file1.name).toBe(file2.name);
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, fileController.createFile(session.id, file2)];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 5:
                        hasThrown = _a.sent();
                        expect(!!hasThrown).toBe(true);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should change the file parent', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, session1, user1, user2, hasThrown, fileModel, file, file2, dir, fileController, fileModel2, userRoot2;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1)];
                    case 1:
                        _a = _b.sent(), session1 = _a.session, user1 = _a.user;
                        return [4 /*yield*/, testUtils_1.createUserAndSession(2)];
                    case 2:
                        user2 = (_b.sent()).user;
                        hasThrown = null;
                        fileModel = new FileModel_1.default({ userId: user1.id });
                        return [4 /*yield*/, makeTestFile()];
                    case 3:
                        file = _b.sent();
                        return [4 /*yield*/, makeTestFile(2)];
                    case 4:
                        file2 = _b.sent();
                        return [4 /*yield*/, makeTestDirectory()];
                    case 5:
                        dir = _b.sent();
                        fileController = new FileController_1.default();
                        return [4 /*yield*/, fileController.createFile(session1.id, file)];
                    case 6:
                        file = _b.sent();
                        return [4 /*yield*/, fileController.createFile(session1.id, file2)];
                    case 7:
                        file2 = _b.sent();
                        return [4 /*yield*/, fileController.createFile(session1.id, dir)];
                    case 8:
                        dir = _b.sent();
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, fileController.updateFile(session1.id, { id: file.id, parent_id: file2.id })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 9:
                        // Can't set parent to another non-directory file
                        hasThrown = _b.sent();
                        expect(!!hasThrown).toBe(true);
                        fileModel2 = new FileModel_1.default({ userId: user2.id });
                        return [4 /*yield*/, fileModel2.userRootFile()];
                    case 10:
                        userRoot2 = _b.sent();
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, fileController.updateFile(session1.id, { id: file.id, parent_id: userRoot2.id })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 11:
                        // Can't set parent to someone else directory
                        hasThrown = _b.sent();
                        expect(!!hasThrown).toBe(true);
                        return [4 /*yield*/, fileController.updateFile(session1.id, { id: file.id, parent_id: dir.id })];
                    case 12:
                        _b.sent();
                        return [4 /*yield*/, fileModel.load(file.id)];
                    case 13:
                        file = _b.sent();
                        expect(!!file.parent_id).toBe(true);
                        expect(file.parent_id).toBe(dir.id);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should delete a file', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, session, fileController, fileModel, permissionModel, file1, file2, allFiles, beforeCount, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1, true)];
                    case 1:
                        _a = _d.sent(), user = _a.user, session = _a.session;
                        fileController = new FileController_1.default();
                        fileModel = new FileModel_1.default({ userId: user.id });
                        permissionModel = new PermissionModel_1.default();
                        return [4 /*yield*/, makeTestFile(1)];
                    case 2:
                        file1 = _d.sent();
                        return [4 /*yield*/, makeTestFile(2)];
                    case 3:
                        file2 = _d.sent();
                        return [4 /*yield*/, fileController.createFile(session.id, file1)];
                    case 4:
                        file1 = _d.sent();
                        return [4 /*yield*/, fileController.createFile(session.id, file2)];
                    case 5:
                        file2 = _d.sent();
                        return [4 /*yield*/, fileModel.all()];
                    case 6:
                        allFiles = _d.sent();
                        beforeCount = allFiles.length;
                        _b = expect;
                        return [4 /*yield*/, permissionModel.filePermissions(file2.id)];
                    case 7:
                        _b.apply(void 0, [(_d.sent()).length]).toBe(1);
                        return [4 /*yield*/, fileController.deleteFile(session.id, file2.id)];
                    case 8:
                        _d.sent();
                        return [4 /*yield*/, fileModel.all()];
                    case 9:
                        allFiles = _d.sent();
                        expect(allFiles.length).toBe(beforeCount - 1);
                        _c = expect;
                        return [4 /*yield*/, permissionModel.filePermissions(file2.id)];
                    case 10:
                        _c.apply(void 0, [(_d.sent()).length]).toBe(0);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should not delete someone else file', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var session1, session2, fileController, file1, file2, error;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1)];
                    case 1:
                        session1 = (_a.sent()).session;
                        return [4 /*yield*/, testUtils_1.createUserAndSession(2)];
                    case 2:
                        session2 = (_a.sent()).session;
                        fileController = new FileController_1.default();
                        return [4 /*yield*/, makeTestFile(1)];
                    case 3:
                        file1 = _a.sent();
                        return [4 /*yield*/, makeTestFile(2)];
                    case 4:
                        file2 = _a.sent();
                        return [4 /*yield*/, fileController.createFile(session1.id, file1)];
                    case 5:
                        file1 = _a.sent();
                        return [4 /*yield*/, fileController.createFile(session2.id, file2)];
                    case 6:
                        file2 = _a.sent();
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, fileController.deleteFile(session1.id, file2.id)];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 7:
                        error = _a.sent();
                        expect(error instanceof errors_1.ErrorForbidden).toBe(true);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should let admin change or delete files', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var adminSession, _a, session, user, file, fileModel, fileController, error;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1, true)];
                    case 1:
                        adminSession = (_b.sent()).session;
                        return [4 /*yield*/, testUtils_1.createUserAndSession(2)];
                    case 2:
                        _a = _b.sent(), session = _a.session, user = _a.user;
                        return [4 /*yield*/, makeTestFile()];
                    case 3:
                        file = _b.sent();
                        fileModel = new FileModel_1.default({ userId: user.id });
                        fileController = new FileController_1.default();
                        return [4 /*yield*/, fileController.createFile(session.id, file)];
                    case 4:
                        file = _b.sent();
                        return [4 /*yield*/, fileController.updateFile(adminSession.id, { id: file.id, name: 'modified.jpg' })];
                    case 5:
                        _b.sent();
                        return [4 /*yield*/, fileModel.load(file.id)];
                    case 6:
                        file = _b.sent();
                        expect(file.name).toBe('modified.jpg');
                        return [4 /*yield*/, fileController.deleteFile(adminSession.id, file.id)];
                    case 7:
                        _b.sent();
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, fileModel.load(file.id)];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 8:
                        error = _b.sent();
                        expect(!!error).toBe(true);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should update a file content', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var session, file, file2, fileController, newFile, modFile, originalFileHex, modFileHex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1, true)];
                    case 1:
                        session = (_a.sent()).session;
                        return [4 /*yield*/, makeTestFile(1)];
                    case 2:
                        file = _a.sent();
                        return [4 /*yield*/, makeTestFile(2, 'png')];
                    case 3:
                        file2 = _a.sent();
                        fileController = new FileController_1.default();
                        return [4 /*yield*/, fileController.createFile(session.id, file)];
                    case 4:
                        newFile = _a.sent();
                        return [4 /*yield*/, fileController.updateFileContent(session.id, newFile.id, file2.content)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, fileController.getFileContent(session.id, newFile.id)];
                    case 6:
                        modFile = _a.sent();
                        originalFileHex = file.content.toString('hex');
                        modFileHex = modFile.content.toString('hex');
                        expect(modFileHex.length > 0).toBe(true);
                        expect(modFileHex === originalFileHex).toBe(false);
                        expect(modFile.size).toBe(modFile.content.byteLength);
                        expect(newFile.size).toBe(file.content.byteLength);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should allow addressing a file by path', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var session, fileController, dir, _a, _b, _c, file1, _d, _e, _f, file2, _g, _h, _j, aDir, aFile1, aFile2, error;
            var _this = this;
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1, true)];
                    case 1:
                        session = (_k.sent()).session;
                        fileController = new FileController_1.default();
                        _b = (_a = fileController).createFile;
                        _c = [session.id];
                        return [4 /*yield*/, makeTestDirectory('Docs')];
                    case 2: return [4 /*yield*/, _b.apply(_a, _c.concat([_k.sent()]))];
                    case 3:
                        dir = _k.sent();
                        _e = (_d = fileController).createFile;
                        _f = [session.id];
                        return [4 /*yield*/, makeTestFile(1)];
                    case 4: return [4 /*yield*/, _e.apply(_d, _f.concat([_k.sent()]))];
                    case 5:
                        file1 = _k.sent();
                        _h = (_g = fileController).createFile;
                        _j = [session.id];
                        return [4 /*yield*/, makeTestFile(2, 'jpg', dir.id)];
                    case 6: return [4 /*yield*/, _h.apply(_g, _j.concat([_k.sent()]))];
                    case 7:
                        file2 = _k.sent();
                        return [4 /*yield*/, fileController.getFile(session.id, { value: 'root:/Docs', addressingType: db_1.ItemAddressingType.Path })];
                    case 8:
                        aDir = _k.sent();
                        expect(aDir.id).toBe(dir.id);
                        return [4 /*yield*/, fileController.getFile(session.id, { value: 'root:/photo.jpg', addressingType: db_1.ItemAddressingType.Path })];
                    case 9:
                        aFile1 = _k.sent();
                        expect(aFile1.id).toBe(file1.id);
                        return [4 /*yield*/, fileController.getFile(session.id, { value: 'root:/Docs/photo-2.jpg', addressingType: db_1.ItemAddressingType.Path })];
                    case 10:
                        aFile2 = _k.sent();
                        expect(aFile2.id).toBe(file2.id);
                        return [4 /*yield*/, fileController.deleteFile(session.id, { value: 'root:/Docs/photo-2.jpg', addressingType: db_1.ItemAddressingType.Path })];
                    case 11:
                        _k.sent();
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, fileController.getFile(session.id, { value: 'root:/Docs/photo-2.jpg', addressingType: db_1.ItemAddressingType.Path })];
                            }); }); })];
                    case 12:
                        error = _k.sent();
                        expect(error instanceof errors_1.ErrorNotFound).toBe(true);
                        return [2 /*return*/];
                }
            });
        });
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Qzt3QkFDNUcscUJBQU0sMkJBQWUsQ0FBQztnQ0FBWSxzQkFBQSxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsd0JBQXdCLEVBQUUsY0FBYyxFQUFFLHVCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDLEVBQUE7cUNBQUEsQ0FBQyxFQUFBOzt3QkFBM0osS0FBSyxHQUFHLFNBQW1KO3dCQUNqSyxNQUFNLENBQUMsS0FBSyxZQUFZLHNCQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Ozs7O0tBQ2xELENBQUMsQ0FBQyxDQUFDO0FBRUwsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoiRmlsZUNvbnRyb2xsZXJUZXN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgYXN5bmNUZXN0LCBjbGVhckRhdGFiYXNlLCBzdXBwb3J0RGlyLCBjcmVhdGVVc2VyQW5kU2Vzc2lvbiwgY3JlYXRlVXNlciwgY2hlY2tUaHJvd0FzeW5jIH0gZnJvbSAnLi4vdGVzdFV0aWxzJztcbmltcG9ydCBGaWxlQ29udHJvbGxlciBmcm9tICcuLi8uLi9hcHAvY29udHJvbGxlcnMvRmlsZUNvbnRyb2xsZXInO1xuaW1wb3J0IEZpbGVNb2RlbCBmcm9tICcuLi8uLi9hcHAvbW9kZWxzL0ZpbGVNb2RlbCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBGaWxlLCBJdGVtQWRkcmVzc2luZ1R5cGUgfSBmcm9tICcuLi8uLi9hcHAvZGInO1xuaW1wb3J0IFBlcm1pc3Npb25Nb2RlbCBmcm9tICcuLi8uLi9hcHAvbW9kZWxzL1Blcm1pc3Npb25Nb2RlbCc7XG5pbXBvcnQgeyBFcnJvckZvcmJpZGRlbiwgRXJyb3JOb3RGb3VuZCB9IGZyb20gJy4uLy4uL2FwcC91dGlscy9lcnJvcnMnO1xuXG5hc3luYyBmdW5jdGlvbiBtYWtlVGVzdEZpbGUoaWQ6bnVtYmVyID0gMSwgZXh0OnN0cmluZyA9ICdqcGcnLCBwYXJlbnRJZDpzdHJpbmcgPSAnJyk6UHJvbWlzZTxGaWxlPiB7XG5cdGNvbnN0IGJhc2VuYW1lID0gZXh0ID09PSAnanBnJyA/ICdwaG90bycgOiAncG9zdGVyJztcblxuXHRjb25zdCBmaWxlOkZpbGUgPSB7XG5cdFx0bmFtZTogaWQgPiAxID8gYCR7YmFzZW5hbWV9LSR7aWR9LiR7ZXh0fWAgOiBgJHtiYXNlbmFtZX0uJHtleHR9YCxcblx0XHRjb250ZW50OiBhd2FpdCBmcy5yZWFkRmlsZShgJHtzdXBwb3J0RGlyfS8ke2Jhc2VuYW1lfS4ke2V4dH1gKSxcblx0XHRtaW1lX3R5cGU6IGBpbWFnZS8ke2V4dH1gLFxuXHRcdHBhcmVudF9pZDogcGFyZW50SWQsXG5cdH07XG5cblx0cmV0dXJuIGZpbGU7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1ha2VUZXN0RGlyZWN0b3J5KG5hbWU6c3RyaW5nID0gJ0RvY3MnKTpQcm9taXNlPEZpbGU+IHtcblx0Y29uc3QgZmlsZTpGaWxlID0ge1xuXHRcdG5hbWU6IG5hbWUsXG5cdFx0cGFyZW50X2lkOiAnJyxcblx0XHRpc19kaXJlY3Rvcnk6IDEsXG5cdH07XG5cblx0cmV0dXJuIGZpbGU7XG59XG5cbmRlc2NyaWJlKCdGaWxlQ29udHJvbGxlcicsIGZ1bmN0aW9uKCkge1xuXG5cdGJlZm9yZUVhY2goYXN5bmMgKGRvbmUpID0+IHtcblx0XHRhd2FpdCBjbGVhckRhdGFiYXNlKCk7XG5cdFx0ZG9uZSgpO1xuXHR9KTtcblxuXHRpdCgnc2hvdWxkIGNyZWF0ZSBhIGZpbGUnLCBhc3luY1Rlc3QoYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgeyB1c2VyLCBzZXNzaW9uIH0gPSBhd2FpdCBjcmVhdGVVc2VyQW5kU2Vzc2lvbigxLCB0cnVlKTtcblxuXHRcdGNvbnN0IGZpbGU6RmlsZSA9IGF3YWl0IG1ha2VUZXN0RmlsZSgpO1xuXG5cdFx0Y29uc3QgZmlsZUNvbnRyb2xsZXIgPSBuZXcgRmlsZUNvbnRyb2xsZXIoKTtcblx0XHRsZXQgbmV3RmlsZSA9IGF3YWl0IGZpbGVDb250cm9sbGVyLmNyZWF0ZUZpbGUoc2Vzc2lvbi5pZCwgZmlsZSk7XG5cblx0XHRleHBlY3QoISFuZXdGaWxlLmlkKS50b0JlKHRydWUpO1xuXHRcdGV4cGVjdChuZXdGaWxlLm5hbWUpLnRvQmUoZmlsZS5uYW1lKTtcblx0XHRleHBlY3QobmV3RmlsZS5taW1lX3R5cGUpLnRvQmUoZmlsZS5taW1lX3R5cGUpO1xuXHRcdGV4cGVjdCghIW5ld0ZpbGUucGFyZW50X2lkKS50b0JlKHRydWUpO1xuXHRcdGV4cGVjdCghbmV3RmlsZS5jb250ZW50KS50b0JlKHRydWUpO1xuXHRcdGV4cGVjdChuZXdGaWxlLnNpemUgPiAwKS50b0JlKHRydWUpO1xuXG5cdFx0Y29uc3QgZmlsZU1vZGVsID0gbmV3IEZpbGVNb2RlbCh7IHVzZXJJZDogdXNlci5pZCB9KTtcblx0XHRuZXdGaWxlID0gYXdhaXQgZmlsZU1vZGVsLmxvYWRXaXRoQ29udGVudChuZXdGaWxlLmlkKTtcblxuXHRcdGV4cGVjdCghIW5ld0ZpbGUpLnRvQmUodHJ1ZSk7XG5cblx0XHRjb25zdCBvcmlnaW5hbEZpbGVIZXggPSAoZmlsZS5jb250ZW50IGFzIEJ1ZmZlcikudG9TdHJpbmcoJ2hleCcpO1xuXHRcdGNvbnN0IG5ld0ZpbGVIZXggPSAobmV3RmlsZS5jb250ZW50IGFzIEJ1ZmZlcikudG9TdHJpbmcoJ2hleCcpO1xuXHRcdGV4cGVjdChuZXdGaWxlSGV4Lmxlbmd0aCA+IDApLnRvQmUodHJ1ZSk7XG5cdFx0ZXhwZWN0KG5ld0ZpbGVIZXgpLnRvQmUob3JpZ2luYWxGaWxlSGV4KTtcblx0fSkpO1xuXG5cdGl0KCdzaG91bGQgZ2V0IGZpbGVzJywgYXN5bmNUZXN0KGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IHsgc2Vzc2lvbjogc2Vzc2lvbjEgfSA9IGF3YWl0IGNyZWF0ZVVzZXJBbmRTZXNzaW9uKDEpO1xuXHRcdGNvbnN0IHsgc2Vzc2lvbjogc2Vzc2lvbjIgfSA9IGF3YWl0IGNyZWF0ZVVzZXJBbmRTZXNzaW9uKDIpO1xuXG5cdFx0bGV0IGZpbGUxOkZpbGUgPSBhd2FpdCBtYWtlVGVzdEZpbGUoMSk7XG5cdFx0bGV0IGZpbGUyOkZpbGUgPSBhd2FpdCBtYWtlVGVzdEZpbGUoMik7XG5cdFx0bGV0IGZpbGUzOkZpbGUgPSBhd2FpdCBtYWtlVGVzdEZpbGUoMyk7XG5cblx0XHRjb25zdCBmaWxlQ29udHJvbGxlciA9IG5ldyBGaWxlQ29udHJvbGxlcigpO1xuXHRcdGZpbGUxID0gYXdhaXQgZmlsZUNvbnRyb2xsZXIuY3JlYXRlRmlsZShzZXNzaW9uMS5pZCwgZmlsZTEpO1xuXHRcdGZpbGUyID0gYXdhaXQgZmlsZUNvbnRyb2xsZXIuY3JlYXRlRmlsZShzZXNzaW9uMS5pZCwgZmlsZTIpO1xuXHRcdGZpbGUzID0gYXdhaXQgZmlsZUNvbnRyb2xsZXIuY3JlYXRlRmlsZShzZXNzaW9uMi5pZCwgZmlsZTMpO1xuXG5cdFx0Y29uc3QgZmlsZUlkMSA9IGZpbGUxLmlkO1xuXHRcdGNvbnN0IGZpbGVJZDIgPSBmaWxlMi5pZDtcblxuXHRcdC8vIENhbid0IGdldCBzb21lb25lIGVsc2UgZmlsZVxuXHRcdGNvbnN0IGVycm9yID0gYXdhaXQgY2hlY2tUaHJvd0FzeW5jKGFzeW5jICgpID0+IGZpbGVDb250cm9sbGVyLmdldEZpbGUoc2Vzc2lvbjEuaWQsIGZpbGUzLmlkKSk7XG5cdFx0ZXhwZWN0KGVycm9yIGluc3RhbmNlb2YgRXJyb3JGb3JiaWRkZW4pLnRvQmUodHJ1ZSk7XG5cblx0XHRmaWxlMSA9IGF3YWl0IGZpbGVDb250cm9sbGVyLmdldEZpbGUoc2Vzc2lvbjEuaWQsIGZpbGUxLmlkKTtcblx0XHRleHBlY3QoZmlsZTEuaWQpLnRvQmUoZmlsZUlkMSk7XG5cblx0XHRjb25zdCBhbGxGaWxlcyA9IGF3YWl0IGZpbGVDb250cm9sbGVyLmdldEFsbChzZXNzaW9uMS5pZCk7XG5cdFx0ZXhwZWN0KGFsbEZpbGVzLmxlbmd0aCkudG9CZSgyKTtcblx0XHRleHBlY3QoSlNPTi5zdHJpbmdpZnkoYWxsRmlsZXMubWFwKGYgPT4gZi5pZCkuc29ydCgpKSkudG9CZShKU09OLnN0cmluZ2lmeShbZmlsZUlkMSwgZmlsZUlkMl0uc29ydCgpKSk7XG5cdH0pKTtcblxuXHRpdCgnc2hvdWxkIG5vdCBsZXQgY3JlYXRlIGEgZmlsZSBpbiBhIGRpcmVjdG9yeSBub3Qgb3duZWQgYnkgdXNlcicsIGFzeW5jVGVzdChhc3luYyBmdW5jdGlvbigpIHtcblx0XHRjb25zdCB7IHNlc3Npb24gfSA9IGF3YWl0IGNyZWF0ZVVzZXJBbmRTZXNzaW9uKDEpO1xuXG5cdFx0Y29uc3QgdXNlcjIgPSBhd2FpdCBjcmVhdGVVc2VyKDIpO1xuXHRcdGNvbnN0IGZpbGVNb2RlbDIgPSBuZXcgRmlsZU1vZGVsKHsgdXNlcklkOiB1c2VyMi5pZCB9KTtcblx0XHRjb25zdCByb290RmlsZTIgPSBhd2FpdCBmaWxlTW9kZWwyLnVzZXJSb290RmlsZSgpO1xuXG5cdFx0Y29uc3QgZmlsZTpGaWxlID0gYXdhaXQgbWFrZVRlc3RGaWxlKCk7XG5cdFx0ZmlsZS5wYXJlbnRfaWQgPSByb290RmlsZTIuaWQ7XG5cdFx0Y29uc3QgZmlsZUNvbnRyb2xsZXIgPSBuZXcgRmlsZUNvbnRyb2xsZXIoKTtcblxuXHRcdGNvbnN0IGhhc1Rocm93biA9IGF3YWl0IGNoZWNrVGhyb3dBc3luYyhhc3luYyAoKSA9PiBmaWxlQ29udHJvbGxlci5jcmVhdGVGaWxlKHNlc3Npb24uaWQsIGZpbGUpKTtcblx0XHRleHBlY3QoISFoYXNUaHJvd24pLnRvQmUodHJ1ZSk7XG5cdH0pKTtcblxuXHRpdCgnc2hvdWxkIHVwZGF0ZSBmaWxlIHByb3BlcnRpZXMnLCBhc3luY1Rlc3QoYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgeyBzZXNzaW9uLCB1c2VyIH0gPSBhd2FpdCBjcmVhdGVVc2VyQW5kU2Vzc2lvbigxLCB0cnVlKTtcblxuXHRcdGNvbnN0IGZpbGVNb2RlbCA9IG5ldyBGaWxlTW9kZWwoeyB1c2VySWQ6IHVzZXIuaWQgfSk7XG5cblx0XHRsZXQgZmlsZTpGaWxlID0gYXdhaXQgbWFrZVRlc3RGaWxlKCk7XG5cblx0XHRjb25zdCBmaWxlQ29udHJvbGxlciA9IG5ldyBGaWxlQ29udHJvbGxlcigpO1xuXHRcdGZpbGUgPSBhd2FpdCBmaWxlQ29udHJvbGxlci5jcmVhdGVGaWxlKHNlc3Npb24uaWQsIGZpbGUpO1xuXG5cdFx0Ly8gQ2FuJ3QgaGF2ZSBmaWxlIHdpdGggZW1wdHkgbmFtZVxuXHRcdGNvbnN0IGhhc1Rocm93biA9IGF3YWl0IGNoZWNrVGhyb3dBc3luYyhhc3luYyAoKSA9PiAgZmlsZUNvbnRyb2xsZXIudXBkYXRlRmlsZShzZXNzaW9uLmlkLCB7IGlkOiBmaWxlLmlkLCBuYW1lOiAnJyB9KSk7XG5cdFx0ZXhwZWN0KCEhaGFzVGhyb3duKS50b0JlKHRydWUpO1xuXG5cdFx0YXdhaXQgZmlsZUNvbnRyb2xsZXIudXBkYXRlRmlsZShzZXNzaW9uLmlkLCB7IGlkOiBmaWxlLmlkLCBuYW1lOiAnbW9kaWZpZWQuanBnJyB9KTtcblx0XHRmaWxlID0gYXdhaXQgZmlsZU1vZGVsLmxvYWQoZmlsZS5pZCk7XG5cdFx0ZXhwZWN0KGZpbGUubmFtZSkudG9CZSgnbW9kaWZpZWQuanBnJyk7XG5cblx0XHRhd2FpdCBmaWxlQ29udHJvbGxlci51cGRhdGVGaWxlKHNlc3Npb24uaWQsIHsgaWQ6IGZpbGUuaWQsIG1pbWVfdHlwZTogJ2ltYWdlL3BuZycgfSk7XG5cdFx0ZmlsZSA9IGF3YWl0IGZpbGVNb2RlbC5sb2FkKGZpbGUuaWQpO1xuXHRcdGV4cGVjdChmaWxlLm1pbWVfdHlwZSkudG9CZSgnaW1hZ2UvcG5nJyk7XG5cdH0pKTtcblxuXHRpdCgnc2hvdWxkIG5vdCBhbGxvdyBkdXBsaWNhdGUgZmlsZW5hbWVzJywgYXN5bmNUZXN0KGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IHsgc2Vzc2lvbiB9ID0gYXdhaXQgY3JlYXRlVXNlckFuZFNlc3Npb24oMSwgdHJ1ZSk7XG5cblx0XHRsZXQgZmlsZTE6RmlsZSA9IGF3YWl0IG1ha2VUZXN0RmlsZSgxKTtcblx0XHRsZXQgZmlsZTI6RmlsZSA9IGF3YWl0IG1ha2VUZXN0RmlsZSgxKTtcblxuXHRcdGNvbnN0IGZpbGVDb250cm9sbGVyID0gbmV3IEZpbGVDb250cm9sbGVyKCk7XG5cdFx0ZmlsZTEgPSBhd2FpdCBmaWxlQ29udHJvbGxlci5jcmVhdGVGaWxlKHNlc3Npb24uaWQsIGZpbGUxKTtcblxuXHRcdGV4cGVjdCghIWZpbGUxLmlkKS50b0JlKHRydWUpO1xuXHRcdGV4cGVjdChmaWxlMS5uYW1lKS50b0JlKGZpbGUyLm5hbWUpO1xuXG5cdFx0Y29uc3QgaGFzVGhyb3duID0gYXdhaXQgY2hlY2tUaHJvd0FzeW5jKGFzeW5jICgpID0+IGF3YWl0IGZpbGVDb250cm9sbGVyLmNyZWF0ZUZpbGUoc2Vzc2lvbi5pZCwgZmlsZTIpKTtcblx0XHRleHBlY3QoISFoYXNUaHJvd24pLnRvQmUodHJ1ZSk7XG5cdH0pKTtcblxuXHRpdCgnc2hvdWxkIGNoYW5nZSB0aGUgZmlsZSBwYXJlbnQnLCBhc3luY1Rlc3QoYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgeyBzZXNzaW9uOiBzZXNzaW9uMSwgdXNlcjogdXNlcjEgfSA9IGF3YWl0IGNyZWF0ZVVzZXJBbmRTZXNzaW9uKDEpO1xuXHRcdGNvbnN0IHsgdXNlcjogdXNlcjIgfSA9IGF3YWl0IGNyZWF0ZVVzZXJBbmRTZXNzaW9uKDIpO1xuXHRcdGxldCBoYXNUaHJvd246YW55ID0gbnVsbDtcblxuXHRcdGNvbnN0IGZpbGVNb2RlbCA9IG5ldyBGaWxlTW9kZWwoeyB1c2VySWQ6IHVzZXIxLmlkIH0pO1xuXG5cdFx0bGV0IGZpbGU6RmlsZSA9IGF3YWl0IG1ha2VUZXN0RmlsZSgpO1xuXHRcdGxldCBmaWxlMjpGaWxlID0gYXdhaXQgbWFrZVRlc3RGaWxlKDIpO1xuXHRcdGxldCBkaXI6RmlsZSA9IGF3YWl0IG1ha2VUZXN0RGlyZWN0b3J5KCk7XG5cblx0XHRjb25zdCBmaWxlQ29udHJvbGxlciA9IG5ldyBGaWxlQ29udHJvbGxlcigpO1xuXHRcdGZpbGUgPSBhd2FpdCBmaWxlQ29udHJvbGxlci5jcmVhdGVGaWxlKHNlc3Npb24xLmlkLCBmaWxlKTtcblx0XHRmaWxlMiA9IGF3YWl0IGZpbGVDb250cm9sbGVyLmNyZWF0ZUZpbGUoc2Vzc2lvbjEuaWQsIGZpbGUyKTtcblx0XHRkaXIgPSBhd2FpdCBmaWxlQ29udHJvbGxlci5jcmVhdGVGaWxlKHNlc3Npb24xLmlkLCBkaXIpO1xuXG5cdFx0Ly8gQ2FuJ3Qgc2V0IHBhcmVudCB0byBhbm90aGVyIG5vbi1kaXJlY3RvcnkgZmlsZVxuXHRcdGhhc1Rocm93biA9IGF3YWl0IGNoZWNrVGhyb3dBc3luYyhhc3luYyAoKSA9PiBhd2FpdCBmaWxlQ29udHJvbGxlci51cGRhdGVGaWxlKHNlc3Npb24xLmlkLCB7IGlkOiBmaWxlLmlkLCBwYXJlbnRfaWQ6IGZpbGUyLmlkIH0pKTtcblx0XHRleHBlY3QoISFoYXNUaHJvd24pLnRvQmUodHJ1ZSk7XG5cblx0XHRjb25zdCBmaWxlTW9kZWwyID0gbmV3IEZpbGVNb2RlbCh7IHVzZXJJZDogdXNlcjIuaWQgfSk7XG5cdFx0Y29uc3QgdXNlclJvb3QyID0gYXdhaXQgZmlsZU1vZGVsMi51c2VyUm9vdEZpbGUoKTtcblxuXHRcdC8vIENhbid0IHNldCBwYXJlbnQgdG8gc29tZW9uZSBlbHNlIGRpcmVjdG9yeVxuXHRcdGhhc1Rocm93biA9IGF3YWl0IGNoZWNrVGhyb3dBc3luYyhhc3luYyAoKSA9PiBhd2FpdCBmaWxlQ29udHJvbGxlci51cGRhdGVGaWxlKHNlc3Npb24xLmlkLCB7IGlkOiBmaWxlLmlkLCBwYXJlbnRfaWQ6IHVzZXJSb290Mi5pZCB9KSk7XG5cdFx0ZXhwZWN0KCEhaGFzVGhyb3duKS50b0JlKHRydWUpO1xuXG5cdFx0YXdhaXQgZmlsZUNvbnRyb2xsZXIudXBkYXRlRmlsZShzZXNzaW9uMS5pZCwgeyBpZDogZmlsZS5pZCwgcGFyZW50X2lkOiBkaXIuaWQgfSk7XG5cblx0XHRmaWxlID0gYXdhaXQgZmlsZU1vZGVsLmxvYWQoZmlsZS5pZCk7XG5cblx0XHRleHBlY3QoISFmaWxlLnBhcmVudF9pZCkudG9CZSh0cnVlKTtcblx0XHRleHBlY3QoZmlsZS5wYXJlbnRfaWQpLnRvQmUoZGlyLmlkKTtcblx0fSkpO1xuXG5cdGl0KCdzaG91bGQgZGVsZXRlIGEgZmlsZScsIGFzeW5jVGVzdChhc3luYyBmdW5jdGlvbigpIHtcblx0XHRjb25zdCB7IHVzZXIsIHNlc3Npb24gfSA9IGF3YWl0IGNyZWF0ZVVzZXJBbmRTZXNzaW9uKDEsIHRydWUpO1xuXG5cdFx0Y29uc3QgZmlsZUNvbnRyb2xsZXIgPSBuZXcgRmlsZUNvbnRyb2xsZXIoKTtcblx0XHRjb25zdCBmaWxlTW9kZWwgPSBuZXcgRmlsZU1vZGVsKHsgdXNlcklkOiB1c2VyLmlkIH0pO1xuXHRcdGNvbnN0IHBlcm1pc3Npb25Nb2RlbCA9IG5ldyBQZXJtaXNzaW9uTW9kZWwoKTtcblxuXHRcdGxldCBmaWxlMTpGaWxlID0gYXdhaXQgbWFrZVRlc3RGaWxlKDEpO1xuXHRcdGxldCBmaWxlMjpGaWxlID0gYXdhaXQgbWFrZVRlc3RGaWxlKDIpO1xuXG5cdFx0ZmlsZTEgPSBhd2FpdCBmaWxlQ29udHJvbGxlci5jcmVhdGVGaWxlKHNlc3Npb24uaWQsIGZpbGUxKTtcblx0XHRmaWxlMiA9IGF3YWl0IGZpbGVDb250cm9sbGVyLmNyZWF0ZUZpbGUoc2Vzc2lvbi5pZCwgZmlsZTIpO1xuXHRcdGxldCBhbGxGaWxlczpGaWxlW10gPSBhd2FpdCBmaWxlTW9kZWwuYWxsKCk7XG5cdFx0Y29uc3QgYmVmb3JlQ291bnQ6bnVtYmVyID0gYWxsRmlsZXMubGVuZ3RoO1xuXG5cdFx0ZXhwZWN0KChhd2FpdCBwZXJtaXNzaW9uTW9kZWwuZmlsZVBlcm1pc3Npb25zKGZpbGUyLmlkKSkubGVuZ3RoKS50b0JlKDEpO1xuXHRcdGF3YWl0IGZpbGVDb250cm9sbGVyLmRlbGV0ZUZpbGUoc2Vzc2lvbi5pZCwgZmlsZTIuaWQpO1xuXHRcdGFsbEZpbGVzID0gYXdhaXQgZmlsZU1vZGVsLmFsbCgpO1xuXHRcdGV4cGVjdChhbGxGaWxlcy5sZW5ndGgpLnRvQmUoYmVmb3JlQ291bnQgLSAxKTtcblx0XHRleHBlY3QoKGF3YWl0IHBlcm1pc3Npb25Nb2RlbC5maWxlUGVybWlzc2lvbnMoZmlsZTIuaWQpKS5sZW5ndGgpLnRvQmUoMCk7XG5cdH0pKTtcblxuXHRpdCgnc2hvdWxkIG5vdCBkZWxldGUgc29tZW9uZSBlbHNlIGZpbGUnLCBhc3luY1Rlc3QoYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgeyBzZXNzaW9uOiBzZXNzaW9uMSB9ID0gYXdhaXQgY3JlYXRlVXNlckFuZFNlc3Npb24oMSk7XG5cdFx0Y29uc3QgeyBzZXNzaW9uOiBzZXNzaW9uMiB9ID0gYXdhaXQgY3JlYXRlVXNlckFuZFNlc3Npb24oMik7XG5cblx0XHRjb25zdCBmaWxlQ29udHJvbGxlciA9IG5ldyBGaWxlQ29udHJvbGxlcigpO1xuXG5cdFx0bGV0IGZpbGUxOkZpbGUgPSBhd2FpdCBtYWtlVGVzdEZpbGUoMSk7XG5cdFx0bGV0IGZpbGUyOkZpbGUgPSBhd2FpdCBtYWtlVGVzdEZpbGUoMik7XG5cblx0XHRmaWxlMSA9IGF3YWl0IGZpbGVDb250cm9sbGVyLmNyZWF0ZUZpbGUoc2Vzc2lvbjEuaWQsIGZpbGUxKTtcblx0XHRmaWxlMiA9IGF3YWl0IGZpbGVDb250cm9sbGVyLmNyZWF0ZUZpbGUoc2Vzc2lvbjIuaWQsIGZpbGUyKTtcblxuXHRcdGNvbnN0IGVycm9yID0gYXdhaXQgY2hlY2tUaHJvd0FzeW5jKGFzeW5jICgpID0+IGF3YWl0IGZpbGVDb250cm9sbGVyLmRlbGV0ZUZpbGUoc2Vzc2lvbjEuaWQsIGZpbGUyLmlkKSk7XG5cdFx0ZXhwZWN0KGVycm9yIGluc3RhbmNlb2YgRXJyb3JGb3JiaWRkZW4pLnRvQmUodHJ1ZSk7XG5cdH0pKTtcblxuXHRpdCgnc2hvdWxkIGxldCBhZG1pbiBjaGFuZ2Ugb3IgZGVsZXRlIGZpbGVzJywgYXN5bmNUZXN0KGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IHsgc2Vzc2lvbjogYWRtaW5TZXNzaW9uIH0gPSBhd2FpdCBjcmVhdGVVc2VyQW5kU2Vzc2lvbigxLCB0cnVlKTtcblx0XHRjb25zdCB7IHNlc3Npb24sIHVzZXIgfSA9IGF3YWl0IGNyZWF0ZVVzZXJBbmRTZXNzaW9uKDIpO1xuXG5cdFx0bGV0IGZpbGU6RmlsZSA9IGF3YWl0IG1ha2VUZXN0RmlsZSgpO1xuXG5cdFx0Y29uc3QgZmlsZU1vZGVsID0gbmV3IEZpbGVNb2RlbCh7IHVzZXJJZDogdXNlci5pZCB9KTtcblx0XHRjb25zdCBmaWxlQ29udHJvbGxlciA9IG5ldyBGaWxlQ29udHJvbGxlcigpO1xuXHRcdGZpbGUgPSBhd2FpdCBmaWxlQ29udHJvbGxlci5jcmVhdGVGaWxlKHNlc3Npb24uaWQsIGZpbGUpO1xuXG5cdFx0YXdhaXQgZmlsZUNvbnRyb2xsZXIudXBkYXRlRmlsZShhZG1pblNlc3Npb24uaWQsIHsgaWQ6IGZpbGUuaWQsIG5hbWU6ICdtb2RpZmllZC5qcGcnIH0pO1xuXHRcdGZpbGUgPSBhd2FpdCBmaWxlTW9kZWwubG9hZChmaWxlLmlkKTtcblx0XHRleHBlY3QoZmlsZS5uYW1lKS50b0JlKCdtb2RpZmllZC5qcGcnKTtcblxuXHRcdGF3YWl0IGZpbGVDb250cm9sbGVyLmRlbGV0ZUZpbGUoYWRtaW5TZXNzaW9uLmlkLCBmaWxlLmlkKTtcblx0XHRjb25zdCBlcnJvciA9IGF3YWl0IGNoZWNrVGhyb3dBc3luYyhhc3luYyAoKSA9PiBhd2FpdCBmaWxlTW9kZWwubG9hZChmaWxlLmlkKSk7XG5cdFx0ZXhwZWN0KCEhZXJyb3IpLnRvQmUodHJ1ZSk7XG5cdH0pKTtcblxuXHRpdCgnc2hvdWxkIHVwZGF0ZSBhIGZpbGUgY29udGVudCcsIGFzeW5jVGVzdChhc3luYyBmdW5jdGlvbigpIHtcblx0XHRjb25zdCB7IHNlc3Npb24gfSA9IGF3YWl0IGNyZWF0ZVVzZXJBbmRTZXNzaW9uKDEsIHRydWUpO1xuXG5cdFx0Y29uc3QgZmlsZTpGaWxlID0gYXdhaXQgbWFrZVRlc3RGaWxlKDEpO1xuXHRcdGNvbnN0IGZpbGUyOkZpbGUgPSBhd2FpdCBtYWtlVGVzdEZpbGUoMiwgJ3BuZycpO1xuXG5cdFx0Y29uc3QgZmlsZUNvbnRyb2xsZXIgPSBuZXcgRmlsZUNvbnRyb2xsZXIoKTtcblx0XHRsZXQgbmV3RmlsZSA9IGF3YWl0IGZpbGVDb250cm9sbGVyLmNyZWF0ZUZpbGUoc2Vzc2lvbi5pZCwgZmlsZSk7XG5cdFx0YXdhaXQgZmlsZUNvbnRyb2xsZXIudXBkYXRlRmlsZUNvbnRlbnQoc2Vzc2lvbi5pZCwgbmV3RmlsZS5pZCwgZmlsZTIuY29udGVudCk7XG5cblx0XHRjb25zdCBtb2RGaWxlID0gYXdhaXQgZmlsZUNvbnRyb2xsZXIuZ2V0RmlsZUNvbnRlbnQoc2Vzc2lvbi5pZCwgbmV3RmlsZS5pZCk7XG5cblx0XHRjb25zdCBvcmlnaW5hbEZpbGVIZXggPSAoZmlsZS5jb250ZW50IGFzIEJ1ZmZlcikudG9TdHJpbmcoJ2hleCcpO1xuXHRcdGNvbnN0IG1vZEZpbGVIZXggPSAobW9kRmlsZS5jb250ZW50IGFzIEJ1ZmZlcikudG9TdHJpbmcoJ2hleCcpO1xuXHRcdGV4cGVjdChtb2RGaWxlSGV4Lmxlbmd0aCA+IDApLnRvQmUodHJ1ZSk7XG5cdFx0ZXhwZWN0KG1vZEZpbGVIZXggPT09IG9yaWdpbmFsRmlsZUhleCkudG9CZShmYWxzZSk7XG5cdFx0ZXhwZWN0KG1vZEZpbGUuc2l6ZSkudG9CZShtb2RGaWxlLmNvbnRlbnQuYnl0ZUxlbmd0aCk7XG5cdFx0ZXhwZWN0KG5ld0ZpbGUuc2l6ZSkudG9CZShmaWxlLmNvbnRlbnQuYnl0ZUxlbmd0aCk7XG5cdH0pKTtcblxuXHRpdCgnc2hvdWxkIGFsbG93IGFkZHJlc3NpbmcgYSBmaWxlIGJ5IHBhdGgnLCBhc3luY1Rlc3QoYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgeyBzZXNzaW9uIH0gPSBhd2FpdCBjcmVhdGVVc2VyQW5kU2Vzc2lvbigxLCB0cnVlKTtcblxuXHRcdGNvbnN0IGZpbGVDb250cm9sbGVyID0gbmV3IEZpbGVDb250cm9sbGVyKCk7XG5cblx0XHRsZXQgZGlyID0gYXdhaXQgZmlsZUNvbnRyb2xsZXIuY3JlYXRlRmlsZShzZXNzaW9uLmlkLCBhd2FpdCBtYWtlVGVzdERpcmVjdG9yeSgnRG9jcycpKTtcblx0XHRsZXQgZmlsZTEgPSBhd2FpdCBmaWxlQ29udHJvbGxlci5jcmVhdGVGaWxlKHNlc3Npb24uaWQsIGF3YWl0IG1ha2VUZXN0RmlsZSgxKSk7XG5cdFx0bGV0IGZpbGUyID0gYXdhaXQgZmlsZUNvbnRyb2xsZXIuY3JlYXRlRmlsZShzZXNzaW9uLmlkLCBhd2FpdCBtYWtlVGVzdEZpbGUoMiwgJ2pwZycsIGRpci5pZCkpO1xuXG5cdFx0bGV0IGFEaXIgPSBhd2FpdCBmaWxlQ29udHJvbGxlci5nZXRGaWxlKHNlc3Npb24uaWQsIHsgdmFsdWU6ICdyb290Oi9Eb2NzJywgYWRkcmVzc2luZ1R5cGU6IEl0ZW1BZGRyZXNzaW5nVHlwZS5QYXRoIH0pO1xuXHRcdGV4cGVjdChhRGlyLmlkKS50b0JlKGRpci5pZCk7XG5cblx0XHRsZXQgYUZpbGUxID0gYXdhaXQgZmlsZUNvbnRyb2xsZXIuZ2V0RmlsZShzZXNzaW9uLmlkLCB7IHZhbHVlOiAncm9vdDovcGhvdG8uanBnJywgYWRkcmVzc2luZ1R5cGU6IEl0ZW1BZGRyZXNzaW5nVHlwZS5QYXRoIH0pO1xuXHRcdGV4cGVjdChhRmlsZTEuaWQpLnRvQmUoZmlsZTEuaWQpO1xuXG5cdFx0bGV0IGFGaWxlMiA9IGF3YWl0IGZpbGVDb250cm9sbGVyLmdldEZpbGUoc2Vzc2lvbi5pZCwgeyB2YWx1ZTogJ3Jvb3Q6L0RvY3MvcGhvdG8tMi5qcGcnLCBhZGRyZXNzaW5nVHlwZTogSXRlbUFkZHJlc3NpbmdUeXBlLlBhdGggfSk7XG5cdFx0ZXhwZWN0KGFGaWxlMi5pZCkudG9CZShmaWxlMi5pZCk7XG5cblx0XHRhd2FpdCBmaWxlQ29udHJvbGxlci5kZWxldGVGaWxlKHNlc3Npb24uaWQsIHsgdmFsdWU6ICdyb290Oi9Eb2NzL3Bob3RvLTIuanBnJywgYWRkcmVzc2luZ1R5cGU6IEl0ZW1BZGRyZXNzaW5nVHlwZS5QYXRoIH0pO1xuXHRcdGNvbnN0IGVycm9yID0gYXdhaXQgY2hlY2tUaHJvd0FzeW5jKGFzeW5jICgpID0+IGZpbGVDb250cm9sbGVyLmdldEZpbGUoc2Vzc2lvbi5pZCwgeyB2YWx1ZTogJ3Jvb3Q6L0RvY3MvcGhvdG8tMi5qcGcnLCBhZGRyZXNzaW5nVHlwZTogSXRlbUFkZHJlc3NpbmdUeXBlLlBhdGggfSkpO1xuXHRcdGV4cGVjdChlcnJvciBpbnN0YW5jZW9mIEVycm9yTm90Rm91bmQpLnRvQmUodHJ1ZSk7XG5cdH0pKTtcblxufSk7XG4iXX0=
