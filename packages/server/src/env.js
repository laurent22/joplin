"use strict";
// The possible env variables and their defaults are listed below.
//
// The env variables can be of type string, integer or boolean. When the type is
// boolean, set the variable to "true", "false", "0" or "1" in your env file.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEnv = exports.MailerSecurity = void 0;
var MailerSecurity;
(function (MailerSecurity) {
    MailerSecurity["None"] = "none";
    MailerSecurity["Tls"] = "tls";
    MailerSecurity["Starttls"] = "starttls";
})(MailerSecurity = exports.MailerSecurity || (exports.MailerSecurity = {}));
const defaultEnvValues = {
    // ==================================================
    // General config
    // ==================================================
    APP_NAME: 'Joplin Server',
    APP_PORT: 22300,
    SIGNUP_ENABLED: false,
    TERMS_ENABLED: false,
    ACCOUNT_TYPES_ENABLED: false,
    ERROR_STACK_TRACES: false,
    COOKIES_SECURE: false,
    RUNNING_IN_DOCKER: false,
    // Maxiumm allowed drift between NTP time and server time. A few
    // milliseconds is normally not an issue unless many clients are modifying
    // the same note at the exact same time. But past a certain limit, it might
    // mean the server clock is incorrect and should be fixed, as that could
    // result in clients generating many conflicts. Set to 0 to disable the
    // check. https://github.com/laurent22/joplin/issues/5738
    MAX_TIME_DRIFT: 0,
    // ==================================================
    // URL config
    // ==================================================
    APP_BASE_URL: '',
    USER_CONTENT_BASE_URL: '',
    API_BASE_URL: '',
    JOPLINAPP_BASE_URL: 'https://joplinapp.org',
    // ==================================================
    // Database config
    // ==================================================
    DB_CLIENT: 'sqlite3',
    DB_SLOW_QUERY_LOG_ENABLED: false,
    DB_SLOW_QUERY_LOG_MIN_DURATION: 1000,
    DB_AUTO_MIGRATION: true,
    POSTGRES_PASSWORD: 'joplin',
    POSTGRES_DATABASE: 'joplin',
    POSTGRES_USER: 'joplin',
    POSTGRES_HOST: '',
    POSTGRES_PORT: 5432,
    POSTGRES_CONNECTION_STRING: '',
    // This must be the full path to the database file
    SQLITE_DATABASE: '',
    // ==================================================
    // Content driver config
    // ==================================================
    STORAGE_DRIVER: 'Type=Database',
    STORAGE_DRIVER_FALLBACK: '',
    // ==================================================
    // Mailer config
    // ==================================================
    MAILER_ENABLED: false,
    MAILER_HOST: '',
    MAILER_PORT: 465,
    MAILER_SECURITY: MailerSecurity.Tls,
    MAILER_AUTH_USER: '',
    MAILER_AUTH_PASSWORD: '',
    MAILER_NOREPLY_NAME: '',
    MAILER_NOREPLY_EMAIL: '',
    SUPPORT_EMAIL: 'SUPPORT_EMAIL',
    SUPPORT_NAME: '',
    BUSINESS_EMAIL: '',
    // ==================================================
    // Stripe config
    // ==================================================
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    // ==================================================
    // User data deletion
    // ==================================================
    USER_DATA_AUTO_DELETE_ENABLED: false,
    USER_DATA_AUTO_DELETE_AFTER_DAYS: 90,
};
const parseBoolean = (s) => {
    if (s === 'true' || s === '1')
        return true;
    if (s === 'false' || s === '0')
        return false;
    throw new Error(`Invalid boolean value: "${s}" (Must be one of "true", "false", "0, "1")`);
};
function parseEnv(rawEnv, defaultOverrides = null) {
    const output = Object.assign(Object.assign({}, defaultEnvValues), defaultOverrides);
    for (const [key, value] of Object.entries(defaultEnvValues)) {
        const rawEnvValue = rawEnv[key];
        if (rawEnvValue === undefined)
            continue;
        try {
            if (typeof value === 'number') {
                const v = Number(rawEnvValue);
                if (isNaN(v))
                    throw new Error(`Invalid number value "${rawEnvValue}"`);
                output[key] = v;
            }
            else if (typeof value === 'boolean') {
                output[key] = parseBoolean(rawEnvValue);
            }
            else if (typeof value === 'string') {
                output[key] = `${rawEnvValue}`;
            }
            else {
                throw new Error(`Invalid env default value type: ${typeof value}`);
            }
        }
        catch (error) {
            error.message = `Could not parse key "${key}": ${error.message}`;
            throw error;
        }
    }
    return output;
}
exports.parseEnv = parseEnv;
//# sourceMappingURL=env.js.map