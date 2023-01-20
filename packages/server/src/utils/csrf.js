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
exports.createCsrfTag = exports.createCsrfTokenFromContext = exports.createCsrfToken = exports.csrfCheck = void 0;
const errors_1 = require("./errors");
const htmlUtils_1 = require("./htmlUtils");
const requestUtils_1 = require("./requestUtils");
function csrfCheck(ctx, isPublicRoute) {
    return __awaiter(this, void 0, void 0, function* () {
        if ((0, requestUtils_1.isApiRequest)(ctx))
            return;
        if (isPublicRoute)
            return;
        if (!['POST', 'PUT'].includes(ctx.method))
            return;
        if (ctx.path === '/logout')
            return;
        const userId = ctx.joplin.owner ? ctx.joplin.owner.id : '';
        if (!userId)
            return;
        const fields = yield (0, requestUtils_1.bodyFields)(ctx.req);
        if (!fields._csrf)
            throw new errors_1.ErrorForbidden('CSRF token is missing');
        if (Array.isArray(fields._csrf))
            throw new Error('Multiple CSRF tokens inside the form!');
        if (!(yield ctx.joplin.models.token().isValid(userId, fields._csrf))) {
            throw new errors_1.ErrorForbidden(`Invalid CSRF token: ${fields._csrf}`);
        }
        yield ctx.joplin.models.token().deleteByValue(userId, fields._csrf);
    });
}
exports.csrfCheck = csrfCheck;
function createCsrfToken(models, user, throwOnError = true) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!user) {
            if (!throwOnError)
                return '';
            throw new Error('Cannot create CSRF token without a user');
        }
        return models.token().generate(user.id);
    });
}
exports.createCsrfToken = createCsrfToken;
function createCsrfTokenFromContext(ctx, throwOnError = true) {
    return __awaiter(this, void 0, void 0, function* () {
        return createCsrfToken(ctx.joplin.models, ctx.joplin.owner, throwOnError);
    });
}
exports.createCsrfTokenFromContext = createCsrfTokenFromContext;
function createCsrfTag(ctx, throwOnError = true) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = yield createCsrfTokenFromContext(ctx, throwOnError);
        return `<input type="hidden" name="_csrf" value="${(0, htmlUtils_1.escapeHtml)(token)}"/>`;
    });
}
exports.createCsrfTag = createCsrfTag;
//# sourceMappingURL=csrf.js.map