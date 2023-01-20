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
const requestUtils_1 = require("../utils/requestUtils");
const config_1 = require("../config");
const errors_1 = require("../utils/errors");
const compareVersions = require('compare-versions');
function default_1(ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, requestUtils_1.isApiRequest)(ctx))
            return next();
        const appVersion = (0, config_1.default)().appVersion;
        const minVersion = ctx.headers['x-api-min-version'];
        // For now we don't require this header to be set to keep compatibility with
        // older clients.
        if (!minVersion)
            return next();
        const diff = compareVersions(appVersion, minVersion);
        // We only throw an error if the client requires a version of Joplin Server
        // that's ahead of what's installed. This is mostly to automatically notify
        // those who self-host so that they know they need to upgrade Joplin Server.
        if (diff < 0) {
            throw new errors_1.ErrorPreconditionFailed(`Joplin Server v${minVersion} is required but v${appVersion} is installed. Please upgrade Joplin Server.`);
        }
        return next();
    });
}
exports.default = default_1;
//# sourceMappingURL=apiVersionHandler.js.map