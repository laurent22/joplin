"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BaseCommand {
    commandName() {
        const splitted = this.command().split(' ');
        if (!splitted.length)
            throw new Error(`Invalid command: ${this.command()}`);
        return splitted[0];
    }
    command() {
        throw new Error('Not implemented');
    }
    description() {
        throw new Error('Not implemented');
    }
    positionals() {
        return {};
    }
    options() {
        return {};
    }
}
exports.default = BaseCommand;
//# sourceMappingURL=BaseCommand.js.map