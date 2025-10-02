import { PaginatedList, RemoteItem, getSupportsDeltaWithItems, enableEnhancedBasicDeltaAlgorithm } from './file-api';
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
		true,
		false,
	])('should use enhanced basic delta algorithm when using file system sync depending on the detectBasedOnAnyTimestampChanges setting', (detectBasedOnAnyTimestampChanges: boolean) => {
		Setting.setValue('sync.target', SyncTargetRegistry.nameToId('filesystem'));
		Setting.setValue('sync.2.detectBasedOnAnyTimestampChanges', detectBasedOnAnyTimestampChanges);
		const result = enableEnhancedBasicDeltaAlgorithm();
		expect(result).toBe(detectBasedOnAnyTimestampChanges);
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

});
