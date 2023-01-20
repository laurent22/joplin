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
exports.paginateDbQuery = exports.createPaginationLinks = exports.filterPaginationQueryParams = exports.queryParamsToPagination = exports.paginationToQueryParams = exports.requestPagination = exports.validatePagination = exports.requestPaginationOrder = exports.defaultPagination = exports.pageMaxSize = exports.PaginationOrderDir = void 0;
const errors_1 = require("../../utils/errors");
const base64_1 = require("../../utils/base64");
var PaginationOrderDir;
(function (PaginationOrderDir) {
    PaginationOrderDir["ASC"] = "asc";
    PaginationOrderDir["DESC"] = "desc";
})(PaginationOrderDir = exports.PaginationOrderDir || (exports.PaginationOrderDir = {}));
exports.pageMaxSize = 100;
const defaultOrderField_ = 'updated_time';
const defaultOrderDir_ = PaginationOrderDir.DESC;
function defaultPagination() {
    return {
        limit: exports.pageMaxSize,
        order: [
            {
                by: defaultOrderField_,
                dir: defaultOrderDir_,
            },
        ],
        page: 1,
    };
}
exports.defaultPagination = defaultPagination;
function dbOffset(pagination) {
    return pagination.limit * (pagination.page - 1);
}
function requestPaginationOrder(query, defaultOrderField = null, defaultOrderDir = null) {
    if (defaultOrderField === null)
        defaultOrderField = defaultOrderField_;
    if (defaultOrderDir === null)
        defaultOrderDir = defaultOrderDir_;
    const orderBy = 'order_by' in query ? query.order_by : defaultOrderField;
    const orderDir = 'order_dir' in query ? query.order_dir : defaultOrderDir;
    if (![PaginationOrderDir.ASC, PaginationOrderDir.DESC].includes(orderDir))
        throw new errors_1.ErrorBadRequest(`Invalid order_dir parameter: ${orderDir}`);
    return [{
            by: orderBy,
            dir: orderDir,
        }];
}
exports.requestPaginationOrder = requestPaginationOrder;
function validatePagination(p) {
    if (p.limit < 0 || p.limit > exports.pageMaxSize)
        throw new errors_1.ErrorBadRequest(`Limit out of bond: ${p.limit}`);
    if (p.page <= 0)
        throw new errors_1.ErrorBadRequest(`Invalid page number: ${p.page}`);
    for (const o of p.order) {
        if (![PaginationOrderDir.ASC, PaginationOrderDir.DESC].includes(o.dir))
            throw new errors_1.ErrorBadRequest(`Invalid order_dir parameter: ${o.dir}`);
    }
    return p;
}
exports.validatePagination = validatePagination;
function processCursor(pagination) {
    // If a cursor is present, we parse it and move to the next page.
    if (pagination.cursor) {
        const p = validatePagination(JSON.parse((0, base64_1.decodeBase64)(pagination.cursor)));
        p.page++;
        return p;
    }
    return pagination;
}
function requestPagination(query) {
    if (!query)
        return defaultPagination();
    if ('cursor' in query) {
        return processCursor(query);
    }
    const limit = 'limit' in query ? query.limit : exports.pageMaxSize;
    const order = requestPaginationOrder(query);
    const page = 'page' in query ? query.page : 1;
    return validatePagination({ limit, order, page });
}
exports.requestPagination = requestPagination;
function paginationToQueryParams(pagination) {
    const output = {};
    if (!pagination)
        return {};
    if ('limit' in pagination)
        output.limit = pagination.limit;
    if ('page' in pagination)
        output.page = pagination.page;
    if ('cursor' in pagination)
        output.cursor = pagination.cursor;
    if ('order' in pagination) {
        const o = pagination.order;
        if (o.length) {
            output.order_by = o[0].by;
            output.order_dir = o[0].dir;
        }
    }
    return output;
}
exports.paginationToQueryParams = paginationToQueryParams;
function queryParamsToPagination(query) {
    const limit = Number(query.limit) || exports.pageMaxSize;
    const order = requestPaginationOrder(query);
    const page = 'page' in query ? Number(query.page) : 1;
    const output = { limit, order, page };
    validatePagination(output);
    return output;
}
exports.queryParamsToPagination = queryParamsToPagination;
function filterPaginationQueryParams(query) {
    if (!query)
        return {};
    const baseUrlQuery = {};
    if (query.limit)
        baseUrlQuery.limit = query.limit;
    if (query.order_by)
        baseUrlQuery.order_by = query.order_by;
    if (query.order_dir)
        baseUrlQuery.order_dir = query.order_dir;
    return baseUrlQuery;
}
exports.filterPaginationQueryParams = filterPaginationQueryParams;
function createPaginationLinks(page, pageCount, urlTemplate = null) {
    if (!pageCount)
        return [];
    let output = [];
    const firstPage = Math.max(page - 2, 1);
    for (let p = firstPage; p <= firstPage + 4; p++) {
        if (p > pageCount)
            break;
        output.push({ page: p });
    }
    const firstPages = [];
    for (let p = 1; p <= 2; p++) {
        if (output.find(o => o.page === p) || p > pageCount)
            continue;
        firstPages.push({ page: p });
    }
    if (firstPages.length && output.length && (output[0].page - firstPages[firstPages.length - 1].page) > 1) {
        firstPages.push({ isEllipsis: true });
    }
    output = firstPages.concat(output);
    const lastPages = [];
    for (let p = pageCount - 1; p <= pageCount; p++) {
        if (output.find(o => o.page === p) || p > pageCount || p < 1)
            continue;
        lastPages.push({ page: p });
    }
    if (lastPages.length && (lastPages[0].page - output[output.length - 1].page) > 1) {
        output.push({ isEllipsis: true });
    }
    output = output.concat(lastPages);
    output = output.map(o => {
        return o.page === page ? Object.assign(Object.assign({}, o), { isCurrent: true }) : o;
    });
    if (urlTemplate) {
        output = output.map(o => {
            if (o.isEllipsis)
                return o;
            return Object.assign(Object.assign({}, o), { url: urlTemplate.replace(/PAGE_NUMBER/, o.page.toString()) });
        });
    }
    return output;
}
exports.createPaginationLinks = createPaginationLinks;
// function applyMainTablePrefix(pagination:Pagination, mainTable:string):Pagination {
// 	if (!mainTable) return pagination;
// 	const output:Pagination = JSON.parse(JSON.stringify(pagination));
// 	output.order = output.order.map(o => {
// 		o.by = mainTable + '.' + o.by;
// 		return o;
// 	});
// 	return output;
// }
function paginateDbQuery(query, pagination, mainTable = '') {
    return __awaiter(this, void 0, void 0, function* () {
        pagination = Object.assign(Object.assign({}, defaultPagination()), pagination);
        pagination = processCursor(pagination);
        const orderSql = pagination.order.map(o => {
            return {
                column: (mainTable ? `${mainTable}.` : '') + o.by,
                order: o.dir,
            };
        });
        const items = yield query
            .orderBy(orderSql)
            .offset(dbOffset(pagination))
            .limit(pagination.limit);
        const hasMore = items.length >= pagination.limit;
        return {
            items,
            has_more: hasMore,
            cursor: hasMore ? (0, base64_1.encodeBase64)(JSON.stringify(pagination)) : null,
        };
    });
}
exports.paginateDbQuery = paginateDbQuery;
//# sourceMappingURL=pagination.js.map