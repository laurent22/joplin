"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const types_1 = require("../../../models/utils/types");
const requestPaginationOptions_1 = require("../utils/requestPaginationOptions");
const requestFields_1 = require("./requestFields");
// Note that this is inefficient pagination as it requires all the items to
// have been loaded first, even if not all of them are returned.
//
// It's however convenient for smaller lists as it reduces the need for
// building complex SQL queries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function default_1(itemType, items, request, options = null) {
    options = Object.assign({ sort: true }, options);
    const fields = (0, requestFields_1.default)(request, itemType);
    const pagination = (0, requestPaginationOptions_1.default)(request);
    const startIndex = (pagination.page - 1) * pagination.limit;
    const itemCount = Math.min(items.length - startIndex, pagination.limit);
    const hasMore = itemCount >= pagination.limit;
    const sortBy = pagination.order[0].by;
    const sortDir = pagination.order[0].dir;
    const caseInsensitive = pagination.order[0].caseInsensitive;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const sortedItems = items.slice().map((item) => {
        if (!fields.length)
            return item;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const newItem = {};
        for (const k of Object.keys(item)) {
            if (!fields.includes(k))
                continue;
            newItem[k] = item[k];
        }
        return newItem;
    });
    if (options.sort) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        sortedItems.sort((a, b) => {
            let v1 = a && (sortBy in a) ? a[sortBy] : '';
            let v2 = b && (sortBy in b) ? b[sortBy] : '';
            if (caseInsensitive && typeof v1 === 'string')
                v1 = v1.toLowerCase();
            if (caseInsensitive && typeof v2 === 'string')
                v2 = v2.toLowerCase();
            if (sortDir === types_1.PaginationOrderDir.ASC) {
                if (v1 < v2)
                    return -1;
                if (v2 > v1)
                    return +1;
            }
            else {
                if (v1 > v2)
                    return -1;
                if (v2 < v1)
                    return +1;
            }
            return 0;
        });
    }
    return {
        items: sortedItems.slice(startIndex, startIndex + itemCount),
        has_more: hasMore,
    };
}
