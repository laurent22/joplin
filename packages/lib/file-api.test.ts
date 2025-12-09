import { PaginatedList, RemoteItem, getSupportsDeltaWithItems, enableEnhancedBasicDeltaAlgorithm, basicDelta, ItemStat, isLocalServer } from './file-api';
import { RemoteItemMetadata } from './models/BaseItem';
import Setting from './models/Setting';
import SyncTargetRegistry from './SyncTargetRegistry';

const defaultPaginatedList = (): PaginatedList => {
	return {
		items: [],
		hasMore: false,
		context: null,
	};
};

const defaultItem = (): RemoteItem => {
	return {
		id: '',
	};
};

const validNoteId = '1b175bb38bba47baac22b0b47f778113';
const basePath = '/';
const baseTimestamp = new Date().getTime();

const setupWebDavSync = (isLocal: boolean) => {
	let url = 'http://www.example.com';
	if (isLocal) url = 'http://localhost';
	Setting.setValue('sync.target', SyncTargetRegistry.nameToId('webdav'));
	Setting.setValue('sync.6.path', url);
};

const remotePath = (noteId: string) => {
	return `${noteId}.md`;
};

const statItem = (noteId: string, remoteUpdatedTime: number) => {
	const stat: ItemStat = {
		path: remotePath(noteId),
		updated_time: remoteUpdatedTime,
		isDir: false,
	};

	return stat;
};

const dirStatFunc = (statItem: ItemStat) => {
	return (): ItemStat[] => {
		if (statItem) {
			return [statItem];
		} else {
			return [];
		}
	};
};

const syncOptions = (noteId: string, localUpdatedTime: number, contextTimestamp: number = undefined, includeFilesAtTimestamp = true) => {
	const syncContextTimestamp = contextTimestamp ? contextTimestamp : localUpdatedTime;
	const metadataMap = new Map<string, RemoteItemMetadata>();
	let itemIds: string[] = [];
	let filesAtTimestamp: string[] = [];

	const metadata = {
		item_id: noteId,
		updated_time: localUpdatedTime,
	};

	if (noteId) {
		metadataMap.set(noteId, metadata);
		itemIds = [noteId];
	}

	if (includeFilesAtTimestamp) {
		filesAtTimestamp = [remotePath(noteId)];
	}

	const allItemIdsHandler = async () => {
		return itemIds;
	};

	const allItemMetadataHandler = async () => {
		return metadataMap;
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const syncContext: any = {
		timestamp: syncContextTimestamp,
		filesAtTimestamp: filesAtTimestamp,
		statsCache: null,
		statIdsCache: null,
		deletedItemsProcessed: false,
	};

	return {
		allItemIdsHandler: allItemIdsHandler,
		allItemMetadataHandler: allItemMetadataHandler,
		wipeOutFailSafe: false,
		context: syncContext,
	};
};

describe('file-api', () => {

	test.each([
		[
			{
				...defaultPaginatedList(),
				items: [],
			},
			false,
		],

		[
			{
				...defaultPaginatedList(),
				items: [
					{
						...defaultItem(),
						path: 'test',
					},
				],
			},
			false,
		],

		[
			{
				...defaultPaginatedList(),
				items: [
					{
						...defaultItem(),
						path: 'test',
						jopItem: null,
					},
				],
			},
			true,
		],

		[
			{
				...defaultPaginatedList(),
				items: [
					{
						...defaultItem(),
						path: 'test',
						jopItem: { something: 'abcd' },
					},
				],
			},
			true,
		],
	])('should tell if the sync target supports delta with items', async (deltaResponse: PaginatedList, expected: boolean) => {
		const actual = getSupportsDeltaWithItems(deltaResponse);
		expect(actual).toBe(expected);
	});

	it.each([
		'http://localhost',
		'http://localhost/',
		'https://localhost:8080',
		'http://127.0.0.1',
		'https://127.100.50.25:3000/test',
		'http://[::1]',
		'http://localhost/api/v1',
	])('should detect a local server url', (url: string) => {
		const result = isLocalServer(url);
		expect(result).toBe(true);
	});

	it.each([
		'http://localhostXYZ',
		'http://127.0.0.1foobar',
		'http://192.168.1.1',
		'http://example.com',
		'https://my-localhost.com',
	])('should detect a non local server url', (url: string) => {
		const result = isLocalServer(url);
		expect(result).toBe(false);
	});

	it('should use enhanced basic delta algorithm when using file system sync', () => {
		Setting.setValue('sync.target', SyncTargetRegistry.nameToId('filesystem'));
		const result = enableEnhancedBasicDeltaAlgorithm();
		expect(result).toBe(true);
	});

	it.each([
		'http://localhost',
		'http://localhost/',
		'https://localhost:8080',
		'http://127.0.0.1',
		'https://127.100.50.25:3000/test',
		'http://[::1]',
		'http://localhost/api/v1',
	])('should use enhanced basic delta algorithm when using WebDAV for a local server url', (url: string) => {
		Setting.setValue('sync.target', SyncTargetRegistry.nameToId('webdav'));
		Setting.setValue('sync.6.path', url);
		const result = enableEnhancedBasicDeltaAlgorithm();
		expect(result).toBe(true);
	});

	it.each([
		'http://localhostXYZ',
		'http://127.0.0.1foobar',
		'http://192.168.1.1',
		'http://example.com',
		'https://my-localhost.com',
	])('should not use enhanced basic delta algorithm when using WebDAV for a non local server url', (url: string) => {
		Setting.setValue('sync.target', SyncTargetRegistry.nameToId('webdav'));
		Setting.setValue('sync.6.path', url);
		const result = enableEnhancedBasicDeltaAlgorithm();
		expect(result).toBe(false);
	});

	it('should not use enhanced basic delta algorithm when not using file system sync or WebDAV', () => {
		Setting.setValue('sync.target', SyncTargetRegistry.nameToId('joplinServer'));
		const result = enableEnhancedBasicDeltaAlgorithm();
		expect(result).toBe(false);
	});

	test.each([false, true])('basicDelta (enhancedAlgorithm: %s) should not return item, where remote item is a directory', async (enhancedAlgorithm) => {
		setupWebDavSync(enhancedAlgorithm);
		const stat = {
			path: remotePath(validNoteId),
			updated_time: baseTimestamp + 1,
			isDir: true,
		};
		const context = await basicDelta(basePath, dirStatFunc(stat), syncOptions(undefined, baseTimestamp));
		expect(context.items.length).toBe(0);
	});

	test.each([false, true])('basicDelta (enhancedAlgorithm: %s) should not return item, where remote item is not a system path', async (enhancedAlgorithm) => {
		setupWebDavSync(enhancedAlgorithm);
		const noteId = '1b175bb38bba47baac22b0b47f77811'; // 1 char too short
		const stat = statItem(noteId, baseTimestamp + 1);
		const context = await basicDelta(basePath, dirStatFunc(stat), syncOptions(undefined, baseTimestamp));
		expect(context.items.length).toBe(0);
	});

	test.each([false, true])('basicDelta (enhancedAlgorithm: %s) should return item with isDeleted true, where remote item not longer exists', async (enhancedAlgorithm) => {
		setupWebDavSync(enhancedAlgorithm);
		const context = await basicDelta(basePath, dirStatFunc(undefined), syncOptions(validNoteId, baseTimestamp));
		expect(context.items.length).toBe(1);
		expect(context.items[0].isDeleted).toBe(true);
	});

	test.each([false, true])('basicDelta (enhancedAlgorithm: %s) should return item, where local item does not exist', async (enhancedAlgorithm) => {
		setupWebDavSync(enhancedAlgorithm);
		const stat = statItem(validNoteId, baseTimestamp);
		const context = await basicDelta(basePath, dirStatFunc(stat), syncOptions(undefined, baseTimestamp));
		expect(context.items.length).toBe(1);
		expect(context.items[0]).toBe(stat);
	});

	test.each([false, true])('basicDelta (enhancedAlgorithm: %s) should return item, where local item exists and remote item has a newer timestamp', async (enhancedAlgorithm) => {
		setupWebDavSync(enhancedAlgorithm);
		const stat = statItem(validNoteId, baseTimestamp + 1);
		const context = await basicDelta(basePath, dirStatFunc(stat), syncOptions(validNoteId, baseTimestamp));
		expect(context.items.length).toBe(1);
		expect(context.items[0]).toBe(stat);
	});

	test.each([false, true])('basicDelta (enhancedAlgorithm: %s) should not return item, where local item exists and remote item has an equal timestamp', async (enhancedAlgorithm) => {
		setupWebDavSync(enhancedAlgorithm);
		const stat = statItem(validNoteId, baseTimestamp);
		const context = await basicDelta(basePath, dirStatFunc(stat), syncOptions(validNoteId, baseTimestamp));
		expect(context.items.length).toBe(0);
	});

	test('basicDelta (enhancedAlgorithm: false) should return item, where local item exists and remote item has an equal timestamp, but it is not present in fileAtTimestamp', async () => {
		setupWebDavSync(false);
		const stat = statItem(validNoteId, baseTimestamp);
		const context = await basicDelta(basePath, dirStatFunc(stat), syncOptions(validNoteId, baseTimestamp, baseTimestamp, false));
		expect(context.items.length).toBe(1);
		expect(context.items[0]).toBe(stat);
	});

	test('basicDelta (enhancedAlgorithm: false) should not return item, where local item exists and remote item has an older timestamp', async () => {
		setupWebDavSync(false);
		const stat = statItem(validNoteId, baseTimestamp - 1);
		const context = await basicDelta(basePath, dirStatFunc(stat), syncOptions(validNoteId, baseTimestamp));
		expect(context.items.length).toBe(0);
	});

	test('basicDelta (enhancedAlgorithm: false) should use context timestamp for timestamp comparisons, ignoring items with earlier timestamps', async () => {
		setupWebDavSync(false);
		const stat = statItem(validNoteId, baseTimestamp + 1);
		const context = await basicDelta(basePath, dirStatFunc(stat), syncOptions(validNoteId, baseTimestamp, baseTimestamp + 2));
		expect(context.items.length).toBe(0);
	});

	test('basicDelta (enhancedAlgorithm: true) should return item, where local item exists and remote item has an older timestamp', async () => {
		setupWebDavSync(true);
		const stat = statItem(validNoteId, baseTimestamp - 1);
		const context = await basicDelta(basePath, dirStatFunc(stat), syncOptions(validNoteId, baseTimestamp));
		expect(context.items.length).toBe(1);
		expect(context.items[0]).toBe(stat);
	});

	test('basicDelta (enhancedAlgorithm: true) should ignore context timestamp for timestamp comparisons, and return item based on metadata timestamp', async () => {
		setupWebDavSync(true);
		const stat = statItem(validNoteId, baseTimestamp + 1);
		const context = await basicDelta(basePath, dirStatFunc(stat), syncOptions(validNoteId, baseTimestamp, baseTimestamp + 2));
		expect(context.items.length).toBe(1);
		expect(context.items[0]).toBe(stat);
	});

	test('basicDelta (enhancedAlgorithm: true) should always return item if there is no metadata timestamp set', async () => {
		setupWebDavSync(true);
		const stat = statItem(validNoteId, baseTimestamp);
		const context = await basicDelta(basePath, dirStatFunc(stat), syncOptions(validNoteId, undefined, baseTimestamp + 1));
		expect(context.items.length).toBe(1);
		expect(context.items[0]).toBe(stat);
	});

});
