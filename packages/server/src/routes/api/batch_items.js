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
const items_1 = require("./items");
const router = new Router_1.default(types_1.RouteType.Api);
router.put('api/batch_items', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const output = {
        items: yield (0, items_1.putItemContents)(path, ctx, true),
        has_more: false,
    };
    return output;
}));
exports.default = router;
//# sourceMappingURL=batch_items.js.map