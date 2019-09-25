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
function koaIf(middleware, condition) {
    var _this = this;
    if (condition === void 0) { condition = null; }
    return function (ctx, next) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(typeof condition === 'function' && condition(ctx))) return [3 /*break*/, 2];
                    return [4 /*yield*/, middleware(ctx, next)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 2:
                    if (!(typeof condition === 'boolean' && condition)) return [3 /*break*/, 4];
                    return [4 /*yield*/, middleware(ctx, next)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, next()];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    }); };
}
exports.default = koaIf;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImtvYUlmLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsU0FBd0IsS0FBSyxDQUFDLFVBQW1CLEVBQUUsU0FBa0I7SUFBckUsaUJBVUM7SUFWa0QsMEJBQUEsRUFBQSxnQkFBa0I7SUFDcEUsT0FBTyxVQUFPLEdBQVcsRUFBRSxJQUFhOzs7O3lCQUNuQyxDQUFBLE9BQU8sU0FBUyxLQUFLLFVBQVUsSUFBSSxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUEsRUFBakQsd0JBQWlEO29CQUNwRCxxQkFBTSxVQUFVLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFBOztvQkFBM0IsU0FBMkIsQ0FBQzs7O3lCQUNsQixDQUFBLE9BQU8sU0FBUyxLQUFLLFNBQVMsSUFBSSxTQUFTLENBQUEsRUFBM0Msd0JBQTJDO29CQUNyRCxxQkFBTSxVQUFVLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFBOztvQkFBM0IsU0FBMkIsQ0FBQzs7d0JBRTVCLHFCQUFNLElBQUksRUFBRSxFQUFBOztvQkFBWixTQUFZLENBQUM7Ozs7O1NBRWQsQ0FBQztBQUNILENBQUM7QUFWRCx3QkFVQyIsImZpbGUiOiJrb2FJZi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbnRleHQgfSBmcm9tICdrb2EnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBrb2FJZihtaWRkbGV3YXJlOkZ1bmN0aW9uLCBjb25kaXRpb246YW55PW51bGwpIHtcblx0cmV0dXJuIGFzeW5jIChjdHg6Q29udGV4dCwgbmV4dDpGdW5jdGlvbikgPT4ge1xuXHRcdGlmICh0eXBlb2YgY29uZGl0aW9uID09PSAnZnVuY3Rpb24nICYmIGNvbmRpdGlvbihjdHgpKSB7XG5cdFx0XHRhd2FpdCBtaWRkbGV3YXJlKGN0eCwgbmV4dCk7XG5cdFx0fSBlbHNlIGlmICh0eXBlb2YgY29uZGl0aW9uID09PSAnYm9vbGVhbicgJiYgY29uZGl0aW9uKSB7XG5cdFx0XHRhd2FpdCBtaWRkbGV3YXJlKGN0eCwgbmV4dCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGF3YWl0IG5leHQoKTtcblx0XHR9XG5cdH07XG59XG4iXX0=
