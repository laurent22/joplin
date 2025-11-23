"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const types_1 = require("../../../models/utils/types");
const errors_1 = require("./errors");
function requestPaginationOrder(request) {
    const orderBy = request.query.order_by ? request.query.order_by : 'updated_time';
    const orderDir = request.query.order_dir ? request.query.order_dir : types_1.PaginationOrderDir.ASC;
    return [{
            by: orderBy,
            dir: orderDir,
            caseInsensitive: true,
        }];
}
function default_1(request) {
    const limit = request.query.limit ? request.query.limit : 100;
    if (limit < 0 || limit > 100)
        throw new errors_1.ErrorBadRequest(`Limit out of bond: ${limit}`);
    const order = requestPaginationOrder(request);
    const page = request.query.page || 1;
    return { limit, order, page };
}
