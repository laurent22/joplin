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
var fs = require("fs-extra");
var stringify = require('query-string').stringify;
var execCommand = function (command, returnStdErr) {
    if (returnStdErr === void 0) { returnStdErr = false; }
    var exec = require('child_process').exec;
    return new Promise(function (resolve, reject) {
        exec(command, function (error, stdout, stderr) {
            if (error) {
                if (error.signal == 'SIGTERM') {
                    resolve('Process was killed');
                }
                else {
                    reject(error);
                }
            }
            else {
                var output = [];
                if (stdout.trim())
                    output.push(stdout.trim());
                if (returnStdErr && stderr.trim())
                    output.push(stderr.trim());
                resolve(output.join('\n\n'));
            }
        });
    });
};
function sleep(seconds) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve();
                    }, seconds * 1000);
                })];
        });
    });
}
function curl(method, path, query, body, headers, formFields, options) {
    if (query === void 0) { query = null; }
    if (body === void 0) { body = null; }
    if (headers === void 0) { headers = null; }
    if (formFields === void 0) { formFields = null; }
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var curlCmd, _i, formFields_1, f, k, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    curlCmd = ['curl'];
                    if (options.verbose)
                        curlCmd.push('-v');
                    if (options.output)
                        curlCmd.push("--output \"" + options.output + "\"");
                    if ((['PUT', 'DELETE'].indexOf(method) >= 0) || (method == 'POST' && !formFields && !body)) {
                        curlCmd.push('-X');
                        curlCmd.push(method);
                    }
                    if (typeof body === 'object' && body) {
                        curlCmd.push('--data');
                        curlCmd.push("'" + JSON.stringify(body) + "'");
                    }
                    if (formFields) {
                        for (_i = 0, formFields_1 = formFields; _i < formFields_1.length; _i++) {
                            f = formFields_1[_i];
                            curlCmd.push('-F');
                            curlCmd.push("'" + f + "'");
                        }
                    }
                    if (options.uploadFile) {
                        curlCmd.push('--data-binary');
                        curlCmd.push('@' + options.uploadFile);
                    }
                    if (!headers && body)
                        headers = {};
                    if (body)
                        headers['Content-Type'] = 'application/json';
                    if (headers) {
                        for (k in headers) {
                            curlCmd.push('--header');
                            curlCmd.push("\"" + k + ": " + headers[k] + "\"");
                        }
                    }
                    curlCmd.push("http://localhost:3222/" + path + (query ? "?" + stringify(query) : ''));
                    console.info("Running " + curlCmd.join(' '));
                    return [4 /*yield*/, execCommand(curlCmd.join(' '), !!options.verbose)];
                case 1:
                    result = _a.sent();
                    if (options.verbose)
                        return [2 /*return*/, result];
                    return [2 /*return*/, result ? JSON.parse(result) : null];
            }
        });
    });
}
var spawn = require('child_process').spawn;
var serverProcess = null;
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var serverRoot, tempDir, pidFilePath, compileCommmand, startServerCommand, response, error_1, session;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    serverRoot = __dirname + "/../..";
                    tempDir = serverRoot + "/tests/temp";
                    process.chdir(serverRoot);
                    return [4 /*yield*/, fs.remove(tempDir)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, fs.mkdirp(tempDir)];
                case 2:
                    _a.sent();
                    pidFilePath = serverRoot + "/test.pid";
                    fs.removeSync(serverRoot + "/db-testing.sqlite");
                    compileCommmand = 'npm run compile';
                    startServerCommand = 'NODE_ENV=testing npm run db-migrate';
                    return [4 /*yield*/, execCommand(compileCommmand)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, execCommand(startServerCommand)];
                case 4:
                    _a.sent();
                    serverProcess = spawn('node', ['dist/app/app.js', '--pidfile', pidFilePath], {
                        detached: true,
                        stdio: 'inherit',
                        env: Object.assign({}, process.env, { NODE_ENV: 'testing' }),
                    });
                    response = null;
                    console.info('Waiting for server to be ready...');
                    _a.label = 5;
                case 5:
                    if (!true) return [3 /*break*/, 11];
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 8, , 10]);
                    return [4 /*yield*/, curl('GET', 'api/ping')];
                case 7:
                    response = _a.sent();
                    console.info("Got ping response: " + JSON.stringify(response));
                    return [3 /*break*/, 11];
                case 8:
                    error_1 = _a.sent();
                    return [4 /*yield*/, sleep(0.5)];
                case 9:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 10: return [3 /*break*/, 5];
                case 11:
                    console.info('Server is ready');
                    return [4 /*yield*/, curl('POST', 'api/sessions', null, { email: 'admin@localhost', password: 'admin' })];
                case 12:
                    session = _a.sent();
                    console.info('Session: ', session);
                    return [4 /*yield*/, curl('PUT', 'api/files/root:/photo.jpg:/content', null, null, { 'X-API-AUTH': session.id }, null, {
                            uploadFile: serverRoot + "/tests/support/photo.jpg",
                        })];
                case 13:
                    // response = await curl('PUT', 'api/files/root:/photo.jpg:/content', null, null, { 'X-API-AUTH': session.id }, [
                    // 	`data=@${serverRoot}/tests/support/photo.jpg`,
                    // ]);
                    response = _a.sent();
                    console.info('Response:', response);
                    // let file = await curl('GET', `api/files/${response.id}`, null, null, { 'X-API-AUTH': session.id });
                    // console.info('Response:', file);
                    // await curl('PUT', `api/files/${response.id}`, null, {
                    // 	name: 'changed-name.jpg',
                    // }, { 'X-API-AUTH': session.id });
                    // file = await curl('GET', `api/files/${file.id}`, null, null, { 'X-API-AUTH': session.id });
                    // console.info('Response:', file);
                    // // await curl('PUT', `api/files/${response.id}/content`, null, null, { 'X-API-AUTH': session.id }, [
                    // // 	`data=@${serverRoot}/tests/support/poster.png`,
                    // // ]);
                    // response = await curl('GET', `api/files/${response.id}/content`, null, null, { 'X-API-AUTH': session.id }, null, { verbose: true, output: `${serverRoot}/tests/temp/photo-downloaded.jpg` });
                    // console.info('Response:', response);
                    console.info("To run this server again: " + compileCommmand + " && " + startServerCommand);
                    serverProcess.kill();
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error('FATAL ERROR', error);
    if (serverProcess)
        serverProcess.kill();
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,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bEQsTUFBTTtvQkFFTixRQUFRLEdBQUcsU0FFVCxDQUFDO29CQUVILE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUVwQyxzR0FBc0c7b0JBRXRHLG1DQUFtQztvQkFFbkMsd0RBQXdEO29CQUN4RCw2QkFBNkI7b0JBQzdCLG9DQUFvQztvQkFFcEMsOEZBQThGO29CQUU5RixtQ0FBbUM7b0JBRW5DLHVHQUF1RztvQkFDdkcsc0RBQXNEO29CQUN0RCxTQUFTO29CQUVULGdNQUFnTTtvQkFFaE0sdUNBQXVDO29CQUV2QyxPQUFPLENBQUMsSUFBSSxDQUFDLCtCQUE2QixlQUFlLFlBQU8sa0JBQW9CLENBQUMsQ0FBQztvQkFFdEYsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDOzs7OztDQUNyQjtBQUVELElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFBLEtBQUs7SUFDakIsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDcEMsSUFBSSxhQUFhO1FBQUUsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6InRlc3RSb3V0ZXJzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuXG5jb25zdCB7IHN0cmluZ2lmeSB9ID0gcmVxdWlyZSgncXVlcnktc3RyaW5nJyk7XG5cbmNvbnN0IGV4ZWNDb21tYW5kID0gZnVuY3Rpb24oY29tbWFuZDpzdHJpbmcsIHJldHVyblN0ZEVycjpib29sZWFuID0gZmFsc2UpOlByb21pc2U8c3RyaW5nPiB7XG5cdGNvbnN0IGV4ZWMgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuZXhlYztcblxuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdGV4ZWMoY29tbWFuZCwgKGVycm9yOmFueSwgc3Rkb3V0OmFueSwgc3RkZXJyOmFueSkgPT4ge1xuXHRcdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRcdGlmIChlcnJvci5zaWduYWwgPT0gJ1NJR1RFUk0nKSB7XG5cdFx0XHRcdFx0cmVzb2x2ZSgnUHJvY2VzcyB3YXMga2lsbGVkJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVqZWN0KGVycm9yKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc3Qgb3V0cHV0ID0gW107XG5cdFx0XHRcdGlmIChzdGRvdXQudHJpbSgpKSBvdXRwdXQucHVzaChzdGRvdXQudHJpbSgpKTtcblx0XHRcdFx0aWYgKHJldHVyblN0ZEVyciAmJiBzdGRlcnIudHJpbSgpKSBvdXRwdXQucHVzaChzdGRlcnIudHJpbSgpKTtcblx0XHRcdFx0cmVzb2x2ZShvdXRwdXQuam9pbignXFxuXFxuJykpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcbn07XG5cbmFzeW5jIGZ1bmN0aW9uIHNsZWVwKHNlY29uZHM6bnVtYmVyKSB7XG5cdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZTpGdW5jdGlvbikgPT4ge1xuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH0sIHNlY29uZHMgKiAxMDAwKTtcblx0fSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGN1cmwobWV0aG9kOnN0cmluZywgcGF0aDpzdHJpbmcsIHF1ZXJ5Om9iamVjdCA9IG51bGwsIGJvZHk6YW55ID0gbnVsbCwgaGVhZGVyczphbnkgPSBudWxsLCBmb3JtRmllbGRzOnN0cmluZ1tdID0gbnVsbCwgb3B0aW9uczphbnkgPSB7fSk6UHJvbWlzZTxhbnk+IHtcblx0Y29uc3QgY3VybENtZDpzdHJpbmdbXSA9IFsnY3VybCddO1xuXG5cdGlmIChvcHRpb25zLnZlcmJvc2UpIGN1cmxDbWQucHVzaCgnLXYnKTtcblx0aWYgKG9wdGlvbnMub3V0cHV0KSBjdXJsQ21kLnB1c2goYC0tb3V0cHV0IFwiJHtvcHRpb25zLm91dHB1dH1cImApO1xuXG5cdGlmICgoWydQVVQnLCAnREVMRVRFJ10uaW5kZXhPZihtZXRob2QpID49IDApIHx8IChtZXRob2QgPT0gJ1BPU1QnICYmICFmb3JtRmllbGRzICYmICFib2R5KSkge1xuXHRcdGN1cmxDbWQucHVzaCgnLVgnKTtcblx0XHRjdXJsQ21kLnB1c2gobWV0aG9kKTtcblx0fVxuXG5cdGlmICh0eXBlb2YgYm9keSA9PT0gJ29iamVjdCcgJiYgYm9keSkge1xuXHRcdGN1cmxDbWQucHVzaCgnLS1kYXRhJyk7XG5cdFx0Y3VybENtZC5wdXNoKGAnJHtKU09OLnN0cmluZ2lmeShib2R5KX0nYCk7XG5cdH1cblxuXHRpZiAoZm9ybUZpZWxkcykge1xuXHRcdGZvciAoY29uc3QgZiBvZiBmb3JtRmllbGRzKSB7XG5cdFx0XHRjdXJsQ21kLnB1c2goJy1GJyk7XG5cdFx0XHRjdXJsQ21kLnB1c2goYCcke2Z9J2ApO1xuXHRcdH1cblx0fVxuXG5cdGlmIChvcHRpb25zLnVwbG9hZEZpbGUpIHtcblx0XHRjdXJsQ21kLnB1c2goJy0tZGF0YS1iaW5hcnknKTtcblx0XHRjdXJsQ21kLnB1c2goJ0AnICsgb3B0aW9ucy51cGxvYWRGaWxlKTtcblx0fVxuXG5cdGlmICghaGVhZGVycyAmJiBib2R5KSBoZWFkZXJzID0ge307XG5cblx0aWYgKGJvZHkpIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuXG5cdGlmIChoZWFkZXJzKSB7XG5cdFx0Zm9yIChjb25zdCBrIGluIGhlYWRlcnMpIHtcblx0XHRcdGN1cmxDbWQucHVzaCgnLS1oZWFkZXInKTtcblx0XHRcdGN1cmxDbWQucHVzaChgXCIke2t9OiAke2hlYWRlcnNba119XCJgKTtcblx0XHR9XG5cdH1cblxuXHRjdXJsQ21kLnB1c2goYGh0dHA6Ly9sb2NhbGhvc3Q6MzIyMi8ke3BhdGh9JHtxdWVyeSA/IGA/JHtzdHJpbmdpZnkocXVlcnkpfWAgOiAnJ31gKTtcblxuXHRjb25zb2xlLmluZm8oYFJ1bm5pbmcgJHtjdXJsQ21kLmpvaW4oJyAnKX1gKTtcblxuXHRjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjQ29tbWFuZChjdXJsQ21kLmpvaW4oJyAnKSwgISFvcHRpb25zLnZlcmJvc2UpO1xuXHRpZiAob3B0aW9ucy52ZXJib3NlKSByZXR1cm4gcmVzdWx0O1xuXHRyZXR1cm4gcmVzdWx0ID8gSlNPTi5wYXJzZShyZXN1bHQpIDogbnVsbDtcbn1cblxuY29uc3Qgc3Bhd24gPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuc3Bhd247XG5cbmxldCBzZXJ2ZXJQcm9jZXNzOmFueSA9IG51bGw7XG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG5cdGNvbnN0IHNlcnZlclJvb3QgPSBgJHtfX2Rpcm5hbWV9Ly4uLy4uYDtcblx0Y29uc3QgdGVtcERpciA9IGAke3NlcnZlclJvb3R9L3Rlc3RzL3RlbXBgO1xuXHRwcm9jZXNzLmNoZGlyKHNlcnZlclJvb3QpO1xuXHRhd2FpdCBmcy5yZW1vdmUodGVtcERpcik7XG5cdGF3YWl0IGZzLm1rZGlycCh0ZW1wRGlyKTtcblx0Y29uc3QgcGlkRmlsZVBhdGggPSBgJHtzZXJ2ZXJSb290fS90ZXN0LnBpZGA7XG5cblx0ZnMucmVtb3ZlU3luYyhgJHtzZXJ2ZXJSb290fS9kYi10ZXN0aW5nLnNxbGl0ZWApO1xuXG5cdGNvbnN0IGNvbXBpbGVDb21tbWFuZCA9ICducG0gcnVuIGNvbXBpbGUnO1xuXHRjb25zdCBzdGFydFNlcnZlckNvbW1hbmQgPSAnTk9ERV9FTlY9dGVzdGluZyBucG0gcnVuIGRiLW1pZ3JhdGUnO1xuXG5cdGF3YWl0IGV4ZWNDb21tYW5kKGNvbXBpbGVDb21tbWFuZCk7XG5cdGF3YWl0IGV4ZWNDb21tYW5kKHN0YXJ0U2VydmVyQ29tbWFuZCk7XG5cblx0c2VydmVyUHJvY2VzcyA9IHNwYXduKCdub2RlJywgWydkaXN0L2FwcC9hcHAuanMnLCAnLS1waWRmaWxlJywgcGlkRmlsZVBhdGhdLCB7XG5cdFx0ZGV0YWNoZWQ6IHRydWUsXG5cdFx0c3RkaW86ICdpbmhlcml0Jyxcblx0XHRlbnY6IE9iamVjdC5hc3NpZ24oe30sIHByb2Nlc3MuZW52LCB7IE5PREVfRU5WOiAndGVzdGluZycgfSksXG5cdH0pO1xuXG5cdGxldCByZXNwb25zZTphbnkgPSBudWxsO1xuXG5cdGNvbnNvbGUuaW5mbygnV2FpdGluZyBmb3Igc2VydmVyIHRvIGJlIHJlYWR5Li4uJyk7XG5cblx0d2hpbGUgKHRydWUpIHtcblx0XHR0cnkge1xuXHRcdFx0cmVzcG9uc2UgPSBhd2FpdCBjdXJsKCdHRVQnLCAnYXBpL3BpbmcnKTtcblx0XHRcdGNvbnNvbGUuaW5mbyhgR290IHBpbmcgcmVzcG9uc2U6ICR7SlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpfWApO1xuXHRcdFx0YnJlYWs7XG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdGF3YWl0IHNsZWVwKDAuNSk7XG5cdFx0fVxuXHR9XG5cblx0Y29uc29sZS5pbmZvKCdTZXJ2ZXIgaXMgcmVhZHknKTtcblxuXHRjb25zdCBzZXNzaW9uID0gYXdhaXQgY3VybCgnUE9TVCcsICdhcGkvc2Vzc2lvbnMnLCBudWxsLCB7IGVtYWlsOiAnYWRtaW5AbG9jYWxob3N0JywgcGFzc3dvcmQ6ICdhZG1pbicgfSk7XG5cblx0Y29uc29sZS5pbmZvKCdTZXNzaW9uOiAnLCBzZXNzaW9uKTtcblxuXHQvLyByZXNwb25zZSA9IGF3YWl0IGN1cmwoJ1BVVCcsICdhcGkvZmlsZXMvcm9vdDovcGhvdG8uanBnOi9jb250ZW50JywgbnVsbCwgbnVsbCwgeyAnWC1BUEktQVVUSCc6IHNlc3Npb24uaWQgfSwgW1xuXHQvLyBcdGBkYXRhPUAke3NlcnZlclJvb3R9L3Rlc3RzL3N1cHBvcnQvcGhvdG8uanBnYCxcblx0Ly8gXSk7XG5cblx0cmVzcG9uc2UgPSBhd2FpdCBjdXJsKCdQVVQnLCAnYXBpL2ZpbGVzL3Jvb3Q6L3Bob3RvLmpwZzovY29udGVudCcsIG51bGwsIG51bGwsIHsgJ1gtQVBJLUFVVEgnOiBzZXNzaW9uLmlkIH0sIG51bGwsIHtcblx0XHR1cGxvYWRGaWxlOiBgJHtzZXJ2ZXJSb290fS90ZXN0cy9zdXBwb3J0L3Bob3RvLmpwZ2AsXG5cdH0pO1xuXG5cdGNvbnNvbGUuaW5mbygnUmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuXG5cdC8vIGxldCBmaWxlID0gYXdhaXQgY3VybCgnR0VUJywgYGFwaS9maWxlcy8ke3Jlc3BvbnNlLmlkfWAsIG51bGwsIG51bGwsIHsgJ1gtQVBJLUFVVEgnOiBzZXNzaW9uLmlkIH0pO1xuXG5cdC8vIGNvbnNvbGUuaW5mbygnUmVzcG9uc2U6JywgZmlsZSk7XG5cblx0Ly8gYXdhaXQgY3VybCgnUFVUJywgYGFwaS9maWxlcy8ke3Jlc3BvbnNlLmlkfWAsIG51bGwsIHtcblx0Ly8gXHRuYW1lOiAnY2hhbmdlZC1uYW1lLmpwZycsXG5cdC8vIH0sIHsgJ1gtQVBJLUFVVEgnOiBzZXNzaW9uLmlkIH0pO1xuXG5cdC8vIGZpbGUgPSBhd2FpdCBjdXJsKCdHRVQnLCBgYXBpL2ZpbGVzLyR7ZmlsZS5pZH1gLCBudWxsLCBudWxsLCB7ICdYLUFQSS1BVVRIJzogc2Vzc2lvbi5pZCB9KTtcblxuXHQvLyBjb25zb2xlLmluZm8oJ1Jlc3BvbnNlOicsIGZpbGUpO1xuXG5cdC8vIC8vIGF3YWl0IGN1cmwoJ1BVVCcsIGBhcGkvZmlsZXMvJHtyZXNwb25zZS5pZH0vY29udGVudGAsIG51bGwsIG51bGwsIHsgJ1gtQVBJLUFVVEgnOiBzZXNzaW9uLmlkIH0sIFtcblx0Ly8gLy8gXHRgZGF0YT1AJHtzZXJ2ZXJSb290fS90ZXN0cy9zdXBwb3J0L3Bvc3Rlci5wbmdgLFxuXHQvLyAvLyBdKTtcblxuXHQvLyByZXNwb25zZSA9IGF3YWl0IGN1cmwoJ0dFVCcsIGBhcGkvZmlsZXMvJHtyZXNwb25zZS5pZH0vY29udGVudGAsIG51bGwsIG51bGwsIHsgJ1gtQVBJLUFVVEgnOiBzZXNzaW9uLmlkIH0sIG51bGwsIHsgdmVyYm9zZTogdHJ1ZSwgb3V0cHV0OiBgJHtzZXJ2ZXJSb290fS90ZXN0cy90ZW1wL3Bob3RvLWRvd25sb2FkZWQuanBnYCB9KTtcblxuXHQvLyBjb25zb2xlLmluZm8oJ1Jlc3BvbnNlOicsIHJlc3BvbnNlKTtcblxuXHRjb25zb2xlLmluZm8oYFRvIHJ1biB0aGlzIHNlcnZlciBhZ2FpbjogJHtjb21waWxlQ29tbW1hbmR9ICYmICR7c3RhcnRTZXJ2ZXJDb21tYW5kfWApO1xuXG5cdHNlcnZlclByb2Nlc3Mua2lsbCgpO1xufVxuXG5tYWluKCkuY2F0Y2goZXJyb3IgPT4ge1xuXHRjb25zb2xlLmVycm9yKCdGQVRBTCBFUlJPUicsIGVycm9yKTtcblx0aWYgKHNlcnZlclByb2Nlc3MpIHNlcnZlclByb2Nlc3Mua2lsbCgpO1xufSk7XG4iXX0=
