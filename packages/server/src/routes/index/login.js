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
const routeUtils_1 = require("../../utils/routeUtils");
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const requestUtils_1 = require("../../utils/requestUtils");
const config_1 = require("../../config");
const defaultView_1 = require("../../utils/defaultView");
const limiterLoginBruteForce_1 = require("../../utils/request/limiterLoginBruteForce");
const cookies_1 = require("../../utils/cookies");
function makeView(error = null) {
    const view = (0, defaultView_1.default)('login', 'Login');
    view.content = {
        error,
        signupUrl: (0, config_1.default)().signupEnabled || (0, config_1.default)().isJoplinCloud ? (0, routeUtils_1.makeUrl)(routeUtils_1.UrlType.Signup) : '',
    };
    return view;
}
const router = new Router_1.default(types_1.RouteType.Web);
router.public = true;
router.get('login', (_path, _ctx) => __awaiter(void 0, void 0, void 0, function* () {
    return makeView();
}));
router.post('login', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, limiterLoginBruteForce_1.default)((0, requestUtils_1.userIp)(ctx));
    try {
        const body = yield (0, requestUtils_1.formParse)(ctx.req);
        const session = yield ctx.joplin.models.session().authenticate(body.fields.email, body.fields.password);
        (0, cookies_1.cookieSet)(ctx, 'sessionId', session.id);
        return (0, routeUtils_1.redirect)(ctx, `${(0, config_1.default)().baseUrl}/home`);
    }
    catch (error) {
        return makeView(error);
    }
}));
exports.default = router;
//# sourceMappingURL=login.js.map