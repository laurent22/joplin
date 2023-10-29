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
const LockHandler_1 = require("@joplin/lib/services/synchronizer/LockHandler");
const requestUtils_1 = require("../../utils/requestUtils");
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const router = new Router_1.default(types_1.RouteType.Api);
router.post('api/locks', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const fields = yield (0, requestUtils_1.bodyFields)(ctx.req);
    return ctx.joplin.models.lock().acquireLock(ctx.joplin.owner.id, fields.type, fields.clientType, fields.clientId);
}));
router.del('api/locks/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const lock = (0, LockHandler_1.lockNameToObject)(path.id);
    yield ctx.joplin.models.lock().releaseLock(ctx.joplin.owner.id, lock.type, lock.clientType, lock.clientId);
}));
router.get('api/locks', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    return {
        items: yield ctx.joplin.models.lock().allLocks(ctx.joplin.owner.id),
        has_more: false,
    };
}));
exports.default = router;
//# sourceMappingURL=locks.js.map