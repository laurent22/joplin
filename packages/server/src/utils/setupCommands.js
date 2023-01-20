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
const yargs = require("yargs");
const DbCommand_1 = require("../commands/DbCommand");
const CompressOldChangesCommand_1 = require("../commands/CompressOldChangesCommand");
const StorageCommand_1 = require("../commands/StorageCommand");
const MigrateCommand_1 = require("../commands/MigrateCommand");
function setupCommands() {
    return __awaiter(this, void 0, void 0, function* () {
        const commands = [
            new MigrateCommand_1.default(),
            new DbCommand_1.default(),
            new CompressOldChangesCommand_1.default(),
            new StorageCommand_1.default(),
        ];
        for (const cmd of commands) {
            yargs.command(cmd.command(), cmd.description(), (yargs) => {
                const positionals = cmd.positionals ? cmd.positionals() : {};
                for (const [name, options] of Object.entries(positionals)) {
                    yargs.positional(name, options ? options : {});
                }
                const commandOptions = cmd.options() ? cmd.options() : {};
                for (const [name, options] of Object.entries(commandOptions)) {
                    yargs.options(name, options);
                }
            });
        }
        // yargs.option('env', {
        // 	default: 'prod',
        // 	type: 'string',
        // 	choices: ['dev', 'prod'],
        // 	hidden: true,
        // });
        // yargs.option('stack-trace', {
        // 	default: '1',
        // 	type: 'boolean',
        // 	hidden: true,
        // });
        // yargs.option('db-config-filename', {
        // 	type: 'string',
        // 	hidden: true,
        // });
        yargs.help();
        const argv = yield yargs.argv;
        const cmdName = argv._ && argv._.length ? argv._[0] : null;
        let selectedCommand = null;
        for (const cmd of commands) {
            if (cmd.commandName() === cmdName)
                selectedCommand = cmd;
        }
        if (cmdName && !selectedCommand) {
            yargs.showHelp();
            console.info('');
            throw new Error(`Invalid command: ${cmdName}`);
        }
        return {
            commands,
            argv,
            selectedCommand,
            yargs,
        };
    });
}
exports.default = setupCommands;
//# sourceMappingURL=setupCommands.js.map