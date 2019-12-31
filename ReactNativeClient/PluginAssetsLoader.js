'use strict';
var __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
	function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
	return new (P || (P = Promise))(function(resolve, reject) {
		function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
		function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		step((generator = generator.apply(thisArg, _arguments || [])).next());
	});
};
Object.defineProperty(exports, '__esModule', { value: true });
const { dirname } = require('lib/path-utils.js');
const { shim } = require('lib/shim');
const Setting = require('lib/models/Setting');
const pluginAssets = require('./pluginAssets/index');
const KvStore = require('lib/services/KvStore.js');
class PluginAssetsLoader {
	constructor() {
		this.logger_ = null;
	}
	static instance() {
		if (PluginAssetsLoader.instance_)
			return PluginAssetsLoader.instance_;
		PluginAssetsLoader.instance_ = new PluginAssetsLoader();
		return PluginAssetsLoader.instance_;
	}
	setLogger(logger) {
		this.logger_ = logger;
	}
	logger() {
		return this.logger_;
	}
	importAssets() {
		return __awaiter(this, void 0, void 0, function* () {
			const destDir = `${Setting.value('resourceDir')}/pluginAssets`;
			yield shim.fsDriver().mkdir(destDir);
			const hash = pluginAssets.hash;
			if (hash === (yield KvStore.instance().value('PluginAssetsLoader.lastHash'))) {
				this.logger().info(`PluginAssetsLoader: Assets are up to date. Hash: ${hash}`);
				return;
			}
			this.logger().info(`PluginAssetsLoader: Importing assets to ${destDir}`);
			try {
				for (let name in pluginAssets.files) {
					const dataBase64 = pluginAssets.files[name].data;
					const destPath = `${destDir}/${name}`;
					yield shim.fsDriver().mkdir(dirname(destPath));
					yield shim.fsDriver().unlink(destPath);
					this.logger().info(`PluginAssetsLoader: Copying: ${name} => ${destPath}`);
					yield shim.fsDriver().writeFile(destPath, dataBase64);
				}
			} catch (error) {
				this.logger().error(error);
			}
			KvStore.instance().setValue('PluginAssetsLoader.lastHash', hash);
		});
	}
}
exports.default = PluginAssetsLoader;
PluginAssetsLoader.instance_ = null;
// # sourceMappingURL=PluginAssetsLoader.js.map
