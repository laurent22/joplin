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
const config_1 = require("../../config");
const time_1 = require("../../utils/time");
const defaultView_1 = require("../../utils/defaultView");
const table_1 = require("../../utils/views/table");
const pagination_1 = require("../../models/utils/pagination");
const bytes_1 = require("../../utils/bytes");
const router = new Router_1.default(types_1.RouteType.Web);
router.get('items', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (!ctx.joplin.owner.is_admin)
        throw new errors_1.ErrorForbidden();
    const pagination = (0, table_1.makeTablePagination)(ctx.query, 'name', pagination_1.PaginationOrderDir.ASC);
    const paginatedItems = yield ctx.joplin.models.item().children(ctx.joplin.owner.id, '', pagination, { fields: ['id', 'name', 'updated_time', 'mime_type', 'content_size'] });
    const table = {
        baseUrl: ctx.joplin.models.item().itemUrl(),
        requestQuery: ctx.query,
        pageCount: Math.ceil((yield ctx.joplin.models.item().childrenCount(ctx.joplin.owner.id, '')) / pagination.limit),
        pagination,
        headers: [
            {
                name: 'name',
                label: 'Name',
                stretch: true,
            },
            {
                name: 'content_size',
                label: 'Size',
            },
            {
                name: 'mime_type',
                label: 'Mime',
            },
            {
                name: 'updated_time',
                label: 'Timestamp',
            },
        ],
        rows: paginatedItems.items.map(item => {
            const row = {
                items: [
                    {
                        value: item.name,
                        stretch: true,
                        url: (0, config_1.showItemUrls)((0, config_1.default)()) ? `${(0, config_1.default)().userContentBaseUrl}/items/${item.id}/content` : null,
                    },
                    {
                        value: (0, bytes_1.formatBytes)(item.content_size),
                    },
                    {
                        value: item.mime_type || 'binary',
                    },
                    {
                        value: (0, time_1.formatDateTime)(item.updated_time),
                    },
                ],
            };
            return row;
        }),
    };
    const view = (0, defaultView_1.default)('items', 'Items');
    view.content.itemTable = (0, table_1.makeTableView)(table),
        view.content.postUrl = `${(0, config_1.default)().baseUrl}/items`;
    view.cssFiles = ['index/items'];
    return view;
}));
router.get('items/:id/content', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const itemModel = ctx.joplin.models.item();
    const item = yield itemModel.loadWithContent(path.id);
    if (!item)
        throw new errors_1.ErrorNotFound();
    return (0, routeUtils_1.respondWithItemContent)(ctx.response, item, item.content);
}), types_1.RouteType.UserContent);
exports.default = router;
//# sourceMappingURL=items.js.map