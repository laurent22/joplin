"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var errors_1 = require("../../utils/errors");
var FileController_1 = require("../../controllers/FileController");
var requestUtils_1 = require("../../utils/requestUtils");
var routeUtils_1 = require("../../utils/routeUtils");
var getRawBody = require("raw-body");
var route = {
    exec: function (path, ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var fileController, body, koaResponse, file, body;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fileController = new FileController_1.default();
                        if (!path.link) {
                            if (ctx.method === 'GET') {
                                return [2 /*return*/, fileController.getFile(requestUtils_1.sessionIdFromHeaders(ctx.headers), path.value)];
                            }
                            if (ctx.method === 'PUT') {
                                body = __assign({}, ctx.request.body);
                                body.id = path.value;
                                return [2 /*return*/, fileController.updateFile(requestUtils_1.sessionIdFromHeaders(ctx.headers), body)];
                            }
                            throw new errors_1.ErrorMethodNotAllowed();
                        }
                        if (!(path.link === 'content')) return [3 /*break*/, 5];
                        if (!(ctx.method === 'GET')) return [3 /*break*/, 2];
                        koaResponse = ctx.response;
                        return [4 /*yield*/, fileController.getFileContent(requestUtils_1.sessionIdFromHeaders(ctx.headers), path.value)];
                    case 1:
                        file = _a.sent();
                        koaResponse.body = file.content;
                        koaResponse.set('Content-Type', file.mime_type);
                        koaResponse.set('Content-Length', file.size.toString());
                        return [2 /*return*/, new routeUtils_1.ApiResponse(routeUtils_1.ApiResponseType.KoaResponse, koaResponse)];
                    case 2:
                        if (!(ctx.method === 'PUT')) return [3 /*break*/, 4];
                        return [4 /*yield*/, getRawBody(ctx.req)];
                    case 3:
                        body = _a.sent();
                        return [2 /*return*/, fileController.updateFileContent(requestUtils_1.sessionIdFromHeaders(ctx.headers), path, body)];
                    case 4: 
                    // if (ctx.method === 'POST') {
                    // 	const files = ctx.request.files;
                    // 	console.info(files);
                    // 	// if (!files || !files.data) throw new ErrorBadRequest('Missing "data" field');
                    // 	// const data = files.data;
                    // 	// const props:any = ctx.request.body.props;
                    // 	// const file:File = {
                    // 	// 	name: data.name,
                    // 	// 	content: await fs.readFile(data.path),
                    // 	// 	mime_type: data.type,
                    // 	// 	parent_id: props.parent_id ? props.parent_id : '',
                    // 	// };
                    // 	// return fileController.createFile(sessionIdFromHeaders(ctx.headers), file);
                    // }
                    // if (ctx.method === 'PUT') {
                    // 	const files = ctx.request.files;
                    // 	if (!files || !files.data) throw new ErrorBadRequest('Missing "data" field');
                    // 	const data = files.data;
                    // 	const content = await fs.readFile(data.path);
                    // 	return fileController.updateFileContent(sessionIdFromHeaders(ctx.headers), path.value, content);
                    // }
                    throw new errors_1.ErrorMethodNotAllowed();
                    case 5: throw new errors_1.ErrorNotFound("Invalid link: " + path.link);
                }
            });
        });
    },
};
exports.default = route;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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QUksc0JBQWEsQ0FBQyxtQkFBaUIsSUFBSSxDQUFDLElBQU0sQ0FBQyxDQUFDOzs7O0tBQ3REO0NBSUQsQ0FBQztBQUVGLGtCQUFlLEtBQUssQ0FBQyIsImZpbGUiOiJmaWxlcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIEtvYSBmcm9tICdrb2EnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHsgRXJyb3JCYWRSZXF1ZXN0LCBFcnJvck5vdEZvdW5kLCBFcnJvck1ldGhvZE5vdEFsbG93ZWQgfSBmcm9tICcuLi8uLi91dGlscy9lcnJvcnMnO1xuaW1wb3J0IHsgRmlsZSB9IGZyb20gJy4uLy4uL2RiJztcbmltcG9ydCBGaWxlQ29udHJvbGxlciBmcm9tICcuLi8uLi9jb250cm9sbGVycy9GaWxlQ29udHJvbGxlcic7XG5pbXBvcnQgeyBzZXNzaW9uSWRGcm9tSGVhZGVycyB9IGZyb20gJy4uLy4uL3V0aWxzL3JlcXVlc3RVdGlscyc7XG5pbXBvcnQgeyBTdWJQYXRoLCBSb3V0ZSwgQXBpUmVzcG9uc2VUeXBlLCBBcGlSZXNwb25zZSB9IGZyb20gJy4uLy4uL3V0aWxzL3JvdXRlVXRpbHMnO1xuaW1wb3J0ICogYXMgZ2V0UmF3Qm9keSBmcm9tICdyYXctYm9keSc7XG5cbmNvbnN0IHJvdXRlOlJvdXRlID0ge1xuXG5cdGV4ZWM6IGFzeW5jIGZ1bmN0aW9uKHBhdGg6U3ViUGF0aCwgY3R4OktvYS5Db250ZXh0KSB7XG5cdFx0Y29uc3QgZmlsZUNvbnRyb2xsZXIgPSBuZXcgRmlsZUNvbnRyb2xsZXIoKTtcblxuXHRcdGlmICghcGF0aC5saW5rKSB7XG5cdFx0XHRpZiAoY3R4Lm1ldGhvZCA9PT0gJ0dFVCcpIHtcblx0XHRcdFx0cmV0dXJuIGZpbGVDb250cm9sbGVyLmdldEZpbGUoc2Vzc2lvbklkRnJvbUhlYWRlcnMoY3R4LmhlYWRlcnMpLCBwYXRoLnZhbHVlKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGN0eC5tZXRob2QgPT09ICdQVVQnKSB7XG5cdFx0XHRcdGNvbnN0IGJvZHkgPSB7IC4uLmN0eC5yZXF1ZXN0LmJvZHkgfTtcblx0XHRcdFx0Ym9keS5pZCA9IHBhdGgudmFsdWU7XG5cdFx0XHRcdHJldHVybiBmaWxlQ29udHJvbGxlci51cGRhdGVGaWxlKHNlc3Npb25JZEZyb21IZWFkZXJzKGN0eC5oZWFkZXJzKSwgYm9keSk7XG5cdFx0XHR9XG5cblx0XHRcdHRocm93IG5ldyBFcnJvck1ldGhvZE5vdEFsbG93ZWQoKTtcblx0XHR9XG5cblx0XHRpZiAocGF0aC5saW5rID09PSAnY29udGVudCcpIHtcblx0XHRcdGlmIChjdHgubWV0aG9kID09PSAnR0VUJykge1xuXHRcdFx0XHRjb25zdCBrb2FSZXNwb25zZSA9IGN0eC5yZXNwb25zZTtcblx0XHRcdFx0Y29uc3QgZmlsZTpGaWxlID0gYXdhaXQgZmlsZUNvbnRyb2xsZXIuZ2V0RmlsZUNvbnRlbnQoc2Vzc2lvbklkRnJvbUhlYWRlcnMoY3R4LmhlYWRlcnMpLCBwYXRoLnZhbHVlKTtcblx0XHRcdFx0a29hUmVzcG9uc2UuYm9keSA9IGZpbGUuY29udGVudDtcblx0XHRcdFx0a29hUmVzcG9uc2Uuc2V0KCdDb250ZW50LVR5cGUnLCBmaWxlLm1pbWVfdHlwZSk7XG5cdFx0XHRcdGtvYVJlc3BvbnNlLnNldCgnQ29udGVudC1MZW5ndGgnLCBmaWxlLnNpemUudG9TdHJpbmcoKSk7XG5cdFx0XHRcdHJldHVybiBuZXcgQXBpUmVzcG9uc2UoQXBpUmVzcG9uc2VUeXBlLktvYVJlc3BvbnNlLCBrb2FSZXNwb25zZSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChjdHgubWV0aG9kID09PSAnUFVUJykge1xuXHRcdFx0XHRjb25zdCBib2R5ID0gYXdhaXQgZ2V0UmF3Qm9keShjdHgucmVxKVxuXHRcdFx0XHRyZXR1cm4gZmlsZUNvbnRyb2xsZXIudXBkYXRlRmlsZUNvbnRlbnQoc2Vzc2lvbklkRnJvbUhlYWRlcnMoY3R4LmhlYWRlcnMpLCBwYXRoLCBib2R5KTtcblx0XHRcdFx0Ly8gY29uc3QgZmlsZXMgPSBjdHgucmVxdWVzdC5maWxlcztcblx0XHRcdFx0Ly9jb25zb2xlLmluZm8oY3R4LnJlcXVlc3QuZmlsZXMpO1xuXHRcdFx0XHQvLyBpZiAoIWZpbGVzIHx8ICFmaWxlcy5kYXRhKSB0aHJvdyBuZXcgRXJyb3JCYWRSZXF1ZXN0KCdNaXNzaW5nIFwiZGF0YVwiIGZpZWxkJyk7XG5cdFx0XHRcdC8vIGNvbnN0IGRhdGEgPSBmaWxlcy5kYXRhO1xuXHRcdFx0XHQvLyBjb25zdCBjb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUoZGF0YS5wYXRoKTtcblx0XHRcdFx0Ly8gcmV0dXJuIGZpbGVDb250cm9sbGVyLnVwZGF0ZUZpbGVDb250ZW50KHNlc3Npb25JZEZyb21IZWFkZXJzKGN0eC5oZWFkZXJzKSwgcGF0aC52YWx1ZSwgY29udGVudCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGlmIChjdHgubWV0aG9kID09PSAnUE9TVCcpIHtcblx0XHRcdC8vIFx0Y29uc3QgZmlsZXMgPSBjdHgucmVxdWVzdC5maWxlcztcblx0XHRcdC8vIFx0Y29uc29sZS5pbmZvKGZpbGVzKTtcblx0XHRcdC8vIFx0Ly8gaWYgKCFmaWxlcyB8fCAhZmlsZXMuZGF0YSkgdGhyb3cgbmV3IEVycm9yQmFkUmVxdWVzdCgnTWlzc2luZyBcImRhdGFcIiBmaWVsZCcpO1xuXHRcdFx0Ly8gXHQvLyBjb25zdCBkYXRhID0gZmlsZXMuZGF0YTtcblx0XHRcdC8vIFx0Ly8gY29uc3QgcHJvcHM6YW55ID0gY3R4LnJlcXVlc3QuYm9keS5wcm9wcztcblxuXHRcdFx0Ly8gXHQvLyBjb25zdCBmaWxlOkZpbGUgPSB7XG5cdFx0XHQvLyBcdC8vIFx0bmFtZTogZGF0YS5uYW1lLFxuXHRcdFx0Ly8gXHQvLyBcdGNvbnRlbnQ6IGF3YWl0IGZzLnJlYWRGaWxlKGRhdGEucGF0aCksXG5cdFx0XHQvLyBcdC8vIFx0bWltZV90eXBlOiBkYXRhLnR5cGUsXG5cdFx0XHQvLyBcdC8vIFx0cGFyZW50X2lkOiBwcm9wcy5wYXJlbnRfaWQgPyBwcm9wcy5wYXJlbnRfaWQgOiAnJyxcblx0XHRcdC8vIFx0Ly8gfTtcblxuXHRcdFx0Ly8gXHQvLyByZXR1cm4gZmlsZUNvbnRyb2xsZXIuY3JlYXRlRmlsZShzZXNzaW9uSWRGcm9tSGVhZGVycyhjdHguaGVhZGVycyksIGZpbGUpO1xuXHRcdFx0Ly8gfVxuXG5cdFx0XHQvLyBpZiAoY3R4Lm1ldGhvZCA9PT0gJ1BVVCcpIHtcblx0XHRcdC8vIFx0Y29uc3QgZmlsZXMgPSBjdHgucmVxdWVzdC5maWxlcztcblx0XHRcdC8vIFx0aWYgKCFmaWxlcyB8fCAhZmlsZXMuZGF0YSkgdGhyb3cgbmV3IEVycm9yQmFkUmVxdWVzdCgnTWlzc2luZyBcImRhdGFcIiBmaWVsZCcpO1xuXHRcdFx0Ly8gXHRjb25zdCBkYXRhID0gZmlsZXMuZGF0YTtcblx0XHRcdC8vIFx0Y29uc3QgY29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKGRhdGEucGF0aCk7XG5cdFx0XHQvLyBcdHJldHVybiBmaWxlQ29udHJvbGxlci51cGRhdGVGaWxlQ29udGVudChzZXNzaW9uSWRGcm9tSGVhZGVycyhjdHguaGVhZGVycyksIHBhdGgudmFsdWUsIGNvbnRlbnQpO1xuXHRcdFx0Ly8gfVxuXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3JNZXRob2ROb3RBbGxvd2VkKCk7XG5cdFx0fVxuXG5cdFx0dGhyb3cgbmV3IEVycm9yTm90Rm91bmQoYEludmFsaWQgbGluazogJHtwYXRoLmxpbmt9YCk7XG5cdH0sXG5cblx0Ly8gbmVlZHNCb2R5TWlkZGxld2FyZTogdHJ1ZSxcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgcm91dGU7XG4iXX0=
