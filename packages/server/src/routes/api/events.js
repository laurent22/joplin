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
const errors_1 = require("../../utils/errors");
const requestUtils_1 = require("../../utils/requestUtils");
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const supportedEvents = {
    syncStart: (_ctx) => __awaiter(void 0, void 0, void 0, function* () {
        // await ctx.joplin.models.share().updateSharedItems2(ctx.joplin.owner.id);
    }),
};
const router = new Router_1.default(types_1.RouteType.Api);
router.post('api/events', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const event = yield (0, requestUtils_1.bodyFields)(ctx.req);
    if (!supportedEvents[event.name])
        throw new errors_1.ErrorNotFound(`Unknown event name: ${event.name}`);
    yield supportedEvents[event.name](ctx);
}));
exports.default = router;
//# sourceMappingURL=events.js.map