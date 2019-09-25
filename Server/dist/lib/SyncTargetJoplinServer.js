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
var BaseSyncTarget = require('lib/BaseSyncTarget.js');
var _ = require('lib/locale.js')._;
var Setting = require('lib/models/Setting.js');
// const { FileApi } = require('lib/file-api.js');
var Synchronizer = require('lib/synchronizer.js').Synchronizer;
// const WebDavApi = require('lib/WebDavApi');
// const { FileApiDriverWebDav } = require('lib/file-api-driver-webdav');
var SyncTargetJoplinServer = /** @class */ (function (_super) {
    __extends(SyncTargetJoplinServer, _super);
    function SyncTargetJoplinServer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SyncTargetJoplinServer.id = function () {
        return 8;
    };
    SyncTargetJoplinServer.supportsConfigCheck = function () {
        return true;
    };
    SyncTargetJoplinServer.targetName = function () {
        return 'joplinServer';
    };
    SyncTargetJoplinServer.label = function () {
        return _('Joplin Server');
    };
    SyncTargetJoplinServer.prototype.isAuthenticated = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, true];
            });
        });
    };
    // static async newFileApi_(syncTargetId, options) {
    // 	const apiOptions = {
    // 		baseUrl: () => options.path(),
    // 		username: () => options.username(),
    // 		password: () => options.password(),
    // 	};
    // 	return null;
    // 	// const api = new WebDavApi(apiOptions);
    // 	// const driver = new FileApiDriverWebDav(api);
    // 	// const fileApi = new FileApi('', driver);
    // 	// fileApi.setSyncTargetId(syncTargetId);
    // 	// return fileApi;
    // }
    SyncTargetJoplinServer.checkConfig = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var fileApi, output, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, SyncTargetJoplinServer.newFileApi_(SyncTargetJoplinServer.id(), options)];
                    case 1:
                        fileApi = _a.sent();
                        fileApi.requestRepeatCount_ = 0;
                        output = {
                            ok: false,
                            errorMessage: '',
                        };
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, fileApi.stat('')];
                    case 3:
                        result = _a.sent();
                        if (!result)
                            throw new Error("Sync directory not found: " + options.path());
                        output.ok = true;
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        output.errorMessage = error_1.message;
                        if (error_1.code)
                            output.errorMessage += " (Code " + error_1.code + ")";
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/, output];
                }
            });
        });
    };
    SyncTargetJoplinServer.prototype.initFileApi = function () {
        return __awaiter(this, void 0, void 0, function () {
            var fileApi;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, SyncTargetJoplinServer.newFileApi_(SyncTargetJoplinServer.id(), {
                            path: function () { return Setting.value('sync.8.path'); },
                            username: function () { return Setting.value('sync.8.username'); },
                            password: function () { return Setting.value('sync.8.password'); },
                        })];
                    case 1:
                        fileApi = _a.sent();
                        fileApi.setLogger(this.logger());
                        return [2 /*return*/, fileApi];
                }
            });
        });
    };
    SyncTargetJoplinServer.prototype.initSynchronizer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = Synchronizer.bind;
                        _b = [void 0, this.db()];
                        return [4 /*yield*/, this.fileApi()];
                    case 1: return [2 /*return*/, new (_a.apply(Synchronizer, _b.concat([_c.sent(), Setting.value('appType')])))()];
                }
            });
        });
    };
    return SyncTargetJoplinServer;
}(BaseSyncTarget));
module.exports = SyncTargetJoplinServer;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlN5bmNUYXJnZXRKb3BsaW5TZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUNoRCxJQUFBLDhCQUFDLENBQThCO0FBQ3ZDLElBQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ2pELGtEQUFrRDtBQUMxQyxJQUFBLDBEQUFZLENBQW9DO0FBQ3hELDhDQUE4QztBQUM5Qyx5RUFBeUU7QUFFekU7SUFBcUMsMENBQWM7SUFBbkQ7O0lBMEVBLENBQUM7SUF4RU8seUJBQUUsR0FBVDtRQUNDLE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVNLDBDQUFtQixHQUExQjtRQUNDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVNLGlDQUFVLEdBQWpCO1FBQ0MsT0FBTyxjQUFjLENBQUM7SUFDdkIsQ0FBQztJQUVNLDRCQUFLLEdBQVo7UUFDQyxPQUFPLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRUssZ0RBQWUsR0FBckI7OztnQkFDQyxzQkFBTyxJQUFJLEVBQUM7OztLQUNaO0lBRUQsb0RBQW9EO0lBQ3BELHdCQUF3QjtJQUN4QixtQ0FBbUM7SUFDbkMsd0NBQXdDO0lBQ3hDLHdDQUF3QztJQUN4QyxNQUFNO0lBRU4sZ0JBQWdCO0lBRWhCLDZDQUE2QztJQUM3QyxtREFBbUQ7SUFDbkQsK0NBQStDO0lBQy9DLDZDQUE2QztJQUM3QyxzQkFBc0I7SUFDdEIsSUFBSTtJQUVTLGtDQUFXLEdBQXhCLFVBQXlCLE9BQU87Ozs7OzRCQUNmLHFCQUFNLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBQTs7d0JBQXhGLE9BQU8sR0FBRyxTQUE4RTt3QkFDOUYsT0FBTyxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQzt3QkFFMUIsTUFBTSxHQUFHOzRCQUNkLEVBQUUsRUFBRSxLQUFLOzRCQUNULFlBQVksRUFBRSxFQUFFO3lCQUNoQixDQUFDOzs7O3dCQUdjLHFCQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUE7O3dCQUEvQixNQUFNLEdBQUcsU0FBc0I7d0JBQ3JDLElBQUksQ0FBQyxNQUFNOzRCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQTZCLE9BQU8sQ0FBQyxJQUFJLEVBQUksQ0FBQyxDQUFDO3dCQUM1RSxNQUFNLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQzs7Ozt3QkFFakIsTUFBTSxDQUFDLFlBQVksR0FBRyxPQUFLLENBQUMsT0FBTyxDQUFDO3dCQUNwQyxJQUFJLE9BQUssQ0FBQyxJQUFJOzRCQUFFLE1BQU0sQ0FBQyxZQUFZLElBQUksWUFBVSxPQUFLLENBQUMsSUFBSSxNQUFHLENBQUM7OzRCQUdoRSxzQkFBTyxNQUFNLEVBQUM7Ozs7S0FDZDtJQUVLLDRDQUFXLEdBQWpCOzs7Ozs0QkFDaUIscUJBQU0sc0JBQXNCLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxFQUFFOzRCQUNyRixJQUFJLEVBQUUsY0FBTSxPQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQTVCLENBQTRCOzRCQUN4QyxRQUFRLEVBQUUsY0FBTSxPQUFBLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsRUFBaEMsQ0FBZ0M7NEJBQ2hELFFBQVEsRUFBRSxjQUFNLE9BQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFoQyxDQUFnQzt5QkFDaEQsQ0FBQyxFQUFBOzt3QkFKSSxPQUFPLEdBQUcsU0FJZDt3QkFFRixPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO3dCQUVqQyxzQkFBTyxPQUFPLEVBQUM7Ozs7S0FDZjtJQUVLLGlEQUFnQixHQUF0Qjs7Ozs7OzZCQUNZLFlBQVk7c0NBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRTt3QkFBRSxxQkFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUE7NEJBQXZELHNCQUFPLGNBQUksWUFBWSxhQUFZLFNBQW9CLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBQyxFQUFDOzs7O0tBQ25GO0lBQ0YsNkJBQUM7QUFBRCxDQTFFQSxBQTBFQyxDQTFFb0MsY0FBYyxHQTBFbEQ7QUFFRCxNQUFNLENBQUMsT0FBTyxHQUFHLHNCQUFzQixDQUFDIiwiZmlsZSI6IlN5bmNUYXJnZXRKb3BsaW5TZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBCYXNlU3luY1RhcmdldCA9IHJlcXVpcmUoJ2xpYi9CYXNlU3luY1RhcmdldC5qcycpO1xuY29uc3QgeyBfIH0gPSByZXF1aXJlKCdsaWIvbG9jYWxlLmpzJyk7XG5jb25zdCBTZXR0aW5nID0gcmVxdWlyZSgnbGliL21vZGVscy9TZXR0aW5nLmpzJyk7XG4vLyBjb25zdCB7IEZpbGVBcGkgfSA9IHJlcXVpcmUoJ2xpYi9maWxlLWFwaS5qcycpO1xuY29uc3QgeyBTeW5jaHJvbml6ZXIgfSA9IHJlcXVpcmUoJ2xpYi9zeW5jaHJvbml6ZXIuanMnKTtcbi8vIGNvbnN0IFdlYkRhdkFwaSA9IHJlcXVpcmUoJ2xpYi9XZWJEYXZBcGknKTtcbi8vIGNvbnN0IHsgRmlsZUFwaURyaXZlcldlYkRhdiB9ID0gcmVxdWlyZSgnbGliL2ZpbGUtYXBpLWRyaXZlci13ZWJkYXYnKTtcblxuY2xhc3MgU3luY1RhcmdldEpvcGxpblNlcnZlciBleHRlbmRzIEJhc2VTeW5jVGFyZ2V0IHtcblxuXHRzdGF0aWMgaWQoKSB7XG5cdFx0cmV0dXJuIDg7XG5cdH1cblxuXHRzdGF0aWMgc3VwcG9ydHNDb25maWdDaGVjaygpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHN0YXRpYyB0YXJnZXROYW1lKCkge1xuXHRcdHJldHVybiAnam9wbGluU2VydmVyJztcblx0fVxuXG5cdHN0YXRpYyBsYWJlbCgpIHtcblx0XHRyZXR1cm4gXygnSm9wbGluIFNlcnZlcicpO1xuXHR9XG5cblx0YXN5bmMgaXNBdXRoZW50aWNhdGVkKCkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0Ly8gc3RhdGljIGFzeW5jIG5ld0ZpbGVBcGlfKHN5bmNUYXJnZXRJZCwgb3B0aW9ucykge1xuXHQvLyBcdGNvbnN0IGFwaU9wdGlvbnMgPSB7XG5cdC8vIFx0XHRiYXNlVXJsOiAoKSA9PiBvcHRpb25zLnBhdGgoKSxcblx0Ly8gXHRcdHVzZXJuYW1lOiAoKSA9PiBvcHRpb25zLnVzZXJuYW1lKCksXG5cdC8vIFx0XHRwYXNzd29yZDogKCkgPT4gb3B0aW9ucy5wYXNzd29yZCgpLFxuXHQvLyBcdH07XG5cblx0Ly8gXHRyZXR1cm4gbnVsbDtcblxuXHQvLyBcdC8vIGNvbnN0IGFwaSA9IG5ldyBXZWJEYXZBcGkoYXBpT3B0aW9ucyk7XG5cdC8vIFx0Ly8gY29uc3QgZHJpdmVyID0gbmV3IEZpbGVBcGlEcml2ZXJXZWJEYXYoYXBpKTtcblx0Ly8gXHQvLyBjb25zdCBmaWxlQXBpID0gbmV3IEZpbGVBcGkoJycsIGRyaXZlcik7XG5cdC8vIFx0Ly8gZmlsZUFwaS5zZXRTeW5jVGFyZ2V0SWQoc3luY1RhcmdldElkKTtcblx0Ly8gXHQvLyByZXR1cm4gZmlsZUFwaTtcblx0Ly8gfVxuXG5cdHN0YXRpYyBhc3luYyBjaGVja0NvbmZpZyhvcHRpb25zKSB7XG5cdFx0Y29uc3QgZmlsZUFwaSA9IGF3YWl0IFN5bmNUYXJnZXRKb3BsaW5TZXJ2ZXIubmV3RmlsZUFwaV8oU3luY1RhcmdldEpvcGxpblNlcnZlci5pZCgpLCBvcHRpb25zKTtcblx0XHRmaWxlQXBpLnJlcXVlc3RSZXBlYXRDb3VudF8gPSAwO1xuXG5cdFx0Y29uc3Qgb3V0cHV0ID0ge1xuXHRcdFx0b2s6IGZhbHNlLFxuXHRcdFx0ZXJyb3JNZXNzYWdlOiAnJyxcblx0XHR9O1xuXG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZpbGVBcGkuc3RhdCgnJyk7XG5cdFx0XHRpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IEVycm9yKGBTeW5jIGRpcmVjdG9yeSBub3QgZm91bmQ6ICR7b3B0aW9ucy5wYXRoKCl9YCk7XG5cdFx0XHRvdXRwdXQub2sgPSB0cnVlO1xuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRvdXRwdXQuZXJyb3JNZXNzYWdlID0gZXJyb3IubWVzc2FnZTtcblx0XHRcdGlmIChlcnJvci5jb2RlKSBvdXRwdXQuZXJyb3JNZXNzYWdlICs9IGAgKENvZGUgJHtlcnJvci5jb2RlfSlgO1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHRhc3luYyBpbml0RmlsZUFwaSgpIHtcblx0XHRjb25zdCBmaWxlQXBpID0gYXdhaXQgU3luY1RhcmdldEpvcGxpblNlcnZlci5uZXdGaWxlQXBpXyhTeW5jVGFyZ2V0Sm9wbGluU2VydmVyLmlkKCksIHtcblx0XHRcdHBhdGg6ICgpID0+IFNldHRpbmcudmFsdWUoJ3N5bmMuOC5wYXRoJyksXG5cdFx0XHR1c2VybmFtZTogKCkgPT4gU2V0dGluZy52YWx1ZSgnc3luYy44LnVzZXJuYW1lJyksXG5cdFx0XHRwYXNzd29yZDogKCkgPT4gU2V0dGluZy52YWx1ZSgnc3luYy44LnBhc3N3b3JkJyksXG5cdFx0fSk7XG5cblx0XHRmaWxlQXBpLnNldExvZ2dlcih0aGlzLmxvZ2dlcigpKTtcblxuXHRcdHJldHVybiBmaWxlQXBpO1xuXHR9XG5cblx0YXN5bmMgaW5pdFN5bmNocm9uaXplcigpIHtcblx0XHRyZXR1cm4gbmV3IFN5bmNocm9uaXplcih0aGlzLmRiKCksIGF3YWl0IHRoaXMuZmlsZUFwaSgpLCBTZXR0aW5nLnZhbHVlKCdhcHBUeXBlJykpO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU3luY1RhcmdldEpvcGxpblNlcnZlcjtcbiJdfQ==
