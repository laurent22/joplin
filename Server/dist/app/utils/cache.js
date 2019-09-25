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
var Cache = /** @class */ (function () {
    function Cache() {
        this.cache = {};
    }
    Cache.prototype.setAny = function (key, o) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.cache[key] = {
                    object: JSON.stringify(o),
                    timestamp: Date.now(),
                };
                return [2 /*return*/];
            });
        });
    };
    Cache.prototype.setObject = function (key, object) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.setAny(key, object)];
            });
        });
    };
    Cache.prototype.getAny = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this.cache[key])
                    return [2 /*return*/, null];
                return [2 /*return*/, JSON.parse(this.cache[key].object)];
            });
        });
    };
    Cache.prototype.object = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.getAny(key)];
            });
        });
    };
    Cache.prototype.delete = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var keys, _i, keys_1, k;
            return __generator(this, function (_a) {
                keys = typeof key === 'string' ? [key] : key;
                for (_i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                    k = keys_1[_i];
                    delete this.cache[k];
                }
                return [2 /*return*/];
            });
        });
    };
    Cache.prototype.clearAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.cache = {};
                return [2 /*return*/];
            });
        });
    };
    return Cache;
}());
var cache = new Cache();
exports.default = cache;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNhY2hlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBU0E7SUFBQTtRQUVDLFVBQUssR0FBZ0IsRUFBRSxDQUFDO0lBK0J6QixDQUFDO0lBN0JjLHNCQUFNLEdBQXBCLFVBQXFCLEdBQVUsRUFBRSxDQUFLOzs7Z0JBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUc7b0JBQ2pCLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztvQkFDekIsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7aUJBQ3JCLENBQUM7Ozs7S0FDRjtJQUVLLHlCQUFTLEdBQWYsVUFBZ0IsR0FBVSxFQUFFLE1BQWE7OztnQkFDeEMsc0JBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEVBQUM7OztLQUNoQztJQUVhLHNCQUFNLEdBQXBCLFVBQXFCLEdBQVU7OztnQkFDOUIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO29CQUFFLHNCQUFPLElBQUksRUFBQztnQkFDbEMsc0JBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFDOzs7S0FDMUM7SUFFSyxzQkFBTSxHQUFaLFVBQWEsR0FBVTs7O2dCQUN0QixzQkFBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBVyxFQUFDOzs7S0FDbEM7SUFFSyxzQkFBTSxHQUFaLFVBQWEsR0FBcUI7Ozs7Z0JBQzNCLElBQUksR0FBRyxPQUFPLEdBQUcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFDbkQsV0FBb0IsRUFBSixhQUFJLEVBQUosa0JBQUksRUFBSixJQUFJO29CQUFULENBQUM7b0JBQVUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUFBOzs7O0tBQzNDO0lBRUssd0JBQVEsR0FBZDs7O2dCQUNDLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDOzs7O0tBQ2hCO0lBRUYsWUFBQztBQUFELENBakNBLEFBaUNDLElBQUE7QUFFRCxJQUFNLEtBQUssR0FBUyxJQUFJLEtBQUssRUFBRSxDQUFDO0FBRWhDLGtCQUFlLEtBQUssQ0FBQyIsImZpbGUiOiJjYWNoZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImludGVyZmFjZSBDYWNoZUVudHJ5IHtcblx0b2JqZWN0OiBhbnksXG5cdHRpbWVzdGFtcDogbnVtYmVyLFxufVxuXG5pbnRlcmZhY2UgQ2FjaGVFbnRyaWVzIHtcblx0W2tleTogc3RyaW5nXTogQ2FjaGVFbnRyeSxcbn1cblxuY2xhc3MgQ2FjaGUge1xuXG5cdGNhY2hlOkNhY2hlRW50cmllcyA9IHt9O1xuXG5cdHByaXZhdGUgYXN5bmMgc2V0QW55KGtleTpzdHJpbmcsIG86YW55KTpQcm9taXNlPHZvaWQ+IHtcblx0XHR0aGlzLmNhY2hlW2tleV0gPSB7XG5cdFx0XHRvYmplY3Q6IEpTT04uc3RyaW5naWZ5KG8pLFxuXHRcdFx0dGltZXN0YW1wOiBEYXRlLm5vdygpLFxuXHRcdH07XG5cdH1cblxuXHRhc3luYyBzZXRPYmplY3Qoa2V5OnN0cmluZywgb2JqZWN0Ok9iamVjdCk6UHJvbWlzZTx2b2lkPiB7XG5cdFx0cmV0dXJuIHRoaXMuc2V0QW55KGtleSwgb2JqZWN0KTtcblx0fVxuXG5cdHByaXZhdGUgYXN5bmMgZ2V0QW55KGtleTpzdHJpbmcpOlByb21pc2U8YW55PiB7XG5cdFx0aWYgKCF0aGlzLmNhY2hlW2tleV0pIHJldHVybiBudWxsO1xuXHRcdHJldHVybiBKU09OLnBhcnNlKHRoaXMuY2FjaGVba2V5XS5vYmplY3QpO1xuXHR9XG5cblx0YXN5bmMgb2JqZWN0KGtleTpzdHJpbmcpOlByb21pc2U8b2JqZWN0PiB7XG5cdFx0cmV0dXJuIHRoaXMuZ2V0QW55KGtleSkgYXMgb2JqZWN0O1xuXHR9XG5cblx0YXN5bmMgZGVsZXRlKGtleTpzdHJpbmcgfCBzdHJpbmdbXSk6UHJvbWlzZTx2b2lkPiB7XG5cdFx0Y29uc3Qga2V5cyA9IHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnID8gW2tleV0gOiBrZXk7XG5cdFx0Zm9yIChjb25zdCBrIG9mIGtleXMpIGRlbGV0ZSB0aGlzLmNhY2hlW2tdO1xuXHR9XG5cblx0YXN5bmMgY2xlYXJBbGwoKTpQcm9taXNlPHZvaWQ+IHtcblx0XHR0aGlzLmNhY2hlID0ge307XG5cdH1cblxufVxuXG5jb25zdCBjYWNoZTpDYWNoZSA9IG5ldyBDYWNoZSgpO1xuXG5leHBvcnQgZGVmYXVsdCBjYWNoZTtcbiJdfQ==
