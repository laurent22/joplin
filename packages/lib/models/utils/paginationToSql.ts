import { Pagination } from './types';

export default function(pagination: Pagination): string {
	const sql: string[] = [];

	for (let i = 0; i < pagination.order.length; i++) {
		const o = pagination.order[i];
		let item = `\`${o.by}\``;
		if (!!o.caseInsensitive || !!pagination.caseInsensitive) item += ' COLLATE NOCASE';
		item += ` ${o.dir}`;
		sql.push(item);
	}

	return sql.join(', ');
}
