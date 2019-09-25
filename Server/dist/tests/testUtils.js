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
require('app-module-path').addPath(__dirname + "/..");
require('source-map-support').install();
var db_1 = require("../app/db");
var UserModel_1 = require("../app/models/UserModel");
var SessionController_1 = require("../app/controllers/SessionController");
var cache_1 = require("../app/utils/cache");
// Wrap an async test in a try/catch block so that done() is always called
// and display a proper error message instead of "unhandled promise error"
exports.asyncTest = function (callback) {
    return function (done) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, 3, 4]);
                        return [4 /*yield*/, callback()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        error_1 = _a.sent();
                        if (error_1.constructor.name === 'ExpectationFailed') {
                            // ExpectationFailed are handled correctly by Jasmine
                        }
                        else {
                            console.error(error_1);
                            expect('good').toBe('not good', 'Test has thrown an exception - see above error');
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        done();
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
};
exports.clearDatabase = function () {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db_1.default('sessions').truncate()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, db_1.default('users').truncate()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, db_1.default('permissions').truncate()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, db_1.default('files').truncate()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, cache_1.default.clearAll()];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.supportDir = __dirname + "/../../tests/support";
exports.createUserAndSession = function (index, isAdmin) {
    if (index === void 0) { index = 1; }
    if (isAdmin === void 0) { isAdmin = false; }
    return __awaiter(this, void 0, void 0, function () {
        var userModel, sessionController, email, user, session;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userModel = new UserModel_1.default();
                    sessionController = new SessionController_1.default();
                    email = "user" + index + "@localhost";
                    return [4 /*yield*/, userModel.save({ email: email, password: '123456', is_admin: isAdmin ? 1 : 0 }, { skipValidation: true })];
                case 1:
                    user = _a.sent();
                    return [4 /*yield*/, sessionController.authenticate(email, '123456')];
                case 2:
                    session = _a.sent();
                    return [2 /*return*/, {
                            user: user,
                            session: session,
                        }];
            }
        });
    });
};
exports.createUser = function (index, isAdmin) {
    if (index === void 0) { index = 1; }
    if (isAdmin === void 0) { isAdmin = false; }
    return __awaiter(this, void 0, void 0, function () {
        var userModel;
        return __generator(this, function (_a) {
            userModel = new UserModel_1.default();
            return [2 /*return*/, userModel.save({ email: "user" + index + "@localhost", password: '123456', is_admin: isAdmin ? 1 : 0 }, { skipValidation: true })];
        });
    });
};
function checkThrowAsync(asyncFn) {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, asyncFn()];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    return [2 /*return*/, error_2];
                case 3: return [2 /*return*/, null];
            }
        });
    });
}
exports.checkThrowAsync = checkThrowAsync;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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Q0FBQyxFQUFFLEtBQUssRUFBRSxTQUFPLEtBQUssZUFBWSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFDOzs7Q0FDcEksQ0FBQztBQUVGLFNBQXNCLGVBQWUsQ0FBQyxPQUFnQjs7Ozs7OztvQkFFcEQscUJBQU0sT0FBTyxFQUFFLEVBQUE7O29CQUFmLFNBQWUsQ0FBQzs7OztvQkFFaEIsc0JBQU8sT0FBSyxFQUFDO3dCQUVkLHNCQUFPLElBQUksRUFBQzs7OztDQUNaO0FBUEQsMENBT0MiLCJmaWxlIjoidGVzdFV0aWxzLmpzIiwic291cmNlc0NvbnRlbnQiOlsicmVxdWlyZSgnYXBwLW1vZHVsZS1wYXRoJykuYWRkUGF0aChgJHtfX2Rpcm5hbWV9Ly4uYCk7XG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQnKS5pbnN0YWxsKCk7XG5cbmltcG9ydCBkYiwgeyBVc2VyLCBTZXNzaW9uIH0gZnJvbSAnLi4vYXBwL2RiJztcbmltcG9ydCBVc2VyTW9kZWwgZnJvbSAnLi4vYXBwL21vZGVscy9Vc2VyTW9kZWwnO1xuaW1wb3J0IFNlc3Npb25Db250cm9sbGVyIGZyb20gJy4uL2FwcC9jb250cm9sbGVycy9TZXNzaW9uQ29udHJvbGxlcic7XG5pbXBvcnQgY2FjaGUgZnJvbSAnLi4vYXBwL3V0aWxzL2NhY2hlJztcblxuLy8gV3JhcCBhbiBhc3luYyB0ZXN0IGluIGEgdHJ5L2NhdGNoIGJsb2NrIHNvIHRoYXQgZG9uZSgpIGlzIGFsd2F5cyBjYWxsZWRcbi8vIGFuZCBkaXNwbGF5IGEgcHJvcGVyIGVycm9yIG1lc3NhZ2UgaW5zdGVhZCBvZiBcInVuaGFuZGxlZCBwcm9taXNlIGVycm9yXCJcbmV4cG9ydCBjb25zdCBhc3luY1Rlc3QgPSBmdW5jdGlvbihjYWxsYmFjazpGdW5jdGlvbikge1xuXHRyZXR1cm4gYXN5bmMgZnVuY3Rpb24oZG9uZTpGdW5jdGlvbikge1xuXHRcdHRyeSB7XG5cdFx0XHRhd2FpdCBjYWxsYmFjaygpO1xuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRpZiAoZXJyb3IuY29uc3RydWN0b3IubmFtZSA9PT0gJ0V4cGVjdGF0aW9uRmFpbGVkJykge1xuXHRcdFx0XHQvLyBFeHBlY3RhdGlvbkZhaWxlZCBhcmUgaGFuZGxlZCBjb3JyZWN0bHkgYnkgSmFzbWluZVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcihlcnJvcik7XG5cdFx0XHRcdGV4cGVjdCgnZ29vZCcpLnRvQmUoJ25vdCBnb29kJywgJ1Rlc3QgaGFzIHRocm93biBhbiBleGNlcHRpb24gLSBzZWUgYWJvdmUgZXJyb3InKTtcblx0XHRcdH1cblx0XHR9IGZpbmFsbHkge1xuXHRcdFx0ZG9uZSgpO1xuXHRcdH1cblx0fTtcbn07XG5cbmV4cG9ydCBjb25zdCBjbGVhckRhdGFiYXNlID0gYXN5bmMgZnVuY3Rpb24oKTpQcm9taXNlPHZvaWQ+IHtcblx0YXdhaXQgZGIoJ3Nlc3Npb25zJykudHJ1bmNhdGUoKTtcblx0YXdhaXQgZGIoJ3VzZXJzJykudHJ1bmNhdGUoKTtcblx0YXdhaXQgZGIoJ3Blcm1pc3Npb25zJykudHJ1bmNhdGUoKTtcblx0YXdhaXQgZGIoJ2ZpbGVzJykudHJ1bmNhdGUoKTtcblxuXHRhd2FpdCBjYWNoZS5jbGVhckFsbCgpO1xufTtcblxuZXhwb3J0IGNvbnN0IHN1cHBvcnREaXIgPSBgJHtfX2Rpcm5hbWV9Ly4uLy4uL3Rlc3RzL3N1cHBvcnRgO1xuXG5pbnRlcmZhY2UgVXNlckFuZFNlc3Npb24ge1xuXHR1c2VyOiBVc2VyLFxuXHRzZXNzaW9uOiBTZXNzaW9uLFxufVxuXG5leHBvcnQgY29uc3QgY3JlYXRlVXNlckFuZFNlc3Npb24gPSBhc3luYyBmdW5jdGlvbihpbmRleDpudW1iZXIgPSAxLCBpc0FkbWluOmJvb2xlYW4gPSBmYWxzZSk6UHJvbWlzZTxVc2VyQW5kU2Vzc2lvbj4ge1xuXHRjb25zdCB1c2VyTW9kZWwgPSBuZXcgVXNlck1vZGVsKCk7XG5cdGNvbnN0IHNlc3Npb25Db250cm9sbGVyID0gbmV3IFNlc3Npb25Db250cm9sbGVyKCk7XG5cblx0Y29uc3QgZW1haWw6c3RyaW5nID0gYHVzZXIke2luZGV4fUBsb2NhbGhvc3RgO1xuXHRjb25zdCB1c2VyID0gYXdhaXQgdXNlck1vZGVsLnNhdmUoeyBlbWFpbDogZW1haWwsIHBhc3N3b3JkOiAnMTIzNDU2JywgaXNfYWRtaW46IGlzQWRtaW4gPyAxIDogMCB9LCB7IHNraXBWYWxpZGF0aW9uOiB0cnVlIH0pO1xuXHRjb25zdCBzZXNzaW9uID0gYXdhaXQgc2Vzc2lvbkNvbnRyb2xsZXIuYXV0aGVudGljYXRlKGVtYWlsLCAnMTIzNDU2Jyk7XG5cblx0cmV0dXJuIHtcblx0XHR1c2VyOiB1c2VyLFxuXHRcdHNlc3Npb246IHNlc3Npb24sXG5cdH07XG59O1xuXG5leHBvcnQgY29uc3QgY3JlYXRlVXNlciA9IGFzeW5jIGZ1bmN0aW9uKGluZGV4Om51bWJlciA9IDEsIGlzQWRtaW46Ym9vbGVhbiA9IGZhbHNlKTpQcm9taXNlPFVzZXI+IHtcblx0Y29uc3QgdXNlck1vZGVsID0gbmV3IFVzZXJNb2RlbCgpO1xuXHRyZXR1cm4gdXNlck1vZGVsLnNhdmUoeyBlbWFpbDogYHVzZXIke2luZGV4fUBsb2NhbGhvc3RgLCBwYXNzd29yZDogJzEyMzQ1NicsIGlzX2FkbWluOiBpc0FkbWluID8gMSA6IDAgfSwgeyBza2lwVmFsaWRhdGlvbjogdHJ1ZSB9KTtcbn07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja1Rocm93QXN5bmMoYXN5bmNGbjpGdW5jdGlvbik6UHJvbWlzZTxhbnk+IHtcblx0dHJ5IHtcblx0XHRhd2FpdCBhc3luY0ZuKCk7XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0cmV0dXJuIGVycm9yO1xuXHR9XG5cdHJldHVybiBudWxsO1xufVxuIl19
