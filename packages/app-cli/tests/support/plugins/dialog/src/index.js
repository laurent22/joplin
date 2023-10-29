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
            const dialogs = api_1.default.views.dialogs;
            const handle = yield dialogs.create('myDialog1');
            yield dialogs.setHtml(handle, '<p>Testing dialog with default buttons</p><p>Second line</p><p>Third linexxx</p>');
            const result = yield dialogs.open(handle);
            console.info('Got result: ' + JSON.stringify(result));
            const handle2 = yield dialogs.create('myDialog2');
            yield dialogs.setHtml(handle2, '<p>Testing dialog with custom buttons</p><p>Second line</p><p>Third line</p>');
            yield dialogs.setButtons(handle2, [
                {
                    id: 'ok',
                },
                {
                    id: 'cancel',
                },
                {
                    id: 'moreInfo',
                    title: 'More info',
                },
            ]);
            const result2 = yield dialogs.open(handle2);
            console.info('Got result: ' + JSON.stringify(result2));
            const handle3 = yield dialogs.create('myDialog3');
            yield dialogs.setHtml(handle3, `
		<p>Testing dialog with form elements</p>
		<form name="user">
			Name: <input type="text" name="name"/>
			<br/>
			Email: <input type="text" name="email"/>
			<br/>
			Description: <textarea name="desc"></textarea>
		</form>
		`);
            const result3 = yield dialogs.open(handle3);
            console.info('Got result: ' + JSON.stringify(result3));
            const handle4 = yield dialogs.create('myDialog4');
            yield dialogs.setHtml(handle4, `
		<h1>This dialog tests dynamic sizing</h1>
		<h3>Resize the window and the dialog should resize accordingly</h3>
		<p>
			Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
			Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
			Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
			Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum
		</p>
		`);
            let tmpDlg = dialogs; // Temporary cast to use new properties.
            yield tmpDlg.setFitToContent(handle4, false);
            yield dialogs.open(handle4);
        });
    },
});
//# sourceMappingURL=index.js.map