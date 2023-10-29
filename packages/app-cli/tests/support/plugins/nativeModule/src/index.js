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
const api_1 = require("api");
function demoSqlite3() {
    const sqlite3 = api_1.default.plugins.require('sqlite3');
    var db = new sqlite3.Database(':memory:');
    db.serialize(function () {
        db.run("CREATE TABLE lorem (info TEXT)");
        var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
        for (var i = 0; i < 10; i++) {
            stmt.run("Ipsum " + i);
        }
        stmt.finalize();
        db.each("SELECT rowid AS id, info FROM lorem", function (_err, row) {
            console.log(row.id + ": " + row.info);
        });
    });
    db.close();
}
function demoFsExtra() {
    return __awaiter(this, void 0, void 0, function* () {
        const fs = api_1.default.plugins.require('fs-extra');
        const pluginDir = yield api_1.default.plugins.dataDir();
        console.info('Checking if "' + pluginDir + '" exists:', yield fs.pathExists(pluginDir));
    });
}
api_1.default.plugins.register({
    onStart: function () {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('Trying fs-extra package...');
            yield demoFsExtra();
            console.info('Trying Sqlite3 package...');
            demoSqlite3();
        });
    },
});
//# sourceMappingURL=index.js.map