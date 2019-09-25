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
var BaseModel_1 = require("./BaseModel");
var UserModel_1 = require("./UserModel");
var SessionModel = /** @class */ (function (_super) {
    __extends(SessionModel, _super);
    function SessionModel() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(SessionModel.prototype, "tableName", {
        get: function () {
            return 'sessions';
        },
        enumerable: true,
        configurable: true
    });
    SessionModel.prototype.sessionUser = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var session, userModel;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.load(sessionId)];
                    case 1:
                        session = _a.sent();
                        if (!session)
                            return [2 /*return*/, null];
                        userModel = new UserModel_1.default({ userId: session.user_id });
                        return [2 /*return*/, userModel.load(session.user_id)];
                }
            });
        });
    };
    return SessionModel;
}(BaseModel_1.default));
exports.default = SessionModel;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlNlc3Npb25Nb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx5Q0FBb0M7QUFDcEMseUNBQW9DO0FBR3BDO0lBQTBDLGdDQUFTO0lBQW5EOztJQWFBLENBQUM7SUFYQSxzQkFBSSxtQ0FBUzthQUFiO1lBQ0MsT0FBTyxVQUFVLENBQUM7UUFDbkIsQ0FBQzs7O09BQUE7SUFFSyxrQ0FBVyxHQUFqQixVQUFrQixTQUFnQjs7Ozs7NEJBQ1QscUJBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBQTs7d0JBQTVDLE9BQU8sR0FBVyxTQUEwQjt3QkFDbEQsSUFBSSxDQUFDLE9BQU87NEJBQUUsc0JBQU8sSUFBSSxFQUFDO3dCQUNwQixTQUFTLEdBQUcsSUFBSSxtQkFBUyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO3dCQUM3RCxzQkFBTyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBQzs7OztLQUN2QztJQUVGLG1CQUFDO0FBQUQsQ0FiQSxBQWFDLENBYnlDLG1CQUFTLEdBYWxEIiwiZmlsZSI6IlNlc3Npb25Nb2RlbC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBCYXNlTW9kZWwgZnJvbSAnLi9CYXNlTW9kZWwnO1xuaW1wb3J0IFVzZXJNb2RlbCBmcm9tICcuL1VzZXJNb2RlbCc7XG5pbXBvcnQgeyBVc2VyLCBTZXNzaW9uIH0gZnJvbSAnLi4vZGInO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTZXNzaW9uTW9kZWwgZXh0ZW5kcyBCYXNlTW9kZWwge1xuXG5cdGdldCB0YWJsZU5hbWUoKTpzdHJpbmcge1xuXHRcdHJldHVybiAnc2Vzc2lvbnMnO1xuXHR9XG5cblx0YXN5bmMgc2Vzc2lvblVzZXIoc2Vzc2lvbklkOnN0cmluZyk6UHJvbWlzZTxVc2VyPiB7XG5cdFx0Y29uc3Qgc2Vzc2lvbjpTZXNzaW9uID0gYXdhaXQgdGhpcy5sb2FkKHNlc3Npb25JZCk7XG5cdFx0aWYgKCFzZXNzaW9uKSByZXR1cm4gbnVsbDtcblx0XHRjb25zdCB1c2VyTW9kZWwgPSBuZXcgVXNlck1vZGVsKHsgdXNlcklkOiBzZXNzaW9uLnVzZXJfaWQgfSk7XG5cdFx0cmV0dXJuIHVzZXJNb2RlbC5sb2FkKHNlc3Npb24udXNlcl9pZCk7XG5cdH1cblxufVxuIl19
