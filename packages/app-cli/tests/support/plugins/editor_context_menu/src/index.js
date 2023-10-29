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
                name: 'sayHi',
                label: 'Say Hi',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    yield api_1.default.commands.execute('replaceSelection', 'hi!');
                }),
            });
            yield api_1.default.views.menuItems.create('myContextMenuItem', 'sayHi', types_1.MenuItemLocation.EditorContextMenu);
        });
    },
});
//# sourceMappingURL=index.js.map