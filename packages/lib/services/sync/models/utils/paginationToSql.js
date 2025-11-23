"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
function default_1(pagination) {
    const sql = [];
    for (let i = 0; i < pagination.order.length; i++) {
        const o = pagination.order[i];
        let item = `\`${o.by}\``;
        if (!!o.caseInsensitive || !!pagination.caseInsensitive)
            item += ' COLLATE NOCASE';
        item += ` ${o.dir}`;
        sql.push(item);
    }
    return sql.join(', ');
}
