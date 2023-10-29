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
const config_1 = require("../../config");
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const router = new Router_1.default(types_1.RouteType.Api);
router.public = true;
router.get('api/ping', () => __awaiter(void 0, void 0, void 0, function* () {
    return { status: 'ok', message: `${(0, config_1.default)().appName} is running` };
}));
exports.default = router;
//# sourceMappingURL=ping.js.map