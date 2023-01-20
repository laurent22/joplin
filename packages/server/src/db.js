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
exports.connectionCheck = exports.latestMigration = exports.isUniqueConstraintError = exports.truncateTables = exports.dropTables = exports.nextMigration = exports.migrateList = exports.migrateUnlock = exports.migrateDown = exports.migrateUp = exports.migrateLatest = exports.disconnectDb = exports.connectDb = exports.setupSlowQueryLog = exports.setCollateC = exports.isSqlite = exports.isPostgres = exports.returningSupported = exports.clientType = exports.waitForConnection = exports.makeKnexConfig = exports.defaultAdminPassword = exports.defaultAdminEmail = exports.sqliteDefaultDir = exports.SqliteMaxVariableNum = void 0;
const knex_1 = require("knex");
const types_1 = require("./utils/types");
const pathUtils = require("path");
const time_1 = require("@joplin/lib/time");
const Logger_1 = require("@joplin/lib/Logger");
const types_2 = require("./services/database/types");
// Make sure bigInteger values are numbers and not strings
//
// https://github.com/brianc/node-pg-types
//
// In our case, all bigInteger are timestamps, which JavaScript can handle
// fine as numbers.
require('pg').types.setTypeParser(20, function (val) {
    return parseInt(val, 10);
});
const logger = Logger_1.default.create('db');
// To prevent error "SQLITE_ERROR: too many SQL variables", SQL statements with
// "IN" clauses shouldn't contain more than the number of variables below.s
// https://www.sqlite.org/limits.html#max_variable_number
exports.SqliteMaxVariableNum = 999;
const migrationDir = `${__dirname}/migrations`;
exports.sqliteDefaultDir = pathUtils.dirname(__dirname);
exports.defaultAdminEmail = 'admin@localhost';
exports.defaultAdminPassword = 'admin';
function makeKnexConfig(dbConfig) {
    const connection = {};
    if (dbConfig.client === 'sqlite3') {
        connection.filename = dbConfig.name;
    }
    else {
        if (dbConfig.connectionString) {
            connection.connectionString = dbConfig.connectionString;
        }
        else {
            connection.database = dbConfig.name;
            connection.host = dbConfig.host;
            connection.port = dbConfig.port;
            connection.user = dbConfig.user;
            connection.password = dbConfig.password;
        }
    }
    return {
        client: dbConfig.client,
        useNullAsDefault: dbConfig.client === 'sqlite3',
        asyncStackTraces: dbConfig.asyncStackTraces,
        connection,
    };
}
exports.makeKnexConfig = makeKnexConfig;
function waitForConnection(dbConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const timeout = 30000;
        const startTime = Date.now();
        let lastError = { message: '' };
        while (true) { // keep on trying to establish a db connection
            try {
                const connection = yield connectDb(dbConfig);
                const check = yield connectionCheck(connection);
                if (check.error)
                    throw check.error;
                return check;
            }
            catch (error) {
                logger.info('Could not connect. Will try again.', error.message);
                lastError = error;
            }
            if (Date.now() - startTime > timeout) {
                logger.error('Timeout trying to connect to database:', lastError);
                throw new Error(`Timeout trying to connect to database. Last error was: ${lastError.message}`);
            }
            yield time_1.default.msleep(1000);
        }
    });
}
exports.waitForConnection = waitForConnection;
const clientType = (db) => {
    return db.client.config.client;
};
exports.clientType = clientType;
const returningSupported = (db) => {
    return (0, exports.clientType)(db) === types_1.DatabaseConfigClient.PostgreSQL;
};
exports.returningSupported = returningSupported;
const isPostgres = (db) => {
    return (0, exports.clientType)(db) === types_1.DatabaseConfigClient.PostgreSQL;
};
exports.isPostgres = isPostgres;
const isSqlite = (db) => {
    return (0, exports.clientType)(db) === types_1.DatabaseConfigClient.SQLite;
};
exports.isSqlite = isSqlite;
const setCollateC = (db, tableName, columnName) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, exports.isPostgres)(db))
        return;
    yield db.raw(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET DATA TYPE character varying(32) COLLATE "C"`);
});
exports.setCollateC = setCollateC;
function makeSlowQueryHandler(duration, connection, sql, bindings) {
    return setTimeout(() => {
        try {
            logger.warn(`Slow query (${duration}ms+):`, connection.raw(sql, bindings).toString());
        }
        catch (error) {
            logger.error('Could not log slow query', { sql, bindings }, error);
        }
    }, duration);
}
function setupSlowQueryLog(connection, slowQueryLogMinDuration) {
    const queryInfos = {};
    // These queries do not return a response, so "query-response" is not
    // called.
    const ignoredQueries = /^BEGIN|SAVEPOINT|RELEASE SAVEPOINT|COMMIT|ROLLBACK/gi;
    connection.on('query', (data) => {
        const sql = data.sql;
        if (!sql || sql.match(ignoredQueries))
            return;
        const timeoutId = makeSlowQueryHandler(slowQueryLogMinDuration, connection, sql, data.bindings);
        queryInfos[data.__knexQueryUid] = {
            timeoutId,
            startTime: Date.now(),
        };
    });
    connection.on('query-response', (_response, data) => {
        const q = queryInfos[data.__knexQueryUid];
        if (q) {
            clearTimeout(q.timeoutId);
            delete queryInfos[data.__knexQueryUid];
        }
    });
    connection.on('query-error', (_response, data) => {
        const q = queryInfos[data.__knexQueryUid];
        if (q) {
            clearTimeout(q.timeoutId);
            delete queryInfos[data.__knexQueryUid];
        }
    });
}
exports.setupSlowQueryLog = setupSlowQueryLog;
const filterBindings = (bindings) => {
    const output = {};
    for (let i = 0; i < bindings.length; i++) {
        let value = bindings[i];
        if (typeof value === 'string')
            value = value.substr(0, 200);
        if (Buffer.isBuffer(value))
            value = '<binary>';
        output[`$${i + 1}`] = value;
    }
    return output;
};
function connectDb(dbConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = (0, knex_1.knex)(makeKnexConfig(dbConfig));
        if (dbConfig.slowQueryLogEnabled) {
            setupSlowQueryLog(connection, dbConfig.slowQueryLogMinDuration);
        }
        connection.on('query-error', (response, data) => {
            // It is possible to set certain properties on the query context to
            // disable this handler. This is useful for example for constraint
            // errors which are often already handled application side.
            if (data.queryContext) {
                if (data.queryContext.uniqueConstraintErrorLoggingDisabled && isUniqueConstraintError(response)) {
                    return;
                }
                if (data.queryContext.noSuchTableErrorLoggingDisabled && isNoSuchTableError(response)) {
                    return;
                }
            }
            const msg = [];
            msg.push(response.message);
            if (data.bindings && data.bindings.length)
                msg.push(JSON.stringify(filterBindings(data.bindings), null, '  '));
            logger.error(...msg);
        });
        return connection;
    });
}
exports.connectDb = connectDb;
function disconnectDb(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.destroy();
    });
}
exports.disconnectDb = disconnectDb;
function migrateLatest(db, disableTransactions = false) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.migrate.latest({
            directory: migrationDir,
            disableTransactions,
        });
    });
}
exports.migrateLatest = migrateLatest;
function migrateUp(db, disableTransactions = false) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.migrate.up({
            directory: migrationDir,
            disableTransactions,
        });
    });
}
exports.migrateUp = migrateUp;
function migrateDown(db, disableTransactions = false) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.migrate.down({
            directory: migrationDir,
            disableTransactions,
        });
    });
}
exports.migrateDown = migrateDown;
function migrateUnlock(db) {
    return __awaiter(this, void 0, void 0, function* () {
        yield db.migrate.forceFreeMigrationsLock();
    });
}
exports.migrateUnlock = migrateUnlock;
function migrateList(db, asString = true) {
    return __awaiter(this, void 0, void 0, function* () {
        const migrations = yield db.migrate.list({
            directory: migrationDir,
        });
        // The migration array has a rather inconsistent format:
        //
        // [
        //   // Done migrations
        //   [
        //     '20210809222118_email_key_fix.js',
        //     '20210814123815_testing.js',
        //     '20210814123816_testing.js'
        //   ],
        //   // Not done migrations
        //   [
        //     {
        //       file: '20210814123817_testing.js',
        //       directory: '/path/to/packages/server/dist/migrations'
        //     }
        //   ]
        // ]
        const getMigrationName = (migrationInfo) => {
            if (migrationInfo && migrationInfo.name)
                return migrationInfo.name;
            if (migrationInfo && migrationInfo.file)
                return migrationInfo.file;
            return migrationInfo;
        };
        const formatName = (migrationInfo) => {
            const s = getMigrationName(migrationInfo).split('.');
            s.pop();
            return s.join('.');
        };
        const output = [];
        for (const s of migrations[0]) {
            output.push({
                name: formatName(s),
                done: true,
            });
        }
        for (const s of migrations[1]) {
            output.push({
                name: formatName(s),
                done: false,
            });
        }
        output.sort((a, b) => {
            return a.name < b.name ? -1 : +1;
        });
        if (!asString)
            return output;
        return output.map(l => `${l.done ? '✓' : '✗'} ${l.name}`).join('\n');
    });
}
exports.migrateList = migrateList;
function nextMigration(db) {
    return __awaiter(this, void 0, void 0, function* () {
        const list = yield migrateList(db, false);
        let nextMigration = null;
        while (list.length) {
            const migration = list.pop();
            if (migration.done)
                return nextMigration ? nextMigration.name : '';
            nextMigration = migration;
        }
        return '';
    });
}
exports.nextMigration = nextMigration;
function allTableNames() {
    const tableNames = Object.keys(types_2.databaseSchema);
    tableNames.push('knex_migrations');
    tableNames.push('knex_migrations_lock');
    return tableNames;
}
function dropTables(db) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const tableName of allTableNames()) {
            try {
                yield db.schema.dropTable(tableName);
            }
            catch (error) {
                if (isNoSuchTableError(error))
                    continue;
                throw error;
            }
        }
    });
}
exports.dropTables = dropTables;
function truncateTables(db) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const tableName of allTableNames()) {
            try {
                yield db(tableName).truncate();
            }
            catch (error) {
                if (isNoSuchTableError(error))
                    continue;
                throw error;
            }
        }
    });
}
exports.truncateTables = truncateTables;
function isNoSuchTableError(error) {
    if (error) {
        // Postgres error: 42P01: undefined_table
        if (error.code === '42P01')
            return true;
        // Sqlite3 error
        if (error.message && error.message.includes('SQLITE_ERROR: no such table:'))
            return true;
    }
    return false;
}
function isUniqueConstraintError(error) {
    if (error) {
        // Postgres error: 23505: unique_violation
        if (error.code === '23505')
            return true;
        // Sqlite3 error
        if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE constraint'))
            return true;
    }
    return false;
}
exports.isUniqueConstraintError = isUniqueConstraintError;
function latestMigration(db) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const context = { noSuchTableErrorLoggingDisabled: true };
            const result = yield db('knex_migrations').queryContext(context).select('name').orderBy('id', 'desc').first();
            return { name: result.name, done: true };
        }
        catch (error) {
            // If the database has never been initialized, we return null, so
            // for this we need to check the error code, which will be
            // different depending on the DBMS.
            if (isNoSuchTableError(error))
                return null;
            throw error;
        }
    });
}
exports.latestMigration = latestMigration;
function connectionCheck(db) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield latestMigration(db);
            return {
                latestMigration: result,
                isCreated: !!result,
                error: null,
                connection: db,
            };
        }
        catch (error) {
            return {
                latestMigration: null,
                isCreated: false,
                error: error,
                connection: null,
            };
        }
    });
}
exports.connectionCheck = connectionCheck;
//# sourceMappingURL=db.js.map