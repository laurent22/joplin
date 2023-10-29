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
const types_1 = require("api/types");
api_1.default.plugins.register({
    onStart: function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield api_1.default.commands.register({
                name: 'testCommand',
                label: 'My Test Command',
                execute: (...args) => __awaiter(this, void 0, void 0, function* () {
                    alert('Got command "testCommand" with args: ' + JSON.stringify(args));
                }),
            });
            yield api_1.default.commands.register({
                name: 'testCommandNoArgs',
                label: 'My Test Command (no args)',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    alert('Got command "testCommandNoArgs"');
                }),
            });
            yield api_1.default.contentScripts.register(types_1.ContentScriptType.MarkdownItPlugin, 'justtesting', './markdownItTestPlugin.js');
            yield api_1.default.contentScripts.onMessage('justtesting', (message) => {
                return message + '+response';
            });
        });
    },
});
//# sourceMappingURL=index.js.map