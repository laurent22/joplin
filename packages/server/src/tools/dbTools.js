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
exports.dropDb = exports.createDb = void 0;
const db_1 = require("../db");
const fs = require("fs-extra");
const { execCommand } = require('@joplin/tools/tool-utils');
function createDb(config, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        options = Object.assign({ dropIfExists: false, autoMigrate: true }, options);
        if (config.client === 'pg') {
            const cmd = [
                'createdb',
                '--host', config.host,
                '--port', config.port.toString(),
                '--username', config.user,
                config.name,
            ];
            if (options.dropIfExists) {
                yield dropDb(config, { ignoreIfNotExists: true });
            }
            yield execCommand(cmd.join(' '), { env: { PGPASSWORD: config.password } });
        }
        else if (config.client === 'sqlite3') {
            const filePath = config.name;
            if (yield fs.pathExists(filePath)) {
                if (options.dropIfExists) {
                    yield fs.remove(filePath);
                }
                else {
                    throw new Error(`Database already exists: ${filePath}`);
                }
            }
        }
        try {
            const db = yield (0, db_1.connectDb)(config);
            if (options.autoMigrate)
                yield (0, db_1.migrateLatest)(db);
            yield (0, db_1.disconnectDb)(db);
        }
        catch (error) {
            error.message += `: ${config.name}`;
            throw error;
        }
    });
}
exports.createDb = createDb;
function dropDb(config, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        options = Object.assign({ ignoreIfNotExists: false }, options);
        if (config.client === 'pg') {
            const cmd = [
                'dropdb',
                '--host', config.host,
                '--port', config.port.toString(),
                '--username', config.user,
                config.name,
            ];
            try {
                yield execCommand(cmd.join(' '), { env: { PGPASSWORD: config.password } });
            }
            catch (error) {
                if (options.ignoreIfNotExists && error.message.includes('does not exist'))
                    return;
                throw error;
            }
        }
        else if (config.client === 'sqlite3') {
            yield fs.remove(config.name);
        }
    });
}
exports.dropDb = dropDb;
//# sourceMappingURL=dbTools.js.map