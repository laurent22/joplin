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
const requestUtils_1 = require("../../utils/requestUtils");
const errors_1 = require("../../utils/errors");
const router = new Router_1.default(types_1.RouteType.Web);
router.patch('notifications/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const fields = yield (0, requestUtils_1.bodyFields)(ctx.req);
    const notificationId = path.id;
    const model = ctx.joplin.models.notification();
    const existingNotification = yield model.load(notificationId);
    if (!existingNotification)
        throw new errors_1.ErrorNotFound();
    const toSave = {};
    if ('read' in fields)
        toSave.read = fields.read;
    if (!Object.keys(toSave).length)
        return;
    toSave.id = notificationId;
    yield model.save(toSave);
}));
exports.default = router;
//# sourceMappingURL=notifications.js.map