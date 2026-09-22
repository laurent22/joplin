import Resource from '../models/Resource';
import Setting from '../models/Setting';
import { ResourceEntity } from '../services/database/types';
import shim from '../shim';
import { deleteResourceLocally, deleteSyncedResourcesLocally } from './deleteResourceLocally';

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
		const move = jest.fn();
		jest.spyOn(shim, 'fsDriver').mockReturnValue({
			exists: jest.fn().mockResolvedValue(true),
			findUniqueFilename: jest.fn(async path => `${path}.staged`),
			move,
			remove,
		} as unknown as ReturnType<typeof shim.fsDriver>);

		await expect(deleteSyncedResourcesLocally()).resolves.toBeUndefined();

		expect(move).toHaveBeenCalledWith('eligible-false', 'eligible-false.delete.staged');
		expect(remove).toHaveBeenCalledWith('eligible-false.delete.staged');
		expect(setLocalFileMissing).toHaveBeenCalledWith('eligible', false);
		expect(shouldBlobBeEncrypted.mock.invocationCallOrder[0]).toBeLessThan(move.mock.invocationCallOrder[0]);
	});

	it('should stop when attachment download behaviour changes to always', async () => {
		jest.spyOn(Resource, 'all').mockResolvedValue([{ id: 'first' }, { id: 'second' }] as ResourceEntity[]);
		jest.spyOn(Setting, 'value').mockReturnValueOnce('auto').mockReturnValue('always');
		const load = jest.spyOn(Resource, 'load').mockResolvedValue(null);

		await deleteSyncedResourcesLocally();

		expect(load).toHaveBeenCalledTimes(1);
		expect(load).toHaveBeenCalledWith('first');
	});

	it('should restore staged files when updating the database fails', async () => {
		jest.spyOn(Resource, 'load').mockResolvedValue({ id: 'resource', encryption_blob_encrypted: 0 } as ResourceEntity);
		jest.spyOn(Resource, 'localState').mockResolvedValue({ fetch_status: Resource.FETCH_STATUS_DONE });
		jest.spyOn(Resource, 'fullPath').mockImplementation((_resource, encrypted = false) => `resource-${encrypted}`);
		jest.spyOn(Resource, 'canDeleteLocalFile').mockResolvedValue(true);
		jest.spyOn(Resource, 'shouldBlobBeEncrypted').mockResolvedValue(false);
		jest.spyOn(Resource, 'setLocalFileMissing').mockRejectedValue(new Error('Database error'));
		const move = jest.fn();
		const remove = jest.fn();
		jest.spyOn(shim, 'fsDriver').mockReturnValue({
			exists: jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
			findUniqueFilename: jest.fn(async path => `${path}.staged`),
			move,
			remove,
		} as unknown as ReturnType<typeof shim.fsDriver>);

		await expect(deleteResourceLocally('resource')).rejects.toThrow('Database error');

		expect(move).toHaveBeenNthCalledWith(1, 'resource-false', 'resource-false.delete.staged');
		expect(move).toHaveBeenNthCalledWith(2, 'resource-false.delete.staged', 'resource-false');
		expect(remove).not.toHaveBeenCalled();
	});
});
