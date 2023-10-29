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
exports.stopImpersonating = exports.startImpersonating = exports.getImpersonatorAdminSessionId = void 0;
const cookies_1 = require("../../../../utils/cookies");
const errors_1 = require("../../../../utils/errors");
const requestUtils_1 = require("../../../../utils/requestUtils");
function getImpersonatorAdminSessionId(ctx) {
    return (0, cookies_1.cookieGet)(ctx, 'adminSessionId');
}
exports.getImpersonatorAdminSessionId = getImpersonatorAdminSessionId;
function startImpersonating(ctx, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const adminSessionId = (0, requestUtils_1.contextSessionId)(ctx);
        const user = yield ctx.joplin.models.session().sessionUser(adminSessionId);
        if (!user)
            throw new Error(`No user for session: ${adminSessionId}`);
        if (!user.is_admin)
            throw new errors_1.ErrorForbidden('Impersonator must be an admin');
        const impersonatedSession = yield ctx.joplin.models.session().createUserSession(userId);
        (0, cookies_1.cookieSet)(ctx, 'adminSessionId', adminSessionId);
        (0, cookies_1.cookieSet)(ctx, 'sessionId', impersonatedSession.id);
    });
}
exports.startImpersonating = startImpersonating;
function stopImpersonating(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        const adminSessionId = (0, cookies_1.cookieGet)(ctx, 'adminSessionId');
        if (!adminSessionId)
            throw new Error('Missing cookie adminSessionId');
        // This function simply moves the adminSessionId back to sessionId. There's
        // no need to check if anything is valid because that will be done by other
        // session checking routines. We also don't want this function to fail
        // because it would leave the cookies in an invalid state (for example if
        // the admin has lost their sessions, or the user no longer exists).
        (0, cookies_1.cookieDelete)(ctx, 'adminSessionId');
        (0, cookies_1.cookieSet)(ctx, 'sessionId', adminSessionId);
    });
}
exports.stopImpersonating = stopImpersonating;
//# sourceMappingURL=impersonate.js.map