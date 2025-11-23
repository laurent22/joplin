"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (num) => {
    const timestamp = Date.now();
    return { sql: 'INSERT INTO migrations (number, created_time, updated_time) VALUES (?, ?, ?)', params: [num, timestamp, timestamp] };
};
