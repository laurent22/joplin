"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderUserIcon = exports.tablePartials = exports.makeTableView = exports.makeTablePagination = void 0;
const pagination_1 = require("../../models/utils/pagination");
const urlUtils_1 = require("../urlUtils");
const defaultSortOrder = pagination_1.PaginationOrderDir.ASC;
function headerIsSelectedClass(name, pagination) {
    if (!pagination)
        return '';
    const orderBy = pagination.order[0].by;
    return name === orderBy ? 'is-selected' : '';
}
function headerSortIconDir(name, pagination) {
    if (!pagination)
        return '';
    const orderBy = pagination.order[0].by;
    const orderDir = orderBy === name ? pagination.order[0].dir : defaultSortOrder;
    return orderDir === pagination_1.PaginationOrderDir.ASC ? 'up' : 'down';
}
function headerNextOrder(name, pagination) {
    if (name !== pagination.order[0].by)
        return defaultSortOrder;
    return pagination.order[0].dir === pagination_1.PaginationOrderDir.ASC ? pagination_1.PaginationOrderDir.DESC : pagination_1.PaginationOrderDir.ASC;
}
function makeTablePagination(query, defaultOrderField, defaultOrderDir) {
    const limit = Number(query.limit) || pagination_1.pageMaxSize;
    const order = (0, pagination_1.requestPaginationOrder)(query, defaultOrderField, defaultOrderDir);
    const page = 'page' in query ? Number(query.page) : 1;
    const output = { limit, order, page };
    (0, pagination_1.validatePagination)(output);
    return output;
}
exports.makeTablePagination = makeTablePagination;
function makeHeaderView(header, parentBaseUrl, baseUrlQuery, pagination) {
    const canSort = header.canSort !== false;
    return {
        label: header.label,
        sortLink: !pagination || !canSort ? null : (0, urlUtils_1.setQueryParameters)(parentBaseUrl, Object.assign(Object.assign({}, baseUrlQuery), { 'order_by': header.name, 'order_dir': headerNextOrder(header.name, pagination) })),
        classNames: [header.stretch ? 'stretch' : 'nowrap', headerIsSelectedClass(header.name, pagination)],
        iconDir: headerSortIconDir(header.name, pagination),
    };
}
function makeRowView(row) {
    return {
        classNames: row.classNames,
        items: row.items.map(rowItem => {
            let classNames = [rowItem.stretch ? 'stretch' : 'nowrap'];
            if (rowItem.classNames)
                classNames = classNames.concat(rowItem.classNames);
            return {
                value: rowItem.value,
                valueHtml: rowItem.render ? rowItem.render() : '',
                classNames,
                url: rowItem.url,
                checkbox: rowItem.checkbox,
                hint: rowItem.hint,
            };
        }),
    };
}
function makeTableView(table) {
    let paginationLinks = [];
    let baseUrlQuery = null;
    let pagination = null;
    if (table.pageCount) {
        if (!table.baseUrl || !table.requestQuery)
            throw new Error('Table.baseUrl and Table.requestQuery are required for pagination when there is more than one page');
        baseUrlQuery = table.requestQuery; // filterPaginationQueryParams(table.requestQuery);
        pagination = table.pagination;
        paginationLinks = (0, pagination_1.createPaginationLinks)(pagination.page, table.pageCount, (0, urlUtils_1.setQueryParameters)(table.baseUrl, Object.assign(Object.assign({}, baseUrlQuery), { 'page': 'PAGE_NUMBER' })));
    }
    return {
        headers: table.headers.map(h => makeHeaderView(h, table.baseUrl, baseUrlQuery, pagination)),
        rows: table.rows.map(r => makeRowView(r)),
        paginationLinks,
    };
}
exports.makeTableView = makeTableView;
function tablePartials() {
    return ['pagination', 'table', 'tableHeader', 'tableRowItem'];
}
exports.tablePartials = tablePartials;
const renderUserIcon = () => {
    return '<i class="fas fa-user-alt"></i>';
};
exports.renderUserIcon = renderUserIcon;
//# sourceMappingURL=table.js.map