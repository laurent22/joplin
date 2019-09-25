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
var UserModel_1 = require("../models/UserModel");
var BaseController_1 = require("./BaseController");
var UserController = /** @class */ (function (_super) {
    __extends(UserController, _super);
    function UserController() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UserController.prototype.createUser = function (sessionId, user) {
        return __awaiter(this, void 0, void 0, function () {
            var owner, userModel, newUser;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initSession(sessionId, true)];
                    case 1:
                        owner = _a.sent();
                        userModel = new UserModel_1.default({ userId: owner.id });
                        return [4 /*yield*/, userModel.fromApiInput(user)];
                    case 2:
                        newUser = _a.sent();
                        return [4 /*yield*/, userModel.save(newUser)];
                    case 3:
                        newUser = _a.sent();
                        return [2 /*return*/, userModel.toApiOutput(newUser)];
                }
            });
        });
    };
    UserController.prototype.getUser = function (sessionId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var owner, userModel, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.initSession(sessionId)];
                    case 1:
                        owner = _c.sent();
                        userModel = new UserModel_1.default({ userId: owner.id });
                        _b = (_a = userModel).toApiOutput;
                        return [4 /*yield*/, userModel.load(userId)];
                    case 2: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
    };
    UserController.prototype.updateUser = function (sessionId, user) {
        return __awaiter(this, void 0, void 0, function () {
            var owner, userModel, newUser;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initSession(sessionId)];
                    case 1:
                        owner = _a.sent();
                        userModel = new UserModel_1.default({ userId: owner.id });
                        return [4 /*yield*/, userModel.fromApiInput(user)];
                    case 2:
                        newUser = _a.sent();
                        return [4 /*yield*/, userModel.save(newUser, { isNew: false })];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    UserController.prototype.deleteUser = function (sessionId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var user, userModel;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initSession(sessionId)];
                    case 1:
                        user = _a.sent();
                        userModel = new UserModel_1.default({ userId: user.id });
                        return [4 /*yield*/, userModel.delete(userId)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return UserController;
}(BaseController_1.default));
exports.default = UserController;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlVzZXJDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLGlEQUE0QztBQUM1QyxtREFBOEM7QUFFOUM7SUFBNEMsa0NBQWM7SUFBMUQ7O0lBNkJBLENBQUM7SUEzQk0sbUNBQVUsR0FBaEIsVUFBaUIsU0FBZ0IsRUFBRSxJQUFTOzs7Ozs0QkFDN0IscUJBQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEVBQUE7O3dCQUEvQyxLQUFLLEdBQUcsU0FBdUM7d0JBQy9DLFNBQVMsR0FBRyxJQUFJLG1CQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ3hDLHFCQUFNLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUE7O3dCQUE1QyxPQUFPLEdBQUcsU0FBa0M7d0JBQ3RDLHFCQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUE7O3dCQUF2QyxPQUFPLEdBQUcsU0FBNkIsQ0FBQzt3QkFDeEMsc0JBQU8sU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBQzs7OztLQUN0QztJQUVLLGdDQUFPLEdBQWIsVUFBYyxTQUFnQixFQUFFLE1BQWE7Ozs7OzRCQUM5QixxQkFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxFQUFBOzt3QkFBekMsS0FBSyxHQUFHLFNBQWlDO3dCQUN6QyxTQUFTLEdBQUcsSUFBSSxtQkFBUyxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUMvQyxLQUFBLENBQUEsS0FBQSxTQUFTLENBQUEsQ0FBQyxXQUFXLENBQUE7d0JBQUMscUJBQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBQTs0QkFBekQsc0JBQU8sY0FBc0IsU0FBNEIsRUFBQyxFQUFDOzs7O0tBQzNEO0lBRUssbUNBQVUsR0FBaEIsVUFBaUIsU0FBZ0IsRUFBRSxJQUFTOzs7Ozs0QkFDN0IscUJBQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBQTs7d0JBQXpDLEtBQUssR0FBRyxTQUFpQzt3QkFDekMsU0FBUyxHQUFHLElBQUksbUJBQVMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzt3QkFDdEMscUJBQU0sU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBQTs7d0JBQTVDLE9BQU8sR0FBRyxTQUFrQzt3QkFDbEQscUJBQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBQTs7d0JBQS9DLFNBQStDLENBQUM7Ozs7O0tBQ2hEO0lBRUssbUNBQVUsR0FBaEIsVUFBaUIsU0FBZ0IsRUFBRSxNQUFhOzs7Ozs0QkFDbEMscUJBQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsRUFBQTs7d0JBQXhDLElBQUksR0FBRyxTQUFpQzt3QkFDeEMsU0FBUyxHQUFHLElBQUksbUJBQVMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzt3QkFDckQscUJBQU0sU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBQTs7d0JBQTlCLFNBQThCLENBQUM7Ozs7O0tBQy9CO0lBRUYscUJBQUM7QUFBRCxDQTdCQSxBQTZCQyxDQTdCMkMsd0JBQWMsR0E2QnpEIiwiZmlsZSI6IlVzZXJDb250cm9sbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVXNlciB9IGZyb20gJy4uL2RiJztcbmltcG9ydCBVc2VyTW9kZWwgZnJvbSAnLi4vbW9kZWxzL1VzZXJNb2RlbCc7XG5pbXBvcnQgQmFzZUNvbnRyb2xsZXIgZnJvbSAnLi9CYXNlQ29udHJvbGxlcic7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFVzZXJDb250cm9sbGVyIGV4dGVuZHMgQmFzZUNvbnRyb2xsZXIge1xuXG5cdGFzeW5jIGNyZWF0ZVVzZXIoc2Vzc2lvbklkOnN0cmluZywgdXNlcjpVc2VyKTpQcm9taXNlPFVzZXI+IHtcblx0XHRjb25zdCBvd25lciA9IGF3YWl0IHRoaXMuaW5pdFNlc3Npb24oc2Vzc2lvbklkLCB0cnVlKTtcblx0XHRjb25zdCB1c2VyTW9kZWwgPSBuZXcgVXNlck1vZGVsKHsgdXNlcklkOiBvd25lci5pZCB9KTtcblx0XHRsZXQgbmV3VXNlciA9IGF3YWl0IHVzZXJNb2RlbC5mcm9tQXBpSW5wdXQodXNlcik7XG5cdFx0bmV3VXNlciA9IGF3YWl0IHVzZXJNb2RlbC5zYXZlKG5ld1VzZXIpO1xuXHRcdHJldHVybiB1c2VyTW9kZWwudG9BcGlPdXRwdXQobmV3VXNlcik7XG5cdH1cblxuXHRhc3luYyBnZXRVc2VyKHNlc3Npb25JZDpzdHJpbmcsIHVzZXJJZDpzdHJpbmcpOlByb21pc2U8VXNlcj4ge1xuXHRcdGNvbnN0IG93bmVyID0gYXdhaXQgdGhpcy5pbml0U2Vzc2lvbihzZXNzaW9uSWQpO1xuXHRcdGNvbnN0IHVzZXJNb2RlbCA9IG5ldyBVc2VyTW9kZWwoeyB1c2VySWQ6IG93bmVyLmlkIH0pO1xuXHRcdHJldHVybiB1c2VyTW9kZWwudG9BcGlPdXRwdXQoYXdhaXQgdXNlck1vZGVsLmxvYWQodXNlcklkKSk7XG5cdH1cblxuXHRhc3luYyB1cGRhdGVVc2VyKHNlc3Npb25JZDpzdHJpbmcsIHVzZXI6VXNlcik6UHJvbWlzZTx2b2lkPiB7XG5cdFx0Y29uc3Qgb3duZXIgPSBhd2FpdCB0aGlzLmluaXRTZXNzaW9uKHNlc3Npb25JZCk7XG5cdFx0Y29uc3QgdXNlck1vZGVsID0gbmV3IFVzZXJNb2RlbCh7IHVzZXJJZDogb3duZXIuaWQgfSk7XG5cdFx0Y29uc3QgbmV3VXNlciA9IGF3YWl0IHVzZXJNb2RlbC5mcm9tQXBpSW5wdXQodXNlcik7XG5cdFx0YXdhaXQgdXNlck1vZGVsLnNhdmUobmV3VXNlciwgeyBpc05ldzogZmFsc2UgfSk7XG5cdH1cblxuXHRhc3luYyBkZWxldGVVc2VyKHNlc3Npb25JZDpzdHJpbmcsIHVzZXJJZDpzdHJpbmcpOlByb21pc2U8dm9pZD4ge1xuXHRcdGNvbnN0IHVzZXIgPSBhd2FpdCB0aGlzLmluaXRTZXNzaW9uKHNlc3Npb25JZCk7XG5cdFx0Y29uc3QgdXNlck1vZGVsID0gbmV3IFVzZXJNb2RlbCh7IHVzZXJJZDogdXNlci5pZCB9KTtcblx0XHRhd2FpdCB1c2VyTW9kZWwuZGVsZXRlKHVzZXJJZCk7XG5cdH1cblxufVxuIl19
