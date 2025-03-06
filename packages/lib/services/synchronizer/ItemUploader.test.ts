import { FileApi } from '../../file-api';
import BaseItem from '../../models/BaseItem';
import Note from '../../models/Note';
import { expectNotThrow, expectThrow, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import time from '../../time';
import ItemUploader from './ItemUploader';
import { ApiCallFunction } from './utils/types';

interface ApiCall {
	name: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	args: any[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function clearArray(a: any[]) {
	a.splice(0, a.length);
}

function newFakeApi(): FileApi {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return { supportsMultiPut: true } as any;
}

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
function newFakeApiCall(callRecorder: ApiCall[], itemBodyCallback: Function = null): ApiCallFunction {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const apiCall = async (callName: string, ...args: any[]): Promise<any> => {
		callRecorder.push({ name: callName, args });

		if (callName === 'multiPut') {
			const [batch] = args;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const output: any = { items: {} };
			for (const item of batch) {
				if (itemBodyCallback) {
					output.items[item.name] = itemBodyCallback(item);
				} else {
					output.items[item.name] = {
						item: item.body,
						error: null,
					};
				}
			}
			return output;
		}
	};
	return apiCall;
}

describe('synchronizer/ItemUploader', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
	});

	it('should batch uploads and use the cache afterwards', (async () => {
		const callRecorder: ApiCall[] = [];
		const itemUploader = new ItemUploader(newFakeApi(), newFakeApiCall(callRecorder));

		const notes = [
			await Note.save({ title: '1' }),
			await Note.save({ title: '2' }),
		];

		await itemUploader.preUploadItems(notes);

		// There should be only one call to "multiPut" because the items have
		// been batched.
		expect(callRecorder.length).toBe(1);
		expect(callRecorder[0].name).toBe('multiPut');

		clearArray(callRecorder);

		// Now if we try to upload the item it shouldn't call the API because it
		// will use the cached item.
		await itemUploader.serializeAndUploadItem(Note, BaseItem.systemPath(notes[0]), notes[0]);
		expect(callRecorder.length).toBe(0);

		// Now try to process a note that hasn't been cached. In that case, it
		// should call "PUT" directly.
		const note3 = await Note.save({ title: '3' });
		await itemUploader.serializeAndUploadItem(Note, BaseItem.systemPath(note3), note3);
		expect(callRecorder.length).toBe(1);
		expect(callRecorder[0].name).toBe('put');
	}));

	it('should not batch upload if the items are over the batch size limit', (async () => {
		const callRecorder: ApiCall[] = [];
		const itemUploader = new ItemUploader(newFakeApi(), newFakeApiCall(callRecorder));
		itemUploader.maxBatchSize = 1;

		const notes = [
			await Note.save({ title: '1' }),
			await Note.save({ title: '2' }),
		];

		await itemUploader.preUploadItems(notes);
		expect(callRecorder.length).toBe(0);
	}));

	it('should not use the cache if the note has changed since the pre-upload', (async () => {
		const callRecorder: ApiCall[] = [];
		const itemUploader = new ItemUploader(newFakeApi(), newFakeApiCall(callRecorder));

		const notes = [
			await Note.save({ title: '1' }),
			await Note.save({ title: '2' }),
		];

		await itemUploader.preUploadItems(notes);
		clearArray(callRecorder);

		await itemUploader.serializeAndUploadItem(Note, BaseItem.systemPath(notes[0]), notes[0]);
		expect(callRecorder.length).toBe(0);

		await time.msleep(1);
		notes[1] = await Note.save({ title: '22' });
		await itemUploader.serializeAndUploadItem(Note, BaseItem.systemPath(notes[1]), notes[1]);
		expect(callRecorder.length).toBe(1);
	}));

	it('should respect the max batch size', (async () => {
		const callRecorder: ApiCall[] = [];
		const itemUploader = new ItemUploader(newFakeApi(), newFakeApiCall(callRecorder));

		const notes = [
			await Note.save({ title: '1' }),
			await Note.save({ title: '2' }),
			await Note.save({ title: '3' }),
		];

		const noteSize = BaseItem.systemPath(notes[0]).length + (await Note.serializeForSync(notes[0])).length;
		itemUploader.maxBatchSize = noteSize * 2;

		// It should send two batches - one with two notes, and the second with
		// only one note.
		await itemUploader.preUploadItems(notes);
		expect(callRecorder.length).toBe(2);
		expect(callRecorder[0].args[0].length).toBe(2);
		expect(callRecorder[1].args[0].length).toBe(1);
	}));

	it('should rethrow error for items within the batch', (async () => {
		const callRecorder: ApiCall[] = [];

		const notes = [
			await Note.save({ title: '1' }),
			await Note.save({ title: '2' }),
			await Note.save({ title: '3' }),
		];

		// Simulates throwing an error on note 2
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const itemBodyCallback = (item: any): any => {
			if (item.name === BaseItem.systemPath(notes[1])) {
				return { error: new Error('Could not save item'), item: null };
			} else {
				return { error: null, item: item.body };
			}
		};

		const itemUploader = new ItemUploader(newFakeApi(), newFakeApiCall(callRecorder, itemBodyCallback));

		await itemUploader.preUploadItems(notes);

		await expectNotThrow(async () => itemUploader.serializeAndUploadItem(Note, BaseItem.systemPath(notes[0]), notes[0]));
		await expectThrow(async () => itemUploader.serializeAndUploadItem(Note, BaseItem.systemPath(notes[1]), notes[1]), null);
		await expectNotThrow(async () => itemUploader.serializeAndUploadItem(Note, BaseItem.systemPath(notes[2]), notes[2]));
	}));

});
