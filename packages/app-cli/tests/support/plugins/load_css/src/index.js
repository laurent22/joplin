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
api_1.default.plugins.register({
    onStart: function () {
        return __awaiter(this, void 0, void 0, function* () {
            const installDir = yield api_1.default.plugins.installationDir();
            const chromeCssFilePath = installDir + '/chrome.css';
            const noteCssFilePath = installDir + '/note.css';
            yield api_1.default.window.loadChromeCssFile(chromeCssFilePath);
            yield api_1.default.window.loadNoteCssFile(noteCssFilePath);
        });
    },
});
//# sourceMappingURL=index.js.map