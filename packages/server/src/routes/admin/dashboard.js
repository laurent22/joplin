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
const defaultView_1 = require("../../utils/defaultView");
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const router = new Router_1.default(types_1.RouteType.Web);
router.get('admin/dashboard', (_path, _ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const view = (0, defaultView_1.default)('admin/dashboard', (0, locale_1._)('Admin dashboard'));
    return view;
}));
exports.default = router;
//# sourceMappingURL=dashboard.js.map