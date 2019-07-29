/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const { Database } = require('lib/database.js');
const Setting = require('lib/models/Setting.js');
const BaseItem = require('lib/models/BaseItem.js');
const BaseModel = require('lib/BaseModel.js');
const MasterKey = require('lib/models/MasterKey');
const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');
const EncryptionService = require('lib/services/EncryptionService.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000; // The first test is slow because the database needs to be built

let service = null;

describe('Encryption', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		service =  new EncryptionService();
		BaseItem.encryptionService_ = service;
		Setting.setValue('encryption.enabled', true);
		done();
	});

	it('should encode and decode header', async (done) => {
		const header = {
			encryptionMethod: EncryptionService.METHOD_SJCL,
			masterKeyId: '01234568abcdefgh01234568abcdefgh',
		};

		const encodedHeader = service.encodeHeader_(header);
		const decodedHeader = service.decodeHeader_(encodedHeader);
		delete decodedHeader.length;

		expect(objectsEqual(header, decodedHeader)).toBe(true);

		done();
	});

	it('should generate and decrypt a master key', async (done) => {
		const masterKey = await service.generateMasterKey('123456');
		expect(!!masterKey.checksum).toBe(true);
		expect(!!masterKey.content).toBe(true);

		let hasThrown = false;
		try {
			await service.decryptMasterKey(masterKey, 'wrongpassword');
		} catch (error) {
			hasThrown = true;
		}

		expect(hasThrown).toBe(true);

		const decryptedMasterKey = await service.decryptMasterKey(masterKey, '123456');
		expect(decryptedMasterKey.length).toBe(512);

		done();
	});

	it('should encrypt and decrypt with a master key', async (done) => {
		let masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);

		await service.loadMasterKey(masterKey, '123456', true);

		const cipherText = await service.encryptString('some secret');
		const plainText = await service.decryptString(cipherText);

		expect(plainText).toBe('some secret');

		// Test that a long string, that is going to be split into multiple chunks, encrypt
		// and decrypt properly too.
		let veryLongSecret = '';
		for (let i = 0; i < service.chunkSize() * 3; i++) veryLongSecret += Math.floor(Math.random() * 9);

		const cipherText2 = await service.encryptString(veryLongSecret);
		const plainText2 = await service.decryptString(cipherText2);

		expect(plainText2 === veryLongSecret).toBe(true);

		done();
	});

	it('should fail to decrypt if master key not present', async (done) => {
		let masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);

		await service.loadMasterKey(masterKey, '123456', true);

		const cipherText = await service.encryptString('some secret');

		await service.unloadMasterKey(masterKey);

		let hasThrown = await checkThrowAsync(async () => await service.decryptString(cipherText));

		expect(hasThrown).toBe(true);

		done();
	});


	it('should fail to decrypt if data tampered with', async (done) => {
		let masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);

		await service.loadMasterKey(masterKey, '123456', true);

		let cipherText = await service.encryptString('some secret');
		cipherText += 'ABCDEFGHIJ';

		let hasThrown = await checkThrowAsync(async () => await service.decryptString(cipherText));

		expect(hasThrown).toBe(true);

		done();
	});

	it('should encrypt and decrypt notes and folders', async (done) => {
		let masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);
		await service.loadMasterKey(masterKey, '123456', true);

		let folder = await Folder.save({ title: 'folder' });
		let note = await Note.save({ title: 'encrypted note', body: 'something', parent_id: folder.id });
		let serialized = await Note.serializeForSync(note);
		let deserialized = Note.filter(await Note.unserialize(serialized));

		// Check that required properties are not encrypted
		expect(deserialized.id).toBe(note.id);
		expect(deserialized.parent_id).toBe(note.parent_id);
		expect(deserialized.updated_time).toBe(note.updated_time);

		// Check that at least title and body are encrypted
		expect(!deserialized.title).toBe(true);
		expect(!deserialized.body).toBe(true);

		// Check that encrypted data is there
		expect(!!deserialized.encryption_cipher_text).toBe(true);

		const encryptedNote = await Note.save(deserialized);
		const decryptedNote = await Note.decrypt(encryptedNote);

		expect(decryptedNote.title).toBe(note.title);
		expect(decryptedNote.body).toBe(note.body);
		expect(decryptedNote.id).toBe(note.id);
		expect(decryptedNote.parent_id).toBe(note.parent_id);

		done();
	});

	it('should encrypt and decrypt files', async (done) => {
		let masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);
		await service.loadMasterKey(masterKey, '123456', true);

		const sourcePath = __dirname + '/../tests/support/photo.jpg';
		const encryptedPath = __dirname + '/data/photo.crypted';
		const decryptedPath = __dirname + '/data/photo.jpg';

		await service.encryptFile(sourcePath, encryptedPath);
		await service.decryptFile(encryptedPath, decryptedPath);

		expect(fileContentEqual(sourcePath, encryptedPath)).toBe(false);
		expect(fileContentEqual(sourcePath, decryptedPath)).toBe(true);

		done();
	});

});
