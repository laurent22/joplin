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
var Koa = require("koa");
var getRawBody = require("raw-body");
var fs = require("fs-extra");
var port = 3222;
var app = new Koa();
// app.use(koaBody({
// 	multipart: true,
// 	// includeUnparsed: true,
// });
app.use(function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var body;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getRawBody(ctx.req)];
            case 1:
                body = _a.sent();
                return [4 /*yield*/, fs.writeFile('/mnt/c/Users/laurent/src/joplin/testingpost.jpg', body)];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
console.info('Starting server on port ' + port);
app.listen(port);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInVwbG9hZFRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx5QkFBMkI7QUFFM0IscUNBQXVDO0FBRXZDLDZCQUErQjtBQUUvQixJQUFNLElBQUksR0FBRyxJQUFJLENBQUM7QUFFbEIsSUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUV0QixvQkFBb0I7QUFDcEIsb0JBQW9CO0FBQ3BCLDZCQUE2QjtBQUM3QixNQUFNO0FBRU4sR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFPLEdBQWU7Ozs7b0JBSWhCLHFCQUFNLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUE7O2dCQUFoQyxJQUFJLEdBQUcsU0FBeUI7Z0JBRXRDLHFCQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsaURBQWlELEVBQUUsSUFBSSxDQUFDLEVBQUE7O2dCQUEzRSxTQUEyRSxDQUFDOzs7O0tBRTVFLENBQUMsQ0FBQztBQUVILE9BQU8sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFFaEQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyIsImZpbGUiOiJ1cGxvYWRUZXN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgS29hIGZyb20gJ2tvYSc7XG5pbXBvcnQgKiBhcyBrb2FCb2R5IGZyb20gJ2tvYS1ib2R5JztcbmltcG9ydCAqIGFzIGdldFJhd0JvZHkgZnJvbSAncmF3LWJvZHknO1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5cbmNvbnN0IHBvcnQgPSAzMjIyO1xuXG5jb25zdCBhcHAgPSBuZXcgS29hKCk7XG5cbi8vIGFwcC51c2Uoa29hQm9keSh7XG4vLyBcdG11bHRpcGFydDogdHJ1ZSxcbi8vIFx0Ly8gaW5jbHVkZVVucGFyc2VkOiB0cnVlLFxuLy8gfSk7XG5cbmFwcC51c2UoYXN5bmMgKGN0eDpLb2EuQ29udGV4dCkgPT4ge1xuXHQvL2NvbnNvbGUuaW5mbyhcIkZJTEVTXCIsIGN0eC5yZXF1ZXN0LmZpbGVzKTtcblx0Ly8gY29uc29sZS5pbmZvKFwiQk9EWVwiLCBjdHgucmVxdWVzdC5ib2R5KTtcblxuXHRjb25zdCBib2R5ID0gYXdhaXQgZ2V0UmF3Qm9keShjdHgucmVxKVxuXG5cdGF3YWl0IGZzLndyaXRlRmlsZSgnL21udC9jL1VzZXJzL2xhdXJlbnQvc3JjL2pvcGxpbi90ZXN0aW5ncG9zdC5qcGcnLCBib2R5KTtcblxufSk7XG5cbmNvbnNvbGUuaW5mbygnU3RhcnRpbmcgc2VydmVyIG9uIHBvcnQgJyArIHBvcnQpO1xuXG5hcHAubGlzdGVuKHBvcnQpO1xuIl19
