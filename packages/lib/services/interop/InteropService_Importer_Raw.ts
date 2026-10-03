import { ImportExportResult } from './types';

import InteropService_Importer_Base from './InteropService_Importer_Base';
import BaseItem from '../../models/BaseItem';
import BaseModel from '../../BaseModel';
import Resource from '../../models/Resource';
import Folder from '../../models/Folder';
import NoteTag from '../../models/NoteTag';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
const { sprintf } = require('sprintf-js');
import shim from '../../shim';
import { Stat } from '../../fs-driver-base';
import { ResourceEntity } from '../database/types';
import { MasterKeyEntity } from '../e2ee/types';
import { fileExtension } from '../../path-utils';
import uuid from '../../uuid';
import isNoteLockEnabled from '../noteLock/isNoteLockEnabled';
import NoteLockService from '../noteLock/NoteLockService';
import NoteLockKey, { DecryptedNoteLockKey, noteLockKeyFileName } from '../noteLock/NoteLockKey';

export default class InteropService_Importer_Raw extends InteropService_Importer_Base {
	public async exec(result: ImportExportResult) {
		const itemIdMap: Record<string, string> = {};
		const createdResources: Record<string, ResourceEntity> = {};
		const noteTagsToCreate = [];
		const destinationFolderId = this.options_.destinationFolderId;

		const replaceLinkedItemIds = async (noteBody: string) => {
			let output = noteBody;
			const itemIds = Note.linkedItemIds(noteBody);

			for (let i = 0; i < itemIds.length; i++) {
				const id = itemIds[i];
				if (!itemIdMap[id]) itemIdMap[id] = uuid.create();
				output = output.replace(new RegExp(id, 'gi'), itemIdMap[id]);
			}

			return output;
		};

		const stats = await shim.fsDriver().readDirStats(this.sourcePath_);

		// A backup with locked notes carries their encrypted key (see the raw exporter). Under the
		// profile's own key the ciphertext already fits, so the caller is only asked about foreign keys.
		let importNoteLockKey: DecryptedNoteLockKey = null;
		let undecryptableNotes = 0;
		if (isNoteLockEnabled() && await shim.fsDriver().exists(`${this.sourcePath_}/${noteLockKeyFileName}`)) {
			const keyFile: MasterKeyEntity = JSON.parse(await shim.fsDriver().readFile(`${this.sourcePath_}/${noteLockKeyFileName}`));
			if (keyFile?.id && keyFile.id !== NoteLockKey.instance().load()?.id && this.options_.onNoteLockKey) {
				importNoteLockKey = await this.options_.onNoteLockKey(keyFile);
			}
		}

		const folderExists = function(stats: Stat[], folderId: string) {
			folderId = folderId.toLowerCase();
			for (let i = 0; i < stats.length; i++) {
				const stat = stats[i];
				const statId = BaseItem.pathToId(stat.path);
				if (statId.toLowerCase() === folderId) return true;
			}
			return false;
		};

		let defaultFolder_: import('../database/types').FolderEntity | null = null;
		const defaultFolder = async () => {
			if (defaultFolder_) return defaultFolder_;
			const folderTitle = await Folder.findUniqueItemTitle(this.options_.defaultFolderTitle ? this.options_.defaultFolderTitle : 'Imported', '');
			// eslint-disable-next-line require-atomic-updates
			defaultFolder_ = await Folder.save({ title: folderTitle });
			return defaultFolder_;
		};

		const setFolderToImportTo = async (itemParentId: string) => {
			// Logic is a bit complex here:
			// - If a destination folder was specified, move the note to it.
			// - Otherwise, if the associated folder exists, use this.
			// - If it doesn't exist, use the default folder. This is the case for example when importing JEX archives that contain only one or more notes, but no folder.
			const itemParentExists = folderExists(stats, itemParentId);

			if (!itemIdMap[itemParentId]) {
				if (destinationFolderId) {
					itemIdMap[itemParentId] = destinationFolderId;
				} else if (!itemParentExists) {
					const parentFolder = await defaultFolder();
					// eslint-disable-next-line require-atomic-updates
					itemIdMap[itemParentId] = parentFolder.id;
				} else {
					itemIdMap[itemParentId] = uuid.create();
				}
			}
		};

		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];

			try {
				if (stat.isDirectory()) continue;
				if (fileExtension(stat.path).toLowerCase() !== 'md') continue;

				const content = await shim.fsDriver().readFile(`${this.sourcePath_}/${stat.path}`);
				const item = await BaseItem.unserialize(content);
				const itemType = item.type_;
				const ItemClass = BaseItem.itemClass(item);
				let useNoteLockSave = false;

				delete item.type_;

				if (itemType === BaseModel.TYPE_NOTE) {
					await setFolderToImportTo(item.parent_id);

					if (!itemIdMap[item.id]) itemIdMap[item.id] = uuid.create();
					item.id = itemIdMap[item.id];
					item.parent_id = itemIdMap[item.parent_id];
					item.body = await replaceLinkedItemIds(item.body);

					if (isNoteLockEnabled() && item.is_locked) {
						// The linked id rewrite cannot reach a ciphertext body, so remap the extracted
						// list instead, keeping the imported resources safe from orphan cleanup.
						item.extracted_resource_ids = Note.serializeExtractedResourceIds(Note.unserializeExtractedResourceIds(item.extracted_resource_ids).map(id => {
							if (!itemIdMap[id]) itemIdMap[id] = uuid.create();
							return itemIdMap[id];
						}));
						if (importNoteLockKey) {
							try {
								const plainBody = await NoteLockService.withDecryptedKey(scoped => scoped.decryptString(item.body), importNoteLockKey);
								item.body = await replaceLinkedItemIds(plainBody);
								useNoteLockSave = true;
							} catch {
								undecryptableNotes++;
							}
						}
					}
				} else if (itemType === BaseModel.TYPE_FOLDER) {
					if (destinationFolderId) continue;

					if (!itemIdMap[item.id]) itemIdMap[item.id] = uuid.create();
					item.id = itemIdMap[item.id];

					if (item.parent_id) {
						await setFolderToImportTo(item.parent_id);
						item.parent_id = itemIdMap[item.parent_id];
					}

					item.title = await Folder.findUniqueItemTitle(item.title, item.parent_id);
				} else if (itemType === BaseModel.TYPE_RESOURCE) {
					const sourceId = item.id;
					if (!itemIdMap[item.id]) itemIdMap[item.id] = uuid.create();
					item.id = itemIdMap[item.id];
					createdResources[item.id] = item;

					const sourceResourcePath = `${this.sourcePath_}/resources/${Resource.filename({ ...item, id: sourceId })}`;
					const destPath = Resource.fullPath(item);

					if (await shim.fsDriver().exists(sourceResourcePath)) {
						await shim.fsDriver().copy(sourceResourcePath, destPath);
					} else {
						result.warnings.push(sprintf('Could not find resource file: %s', sourceResourcePath));
					}
				} else if (itemType === BaseModel.TYPE_TAG) {
					const tag = await Tag.loadByTitle(item.title);
					if (tag) {
						itemIdMap[item.id] = tag.id;
						continue;
					}

					const tagId = uuid.create();
					itemIdMap[item.id] = tagId;
					item.id = tagId;
				} else if (itemType === BaseModel.TYPE_NOTE_TAG) {
					noteTagsToCreate.push(item);
					continue;
				}

				await ItemClass.save(item, { isNew: true, autoTimestamp: false, useNoteLock: useNoteLockSave });
			} catch (error) {
				if (error.code === 'malformedItem') {
					result.warnings.push(sprintf('Skipped malformed item: %s: %s', stat.path, error.message));
					continue;
				}
				error.message = `Could not import: ${stat.path}: ${error.message}`;
				throw error;
			}
		}

		if (undecryptableNotes) result.warnings.push(`${undecryptableNotes} locked note(s) could not be decrypted with the provided key and were imported unchanged`);

		for (let i = 0; i < noteTagsToCreate.length; i++) {
			const noteTag = noteTagsToCreate[i];
			const newNoteId = itemIdMap[noteTag.note_id];
			const newTagId = itemIdMap[noteTag.tag_id];

			if (!newNoteId) {
				result.warnings.push(sprintf('Non-existent note %s referenced in tag %s', noteTag.note_id, noteTag.tag_id));
				continue;
			}

			if (!newTagId) {
				result.warnings.push(sprintf('Non-existent tag %s for note %s', noteTag.tag_id, noteTag.note_id));
				continue;
			}

			noteTag.id = uuid.create();
			noteTag.note_id = newNoteId;
			noteTag.tag_id = newTagId;

			await NoteTag.save(noteTag, { isNew: true });
		}

		return result;
	}
}
