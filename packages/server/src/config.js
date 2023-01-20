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
exports.showItemUrls = exports.baseUrl = exports.initConfig = exports.runningInDocker = void 0;
const path_utils_1 = require("@joplin/lib/path-utils");
const types_1 = require("./utils/types");
const pathUtils = require("path");
const joplinCloud_1 = require("@joplin/lib/utils/joplinCloud");
const parseStorageConnectionString_1 = require("./models/items/storage/parseStorageConnectionString");
const packageJson = require(`${__dirname}/packageInfo.js`);
let runningInDocker_ = false;
function runningInDocker() {
    return runningInDocker_;
}
exports.runningInDocker = runningInDocker;
function databaseHostFromEnv(runningInDocker, env) {
    if (env.POSTGRES_HOST) {
        // When running within Docker, the app localhost is different from the
        // host's localhost. To access the latter, Docker defines a special host
        // called "host.docker.internal", so here we swap the values if necessary.
        if (runningInDocker && ['localhost', '127.0.0.1'].includes(env.POSTGRES_HOST)) {
            return 'host.docker.internal';
        }
        else {
            return env.POSTGRES_HOST;
        }
    }
    return null;
}
function databaseConfigFromEnv(runningInDocker, env) {
    const baseConfig = {
        client: types_1.DatabaseConfigClient.Null,
        name: '',
        slowQueryLogEnabled: env.DB_SLOW_QUERY_LOG_ENABLED,
        slowQueryLogMinDuration: env.DB_SLOW_QUERY_LOG_MIN_DURATION,
        autoMigration: env.DB_AUTO_MIGRATION,
    };
    if (env.DB_CLIENT === 'pg') {
        const databaseConfig = Object.assign(Object.assign({}, baseConfig), { client: types_1.DatabaseConfigClient.PostgreSQL });
        if (env.POSTGRES_CONNECTION_STRING) {
            return Object.assign(Object.assign({}, databaseConfig), { connectionString: env.POSTGRES_CONNECTION_STRING });
        }
        else {
            return Object.assign(Object.assign({}, databaseConfig), { name: env.POSTGRES_DATABASE, user: env.POSTGRES_USER, password: env.POSTGRES_PASSWORD, port: env.POSTGRES_PORT, host: databaseHostFromEnv(runningInDocker, env) || 'localhost' });
        }
    }
    return Object.assign(Object.assign({}, baseConfig), { client: types_1.DatabaseConfigClient.SQLite, name: env.SQLITE_DATABASE, asyncStackTraces: true });
}
function mailerConfigFromEnv(env) {
    return {
        enabled: env.MAILER_ENABLED,
        host: env.MAILER_HOST,
        port: env.MAILER_PORT,
        security: env.MAILER_SECURITY,
        authUser: env.MAILER_AUTH_USER,
        authPassword: env.MAILER_AUTH_PASSWORD,
        noReplyName: env.MAILER_NOREPLY_NAME,
        noReplyEmail: env.MAILER_NOREPLY_EMAIL,
    };
}
function stripeConfigFromEnv(publicConfig, env) {
    return Object.assign(Object.assign({}, publicConfig), { enabled: !!env.STRIPE_SECRET_KEY, secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET });
}
function baseUrlFromEnv(env, appPort) {
    if (env.APP_BASE_URL) {
        return (0, path_utils_1.rtrimSlashes)(env.APP_BASE_URL);
    }
    else {
        return `http://localhost:${appPort}`;
    }
}
let config_ = null;
function initConfig(envType, env, overrides = null) {
    return __awaiter(this, void 0, void 0, function* () {
        runningInDocker_ = !!env.RUNNING_IN_DOCKER;
        const rootDir = pathUtils.dirname(__dirname);
        const stripePublicConfig = (0, joplinCloud_1.loadStripeConfig)(envType === types_1.Env.BuildTypes ? types_1.Env.Dev : envType, `${rootDir}/stripeConfig.json`);
        const appName = env.APP_NAME;
        const viewDir = `${rootDir}/src/views`;
        const appPort = env.APP_PORT;
        const baseUrl = baseUrlFromEnv(env, appPort);
        const apiBaseUrl = env.API_BASE_URL ? env.API_BASE_URL : baseUrl;
        const supportEmail = env.SUPPORT_EMAIL;
        config_ = Object.assign(Object.assign(Object.assign({}, env), { appVersion: packageJson.version, appName, isJoplinCloud: apiBaseUrl.includes('.joplincloud.com') || apiBaseUrl.includes('.joplincloud.local'), env: envType, rootDir: rootDir, viewDir: viewDir, layoutDir: `${viewDir}/layouts`, tempDir: `${rootDir}/temp`, logDir: `${rootDir}/logs`, database: databaseConfigFromEnv(runningInDocker_, env), mailer: mailerConfigFromEnv(env), stripe: stripeConfigFromEnv(stripePublicConfig, env), port: appPort, baseUrl, adminBaseUrl: `${baseUrl}/admin`, showErrorStackTraces: env.ERROR_STACK_TRACES, apiBaseUrl, userContentBaseUrl: env.USER_CONTENT_BASE_URL ? env.USER_CONTENT_BASE_URL : baseUrl, joplinAppBaseUrl: env.JOPLINAPP_BASE_URL, signupEnabled: env.SIGNUP_ENABLED, termsEnabled: env.TERMS_ENABLED, accountTypesEnabled: env.ACCOUNT_TYPES_ENABLED, supportEmail, supportName: env.SUPPORT_NAME || appName, businessEmail: env.BUSINESS_EMAIL || supportEmail, cookieSecure: env.COOKIES_SECURE, storageDriver: (0, parseStorageConnectionString_1.default)(env.STORAGE_DRIVER), storageDriverFallback: (0, parseStorageConnectionString_1.default)(env.STORAGE_DRIVER_FALLBACK), itemSizeHardLimit: 250000000, maxTimeDrift: env.MAX_TIME_DRIFT }), overrides);
    });
}
exports.initConfig = initConfig;
function baseUrl(type) {
    if (type === types_1.RouteType.Web)
        return config().baseUrl;
    if (type === types_1.RouteType.Api)
        return config().apiBaseUrl;
    if (type === types_1.RouteType.UserContent)
        return config().userContentBaseUrl;
    throw new Error(`Unknown type: ${type}`);
}
exports.baseUrl = baseUrl;
// User content URL is not supported for now so only show the URL if the
// user content is hosted on the same domain. Needs to get cookie working
// across domains to get user content url working.
function showItemUrls(config) {
    return config.userContentBaseUrl === config.baseUrl;
}
exports.showItemUrls = showItemUrls;
function config() {
    if (!config_)
        throw new Error('Config has not been initialized!');
    return config_;
}
exports.default = config;
//# sourceMappingURL=config.js.map