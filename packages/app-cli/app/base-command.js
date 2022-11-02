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
const locale_1 = require("@joplin/lib/locale");
const registry_js_1 = require("@joplin/lib/registry.js");
class BaseCommand {
    constructor() {
        this.stdout_ = null;
        this.prompt_ = null;
    }
    usage() {
        throw new Error('Usage not defined');
    }
    encryptionCheck(item) {
        if (item && item.encryption_applied)
            throw new Error((0, locale_1._)('Cannot change encrypted item'));
    }
    description() {
        throw new Error('Description not defined');
    }
    action(_args) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Action not defined');
        });
    }
    compatibleUis() {
        return ['cli', 'gui'];
    }
    supportsUi(ui) {
        return this.compatibleUis().indexOf(ui) >= 0;
    }
    options() {
        return [];
    }
    hidden() {
        return false;
    }
    enabled() {
        return true;
    }
    cancellable() {
        return false;
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    name() {
        const r = this.usage().split(' ');
        return r[0];
    }
    setDispatcher(fn) {
        this.dispatcher_ = fn;
    }
    dispatch(action) {
        if (!this.dispatcher_)
            throw new Error('Dispatcher not defined');
        return this.dispatcher_(action);
    }
    setStdout(fn) {
        this.stdout_ = fn;
    }
    stdout(text) {
        if (this.stdout_)
            this.stdout_(text);
    }
    setPrompt(fn) {
        this.prompt_ = fn;
    }
    prompt(message, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.prompt_)
                throw new Error('Prompt is undefined');
            return yield this.prompt_(message, options);
        });
    }
    metadata() {
        return {
            name: this.name(),
            usage: this.usage(),
            options: this.options(),
            hidden: this.hidden(),
        };
    }
    logger() {
        return registry_js_1.reg.logger();
    }
}
exports.default = BaseCommand;
//# sourceMappingURL=base-command.js.map