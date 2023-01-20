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
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const errors_1 = require("../../utils/errors");
const defaultView_1 = require("../../utils/defaultView");
const router = new Router_1.default(types_1.RouteType.Web);
router.public = true;
router.get('help', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (ctx.method === 'GET') {
        const view = (0, defaultView_1.default)('help', 'Help');
        return view;
    }
    throw new errors_1.ErrorMethodNotAllowed();
}));
exports.default = router;
//# sourceMappingURL=help.js.map