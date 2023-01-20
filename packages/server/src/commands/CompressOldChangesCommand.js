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
const time_1 = require("../utils/time");
const BaseCommand_1 = require("./BaseCommand");
class CompressOldChangesCommand extends BaseCommand_1.default {
    command() {
        return 'compress-old-changes';
    }
    description() {
        return 'compresses old changes by discarding consecutive updates';
    }
    options() {
        return {
            'ttl': {
                type: 'number',
                description: 'TTL in days',
            },
        };
    }
    run(argv, runContext) {
        return __awaiter(this, void 0, void 0, function* () {
            yield runContext.models.change().compressOldChanges(argv.ttl ? argv.ttl * time_1.Day : null);
        });
    }
}
exports.default = CompressOldChangesCommand;
//# sourceMappingURL=CompressOldChangesCommand.js.map