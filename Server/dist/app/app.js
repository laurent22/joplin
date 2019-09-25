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
var Koa = require("koa");
var sessions_1 = require("./routes/api/sessions");
var ping_1 = require("./routes/api/ping");
var files_1 = require("./routes/api/files");
var errors_1 = require("./utils/errors");
var fs = require("fs-extra");
var koaBody = require("koa-body");
var yargs_1 = require("yargs");
var routeUtils_1 = require("./utils/routeUtils");
var appLogger_1 = require("./utils/appLogger");
var koaIf_1 = require("./utils/koaIf");
var port = 3222;
appLogger_1.default.info("Starting server on port " + port + " and PID " + process.pid + "...");
var app = new Koa();
var routes = {
    'api/ping': ping_1.default,
    'api/sessions': sessions_1.default,
    'api/files': files_1.default,
};
var koaBodyMiddleware = koaBody({
    multipart: true,
    includeUnparsed: true,
});
app.use(koaIf_1.default(koaBodyMiddleware, function (ctx) {
    var match = routeUtils_1.findMatchingRoute(ctx.path, routes);
    console.info('match.route.needsBodyMiddleware', match.route.needsBodyMiddleware);
    return match.route.needsBodyMiddleware === true;
}));
app.use(function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var match, responseObject, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                match = routeUtils_1.findMatchingRoute(ctx.path, routes);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                if (!match) return [3 /*break*/, 3];
                return [4 /*yield*/, match.route.exec(match.subPath, ctx)];
            case 2:
                responseObject = _a.sent();
                if (responseObject instanceof routeUtils_1.ApiResponse) {
                    ctx.response = responseObject.response;
                }
                else {
                    ctx.response.status = 200;
                    ctx.response.body = responseObject;
                }
                return [3 /*break*/, 4];
            case 3: throw new errors_1.ErrorNotFound();
            case 4: return [3 /*break*/, 6];
            case 5:
                error_1 = _a.sent();
                appLogger_1.default.error(error_1);
                ctx.response.status = error_1.httpCode ? error_1.httpCode : 500;
                ctx.response.body = { error: error_1.message };
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
var pidFile = yargs_1.argv.pidfile;
if (pidFile) {
    appLogger_1.default.info("Writing PID to " + pidFile + "...");
    fs.removeSync(pidFile);
    fs.writeFileSync(pidFile, "" + process.pid);
}
app.listen(port);

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LE9BQU8sRUFBRSxLQUFHLE9BQU8sQ0FBQyxHQUFLLENBQUMsQ0FBQztDQUM1QztBQUVELEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsicmVxdWlyZSgnYXBwLW1vZHVsZS1wYXRoJykuYWRkUGF0aChgJHtfX2Rpcm5hbWV9Ly4uYCk7XG5cbmltcG9ydCAqIGFzIEtvYSBmcm9tICdrb2EnO1xuaW1wb3J0IGFwaVNlc3Npb25zUm91dGUgZnJvbSAnLi9yb3V0ZXMvYXBpL3Nlc3Npb25zJztcbmltcG9ydCBhcGlQaW5nUm91dGUgZnJvbSAnLi9yb3V0ZXMvYXBpL3BpbmcnO1xuaW1wb3J0IGFwaUZpbGVzUm91dGUgZnJvbSAnLi9yb3V0ZXMvYXBpL2ZpbGVzJztcbmltcG9ydCB7IEVycm9yTm90Rm91bmQgfSBmcm9tICcuL3V0aWxzL2Vycm9ycyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBrb2FCb2R5IGZyb20gJ2tvYS1ib2R5JztcbmltcG9ydCB7IGFyZ3YgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBSb3V0ZXMsIGZpbmRNYXRjaGluZ1JvdXRlLCBBcGlSZXNwb25zZSB9IGZyb20gJy4vdXRpbHMvcm91dGVVdGlscyc7XG5pbXBvcnQgYXBwTG9nZ2VyIGZyb20gJy4vdXRpbHMvYXBwTG9nZ2VyJztcbmltcG9ydCBrb2FJZiBmcm9tICcuL3V0aWxzL2tvYUlmJztcblxuY29uc3QgcG9ydCA9IDMyMjI7XG5cbmFwcExvZ2dlci5pbmZvKGBTdGFydGluZyBzZXJ2ZXIgb24gcG9ydCAke3BvcnR9IGFuZCBQSUQgJHtwcm9jZXNzLnBpZH0uLi5gKTtcblxuY29uc3QgYXBwID0gbmV3IEtvYSgpO1xuXG5jb25zdCByb3V0ZXM6Um91dGVzID0ge1xuXHQnYXBpL3BpbmcnOiBhcGlQaW5nUm91dGUsXG5cdCdhcGkvc2Vzc2lvbnMnOiBhcGlTZXNzaW9uc1JvdXRlLFxuXHQnYXBpL2ZpbGVzJzogYXBpRmlsZXNSb3V0ZSxcbn07XG5cbmNvbnN0IGtvYUJvZHlNaWRkbGV3YXJlID0ga29hQm9keSh7XG5cdG11bHRpcGFydDogdHJ1ZSxcblx0aW5jbHVkZVVucGFyc2VkOiB0cnVlLFxufSk7XG5cbmFwcC51c2Uoa29hSWYoa29hQm9keU1pZGRsZXdhcmUsIChjdHg6S29hLkNvbnRleHQpID0+IHtcblx0Y29uc3QgbWF0Y2ggPSBmaW5kTWF0Y2hpbmdSb3V0ZShjdHgucGF0aCwgcm91dGVzKTtcblx0Y29uc29sZS5pbmZvKCdtYXRjaC5yb3V0ZS5uZWVkc0JvZHlNaWRkbGV3YXJlJywgbWF0Y2gucm91dGUubmVlZHNCb2R5TWlkZGxld2FyZSk7XG5cdHJldHVybiBtYXRjaC5yb3V0ZS5uZWVkc0JvZHlNaWRkbGV3YXJlID09PSB0cnVlO1xufSkpO1xuXG5hcHAudXNlKGFzeW5jIChjdHg6S29hLkNvbnRleHQpID0+IHtcblx0Y29uc3QgbWF0Y2ggPSBmaW5kTWF0Y2hpbmdSb3V0ZShjdHgucGF0aCwgcm91dGVzKTtcblxuXHR0cnkge1xuXHRcdGlmIChtYXRjaCkge1xuXHRcdFx0Y29uc3QgcmVzcG9uc2VPYmplY3QgPSBhd2FpdCBtYXRjaC5yb3V0ZS5leGVjKG1hdGNoLnN1YlBhdGgsIGN0eCk7XG5cblx0XHRcdGlmIChyZXNwb25zZU9iamVjdCBpbnN0YW5jZW9mIEFwaVJlc3BvbnNlKSB7XG5cdFx0XHRcdGN0eC5yZXNwb25zZSA9IHJlc3BvbnNlT2JqZWN0LnJlc3BvbnNlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y3R4LnJlc3BvbnNlLnN0YXR1cyA9IDIwMDtcblx0XHRcdFx0Y3R4LnJlc3BvbnNlLmJvZHkgPSByZXNwb25zZU9iamVjdDtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yTm90Rm91bmQoKTtcblx0XHR9XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0YXBwTG9nZ2VyLmVycm9yKGVycm9yKTtcblx0XHRjdHgucmVzcG9uc2Uuc3RhdHVzID0gZXJyb3IuaHR0cENvZGUgPyBlcnJvci5odHRwQ29kZSA6IDUwMDtcblx0XHRjdHgucmVzcG9uc2UuYm9keSA9IHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcblx0fVxufSk7XG5cbmNvbnN0IHBpZEZpbGUgPSBhcmd2LnBpZGZpbGUgYXMgc3RyaW5nO1xuaWYgKHBpZEZpbGUpIHtcblx0YXBwTG9nZ2VyLmluZm8oYFdyaXRpbmcgUElEIHRvICR7cGlkRmlsZX0uLi5gKTtcblx0ZnMucmVtb3ZlU3luYyhwaWRGaWxlIGFzIHN0cmluZyk7XG5cdGZzLndyaXRlRmlsZVN5bmMocGlkRmlsZSwgYCR7cHJvY2Vzcy5waWR9YCk7XG59XG5cbmFwcC5saXN0ZW4ocG9ydCk7XG4iXX0=
