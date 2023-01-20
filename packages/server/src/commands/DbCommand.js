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
const db_1 = require("../db");
const BaseCommand_1 = require("./BaseCommand");
const dbTools_1 = require("../tools/dbTools");
var ArgvCommand;
(function (ArgvCommand) {
    ArgvCommand["DropTables"] = "dropTables";
    ArgvCommand["Create"] = "create";
})(ArgvCommand || (ArgvCommand = {}));
class DbCommand extends BaseCommand_1.default {
    command() {
        return 'db <command>';
    }
    description() {
        return 'execute a database command';
    }
    positionals() {
        return {
            'command': {
                description: 'command to execute',
                choices: [
                    ArgvCommand.Create,
                    ArgvCommand.DropTables,
                ],
            },
        };
    }
    run(argv) {
        return __awaiter(this, void 0, void 0, function* () {
            const commands = {
                create: () => __awaiter(this, void 0, void 0, function* () {
                    yield (0, dbTools_1.createDb)((0, config_1.default)().database);
                }),
                dropTables: () => __awaiter(this, void 0, void 0, function* () {
                    const db = yield (0, db_1.connectDb)((0, config_1.default)().database);
                    yield (0, db_1.dropTables)(db);
                    yield (0, db_1.disconnectDb)(db);
                }),
            };
            if (!commands[argv.command])
                throw new Error(`Invalid command: ${argv.command}`);
            yield commands[argv.command]();
        });
    }
}
exports.default = DbCommand;
//# sourceMappingURL=DbCommand.js.map