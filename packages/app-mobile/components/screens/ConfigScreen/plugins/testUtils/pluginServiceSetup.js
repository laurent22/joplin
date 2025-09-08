'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const PluginService_1 = require('@joplin/lib/services/plugins/PluginService');
const BasePluginRunner_1 = require('@joplin/lib/services/plugins/BasePluginRunner');
class MockPluginRunner extends BasePluginRunner_1.default {
	async run() { }
	async stop() { }
}
const pluginServiceSetup = (store) => {
	const runner = new MockPluginRunner();
	PluginService_1.default.instance().initialize('2.14.0', { joplin: {} }, runner, store);
};
exports.default = pluginServiceSetup;
// # sourceMappingURL=pluginServiceSetup.js.map
