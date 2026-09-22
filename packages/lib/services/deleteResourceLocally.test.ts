import Resource from '../models/Resource';
import Setting from '../models/Setting';
import { ResourceEntity } from '../services/database/types';
import shim from '../shim';
import { deleteSyncedResourcesLocally } from './deleteResourceLocally';

describe('deleteResourceLocally', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should continue deleting resources when one is not eligible', async () => {
		jest.spyOn(Resource, 'all').mockResolvedValue([{ id: 'ineligible' }, { id: 'eligible' }] as ResourceEntity[]);
		jest.spyOn(Setting, 'value').mockReturnValue('auto');
		jest.spyOn(Resource, 'load').mockImplementation(async (id: string) => ({
			id,
			encryption_blob_encrypted: 0,
		} as ResourceEntity));
		jest.spyOn(Resource, 'localState').mockResolvedValue({ fetch_status: Resource.FETCH_STATUS_DONE });
		jest.spyOn(Resource, 'fullPath').mockImplementation((resource, encrypted = false) => `${resource.id}-${encrypted}`);
		jest.spyOn(Resource, 'canDeleteLocalFile').mockImplementation(async resource => resource.id === 'eligible');
		const shouldBlobBeEncrypted = jest.spyOn(Resource, 'shouldBlobBeEncrypted').mockResolvedValue(false);
		const setLocalFileMissing = jest.spyOn(Resource, 'setLocalFileMissing').mockResolvedValue();
		const remove = jest.fn();
		jest.spyOn(shim, 'fsDriver').mockReturnValue({
			exists: jest.fn().mockResolvedValue(true),
			remove,
		} as unknown as ReturnType<typeof shim.fsDriver>);

		await expect(deleteSyncedResourcesLocally()).resolves.toBeUndefined();

		expect(remove).toHaveBeenCalledWith('eligible-false');
		expect(setLocalFileMissing).toHaveBeenCalledWith('eligible', false);
		expect(shouldBlobBeEncrypted.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]);
	});

	it('should stop when attachment download behaviour changes to always', async () => {
		jest.spyOn(Resource, 'all').mockResolvedValue([{ id: 'first' }, { id: 'second' }] as ResourceEntity[]);
		jest.spyOn(Setting, 'value').mockReturnValueOnce('auto').mockReturnValue('always');
		const load = jest.spyOn(Resource, 'load').mockResolvedValue(null);

		await deleteSyncedResourcesLocally();

		expect(load).toHaveBeenCalledTimes(1);
		expect(load).toHaveBeenCalledWith('first');
	});
});
