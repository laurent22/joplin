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
const defaultView_1 = require("../../utils/defaultView");
const strings_1 = require("../../utils/strings");
const table_1 = require("../../utils/views/table");
const pagination_1 = require("../../models/utils/pagination");
const time_1 = require("../../utils/time");
const urlUtils_1 = require("../../utils/urlUtils");
const csrf_1 = require("../../utils/csrf");
const requestUtils_1 = require("../../utils/requestUtils");
const router = new Router_1.default(types_1.RouteType.Web);
router.get('admin/user_deletions', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ctx.joplin.owner;
    if (!user.is_admin)
        throw new errors_1.ErrorForbidden();
    const pagination = (0, table_1.makeTablePagination)(ctx.query, 'scheduled_time', pagination_1.PaginationOrderDir.ASC);
    const page = yield ctx.joplin.models.userDeletion().allPaginated(pagination);
    const users = yield ctx.joplin.models.user().loadByIds(page.items.map(d => d.user_id), { fields: ['id', 'email'] });
    const table = {
        baseUrl: (0, urlUtils_1.adminUserDeletionsUrl)(),
        requestQuery: ctx.query,
        pageCount: page.page_count,
        pagination,
        headers: [
            {
                name: 'select',
                label: '',
                canSort: false,
            },
            {
                name: 'email',
                label: 'Email',
                stretch: true,
                canSort: false,
            },
            {
                name: 'process_data',
                label: 'Data?',
            },
            {
                name: 'process_account',
                label: 'Account?',
            },
            {
                name: 'scheduled_time',
                label: 'Scheduled',
            },
            {
                name: 'start_time',
                label: 'Start',
            },
            {
                name: 'end_time',
                label: 'End',
            },
            {
                name: 'success',
                label: 'Success?',
            },
            {
                name: 'error',
                label: 'Error',
            },
        ],
        rows: page.items.map(d => {
            const isDone = d.end_time && d.success;
            const row = {
                items: [
                    {
                        value: `checkbox_${d.id}`,
                        checkbox: true,
                    },
                    {
                        value: isDone ? d.user_id : users.find(u => u.id === d.user_id).email,
                        stretch: true,
                        url: isDone ? '' : (0, urlUtils_1.userUrl)(d.user_id),
                    },
                    {
                        value: (0, strings_1.yesOrNo)(d.process_data),
                    },
                    {
                        value: (0, strings_1.yesOrNo)(d.process_account),
                    },
                    {
                        value: (0, time_1.formatDateTime)(d.scheduled_time),
                    },
                    {
                        value: (0, time_1.formatDateTime)(d.start_time),
                    },
                    {
                        value: (0, time_1.formatDateTime)(d.end_time),
                    },
                    {
                        value: d.end_time ? (0, strings_1.yesOrNo)(d.success) : '-',
                    },
                    {
                        value: d.error,
                    },
                ],
            };
            return row;
        }),
    };
    const view = (0, defaultView_1.default)('admin/user_deletions', 'User deletions');
    view.content = {
        userDeletionTable: (0, table_1.makeTableView)(table),
        postUrl: (0, urlUtils_1.adminUserDeletionsUrl)(),
        csrfTag: yield (0, csrf_1.createCsrfTag)(ctx),
    };
    view.cssFiles = ['index/user_deletions'];
    return view;
}));
router.post('admin/user_deletions', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ctx.joplin.owner;
    if (!user.is_admin)
        throw new errors_1.ErrorForbidden();
    const models = ctx.joplin.models;
    const fields = yield (0, requestUtils_1.bodyFields)(ctx.req);
    if (fields.removeButton) {
        const jobIds = Object.keys(fields).filter(f => f.startsWith('checkbox_')).map(f => Number(f.substr(9)));
        for (const jobId of jobIds)
            yield models.userDeletion().remove(jobId);
        yield models.notification().addInfo(user.id, `${jobIds.length} job(s) have been removed`);
    }
    else {
        throw new errors_1.ErrorBadRequest('Invalid action');
    }
    return (0, routeUtils_1.redirect)(ctx, (0, urlUtils_1.adminUserDeletionsUrl)());
}));
exports.default = router;
//# sourceMappingURL=user_deletions.js.map