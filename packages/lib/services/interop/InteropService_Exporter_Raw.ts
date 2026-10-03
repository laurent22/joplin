import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import BaseItem from '../../models/BaseItem';
import BaseModel from '../../BaseModel';
import { basename } from '../../path-utils';
import shim from '../../shim';
import { BaseItemEntity, NoteEntity, ResourceEntity } from '../database/types';
import isNoteLockEnabled from '../noteLock/isNoteLockEnabled';
import NoteLockNote from '../noteLock/NoteLockNote';
import NoteLockKey, { noteLockKeyFileName } from '../noteLock/NoteLockKey';

export default class InteropService_Exporter_Raw extends InteropService_Exporter_Base {

	private destDir_: string;
	private resourceDir_: string;
	private hasLockedNotes_ = false;

	public async init(destDir: string) {
		this.destDir_ = destDir;
		this.resourceDir_ = destDir ? `${destDir}/resources` : null;

		await shim.fsDriver().mkdir(this.destDir_);
		await shim.fsDriver().mkdir(this.resourceDir_);
	}

	public async processItem(itemType: number, item: BaseItemEntity) {
		if (itemType === BaseModel.TYPE_NOTE && isNoteLockEnabled() && NoteLockNote.isLocked(item as NoteEntity)) this.hasLockedNotes_ = true;
		const ItemClass = BaseItem.getClassByItemType(itemType);
		const serialized = await ItemClass.serialize(item);
		const filePath = `${this.destDir_}/${ItemClass.systemPath(item)}`;
		await shim.fsDriver().writeFile(filePath, serialized, 'utf-8');
	}

	public async processResource(_resource: ResourceEntity, filePath: string) {
		const destResourcePath = `${this.resourceDir_}/${basename(filePath)}`;
		await shim.fsDriver().copy(filePath, destResourcePath);
	}

	public async close() {
		// The key travels with the backup, so a backup plus the password is always enough to recover.
		if (this.hasLockedNotes_) {
			const key = NoteLockKey.instance().load();
			if (key) await shim.fsDriver().writeFile(`${this.destDir_}/${noteLockKeyFileName}`, JSON.stringify(key), 'utf-8');
		}
	}
}
