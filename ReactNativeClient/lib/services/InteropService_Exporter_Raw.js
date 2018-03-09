const InteropService_Exporter_Base = require('lib/services/InteropService_Exporter_Base');
const { basename, filename } = require('lib/path-utils.js');
const { shim } = require('lib/shim');

class InteropService_Exporter_Raw extends InteropService_Exporter_Base {

	async init(destDir) {
		this.destDir_ = destDir;
		this.resourceDir_ = destDir ? destDir + '/resources' : null;

		await shim.fsDriver().mkdir(this.destDir_);
		await shim.fsDriver().mkdir(this.resourceDir_);
	}

	async processItem(ItemClass, item) {
		const serialized = await ItemClass.serialize(item);
		const filePath = this.destDir_ + '/' + ItemClass.systemPath(item);
		await shim.fsDriver().writeFile(filePath, serialized, 'utf-8');
	}

	async processResource(resource, filePath) {
		const destResourcePath = this.resourceDir_ + '/' + basename(filePath);
		await shim.fsDriver().copy(filePath, destResourcePath);
	}

	async close() {}

}

module.exports = InteropService_Exporter_Raw;