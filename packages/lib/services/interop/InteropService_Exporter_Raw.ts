import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import BaseItem from '../../models/BaseItem';
const { basename } = require('../../path-utils');
import shim from '../../shim';

export default class InteropService_Exporter_Raw extends InteropService_Exporter_Base {

	private destDir_: string;
	private resourceDir_: string;

	public async init(destDir: string) {
		this.destDir_ = destDir;
		this.resourceDir_ = destDir ? `${destDir}/resources` : null;

		await shim.fsDriver().mkdir(this.destDir_);
		await shim.fsDriver().mkdir(this.resourceDir_);
	}

	public async processItem(itemType: number, item: any) {
		const ItemClass = BaseItem.getClassByItemType(itemType);
		const serialized = await ItemClass.serialize(item);
		const filePath = `${this.destDir_}/${ItemClass.systemPath(item)}`;
		await shim.fsDriver().writeFile(filePath, serialized, 'utf-8');
	}

	public async processResource(_resource: any, filePath: string) {
		const destResourcePath = `${this.resourceDir_}/${basename(filePath)}`;
		await shim.fsDriver().copy(filePath, destResourcePath);
	}

	public async close() {}
}
