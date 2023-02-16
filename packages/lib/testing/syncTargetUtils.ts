import { syncDir, synchronizer, supportDir, loadEncryptionMasterKey, setupDatabaseAndSynchronizer, switchClient, synchronizerStart } from '../testing/test-utils';
import Setting from '../models/Setting';
import Folder from '../models/Folder';
import Note from '../models/Note';
import Tag from '../models/Tag';
import Resource from '../models/Resource';
import markdownUtils from '../markdownUtils';
import shim from '../shim';
import * as fs from 'fs-extra';
import { setEncryptionEnabled } from '../services/synchronizer/syncInfoUtils';
const { shimInit } = require('../shim-init-node');
const sharp = require('sharp');
const nodeSqlite = require('sqlite3');

const snapshotBaseDir = `${supportDir}/syncTargetSnapshots`;

export const testData = {
	folder1: {
		subFolder1: {},
		subFolder2: {
			note1: {
				resource: true,
				tags: ['tag1'],
			},
			note2: {},
		},
		note3: {
			tags: ['tag1', 'tag2'],
		},
		note4: {
			tags: ['tag2'],
		},
	},
	folder2: {},
	folder3: {
		note5: {
			resource: true,
			tags: ['tag2'],
		},
	},
};

export async function createTestData(data: any) {
	async function recurseStruct(s: any, parentId = '') {
		for (const n in s) {
			if (n.toLowerCase().includes('folder')) {
				const folder = await Folder.save({ title: n, parent_id: parentId });
				await recurseStruct(s[n], folder.id);
			} else {
				const note = await Note.save({ title: n, parent_id: parentId });
				if (s[n].resource) {
					await shim.attachFileToNote(note, `${supportDir}/photo.jpg`);
				}

				if (s[n].tags) {
					for (const tagTitle of s[n].tags) {
						await Tag.addNoteTagByTitle(note.id, tagTitle);
					}
				}
			}
		}
	}

	await recurseStruct(data);
}

export async function checkTestData(data: any) {
	async function recurseCheck(s: any) {
		for (const n in s) {
			const obj = s[n];

			if (n.toLowerCase().includes('folder')) {
				const folder = await Folder.loadByTitle(n);
				if (!folder) throw new Error(`Cannot load folder: ${n}`);
				await recurseCheck(obj);
			} else {
				const note = await Note.loadByTitle(n);
				if (!note) throw new Error(`Cannot load note: ${n}`);

				const parent = await Folder.load(note.parent_id);
				if (!parent) throw new Error(`Cannot load note parent: ${n}`);

				if (obj.resource) {
					const urls = markdownUtils.extractImageUrls(note.body);
					const resourceId = urls[0].substr(2);
					const resource = await Resource.load(resourceId);
					if (!resource) throw new Error(`Cannot load note resource: ${n}`);
				}

				if (obj.tags) {
					for (const tagTitle of obj.tags) {
						const tag = await Tag.loadByTitle(tagTitle);
						if (!tag) throw new Error(`Cannot load note tag: ${tagTitle}`);
						const hasNote = await Tag.hasNote(tag.id, note.id);
						if (!hasNote) throw new Error(`Tag not associated with note: ${tagTitle}`);
					}
				}
			}
		}
	}

	await recurseCheck(data);
}

export async function deploySyncTargetSnapshot(syncTargetType: string, syncVersion: number) {
	const sourceDir = `${snapshotBaseDir}/${syncVersion}/${syncTargetType}`;
	await fs.remove(syncDir);
	await fs.copy(sourceDir, syncDir);
}

export async function main(syncTargetType: string) {
	shimInit({ sharp, nodeSqlite });

	const validSyncTargetTypes = ['normal', 'e2ee'];
	if (!validSyncTargetTypes.includes(syncTargetType)) throw new Error(`Sync target type must be: ${validSyncTargetTypes.join(', ')}`);

	await setupDatabaseAndSynchronizer(1);
	await switchClient(1);
	await createTestData(testData);

	if (syncTargetType === 'e2ee') {
		setEncryptionEnabled(true);
		await loadEncryptionMasterKey();
	}

	await synchronizerStart();

	await synchronizer().start();

	if (!Setting.value('syncVersion')) throw new Error('syncVersion is not set');
	const destDir = `${snapshotBaseDir}/${Setting.value('syncVersion')}/${syncTargetType}`;
	await fs.mkdirp(destDir); // Create intermediate directories
	await fs.remove(destDir);
	await fs.mkdirp(destDir);
	await fs.copy(syncDir, destDir);

	// eslint-disable-next-line no-console
	console.info(`Sync target snapshot created in: ${destDir}`);
}
