"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const paginationToSql_1 = require("./paginationToSql");
// Note: this method might return more fields than was requested as it will
// also return fields that are necessary for pagination.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function default_1(db, tableName, pagination, whereQuery = null, fields = null) {
    fields = fields ? fields.slice() : ['id'];
    const where = whereQuery && whereQuery.sql ? [whereQuery.sql] : [];
    const sqlParams = whereQuery && whereQuery.params ? whereQuery.params.slice() : [];
    if (!pagination.order.length)
        throw new Error('Pagination order must be provided');
    if (pagination.order.length > 1)
        throw new Error('Only one pagination order field can be provided');
    const paginationOrder = pagination.order[0].dir;
    if (!pagination.order.find((o) => o.by === 'id')) {
        pagination = Object.assign(Object.assign({}, pagination), { order: pagination.order.concat([{
                    by: 'id',
                    dir: paginationOrder,
                    caseInsensitive: false,
                }]) });
    }
    const orderBySql = (0, paginationToSql_1.default)(pagination);
    const fieldsSql = fields.length ? db.escapeFields(fields) : '*';
    const offset = (pagination.page - 1) * pagination.limit;
    const sql = `
		SELECT ${fieldsSql} FROM \`${tableName}\`
		${where.length ? `WHERE ${where.join(' AND ')}` : ''}
		ORDER BY ${orderBySql}
		LIMIT ${pagination.limit}
		OFFSET ${offset}
	`;
    const rows = await db.selectAll(sql, sqlParams);
    return {
        items: rows,
        has_more: rows.length >= pagination.limit,
    };
}
