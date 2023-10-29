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
const users_1 = require("./users");
const UserModel_1 = require("../../models/UserModel");
const errors_1 = require("../../utils/errors");
const cookies_1 = require("../../utils/cookies");
function makeView(error = null) {
    const view = (0, defaultView_1.default)('signup', 'Sign Up');
    view.content = {
        error,
        postUrl: (0, routeUtils_1.makeUrl)(routeUtils_1.UrlType.Signup),
        loginUrl: (0, routeUtils_1.makeUrl)(routeUtils_1.UrlType.Login),
    };
    return view;
}
const router = new Router_1.default(types_1.RouteType.Web);
router.public = true;
router.get('signup', (_path, _ctx) => __awaiter(void 0, void 0, void 0, function* () {
    return makeView();
}));
router.post('signup', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, config_1.default)().signupEnabled)
        throw new errors_1.ErrorForbidden('Signup is not enabled');
    try {
        const formUser = yield (0, requestUtils_1.bodyFields)(ctx.req);
        const password = (0, users_1.checkRepeatPassword)(formUser, true);
        const user = yield ctx.joplin.models.user().save({
            account_type: UserModel_1.AccountType.Basic,
            email: formUser.email,
            full_name: formUser.full_name,
            password,
        });
        const session = yield ctx.joplin.models.session().createUserSession(user.id);
        (0, cookies_1.cookieSet)(ctx, 'sessionId', session.id);
        return (0, routeUtils_1.redirect)(ctx, `${(0, config_1.default)().baseUrl}/home`);
    }
    catch (error) {
        return makeView(error);
    }
}));
exports.default = router;
//# sourceMappingURL=signup.js.map