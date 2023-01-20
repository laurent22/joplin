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
const urlUtils_1 = require("../../utils/urlUtils");
const requestUtils_1 = require("../../utils/requestUtils");
const Logger_1 = require("@joplin/lib/Logger");
const logger = Logger_1.default.create('index/password');
const router = new Router_1.default(types_1.RouteType.Web);
router.public = true;
const subRoutes = {
    forgot: (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        let confirmationMessage = '';
        if (ctx.method === 'POST') {
            const fields = yield (0, requestUtils_1.bodyFields)(ctx.req);
            try {
                yield ctx.joplin.models.user().sendResetPasswordEmail(fields.email || '');
            }
            catch (error) {
                logger.warn(`Could not send reset email for ${fields.email}`, error);
            }
            confirmationMessage = 'If we have an account that matches your email, you should receive an email with instructions on how to reset your password shortly.';
        }
        const view = (0, defaultView_1.default)('password/forgot', 'Reset password');
        view.content = {
            postUrl: (0, urlUtils_1.forgotPasswordUrl)(),
            confirmationMessage,
        };
        return view;
    }),
    reset: (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        let successMessage = '';
        let error = null;
        const token = ctx.query.token;
        if (ctx.method === 'POST') {
            const fields = yield (0, requestUtils_1.bodyFields)(ctx.req);
            try {
                yield ctx.joplin.models.user().resetPassword(token, fields);
                successMessage = 'Your password was successfully reset.';
            }
            catch (e) {
                error = e;
            }
        }
        const view = (0, defaultView_1.default)('password/reset', 'Reset password');
        view.content = {
            postUrl: (0, urlUtils_1.resetPasswordUrl)(token),
            error,
            successMessage,
        };
        view.jsFiles.push('zxcvbn');
        return view;
    }),
};
router.get('password/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (!subRoutes[path.id])
        throw new errors_1.ErrorNotFound(`Not found: password/${path.id}`);
    return subRoutes[path.id](path, ctx);
}));
router.post('password/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (!subRoutes[path.id])
        throw new errors_1.ErrorNotFound(`Not found: password/${path.id}`);
    return subRoutes[path.id](path, ctx);
}));
exports.default = router;
//# sourceMappingURL=password.js.map