import shim from '@joplin/lib/shim';
const { dirname } = require('@joplin/lib/path-utils');
import Setting from '@joplin/lib/models/Setting';
const pluginAssets = require('./pluginAssets/index');
import KvStore from '@joplin/lib/services/KvStore';

export default class PluginAssetsLoader {

	private static instance_: PluginAssetsLoader = null;
	private logger_: any = null;

	public static instance() {
		if (PluginAssetsLoader.instance_) return PluginAssetsLoader.instance_;
		PluginAssetsLoader.instance_ = new PluginAssetsLoader();
		return PluginAssetsLoader.instance_;
	}

	public setLogger(logger: any) {
		this.logger_ = logger;
	}

	public logger() {
		return this.logger_;
	}

	public async importAssets() {
		const destDir = `${Setting.value('resourceDir')}/pluginAssets`;
		await shim.fsDriver().mkdir(destDir);

		const hash = pluginAssets.hash;
		if (hash === await KvStore.instance().value('PluginAssetsLoader.lastHash')) {
			this.logger().info(`PluginAssetsLoader: Assets are up to date. Hash: ${hash}`);
			return;
		}

		this.logger().info(`PluginAssetsLoader: Importing assets to ${destDir}`);

		try {
			for (const name in pluginAssets.files) {
				const dataBase64 = pluginAssets.files[name].data;
				const destPath = `${destDir}/${name}`;
				await shim.fsDriver().mkdir(dirname(destPath));
				await shim.fsDriver().unlink(destPath);

				this.logger().info(`PluginAssetsLoader: Copying: ${name} => ${destPath}`);
				await shim.fsDriver().writeFile(destPath, dataBase64);
			}
		} catch (error) {
			this.logger().error(error);
		}

		await KvStore.instance().setValue('PluginAssetsLoader.lastHash', hash);
	}

}
