import JoplinDatabase from '@joplin/lib/JoplinDatabase';
import Logger from '@joplin/lib/Logger';
import BaseModel from '@joplin/lib/BaseModel';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import Resource from '@joplin/lib/models/Resource';
import NoteTag from '@joplin/lib/models/NoteTag';
import Tag from '@joplin/lib/models/Tag';
import MasterKey from '@joplin/lib/models/MasterKey';
import Revision from '@joplin/lib/models/Revision';
import { Config } from '../../utils/types';
import * as fs from 'fs-extra';
const { DatabaseDriverNode } = require('@joplin/lib/database-driver-node.js');

const logger = Logger.create('JoplinUtils');

let db_: JoplinDatabase = null;

export const resourceDirName = '.resource';

export async function initializeJoplinUtils(config: Config) {
	const filePath = `${config.tempDir}/joplin.sqlite`;
	await fs.remove(filePath);

	db_ = new JoplinDatabase(new DatabaseDriverNode());
	db_.setLogger(logger as Logger);
	await db_.open({ name: filePath });

	BaseModel.setDb(db_);

	// Only load the classes that will be needed to render the notes and
	// resources.
	BaseItem.loadClass('Folder', Folder);
	BaseItem.loadClass('Note', Note);
	BaseItem.loadClass('Resource', Resource);
	BaseItem.loadClass('Tag', Tag);
	BaseItem.loadClass('NoteTag', NoteTag);
	BaseItem.loadClass('MasterKey', MasterKey);
	BaseItem.loadClass('Revision', Revision);
}

export function linkedResourceIds(body: string): string[] {
	return Note.linkedItemIds(body);
}

export function isJoplinItemName(name: string): boolean {
	return !!name.match(/^[0-9a-zA-Z]{32}\.md$/);
}

export async function unserializeJoplinItem(body: string): Promise<any> {
	return BaseItem.unserialize(body);
}

export async function serializeJoplinItem(item: any): Promise<string> {
	const ModelClass = BaseItem.itemClass(item);
	return ModelClass.serialize(item);
}

export function resourceBlobPath(resourceId: string): string {
	return `${resourceDirName}/${resourceId}`;
}

export function isJoplinResourceBlobPath(path: string): boolean {
	return path.indexOf(resourceDirName) === 0;
}
