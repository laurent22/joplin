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
function setupContentScriptMarkdownIt() {
    return __awaiter(this, void 0, void 0, function* () {
        const contentScriptId = 'contentScriptMarkdownIt';
        yield api_1.default.contentScripts.register(types_1.ContentScriptType.MarkdownItPlugin, contentScriptId, './contentScriptMarkdownIt.js');
        yield api_1.default.contentScripts.onMessage(contentScriptId, (message) => {
            console.info('PostMessagePlugin (MD ContentScript): Got message:', message);
            const response = message + '+responseFromMdContentScriptHandler';
            console.info('PostMessagePlugin (MD ContentScript): Responding with:', response);
            return response;
        });
    });
}
function setContentScriptCodeMirror() {
    return __awaiter(this, void 0, void 0, function* () {
        const contentScriptId = 'contentScriptCodeMirror';
        yield api_1.default.contentScripts.register(types_1.ContentScriptType.CodeMirrorPlugin, contentScriptId, './contentScriptCodeMirror.js');
        yield api_1.default.contentScripts.onMessage(contentScriptId, (message) => {
            console.info('PostMessagePlugin (CodeMirror ContentScript): Got message:', message);
            const response = message + '+responseFromCodeMirrorScriptHandler';
            console.info('PostMessagePlugin (CodeMirror ContentScript): Responding with:', response);
            return response;
        });
    });
}
function setupWebviewPanel() {
    return __awaiter(this, void 0, void 0, function* () {
        const panels = api_1.default.views.panels;
        const view = yield panels.create('postMessageTestView');
        yield panels.setHtml(view, '<p style="border: 1px solid blue; padding: 10px;">This is a custom webview. <a class="webview-test-link" href="#">Click to test postMessage</a></p>');
        yield panels.addScript(view, './webview.js');
        yield panels.addScript(view, './webview.css');
        panels.onMessage(view, (message) => {
            console.info('PostMessagePlugin (Webview): Got message from webview:', message);
            const response = message + '+responseFromWebviewPanel';
            console.info('PostMessagePlugin (Webview): Responding with:', response);
            return response;
        });
        panels.show(view, true);
        var intervalID = setInterval(() => {
            console.info('check if webview is ready...');
            if (panels.visible(view)) {
                console.info('plugin: sending message to webview. ');
                panels.postMessage(view, 'testingPluginMessage');
            }
            clearInterval(intervalID);
        }, 500);
    });
}
api_1.default.plugins.register({
    onStart: function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield setupContentScriptMarkdownIt();
            yield setContentScriptCodeMirror();
            yield setupWebviewPanel();
        });
    },
});
//# sourceMappingURL=index.js.map