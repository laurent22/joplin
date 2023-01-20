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
const config_1 = require("../config");
const factory_1 = require("../models/factory");
const types_1 = require("./types");
const routes_1 = require("../routes/routes");
const ShareService_1 = require("../services/ShareService");
const EmailService_1 = require("../services/EmailService");
const MustacheService_1 = require("../services/MustacheService");
const setupTaskService_1 = require("./setupTaskService");
const UserDeletionService_1 = require("../services/UserDeletionService");
function setupServices(env, models, config) {
    return __awaiter(this, void 0, void 0, function* () {
        const output = {
            share: new ShareService_1.default(env, models, config),
            email: new EmailService_1.default(env, models, config),
            mustache: new MustacheService_1.default(config.viewDir, config.baseUrl),
            userDeletion: new UserDeletionService_1.default(env, models, config),
            tasks: null,
        };
        output.tasks = yield (0, setupTaskService_1.default)(env, models, config, output),
            yield output.mustache.loadPartials();
        return output;
    });
}
function default_1(appContext, env, dbConnection, appLogger) {
    return __awaiter(this, void 0, void 0, function* () {
        const models = (0, factory_1.default)(dbConnection, (0, config_1.default)());
        // The joplinBase object is immutable because it is shared by all requests.
        // Then a "joplin" context property is created from it per request, which
        // contains request-specific properties such as the owner or notifications.
        // See here for the reason:
        // https://github.com/koajs/koa/issues/1554
        appContext.joplinBase = Object.freeze({
            env: env,
            db: dbConnection,
            models: models,
            services: yield setupServices(env, models, (0, config_1.default)()),
            appLogger: appLogger,
            routes: Object.assign({}, routes_1.default),
        });
        if (env === types_1.Env.Prod)
            delete appContext.joplinBase.routes['api/debug'];
        return appContext;
    });
}
exports.default = default_1;
//# sourceMappingURL=setupAppContext.js.map