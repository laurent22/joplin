import paginationToSql from './paginationToSql';
import { Pagination, PaginationOrder } from './types';
const base64 = require('base-64');

interface Cursor {
	lastRow: any,
	pagination: Pagination,
	fields: string[],
}

interface ModelFeedPage {
	rows: any[],
	cursor?: string,
}

function makeCursor(rows:any[], pagination:Pagination, fields:string[]):Cursor {
	if (!rows.length) return null;
	if (rows.length < pagination.limit) return null;

	const orderFields = pagination.order.map((o:PaginationOrder) => o.by);

	const lastRow:any = {};
	const fullRow = rows[rows.length - 1];
	for (const f of orderFields) {
		const v = fullRow[f];
		lastRow[f] = typeof v === 'string' ? v.substr(0, 256) : v;
	}

	return {
		lastRow,
		pagination,
		fields,
	};
}

function encodeCursor(cursor:Cursor):string {
	return base64.encode(JSON.stringify(cursor));
}

function decodeCursor(cursor:string):Cursor {
	if (!cursor) return null;
	return JSON.parse(base64.decode(cursor));
}

// Note: this method might return more fields than was requested as it will
// also return fields that are necessary for pagination.
export default async function(db:any, tableName:string, pagination:Pagination, encodedCursor:string, whereSql:string = '', fields:string[] = null):Promise<ModelFeedPage> {
	fields = fields ? fields.slice() : ['id'];
	const cursor = decodeCursor(encodedCursor);

	const where = whereSql ? [whereSql] : [];
	let sqlParams = [];

	if (cursor) {
		pagination = cursor.pagination;
		fields = cursor.fields;

		const paginationOrder = pagination.order[0].dir;
		const orderFields = pagination.order.map((o:PaginationOrder) => o.by);

		// Use row-value syntax for WHERE clause:
		// https://use-the-index-luke.com/sql/partial-results/fetch-next-page
		const rowValueWhere = [];
		rowValueWhere.push(`(${orderFields.join(', ')})`);
		rowValueWhere.push(paginationOrder === 'DESC' ? '<' : '>');
		rowValueWhere.push(`(${orderFields.map((_f:any) => '?').join(', ')})`);

		where.push(rowValueWhere.join(' '));

		sqlParams = orderFields.map((f:string) => cursor.lastRow[f]);
	} else {
		if (!pagination.order.length) throw new Error('Pagination order must be provided');
		if (pagination.order.length > 1) throw new Error('Only one pagination order field can be provided');

		const paginationOrder = pagination.order[0].dir;

		if (!pagination.order.find((o:PaginationOrder) => o.by === 'id')) {
			pagination = {
				...pagination,
				order: pagination.order.concat([{
					by: 'id',
					dir: paginationOrder,
					caseInsensitive: false,
				}]),
			};
		}
	}

	// Certain fields are necessary for pagination, such as ID or
	// updated_time, however they are not necessarily included in the
	// selected fields. However in this case we need all the "order by"
	// fields to be in the selected fields as they are later used in the
	// above row-value clause.
	const orderFields = pagination.order.map((o:PaginationOrder) => o.by);
	for (const f of orderFields) {
		if (!fields.includes(f)) fields.push(f);
	}

	const orderBySql = paginationToSql(pagination);
	const fieldsSql = fields.length ? db.escapeFields(fields) : '*';

	const sql = `
		SELECT ${fieldsSql} FROM \`${tableName}\`
		${where.length ? `WHERE ${where.join(' AND ')}` : ''}
		ORDER BY ${orderBySql}
		LIMIT ${pagination.limit}
	`;

	// console.info('SQL', sql, sqlParams);

	const rows = await db.selectAll(sql, sqlParams);

	const newCursor = makeCursor(rows, pagination, fields);

	const output:ModelFeedPage = { rows };

	if (newCursor) output.cursor = encodeCursor(newCursor);

	return output;
}
