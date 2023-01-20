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
const BaseCommand_1 = require("./BaseCommand");
const parseStorageConnectionString_1 = require("../models/items/storage/parseStorageConnectionString");
const storageConnectionCheck_1 = require("../utils/storageConnectionCheck");
const logger = Logger_1.default.create('ImportContentCommand');
var ArgvCommand;
(function (ArgvCommand) {
    ArgvCommand["Import"] = "import";
    ArgvCommand["CheckConnection"] = "check-connection";
    ArgvCommand["DeleteDatabaseContentColumn"] = "delete-database-content-col";
})(ArgvCommand || (ArgvCommand = {}));
class StorageCommand extends BaseCommand_1.default {
    command() {
        return 'storage <command>';
    }
    description() {
        return 'import content to storage';
    }
    positionals() {
        return {
            'command': {
                description: 'command to execute',
                choices: [
                    ArgvCommand.Import,
                    ArgvCommand.CheckConnection,
                    ArgvCommand.DeleteDatabaseContentColumn,
                ],
            },
        };
    }
    options() {
        return {
            'batch-size': {
                type: 'number',
                description: 'Item batch size',
            },
            'max-content-size': {
                type: 'number',
                description: 'Max content size',
            },
            'max-processed-items': {
                type: 'number',
                description: 'Max number of items to process before stopping',
            },
            'connection': {
                description: 'storage connection string',
                type: 'string',
            },
        };
    }
    run(argv, runContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const batchSize = argv.batchSize || 1000;
            const commands = {
                [ArgvCommand.Import]: () => __awaiter(this, void 0, void 0, function* () {
                    if (!argv.connection)
                        throw new Error('--connection option is required');
                    const toStorageConfig = (0, parseStorageConnectionString_1.default)(argv.connection);
                    const maxContentSize = argv.maxContentSize || 200000000;
                    logger.info('Importing to storage:', toStorageConfig);
                    logger.info(`Batch size: ${batchSize}`);
                    logger.info(`Max content size: ${maxContentSize}`);
                    yield runContext.models.item().importContentToStorage(toStorageConfig, {
                        batchSize,
                        maxContentSize,
                        logger,
                    });
                }),
                [ArgvCommand.CheckConnection]: () => __awaiter(this, void 0, void 0, function* () {
                    logger.info(yield (0, storageConnectionCheck_1.default)(argv.connection, runContext.db, runContext.models));
                }),
                [ArgvCommand.DeleteDatabaseContentColumn]: () => __awaiter(this, void 0, void 0, function* () {
                    const maxProcessedItems = argv.maxProcessedItems;
                    logger.info(`Batch size: ${batchSize}`);
                    yield runContext.models.item().deleteDatabaseContentColumn({
                        batchSize,
                        logger,
                        maxProcessedItems,
                    });
                }),
            };
            yield commands[argv.command]();
        });
    }
}
exports.default = StorageCommand;
//# sourceMappingURL=StorageCommand.js.map