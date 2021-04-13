import JoplinDatabase from '@joplin/lib/JoplinDatabase';
import Logger from '@joplin/lib/Logger';
import BaseModel from '@joplin/lib/BaseModel';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import Resource from '@joplin/lib/models/Resource';
import { Config } from '../../utils/types';
const { DatabaseDriverNode } = require('@joplin/lib/database-driver-node.js');

const logger = Logger.create('JoplinUtils');

let db_: JoplinDatabase = null;

export async function initializeJoplinUtils(config: Config) {
	const filePath = `${config.tempDir}/joplin.sqlite`;

	db_ = new JoplinDatabase(new DatabaseDriverNode());
	db_.setLogger(logger as Logger);
	await db_.open({ name: filePath });

	BaseModel.setDb(db_);

	// Only load the classes that will be needed to render the notes and
	// resources.
	BaseItem.loadClass('Folder', Folder);
	BaseItem.loadClass('Note', Note);
	BaseItem.loadClass('Resource', Resource);
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
