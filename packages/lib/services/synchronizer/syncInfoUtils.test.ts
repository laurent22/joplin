import { afterAllCleanUp, setupDatabaseAndSynchronizer, logger, switchClient, encryptionService, msleep, fileApi } from '../../testing/test-utils';
import MasterKey from '../../models/MasterKey';
import { checkIfCanSync, localSyncInfo, masterKeyEnabled, mergeSyncInfos, saveLocalSyncInfo, setMasterKeyEnabled, SyncInfo, syncInfoEquals, checkSyncTargetIsValid, fetchSyncInfo } from './syncInfoUtils';
import Setting from '../../models/Setting';
import BaseItem from '../../models/BaseItem';
import BaseModel from '../../models/BaseItem';
import Logger from '@joplin/utils/Logger';

describe('syncInfoUtils', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await fileApi().clearRoot();
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should enable or disable a master key', async () => {
		const mk1 = await MasterKey.save(await encryptionService().generateMasterKey('111111'));
		const mk2 = await MasterKey.save(await encryptionService().generateMasterKey('111111'));

		setMasterKeyEnabled(mk2.id, false);

		expect(masterKeyEnabled(await MasterKey.load(mk1.id))).toBe(true);
		expect(masterKeyEnabled(await MasterKey.load(mk2.id))).toBe(false);

		setMasterKeyEnabled(mk1.id, false);

		expect(masterKeyEnabled(await MasterKey.load(mk1.id))).toBe(false);
		expect(masterKeyEnabled(await MasterKey.load(mk2.id))).toBe(false);

		setMasterKeyEnabled(mk1.id, true);

		expect(masterKeyEnabled(await MasterKey.load(mk1.id))).toBe(true);
		expect(masterKeyEnabled(await MasterKey.load(mk2.id))).toBe(false);
	});

	it('should tell if two sync info are equal', async () => {
		{
			const syncInfo1 = new SyncInfo();
			const syncInfo2 = new SyncInfo();
			expect(syncInfoEquals(syncInfo1, syncInfo2)).toBe(true);
		}

		{
			const syncInfo1 = new SyncInfo();
			syncInfo1.masterKeys = [{
				id: 'id',
				content: 'content',
			}];

			const syncInfo2 = new SyncInfo();
			syncInfo2.masterKeys = [{
				id: 'id',
				content: 'different',
			}];

			expect(syncInfoEquals(syncInfo1, syncInfo2)).toBe(false);
		}

		{
			const syncInfo1 = new SyncInfo();
			syncInfo1.masterKeys = [{
				id: 'id',
				content: 'content',
			}];

			const syncInfo2 = new SyncInfo();
			syncInfo2.masterKeys = [{
				id: 'id',
				content: 'content',
			}];

			expect(syncInfoEquals(syncInfo1, syncInfo2)).toBe(true);
		}

		{
			// Should disregard object key order

			const syncInfo1 = new SyncInfo();
			syncInfo1.masterKeys = [{
				content: 'content',
				id: 'id',
			}];

			const syncInfo2 = new SyncInfo();
			syncInfo2.masterKeys = [{
				id: 'id',
				content: 'content',
			}];

			expect(syncInfoEquals(syncInfo1, syncInfo2)).toBe(true);
		}
	});

	it('should merge sync target info and keep the highest appMinVersion', async () => {
		const syncInfo1 = new SyncInfo();
		syncInfo1.appMinVersion = '1.0.5';
		const syncInfo2 = new SyncInfo();
		syncInfo2.appMinVersion = '1.0.2';
		expect(mergeSyncInfos(syncInfo1, syncInfo2).appMinVersion).toBe('1.0.5');

		syncInfo1.appMinVersion = '2.1.0';
		syncInfo2.appMinVersion = '2.2.5';
		expect(mergeSyncInfos(syncInfo1, syncInfo2).appMinVersion).toBe('2.2.5');

		syncInfo1.appMinVersion = '1.0.0';
		syncInfo2.appMinVersion = '1.0.0';
		expect(mergeSyncInfos(syncInfo1, syncInfo2).appMinVersion).toBe('1.0.0');

		// Should prefer the version from syncInfo1 if versions are otherwise equal.
		syncInfo1.appMinVersion = '1.00';
		syncInfo2.appMinVersion = '1.0.0';
		expect(mergeSyncInfos(syncInfo1, syncInfo2).appMinVersion).toBe('1.00');

		syncInfo1.appMinVersion = '0.0.0';
		syncInfo2.appMinVersion = '0.00';
		expect(mergeSyncInfos(syncInfo1, syncInfo2).appMinVersion).toBe('0.0.0');
	});

	it('should merge sync target info and takes into account usage of master key - 1', async () => {
		const syncInfo1 = new SyncInfo();
		syncInfo1.masterKeys = [{
			id: '1',
			content: 'content1',
			hasBeenUsed: true,
		}];
		syncInfo1.activeMasterKeyId = '1';

		await msleep(1);

		const syncInfo2 = new SyncInfo();
		syncInfo2.masterKeys = [{
			id: '2',
			content: 'content2',
			hasBeenUsed: false,
		}];
		syncInfo2.activeMasterKeyId = '2';

		// If one master key has been used and the other not, it should select
		// the one that's been used regardless of timestamps.
		expect(mergeSyncInfos(syncInfo1, syncInfo2).activeMasterKeyId).toBe('1');

		// If both master keys have been used it should rely on timestamp
		// (latest modified is picked).
		syncInfo2.masterKeys[0].hasBeenUsed = true;
		expect(mergeSyncInfos(syncInfo1, syncInfo2).activeMasterKeyId).toBe('2');
	});

	it('should merge sync target info, but should not make a disabled key the active one', async () => {
		const syncInfo1 = new SyncInfo();
		syncInfo1.masterKeys = [{
			id: '1',
			content: 'content1',
			hasBeenUsed: true,
			enabled: 0,
		}];
		syncInfo1.activeMasterKeyId = '1';

		await msleep(1);

		const syncInfo2 = new SyncInfo();
		syncInfo2.masterKeys = [{
			id: '2',
			content: 'content2',
			enabled: 1,
			hasBeenUsed: false,
		}];
		syncInfo2.activeMasterKeyId = '2';

		// Normally, if one master key has been used (1) and the other not (2),
		// it should select the one that's been used regardless of timestamps.
		// **However**, if the key 1 has been disabled by user, it should
		// **not** be picked as the active one. Instead it should use key 2,
		// because it's still enabled.
		expect(mergeSyncInfos(syncInfo1, syncInfo2).activeMasterKeyId).toBe('2');

		// If both key are disabled, we go back to the original logic, where we
		// select the key that's been used.
		syncInfo2.masterKeys[0].enabled = 0;
		expect(mergeSyncInfos(syncInfo1, syncInfo2).activeMasterKeyId).toBe('1');
	});

	it('should fix the sync info if it contains invalid data', async () => {
		logger.enabled = false;

		const syncInfo = new SyncInfo();
		syncInfo.masterKeys = [{
			id: '1',
			content: 'content1',
			hasBeenUsed: true,
			enabled: 0,
		}];
		syncInfo.activeMasterKeyId = '2';

		saveLocalSyncInfo(syncInfo);

		const loaded = localSyncInfo();
		expect(loaded.activeMasterKeyId).toBe('');
		expect(loaded.masterKeys.length).toBe(1);

		logger.enabled = true;
	});

	// cSpell:disable
	it('should filter unnecessary sync info', async () => {
		const initialData = {
			'version': 3,
			'e2ee': {
				'value': true,
				'updatedTime': 0,
			},
			'activeMasterKeyId': {
				'value': '400227d2222c4d3bb7346514861c643b',
				'updatedTime': 0,
			},
			'masterKeys': [
				{
					'id': '400227d8a77c4d3bb7346514861c643b',
					'created_time': 1515008161362,
					'updated_time': 1708103706234,
					'source_application': 'net.cozic.joplin-desktop',
					'encryption_method': 4,
					'checksum': '',
					'content': '{"iv":"M1uezlW1Pu1g3dwrCTqcHg==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"0dqWvU/PUVQ=","ct":"wHXN5pk1s7qKX+2Y9puEGZGkojI1Pvc+TvZUKC6QCfwxtMK6C1Hmgvm53vAaeCMcCXPvGVLo9JwqINFhEgb0ux+KUFcCqgT1pNO2Sf/hJsH8PjaUvl0kwpC511zdnvY7Hk3WIpgXVKUevsQt9TkMK5e8y1JMsuuTD3fW7bEiv/ehe4CBSQ9eH1tWjr1qQ=="}',
					'hasBeenUsed': true,
				},
			],
			'ppk': {
				'value': {
					'id': 'SNQ5ZCs61KDVUW2qqqqHd3',
					'keySize': 2048,
					'privateKey': {
						'encryptionMethod': 4,
						'ciphertext': '{"iv":"Z2y11b4nCYvpmQ9gvxELug==","v":1,"iter":10000,"ks":256,"ts":64,"mode":"ccm","adata":"","cipher":"aes","salt":"0dqWvU/PUVQ=","ct":"8CvjYayXMpLsrAMwtu18liRfewKfZVpRlC0D0I2FYziyFhRf4Cjqi2+Uy8kIC8au7oBSBUnNU6jd04ooNozneKv2MzkhbGlXo3izxqCMVHboqa2vkPWbBAxGlvUYQUg213xG61FjZ19ZJdpti+AQy7qpQU7/h5kyC0iJ2aXG5TIGcBuDq3lbGAVfG/RlL/abMKLYb8KouFYAJe+0bUajUXa1KJsey+eD+2hFVc+nAxKOLe1UoZysB77Lq43DRTBFGH2gTSC1zOXxuZeSbFPPN0Cj+FvV7D5pF9LhUSLPDsIiRwF/q+E506YgDjirSZAvW1Y2EEM22F2Mh0I0pbVPFXhhBafqPLRwXmUGULCnA64gkGwctK5mEs985VVSrpQ0nMvf/drg2vUQrJ3exgl43ddVSOCjeJuF7F06IBL5FQ34iAujsOheRNvlWtG9xm008Vc19NxvhtzIl1RO7XLXrrTBzbFHDrcHjda/xNWNEKwU/LZrH0xPgwEcwBmLItvy/NojI/JKNeck8R431QWooFb7cTplO4qsgCQNL9MJ9avpmNSXJAUQx8VnifKVbzcY4T7X7TmJWSrpvBWV8MLfi3TOF4kahR75vg47kCrMbthFMw5bvrjvMmGOtyKxheqbS5IlSnSSz5x7wIVz0g3vzMbcbb5rF5MuzNhU97wNiz3L1Aonjmnu8r3vCyXTB/4GSiwYH7KfixwYM68T4crqJ0VneNy+owznCdJQXnG4cmjxek1wmJMEmurQ1JtANNv/m43gzoqd62V6Dq05vLJF+n7CS9HgJ3FTqYVCZLGGYrSilIYnEjhdaBpkcnFrCitbfYj+IpNC6eN6qg2hpGAbmKId7RLOGwJyda0jkuNP9mTqWOF+6eYn8Q+Y3YIY"}',
					},
					'publicKey': '-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEAiSTY5wBscae/WmU3PfVP5FYQiuTi5V7BjPcge/6pXvgF3zwe43uy\nTWdzO2YgK/a8f3H507clcGlZN4e0e1jZ/rh4lMfaN\nugfNo0RAvuwn8Yniqfb69reygJywbFBIauxbBpVKbc21MLuCbPkVFjKG7qGNYdF4\nc17mQ8nQsbFPZcuvxsZvgvvbza1q0rqVETdDUClyIrY8plAjMgTKCRwq2gafP6eX\nWpkENAyIbOFxSKXjWy0yFidvZfYLz4mIRwIDAQAB\n-----END RSA PUBLIC KEY-----',
					'createdTime': 1633274368892,
				},
				'updatedTime': 1633274368892,
			},
			'appMinVersion': '0.0.0',
		};

		const syncInfo = new SyncInfo();
		syncInfo.load(JSON.stringify(initialData));

		const filteredSyncInfo = syncInfo.filterSyncInfo();

		expect(filteredSyncInfo).toEqual({
			'activeMasterKeyId': {
				'updatedTime': 0,
				'value': '400227d2222c4d3bb7346514861c643b',
			},
			'appMinVersion': '0.0.0',
			'e2ee': {
				'updatedTime': 0,
				'value': true,
			},
			'masterKeys': [
				{
					'created_time': 1515008161362,
					'encryption_method': 4,
					'hasBeenUsed': true,
					'id': '400227d8a77c4d3bb7346514861c643b',
					'source_application': 'net.cozic.joplin-desktop',
					'updated_time': 1708103706234,
				},
			],
			'ppk': {
				'updatedTime': 1633274368892,
				'value': {
					'createdTime': 1633274368892,
					'id': 'SNQ5ZCs61KDVUW2qqqqHd3',
					'keySize': 2048,
					'privateKey': {
						'ciphertext': '{"iv":"Z2y11b4nCYvpm...TqWOF+6eYn8Q+Y3YIY"}',
						'encryptionMethod': 4,
					},
					'publicKey': '-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCA...',
				},
			},
			'version': 3,
		});
	});
	// cSpell:enable

	test.each([
		['1.0.0', '1.0.4', true],
		['1.0.0', '0.0.5', false],
		['1.0.0', '1.0.0', true],
	])('should check if it can sync', async (appMinVersion, appVersion, expected) => {
		let succeeded = true;
		try {
			const s = new SyncInfo();
			s.appMinVersion = appMinVersion;
			checkIfCanSync(s, appVersion);
		} catch (error) {
			succeeded = false;
		}

		expect(succeeded).toBe(expected);
	});

	test('should not throw if the sync info being parsed is invalid', async () => {
		Logger.globalLogger.enabled = false;

		Setting.setValue('syncInfoCache', 'invalid-json');
		expect(() => localSyncInfo()).not.toThrow();

		Logger.globalLogger.enabled = true;
	});

	test('should use default value if the sync info being parsed is invalid', async () => {
		Logger.globalLogger.enabled = false;

		Setting.setValue('syncInfoCache', 'invalid-json');
		const result = localSyncInfo();

		expect(result.activeMasterKeyId).toEqual('');
		expect(result.version).toEqual(0);
		expect(result.ppk).toEqual(null);
		expect(result.e2ee).toEqual(false);
		expect(result.appMinVersion).toEqual('3.0.0');
		expect(result.masterKeys).toEqual([]);

		Logger.globalLogger.enabled = true;
	});

	it('should succeed when info.json exists for checkSyncTargetIsValid', (async () => {
		Setting.setValue('sync.wipeOutFailSafe', true);
		const syncInfo = new SyncInfo();
		await fileApi().put('info.json', syncInfo.serialize());
		expect(checkSyncTargetIsValid(fileApi())).resolves.not.toThrow();
	}));

	it('should succeed when info.json does not exist and failsafe is disabled for checkSyncTargetIsValid', (async () => {
		Setting.setValue('sync.wipeOutFailSafe', false);
		expect(checkSyncTargetIsValid(fileApi())).resolves.not.toThrow();
	}));

	it('should fail with failsafe error when info.json does not exist for checkSyncTargetIsValid', (async () => {
		Setting.setValue('sync.wipeOutFailSafe', true);
		await expect(checkSyncTargetIsValid(fileApi())).rejects.toThrow('Fail-safe: ');
	}));

	it('should succeed when info.json exists and is valid for fetchSyncInfo', (async () => {
		Setting.setValue('sync.wipeOutFailSafe', true);
		const expectedSyncInfo = new SyncInfo();
		expectedSyncInfo.version = 50;
		await fileApi().put('info.json', expectedSyncInfo.serialize());

		const actualSyncInfo = await fetchSyncInfo(fileApi());
		expect(actualSyncInfo).toStrictEqual(expectedSyncInfo);
	}));

	it('should fail with missing version error when info.json exists but is invalid for fetchSyncInfo', (async () => {
		Setting.setValue('sync.wipeOutFailSafe', true);
		await fileApi().put('info.json', new SyncInfo().serialize());
		await expect(fetchSyncInfo(fileApi())).rejects.toThrow('Missing "version" field');
	}));

	it('should succeed when info.json does not exist but .sync/version.txt does exist for fetchSyncInfo', (async () => {
		Setting.setValue('sync.wipeOutFailSafe', true);
		await fileApi().put('.sync/version.txt', '{}');

		const actualSyncInfo = await fetchSyncInfo(fileApi());
		expect(actualSyncInfo.version).toBe(1);
	}));

	it('should succeed when info.json and .sync/version.txt does not exist and failsafe is disabled for fetchSyncInfo', (async () => {
		Setting.setValue('sync.wipeOutFailSafe', false);

		const actualSyncInfo = await fetchSyncInfo(fileApi());
		expect(actualSyncInfo.version).toBe(0);
	}));

	it('should fail with failsafe error when info.json and .sync/version.txt does not exist when sync items are present for fetchSyncInfo', (async () => {
		Setting.setValue('sync.wipeOutFailSafe', true);
		const note = {
			id: 1,
			type_: BaseModel.TYPE_NOTE,
		};
		await BaseItem.saveSyncTime(fileApi().syncTargetId(), note, 1);
		await expect(fetchSyncInfo(fileApi())).rejects.toThrow('Fail-safe: ');
	}));

	it('should succeed when info.json and .sync/version.txt does not exist when sync items are not present for fetchSyncInfo', (async () => {
		Setting.setValue('sync.wipeOutFailSafe', true);
		expect(fetchSyncInfo(fileApi())).resolves.not.toThrow();
	}));
});
