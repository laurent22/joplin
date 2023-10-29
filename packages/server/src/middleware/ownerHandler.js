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
function default_1(ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const sessionId = (0, requestUtils_1.contextSessionId)(ctx, false);
        const owner = sessionId ? yield ctx.joplin.models.session().sessionUser(sessionId) : null;
        ctx.joplin.owner = owner;
        return next();
    });
}
exports.default = default_1;
//# sourceMappingURL=ownerHandler.js.map