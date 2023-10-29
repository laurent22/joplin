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
const types_2 = require("../../services/database/types");
const pagination_1 = require("../../models/utils/pagination");
const time_1 = require("../../utils/time");
const defaultView_1 = require("../../utils/defaultView");
const table_1 = require("../../utils/views/table");
const config_1 = require("../../config");
const errors_1 = require("../../utils/errors");
const router = new Router_1.default(types_1.RouteType.Web);
router.get('changes', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (!ctx.joplin.owner.is_admin)
        throw new errors_1.ErrorForbidden();
    const pagination = (0, table_1.makeTablePagination)(ctx.query, 'updated_time', pagination_1.PaginationOrderDir.DESC);
    const paginatedChanges = yield ctx.joplin.models.change().allByUser(ctx.joplin.owner.id, pagination);
    const items = yield ctx.joplin.models.item().loadByIds(paginatedChanges.items.map(i => i.item_id), { fields: ['id'] });
    const table = {
        baseUrl: ctx.joplin.models.change().changeUrl(),
        requestQuery: ctx.query,
        pageCount: paginatedChanges.page_count,
        pagination,
        headers: [
            {
                name: 'item_name',
                label: 'Name',
                stretch: true,
            },
            {
                name: 'type',
                label: 'Type',
            },
            {
                name: 'updated_time',
                label: 'Timestamp',
            },
        ],
        rows: paginatedChanges.items.map(change => {
            const row = {
                items: [
                    {
                        value: change.item_name,
                        stretch: true,
                        url: (0, config_1.showItemUrls)((0, config_1.default)()) ? (items.find(i => i.id === change.item_id) ? ctx.joplin.models.item().itemContentUrl(change.item_id) : '') : null,
                    },
                    {
                        value: (0, types_2.changeTypeToString)(change.type),
                    },
                    {
                        value: (0, time_1.formatDateTime)(change.updated_time),
                    },
                ],
            };
            return row;
        }),
    };
    const view = (0, defaultView_1.default)('changes', 'Log');
    view.content.changeTable = (0, table_1.makeTableView)(table),
        view.cssFiles = ['index/changes'];
    return view;
}));
exports.default = router;
//# sourceMappingURL=changes.js.map