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
var UserController_1 = require("../../app/controllers/UserController");
var db_1 = require("../../app/db");
var UserModel_1 = require("../../app/models/UserModel");
var FileModel_1 = require("../../app/models/FileModel");
var PermissionModel_1 = require("../../app/models/PermissionModel");
var errors_1 = require("../../app/utils/errors");
describe('UserController', function () {
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
    it('should create a new user along with his root file', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var session, controller, permissionModel, newUser, userModel, userFromModel, fileModel, rootFile, permissions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1, true)];
                    case 1:
                        session = (_a.sent()).session;
                        controller = new UserController_1.default();
                        permissionModel = new PermissionModel_1.default();
                        return [4 /*yield*/, controller.createUser(session.id, { email: 'test@example.com', password: '123456' })];
                    case 2:
                        newUser = _a.sent();
                        expect(!!newUser).toBe(true);
                        expect(!!newUser.id).toBe(true);
                        expect(!!newUser.is_admin).toBe(false);
                        expect(!!newUser.email).toBe(true);
                        expect(!newUser.password).toBe(true);
                        userModel = new UserModel_1.default({ userId: newUser.id });
                        return [4 /*yield*/, userModel.load(newUser.id)];
                    case 3:
                        userFromModel = _a.sent();
                        expect(!!userFromModel.password).toBe(true);
                        expect(userFromModel.password === '123456').toBe(false); // Password has been hashed
                        fileModel = new FileModel_1.default({ userId: newUser.id });
                        return [4 /*yield*/, fileModel.userRootFile()];
                    case 4:
                        rootFile = _a.sent();
                        expect(!!rootFile).toBe(true);
                        expect(!!rootFile.id).toBe(true);
                        return [4 /*yield*/, permissionModel.filePermissions(rootFile.id)];
                    case 5:
                        permissions = _a.sent();
                        expect(permissions.length).toBe(1);
                        expect(permissions[0].user_id).toBe(newUser.id);
                        expect(permissions[0].item_type).toBe(db_1.ItemType.File);
                        expect(permissions[0].item_id).toBe(rootFile.id);
                        expect(permissions[0].is_owner).toBe(1);
                        expect(permissions[0].can_read).toBe(1);
                        expect(permissions[0].can_write).toBe(1);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should not create anything, neither user, root file nor permissions, if user creation fail', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, session, controller, fileModel, permissionModel, userModel, beforeFileCount, beforeUserCount, beforePermissionCount, hasThrown, error_1, afterFileCount, afterUserCount, afterPermissionCount;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1, true)];
                    case 1:
                        _a = _b.sent(), user = _a.user, session = _a.session;
                        controller = new UserController_1.default();
                        fileModel = new FileModel_1.default({ userId: user.id });
                        permissionModel = new PermissionModel_1.default();
                        userModel = new UserModel_1.default({ userId: user.id });
                        return [4 /*yield*/, controller.createUser(session.id, { email: 'test@example.com', password: '123456' })];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, fileModel.all()];
                    case 3:
                        beforeFileCount = (_b.sent()).length;
                        return [4 /*yield*/, userModel.all()];
                    case 4:
                        beforeUserCount = (_b.sent()).length;
                        return [4 /*yield*/, permissionModel.all()];
                    case 5:
                        beforePermissionCount = (_b.sent()).length;
                        hasThrown = false;
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, controller.createUser(session.id, { email: 'test@example.com', password: '123456' })];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        error_1 = _b.sent();
                        hasThrown = true;
                        return [3 /*break*/, 9];
                    case 9:
                        expect(hasThrown).toBe(true);
                        return [4 /*yield*/, fileModel.all()];
                    case 10:
                        afterFileCount = (_b.sent()).length;
                        return [4 /*yield*/, userModel.all()];
                    case 11:
                        afterUserCount = (_b.sent()).length;
                        return [4 /*yield*/, permissionModel.all()];
                    case 12:
                        afterPermissionCount = (_b.sent()).length;
                        expect(beforeFileCount).toBe(afterFileCount);
                        expect(beforeUserCount).toBe(afterUserCount);
                        expect(beforePermissionCount).toBe(afterPermissionCount);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should change user properties', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, session, controller, userModel, modUser, previousPassword;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1, true)];
                    case 1:
                        _a = _b.sent(), user = _a.user, session = _a.session;
                        controller = new UserController_1.default();
                        userModel = new UserModel_1.default({ userId: user.id });
                        return [4 /*yield*/, controller.updateUser(session.id, { id: user.id, email: 'test2@example.com' })];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, userModel.load(user.id)];
                    case 3:
                        modUser = _b.sent();
                        expect(modUser.email).toBe('test2@example.com');
                        previousPassword = modUser.password;
                        return [4 /*yield*/, controller.updateUser(session.id, { id: user.id, password: 'abcdefgh' })];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, userModel.load(user.id)];
                    case 5:
                        modUser = _b.sent();
                        expect(!!modUser.password).toBe(true);
                        expect(modUser.password === previousPassword).toBe(false);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should get a user', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, user, session, controller, gotUser;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession()];
                    case 1:
                        _a = _b.sent(), user = _a.user, session = _a.session;
                        controller = new UserController_1.default();
                        return [4 /*yield*/, controller.getUser(session.id, user.id)];
                    case 2:
                        gotUser = _b.sent();
                        expect(gotUser.id).toBe(user.id);
                        expect(gotUser.email).toBe(user.email);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should validate user objects', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, admin, adminSession, _b, user1, userSession1, user2, error, controller;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1, true)];
                    case 1:
                        _a = _c.sent(), admin = _a.user, adminSession = _a.session;
                        return [4 /*yield*/, testUtils_1.createUserAndSession(2, false)];
                    case 2:
                        _b = _c.sent(), user1 = _b.user, userSession1 = _b.session;
                        return [4 /*yield*/, testUtils_1.createUserAndSession(3, false)];
                    case 3:
                        user2 = (_c.sent()).user;
                        error = null;
                        controller = new UserController_1.default();
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, controller.createUser(userSession1.id, { email: 'newone@example.com', password: '1234546' })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 4:
                        // Non-admin user can't create a user
                        error = _c.sent();
                        expect(error instanceof errors_1.ErrorForbidden).toBe(true);
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, controller.createUser(adminSession.id, { email: '', password: '1234546' })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 5:
                        // Email must be set
                        error = _c.sent();
                        expect(error instanceof errors_1.ErrorUnprocessableEntity).toBe(true);
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, controller.createUser(adminSession.id, { email: 'newone@example.com', password: '' })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 6:
                        // Password must be set
                        error = _c.sent();
                        expect(error instanceof errors_1.ErrorUnprocessableEntity).toBe(true);
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, controller.updateUser(userSession1.id, { email: 'newone@example.com' })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 7:
                        // ID must be set when updating a user
                        error = _c.sent();
                        expect(error instanceof errors_1.ErrorUnprocessableEntity).toBe(true);
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, controller.updateUser(userSession1.id, { id: user2.id, email: 'newone@example.com' })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 8:
                        // non-admin user cannot modify another user
                        error = _c.sent();
                        expect(error instanceof errors_1.ErrorForbidden).toBe(true);
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, controller.updateUser(userSession1.id, { id: user1.id, email: '' })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 9:
                        // email must be set
                        error = _c.sent();
                        expect(error instanceof errors_1.ErrorUnprocessableEntity).toBe(true);
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, controller.updateUser(userSession1.id, { id: user1.id, password: '' })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 10:
                        // password must be set
                        error = _c.sent();
                        expect(error instanceof errors_1.ErrorUnprocessableEntity).toBe(true);
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, controller.updateUser(userSession1.id, { id: user1.id, is_admin: 1 })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 11:
                        // non-admin user cannot make a user an admin
                        error = _c.sent();
                        expect(error instanceof errors_1.ErrorForbidden).toBe(true);
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, controller.updateUser(adminSession.id, { id: admin.id, is_admin: 0 })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 12:
                        // non-admin user cannot remove admin bit from themselves
                        error = _c.sent();
                        expect(error instanceof errors_1.ErrorUnprocessableEntity).toBe(true);
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, controller.updateUser(userSession1.id, { id: user1.id, email: user2.email })];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 13:
                        // there is already a user with this email
                        error = _c.sent();
                        expect(error instanceof errors_1.ErrorUnprocessableEntity).toBe(true);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should delete a user', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, admin, adminSession, _b, user1, session1, _c, user2, session2, controller, userModel, allUsers, beforeCount, error, _d, _e, fileModel, _f, _g, _h;
            var _this = this;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUserAndSession(1, true)];
                    case 1:
                        _a = _j.sent(), admin = _a.user, adminSession = _a.session;
                        return [4 /*yield*/, testUtils_1.createUserAndSession(2, false)];
                    case 2:
                        _b = _j.sent(), user1 = _b.user, session1 = _b.session;
                        return [4 /*yield*/, testUtils_1.createUserAndSession(3, false)];
                    case 3:
                        _c = _j.sent(), user2 = _c.user, session2 = _c.session;
                        controller = new UserController_1.default();
                        userModel = new UserModel_1.default({ userId: admin.id });
                        return [4 /*yield*/, userModel.all()];
                    case 4:
                        allUsers = _j.sent();
                        beforeCount = allUsers.length;
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, controller.deleteUser(session1.id, user2.id)];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); })];
                    case 5:
                        error = _j.sent();
                        expect(error instanceof errors_1.ErrorForbidden).toBe(true);
                        _d = expect;
                        return [4 /*yield*/, userModel.all()];
                    case 6:
                        _d.apply(void 0, [(_j.sent()).length]).toBe(beforeCount);
                        // Admin can delete any user
                        return [4 /*yield*/, controller.deleteUser(adminSession.id, user1.id)];
                    case 7:
                        // Admin can delete any user
                        _j.sent();
                        _e = expect;
                        return [4 /*yield*/, userModel.all()];
                    case 8:
                        _e.apply(void 0, [(_j.sent()).length]).toBe(beforeCount - 1);
                        fileModel = new FileModel_1.default({ userId: user2.id });
                        _f = expect;
                        return [4 /*yield*/, fileModel.userRootFile()];
                    case 9:
                        _f.apply(void 0, [!!(_j.sent())]).toBe(true);
                        return [4 /*yield*/, controller.deleteUser(session2.id, user2.id)];
                    case 10:
                        _j.sent();
                        _g = expect;
                        return [4 /*yield*/, userModel.all()];
                    case 11:
                        _g.apply(void 0, [(_j.sent()).length]).toBe(beforeCount - 2);
                        _h = expect;
                        return [4 /*yield*/, fileModel.userRootFile()];
                    case 12:
                        _h.apply(void 0, [!!(_j.sent())]).toBe(false);
                        return [2 /*return*/];
                }
            });
        });
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LEVBQUUsRUFBQTs7d0JBQXhDLGtCQUFPLENBQUMsQ0FBQyxDQUFDLFNBQThCLENBQUMsRUFBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDdEQscUJBQU0sVUFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQTs7d0JBQWxELFNBQWtELENBQUM7d0JBQ25ELEtBQUEsTUFBTSxDQUFBO3dCQUFFLHFCQUFNLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBQTs7d0JBQTdCLGtCQUFPLENBQUMsU0FBcUIsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQzdELEtBQUEsTUFBTSxDQUFBO3dCQUFJLHFCQUFNLFNBQVMsQ0FBQyxZQUFZLEVBQUUsRUFBQTs7d0JBQXhDLGtCQUFPLENBQUMsQ0FBQyxDQUFDLFNBQThCLENBQUMsRUFBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzs7Ozs7S0FDdkQsQ0FBQyxDQUFDLENBQUM7QUFFTCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJVc2VyQ29udHJvbGxlclRlc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBhc3luY1Rlc3QsIGNsZWFyRGF0YWJhc2UsIGNyZWF0ZVVzZXJBbmRTZXNzaW9uLCBjaGVja1Rocm93QXN5bmMgfSBmcm9tICcuLi90ZXN0VXRpbHMnO1xuaW1wb3J0IFVzZXJDb250cm9sbGVyIGZyb20gJy4uLy4uL2FwcC9jb250cm9sbGVycy9Vc2VyQ29udHJvbGxlcic7XG5pbXBvcnQgeyBGaWxlLCBQZXJtaXNzaW9uLCBJdGVtVHlwZSwgVXNlciB9IGZyb20gJy4uLy4uL2FwcC9kYic7XG5pbXBvcnQgVXNlck1vZGVsIGZyb20gJy4uLy4uL2FwcC9tb2RlbHMvVXNlck1vZGVsJztcbmltcG9ydCBGaWxlTW9kZWwgZnJvbSAnLi4vLi4vYXBwL21vZGVscy9GaWxlTW9kZWwnO1xuaW1wb3J0IFBlcm1pc3Npb25Nb2RlbCBmcm9tICcuLi8uLi9hcHAvbW9kZWxzL1Blcm1pc3Npb25Nb2RlbCc7XG5pbXBvcnQgeyBFcnJvckZvcmJpZGRlbiwgRXJyb3JVbnByb2Nlc3NhYmxlRW50aXR5IH0gZnJvbSAnLi4vLi4vYXBwL3V0aWxzL2Vycm9ycyc7XG5cbmRlc2NyaWJlKCdVc2VyQ29udHJvbGxlcicsIGZ1bmN0aW9uKCkge1xuXG5cdGJlZm9yZUVhY2goYXN5bmMgKGRvbmUpID0+IHtcblx0XHRhd2FpdCBjbGVhckRhdGFiYXNlKCk7XG5cdFx0ZG9uZSgpO1xuXHR9KTtcblxuXHRpdCgnc2hvdWxkIGNyZWF0ZSBhIG5ldyB1c2VyIGFsb25nIHdpdGggaGlzIHJvb3QgZmlsZScsIGFzeW5jVGVzdChhc3luYyBmdW5jdGlvbigpIHtcblx0XHRjb25zdCB7IHNlc3Npb24gfSA9IGF3YWl0IGNyZWF0ZVVzZXJBbmRTZXNzaW9uKDEsIHRydWUpO1xuXG5cdFx0Y29uc3QgY29udHJvbGxlciA9IG5ldyBVc2VyQ29udHJvbGxlcigpO1xuXHRcdGNvbnN0IHBlcm1pc3Npb25Nb2RlbCA9IG5ldyBQZXJtaXNzaW9uTW9kZWwoKTtcblxuXHRcdGNvbnN0IG5ld1VzZXIgPSBhd2FpdCBjb250cm9sbGVyLmNyZWF0ZVVzZXIoc2Vzc2lvbi5pZCwgeyBlbWFpbDogJ3Rlc3RAZXhhbXBsZS5jb20nLCBwYXNzd29yZDogJzEyMzQ1NicgfSk7XG5cblx0XHRleHBlY3QoISFuZXdVc2VyKS50b0JlKHRydWUpO1xuXHRcdGV4cGVjdCghIW5ld1VzZXIuaWQpLnRvQmUodHJ1ZSk7XG5cdFx0ZXhwZWN0KCEhbmV3VXNlci5pc19hZG1pbikudG9CZShmYWxzZSk7XG5cdFx0ZXhwZWN0KCEhbmV3VXNlci5lbWFpbCkudG9CZSh0cnVlKTtcblx0XHRleHBlY3QoIW5ld1VzZXIucGFzc3dvcmQpLnRvQmUodHJ1ZSk7XG5cblx0XHRjb25zdCB1c2VyTW9kZWwgPSBuZXcgVXNlck1vZGVsKHsgdXNlcklkOiBuZXdVc2VyLmlkIH0pO1xuXHRcdGNvbnN0IHVzZXJGcm9tTW9kZWw6VXNlciA9IGF3YWl0IHVzZXJNb2RlbC5sb2FkKG5ld1VzZXIuaWQpO1xuXG5cdFx0ZXhwZWN0KCEhdXNlckZyb21Nb2RlbC5wYXNzd29yZCkudG9CZSh0cnVlKTtcblx0XHRleHBlY3QodXNlckZyb21Nb2RlbC5wYXNzd29yZCA9PT0gJzEyMzQ1NicpLnRvQmUoZmFsc2UpOyAvLyBQYXNzd29yZCBoYXMgYmVlbiBoYXNoZWRcblxuXHRcdGNvbnN0IGZpbGVNb2RlbCA9IG5ldyBGaWxlTW9kZWwoeyB1c2VySWQ6IG5ld1VzZXIuaWQgfSk7XG5cdFx0Y29uc3Qgcm9vdEZpbGU6RmlsZSA9IGF3YWl0IGZpbGVNb2RlbC51c2VyUm9vdEZpbGUoKTtcblxuXHRcdGV4cGVjdCghIXJvb3RGaWxlKS50b0JlKHRydWUpO1xuXHRcdGV4cGVjdCghIXJvb3RGaWxlLmlkKS50b0JlKHRydWUpO1xuXG5cdFx0Y29uc3QgcGVybWlzc2lvbnM6QXJyYXk8UGVybWlzc2lvbj4gPSBhd2FpdCBwZXJtaXNzaW9uTW9kZWwuZmlsZVBlcm1pc3Npb25zKHJvb3RGaWxlLmlkKTtcblxuXHRcdGV4cGVjdChwZXJtaXNzaW9ucy5sZW5ndGgpLnRvQmUoMSk7XG5cdFx0ZXhwZWN0KHBlcm1pc3Npb25zWzBdLnVzZXJfaWQpLnRvQmUobmV3VXNlci5pZCk7XG5cdFx0ZXhwZWN0KHBlcm1pc3Npb25zWzBdLml0ZW1fdHlwZSkudG9CZShJdGVtVHlwZS5GaWxlKTtcblx0XHRleHBlY3QocGVybWlzc2lvbnNbMF0uaXRlbV9pZCkudG9CZShyb290RmlsZS5pZCk7XG5cdFx0ZXhwZWN0KHBlcm1pc3Npb25zWzBdLmlzX293bmVyKS50b0JlKDEpO1xuXHRcdGV4cGVjdChwZXJtaXNzaW9uc1swXS5jYW5fcmVhZCkudG9CZSgxKTtcblx0XHRleHBlY3QocGVybWlzc2lvbnNbMF0uY2FuX3dyaXRlKS50b0JlKDEpO1xuXHR9KSk7XG5cblx0aXQoJ3Nob3VsZCBub3QgY3JlYXRlIGFueXRoaW5nLCBuZWl0aGVyIHVzZXIsIHJvb3QgZmlsZSBub3IgcGVybWlzc2lvbnMsIGlmIHVzZXIgY3JlYXRpb24gZmFpbCcsIGFzeW5jVGVzdChhc3luYyBmdW5jdGlvbigpIHtcblx0XHRjb25zdCB7IHVzZXIsIHNlc3Npb24gfSA9IGF3YWl0IGNyZWF0ZVVzZXJBbmRTZXNzaW9uKDEsIHRydWUpO1xuXG5cdFx0Y29uc3QgY29udHJvbGxlciA9IG5ldyBVc2VyQ29udHJvbGxlcigpO1xuXHRcdGNvbnN0IGZpbGVNb2RlbCA9IG5ldyBGaWxlTW9kZWwoeyB1c2VySWQ6IHVzZXIuaWQgfSk7XG5cdFx0Y29uc3QgcGVybWlzc2lvbk1vZGVsID0gbmV3IFBlcm1pc3Npb25Nb2RlbCgpO1xuXHRcdGNvbnN0IHVzZXJNb2RlbCA9IG5ldyBVc2VyTW9kZWwoeyB1c2VySWQ6IHVzZXIuaWQgfSk7XG5cblx0XHRhd2FpdCBjb250cm9sbGVyLmNyZWF0ZVVzZXIoc2Vzc2lvbi5pZCwgeyBlbWFpbDogJ3Rlc3RAZXhhbXBsZS5jb20nLCBwYXNzd29yZDogJzEyMzQ1NicgfSk7XG5cblx0XHRjb25zdCBiZWZvcmVGaWxlQ291bnQgPSAoYXdhaXQgZmlsZU1vZGVsLmFsbCgpKS5sZW5ndGg7XG5cdFx0Y29uc3QgYmVmb3JlVXNlckNvdW50ID0gKGF3YWl0IHVzZXJNb2RlbC5hbGwoKSkubGVuZ3RoO1xuXHRcdGNvbnN0IGJlZm9yZVBlcm1pc3Npb25Db3VudCA9IChhd2FpdCBwZXJtaXNzaW9uTW9kZWwuYWxsKCkpLmxlbmd0aDtcblxuXHRcdGxldCBoYXNUaHJvd24gPSBmYWxzZTtcblx0XHR0cnkge1xuXHRcdFx0YXdhaXQgY29udHJvbGxlci5jcmVhdGVVc2VyKHNlc3Npb24uaWQsIHsgZW1haWw6ICd0ZXN0QGV4YW1wbGUuY29tJywgcGFzc3dvcmQ6ICcxMjM0NTYnIH0pO1xuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRoYXNUaHJvd24gPSB0cnVlO1xuXHRcdH1cblxuXHRcdGV4cGVjdChoYXNUaHJvd24pLnRvQmUodHJ1ZSk7XG5cblx0XHRjb25zdCBhZnRlckZpbGVDb3VudCA9IChhd2FpdCBmaWxlTW9kZWwuYWxsKCkpLmxlbmd0aDtcblx0XHRjb25zdCBhZnRlclVzZXJDb3VudCA9IChhd2FpdCB1c2VyTW9kZWwuYWxsKCkpLmxlbmd0aDtcblx0XHRjb25zdCBhZnRlclBlcm1pc3Npb25Db3VudCA9IChhd2FpdCBwZXJtaXNzaW9uTW9kZWwuYWxsKCkpLmxlbmd0aDtcblxuXHRcdGV4cGVjdChiZWZvcmVGaWxlQ291bnQpLnRvQmUoYWZ0ZXJGaWxlQ291bnQpO1xuXHRcdGV4cGVjdChiZWZvcmVVc2VyQ291bnQpLnRvQmUoYWZ0ZXJVc2VyQ291bnQpO1xuXHRcdGV4cGVjdChiZWZvcmVQZXJtaXNzaW9uQ291bnQpLnRvQmUoYWZ0ZXJQZXJtaXNzaW9uQ291bnQpO1xuXHR9KSk7XG5cblx0aXQoJ3Nob3VsZCBjaGFuZ2UgdXNlciBwcm9wZXJ0aWVzJywgYXN5bmNUZXN0KGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IHsgdXNlciwgc2Vzc2lvbiB9ID0gYXdhaXQgY3JlYXRlVXNlckFuZFNlc3Npb24oMSwgdHJ1ZSk7XG5cblx0XHRjb25zdCBjb250cm9sbGVyID0gbmV3IFVzZXJDb250cm9sbGVyKCk7XG5cdFx0Y29uc3QgdXNlck1vZGVsID0gbmV3IFVzZXJNb2RlbCh7IHVzZXJJZDogdXNlci5pZCB9KTtcblxuXHRcdGF3YWl0IGNvbnRyb2xsZXIudXBkYXRlVXNlcihzZXNzaW9uLmlkLCB7IGlkOiB1c2VyLmlkLCBlbWFpbDogJ3Rlc3QyQGV4YW1wbGUuY29tJyB9KTtcblx0XHRsZXQgbW9kVXNlcjpVc2VyID0gYXdhaXQgdXNlck1vZGVsLmxvYWQodXNlci5pZCk7XG5cdFx0ZXhwZWN0KG1vZFVzZXIuZW1haWwpLnRvQmUoJ3Rlc3QyQGV4YW1wbGUuY29tJyk7XG5cblx0XHRjb25zdCBwcmV2aW91c1Bhc3N3b3JkID0gbW9kVXNlci5wYXNzd29yZDtcblx0XHRhd2FpdCBjb250cm9sbGVyLnVwZGF0ZVVzZXIoc2Vzc2lvbi5pZCwgeyBpZDogdXNlci5pZCwgcGFzc3dvcmQ6ICdhYmNkZWZnaCcgfSk7XG5cdFx0bW9kVXNlcj0gYXdhaXQgdXNlck1vZGVsLmxvYWQodXNlci5pZCk7XG5cdFx0ZXhwZWN0KCEhbW9kVXNlci5wYXNzd29yZCkudG9CZSh0cnVlKTtcblx0XHRleHBlY3QobW9kVXNlci5wYXNzd29yZCA9PT0gcHJldmlvdXNQYXNzd29yZCkudG9CZShmYWxzZSk7XG5cdH0pKTtcblxuXHRpdCgnc2hvdWxkIGdldCBhIHVzZXInLCBhc3luY1Rlc3QoYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgeyB1c2VyLCBzZXNzaW9uIH0gPSBhd2FpdCBjcmVhdGVVc2VyQW5kU2Vzc2lvbigpO1xuXG5cdFx0Y29uc3QgY29udHJvbGxlciA9IG5ldyBVc2VyQ29udHJvbGxlcigpO1xuXHRcdGNvbnN0IGdvdFVzZXIgPSBhd2FpdCBjb250cm9sbGVyLmdldFVzZXIoc2Vzc2lvbi5pZCwgdXNlci5pZCk7XG5cblx0XHRleHBlY3QoZ290VXNlci5pZCkudG9CZSh1c2VyLmlkKTtcblx0XHRleHBlY3QoZ290VXNlci5lbWFpbCkudG9CZSh1c2VyLmVtYWlsKTtcblx0fSkpO1xuXG5cdGl0KCdzaG91bGQgdmFsaWRhdGUgdXNlciBvYmplY3RzJywgYXN5bmNUZXN0KGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IHsgdXNlcjogYWRtaW4sIHNlc3Npb246IGFkbWluU2Vzc2lvbiB9ID0gYXdhaXQgY3JlYXRlVXNlckFuZFNlc3Npb24oMSwgdHJ1ZSk7XG5cdFx0Y29uc3QgeyB1c2VyOiB1c2VyMSwgc2Vzc2lvbjogdXNlclNlc3Npb24xIH0gPSBhd2FpdCBjcmVhdGVVc2VyQW5kU2Vzc2lvbigyLCBmYWxzZSk7XG5cdFx0Y29uc3QgeyB1c2VyOiB1c2VyMiB9ID0gYXdhaXQgY3JlYXRlVXNlckFuZFNlc3Npb24oMywgZmFsc2UpO1xuXG5cdFx0bGV0IGVycm9yID0gbnVsbDtcblx0XHRjb25zdCBjb250cm9sbGVyID0gbmV3IFVzZXJDb250cm9sbGVyKCk7XG5cblx0XHQvLyBOb24tYWRtaW4gdXNlciBjYW4ndCBjcmVhdGUgYSB1c2VyXG5cdFx0ZXJyb3IgPSBhd2FpdCBjaGVja1Rocm93QXN5bmMoYXN5bmMgKCkgPT4gYXdhaXQgY29udHJvbGxlci5jcmVhdGVVc2VyKHVzZXJTZXNzaW9uMS5pZCwgeyBlbWFpbDogJ25ld29uZUBleGFtcGxlLmNvbScsIHBhc3N3b3JkOiAnMTIzNDU0NicgfSkpO1xuXHRcdGV4cGVjdChlcnJvciBpbnN0YW5jZW9mIEVycm9yRm9yYmlkZGVuKS50b0JlKHRydWUpO1xuXG5cdFx0Ly8gRW1haWwgbXVzdCBiZSBzZXRcblx0XHRlcnJvciA9IGF3YWl0IGNoZWNrVGhyb3dBc3luYyhhc3luYyAoKSA9PiBhd2FpdCBjb250cm9sbGVyLmNyZWF0ZVVzZXIoYWRtaW5TZXNzaW9uLmlkLCB7IGVtYWlsOiAnJywgcGFzc3dvcmQ6ICcxMjM0NTQ2JyB9KSk7XG5cdFx0ZXhwZWN0KGVycm9yIGluc3RhbmNlb2YgRXJyb3JVbnByb2Nlc3NhYmxlRW50aXR5KS50b0JlKHRydWUpO1xuXG5cdFx0Ly8gUGFzc3dvcmQgbXVzdCBiZSBzZXRcblx0XHRlcnJvciA9IGF3YWl0IGNoZWNrVGhyb3dBc3luYyhhc3luYyAoKSA9PiBhd2FpdCBjb250cm9sbGVyLmNyZWF0ZVVzZXIoYWRtaW5TZXNzaW9uLmlkLCB7IGVtYWlsOiAnbmV3b25lQGV4YW1wbGUuY29tJywgcGFzc3dvcmQ6ICcnIH0pKTtcblx0XHRleHBlY3QoZXJyb3IgaW5zdGFuY2VvZiBFcnJvclVucHJvY2Vzc2FibGVFbnRpdHkpLnRvQmUodHJ1ZSk7XG5cblx0XHQvLyBJRCBtdXN0IGJlIHNldCB3aGVuIHVwZGF0aW5nIGEgdXNlclxuXHRcdGVycm9yID0gYXdhaXQgY2hlY2tUaHJvd0FzeW5jKGFzeW5jICgpID0+IGF3YWl0IGNvbnRyb2xsZXIudXBkYXRlVXNlcih1c2VyU2Vzc2lvbjEuaWQsIHsgZW1haWw6ICduZXdvbmVAZXhhbXBsZS5jb20nIH0pKTtcblx0XHRleHBlY3QoZXJyb3IgaW5zdGFuY2VvZiBFcnJvclVucHJvY2Vzc2FibGVFbnRpdHkpLnRvQmUodHJ1ZSk7XG5cblx0XHQvLyBub24tYWRtaW4gdXNlciBjYW5ub3QgbW9kaWZ5IGFub3RoZXIgdXNlclxuXHRcdGVycm9yID0gYXdhaXQgY2hlY2tUaHJvd0FzeW5jKGFzeW5jICgpID0+IGF3YWl0IGNvbnRyb2xsZXIudXBkYXRlVXNlcih1c2VyU2Vzc2lvbjEuaWQsIHsgaWQ6IHVzZXIyLmlkLCBlbWFpbDogJ25ld29uZUBleGFtcGxlLmNvbScgfSkpO1xuXHRcdGV4cGVjdChlcnJvciBpbnN0YW5jZW9mIEVycm9yRm9yYmlkZGVuKS50b0JlKHRydWUpO1xuXG5cdFx0Ly8gZW1haWwgbXVzdCBiZSBzZXRcblx0XHRlcnJvciA9IGF3YWl0IGNoZWNrVGhyb3dBc3luYyhhc3luYyAoKSA9PiBhd2FpdCBjb250cm9sbGVyLnVwZGF0ZVVzZXIodXNlclNlc3Npb24xLmlkLCB7IGlkOiB1c2VyMS5pZCwgZW1haWw6ICcnIH0pKTtcblx0XHRleHBlY3QoZXJyb3IgaW5zdGFuY2VvZiBFcnJvclVucHJvY2Vzc2FibGVFbnRpdHkpLnRvQmUodHJ1ZSk7XG5cblx0XHQvLyBwYXNzd29yZCBtdXN0IGJlIHNldFxuXHRcdGVycm9yID0gYXdhaXQgY2hlY2tUaHJvd0FzeW5jKGFzeW5jICgpID0+IGF3YWl0IGNvbnRyb2xsZXIudXBkYXRlVXNlcih1c2VyU2Vzc2lvbjEuaWQsIHsgaWQ6IHVzZXIxLmlkLCBwYXNzd29yZDogJycgfSkpO1xuXHRcdGV4cGVjdChlcnJvciBpbnN0YW5jZW9mIEVycm9yVW5wcm9jZXNzYWJsZUVudGl0eSkudG9CZSh0cnVlKTtcblxuXHRcdC8vIG5vbi1hZG1pbiB1c2VyIGNhbm5vdCBtYWtlIGEgdXNlciBhbiBhZG1pblxuXHRcdGVycm9yID0gYXdhaXQgY2hlY2tUaHJvd0FzeW5jKGFzeW5jICgpID0+IGF3YWl0IGNvbnRyb2xsZXIudXBkYXRlVXNlcih1c2VyU2Vzc2lvbjEuaWQsIHsgaWQ6IHVzZXIxLmlkLCBpc19hZG1pbjogMSB9KSk7XG5cdFx0ZXhwZWN0KGVycm9yIGluc3RhbmNlb2YgRXJyb3JGb3JiaWRkZW4pLnRvQmUodHJ1ZSk7XG5cblx0XHQvLyBub24tYWRtaW4gdXNlciBjYW5ub3QgcmVtb3ZlIGFkbWluIGJpdCBmcm9tIHRoZW1zZWx2ZXNcblx0XHRlcnJvciA9IGF3YWl0IGNoZWNrVGhyb3dBc3luYyhhc3luYyAoKSA9PiBhd2FpdCBjb250cm9sbGVyLnVwZGF0ZVVzZXIoYWRtaW5TZXNzaW9uLmlkLCB7IGlkOiBhZG1pbi5pZCwgaXNfYWRtaW46IDAgfSkpO1xuXHRcdGV4cGVjdChlcnJvciBpbnN0YW5jZW9mIEVycm9yVW5wcm9jZXNzYWJsZUVudGl0eSkudG9CZSh0cnVlKTtcblxuXHRcdC8vIHRoZXJlIGlzIGFscmVhZHkgYSB1c2VyIHdpdGggdGhpcyBlbWFpbFxuXHRcdGVycm9yID0gYXdhaXQgY2hlY2tUaHJvd0FzeW5jKGFzeW5jICgpID0+IGF3YWl0IGNvbnRyb2xsZXIudXBkYXRlVXNlcih1c2VyU2Vzc2lvbjEuaWQsIHsgaWQ6IHVzZXIxLmlkLCBlbWFpbDogdXNlcjIuZW1haWwgfSkpO1xuXHRcdGV4cGVjdChlcnJvciBpbnN0YW5jZW9mIEVycm9yVW5wcm9jZXNzYWJsZUVudGl0eSkudG9CZSh0cnVlKTtcblx0fSkpO1xuXG5cdGl0KCdzaG91bGQgZGVsZXRlIGEgdXNlcicsIGFzeW5jVGVzdChhc3luYyBmdW5jdGlvbigpIHtcblx0XHRjb25zdCB7IHVzZXI6IGFkbWluLCBzZXNzaW9uOiBhZG1pblNlc3Npb24gfSA9IGF3YWl0IGNyZWF0ZVVzZXJBbmRTZXNzaW9uKDEsIHRydWUpO1xuXHRcdGNvbnN0IHsgdXNlcjogdXNlcjEsIHNlc3Npb246IHNlc3Npb24xIH0gPSBhd2FpdCBjcmVhdGVVc2VyQW5kU2Vzc2lvbigyLCBmYWxzZSk7XG5cdFx0Y29uc3QgeyB1c2VyOiB1c2VyMiwgc2Vzc2lvbjogc2Vzc2lvbjIgfSA9IGF3YWl0IGNyZWF0ZVVzZXJBbmRTZXNzaW9uKDMsIGZhbHNlKTtcblxuXHRcdGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgVXNlckNvbnRyb2xsZXIoKTtcblx0XHRjb25zdCB1c2VyTW9kZWwgPSBuZXcgVXNlck1vZGVsKHsgdXNlcklkOiBhZG1pbi5pZCB9KTtcblxuXHRcdGxldCBhbGxVc2VyczpGaWxlW10gPSBhd2FpdCB1c2VyTW9kZWwuYWxsKCk7XG5cdFx0Y29uc3QgYmVmb3JlQ291bnQ6bnVtYmVyID0gYWxsVXNlcnMubGVuZ3RoO1xuXG5cdFx0Ly8gQ2FuJ3QgZGVsZXRlIHNvbWVvbmUgZWxzZSB1c2VyXG5cdFx0Y29uc3QgZXJyb3IgPSBhd2FpdCBjaGVja1Rocm93QXN5bmMoYXN5bmMgKCkgPT4gYXdhaXQgY29udHJvbGxlci5kZWxldGVVc2VyKHNlc3Npb24xLmlkLCB1c2VyMi5pZCkpO1xuXHRcdGV4cGVjdChlcnJvciBpbnN0YW5jZW9mIEVycm9yRm9yYmlkZGVuKS50b0JlKHRydWUpO1xuXHRcdGV4cGVjdCgoYXdhaXQgdXNlck1vZGVsLmFsbCgpKS5sZW5ndGgpLnRvQmUoYmVmb3JlQ291bnQpO1xuXG5cdFx0Ly8gQWRtaW4gY2FuIGRlbGV0ZSBhbnkgdXNlclxuXHRcdGF3YWl0IGNvbnRyb2xsZXIuZGVsZXRlVXNlcihhZG1pblNlc3Npb24uaWQsIHVzZXIxLmlkKTtcblx0XHRleHBlY3QoKGF3YWl0IHVzZXJNb2RlbC5hbGwoKSkubGVuZ3RoKS50b0JlKGJlZm9yZUNvdW50IC0gMSk7XG5cblx0XHQvLyBDYW4gZGVsZXRlIG93biB1c2VyXG5cdFx0Y29uc3QgZmlsZU1vZGVsID0gbmV3IEZpbGVNb2RlbCh7IHVzZXJJZDogdXNlcjIuaWQgfSk7XG5cdFx0ZXhwZWN0KCEhKGF3YWl0IGZpbGVNb2RlbC51c2VyUm9vdEZpbGUoKSkpLnRvQmUodHJ1ZSk7XG5cdFx0YXdhaXQgY29udHJvbGxlci5kZWxldGVVc2VyKHNlc3Npb24yLmlkLCB1c2VyMi5pZCk7XG5cdFx0ZXhwZWN0KChhd2FpdCB1c2VyTW9kZWwuYWxsKCkpLmxlbmd0aCkudG9CZShiZWZvcmVDb3VudCAtIDIpO1xuXHRcdGV4cGVjdCghIShhd2FpdCBmaWxlTW9kZWwudXNlclJvb3RGaWxlKCkpKS50b0JlKGZhbHNlKTtcblx0fSkpO1xuXG59KTtcbiJdfQ==
