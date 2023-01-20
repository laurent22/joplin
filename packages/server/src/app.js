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
// Allows displaying error stack traces with TypeScript file paths
require('source-map-support').install();
const Koa = require("koa");
const fs = require("fs-extra");
const Logger_1 = require("@joplin/lib/Logger");
const config_1 = require("./config");
const db_1 = require("./db");
const types_1 = require("./utils/types");
const fs_driver_node_1 = require("@joplin/lib/fs-driver-node");
const ntp_1 = require("@joplin/lib/ntp");
const routeHandler_1 = require("./middleware/routeHandler");
const notificationHandler_1 = require("./middleware/notificationHandler");
const ownerHandler_1 = require("./middleware/ownerHandler");
const setupAppContext_1 = require("./utils/setupAppContext");
const joplinUtils_1 = require("./utils/joplinUtils");
const startServices_1 = require("./utils/startServices");
const testUtils_1 = require("./utils/testing/testUtils");
const apiVersionHandler_1 = require("./middleware/apiVersionHandler");
const clickJackingHandler_1 = require("./middleware/clickJackingHandler");
const factory_1 = require("./models/factory");
const setupCommands_1 = require("./utils/setupCommands");
const routeUtils_1 = require("./utils/routeUtils");
const env_1 = require("./env");
const storageConnectionCheck_1 = require("./utils/storageConnectionCheck");
const locale_1 = require("@joplin/lib/locale");
const checkAdminHandler_1 = require("./middleware/checkAdminHandler");
const nodeSqlite = require('sqlite3');
const cors = require('@koa/cors');
const nodeEnvFile = require('node-env-file');
const { shimInit } = require('@joplin/lib/shim-init-node.js');
shimInit({ nodeSqlite });
const defaultEnvVariables = {
    dev: {
        // To test with the Postgres database, uncomment DB_CLIENT below and
        // comment out SQLITE_DATABASE. Then start the Postgres server using
        // `docker-compose --file docker-compose.db-dev.yml up`
        // DB_CLIENT: 'pg',
        SQLITE_DATABASE: `${db_1.sqliteDefaultDir}/db-dev.sqlite`,
    },
    buildTypes: {
        SQLITE_DATABASE: `${db_1.sqliteDefaultDir}/db-buildTypes.sqlite`,
    },
    prod: {
        SQLITE_DATABASE: `${db_1.sqliteDefaultDir}/db-prod.sqlite`,
    },
};
let appLogger_ = null;
function appLogger() {
    if (!appLogger_) {
        appLogger_ = Logger_1.default.create('App');
    }
    return appLogger_;
}
function markPasswords(o) {
    if (!o)
        return o;
    const output = {};
    for (const k of Object.keys(o)) {
        if (k.toLowerCase().includes('password') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('connectionstring')) {
            output[k] = '********';
        }
        else {
            output[k] = o[k];
        }
    }
    return output;
}
function getEnvFilePath(env, argv) {
    return __awaiter(this, void 0, void 0, function* () {
        if (argv.envFile)
            return argv.envFile;
        if (env === types_1.Env.Dev) {
            return (0, testUtils_1.credentialFile)('server.env');
        }
        return '';
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const { selectedCommand, argv: yargsArgv } = yield (0, setupCommands_1.default)();
        const argv = yargsArgv;
        const env = argv.env || types_1.Env.Dev; // change the default testing environment to development
        const envFilePath = yield getEnvFilePath(env, argv);
        if (envFilePath)
            nodeEnvFile(envFilePath);
        if (!defaultEnvVariables[env])
            throw new Error(`Invalid env: ${env}`);
        const envVariables = (0, env_1.parseEnv)(process.env, defaultEnvVariables[env]);
        const app = new Koa();
        // Note: the order of middlewares is important. For example, ownerHandler
        // loads the user, which is then used by notificationHandler. And finally
        // routeHandler uses data from both previous middlewares. It would be good to
        // layout these dependencies in code but not clear how to do this.
        const corsAllowedDomains = [
            'https://joplinapp.org',
        ];
        if (env === types_1.Env.Dev) {
            corsAllowedDomains.push('http://localhost:8077');
        }
        function acceptOrigin(origin) {
            const hostname = (new URL(origin)).hostname;
            const userContentDomain = envVariables.USER_CONTENT_BASE_URL ? (new URL(envVariables.USER_CONTENT_BASE_URL)).hostname : '';
            if (hostname === userContentDomain)
                return true;
            const hostnameNoSub = hostname.split('.').slice(1).join('.');
            // console.info('CORS check for origin', origin, 'Allowed domains', corsAllowedDomains);
            if (hostnameNoSub === userContentDomain)
                return true;
            if (corsAllowedDomains.includes(origin))
                return true;
            return false;
        }
        // This is used to catch any low level error thrown from a middleware. It
        // won't deal with errors from routeHandler, which catches and handles its
        // own errors.
        app.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield next();
            }
            catch (error) {
                ctx.status = error.httpCode || 500;
                appLogger().error(`Middleware error on ${ctx.path}:`, error);
                const responseFormat = (0, routeUtils_1.routeResponseFormat)(ctx);
                if (responseFormat === routeUtils_1.RouteResponseFormat.Html) {
                    // Since this is a low level error, rendering a view might fail too,
                    // so catch this and default to rendering JSON.
                    try {
                        ctx.response.set('Content-Type', 'text/html');
                        ctx.body = yield ctx.joplin.services.mustache.renderView({
                            name: 'error',
                            title: 'Error',
                            path: 'index/error',
                            content: { error },
                        });
                    }
                    catch (anotherError) {
                        ctx.response.set('Content-Type', 'application/json');
                        ctx.body = JSON.stringify({ error: `${error.message} (Check the server log for more information)` });
                    }
                }
                else {
                    ctx.response.set('Content-Type', 'application/json');
                    ctx.body = JSON.stringify({ error: error.message });
                }
            }
        }));
        // Creates the request-specific "joplin" context property.
        app.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            ctx.joplin = Object.assign(Object.assign({}, ctx.joplinBase), { owner: null, notifications: [] });
            return next();
        }));
        app.use(cors({
            // https://github.com/koajs/cors/issues/52#issuecomment-413887382
            origin: (ctx) => {
                const origin = ctx.request.header.origin;
                if (acceptOrigin(origin)) {
                    return origin;
                }
                else {
                    // we can't return void, so let's return one of the valid domains
                    return corsAllowedDomains[0];
                }
            },
        }));
        app.use(apiVersionHandler_1.default);
        app.use(ownerHandler_1.default);
        app.use(checkAdminHandler_1.default);
        app.use(notificationHandler_1.default);
        app.use(clickJackingHandler_1.default);
        app.use(routeHandler_1.default);
        yield (0, config_1.initConfig)(env, envVariables);
        yield fs.mkdirp((0, config_1.default)().logDir);
        yield fs.mkdirp((0, config_1.default)().tempDir);
        Logger_1.default.fsDriver_ = new fs_driver_node_1.default();
        const globalLogger = new Logger_1.default();
        // globalLogger.addTarget(TargetType.File, { path: `${config().logDir}/app.txt` });
        globalLogger.addTarget(Logger_1.TargetType.Console, {
            format: '%(date_time)s: [%(level)s] %(prefix)s: %(message)s',
            formatInfo: '%(date_time)s: %(prefix)s: %(message)s',
        });
        Logger_1.default.initializeGlobalLogger(globalLogger);
        if (envFilePath)
            appLogger().info(`Env variables were loaded from: ${envFilePath}`);
        const pidFile = argv.pidfile;
        if (pidFile) {
            appLogger().info(`Writing PID to ${pidFile}...`);
            fs.removeSync(pidFile);
            fs.writeFileSync(pidFile, `${process.pid}`);
        }
        let runCommandAndExitApp = true;
        if (selectedCommand) {
            const commandArgv = Object.assign(Object.assign({}, argv), { _: argv._.slice() });
            commandArgv._.splice(0, 1);
            if (selectedCommand.commandName() === 'db') {
                yield selectedCommand.run(commandArgv, {
                    db: null,
                    models: null,
                });
            }
            else {
                const connectionCheck = yield (0, db_1.waitForConnection)((0, config_1.default)().database);
                const models = (0, factory_1.default)(connectionCheck.connection, (0, config_1.default)());
                yield selectedCommand.run(commandArgv, {
                    db: connectionCheck.connection,
                    models,
                });
            }
        }
        else {
            runCommandAndExitApp = false;
            appLogger().info(`Starting server v${(0, config_1.default)().appVersion} (${env}) on port ${(0, config_1.default)().port} and PID ${process.pid}...`);
            if ((0, config_1.default)().maxTimeDrift) {
                const timeDrift = yield (0, ntp_1.getDeviceTimeDrift)();
                if (Math.abs(timeDrift) > (0, config_1.default)().maxTimeDrift) {
                    throw new Error(`The device time drift is ${timeDrift}ms (Max allowed: ${(0, config_1.default)().maxTimeDrift}ms) - cannot continue as it could cause data loss and conflicts on the sync clients. You may increase env var MAX_TIME_DRIFT to pass the check, or set to 0 to disabled the check.`);
                }
                appLogger().info(`NTP time offset: ${timeDrift}ms`);
            }
            else {
                appLogger().info('Skipping NTP time check because MAX_TIME_DRIFT is 0.');
            }
            (0, locale_1.setLocale)('en_GB');
            appLogger().info('Running in Docker:', (0, config_1.runningInDocker)());
            appLogger().info('Public base URL:', (0, config_1.default)().baseUrl);
            appLogger().info('API base URL:', (0, config_1.default)().apiBaseUrl);
            appLogger().info('User content base URL:', (0, config_1.default)().userContentBaseUrl);
            appLogger().info('Log dir:', (0, config_1.default)().logDir);
            appLogger().info('DB Config:', markPasswords((0, config_1.default)().database));
            appLogger().info('Mailer Config:', markPasswords((0, config_1.default)().mailer));
            appLogger().info('Content driver:', markPasswords((0, config_1.default)().storageDriver));
            appLogger().info('Content driver (fallback):', markPasswords((0, config_1.default)().storageDriverFallback));
            appLogger().info('Trying to connect to database...');
            const connectionCheck = yield (0, db_1.waitForConnection)((0, config_1.default)().database);
            const connectionCheckLogInfo = Object.assign({}, connectionCheck);
            delete connectionCheckLogInfo.connection;
            appLogger().info('Connection check:', connectionCheckLogInfo);
            const ctx = app.context;
            if ((0, config_1.default)().database.autoMigration) {
                appLogger().info('Auto-migrating database...');
                yield (0, db_1.migrateLatest)(connectionCheck.connection);
                appLogger().info('Latest migration:', yield (0, db_1.latestMigration)(connectionCheck.connection));
            }
            else {
                appLogger().info('Skipped database auto-migration.');
            }
            yield (0, setupAppContext_1.default)(ctx, env, connectionCheck.connection, appLogger);
            yield (0, joplinUtils_1.initializeJoplinUtils)((0, config_1.default)(), ctx.joplinBase.models, ctx.joplinBase.services.mustache);
            appLogger().info('Performing main storage check...');
            appLogger().info(yield (0, storageConnectionCheck_1.default)((0, config_1.default)().storageDriver, ctx.joplinBase.db, ctx.joplinBase.models));
            if ((0, config_1.default)().storageDriverFallback) {
                appLogger().info('Performing fallback storage check...');
                appLogger().info(yield (0, storageConnectionCheck_1.default)((0, config_1.default)().storageDriverFallback, ctx.joplinBase.db, ctx.joplinBase.models));
            }
            appLogger().info('Starting services...');
            yield (0, startServices_1.default)(ctx.joplinBase.services);
            appLogger().info(`Call this for testing: \`curl ${(0, config_1.default)().apiBaseUrl}/api/ping\``);
            app.listen((0, config_1.default)().port);
        }
        if (runCommandAndExitApp)
            process.exit(0);
    });
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=app.js.map