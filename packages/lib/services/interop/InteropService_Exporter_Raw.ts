const InteropService_Exporter_Base = require('./InteropService_Exporter_Base').default;
const BaseItem = require('../../models/BaseItem.js');
const { basename } = require('../../path-utils');
const shim = require('../../shim').default;

export default class InteropService_Exporter_Raw extends InteropService_Exporter_Base {
	async init(destDir: string) {
		this.destDir_ = destDir;
		this.resourceDir_ = destDir ? `${destDir}/resources` : null;

		await shim.fsDriver().mkdir(this.destDir_);
		await shim.fsDriver().mkdir(this.resourceDir_);
	}

	async processItem(itemType: number, item: any) {
		const ItemClass = BaseItem.getClassByItemType(itemType);
		const serialized = await ItemClass.serialize(item);
		const filePath = `${this.destDir_}/${ItemClass.systemPath(item)}`;
		await shim.fsDriver().writeFile(filePath, serialized, 'utf-8');
	}

	async processResource(_resource: any, filePath: string) {
		const destResourcePath = `${this.resourceDir_}/${basename(filePath)}`;
		await shim.fsDriver().copy(filePath, destResourcePath);
	}

	async close() {}
}
