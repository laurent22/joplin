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
const Logger_1 = require("@joplin/lib/Logger");
const db_1 = require("../db");
const BaseCommand_1 = require("./BaseCommand");
const logger = Logger_1.default.create('MigrateCommand');
var ArgvCommand;
(function (ArgvCommand) {
    ArgvCommand["Up"] = "up";
    ArgvCommand["Down"] = "down";
    ArgvCommand["Latest"] = "latest";
    ArgvCommand["List"] = "list";
    ArgvCommand["Unlock"] = "unlock";
})(ArgvCommand || (ArgvCommand = {}));
class MigrateCommand extends BaseCommand_1.default {
    command() {
        return 'migrate <command>';
    }
    description() {
        return 'execute a database migration';
    }
    positionals() {
        return {
            'command': {
                description: 'command to execute',
                choices: [
                    ArgvCommand.Up,
                    ArgvCommand.Down,
                    ArgvCommand.Latest,
                    ArgvCommand.List,
                    ArgvCommand.Unlock,
                ],
            },
        };
    }
    options() {
        return {
            'disable-transactions': {
                type: 'boolean',
            },
        };
    }
    run(argv, runContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const commands = {
                up: () => __awaiter(this, void 0, void 0, function* () {
                    yield (0, db_1.migrateUp)(runContext.db, argv.disableTransactions);
                }),
                down: () => __awaiter(this, void 0, void 0, function* () {
                    yield (0, db_1.migrateDown)(runContext.db, argv.disableTransactions);
                }),
                latest: () => __awaiter(this, void 0, void 0, function* () {
                    yield (0, db_1.migrateLatest)(runContext.db, argv.disableTransactions);
                }),
                list: () => __awaiter(this, void 0, void 0, function* () {
                    const s = (yield (0, db_1.migrateList)(runContext.db));
                    s.split('\n').forEach(l => logger.info(l));
                }),
                unlock: () => __awaiter(this, void 0, void 0, function* () {
                    yield (0, db_1.migrateUnlock)(runContext.db);
                }),
            };
            if (!commands[argv.command])
                throw new Error(`Invalid command: ${argv.command}`);
            yield commands[argv.command]();
            yield (0, db_1.disconnectDb)(runContext.db);
        });
    }
}
exports.default = MigrateCommand;
//# sourceMappingURL=MigrateCommand.js.map