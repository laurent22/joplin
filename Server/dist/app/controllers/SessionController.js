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
var auth_1 = require("../utils/auth");
var errors_1 = require("../utils/errors");
var SessionModel_1 = require("../models/SessionModel");
var UserModel_1 = require("../models/UserModel");
var uuidgen_1 = require("../utils/uuidgen");
var SessionController = /** @class */ (function () {
    function SessionController() {
    }
    SessionController.prototype.authenticate = function (email, password) {
        return __awaiter(this, void 0, void 0, function () {
            var userModel, user, session, sessionModel;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userModel = new UserModel_1.default();
                        return [4 /*yield*/, userModel.loadByEmail(email)];
                    case 1:
                        user = _a.sent();
                        if (!user)
                            throw new errors_1.ErrorForbidden('Invalid username or password');
                        if (!auth_1.checkPassword(password, user.password))
                            throw new errors_1.ErrorForbidden('Invalid username or password');
                        session = { id: uuidgen_1.default(), user_id: user.id };
                        sessionModel = new SessionModel_1.default();
                        return [2 /*return*/, sessionModel.save(session, { isNew: true })];
                }
            });
        });
    };
    return SessionController;
}());
exports.default = SessionController;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlNlc3Npb25Db250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esc0NBQThDO0FBQzlDLDBDQUFpRDtBQUNqRCx1REFBa0Q7QUFDbEQsaURBQTRDO0FBQzVDLDRDQUF1QztBQUV2QztJQUFBO0lBWUEsQ0FBQztJQVZNLHdDQUFZLEdBQWxCLFVBQW1CLEtBQWEsRUFBRSxRQUFnQjs7Ozs7O3dCQUMzQyxTQUFTLEdBQUcsSUFBSSxtQkFBUyxFQUFFLENBQUM7d0JBQ2hCLHFCQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQUE7O3dCQUE5QyxJQUFJLEdBQVEsU0FBa0M7d0JBQ3BELElBQUksQ0FBQyxJQUFJOzRCQUFFLE1BQU0sSUFBSSx1QkFBYyxDQUFDLDhCQUE4QixDQUFDLENBQUM7d0JBQ3BFLElBQUksQ0FBQyxvQkFBYSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDOzRCQUFFLE1BQU0sSUFBSSx1QkFBYyxDQUFDLDhCQUE4QixDQUFDLENBQUM7d0JBQ2hHLE9BQU8sR0FBVyxFQUFFLEVBQUUsRUFBRSxpQkFBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQzt3QkFDdEQsWUFBWSxHQUFHLElBQUksc0JBQVksRUFBRSxDQUFDO3dCQUN4QyxzQkFBTyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFDOzs7O0tBQ25EO0lBRUYsd0JBQUM7QUFBRCxDQVpBLEFBWUMsSUFBQSIsImZpbGUiOiJTZXNzaW9uQ29udHJvbGxlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNlc3Npb24sIFVzZXIgfSBmcm9tICcuLi9kYic7XG5pbXBvcnQgeyBjaGVja1Bhc3N3b3JkIH0gZnJvbSAnLi4vdXRpbHMvYXV0aCc7XG5pbXBvcnQgeyBFcnJvckZvcmJpZGRlbiB9IGZyb20gJy4uL3V0aWxzL2Vycm9ycyc7XG5pbXBvcnQgU2Vzc2lvbk1vZGVsIGZyb20gJy4uL21vZGVscy9TZXNzaW9uTW9kZWwnO1xuaW1wb3J0IFVzZXJNb2RlbCBmcm9tICcuLi9tb2RlbHMvVXNlck1vZGVsJztcbmltcG9ydCB1dWlkZ2VuIGZyb20gJy4uL3V0aWxzL3V1aWRnZW4nO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTZXNzaW9uQ29udHJvbGxlciB7XG5cblx0YXN5bmMgYXV0aGVudGljYXRlKGVtYWlsOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcpOlByb21pc2U8U2Vzc2lvbj4ge1xuXHRcdGNvbnN0IHVzZXJNb2RlbCA9IG5ldyBVc2VyTW9kZWwoKTtcblx0XHRjb25zdCB1c2VyOlVzZXIgPSBhd2FpdCB1c2VyTW9kZWwubG9hZEJ5RW1haWwoZW1haWwpO1xuXHRcdGlmICghdXNlcikgdGhyb3cgbmV3IEVycm9yRm9yYmlkZGVuKCdJbnZhbGlkIHVzZXJuYW1lIG9yIHBhc3N3b3JkJyk7XG5cdFx0aWYgKCFjaGVja1Bhc3N3b3JkKHBhc3N3b3JkLCB1c2VyLnBhc3N3b3JkKSkgdGhyb3cgbmV3IEVycm9yRm9yYmlkZGVuKCdJbnZhbGlkIHVzZXJuYW1lIG9yIHBhc3N3b3JkJyk7XG5cdFx0Y29uc3Qgc2Vzc2lvbjpTZXNzaW9uID0geyBpZDogdXVpZGdlbigpLCB1c2VyX2lkOiB1c2VyLmlkIH07XG5cdFx0Y29uc3Qgc2Vzc2lvbk1vZGVsID0gbmV3IFNlc3Npb25Nb2RlbCgpO1xuXHRcdHJldHVybiBzZXNzaW9uTW9kZWwuc2F2ZShzZXNzaW9uLCB7IGlzTmV3OiB0cnVlIH0pO1xuXHR9XG5cbn1cbiJdfQ==
