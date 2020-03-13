/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
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

describe('services_EncryptionService', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		service =  new EncryptionService();
		BaseItem.encryptionService_ = service;
		Setting.setValue('encryption.enabled', true);
		done();
	});

	it('should encode and decode header', asyncTest(async () => {
		const header = {
			encryptionMethod: EncryptionService.METHOD_SJCL,
			masterKeyId: '01234568abcdefgh01234568abcdefgh',
		};

		const encodedHeader = service.encodeHeader_(header);
		const decodedHeader = service.decodeHeaderBytes_(encodedHeader);
		delete decodedHeader.length;

		expect(objectsEqual(header, decodedHeader)).toBe(true);
	}));

	it('should generate and decrypt a master key', asyncTest(async () => {
		const masterKey = await service.generateMasterKey('123456');
		expect(!!masterKey.content).toBe(true);

		let hasThrown = false;
		try {
			await service.decryptMasterKey_(masterKey, 'wrongpassword');
		} catch (error) {
			hasThrown = true;
		}

		expect(hasThrown).toBe(true);

		const decryptedMasterKey = await service.decryptMasterKey_(masterKey, '123456');
		expect(decryptedMasterKey.length).toBe(512);
	}));

	it('should upgrade a master key', asyncTest(async () => {
		// Create an old style master key
		let masterKey = await service.generateMasterKey('123456', {
			encryptionMethod: EncryptionService.METHOD_SJCL_2,
		});
		masterKey = await MasterKey.save(masterKey);

		let upgradedMasterKey = await service.upgradeMasterKey(masterKey, '123456');
		upgradedMasterKey = await MasterKey.save(upgradedMasterKey);

		// Check that master key has been upgraded (different ciphertext)
		expect(masterKey.content).not.toBe(upgradedMasterKey.content);

		// Check that master key plain text is still the same
		const plainTextOld = await service.decryptMasterKey_(masterKey, '123456');
		const plainTextNew = await service.decryptMasterKey_(upgradedMasterKey, '123456');
		expect(plainTextOld.content).toBe(plainTextNew.content);

		// Check that old content can be decrypted with new master key
		await service.loadMasterKey_(masterKey, '123456', true);
		const cipherText = await service.encryptString('some secret');
		const plainTextFromOld = await service.decryptString(cipherText);

		await service.loadMasterKey_(upgradedMasterKey, '123456', true);
		const plainTextFromNew = await service.decryptString(cipherText);

		expect(plainTextFromOld).toBe(plainTextFromNew);
	}));

	it('should not upgrade master key if invalid password', asyncTest(async () => {
		let masterKey = await service.generateMasterKey('123456', {
			encryptionMethod: EncryptionService.METHOD_SJCL_2,
		});

		const hasThrown = await checkThrowAsync(async () => await service.upgradeMasterKey(masterKey, '777'));
	}));

	it('should require a checksum only for old master keys', asyncTest(async () => {
		const masterKey = await service.generateMasterKey('123456', {
			encryptionMethod: EncryptionService.METHOD_SJCL_2,
		});

		expect(!!masterKey.checksum).toBe(true);
		expect(!!masterKey.content).toBe(true);
	}));

	it('should not require a checksum for new master keys', asyncTest(async () => {
		const masterKey = await service.generateMasterKey('123456', {
			encryptionMethod: EncryptionService.METHOD_SJCL_4,
		});

		expect(!masterKey.checksum).toBe(true);
		expect(!!masterKey.content).toBe(true);

		const decryptedMasterKey = await service.decryptMasterKey_(masterKey, '123456');
		expect(decryptedMasterKey.length).toBe(512);
	}));

	it('should throw an error if master key decryption fails', asyncTest(async () => {
		const masterKey = await service.generateMasterKey('123456', {
			encryptionMethod: EncryptionService.METHOD_SJCL_4,
		});

		const hasThrown = await checkThrowAsync(async () => await service.decryptMasterKey_(masterKey, 'wrong'));

		expect(hasThrown).toBe(true);
	}));

	it('should return the master keys that need an upgrade', asyncTest(async () => {
		const masterKey1 = await MasterKey.save(await service.generateMasterKey('123456', {
			encryptionMethod: EncryptionService.METHOD_SJCL_2,
		}));

		const masterKey2 = await MasterKey.save(await service.generateMasterKey('123456', {
			encryptionMethod: EncryptionService.METHOD_SJCL,
		}));

		const masterKey3 = await MasterKey.save(await service.generateMasterKey('123456'));

		const needUpgrade = service.masterKeysThatNeedUpgrading(await MasterKey.all());

		expect(needUpgrade.length).toBe(2);
		expect(needUpgrade.map(k => k.id).sort()).toEqual([masterKey1.id, masterKey2.id].sort());
	}));

	it('should encrypt and decrypt with a master key', asyncTest(async () => {
		let masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);

		await service.loadMasterKey_(masterKey, '123456', true);

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
	}));

	it('should decrypt various encryption methods', asyncTest(async () => {
		let masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);
		await service.loadMasterKey_(masterKey, '123456', true);

		{
			const cipherText = await service.encryptString('some secret', {
				encryptionMethod: EncryptionService.METHOD_SJCL_2,
			});
			const plainText = await service.decryptString(cipherText);
			expect(plainText).toBe('some secret');
			const header = await service.decodeHeaderString(cipherText);
			expect(header.encryptionMethod).toBe(EncryptionService.METHOD_SJCL_2);
		}

		{
			const cipherText = await service.encryptString('some secret', {
				encryptionMethod: EncryptionService.METHOD_SJCL_3,
			});
			const plainText = await service.decryptString(cipherText);
			expect(plainText).toBe('some secret');
			const header = await service.decodeHeaderString(cipherText);
			expect(header.encryptionMethod).toBe(EncryptionService.METHOD_SJCL_3);
		}
	}));

	it('should fail to decrypt if master key not present', asyncTest(async () => {
		let masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);

		await service.loadMasterKey_(masterKey, '123456', true);

		const cipherText = await service.encryptString('some secret');

		await service.unloadMasterKey(masterKey);

		let hasThrown = await checkThrowAsync(async () => await service.decryptString(cipherText));

		expect(hasThrown).toBe(true);
	}));


	it('should fail to decrypt if data tampered with', asyncTest(async () => {
		let masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);

		await service.loadMasterKey_(masterKey, '123456', true);

		let cipherText = await service.encryptString('some secret');
		cipherText += 'ABCDEFGHIJ';

		let hasThrown = await checkThrowAsync(async () => await service.decryptString(cipherText));

		expect(hasThrown).toBe(true);
	}));

	it('should encrypt and decrypt notes and folders', asyncTest(async () => {
		let masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);
		await service.loadMasterKey_(masterKey, '123456', true);

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
	}));

	it('should encrypt and decrypt files', asyncTest(async () => {
		let masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);
		await service.loadMasterKey_(masterKey, '123456', true);

		const sourcePath = `${__dirname}/../tests/support/photo.jpg`;
		const encryptedPath = `${__dirname}/data/photo.crypted`;
		const decryptedPath = `${__dirname}/data/photo.jpg`;

		await service.encryptFile(sourcePath, encryptedPath);
		await service.decryptFile(encryptedPath, decryptedPath);

		expect(fileContentEqual(sourcePath, encryptedPath)).toBe(false);
		expect(fileContentEqual(sourcePath, decryptedPath)).toBe(true);
	}));

	it('should encrypt invalid UTF-8 data', asyncTest(async () => {
		let masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);

		await service.loadMasterKey_(masterKey, '123456', true);

		// First check that we can replicate the error with the old encryption method
		service.defaultEncryptionMethod_ = EncryptionService.METHOD_SJCL;
		const hasThrown = await checkThrowAsync(async () => await service.encryptString('🐶🐶🐶'.substr(0,5)));
		expect(hasThrown).toBe(true);

		// Now check that the new one fixes the problem
		service.defaultEncryptionMethod_ = EncryptionService.METHOD_SJCL_1A;
		const cipherText = await service.encryptString('🐶🐶🐶'.substr(0,5));
		const plainText = await service.decryptString(cipherText);
		expect(plainText).toBe('🐶🐶🐶'.substr(0,5));
	}));

	// it('should upgrade master key encryption mode', asyncTest(async () => {
	// 	let masterKey = await service.generateMasterKey('123456', {
	// 		encryptionMethod: EncryptionService.METHOD_SJCL_2,
	// 	});
	// 	masterKey = await MasterKey.save(masterKey);
	// 	Setting.setObjectKey('encryption.passwordCache', masterKey.id, '123456');
	// 	Setting.setValue('encryption.activeMasterKeyId', masterKey.id);

	// 	await sleep(0.01);

	// 	await service.loadMasterKeysFromSettings();

	// 	masterKeyNew = await MasterKey.load(masterKey.id);

	// 	// Check that the master key has been upgraded

	// 	expect(masterKeyNew.created_time).toBe(masterKey.created_time);
	// 	expect(masterKeyNew.updated_time === masterKey.updated_time).toBe(false);
	// 	expect(masterKeyNew.content === masterKey.content).toBe(false);
	// 	expect(masterKeyNew.encryption_method === masterKey.encryption_method).toBe(false);
	// 	expect(masterKeyNew.checksum === masterKey.checksum).toBe(false);
	// 	expect(masterKeyNew.encryption_method).toBe(service.defaultMasterKeyEncryptionMethod_);

	// 	// Check that encryption still works

	// 	const cipherText = await service.encryptString('some secret');
	// 	const plainText = await service.decryptString(cipherText);
	// 	expect(plainText).toBe('some secret');
	// }));

});
