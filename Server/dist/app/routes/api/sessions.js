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
var parse = require("co-body");
var SessionController_1 = require("../../controllers/SessionController");
var errors_1 = require("../../utils/errors");
var route = {
    exec: function (path, ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var user, sessionController, session;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!path.link) return [3 /*break*/, 3];
                        if (!(ctx.method === 'POST')) return [3 /*break*/, 3];
                        return [4 /*yield*/, parse.json(ctx)];
                    case 1:
                        user = _a.sent();
                        sessionController = new SessionController_1.default();
                        return [4 /*yield*/, sessionController.authenticate(user.email, user.password)];
                    case 2:
                        session = _a.sent();
                        return [2 /*return*/, { id: session.id }];
                    case 3: throw new errors_1.ErrorNotFound("Invalid link: " + path.link);
                }
            });
        });
    },
};
exports.default = route;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNlc3Npb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQWlDO0FBQ2pDLHlFQUFvRTtBQUVwRSw2Q0FBbUQ7QUFFbkQsSUFBTSxLQUFLLEdBQVM7SUFFbkIsSUFBSSxFQUFFLFVBQWUsSUFBWSxFQUFFLEdBQWU7Ozs7Ozs2QkFDN0MsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFWLHdCQUFVOzZCQUNULENBQUEsR0FBRyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUEsRUFBckIsd0JBQXFCO3dCQUNYLHFCQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUE7O3dCQUE1QixJQUFJLEdBQUcsU0FBcUI7d0JBQzVCLGlCQUFpQixHQUFHLElBQUksMkJBQWlCLEVBQUUsQ0FBQzt3QkFDbEMscUJBQU0saUJBQWlCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFBOzt3QkFBekUsT0FBTyxHQUFHLFNBQStEO3dCQUMvRSxzQkFBTyxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRSxFQUFFLEVBQUM7NEJBSTVCLE1BQU0sSUFBSSxzQkFBYSxDQUFDLG1CQUFpQixJQUFJLENBQUMsSUFBTSxDQUFDLENBQUM7Ozs7S0FDdEQ7Q0FFRCxDQUFDO0FBRUYsa0JBQWUsS0FBSyxDQUFDIiwiZmlsZSI6InNlc3Npb25zLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgS29hIGZyb20gJ2tvYSc7XG5pbXBvcnQgKiBhcyBwYXJzZSBmcm9tICdjby1ib2R5JztcbmltcG9ydCBTZXNzaW9uQ29udHJvbGxlciBmcm9tICcuLi8uLi9jb250cm9sbGVycy9TZXNzaW9uQ29udHJvbGxlcic7XG5pbXBvcnQgeyBTdWJQYXRoLCBSb3V0ZSB9IGZyb20gJy4uLy4uL3V0aWxzL3JvdXRlVXRpbHMnO1xuaW1wb3J0IHsgRXJyb3JOb3RGb3VuZCB9IGZyb20gJy4uLy4uL3V0aWxzL2Vycm9ycyc7XG5cbmNvbnN0IHJvdXRlOlJvdXRlID0ge1xuXG5cdGV4ZWM6IGFzeW5jIGZ1bmN0aW9uKHBhdGg6U3ViUGF0aCwgY3R4OktvYS5Db250ZXh0KSB7XG5cdFx0aWYgKCFwYXRoLmxpbmspIHtcblx0XHRcdGlmIChjdHgubWV0aG9kID09PSAnUE9TVCcpIHtcblx0XHRcdFx0Y29uc3QgdXNlciA9IGF3YWl0IHBhcnNlLmpzb24oY3R4KTtcblx0XHRcdFx0Y29uc3Qgc2Vzc2lvbkNvbnRyb2xsZXIgPSBuZXcgU2Vzc2lvbkNvbnRyb2xsZXIoKTtcblx0XHRcdFx0Y29uc3Qgc2Vzc2lvbiA9IGF3YWl0IHNlc3Npb25Db250cm9sbGVyLmF1dGhlbnRpY2F0ZSh1c2VyLmVtYWlsLCB1c2VyLnBhc3N3b3JkKTtcblx0XHRcdFx0cmV0dXJuIHsgaWQ6IHNlc3Npb24uaWQgfTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aHJvdyBuZXcgRXJyb3JOb3RGb3VuZChgSW52YWxpZCBsaW5rOiAke3BhdGgubGlua31gKTtcblx0fSxcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgcm91dGU7XG4iXX0=
