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
var errors_1 = require("../utils/errors");
var SessionModel_1 = require("../models/SessionModel");
var BaseController = /** @class */ (function () {
    function BaseController() {
    }
    BaseController.prototype.initSession = function (sessionId, mustBeAdmin) {
        if (mustBeAdmin === void 0) { mustBeAdmin = false; }
        return __awaiter(this, void 0, void 0, function () {
            var sessionModel, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sessionModel = new SessionModel_1.default();
                        return [4 /*yield*/, sessionModel.sessionUser(sessionId)];
                    case 1:
                        user = _a.sent();
                        if (!user)
                            throw new errors_1.ErrorForbidden("Invalid session ID: " + sessionId);
                        if (!user.is_admin && mustBeAdmin)
                            throw new errors_1.ErrorForbidden('Non-admin user is not allowed');
                        return [2 /*return*/, user];
                }
            });
        });
    };
    return BaseController;
}());
exports.default = BaseController;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkJhc2VDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsMENBQWlEO0FBQ2pELHVEQUFrRDtBQUVsRDtJQUFBO0lBVUEsQ0FBQztJQVJNLG9DQUFXLEdBQWpCLFVBQWtCLFNBQWdCLEVBQUUsV0FBMkI7UUFBM0IsNEJBQUEsRUFBQSxtQkFBMkI7Ozs7Ozt3QkFDeEQsWUFBWSxHQUFHLElBQUksc0JBQVksRUFBRSxDQUFDO3dCQUN0QixxQkFBTSxZQUFZLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxFQUFBOzt3QkFBckQsSUFBSSxHQUFRLFNBQXlDO3dCQUMzRCxJQUFJLENBQUMsSUFBSTs0QkFBRSxNQUFNLElBQUksdUJBQWMsQ0FBQyx5QkFBdUIsU0FBVyxDQUFDLENBQUM7d0JBQ3hFLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLFdBQVc7NEJBQUUsTUFBTSxJQUFJLHVCQUFjLENBQUMsK0JBQStCLENBQUMsQ0FBQzt3QkFDN0Ysc0JBQU8sSUFBSSxFQUFDOzs7O0tBQ1o7SUFFRixxQkFBQztBQUFELENBVkEsQUFVQyxJQUFBIiwiZmlsZSI6IkJhc2VDb250cm9sbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVXNlciB9IGZyb20gJy4uL2RiJztcbmltcG9ydCB7IEVycm9yRm9yYmlkZGVuIH0gZnJvbSAnLi4vdXRpbHMvZXJyb3JzJztcbmltcG9ydCBTZXNzaW9uTW9kZWwgZnJvbSAnLi4vbW9kZWxzL1Nlc3Npb25Nb2RlbCc7XG5cbmV4cG9ydCBkZWZhdWx0IGFic3RyYWN0IGNsYXNzIEJhc2VDb250cm9sbGVyIHtcblxuXHRhc3luYyBpbml0U2Vzc2lvbihzZXNzaW9uSWQ6c3RyaW5nLCBtdXN0QmVBZG1pbjpib29sZWFuID0gZmFsc2UpOlByb21pc2U8VXNlcj4ge1xuXHRcdGNvbnN0IHNlc3Npb25Nb2RlbCA9IG5ldyBTZXNzaW9uTW9kZWwoKTtcblx0XHRjb25zdCB1c2VyOlVzZXIgPSBhd2FpdCBzZXNzaW9uTW9kZWwuc2Vzc2lvblVzZXIoc2Vzc2lvbklkKTtcblx0XHRpZiAoIXVzZXIpIHRocm93IG5ldyBFcnJvckZvcmJpZGRlbihgSW52YWxpZCBzZXNzaW9uIElEOiAke3Nlc3Npb25JZH1gKTtcblx0XHRpZiAoIXVzZXIuaXNfYWRtaW4gJiYgbXVzdEJlQWRtaW4pIHRocm93IG5ldyBFcnJvckZvcmJpZGRlbignTm9uLWFkbWluIHVzZXIgaXMgbm90IGFsbG93ZWQnKTtcblx0XHRyZXR1cm4gdXNlcjtcblx0fVxuXG59XG4iXX0=
