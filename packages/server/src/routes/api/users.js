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
const requestUtils_1 = require("../../utils/requestUtils");
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const errors_1 = require("../../utils/errors");
const BaseModel_1 = require("../../models/BaseModel");
const uuidgen_1 = require("../../utils/uuidgen");
const router = new Router_1.default(types_1.RouteType.Api);
function fetchUser(path, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield ctx.joplin.models.user().load(path.id);
        if (!user)
            throw new errors_1.ErrorNotFound(`No user with ID ${path.id}`);
        return user;
    });
}
function postedUserFromContext(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        return ctx.joplin.models.user().fromApiInput(yield (0, requestUtils_1.bodyFields)(ctx.req));
    });
}
router.get('api/users/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield fetchUser(path, ctx);
    yield ctx.joplin.models.user().checkIfAllowed(ctx.joplin.owner, BaseModel_1.AclAction.Read, user);
    return user;
}));
router.publicSchemas.push('api/users/:id/public_key');
// "id" in this case is actually the email address
router.get('api/users/:id/public_key', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield ctx.joplin.models.user().loadByEmail(path.id);
    if (!user)
        return ''; // Don't throw an error to prevent polling the end point
    const ppk = yield ctx.joplin.models.user().publicPrivateKey(user.id);
    if (!ppk)
        return '';
    return {
        id: ppk.id,
        publicKey: ppk.publicKey,
    };
}));
router.post('api/users', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.joplin.models.user().checkIfAllowed(ctx.joplin.owner, BaseModel_1.AclAction.Create);
    const user = yield postedUserFromContext(ctx);
    // We set a random password because it's required, but user will have to
    // set it after clicking on the confirmation link.
    user.password = (0, uuidgen_1.default)();
    user.must_set_password = 1;
    user.email_confirmed = 0;
    const output = yield ctx.joplin.models.user().save(user);
    return ctx.joplin.models.user().toApiOutput(output);
}));
router.get('api/users', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.joplin.models.user().checkIfAllowed(ctx.joplin.owner, BaseModel_1.AclAction.List);
    return {
        items: yield ctx.joplin.models.user().all(),
        has_more: false,
    };
}));
router.del('api/users/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield fetchUser(path, ctx);
    yield ctx.joplin.models.user().checkIfAllowed(ctx.joplin.owner, BaseModel_1.AclAction.Delete, user);
    yield ctx.joplin.models.user().delete(user.id);
}));
router.patch('api/users/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield fetchUser(path, ctx);
    yield ctx.joplin.models.user().checkIfAllowed(ctx.joplin.owner, BaseModel_1.AclAction.Update, user);
    const postedUser = yield postedUserFromContext(ctx);
    yield ctx.joplin.models.user().save(Object.assign({ id: user.id }, postedUser));
}));
exports.default = router;
//# sourceMappingURL=users.js.map