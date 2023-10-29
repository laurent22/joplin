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
const requestUtils_1 = require("../utils/requestUtils");
const errors_1 = require("../utils/errors");
const config_1 = require("../config");
const webLogout_1 = require("../utils/webLogout");
function default_1(ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const owner = ctx.joplin.owner;
        if ((0, requestUtils_1.isAdminRequest)(ctx)) {
            if (!(0, config_1.default)().IS_ADMIN_INSTANCE)
                throw new errors_1.ErrorForbidden();
            if (!owner || !owner.is_admin)
                throw new errors_1.ErrorForbidden();
        }
        // This can happen if an instance is switched from admin to non-admin. In
        // that case, the user is still logged in as an admin, but on a non-admin
        // instance so we log him out.
        if (owner && owner.is_admin && !(0, config_1.default)().IS_ADMIN_INSTANCE) {
            yield (0, webLogout_1.default)(ctx);
            throw new errors_1.ErrorForbidden();
        }
        return next();
    });
}
exports.default = default_1;
//# sourceMappingURL=checkAdminHandler.js.map