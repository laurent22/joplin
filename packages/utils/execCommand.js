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
const execa = require("execa");
const commandToString_1 = require("./commandToString");
const splitCommandString_1 = require("./splitCommandString");
const process_1 = require("process");
exports.default = (command, options = null) => __awaiter(void 0, void 0, void 0, function* () {
    options = Object.assign({ showInput: true, showStdout: true, showStderr: true, quiet: false }, options);
    if (options.quiet) {
        options.showInput = false;
        options.showStdout = false;
        options.showStderr = false;
    }
    if (options.showInput) {
        if (typeof command === 'string') {
            process_1.stdout.write(`> ${command}\n`);
        }
        else {
            process_1.stdout.write(`> ${(0, commandToString_1.default)(command[0], command.slice(1))}\n`);
        }
    }
    const args = typeof command === 'string' ? (0, splitCommandString_1.default)(command) : command;
    const executableName = args[0];
    args.splice(0, 1);
    const promise = execa(executableName, args);
    if (options.showStdout && promise.stdout)
        promise.stdout.pipe(process.stdout);
    if (options.showStderr && promise.stderr)
        promise.stderr.pipe(process.stderr);
    const result = yield promise;
    return result.stdout.trim();
});
//# sourceMappingURL=execCommand.js.map