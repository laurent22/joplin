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
var SessionController_1 = require("../../app/controllers/SessionController");
var errors_1 = require("../../app/utils/errors");
describe('SessionController', function () {
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
    it('should authenticate a user and give back a session', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var user, controller, session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUser(1)];
                    case 1:
                        user = _a.sent();
                        controller = new SessionController_1.default();
                        return [4 /*yield*/, controller.authenticate(user.email, '123456')];
                    case 2:
                        session = _a.sent();
                        expect(!!session).toBe(true);
                        expect(!!session.id).toBe(true);
                        expect(!!session.user_id).toBe(true);
                        return [2 /*return*/];
                }
            });
        });
    }));
    it('should not give a session for invalid login', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var user, controller, error;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, testUtils_1.createUser(1)];
                    case 1:
                        user = _a.sent();
                        controller = new SessionController_1.default();
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, controller.authenticate(user.email, 'wrong')];
                            }); }); })];
                    case 2:
                        error = _a.sent();
                        expect(error instanceof errors_1.ErrorForbidden).toBe(true);
                        return [4 /*yield*/, testUtils_1.checkThrowAsync(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, controller.authenticate('wrong@wrong.com', '123456')];
                            }); }); })];
                    case 3:
                        error = _a.sent();
                        expect(error instanceof errors_1.ErrorForbidden).toBe(true);
                        return [2 /*return*/];
                }
            });
        });
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlNlc3Npb25Db250cm9sbGVyVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUFxRjtBQUNyRiw2RUFBd0U7QUFDeEUsaURBQXdEO0FBRXhELFFBQVEsQ0FBQyxtQkFBbUIsRUFBRTtJQUFBLGlCQTJCN0I7SUF6QkEsVUFBVSxDQUFDLFVBQU8sSUFBSTs7O3dCQUNyQixxQkFBTSx5QkFBYSxFQUFFLEVBQUE7O29CQUFyQixTQUFxQixDQUFDO29CQUN0QixJQUFJLEVBQUUsQ0FBQzs7OztTQUNQLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxvREFBb0QsRUFBRSxxQkFBUyxDQUFDOzs7Ozs0QkFDckQscUJBQU0sc0JBQVUsQ0FBQyxDQUFDLENBQUMsRUFBQTs7d0JBQTFCLElBQUksR0FBRyxTQUFtQjt3QkFDMUIsVUFBVSxHQUFHLElBQUksMkJBQWlCLEVBQUUsQ0FBQzt3QkFDM0IscUJBQU0sVUFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxFQUFBOzt3QkFBN0QsT0FBTyxHQUFHLFNBQW1EO3dCQUNuRSxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDN0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNoQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Ozs7O0tBQ3JDLENBQUMsQ0FBQyxDQUFDO0lBRUosRUFBRSxDQUFDLDZDQUE2QyxFQUFFLHFCQUFTLENBQUM7Ozs7Ozs0QkFDOUMscUJBQU0sc0JBQVUsQ0FBQyxDQUFDLENBQUMsRUFBQTs7d0JBQTFCLElBQUksR0FBRyxTQUFtQjt3QkFDMUIsVUFBVSxHQUFHLElBQUksMkJBQWlCLEVBQUUsQ0FBQzt3QkFFL0IscUJBQU0sMkJBQWUsQ0FBQztnQ0FBWSxzQkFBQSxVQUFVLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEVBQUE7cUNBQUEsQ0FBQyxFQUFBOzt3QkFBdkYsS0FBSyxHQUFHLFNBQStFO3dCQUMzRixNQUFNLENBQUMsS0FBSyxZQUFZLHVCQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBRTNDLHFCQUFNLDJCQUFlLENBQUM7Z0NBQVksc0JBQUEsVUFBVSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLENBQUMsRUFBQTtxQ0FBQSxDQUFDLEVBQUE7O3dCQUEvRixLQUFLLEdBQUcsU0FBdUYsQ0FBQzt3QkFDaEcsTUFBTSxDQUFDLEtBQUssWUFBWSx1QkFBYyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzs7OztLQUNuRCxDQUFDLENBQUMsQ0FBQztBQUVMLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6IlNlc3Npb25Db250cm9sbGVyVGVzdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGFzeW5jVGVzdCwgY2xlYXJEYXRhYmFzZSwgY3JlYXRlVXNlciwgY2hlY2tUaHJvd0FzeW5jIH0gZnJvbSAnLi4vdGVzdFV0aWxzJztcbmltcG9ydCBTZXNzaW9uQ29udHJvbGxlciBmcm9tICcuLi8uLi9hcHAvY29udHJvbGxlcnMvU2Vzc2lvbkNvbnRyb2xsZXInO1xuaW1wb3J0IHsgRXJyb3JGb3JiaWRkZW4gfSBmcm9tICcuLi8uLi9hcHAvdXRpbHMvZXJyb3JzJztcblxuZGVzY3JpYmUoJ1Nlc3Npb25Db250cm9sbGVyJywgZnVuY3Rpb24oKSB7XG5cblx0YmVmb3JlRWFjaChhc3luYyAoZG9uZSkgPT4ge1xuXHRcdGF3YWl0IGNsZWFyRGF0YWJhc2UoKTtcblx0XHRkb25lKCk7XG5cdH0pO1xuXG5cdGl0KCdzaG91bGQgYXV0aGVudGljYXRlIGEgdXNlciBhbmQgZ2l2ZSBiYWNrIGEgc2Vzc2lvbicsIGFzeW5jVGVzdChhc3luYyBmdW5jdGlvbigpIHtcblx0XHRjb25zdCB1c2VyID0gYXdhaXQgY3JlYXRlVXNlcigxKTtcblx0XHRjb25zdCBjb250cm9sbGVyID0gbmV3IFNlc3Npb25Db250cm9sbGVyKCk7XG5cdFx0Y29uc3Qgc2Vzc2lvbiA9IGF3YWl0IGNvbnRyb2xsZXIuYXV0aGVudGljYXRlKHVzZXIuZW1haWwsICcxMjM0NTYnKTtcblx0XHRleHBlY3QoISFzZXNzaW9uKS50b0JlKHRydWUpO1xuXHRcdGV4cGVjdCghIXNlc3Npb24uaWQpLnRvQmUodHJ1ZSk7XG5cdFx0ZXhwZWN0KCEhc2Vzc2lvbi51c2VyX2lkKS50b0JlKHRydWUpO1xuXHR9KSk7XG5cblx0aXQoJ3Nob3VsZCBub3QgZ2l2ZSBhIHNlc3Npb24gZm9yIGludmFsaWQgbG9naW4nLCBhc3luY1Rlc3QoYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0Y29uc3QgdXNlciA9IGF3YWl0IGNyZWF0ZVVzZXIoMSk7XG5cdFx0Y29uc3QgY29udHJvbGxlciA9IG5ldyBTZXNzaW9uQ29udHJvbGxlcigpO1xuXG5cdFx0bGV0IGVycm9yID0gYXdhaXQgY2hlY2tUaHJvd0FzeW5jKGFzeW5jICgpID0+IGNvbnRyb2xsZXIuYXV0aGVudGljYXRlKHVzZXIuZW1haWwsICd3cm9uZycpKTtcblx0XHRleHBlY3QoZXJyb3IgaW5zdGFuY2VvZiBFcnJvckZvcmJpZGRlbikudG9CZSh0cnVlKTtcblxuXHRcdGVycm9yID0gYXdhaXQgY2hlY2tUaHJvd0FzeW5jKGFzeW5jICgpID0+IGNvbnRyb2xsZXIuYXV0aGVudGljYXRlKCd3cm9uZ0B3cm9uZy5jb20nLCAnMTIzNDU2JykpO1xuXHRcdGV4cGVjdChlcnJvciBpbnN0YW5jZW9mIEVycm9yRm9yYmlkZGVuKS50b0JlKHRydWUpO1xuXHR9KSk7XG5cbn0pO1xuIl19
