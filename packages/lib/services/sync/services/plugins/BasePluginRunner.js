"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseService_1 = require("../BaseService");
class BasePluginRunner extends BaseService_1.default {
    constructor() {
        super(...arguments);
        // A dictionary with the plugin ID as key. Then each entry has a list
        // of timestamp/call counts.
        //
        // 'org.joplinapp.plugins.ExamplePlugin': {
        //     1650375620: 5,    // 5 calls at second 1650375620
        //     1650375621: 19,   // 19 calls at second 1650375621
        //     1650375623: 12,
        // },
        // 'org.joplinapp.plugins.AnotherOne': {
        //     1650375620: 1,
        //     1650375623: 4,
        // };
        this.callStats_ = {};
    }
    async run(plugin, sandbox) {
        throw new Error(`Not implemented: ${plugin} / ${sandbox}`);
    }
    async stop(plugin) {
        throw new Error(`Not implemented ${plugin} stop`);
    }
    async waitForSandboxCalls() {
        throw new Error('Not implemented: waitForSandboxCalls');
    }
    recordCallStat(pluginId) {
        const timeSeconds = Math.floor(Date.now() / 1000);
        if (!this.callStats_[pluginId])
            this.callStats_[pluginId] = {};
        if (!this.callStats_[pluginId][timeSeconds])
            this.callStats_[pluginId][timeSeconds] = 0;
        this.callStats_[pluginId][timeSeconds]++;
    }
    // Duration in seconds
    callStatsSummary(pluginId, duration) {
        const output = [];
        const startTime = Math.floor(Date.now() / 1000 - duration);
        const endTime = startTime + duration;
        for (let t = startTime; t <= endTime; t++) {
            const callCount = this.callStats_[pluginId][t];
            output.push(callCount ? callCount : 0);
        }
        return output;
    }
}
exports.default = BasePluginRunner;
