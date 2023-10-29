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
Object.defineProperty(exports, "__esModule", { value: true });
const routeUtils_1 = require("../utils/routeUtils");
const Router_1 = require("../utils/Router");
const errors_1 = require("../utils/errors");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const fs = require("fs-extra");
const types_1 = require("../utils/types");
const joplinUtils_1 = require("../utils/joplinUtils");
const urlUtils_1 = require("../utils/urlUtils");
const { mime } = require('@joplin/lib/mime-utils.js');
const publicDir = `${(0, path_1.dirname)((0, path_1.dirname)(__dirname))}/public`;
// Most static assets should be in /public, but for those that are not, for
// example if they are in node_modules, use the map below.
const pathToFileMap = {
    'css/bulma.min.css': 'node_modules/bulma/css/bulma.min.css',
    'css/bulma-prefers-dark.min.css': 'node_modules/bulma-prefers-dark/css/bulma-prefers-dark.min.css',
    'css/fontawesome/css/all.min.css': 'node_modules/@fortawesome/fontawesome-free/css/all.min.css',
    'js/zxcvbn.js': 'node_modules/zxcvbn/dist/zxcvbn.js',
    'js/zxcvbn.js.map': 'node_modules/zxcvbn/dist/zxcvbn.js.map',
    'js/jquery.min.js': 'node_modules/jquery/dist/jquery.min.js',
    'js/jquery.min.map': 'node_modules/jquery/dist/jquery.min.map',
    // Hard-coded for now but it could be made dynamic later on
    // 'apps/joplin/css/note.css': 'src/apps/joplin/css/note.css',
};
function findLocalFile(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const appFilePath = yield (0, joplinUtils_1.localFileFromUrl)(path);
        if (appFilePath)
            return appFilePath;
        if (path in pathToFileMap)
            return pathToFileMap[path];
        // For now a bit of a hack to load FontAwesome fonts.
        if (path.indexOf('css/fontawesome/webfonts/fa-') === 0)
            return `node_modules/@fortawesome/fontawesome-free/${path.substr(16)}`;
        let localPath = (0, path_1.normalize)(path);
        if (localPath.indexOf('..') >= 0)
            throw new errors_1.ErrorNotFound(`Cannot resolve path: ${path}`);
        localPath = `${publicDir}/${localPath}`;
        if (!(yield (0, fs_extra_1.pathExists)(localPath)))
            throw new errors_1.ErrorNotFound(`Path not found: ${path}`);
        const stat = yield fs.stat(localPath);
        if (stat.isDirectory())
            throw new errors_1.ErrorForbidden(`Directory listing not allowed: ${path}`);
        return localPath;
    });
}
const router = new Router_1.default(types_1.RouteType.Web);
router.public = true;
// Used to serve static files, so it needs to be public because for example the
// login page, which is public, needs access to the CSS files.
router.get('', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    // Redirect to either /login or /home when trying to access the root
    if (!path.id && !path.link) {
        if (ctx.joplin.owner) {
            return (0, routeUtils_1.redirect)(ctx, (0, urlUtils_1.homeUrl)());
        }
        else {
            return (0, routeUtils_1.redirect)(ctx, (0, urlUtils_1.loginUrl)());
        }
    }
    const localPath = yield findLocalFile(path.raw);
    let mimeType = mime.fromFilename(localPath);
    if (!mimeType)
        mimeType = 'application/octet-stream';
    const fileContent = yield fs.readFile(localPath);
    const koaResponse = ctx.response;
    koaResponse.body = fileContent;
    koaResponse.set('Content-Type', mimeType);
    koaResponse.set('Content-Length', fileContent.length.toString());
    return new routeUtils_1.Response(routeUtils_1.ResponseType.KoaResponse, koaResponse);
}));
exports.default = router;
//# sourceMappingURL=default.js.map