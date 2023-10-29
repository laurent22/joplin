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
const errors_1 = require("../../utils/errors");
const BaseModel_1 = require("@joplin/lib/BaseModel");
const joplinUtils_1 = require("../../utils/joplinUtils");
const path_utils_1 = require("@joplin/lib/path-utils");
function renderItem(context, item, share) {
    return __awaiter(this, void 0, void 0, function* () {
        if (item.jop_type === BaseModel_1.ModelType.Note) {
            return (0, joplinUtils_1.renderItem)(share.owner_id, item, share, context.query);
        }
        return {
            body: item.content,
            mime: item.mime_type,
            size: item.content_size,
            filename: '',
        };
    });
}
function createContentDispositionHeader(filename) {
    const encoded = encodeURIComponent((0, path_utils_1.friendlySafeFilename)(filename, null, true));
    return `attachment; filename*=UTF-8''${encoded}; filename="${encoded}"`;
}
const router = new Router_1.default(types_1.RouteType.Web);
router.public = true;
router.get('shares/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const shareModel = ctx.joplin.models.share();
    const share = yield shareModel.load(path.id);
    if (!share)
        throw new errors_1.ErrorNotFound();
    const user = yield ctx.joplin.models.user().load(share.owner_id);
    if (!user.enabled)
        throw new errors_1.ErrorForbidden('This account has been disabled');
    const itemModel = ctx.joplin.models.item();
    const item = yield itemModel.loadWithContent(share.item_id);
    if (!item)
        throw new errors_1.ErrorNotFound();
    const result = yield renderItem(ctx, item, share);
    ctx.joplin.models.share().checkShareUrl(share, ctx.URL.origin);
    ctx.response.body = result.body;
    ctx.response.set('Content-Type', result.mime);
    ctx.response.set('Content-Length', result.size.toString());
    if (result.filename)
        ctx.response.set('Content-disposition', createContentDispositionHeader(result.filename));
    return new routeUtils_1.Response(routeUtils_1.ResponseType.KoaResponse, ctx.response);
}), types_1.RouteType.UserContent);
exports.default = router;
//# sourceMappingURL=shares.js.map