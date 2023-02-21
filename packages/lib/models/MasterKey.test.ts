import { encryptionService, msleep, setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import MasterKey from './MasterKey';

describe('models/MasterKey', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should return the latest master key', (async () => {
		expect(await MasterKey.latest()).toBeFalsy();

		let mk1 = await encryptionService().generateMasterKey('111111');
		mk1 = await MasterKey.save(mk1);

		expect((await MasterKey.latest()).id).toBe(mk1.id);

		await msleep(1);

		let mk2 = await encryptionService().generateMasterKey('111111');
		mk2 = await MasterKey.save(mk2);

		expect((await MasterKey.latest()).id).toBe(mk2.id);

		await msleep(1);

		mk1 = await MasterKey.save(mk1);

		expect((await MasterKey.latest()).id).toBe(mk1.id);
	}));

});
