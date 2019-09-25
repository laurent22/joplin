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
var Logger = require('lib/logger.js').Logger;
var rtrimSlashes = require('lib/path-utils.js').rtrimSlashes;
var shim = require('lib/shim').shim;
var JoplinServerApi = /** @class */ (function () {
    function JoplinServerApi(options) {
        this.logger_ = null;
        this.options_ = null;
        this.sessionId_ = null;
        this.logger_ = new Logger();
        this.options_ = options;
    }
    JoplinServerApi.prototype.setLogger = function (l) {
        this.logger_ = l;
    };
    JoplinServerApi.prototype.logger = function () {
        return this.logger_;
    };
    JoplinServerApi.prototype.baseUrl = function () {
        return rtrimSlashes(this.options_.baseUrl());
    };
    JoplinServerApi.prototype.setSessionId = function (v) {
        this.sessionId_ = v;
    };
    JoplinServerApi.prototype.sessionId = function () {
        return this.sessionId_;
    };
    JoplinServerApi.prototype.requestToCurl_ = function (url, options) {
        var output = [];
        output.push('curl');
        output.push('-v');
        if (options.method)
            output.push("-X " + options.method);
        if (options.headers) {
            for (var n in options.headers) {
                if (!options.headers.hasOwnProperty(n))
                    continue;
                output.push("" + '-H ' + '"' + n + ": " + options.headers[n] + "\"");
            }
        }
        if (options.body)
            output.push("" + '--data ' + '\'' + options.body + "'");
        output.push(url);
        return output.join(' ');
    };
    JoplinServerApi.prototype.exec = function (method, path, body, headers, options) {
        if (path === void 0) { path = ''; }
        if (body === void 0) { body = null; }
        if (headers === void 0) { headers = null; }
        if (options === void 0) { options = null; }
        return __awaiter(this, void 0, void 0, function () {
            var fetchOptions, url, response, responseText;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (headers === null)
                            headers = {};
                        if (options === null)
                            options = {};
                        if (!options.responseFormat)
                            options.responseFormat = 'json';
                        if (!options.target)
                            options.target = 'string';
                        if (this.sessionId())
                            headers['X-API-AUTH'] = this.sessionId();
                        fetchOptions = {};
                        fetchOptions.headers = headers;
                        fetchOptions.method = method;
                        if (options.path)
                            fetchOptions.path = options.path;
                        if (body)
                            fetchOptions.body = body;
                        url = this.baseUrl() + "/" + path;
                        response = null;
                        console.info('Joplin API Call', method + ' ' + url, headers, options);
                        console.info(this.requestToCurl_(url, fetchOptions));
                        if (!(options.source == 'file' && (method == 'POST' || method == 'PUT'))) return [3 /*break*/, 1];
                        return [3 /*break*/, 5];
                    case 1:
                        if (!(options.target == 'string')) return [3 /*break*/, 3];
                        if (typeof body === 'string')
                            fetchOptions.headers['Content-Length'] = "" + shim.stringByteLength(body);
                        return [4 /*yield*/, shim.fetch(url, fetchOptions)];
                    case 2:
                        response = _a.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, shim.fetchBlob(url, fetchOptions)];
                    case 4:
                        // file
                        response = _a.sent();
                        _a.label = 5;
                    case 5: return [4 /*yield*/, response.text()];
                    case 6:
                        responseText = _a.sent();
                        console.info('Joplin API Response', responseText);
                        // // Creates an error object with as much data as possible as it will appear in the log, which will make debugging easier
                        // const newError = (message, code = 0) => {
                        // 	// Gives a shorter response for error messages. Useful for cases where a full HTML page is accidentally loaded instead of
                        // 	// JSON. That way the error message will still show there's a problem but without filling up the log or screen.
                        // 	const shortResponseText = (`${responseText}`).substr(0, 1024);
                        // 	return new JoplinError(`${method} ${path}: ${message} (${code}): ${shortResponseText}`, code);
                        // };
                        // let responseJson_ = null;
                        // const loadResponseJson = async () => {
                        // 	if (!responseText) return null;
                        // 	if (responseJson_) return responseJson_;
                        // 	// eslint-disable-next-line require-atomic-updates
                        // 	responseJson_ = await this.xmlToJson(responseText);
                        // 	if (!responseJson_) throw newError('Cannot parse XML response', response.status);
                        // 	return responseJson_;
                        // };
                        // if (!response.ok) {
                        // 	// When using fetchBlob we only get a string (not xml or json) back
                        // 	if (options.target === 'file') throw newError('fetchBlob error', response.status);
                        // 	let json = null;
                        // 	try {
                        // 		json = await loadResponseJson();
                        // 	} catch (error) {
                        // 		// Just send back the plain text in newErro()
                        // 	}
                        // 	if (json && json['d:error']) {
                        // 		const code = json['d:error']['s:exception'] ? json['d:error']['s:exception'].join(' ') : response.status;
                        // 		const message = json['d:error']['s:message'] ? json['d:error']['s:message'].join('\n') : 'Unknown error 1';
                        // 		throw newError(`${message} (Exception ${code})`, response.status);
                        // 	}
                        // 	throw newError('Unknown error 2', response.status);
                        // }
                        // if (options.responseFormat === 'text') return responseText;
                        // // The following methods may have a response depending on the server but it's not
                        // // standard (some return a plain string, other XML, etc.) and we don't check the
                        // // response anyway since we rely on the HTTP status code so return null.
                        // if (['MKCOL', 'DELETE', 'PUT', 'MOVE'].indexOf(method) >= 0) return null;
                        // const output = await loadResponseJson();
                        // this.handleNginxHack_(output, newError);
                        // // Check that we didn't get for example an HTML page (as an error) instead of the JSON response
                        // // null responses are possible, for example for DELETE calls
                        // if (output !== null && typeof output === 'object' && !('d:multistatus' in output)) throw newError('Not a valid WebDAV response');
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    return JoplinServerApi;
}());
exports.default = JoplinServerApi;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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ZSI6IkpvcGxpblNlcnZlckFwaS5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IHsgTG9nZ2VyIH0gPSByZXF1aXJlKCdsaWIvbG9nZ2VyLmpzJyk7XG5jb25zdCB7IHJ0cmltU2xhc2hlcyB9ID0gcmVxdWlyZSgnbGliL3BhdGgtdXRpbHMuanMnKTtcbmNvbnN0IHsgc2hpbSB9ID0gcmVxdWlyZSgnbGliL3NoaW0nKTtcblxuZXhwb3J0IGludGVyZmFjZSBKb3BsaW5TZXJ2ZXJBcGlPcHRpb24ge1xuXHRiYXNlVXJsOiBGdW5jdGlvblxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBKb3BsaW5TZXJ2ZXJBcGkge1xuXG5cdGxvZ2dlcl86YW55ID0gbnVsbDtcblx0b3B0aW9uc186YW55ID0gbnVsbDtcblx0c2Vzc2lvbklkXzpzdHJpbmcgPSBudWxsO1xuXG5cdGNvbnN0cnVjdG9yKG9wdGlvbnM6YW55KSB7XG5cdFx0dGhpcy5sb2dnZXJfID0gbmV3IExvZ2dlcigpO1xuXHRcdHRoaXMub3B0aW9uc18gPSBvcHRpb25zO1xuXHR9XG5cblx0c2V0TG9nZ2VyKGw6YW55KSB7XG5cdFx0dGhpcy5sb2dnZXJfID0gbDtcblx0fVxuXG5cdGxvZ2dlcigpIHtcblx0XHRyZXR1cm4gdGhpcy5sb2dnZXJfO1xuXHR9XG5cblx0YmFzZVVybCgpIHtcblx0XHRyZXR1cm4gcnRyaW1TbGFzaGVzKHRoaXMub3B0aW9uc18uYmFzZVVybCgpKTtcblx0fVxuXG5cdHNldFNlc3Npb25JZCh2OnN0cmluZykge1xuXHRcdHRoaXMuc2Vzc2lvbklkXyA9IHY7XG5cdH1cblxuXHRzZXNzaW9uSWQoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc2Vzc2lvbklkXztcblx0fVxuXG5cdHJlcXVlc3RUb0N1cmxfKHVybDpzdHJpbmcsIG9wdGlvbnM6YW55KSB7XG5cdFx0bGV0IG91dHB1dCA9IFtdO1xuXHRcdG91dHB1dC5wdXNoKCdjdXJsJyk7XG5cdFx0b3V0cHV0LnB1c2goJy12Jyk7XG5cdFx0aWYgKG9wdGlvbnMubWV0aG9kKSBvdXRwdXQucHVzaChgLVggJHtvcHRpb25zLm1ldGhvZH1gKTtcblx0XHRpZiAob3B0aW9ucy5oZWFkZXJzKSB7XG5cdFx0XHRmb3IgKGxldCBuIGluIG9wdGlvbnMuaGVhZGVycykge1xuXHRcdFx0XHRpZiAoIW9wdGlvbnMuaGVhZGVycy5oYXNPd25Qcm9wZXJ0eShuKSkgY29udGludWU7XG5cdFx0XHRcdG91dHB1dC5wdXNoKGAkeyctSCAnICsgJ1wiJ30ke259OiAke29wdGlvbnMuaGVhZGVyc1tuXX1cImApO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAob3B0aW9ucy5ib2R5KSBvdXRwdXQucHVzaChgJHsnLS1kYXRhICcgKyAnXFwnJ30ke29wdGlvbnMuYm9keX0nYCk7XG5cdFx0b3V0cHV0LnB1c2godXJsKTtcblxuXHRcdHJldHVybiBvdXRwdXQuam9pbignICcpO1xuXHR9XG5cblx0YXN5bmMgZXhlYyhtZXRob2Q6c3RyaW5nLCBwYXRoOnN0cmluZyA9ICcnLCBib2R5OmFueSA9IG51bGwsIGhlYWRlcnM6YW55ID0gbnVsbCwgb3B0aW9uczphbnkgPSBudWxsKTpQcm9taXNlPGFueT4ge1xuXHRcdGlmIChoZWFkZXJzID09PSBudWxsKSBoZWFkZXJzID0ge307XG5cdFx0aWYgKG9wdGlvbnMgPT09IG51bGwpIG9wdGlvbnMgPSB7fTtcblx0XHRpZiAoIW9wdGlvbnMucmVzcG9uc2VGb3JtYXQpIG9wdGlvbnMucmVzcG9uc2VGb3JtYXQgPSAnanNvbic7XG5cdFx0aWYgKCFvcHRpb25zLnRhcmdldCkgb3B0aW9ucy50YXJnZXQgPSAnc3RyaW5nJztcblxuXHRcdGlmICh0aGlzLnNlc3Npb25JZCgpKSBoZWFkZXJzWydYLUFQSS1BVVRIJ10gPSB0aGlzLnNlc3Npb25JZCgpO1xuXG5cdFx0Y29uc3QgZmV0Y2hPcHRpb25zOmFueSA9IHt9O1xuXHRcdGZldGNoT3B0aW9ucy5oZWFkZXJzID0gaGVhZGVycztcblx0XHRmZXRjaE9wdGlvbnMubWV0aG9kID0gbWV0aG9kO1xuXHRcdGlmIChvcHRpb25zLnBhdGgpIGZldGNoT3B0aW9ucy5wYXRoID0gb3B0aW9ucy5wYXRoO1xuXHRcdGlmIChib2R5KSBmZXRjaE9wdGlvbnMuYm9keSA9IGJvZHk7XG5cblx0XHRjb25zdCB1cmw6c3RyaW5nID0gYCR7dGhpcy5iYXNlVXJsKCl9LyR7cGF0aH1gO1x0XHRcblxuXHRcdGxldCByZXNwb25zZTphbnkgPSBudWxsO1xuXG5cdFx0Y29uc29sZS5pbmZvKCdKb3BsaW4gQVBJIENhbGwnLCBtZXRob2QgKyAnICcgKyB1cmwsIGhlYWRlcnMsIG9wdGlvbnMpO1xuXHRcdGNvbnNvbGUuaW5mbyh0aGlzLnJlcXVlc3RUb0N1cmxfKHVybCwgZmV0Y2hPcHRpb25zKSk7XG5cblx0XHRpZiAob3B0aW9ucy5zb3VyY2UgPT0gJ2ZpbGUnICYmIChtZXRob2QgPT0gJ1BPU1QnIHx8IG1ldGhvZCA9PSAnUFVUJykpIHtcblx0XHRcdC8vIGlmIChmZXRjaE9wdGlvbnMucGF0aCkge1xuXHRcdFx0Ly8gXHRjb25zdCBmaWxlU3RhdCA9IGF3YWl0IHNoaW0uZnNEcml2ZXIoKS5zdGF0KGZldGNoT3B0aW9ucy5wYXRoKTtcblx0XHRcdC8vIFx0aWYgKGZpbGVTdGF0KSBmZXRjaE9wdGlvbnMuaGVhZGVyc1snQ29udGVudC1MZW5ndGgnXSA9IGAke2ZpbGVTdGF0LnNpemV9YDtcblx0XHRcdC8vIH1cblx0XHRcdC8vIHJlc3BvbnNlID0gYXdhaXQgc2hpbS51cGxvYWRCbG9iKHVybCwgZmV0Y2hPcHRpb25zKTtcblx0XHR9IGVsc2UgaWYgKG9wdGlvbnMudGFyZ2V0ID09ICdzdHJpbmcnKSB7XG5cdFx0XHRpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSBmZXRjaE9wdGlvbnMuaGVhZGVyc1snQ29udGVudC1MZW5ndGgnXSA9IGAke3NoaW0uc3RyaW5nQnl0ZUxlbmd0aChib2R5KX1gO1xuXHRcdFx0cmVzcG9uc2UgPSBhd2FpdCBzaGltLmZldGNoKHVybCwgZmV0Y2hPcHRpb25zKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gZmlsZVxuXHRcdFx0cmVzcG9uc2UgPSBhd2FpdCBzaGltLmZldGNoQmxvYih1cmwsIGZldGNoT3B0aW9ucyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgcmVzcG9uc2VUZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuXG5cdFx0Y29uc29sZS5pbmZvKCdKb3BsaW4gQVBJIFJlc3BvbnNlJywgcmVzcG9uc2VUZXh0KTtcblxuXHRcdC8vIC8vIENyZWF0ZXMgYW4gZXJyb3Igb2JqZWN0IHdpdGggYXMgbXVjaCBkYXRhIGFzIHBvc3NpYmxlIGFzIGl0IHdpbGwgYXBwZWFyIGluIHRoZSBsb2csIHdoaWNoIHdpbGwgbWFrZSBkZWJ1Z2dpbmcgZWFzaWVyXG5cdFx0Ly8gY29uc3QgbmV3RXJyb3IgPSAobWVzc2FnZSwgY29kZSA9IDApID0+IHtcblx0XHQvLyBcdC8vIEdpdmVzIGEgc2hvcnRlciByZXNwb25zZSBmb3IgZXJyb3IgbWVzc2FnZXMuIFVzZWZ1bCBmb3IgY2FzZXMgd2hlcmUgYSBmdWxsIEhUTUwgcGFnZSBpcyBhY2NpZGVudGFsbHkgbG9hZGVkIGluc3RlYWQgb2Zcblx0XHQvLyBcdC8vIEpTT04uIFRoYXQgd2F5IHRoZSBlcnJvciBtZXNzYWdlIHdpbGwgc3RpbGwgc2hvdyB0aGVyZSdzIGEgcHJvYmxlbSBidXQgd2l0aG91dCBmaWxsaW5nIHVwIHRoZSBsb2cgb3Igc2NyZWVuLlxuXHRcdC8vIFx0Y29uc3Qgc2hvcnRSZXNwb25zZVRleHQgPSAoYCR7cmVzcG9uc2VUZXh0fWApLnN1YnN0cigwLCAxMDI0KTtcblx0XHQvLyBcdHJldHVybiBuZXcgSm9wbGluRXJyb3IoYCR7bWV0aG9kfSAke3BhdGh9OiAke21lc3NhZ2V9ICgke2NvZGV9KTogJHtzaG9ydFJlc3BvbnNlVGV4dH1gLCBjb2RlKTtcblx0XHQvLyB9O1xuXG5cdFx0Ly8gbGV0IHJlc3BvbnNlSnNvbl8gPSBudWxsO1xuXHRcdC8vIGNvbnN0IGxvYWRSZXNwb25zZUpzb24gPSBhc3luYyAoKSA9PiB7XG5cdFx0Ly8gXHRpZiAoIXJlc3BvbnNlVGV4dCkgcmV0dXJuIG51bGw7XG5cdFx0Ly8gXHRpZiAocmVzcG9uc2VKc29uXykgcmV0dXJuIHJlc3BvbnNlSnNvbl87XG5cdFx0Ly8gXHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVxdWlyZS1hdG9taWMtdXBkYXRlc1xuXHRcdC8vIFx0cmVzcG9uc2VKc29uXyA9IGF3YWl0IHRoaXMueG1sVG9Kc29uKHJlc3BvbnNlVGV4dCk7XG5cdFx0Ly8gXHRpZiAoIXJlc3BvbnNlSnNvbl8pIHRocm93IG5ld0Vycm9yKCdDYW5ub3QgcGFyc2UgWE1MIHJlc3BvbnNlJywgcmVzcG9uc2Uuc3RhdHVzKTtcblx0XHQvLyBcdHJldHVybiByZXNwb25zZUpzb25fO1xuXHRcdC8vIH07XG5cblx0XHQvLyBpZiAoIXJlc3BvbnNlLm9rKSB7XG5cdFx0Ly8gXHQvLyBXaGVuIHVzaW5nIGZldGNoQmxvYiB3ZSBvbmx5IGdldCBhIHN0cmluZyAobm90IHhtbCBvciBqc29uKSBiYWNrXG5cdFx0Ly8gXHRpZiAob3B0aW9ucy50YXJnZXQgPT09ICdmaWxlJykgdGhyb3cgbmV3RXJyb3IoJ2ZldGNoQmxvYiBlcnJvcicsIHJlc3BvbnNlLnN0YXR1cyk7XG5cblx0XHQvLyBcdGxldCBqc29uID0gbnVsbDtcblx0XHQvLyBcdHRyeSB7XG5cdFx0Ly8gXHRcdGpzb24gPSBhd2FpdCBsb2FkUmVzcG9uc2VKc29uKCk7XG5cdFx0Ly8gXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdC8vIFx0XHQvLyBKdXN0IHNlbmQgYmFjayB0aGUgcGxhaW4gdGV4dCBpbiBuZXdFcnJvKClcblx0XHQvLyBcdH1cblxuXHRcdC8vIFx0aWYgKGpzb24gJiYganNvblsnZDplcnJvciddKSB7XG5cdFx0Ly8gXHRcdGNvbnN0IGNvZGUgPSBqc29uWydkOmVycm9yJ11bJ3M6ZXhjZXB0aW9uJ10gPyBqc29uWydkOmVycm9yJ11bJ3M6ZXhjZXB0aW9uJ10uam9pbignICcpIDogcmVzcG9uc2Uuc3RhdHVzO1xuXHRcdC8vIFx0XHRjb25zdCBtZXNzYWdlID0ganNvblsnZDplcnJvciddWydzOm1lc3NhZ2UnXSA/IGpzb25bJ2Q6ZXJyb3InXVsnczptZXNzYWdlJ10uam9pbignXFxuJykgOiAnVW5rbm93biBlcnJvciAxJztcblx0XHQvLyBcdFx0dGhyb3cgbmV3RXJyb3IoYCR7bWVzc2FnZX0gKEV4Y2VwdGlvbiAke2NvZGV9KWAsIHJlc3BvbnNlLnN0YXR1cyk7XG5cdFx0Ly8gXHR9XG5cblx0XHQvLyBcdHRocm93IG5ld0Vycm9yKCdVbmtub3duIGVycm9yIDInLCByZXNwb25zZS5zdGF0dXMpO1xuXHRcdC8vIH1cblxuXHRcdC8vIGlmIChvcHRpb25zLnJlc3BvbnNlRm9ybWF0ID09PSAndGV4dCcpIHJldHVybiByZXNwb25zZVRleHQ7XG5cblx0XHQvLyAvLyBUaGUgZm9sbG93aW5nIG1ldGhvZHMgbWF5IGhhdmUgYSByZXNwb25zZSBkZXBlbmRpbmcgb24gdGhlIHNlcnZlciBidXQgaXQncyBub3Rcblx0XHQvLyAvLyBzdGFuZGFyZCAoc29tZSByZXR1cm4gYSBwbGFpbiBzdHJpbmcsIG90aGVyIFhNTCwgZXRjLikgYW5kIHdlIGRvbid0IGNoZWNrIHRoZVxuXHRcdC8vIC8vIHJlc3BvbnNlIGFueXdheSBzaW5jZSB3ZSByZWx5IG9uIHRoZSBIVFRQIHN0YXR1cyBjb2RlIHNvIHJldHVybiBudWxsLlxuXHRcdC8vIGlmIChbJ01LQ09MJywgJ0RFTEVURScsICdQVVQnLCAnTU9WRSddLmluZGV4T2YobWV0aG9kKSA+PSAwKSByZXR1cm4gbnVsbDtcblxuXHRcdC8vIGNvbnN0IG91dHB1dCA9IGF3YWl0IGxvYWRSZXNwb25zZUpzb24oKTtcblx0XHQvLyB0aGlzLmhhbmRsZU5naW54SGFja18ob3V0cHV0LCBuZXdFcnJvcik7XG5cblx0XHQvLyAvLyBDaGVjayB0aGF0IHdlIGRpZG4ndCBnZXQgZm9yIGV4YW1wbGUgYW4gSFRNTCBwYWdlIChhcyBhbiBlcnJvcikgaW5zdGVhZCBvZiB0aGUgSlNPTiByZXNwb25zZVxuXHRcdC8vIC8vIG51bGwgcmVzcG9uc2VzIGFyZSBwb3NzaWJsZSwgZm9yIGV4YW1wbGUgZm9yIERFTEVURSBjYWxsc1xuXHRcdC8vIGlmIChvdXRwdXQgIT09IG51bGwgJiYgdHlwZW9mIG91dHB1dCA9PT0gJ29iamVjdCcgJiYgISgnZDptdWx0aXN0YXR1cycgaW4gb3V0cHV0KSkgdGhyb3cgbmV3RXJyb3IoJ05vdCBhIHZhbGlkIFdlYkRBViByZXNwb25zZScpO1xuXG5cdFx0cmV0dXJuIHt9O1xuXHR9XG59XG4iXX0=
