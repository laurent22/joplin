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
const debugTools_1 = require("../../tools/debugTools");
const requestUtils_1 = require("../../utils/requestUtils");
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const errors_1 = require("../../utils/errors");
const router = new Router_1.default(types_1.RouteType.Api);
router.public = true;
router.post('api/debug', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if ((0, config_1.default)().env !== types_1.Env.Dev)
        throw new errors_1.ErrorForbidden();
    const query = (yield (0, requestUtils_1.bodyFields)(ctx.req));
    const models = ctx.joplin.models;
    console.info(`Action: ${query.action}`);
    if (query.action === 'createTestUsers') {
        const options = {};
        if ('count' in query)
            options.count = query.count;
        if ('fromNum' in query)
            options.fromNum = query.fromNum;
        yield (0, debugTools_1.createTestUsers)(ctx.joplin.db, (0, config_1.default)(), options);
    }
    if (query.action === 'createUserDeletions') {
        yield (0, debugTools_1.createUserDeletions)(ctx.joplin.db, (0, config_1.default)());
    }
    if (query.action === 'clearDatabase') {
        yield (0, debugTools_1.clearDatabase)(ctx.joplin.db);
    }
    if (query.action === 'clearKeyValues') {
        yield models.keyValue().deleteAll();
    }
}));
exports.default = router;
//# sourceMappingURL=debug.js.map