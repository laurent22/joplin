"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function default_1(api) {
    await Promise.all([
        api.mkdir('.resource'),
        api.mkdir('.sync'),
        api.mkdir('.lock'),
    ]);
    await api.put('.sync/version.txt', '1');
}
