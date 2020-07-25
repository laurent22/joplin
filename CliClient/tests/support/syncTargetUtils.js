require('app-module-path').addPath(__dirname + '/..');

const { syncDir, asyncTest, fileApi, synchronizer, createSyncTargetSnapshot, loadEncryptionMasterKey, decryptionWorker, encryptionService, setupDatabaseAndSynchronizer, switchClient, expectThrow, expectNotThrow } = require('../test-utils.js');
const Setting = require('lib/models/Setting');
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');
const Tag = require('lib/models/Tag');
const Resource = require('lib/models/Resource');
const markdownUtils = require('lib/markdownUtils');
const {shim} = require('lib/shim');
const fs = require('fs-extra');

const snapshotBaseDir = `${__dirname}/../../tests/support/syncTargetSnapshots`;

const testData = {
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

async function createTestData(data) {
	async function recurseStruct(s, parentId = '') {
		for (const n in s) {
			if (n.toLowerCase().includes('folder')) {
				const folder = await Folder.save({ title: n, parent_id: parentId });
				await recurseStruct(s[n], folder.id);
			} else {
				const note = await Note.save({ title: n, parent_id: parentId });
				if (s[n].resource) {
					await shim.attachFileToNote(note, `${__dirname}/../../tests/support/photo.jpg`);
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

async function checkTestData(data) {
	async function recurseCheck(s) {
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

async function deploySyncTargetSnapshot(syncTargetType, syncVersion) {
	const sourceDir = `${snapshotBaseDir}/${syncVersion}/${syncTargetType}`;
	await fs.remove(syncDir);
	await fs.copy(sourceDir, syncDir);
}

async function main(syncTargetType) {
	const validSyncTargetTypes = ['normal', 'e2ee'];
	if (!validSyncTargetTypes.includes(syncTargetType)) throw new Error('Sync target type must be: ' + validSyncTargetTypes.join(', '));

	await setupDatabaseAndSynchronizer(1);
	await switchClient(1);
	await createTestData(testData);

	if (syncTargetType === 'e2ee') {
		Setting.setValue('encryption.enabled', true);
		await loadEncryptionMasterKey();
	}

	await synchronizer().start();

	if (!Setting.value('syncVersion')) throw new Error('syncVersion is not set');
	const destDir = `${snapshotBaseDir}/${Setting.value('syncVersion')}/${syncTargetType}`;
	await fs.mkdirp(destDir); // Create intermediate directories
	await fs.remove(destDir);
	await fs.mkdirp(destDir);
	await fs.copy(syncDir, destDir);

	console.info('Sync target snapshot created in: ' + destDir);
}

module.exports = {
	checkTestData,
	main,
	testData,
	deploySyncTargetSnapshot,
};