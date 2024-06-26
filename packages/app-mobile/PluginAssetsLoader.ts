import shim from '@joplin/lib/shim';
const { dirname } = require('@joplin/lib/path-utils');
import Setting from '@joplin/lib/models/Setting';
const pluginAssets = require('./pluginAssets/index');
import KvStore from '@joplin/lib/services/KvStore';
import Logger from '@joplin/utils/Logger';
import FsDriverWeb from './utils/fs-driver/fs-driver-rn.web';

const logger = Logger.create('PluginAssetsLoader');

export default class PluginAssetsLoader {

	private static instance_: PluginAssetsLoader = null;

	public static instance() {
		if (PluginAssetsLoader.instance_) return PluginAssetsLoader.instance_;
		PluginAssetsLoader.instance_ = new PluginAssetsLoader();
		return PluginAssetsLoader.instance_;
	}

	private destDir_() {
		return `${Setting.value('resourceDir')}/pluginAssets`;
	}

	private async importAssetsMobile_() {
		const destDir = this.destDir_();

		for (const name in pluginAssets.files) {
			const dataBase64 = pluginAssets.files[name].data;
			const destPath = `${destDir}/${name}`;
			await shim.fsDriver().mkdir(dirname(destPath));
			await shim.fsDriver().unlink(destPath);

			logger.info(`PluginAssetsLoader: Copying: ${name} => ${destPath}`);
			await shim.fsDriver().writeFile(destPath, dataBase64);
		}
	}

	private async importAssetsWeb_() {
		const destDir = this.destDir_();
		const fsDriver = shim.fsDriver() as FsDriverWeb;

		await Promise.all(pluginAssets.files.map(async (name: string) => {
			const destPath = `${destDir}/${name}`;
			const response = await fetch(`pluginAssets/${name}`);
			await shim.fsDriver().mkdir(dirname(destPath));

			await shim.fsDriver().unlink(destPath);
			await fsDriver.writeFile(destPath, await response.arrayBuffer(), 'Buffer');
		}));
	}

	public async importAssets() {
		const destDir = this.destDir_();
		await shim.fsDriver().mkdir(destDir);

		const hash = pluginAssets.hash;
		if (hash === await KvStore.instance().value('PluginAssetsLoader.lastHash')) {
			logger.info(`PluginAssetsLoader: Assets are up to date. Hash: ${hash}`);
			return;
		}

		logger.info(`PluginAssetsLoader: Importing assets to ${destDir}`);

		try {
			if (shim.mobilePlatform() === 'web') {
				await this.importAssetsWeb_();
			} else {
				await this.importAssetsMobile_();
			}
		} catch (error) {
			logger.error(error);
		}

		await KvStore.instance().setValue('PluginAssetsLoader.lastHash', hash);
	}

}
