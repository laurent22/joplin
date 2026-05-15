"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const shim_1 = require("./shim");
class DatabaseDriverNode {
    open(options) {
        return new Promise((resolve, reject) => {
            const sqlite3 = shim_1.default.nodeSqlite().verbose();
            this.db_ = new sqlite3.Database(options.name, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
    close() {
        return new Promise(resolve => {
            this.db_.close(() => resolve());
        });
    }
    sqliteErrorToJsError(error, sql = null, params = null) {
        const msg = [error.toString()];
        if (sql)
            msg.push(sql);
        if (params)
            msg.push(params);
        const output = new Error(msg.join(': '));
        if (error.code)
            output.code = error.code;
        return output;
    }
    selectOne(sql, params = null) {
        if (!params)
            params = {};
        return new Promise((resolve, reject) => {
            this.db_.get(sql, params, (error, row) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(row);
            });
        });
    }
    loadExtension(path) {
        return new Promise((resolve, reject) => {
            this.db_.loadExtension(path, (error) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    }
    selectAll(sql, params = null) {
        if (!params)
            params = {};
        return new Promise((resolve, reject) => {
            this.db_.all(sql, params, (error, rows) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(rows);
            });
        });
    }
    exec(sql, params = null) {
        if (!params)
            params = {};
        return new Promise((resolve, reject) => {
            this.db_.run(sql, params, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
    lastInsertId() {
        throw new Error('NOT IMPLEMENTED');
    }
}
exports.default = DatabaseDriverNode;
//# sourceMappingURL=database-driver-node.js.map