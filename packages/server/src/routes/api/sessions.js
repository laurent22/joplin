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
const requestUtils_1 = require("../../utils/requestUtils");
const limiterLoginBruteForce_1 = require("../../utils/request/limiterLoginBruteForce");
const router = new Router_1.default(types_1.RouteType.Api);
router.public = true;
router.post('api/sessions', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, limiterLoginBruteForce_1.default)((0, requestUtils_1.userIp)(ctx));
    const fields = yield (0, requestUtils_1.bodyFields)(ctx.req);
    const user = yield ctx.joplin.models.user().login(fields.email, fields.password);
    if (!user)
        throw new errors_1.ErrorForbidden('Invalid username or password', { details: { email: fields.email } });
    const session = yield ctx.joplin.models.session().createUserSession(user.id);
    return { id: session.id, user_id: session.user_id };
}));
exports.default = router;
//# sourceMappingURL=sessions.js.map